import { Category} from "@src/enums";
import { HierarchyAction, HierarchyParam } from "@src/enums/hierarchy";
import { createCallbackData } from "src/utils";
import { Hierarchy } from "../types";
import { GlobalAction } from "@src/enums/actions";

export class Config {

    constructor() {
    }

    static getHierarchy(): Hierarchy {
        return {
            [HierarchyParam.Main]: {
                text: `👋 Вас приветствут <b>${process.env.BOT_NAME}</b>!\n\nС нашим сервисом Вы можете рассылать письма, которые дойдут точно в Inbox.\n\nЧто вы хотите сделать?`,
                buttons: [
                    [
                        {
                            text: 'Example menu',
                            callback_data: createCallbackData({
                                category: Category.Example,
                                action: GlobalAction.Paginate
                            })
                        }
                    ],
                    [
                        {
                            text: '📋 Правила',
                            callback_data: createCallbackData({
                                category: Category.Hierarchy,
                                action: HierarchyAction.Deeper,
                                param: HierarchyParam.Rules
                            })
                        },
                        {
                            text: '🛟 Помощь (FAQ)',
                            callback_data: createCallbackData({
                                category: Category.Hierarchy,
                                action: HierarchyAction.Deeper,
                                param: HierarchyParam.FAQ
                            })
                        }
                    ]
                ],
            
                [HierarchyParam.FAQ]: {
                    text: `🚧 В этом разделе собраны ответы на часто задаваемые вопросы по работе сервиса ${process.env.BOT_NAME}. Он постоянно обновляется, поэтому заходите почаще — если возникли проблемы/вопросы!

После нажатия на кнопку «❓ Часто задаваемые вопросы», откроется список вопросов, выберите интересующий Вас и нажмите соответствующую цифру.`,
                    buttons: [
                        [{
                            text: '❓ Часто задаваемые вопросы',
                            callback_data: createCallbackData({
                                category: Category.FAQ,
                                action: GlobalAction.Paginate
                            })
                        }]
                    ]
                },
                [HierarchyParam.Rules]: {
                    text: `🔖 Используя сервис ${process.env.BOT_NAME}, Вы автоматически принимаете и соглашаетесь с <a href="https://telegra.ph/Polzovatelskoe-soglashenie-11-21-18">данными правилами</a>`,
                    buttons: []
                }
            }
        }
    }
}