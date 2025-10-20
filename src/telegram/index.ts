import TelegramBot from "node-telegram-bot-api";
import { TelegramAPI, TelegramConfig } from "@src/services/telegram";
import { Category, HiddenCallBackData } from "@src/enums";
import { HierarchyParam } from "@src/enums/hierarchy";
import { createCallbackData, decodeData, parseCallbackData } from "src/utils";
import { buildKeyboard, generateInlineKeyboard } from "src/utils/telegram/keyboard";
import { Handler } from "./handlers";
import { PrismaDataBase } from "@src/services/prisma";

export class Telegram {

    bot: TelegramBot;
    api: TelegramAPI;

    database: PrismaDataBase;
    config: TelegramConfig;
    handler: Handler;
    context: Map<number, any> = new Map<number, any>();

    constructor(botKey: string) {
        this.bot = new TelegramBot(botKey, { polling: true });
        this.database = new PrismaDataBase()
        
        this.bot.once('', (poll) => {
            console.log('poll', poll)
        })

        this.bot.on('polling_error', (error: any) => {
            if (error.code !== 'EFATAL') {
                console.error('Polling error:', error)
            }

        })
        this.bot.on('webhook_error', (error) => { console.error('Webhook error:', error) })

        this.bot.onText(/\/start/, (msg) => this.startHandler(msg))
        this.bot.on('callback_query', (callback_query) => this.callbackHandler(callback_query))

        this.bot.setMyCommands([
            { command: '/start', description: '💫 Restart' }
        ])

        this.api = TelegramAPI.getInstance(this)
        this.handler = new Handler(this)
    }


    startHandler = async (message: TelegramBot.Message) => {

        const { chat, from } = message
        const { id: chatId } = chat
        const { id: userId, first_name, username } = from

        const keyboard = buildKeyboard()
        const buttons = await generateInlineKeyboard(keyboard.buttons, userId, this)

        this.api.sendMessage(chatId, keyboard.text, {
            reply_markup: {
                inline_keyboard: buttons,
            }
        });
    }

    async callbackHandler(callbackQuery: TelegramBot.CallbackQuery) {
        let { data, message, id: callbackId } = callbackQuery
        const { chat, message_id: messageId, from } = message
        const { id: chatId } = chat

        if (!chatId || !messageId || !data)
            return this.bot.answerCallbackQuery(callbackId, { text: `Unknown command` })

        const matches = data.match(/^\0([0-9]+)\0(.*)$/);
        if (matches) {
            const idx = parseInt(matches[1], 10);
            const restData = matches[2];
            const hiddenEntity = message.entities?.find(entity => entity.type === 'text_link' && entity.url?.startsWith('tg://btn/'));

            if (hiddenEntity && hiddenEntity.url) {
                const hiddenData = decodeData(hiddenEntity.url.substring('tg://btn/'.length)).split('\0');
                console.log('hiddenData', hiddenData)
                const callbackData = hiddenData[idx] + restData;

                data = callbackData
            }
        }

        let parsed = null
        if ((parsed = parseCallbackData(data)) != null) {
            if (parsed.category === Category.Hierarchy) {
                const keyboard = buildKeyboard(parsed?.args?.level)
                const buttons = await generateInlineKeyboard(keyboard.buttons, chatId, this)

                this.api.editMessageText(keyboard.text, {
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: {
                        inline_keyboard: buttons,
                    }
                });
            } else {
                this.handler.handleCallback(callbackQuery, parsed)
            }
        }
    }
}