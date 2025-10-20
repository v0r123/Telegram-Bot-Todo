import TelegramBot from "node-telegram-bot-api"
import { HierarchyParam } from "@src/enums/hierarchy"

export type PromiseResponse = -1 | 0 | 1
export type ValidateMessageAction = (userAnswer: string, userMessage: TelegramBot.Message) => boolean
export type FormatAction = (userAnswer: any, promiseResponse: any) => any


export type HierarchyItem = {
    text: string;
    buttons: ExtendedInlineKeyboardButton[][];
    choiseTeam?: boolean,
    [key: string]: string | boolean | ExtendedInlineKeyboardButton[][] | HierarchyItem;
}

export type Hierarchy = {
    [HierarchyParam.Main]: HierarchyItem;
}

export interface ExtendedInlineKeyboardButton extends TelegramBot.InlineKeyboardButton {
    adminOnly?: boolean,
    forUsers?: boolean,
    callbacks?: ((...args: any) => any)[]
}