import TelegramBot, { InlineKeyboardMarkup } from "node-telegram-bot-api";
import { Telegram } from "@src/telegram";
import { Category, HiddenCallBackData, MessageAction, MessageParam } from "@src/enums";
import { createCallbackData, createHiddenLink, decodeData, formatHiddenCallbacks, formatText, parseCallbackData } from "src/utils";
import { FormatAction, PromiseResponse, ValidateMessageAction } from "../types";

export class API {
    private telegram: Telegram;
    private bot: TelegramBot;

    private static instance: API;

    private handlers: {
        [chatId: string]: {
            message?: (message: TelegramBot.Message) => void,
            callback_query?: (callbackQuery: TelegramBot.CallbackQuery) => void
        }
    }

    static getInstance(telegram?: Telegram) {
        if (!telegram && !this.instance)
            throw new Error('You need to initializate Telegram instance with Bot Object param previously.')

        if (this.instance == null) {
            this.instance = new API(telegram);
        }

        return this.instance;
    }

    constructor(telegram: Telegram) {
        this.telegram = telegram
        this.bot = this.telegram.bot

        this.handlers = {}
    }

    createListeners(chatId: number, event: keyof TelegramBot.TelegramEvents, ...callbacks: ((args: TelegramBot.Message | TelegramBot.CallbackQuery, previous?: any) => any)[]) {
        if (!this.handlers[chatId]) {
            this.handlers[chatId] = {}
        }

        this.destroyListener(chatId, event)

        return callbacks.reduce((promiseChain, currentCallback: (args: TelegramBot.Message | TelegramBot.CallbackQuery, previous?: any) => any, index, array) => {

            return promiseChain.then(result => {
                if (result === false) {
                    return Promise.reject('Execution stopped');
                }

                return new Promise((resolve, reject) => {
                    this.createListener(chatId, event, (args: TelegramBot.Message | TelegramBot.CallbackQuery) => {
                        if ((args as TelegramBot.Message).chat?.id === chatId || (args as TelegramBot.CallbackQuery).from?.id === chatId) {
                            Promise.resolve(currentCallback(args, result)).then(resolve).catch(reject).finally(() => {
                                if (index === array.length - 1) {
                                    this.destroyListener(chatId, event)
                                }
                            })
                        } else {
                            reject(`Unsupported type of message: ${JSON.stringify(args, null, 2)}`)
                        }

                    })
                });
            });
        }, Promise.resolve(true))//.finally(() => this.destroyListener(chatId, event))
    }

    createListener(chatId: TelegramBot.ChatId, event: keyof TelegramBot.TelegramEvents, callback: (answerMessage: TelegramBot.Message | TelegramBot.CallbackQuery) => any) {
        if (!this.handlers[chatId]) {
            this.handlers[chatId] = {}
        }

        this.destroyListener(chatId, event)

        this.handlers[chatId][event] = callback

        this.bot.on(event, this.handlers[chatId][event])
    }

    destroyListener(chatId: TelegramBot.ChatId, event: keyof TelegramBot.TelegramEvents) {
        if (this.handlers[chatId] && this.handlers[chatId][event]) {
            this.bot.removeListener(event, this.handlers[chatId][event])
            delete this.handlers[chatId][event]
        }
    }

    async deleteMessage(chatId: TelegramBot.ChatId, messageId: number, options?: any) {
        try {
            await this.bot.deleteMessage(chatId, messageId, options)
        } catch (error) { }
    }

    sendMessage(
        chatId: TelegramBot.ChatId,
        text: string,
        options?: TelegramBot.SendMessageOptions,
    ): Promise<TelegramBot.Message> {
        if (options && options.reply_markup && (options.reply_markup as TelegramBot.InlineKeyboardMarkup).inline_keyboard) {
            const { modifiedKeyboard, hiddenData } = formatHiddenCallbacks((options.reply_markup as TelegramBot.InlineKeyboardMarkup))
            const messageText = hiddenData.length > 0 ? `${createHiddenLink(hiddenData.join('\0'))}${text}` : text;


            return this.bot.sendMessage(chatId, messageText, {
                ...options,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: modifiedKeyboard
                }
            })
        }

        return this.bot.sendMessage(chatId, text, { ...options, parse_mode: 'HTML' })
    }

    editMessageText(text: string, options?: TelegramBot.EditMessageTextOptions): Promise<TelegramBot.Message | boolean> {
        if (options && options.reply_markup && (options.reply_markup as TelegramBot.InlineKeyboardMarkup).inline_keyboard) {
            const { modifiedKeyboard, hiddenData } = formatHiddenCallbacks((options.reply_markup as TelegramBot.InlineKeyboardMarkup))
            const messageText = hiddenData.length > 0 ? `${createHiddenLink(hiddenData.join('\0'))}${text}` : text;

            return this.bot.editMessageText(messageText, {
                ...options,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: modifiedKeyboard
                }
            })
        }


        return this.bot.editMessageText(text, { ...options, parse_mode: 'HTML' })
    }

    editMessageReplyMarkup(
        text: string,
        replyMarkup: TelegramBot.InlineKeyboardMarkup,
        options?: TelegramBot.EditMessageTextOptions,
    ): Promise<TelegramBot.Message | boolean> {

        const { modifiedKeyboard, hiddenData } = formatHiddenCallbacks(replyMarkup)

        const messageText = hiddenData.length > 0 ? `${createHiddenLink(hiddenData.join('\0'))}${text}` : text;

        return this.bot.editMessageText(messageText, {
            ...options,
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: modifiedKeyboard
            }
        })
    }

    editMessageWithCanceble(text: string, options?: TelegramBot.EditMessageTextOptions & { answerId?: number }) {
        const { answerId } = options
        return this.editMessageReplyMarkup(text, {
            inline_keyboard: [
                [{
                    text: `⭕️ Close ${answerId ? '& delete answer' : ''}`, callback_data: createCallbackData({
                        category: Category.Message,
                        action: MessageAction.Delete,
                        args: {
                            ...(answerId && {
                                messageId: answerId
                            })
                        }
                    })
                }]
            ]
        }, options)
    }

    sendCloseableMessage(chatId: TelegramBot.ChatId, text: string, options?: TelegramBot.SendMessageOptions) {
        // @ts-ignore
        options = {
            ...options,
            reply_markup: {
                ...options?.reply_markup,
                inline_keyboard: [
                    ...((options?.reply_markup as InlineKeyboardMarkup)?.inline_keyboard ?? []),
                    [{
                        text: "⭕️ Close", callback_data: createCallbackData({
                            category: Category.Message,
                            action: MessageAction.Delete
                        })
                    }]
                ]
            }
        } || {
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: "⭕️ Close", callback_data: createCallbackData({
                            category: Category.Message,
                            action: MessageAction.Delete
                        })
                    }]
                ]
            }
        }

        return this.sendMessage(chatId, text, options)
    }

    sendSuccessMessage(chatId: TelegramBot.ChatId, text: string, options?: TelegramBot.SendMessageOptions) {
        return this.sendCloseableMessage(chatId, `✅ ${text}`, options)
    }

    sendInfoMessage(chatId: TelegramBot.ChatId, text: string, options?: TelegramBot.SendMessageOptions) {
        return this.sendCloseableMessage(chatId, `🪬 ${text}`, options)
    }

    sendWarningMessage(chatId: TelegramBot.ChatId, text: string, options?: TelegramBot.SendMessageOptions) {
        return this.sendCloseableMessage(chatId, `⚠️ ${text}`, options)
    }

    sendErrorMessage(chatId: TelegramBot.ChatId, text: string, options?: TelegramBot.SendMessageOptions) {
        return this.sendCloseableMessage(chatId, `❌ ${text}`, options)
    }

    sendAccessDenied(chatId: TelegramBot.ChatId, options?: TelegramBot.SendMessageOptions) {
        return this.sendCloseableMessage(chatId, `❌ Access denied`, options)
    }

    async waitingUserApprovement(chatId: TelegramBot.ChatId, text: string, options: {
        onSuccess?: {
            text: string
            formats?: FormatAction[],
            action?: (callback_data: HiddenCallBackData, promiseResponse: any) => any
        },
        onFailure?: {
            text: string,
            formats?: FormatAction[],
            action?: (callback_data: HiddenCallBackData, promiseResponse: any) => any
        }
        onSubmit: {
            text?: string
            callback_data?: string,
            processingText?: string,
            action?: (callback_data: HiddenCallBackData) => any
        },
        onCancel?: {
            text?: string,
            action?: (callback_data: HiddenCallBackData) => any
        },
        messageId?: number,
        selfDelete?: boolean,
    }) {
        return new Promise(async (resolve, reject) => {
            const { onSubmit, onCancel, onSuccess, onFailure, messageId: message_id, selfDelete } = options

            const acceptText = onSubmit && onSubmit.text ? onSubmit.text : 'Yes'
            const rejectText = onCancel && onCancel.text ? onCancel.text : 'No'

            const callbackAccept = onSubmit && onSubmit.callback_data ? onSubmit.callback_data : createCallbackData({
                category: Category.Message,
                action: MessageAction.Destroy,
                param: MessageParam.Callback
            })

            const callbackReject = createCallbackData({
                category: Category.Handler,
                action: MessageAction.Destroy,
                param: MessageParam.Callback,
                args: {
                    selfDelete: true
                }
            })

            const reply_markup = {
                inline_keyboard: [
                    [
                        { text: acceptText, callback_data: callbackAccept },
                        { text: rejectText, callback_data: callbackReject }
                    ]
                ]
            }

            if (message_id) {
                await this.editMessageReplyMarkup(text, reply_markup, { chat_id: chatId, message_id })
            }

            const botMessage = message_id ? { message_id } : await this.sendMessage(chatId, text, { reply_markup })

            const { message_id: botMessageId } = botMessage

            const callback = async (callbackQuery: TelegramBot.CallbackQuery) => {
                if (callbackQuery.from.id === chatId) {

                    let { data, message } = callbackQuery
                    const matches = data.match(/^\0([0-9]+)\0(.*)$/);
                    if (matches) {
                        const idx = parseInt(matches[1], 10);
                        const restData = matches[2];
                        const hiddenEntity = message.entities?.find(entity => entity.type === 'text_link' && entity.url?.startsWith('tg://btn/'));

                        if (hiddenEntity && hiddenEntity.url) {
                            const hiddenData = decodeData(hiddenEntity.url.substring('tg://btn/'.length)).split('\0');
                            const callbackData = hiddenData[idx] + restData;

                            data = callbackData
                        }
                    }

                    if (data === callbackAccept) {
                        if (onSubmit.processingText) {
                            await this.editMessageText(onSubmit.processingText, { chat_id: chatId, message_id: botMessageId })
                        }

                        let text = ''
                        Promise.resolve(onSubmit.action ? onSubmit.action(parseCallbackData(callbackAccept)) : true).then(async (response) => {
                            if (onSuccess) {
                                text = onSuccess.formats ? await formatText(onSuccess.text, onSuccess.formats.map((cb) => cb.bind(null, null, response))) : onSuccess.text ? onSuccess.text : text

                                console.log('response', response);

                                if (onSuccess.action) {
                                    onSuccess.action(parseCallbackData(data), response)
                                }
                            }
                            resolve(response)
                        }).catch(async (error) => {
                            if (onFailure) {
                                text = onFailure.formats ? await formatText(onFailure.text, onFailure.formats.map((cb) => cb.bind(null, null, error))) : onFailure.text ? onFailure.text : text

                                if (onFailure.action) {
                                    onFailure.action(parseCallbackData(data), error)
                                }
                            }
                            reject(error)
                        }).finally(() => {
                            // this.editMessageWithCanceble(text, {
                            //     chat_id: chatId,
                            //     message_id: botMessageId,
                            // })
                            if (selfDelete)
                                return this.telegram.api.deleteMessage(chatId, botMessageId)

                            if (text && text !== '') {
                                this.telegram.api.editMessageText(text, {
                                    chat_id: chatId,
                                    message_id: botMessageId,
                                    reply_markup: {
                                        inline_keyboard: [
                                            [{
                                                text: '⭕️ Close', callback_data: createCallbackData({
                                                    category: Category.Message,
                                                    action: MessageAction.Delete,
                                                    param: MessageParam.Message,
                                                })
                                            }]
                                        ]
                                    }
                                })
                            }

                        })
                    } else {
                        resolve(0)
                    }

                    this.destroyListener(chatId, 'callback_query')
                }

            }

            this.createListener(chatId, 'callback_query', callback)
        })
    }

    async waitingMessageAnswer(chatId: TelegramBot.ChatId, text: string, options: {
        onValidate?: {
            waiting?: boolean,
            actions: ValidateMessageAction | ValidateMessageAction[],
            compareOr?: boolean,
            onFailure: (botMessageId: TelegramBot.MessageId, userMessage: TelegramBot.Message) => void
        },
        onStart: {
            text?: string,
            action: <T>(userAnswer: string, botMessageId: TelegramBot.MessageId, userMessage: TelegramBot.Message) => any | Promise<T>
        },
        onSuccess?: {
            text?: string,
            action?: <T>(userAnswer: string, botMessageId: TelegramBot.MessageId, userMessage: TelegramBot.Message, promiseResponse: T) => any | Promise<T>,
            formats?: FormatAction[]
        },
        onFailure?: {
            text: string,
            action?: <T>(params: {
                userAnswer?: string,
                botMessageId?: number,
                userMessage?: TelegramBot.Message,
                error?: any
            }) => any | Promise<T>,
            formats?: FormatAction[]
        },
        onFinally?: {
            action?: <T>(userAnswer: string, botMessageId: TelegramBot.MessageId, userMessage: TelegramBot.Message) => any | Promise<T>,
            deleteAnswer?: boolean,
            selfDelete?: boolean,
        },
        messageId?: number,
        deleteAnswerOnClose?: boolean,
        args?: any
    }) {
        return new Promise(async (resolve, reject) => {
            const { onValidate, onStart, onSuccess, onFailure, onFinally, deleteAnswerOnClose, messageId: message_id, args } = options

            const reply_markup = {
                inline_keyboard: [
                    [{
                        text: '🚫 Cancel', callback_data: createCallbackData({
                            category: Category.Handler,
                            action: MessageAction.Destroy,
                            param: MessageParam.Message,
                            args: {
                                selfDelete: true
                            }
                        })
                    }]
                ]
            }

            if (message_id) {
                await this.editMessageReplyMarkup(text, reply_markup, { chat_id: chatId, message_id })
            }

            const botMessage = message_id ? { message_id } : await this.sendMessage(chatId, text, { reply_markup })

            const { message_id: botMessageId } = botMessage

            const callback = async (userMessage: TelegramBot.Message) => {
                if (userMessage.chat.id === chatId) {
                    const { chat, text: answerText, message_id: answerMessageId } = userMessage
                    const { id: answerChatId } = chat

                    if (onValidate) {
                        if (Array.isArray(onValidate.actions)) {
                            if (onValidate.compareOr && !onValidate.actions.some((act) => act(answerText, userMessage))) {
                                if (!onValidate.waiting) {
                                    this.destroyListener(chatId, 'message')
                                }

                                return onValidate.onFailure(botMessage, userMessage)
                            } else if (!onValidate.actions.every((act) => act(answerText, userMessage))) {
                                if (!onValidate.waiting) {
                                    this.destroyListener(chatId, 'message')
                                }

                                return onValidate.onFailure(botMessage, userMessage)
                            }
                        } else if (!onValidate.actions(answerText, userMessage)) {
                            if (!onValidate.waiting) {
                                this.destroyListener(chatId, 'message')
                            }

                            return onValidate.onFailure(botMessage, userMessage)
                        }
                    }

                    if (onStart.text) {
                        await this.editMessageText(onStart.text, { chat_id: chatId, message_id: botMessageId })
                    }

                    Promise.resolve(onStart.action(answerText, botMessage, userMessage)).then(async (promiseResponse) => {
                        if (onSuccess) {
                            const text = onSuccess.formats ? await formatText(onSuccess.text, onSuccess.formats.map((cb) => cb.bind(null, answerText, promiseResponse))) : onSuccess.text

                            if (text && text !== '') {
                                this.editMessageText(text, {
                                    chat_id: chatId,
                                    message_id: botMessageId,
                                    reply_markup: {
                                        inline_keyboard: [
                                            [{
                                                text: `⭕️ Close ${deleteAnswerOnClose ? '& delete answer' : ''}`, callback_data: createCallbackData({
                                                    category: Category.Message,
                                                    action: MessageAction.Delete,
                                                    args: {
                                                        ...args,
                                                        ...(deleteAnswerOnClose && {
                                                            messageId: answerMessageId
                                                        })
                                                    }
                                                })
                                            }]
                                        ]
                                    }
                                })
                            }


                            if (onSuccess.action) onSuccess.action(answerText, botMessage, userMessage, promiseResponse)
                        }
                        resolve(promiseResponse)
                    }).catch(async (error) => {
                        if (onFailure) {
                            const text = onFailure.formats ? await formatText(onFailure.text, onFailure.formats.map((cb) => cb.bind(null, answerText, error))) : onFailure.text

                            if (text !== '') {
                                this.editMessageText(text, {
                                    chat_id: chatId,
                                    message_id: botMessageId,
                                    reply_markup: {
                                        inline_keyboard: [
                                            [{
                                                text: `⭕️ Close ${deleteAnswerOnClose && '& delete answer'}`, callback_data: createCallbackData({
                                                    category: Category.Message,
                                                    action: MessageAction.Delete,
                                                    args: {
                                                        ...args,
                                                        ...(deleteAnswerOnClose && {
                                                            messageId: answerMessageId
                                                        })
                                                    }
                                                })
                                            }]
                                        ]
                                    }
                                })
                            }


                            if (onFailure.action) onFailure.action({ userAnswer: answerText, botMessageId: botMessage.message_id, userMessage, error })
                        }
                        reject(error)
                    }).finally(() => {
                        if (onFinally) {
                            if (onFinally.action) onFinally.action(answerText, botMessage, userMessage)
                            if (onFinally.selfDelete) this.bot.deleteMessage(chatId, answerMessageId)
                            if (onFinally.deleteAnswer) this.bot.deleteMessage(chatId, botMessageId)

                        }
                    })

                    this.destroyListener(chatId, 'message')
                }
            }

            this.createListener(chatId, 'message', callback)
        })
    }
}