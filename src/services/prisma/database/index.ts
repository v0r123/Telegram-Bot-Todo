import { Prisma, PrismaClient } from "@prisma/client";
import { IDataBase } from "../types";

export class DataBase extends PrismaClient implements IDataBase {

    private static instance: PrismaClient;

    static getInstance() {
        if (!this.instance) {
            this.instance = new PrismaClient()
        }

        return this.instance;
    }

    get extended() {
        return DataBase.getInstance().$extends({
            name: "findManyAndCount",
            model: {
                $allModels: {
                    async findManyAndCount<Model, Args>(
                        this: Model,
                        args: Prisma.Args<Model, "findMany">
                    ): Promise<[Prisma.Result<Model, Args, "findMany">, number]> {
                        const context = Prisma.getExtensionContext(this);

                        return DataBase.getInstance().$transaction([
                            (context as any).findMany(args),
                            (context as any).count({ where: args.where }),
                        ]) as Promise<[Prisma.Result<Model, Args, "findMany">, number]>;
                    },
                },
            },
        })
    }

    async init(): Promise<void> {
        await this.$connect();
    }

    async disconnect(): Promise<void> {
        await this.$disconnect();
    }
}