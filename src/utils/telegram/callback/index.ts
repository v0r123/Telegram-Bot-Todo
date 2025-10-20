import TelegramBot from "node-telegram-bot-api"
import base64Url from 'base64-url';
import { HiddenCallBackData } from "@src/enums";

export const decodeData = (data: string): string => base64Url.decode(data)

export const encodeData = (data: string): string => base64Url.encode(data)

export const createHiddenLink = (data: string): string => {
    return `<a href="tg://btn/${encodeData(data)}">\u200b</a>`
}

export const formatHiddenCallbacks = (buttons: TelegramBot.InlineKeyboardMarkup) => {
    const hiddenData: string[] = [];

    const modifiedKeyboard = buttons.inline_keyboard.map(row =>
        row.map((button, index) => {
            if (button.callback_data && button.callback_data.length > 64) {
                hiddenData.push(button.callback_data);
                return {
                    ...button,
                    callback_data: `\0${hiddenData.length - 1}\0`
                };
            }
            return button;
        })
    );

    return {
        modifiedKeyboard,
        hiddenData
    }
}
export const createCallbackData = (options: HiddenCallBackData) => {
    const { category, action, param, args, approve } = options
    return JSON.stringify({
        category: category,
        action: action,
        param: param ?? false,
        args: args ?? {},
        approve: approve ?? false
    })
}

export const parseCallbackData = (callbackData: string): HiddenCallBackData => {
    try {
        return JSON.parse(callbackData)
    } catch (error) {
        return null;
    }
}