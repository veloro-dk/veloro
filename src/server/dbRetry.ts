import "server-only";
import { Prisma } from "@prisma/client";

const TRANSIENT_DB_ERROR_CODES = new Set(["P1001", "P1017", "P2024"]);
const TRANSIENT_DB_ERROR_PATTERNS = [
    /can't reach database server/i,
    /database .*temporarily unreachable/i,
    /server has closed the connection/i,
    /connection .*terminated/i,
    /connection .*closed/i,
    /connection .*timed out/i,
    /timeout while checking out a connection/i,
    /too many clients already/i,
    /remaining connection slots are reserved/i,
    /the database system is starting up/i,
    /connection reset/i,
    /econnreset/i,
    /etimedout/i,
];

type RetryOptions = {
    maxAttempts?: number;
    initialDelayMs?: number;
    sleep?: (ms: number) => Promise<void>;
};

function sleep(ms: number) {
    return new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });
}

function getErrorCode(error: unknown) {
    if (typeof error !== "object" || error === null || !("code" in error)) return null;
    return typeof error.code === "string" ? error.code : null;
}

export function isTransientDatabaseError(error: unknown) {
    if (error instanceof Prisma.PrismaClientInitializationError) {
        return true;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return TRANSIENT_DB_ERROR_CODES.has(error.code);
    }

    const code = getErrorCode(error);
    if (code && TRANSIENT_DB_ERROR_CODES.has(code)) {
        return true;
    }

    const message = error instanceof Error
        ? `${error.name} ${error.message}`
        : typeof error === "string"
            ? error
            : "";

    return TRANSIENT_DB_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export async function withDatabaseRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
    const initialDelayMs = Math.max(0, options.initialDelayMs ?? 75);
    const sleepFn = options.sleep ?? sleep;

    let attempt = 0;

    while (true) {
        try {
            return await operation();
        } catch (error) {
            attempt += 1;

            if (!isTransientDatabaseError(error) || attempt >= maxAttempts) {
                throw error;
            }

            await sleepFn(initialDelayMs * attempt);
        }
    }
}

export async function runBestEffortDbWrite(
    label: string,
    operation: () => Promise<unknown>,
    options?: RetryOptions
) {
    try {
        await withDatabaseRetry(operation, options);
    } catch (error) {
        if (!isTransientDatabaseError(error)) {
            throw error;
        }

        console.warn(`[db-best-effort:${label}]`, error instanceof Error ? error.message : error);
    }
}
