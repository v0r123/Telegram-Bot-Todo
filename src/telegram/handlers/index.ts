import { Telegram } from "@src/telegram"
import { ExampleHandler } from "./example";
import { Category, HiddenCallBackData, MessageAction, MessageParam } from "@src/enums";
import TelegramBot from "node-telegram-bot-api";
import { GlobalAction } from "@src/enums/actions";

export class Handler {

    private telegram: Telegram;
    exampleHandler: ExampleHandler;

    constructor(telegram: Telegram) {
        this.telegram = telegram

        this.exampleHandler = new ExampleHandler(this.telegram)
    }

    handleCallback(callbackQuery: TelegramBot.CallbackQuery, parsed: HiddenCallBackData) {
        const { message, id: callbackId } = callbackQuery
        const { chat, message_id: messageId } = message
        const { id: chatId } = chat

        const { category, action, param, args, approve } = parsed

        if (category === Category.Plug) {
            if (action === GlobalAction.Ignore) {
                this.telegram.bot.answerCallbackQuery(callbackId)
            }
        } if (category === Category.Handler || category === Category.Message) {

            if (action === MessageAction.Destroy) {
                if (param === MessageParam.Callback) {
                    this.telegram.api.destroyListener(chatId, 'callback_query')
                }

                if (param === MessageParam.Message) {
                    this.telegram.api.destroyListener(chatId, 'message')
                }

                if (args?.selfDelete) {
                    this.telegram.bot.deleteMessage(chatId, messageId)
                }
            }

            if (action === MessageAction.Delete) {
                this.telegram.api.deleteMessage(chatId, messageId)
            }

            if (args?.messageId) {
                this.telegram.api.deleteMessage(chatId, parseInt(args.messageId))
            }

            this.telegram.bot.answerCallbackQuery(callbackId)
        } else if (category === Category.Example) {
            this.exampleHandler.handle(callbackQuery, parsed)
        }


    }
}