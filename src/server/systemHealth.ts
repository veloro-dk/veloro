import "server-only";
import { isPortalPathEnabled } from "@/lib/portalFeatureFlags";
import { prisma } from "@/server/db";
import { getRuntimeEnv } from "@/server/env";

const BASE_PAGE_CHECK_PATHS = [
    "/portal/login",
    "/portal",
    "/portal/products",
    "/portal/products/categories",
    "/portal/products/inventory",
    "/portal/products/purchase-orders",
    "/portal/finance",
    "/portal/analytics",
    "/portal/analytics/reports",
    "/portal/analytics/live-view",
    "/portal/settings",
    "/portal/system-status",
] as const;

const DEFAULT_SUPABASE_FREE_DB_LIMIT_MB = 500;
const SLO_WINDOW_HOURS = 24;
const SLO_WINDOW_MS = SLO_WINDOW_HOURS * 60 * 60 * 1000;

export type SystemPageCheck = {
    path: string;
    status: number | null;
    ok: boolean;
    durationMs: number | null;
};

export type SystemStorageHotspot = {
    table: string;
    bytes: number;
};

export type SystemStorageInfo = {
    usedBytes: number | null;
    limitBytes: number | null;
    freeBytes: number | null;
    usedPercent: number | null;
    limitSource: "configured" | "estimated-free-plan";
    hotspots: SystemStorageHotspot[];
};

export type SystemSloLatency = {
    p50Ms: number | null;
    p95Ms: number | null;
    avgMs: number | null;
    maxMs: number | null;
};

export type SystemSloErrorRate = {
    currentCheckPercent: number | null;
    failedChecks: number;
    totalChecks: number;
    authFailurePercent24h: number | null;
    failedLoginAttempts24h: number | null;
    loginAttempts24h: number | null;
};

export type SystemSloDbGrowthDriver = {
    table: string;
    bytes: number | null;
    totalRows: number | null;
    newRows24h: number | null;
    avgRowBytes: number | null;
    estimatedGrowthBytes24h: number | null;
};

export type SystemSloDbGrowth = {
    estimatedBytes24h: number | null;
    estimatedPercentOfLimit24h: number | null;
    projectedDaysToLimit: number | null;
    drivers: SystemSloDbGrowthDriver[];
};

export type SystemSloSessionChurn = {
    activeSessionsNow: number | null;
    sessionsCreated24h: number | null;
    sessionsExpiring24h: number | null;
    authLogins24h: number | null;
    authLogouts24h: number | null;
    netAuthLogins24h: number | null;
    churnPercent24h: number | null;
};

export type SystemSloReport = {
    windowHours: number;
    errorRate: SystemSloErrorRate;
    latency: SystemSloLatency;
    dbGrowth: SystemSloDbGrowth;
    sessionChurn: SystemSloSessionChurn;
};

export type SystemHealthReport = {
    ok: boolean;
    dbOk: boolean;
    pagesOk: boolean;
    checkedAt: string;
    durationMs: number;
    checks: SystemPageCheck[];
    storage: SystemStorageInfo;
    slo: SystemSloReport;
};

function toNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "bigint") return Number(value);
    if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function round(value: number, digits = 1) {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function toPercent(part: number, total: number, digits = 1) {
    if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return null;
    return round((part / total) * 100, digits);
}

function percentile(values: number[], percentileValue: number) {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const rank = Math.ceil((percentileValue / 100) * sorted.length) - 1;
    const index = Math.min(Math.max(rank, 0), sorted.length - 1);
    return sorted[index] ?? null;
}

function isPageHealthyStatus(status: number) {
    return status >= 200 && status < 400;
}

function buildLatencyStats(checks: SystemPageCheck[]): SystemSloLatency {
    const samples = checks
        .map((check) => check.durationMs)
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

    if (samples.length === 0) {
        return {
            p50Ms: null,
            p95Ms: null,
            avgMs: null,
            maxMs: null,
        };
    }

    const sum = samples.reduce((acc, value) => acc + value, 0);
    const p50 = percentile(samples, 50);
    const p95 = percentile(samples, 95);
    const max = Math.max(...samples);

    return {
        p50Ms: p50 === null ? null : round(p50, 1),
        p95Ms: p95 === null ? null : round(p95, 1),
        avgMs: round(sum / samples.length, 1),
        maxMs: round(max, 1),
    };
}

function defaultDbGrowthDrivers(): SystemSloDbGrowthDriver[] {
    return [
        {
            table: "AuditLog",
            bytes: null,
            totalRows: null,
            newRows24h: null,
            avgRowBytes: null,
            estimatedGrowthBytes24h: null,
        },
        {
            table: "LoginAttempt",
            bytes: null,
            totalRows: null,
            newRows24h: null,
            avgRowBytes: null,
            estimatedGrowthBytes24h: null,
        },
        {
            table: "Session",
            bytes: null,
            totalRows: null,
            newRows24h: null,
            avgRowBytes: null,
            estimatedGrowthBytes24h: null,
        },
    ];
}

export async function runSystemHealthCheck({
    origin,
    cookieHeader,
}: {
    origin: string;
    cookieHeader?: string | null;
}): Promise<SystemHealthReport> {
    const startedAt = Date.now();

    let dbOk = true;
    try {
        await prisma.$queryRaw`SELECT 1`;
    } catch {
        dbOk = false;
    }

    const runtimeEnv = getRuntimeEnv();
    const configuredLimitMb = runtimeEnv.supabaseDbLimitMb;
    const hasConfiguredLimit = configuredLimitMb !== null;
    const limitMb = configuredLimitMb ?? DEFAULT_SUPABASE_FREE_DB_LIMIT_MB;
    const limitBytes = Math.round(limitMb * 1024 * 1024);

    let usedBytes: number | null = null;
    let hotspots: SystemStorageHotspot[] = [];

    let loginAttempts24h: number | null = null;
    let failedLoginAttempts24h: number | null = null;
    let authLogins24h: number | null = null;
    let authLogouts24h: number | null = null;
    let sessionsCreated24h: number | null = null;
    let sessionsExpiring24h: number | null = null;
    let activeSessionsNow: number | null = null;
    let auditLogRowsTotal: number | null = null;
    let auditLogRows24h: number | null = null;
    let loginAttemptRowsTotal: number | null = null;
    let sessionRowsTotal: number | null = null;
    let dbGrowthDrivers = defaultDbGrowthDrivers();

    const now = new Date();
    const windowStart = new Date(now.getTime() - SLO_WINDOW_MS);

    if (dbOk) {
        try {
            const sizeRows = await prisma.$queryRaw<Array<{ bytes: unknown }>>`SELECT pg_database_size(current_database()) AS bytes`;
            usedBytes = toNumber(sizeRows[0]?.bytes);
        } catch {
            usedBytes = null;
        }

        try {
            const tableRows = await prisma.$queryRaw<Array<{ table_name: string; bytes: unknown }>>`
                SELECT c.relname AS table_name, pg_total_relation_size(c.oid) AS bytes
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = 'public'
                  AND c.relname IN ('AuditLog', 'LoginAttempt', 'Session')
                ORDER BY pg_total_relation_size(c.oid) DESC
            `;

            hotspots = tableRows
                .map((row) => ({
                    table: row.table_name,
                    bytes: toNumber(row.bytes) ?? 0,
                }))
                .filter((row) => row.bytes > 0);
        } catch {
            hotspots = [];
        }

        try {
            const [
                loginAttempts24hValue,
                failedLoginAttempts24hValue,
                authLogins24hValue,
                authLogouts24hValue,
                sessionsCreated24hValue,
                sessionsExpiring24hValue,
                activeSessionsNowValue,
                auditLogRowsTotalValue,
                auditLogRows24hValue,
                loginAttemptRowsTotalValue,
                sessionRowsTotalValue,
            ] = await Promise.all([
                prisma.loginAttempt.count({
                    where: {
                        createdAt: { gt: windowStart },
                    },
                }),
                prisma.loginAttempt.count({
                    where: {
                        ok: false,
                        createdAt: { gt: windowStart },
                    },
                }),
                prisma.auditLog.count({
                    where: {
                        action: "AUTH_LOGIN",
                        createdAt: { gt: windowStart },
                    },
                }),
                prisma.auditLog.count({
                    where: {
                        action: "AUTH_LOGOUT",
                        createdAt: { gt: windowStart },
                    },
                }),
                prisma.session.count({
                    where: {
                        createdAt: { gt: windowStart },
                    },
                }),
                prisma.session.count({
                    where: {
                        expiresAt: {
                            gt: windowStart,
                            lte: now,
                        },
                    },
                }),
                prisma.session.count({
                    where: {
                        expiresAt: { gt: now },
                    },
                }),
                prisma.auditLog.count(),
                prisma.auditLog.count({
                    where: {
                        createdAt: { gt: windowStart },
                    },
                }),
                prisma.loginAttempt.count(),
                prisma.session.count(),
            ]);

            loginAttempts24h = loginAttempts24hValue;
            failedLoginAttempts24h = failedLoginAttempts24hValue;
            authLogins24h = authLogins24hValue;
            authLogouts24h = authLogouts24hValue;
            sessionsCreated24h = sessionsCreated24hValue;
            sessionsExpiring24h = sessionsExpiring24hValue;
            activeSessionsNow = activeSessionsNowValue;
            auditLogRowsTotal = auditLogRowsTotalValue;
            auditLogRows24h = auditLogRows24hValue;
            loginAttemptRowsTotal = loginAttemptRowsTotalValue;
            sessionRowsTotal = sessionRowsTotalValue;

            const tableBytesByName = new Map<string, number>();
            for (const hotspot of hotspots) {
                tableBytesByName.set(hotspot.table, hotspot.bytes);
            }

            dbGrowthDrivers = [
                {
                    table: "AuditLog",
                    bytes: tableBytesByName.get("AuditLog") ?? null,
                    totalRows: auditLogRowsTotal,
                    newRows24h: auditLogRows24h,
                },
                {
                    table: "LoginAttempt",
                    bytes: tableBytesByName.get("LoginAttempt") ?? null,
                    totalRows: loginAttemptRowsTotal,
                    newRows24h: loginAttempts24h,
                },
                {
                    table: "Session",
                    bytes: tableBytesByName.get("Session") ?? null,
                    totalRows: sessionRowsTotal,
                    newRows24h: sessionsCreated24h,
                },
            ].map((driver) => {
                const avgRowBytesRaw = driver.bytes === null || !driver.totalRows || driver.totalRows <= 0
                    ? null
                    : driver.bytes / driver.totalRows;

                const estimatedGrowthBytes24h = avgRowBytesRaw === null || driver.newRows24h === null
                    ? null
                    : Math.round(avgRowBytesRaw * driver.newRows24h);

                return {
                    ...driver,
                    avgRowBytes: avgRowBytesRaw === null ? null : round(avgRowBytesRaw, 1),
                    estimatedGrowthBytes24h,
                } satisfies SystemSloDbGrowthDriver;
            });
        } catch {
            loginAttempts24h = null;
            failedLoginAttempts24h = null;
            authLogins24h = null;
            authLogouts24h = null;
            sessionsCreated24h = null;
            sessionsExpiring24h = null;
            activeSessionsNow = null;
            auditLogRowsTotal = null;
            auditLogRows24h = null;
            loginAttemptRowsTotal = null;
            sessionRowsTotal = null;
            dbGrowthDrivers = defaultDbGrowthDrivers();
        }
    }

    const pageCheckPaths = BASE_PAGE_CHECK_PATHS.filter((path) => isPortalPathEnabled(path, runtimeEnv.featureFlags));

    const pageChecks: SystemPageCheck[] = await Promise.all(
        pageCheckPaths.map(async (path) => {
            const started = Date.now();
            try {
                const response = await fetch(new URL(path, origin), {
                    method: "GET",
                    redirect: "manual",
                    cache: "no-store",
                    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
                });

                return {
                    path,
                    status: response.status,
                    ok: isPageHealthyStatus(response.status),
                    durationMs: Date.now() - started,
                };
            } catch {
                return {
                    path,
                    status: null,
                    ok: false,
                    durationMs: Date.now() - started,
                };
            }
        })
    );

    const pagesOk = pageChecks.every((check) => check.ok);

    const freeBytes = usedBytes === null ? null : Math.max(limitBytes - usedBytes, 0);
    const usedPercent = usedBytes === null || limitBytes <= 0 ? null : round((usedBytes / limitBytes) * 100, 1);

    const totalChecks = pageChecks.length + 1;
    const failedChecks = pageChecks.filter((check) => !check.ok).length + (dbOk ? 0 : 1);

    const currentCheckErrorPercent = toPercent(failedChecks, totalChecks, 1);
    const authFailurePercent24h = (
        failedLoginAttempts24h === null || loginAttempts24h === null
            ? null
            : toPercent(failedLoginAttempts24h, loginAttempts24h, 1)
    );

    const estimatedGrowthCandidates = dbGrowthDrivers
        .map((driver) => driver.estimatedGrowthBytes24h)
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    const estimatedBytes24h = estimatedGrowthCandidates.length > 0
        ? estimatedGrowthCandidates.reduce((sum, value) => sum + value, 0)
        : null;

    const estimatedPercentOfLimit24h = estimatedBytes24h === null ? null : toPercent(estimatedBytes24h, limitBytes, 3);
    const projectedDaysToLimit = estimatedBytes24h !== null
        && estimatedBytes24h > 0
        && freeBytes !== null
        ? round(freeBytes / estimatedBytes24h, 1)
        : null;

    const churnPercent24h = sessionsCreated24h !== null
        && activeSessionsNow !== null
        && activeSessionsNow > 0
        ? toPercent(sessionsCreated24h, activeSessionsNow, 1)
        : null;

    const netAuthLogins24h = authLogins24h === null || authLogouts24h === null
        ? null
        : authLogins24h - authLogouts24h;

    return {
        ok: dbOk && pagesOk,
        dbOk,
        pagesOk,
        checkedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        checks: pageChecks,
        storage: {
            usedBytes,
            limitBytes,
            freeBytes,
            usedPercent,
            limitSource: hasConfiguredLimit ? "configured" : "estimated-free-plan",
            hotspots,
        },
        slo: {
            windowHours: SLO_WINDOW_HOURS,
            errorRate: {
                currentCheckPercent: currentCheckErrorPercent,
                failedChecks,
                totalChecks,
                authFailurePercent24h,
                failedLoginAttempts24h,
                loginAttempts24h,
            },
            latency: buildLatencyStats(pageChecks),
            dbGrowth: {
                estimatedBytes24h,
                estimatedPercentOfLimit24h,
                projectedDaysToLimit,
                drivers: dbGrowthDrivers,
            },
            sessionChurn: {
                activeSessionsNow,
                sessionsCreated24h,
                sessionsExpiring24h,
                authLogins24h,
                authLogouts24h,
                netAuthLogins24h,
                churnPercent24h,
            },
        },
    };
}
