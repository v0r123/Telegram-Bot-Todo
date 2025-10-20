import { Category } from "../category"

export interface HiddenCallBackData {
    category: Category,
    action: any,
    param?: string | number,
    args?: {
        [x: string]: any
    },
    approve?: boolean
}