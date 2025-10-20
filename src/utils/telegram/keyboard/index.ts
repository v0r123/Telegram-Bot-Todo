import { ExtendedInlineKeyboardButton, Hierarchy, HierarchyItem, TelegramConfig } from "src/services/telegram";
import { Category, HiddenCallBackData } from "@src/enums";
import { HierarchyParam, HierarchyAction } from "@src/enums/hierarchy";
import { createCallbackData, parseCallbackData } from "../callback";
import TelegramBot from "node-telegram-bot-api";
import { formatText } from "../text";
import { GlobalAction } from "@src/enums/actions";
import { Telegram } from "@src/telegram";

export const buildKeyboard = (levels?: HierarchyParam[]) => {

    levels = levels ?? []
    const findMenu = (currentMenu: HierarchyItem, levels: HierarchyParam[]) => {
        if (levels.length <= 0)
            return currentMenu

        const index = levels.slice(0, 1)[0]

        if (currentMenu[index]) {
            currentMenu = findMenu(currentMenu[index] as HierarchyItem, levels.slice(1))
        }

        return currentMenu
    }

    const menu = findMenu(TelegramConfig.getHierarchy()[HierarchyParam.Main], levels)

    menu.buttons.map(async (row) => (row.map((button) => {
        let parsed: HiddenCallBackData = null
        if ((parsed = parseCallbackData(button.callback_data)) != null) {
            button.callback_data = createCallbackData({
                ...parsed,
                args: {
                    ...parsed.args,
                    level: levels ? [...levels, parsed.param] : [parsed.param]
                }
            })
        }

        return button
    })))

    if (levels.length > 0) {
        const text = levels.length === 1 ? `🏠 To main menu` : '⬅️ Back'

        menu.buttons.push([
            {
                text: text, callback_data: createCallbackData({
                    category: Category.Hierarchy,
                    action: HierarchyAction.Upper,
                    args: {
                        level: levels.splice(0, levels.length - 1)
                    }
                }),
                forUsers: true
            }
        ])
    }


    return menu
}

export const isAvailable = (button: ExtendedInlineKeyboardButton, type: 'admin' | 'support' | 'user') => {
    return true
    if (type === 'admin') return true
    if (type === 'support' && !button.adminOnly) return true
    if (type === 'user' && button.forUsers) return true

    return false
}

export const generateInlineKeyboard = async (inline_keyboard: ExtendedInlineKeyboardButton[][], userId: number, context: Telegram) => {
    inline_keyboard = await Promise.all(inline_keyboard.map(async (row) =>
        await Promise.all(row.filter((button) => isAvailable(button, 'user')).map(async (button, index) => {

            let text = button.text
            if (button.callbacks && button.callbacks.length > 0) {
                text = await formatText(button.text, button.callbacks.map((cb) => cb.bind(context, userId)))
            }


            return { ...button, text };
        }))
    ))

    return inline_keyboard
}

const splitArray = <T>(arr: (T | T[])[], perRow: number) => {
    const flattened = arr.flat();

    return Array.from({ length: Math.ceil(flattened.length / perRow) }, (_, i) => flattened.slice(i * perRow, i * perRow + perRow))
}

export const createPaginationPrisma = <T>(items: T[], options: {
    category: Category,
    action?: any,
    param?: any,
    args?: any,

    pageSize?: number,
    currentPage: number,
    totalItems?: number,
    perRow?: number,

    cb: (item: T) => any,
    back?: string
}) => {
    const {
        category,
        action,
        param,
        args,

        pageSize,
        currentPage,
        totalItems,
        perRow,

        cb,
        back,
    } = options

    const hasNextPage = items.length > pageSize;
    const list = items.slice(0, pageSize);

    const totalPages = totalItems ? Math.ceil(totalItems / pageSize) : false;

    const buttons = perRow ? splitArray(list.map(cb), perRow) : list.map(cb)

    const pagination = []

    if (currentPage > 1) {
        pagination.push({
            text: `⬅️`, callback_data: createCallbackData({
                category: category,
                action: action ?? GlobalAction.Paginate,
                param: param,
                args: {
                    ...args,
                    page: currentPage - 1
                }
            })
        })
    }

    if (totalItems > 0) {
        pagination.push({
            text: totalPages ? `${currentPage}/${totalPages}` : currentPage, callback_data: createCallbackData({
                category: Category.Plug,
                action: GlobalAction.Ignore
            })
        })
    }


    if (hasNextPage) {
        pagination.push({
            text: `➡️`, callback_data: createCallbackData({
                category: category,
                action: action ?? GlobalAction.Paginate,
                param: param,
                args: {
                    ...args,
                    page: currentPage + 1
                }
            })
        })
    }

    if (pagination.length > 0)
        buttons.push(pagination)

    if (back) {
        buttons.push([{
            text: '⬅️ Back', callback_data: back
        }])
    }

    return buttons
}

export const createPagination = <T>(list: T[], options: {
    perPage?: number,
    back?: string,
    currentPage: number,
    category: Category,
    action?: any,
    param?: any,
    args?: any,
    next?: boolean,
    cb: (item: T) => any
}) => {
    const { back, currentPage, category, action, cb, param, perPage, args, next } = options

    const defaultPerPage = perPage || 5

    const totalPages = Math.ceil(list.length / defaultPerPage);

    const start = (currentPage - 1) * defaultPerPage;
    const end = start + defaultPerPage;

    const buttons = next ? list.map(cb) : (list as any).slice(start, end).map(cb)

    const pagination = []

    if (currentPage > 1) {
        pagination.push({
            text: `⬅️`, callback_data: createCallbackData({
                category: category,
                action: action ?? GlobalAction.Paginate,
                param: param,
                args: {
                    ...args,
                    page: currentPage - 1
                }
            })
        })
    }

    if (totalPages > 1) { // || currentPage > 0
        pagination.push({
            text: next ? currentPage : `${currentPage}/${totalPages}`, callback_data: createCallbackData({
                category: Category.Plug,
                action: GlobalAction.Ignore
            })
        })
    }

    if (currentPage < totalPages || next) {
        pagination.push({
            text: `➡️`, callback_data: createCallbackData({
                category: category,
                action: action ?? GlobalAction.Paginate,
                param: param,
                args: {
                    ...args,
                    page: currentPage + 1
                }
            })
        })
    }


    if (pagination.length > 0)
        buttons.push(pagination)

    if (back) {
        buttons.push([{
            text: '⬅️ Back', callback_data: back
        }])
    }

    return buttons
}