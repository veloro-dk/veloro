import { Prisma } from "@prisma/client";

export const PREFERRED_CURRENCY_COOKIE_NAME = "veloro_preferred_currency";

type UserSettingsSafeShape = {
    preferredLanguage: string | null;
    preferredCurrency: string | null;
    timeZone: string | null;
    dateFormat: string | null;
    weekStartDay: string | null;
    defaultTimeZone: string | null;
    defaultCurrency: string | null;
    activeStoreId: string | null;
};

type UserSettingsFindUniqueArgs = {
    where: { userId: string };
    select: {
        preferredLanguage: true;
        preferredCurrency: true;
        timeZone: true;
        dateFormat: true;
        weekStartDay: true;
        defaultTimeZone: true;
        defaultCurrency: true;
        activeStoreId: true;
    };
};

type UserSettingsSafeReader = {
    userSettings: {
        findUnique: (args: UserSettingsFindUniqueArgs) => Promise<UserSettingsSafeShape | null>;
    };
    $queryRaw: <T = unknown>(query: TemplateStringsArray, ...values: unknown[]) => Promise<T>;
};

function toNullableString(value: unknown) {
    return typeof value === "string" ? value : null;
}

export function isMissingDbColumnError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return error.code === "P2022";
    }
    if (error instanceof Error) {
        return /column/i.test(error.message) && /does not exist|not available|unknown/i.test(error.message);
    }
    return false;
}

export async function findUserSettingsSafe(
    db: UserSettingsSafeReader,
    userId: string
) {
    try {
        return await db.userSettings.findUnique({
            where: { userId },
            select: {
                preferredLanguage: true,
                preferredCurrency: true,
                timeZone: true,
                dateFormat: true,
                weekStartDay: true,
                defaultTimeZone: true,
                defaultCurrency: true,
                activeStoreId: true,
            },
        });
    } catch (error) {
        if (!isMissingDbColumnError(error)) throw error;
    }

    try {
        const rows = await db.$queryRaw<Record<string, unknown>[]>`
            SELECT *
            FROM "UserSettings"
            WHERE "userId" = ${userId}
            LIMIT 1
        `;
        const row = rows[0];
        if (!row) return null;
        return {
            preferredLanguage: toNullableString(row.preferredLanguage),
            preferredCurrency: toNullableString(row.preferredCurrency),
            timeZone: toNullableString(row.timeZone),
            dateFormat: toNullableString(row.dateFormat),
            weekStartDay: toNullableString(row.weekStartDay),
            defaultTimeZone: toNullableString(row.defaultTimeZone),
            defaultCurrency: toNullableString(row.defaultCurrency),
            activeStoreId: toNullableString(row.activeStoreId),
        };
    } catch {
        return null;
    }
}
