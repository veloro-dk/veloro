import "dotenv/config";
import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function makeClient() {
    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
    if (!connectionString) throw new Error("Missing DIRECT_URL or DATABASE_URL");
    const adapter = new PrismaPg({ connectionString });
    return new PrismaClient({ adapter });
}

const prisma = makeClient();

async function main() {
    const employeeId = String(process.env.ADMIN_EMPLOYEE_ID ?? "").trim();
    const password = String(process.env.ADMIN_PASSWORD ?? "");

    if (!employeeId || !password) {
        throw new Error("Missing ADMIN_EMPLOYEE_ID or ADMIN_PASSWORD in .env");
    }

    const user = await prisma.user.findUnique({ where: { employeeId } });
    if (!user) {
        throw new Error(`User not found: ${employeeId}`);
    }

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

    await prisma.user.update({
        where: { employeeId },
        data: { passwordHash, status: "ACTIVE" },
    });

    await prisma.loginAttempt.deleteMany({ where: { employeeId } });
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        await prisma.$disconnect();
        throw e;
    });