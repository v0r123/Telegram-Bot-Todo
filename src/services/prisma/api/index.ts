
import { Todo, User } from "@prisma/client"
import { PrismaDataBase } from ".."

export class API {

    database: PrismaDataBase

    constructor(database: PrismaDataBase) {
        this.database = database
    }

    get user() {
        return this.database.user
    }

    async getUser(chatId: string): Promise<User> | null {
        return await this.database.user.findFirstOrThrow({ where: { chatId: chatId } })
    }

    async getTodoList(userId: number, pageSize: number = 5, offset: number = 0): Promise<[Todo[], number]> | null {
        return await this.database.extended.todo.findManyAndCount({
            where: { userId },
            select: {
                id: true,
                title: true,
                isCompleted: true
            },
            take: pageSize + 1,
            skip: offset,
            orderBy: {
                id: 'desc'
            }
        })
    }

    async getTodo(userId: number, todo: Partial<Todo>) {
        return await this.database.todo.findFirstOrThrow({ where: { id: todo.id, userId } })
    }

    async createTodo(todo: Todo) {
        return await this.database.todo.create({ data: todo })
    }

    async updateTodo(userId: number, todo: Partial<Todo>) {
        return await this.database.todo.update({ data: todo, where: { id: todo.id, userId } })
    }

    async deleteTodo(userId: number, todo: Partial<Todo>) {
        return await this.database.todo.delete({ where: { id: todo.id, userId } })
    }


}