import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { isTransientDatabaseError, withDatabaseRetry } from "@/server/dbRetry";
import { isMissingDbColumnError } from "@/server/userSettings";

export type UserStoreSummary = {
    id: string;
    name: string;
    slug: string;
};

export type UserStoreContext = {
    stores: UserStoreSummary[];
    activeStoreId: string;
};

const DEFAULT_STORE_NAME = "Thompson bicycles";
const DEFAULT_STORE_SLUG = "thompson-bicycles";
const DEFAULT_PRODUCT_CODE_PREFIX = "VLR";

export async function ensureDefaultStore() {
    return withDatabaseRetry(() => prisma.store.upsert({
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
        select: {
            id: true,
            name: true,
            slug: true,
        },
    }));
}

export async function getUserStoreContext(userId: string): Promise<UserStoreContext> {
    let accessRows = await withDatabaseRetry(() => prisma.userStoreAccess.findMany({
        where: {
            userId,
            store: { isActive: true },
        },
        orderBy: {
            store: { name: "asc" },
        },
        select: {
            store: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                },
            },
        },
    }));

    if (accessRows.length === 0) {
        const defaultStore = await ensureDefaultStore();

        await prisma.userStoreAccess.create({
            data: {
                userId,
                storeId: defaultStore.id,
            },
        }).catch(() => undefined);

        accessRows = await withDatabaseRetry(() => prisma.userStoreAccess.findMany({
            where: {
                userId,
                store: { isActive: true },
            },
            orderBy: {
                store: { name: "asc" },
            },
            select: {
                store: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
        }));
    }

    const stores = accessRows.map((row) => row.store);
    if (stores.length === 0) {
        throw new Error("User has no active store access.");
    }

    const settings = await withDatabaseRetry(() => prisma.userSettings.findUnique({
        where: { userId },
        select: { activeStoreId: true },
    })).catch((error: unknown) => {
        if (isMissingDbColumnError(error)) return null;
        throw error;
    });

    const storeIdSet = new Set(stores.map((store) => store.id));
    const activeStoreId = settings?.activeStoreId && storeIdSet.has(settings.activeStoreId)
        ? settings.activeStoreId
        : stores[0].id;

    if (settings?.activeStoreId !== activeStoreId) {
        try {
            await withDatabaseRetry(() => prisma.userSettings.upsert({
                where: { userId },
                update: { activeStoreId },
                create: {
                    userId,
                    activeStoreId,
                },
            }));
        } catch (error) {
            if (isMissingDbColumnError(error)) return {
                stores,
                activeStoreId,
            };

            if (
                error instanceof Prisma.PrismaClientKnownRequestError
                && error.code === "P2002"
            ) {
                return {
                    stores,
                    activeStoreId,
                };
            }

            if (isTransientDatabaseError(error)) {
                console.warn("[db-best-effort:active_store_sync]", error instanceof Error ? error.message : error);
            } else {
                throw error;
            }
        }
    }

    return {
        stores,
        activeStoreId,
    };
}

export async function userCanAccessStore(userId: string, storeId: string) {
    const record = await withDatabaseRetry(() => prisma.userStoreAccess.findUnique({
        where: {
            userId_storeId: {
                userId,
                storeId,
            },
        },
        select: {
            store: {
                select: {
                    isActive: true,
                },
            },
        },
    }));

    return !!record?.store.isActive;
}
