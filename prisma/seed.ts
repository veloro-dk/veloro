import "dotenv/config";
import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function makeSeedClient() {
    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
    if (!connectionString) throw new Error("Missing DIRECT_URL or DATABASE_URL");

    const adapter = new PrismaPg({ connectionString });
    return new PrismaClient({ adapter });
}

const prisma = makeSeedClient();
const DEFAULT_STORE_SLUG = "thompson-bicycles";
const DEFAULT_STORE_NAME = "Thompson bicycles";
const DEFAULT_PRODUCT_CODE_PREFIX = "VLR";

async function main() {
    const employeeId = String(process.env.ADMIN_EMPLOYEE_ID ?? "").trim();
    const password = String(process.env.ADMIN_PASSWORD ?? "");

    if (!employeeId || !password) {
        throw new Error("Missing ADMIN_EMPLOYEE_ID or ADMIN_PASSWORD in .env");
    }

    const defaultStore = await prisma.store.upsert({
        where: { slug: DEFAULT_STORE_SLUG },
        update: {
            name: DEFAULT_STORE_NAME,
            isActive: true,
            productCodePrefix: DEFAULT_PRODUCT_CODE_PREFIX,
            productCodeSuffix: null,
        },
        create: {
            name: DEFAULT_STORE_NAME,
            slug: DEFAULT_STORE_SLUG,
            isActive: true,
            productCodePrefix: DEFAULT_PRODUCT_CODE_PREFIX,
            productCodeSuffix: null,
        },
    });

    let admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (!admin) {
        const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

        admin = await prisma.user.create({
            data: {
                employeeId,
                name: "Lucas Thompson",
                firstName: "Lucas",
                lastName: "Thompson",
                passwordHash,
                role: "ADMIN",
                status: "ACTIVE",
                settings: {
                    create: {
                        preferredLanguage: "en",
                        preferredCurrency: "EUR",
                        activeStoreId: defaultStore.id,
                    },
                },
            },
        });
    }

    if (!admin.name?.trim()) {
        admin = await prisma.user.update({
            where: { id: admin.id },
            data: {
                name: "Lucas Thompson",
                firstName: "Lucas",
                lastName: "Thompson",
            },
        });
    }

    await prisma.userStoreAccess.upsert({
        where: {
            userId_storeId: {
                userId: admin.id,
                storeId: defaultStore.id,
            },
        },
        update: {},
        create: {
            userId: admin.id,
            storeId: defaultStore.id,
        },
    });

    await prisma.userSettings.upsert({
        where: { userId: admin.id },
        update: { activeStoreId: defaultStore.id },
        create: {
            userId: admin.id,
            preferredLanguage: "en",
            preferredCurrency: "EUR",
            activeStoreId: defaultStore.id,
        },
    });
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        await prisma.$disconnect();
        throw e;
    });
