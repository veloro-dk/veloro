import "server-only";
import { prisma } from "@/server/db";
import { getRuntimeEnv } from "@/server/env";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 1000;
const MIN_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 5000;
const AUDIT_LOG_RETENTION_ADVISORY_LOCK_KEY = 84217741;

type LockRow = { locked: boolean };
type UnlockRow = { unlocked: boolean };

export type RunAuditLogRetentionOptions = {
    now?: Date;
    retentionDays?: number;
    batchSize?: number;
    dryRun?: boolean;
    useAdvisoryLock?: boolean;
};

export type AuditLogRetentionRunResult = {
    skipped: boolean;
    reason: "completed" | "lock-not-acquired";
    retentionDays: number;
    cutoffIso: string;
    dryRun: boolean;
    batchSize: number;
    candidateCount: number;
    deletedCount: number;
    batches: number;
    startedAt: string;
    finishedAt: string;
    durationMs: number;
};

export function getAuditLogRetentionDays() {
    return getRuntimeEnv().auditLogRetentionDays;
}

export function buildAuditLogCutoff(now: Date, retentionDays: number) {
    return new Date(now.getTime() - retentionDays * DAY_MS);
}

function normalizeBatchSize(value?: number) {
    if (!Number.isFinite(value) || typeof value !== "number") return DEFAULT_BATCH_SIZE;
    return Math.min(Math.max(Math.trunc(value), MIN_BATCH_SIZE), MAX_BATCH_SIZE);
}

async function acquireAdvisoryLock() {
    const rows = await prisma.$queryRaw<LockRow[]>`SELECT pg_try_advisory_lock(${AUDIT_LOG_RETENTION_ADVISORY_LOCK_KEY}) AS locked`;
    return rows[0]?.locked === true;
}

async function releaseAdvisoryLock() {
    const rows = await prisma.$queryRaw<UnlockRow[]>`SELECT pg_advisory_unlock(${AUDIT_LOG_RETENTION_ADVISORY_LOCK_KEY}) AS unlocked`;
    return rows[0]?.unlocked === true;
}

export async function runAuditLogRetention(
    options: RunAuditLogRetentionOptions = {}
): Promise<AuditLogRetentionRunResult> {
    const startedAtDate = new Date();
    const startedAtMs = startedAtDate.getTime();
    const now = options.now ?? startedAtDate;
    const retentionDays = options.retentionDays ?? getAuditLogRetentionDays();
    const cutoff = buildAuditLogCutoff(now, retentionDays);
    const batchSize = normalizeBatchSize(options.batchSize);
    const dryRun = options.dryRun === true;
    const shouldUseAdvisoryLock = options.useAdvisoryLock !== false;
    let lockHeld = false;

    if (shouldUseAdvisoryLock) {
        const lockAcquired = await acquireAdvisoryLock();
        if (!lockAcquired) {
            return {
                skipped: true,
                reason: "lock-not-acquired",
                retentionDays,
                cutoffIso: cutoff.toISOString(),
                dryRun,
                batchSize,
                candidateCount: 0,
                deletedCount: 0,
                batches: 0,
                startedAt: startedAtDate.toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: Date.now() - startedAtMs,
            };
        }
        lockHeld = true;
    }

    try {
        const where = {
            createdAt: {
                lt: cutoff,
            },
        } as const;

        if (dryRun) {
            const candidateCount = await prisma.auditLog.count({ where });
            return {
                skipped: false,
                reason: "completed",
                retentionDays,
                cutoffIso: cutoff.toISOString(),
                dryRun: true,
                batchSize,
                candidateCount,
                deletedCount: 0,
                batches: 0,
                startedAt: startedAtDate.toISOString(),
                finishedAt: new Date().toISOString(),
                durationMs: Date.now() - startedAtMs,
            };
        }

        let candidateCount = 0;
        let deletedCount = 0;
        let batches = 0;

        while (true) {
            const rows = await prisma.auditLog.findMany({
                where,
                orderBy: [
                    { createdAt: "asc" },
                    { id: "asc" },
                ],
                take: batchSize,
                select: { id: true },
            });
            if (rows.length === 0) break;

            candidateCount += rows.length;
            const ids = rows.map((row) => row.id);
            const deleted = await prisma.auditLog.deleteMany({
                where: {
                    id: {
                        in: ids,
                    },
                },
            });

            deletedCount += deleted.count;
            batches += 1;

            if (rows.length < batchSize) break;
        }

        return {
            skipped: false,
            reason: "completed",
            retentionDays,
            cutoffIso: cutoff.toISOString(),
            dryRun: false,
            batchSize,
            candidateCount,
            deletedCount,
            batches,
            startedAt: startedAtDate.toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs: Date.now() - startedAtMs,
        };
    } finally {
        if (lockHeld) {
            await releaseAdvisoryLock();
        }
    }
}
