import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getRuntimeEnv } from "@/server/env";

function makeClient() {
    const runtimeEnv = getRuntimeEnv();
    const adapter = new PrismaPg({ connectionString: runtimeEnv.databaseUrl });
    return new PrismaClient({ adapter, log: ["error"] });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
