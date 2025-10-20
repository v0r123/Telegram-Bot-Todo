
import TelegramBot, { Message, Chat } from "node-telegram-bot-api";


import { Category, HiddenCallBackData } from "@src/enums";
import { GlobalAction } from "@src/enums/actions";
import { HierarchyAction } from "@src/enums/hierarchy";
import { createCallbackData } from "src/utils";
import { createPagination } from "src/utils/telegram/keyboard";
import { Telegram } from "@src/telegram";
import { ExampleAction, ExampleParam } from "@src/enums/example";

export class ExampleHandler {

    private telegram: Telegram;

    private message: Message;
    private callbackId: string;
    private chat: Chat;
    private messageId: number;
    private chatId: number;
    private parsed: HiddenCallBackData;

    constructor(telegram: Telegram) {
        this.telegram = telegram
    }

    async handle(callbackQuery: TelegramBot.CallbackQuery, parsed: HiddenCallBackData) {
        const { message, id: callbackId } = callbackQuery
        const { chat, message_id: messageId } = message
        const { id: chatId } = chat

        this.message = message
        this.callbackId = callbackId
        this.chat = chat
        this.messageId = messageId
        this.chatId = chatId
        this.parsed = parsed

        const { action, param, args, approve } = this.parsed

        const text = [], buttons = []

        if (action === GlobalAction.Paginate) {
            text.push(`Choose any action`)
            buttons.push([{
                text: 'First',
                callback_data: createCallbackData({
                    category: Category.Example,
                    action: ExampleAction.ActionOne,
                    args: {
                        back: createCallbackData({
                            category: Category.Example,
                            action: GlobalAction.Paginate
                        })
                    }
                })
            }, {
                text: 'Second',
                callback_data: createCallbackData({
                    category: Category.Example,
                    action: ExampleAction.ActionTwo,
                    args: {
                        back: createCallbackData({
                            category: Category.Example,
                            action: GlobalAction.Paginate
                        })
                    }
                })
            }], [{
                text: 'OpenUrl',
                callback_data: createCallbackData({
                    category: Category.Example,
                    action: ExampleAction.OpenUrl,
                    args: {
                        back: createCallbackData({
                            category: Category.Example,
                            action: GlobalAction.Paginate
                        })
                    }
                })

            }])
        }

        if (action === ExampleAction.ActionOne) {
            text.push(`Choose param for action 1`)
            if (param === ExampleParam.ParamOne) {
                buttons.push([{
                    text: 'Switch to param 2',
                    callback_data: createCallbackData({
                        category: Category.Example,
                        action: ExampleAction.ActionOne,
                        param: ExampleParam.ParamTwo,
                        args: {
                            back: createCallbackData({
                                category: Category.Example,
                                action: ExampleAction.ActionOne
                            })
                        }
                    })
                }])
            } else if (param === ExampleParam.ParamTwo) {
                buttons.push([{
                    text: 'Switch to param 1',
                    callback_data: createCallbackData({
                        category: Category.Example,
                        action: ExampleAction.ActionOne,
                        param: ExampleParam.ParamOne,
                        args: {
                            back: createCallbackData({
                                category: Category.Example,
                                action: ExampleAction.ActionOne
                            })
                        }
                    })
                }])
            } else {
                buttons.push([{
                    text: 'Param 1',
                    callback_data: createCallbackData({
                        category: Category.Example,
                        action: ExampleAction.ActionOne,
                        param: ExampleParam.ParamOne,
                        args: {
                            back: createCallbackData({
                                category: Category.Example,
                                action: ExampleAction.ActionOne
                            })
                        }
                    })
                }, {
                    text: 'Param 2',
                    callback_data: createCallbackData({
                        category: Category.Example,
                        action: ExampleAction.ActionOne,
                        param: ExampleParam.ParamTwo,
                        args: {
                            back: createCallbackData({
                                category: Category.Example,
                                action: ExampleAction.ActionOne
                            })
                        }
                    })
                }])
            }
        }

        if (action === ExampleAction.ActionTwo) {
            if (param === ExampleParam.ParamOne) {

            } else if (param === ExampleParam.ParamTwo) {

            } else {

            }
        }

        if (action === ExampleAction.OpenUrl) {
            text.push(`Choose url`)
            if (param === ExampleParam.Github) {
                buttons.push([{
                    text: 'Github', url: `invoice.url`
                }])
            } else if (param === ExampleParam.LinkedIn) {
                buttons.push([{
                    text: 'LinkedIn', url: `invoice.url`
                }])
            } else {
                buttons.push([{
                    text: 'LinkedIn',
                    callback_data: createCallbackData({
                        category: Category.Example,
                        action: ExampleAction.OpenUrl,
                        param: ExampleParam.LinkedIn,
                        args: {
                            back: createCallbackData({
                                category: Category.Example,
                                action: GlobalAction.Paginate
                            })
                        }
                    })
                }, {
                    text: 'GitHub',
                    callback_data: createCallbackData({
                        category: Category.Example,
                        action: ExampleAction.OpenUrl,
                        param: ExampleParam.Github,
                        args: {
                            back: createCallbackData({
                                category: Category.Example,
                                action: GlobalAction.Paginate
                            })
                        }
                    })
                }])
            }
        }

        buttons.push([{
            text: '⬅️ Back', callback_data: args.back ?? createCallbackData({
                category: Category.Hierarchy,
                action: HierarchyAction.Upper
            })
        }])

        this.telegram.api.editMessageText(text.join('\n'), {
            chat_id: this.chatId,
            message_id: this.messageId,
            reply_markup: {
                inline_keyboard: buttons
            }
        })
    }
}