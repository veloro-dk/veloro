import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { validateRuntimeEnv } from "@/server/envValidation";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 1000;
const MIN_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 5000;
const AUDIT_LOG_RETENTION_ADVISORY_LOCK_KEY = 84217741;

type LockRow = { locked: boolean };
type UnlockRow = { unlocked: boolean };

function parseArgs(argv: string[]) {
    let dryRun = false;
    let batchSize: number | undefined;

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === "--dry-run") {
            dryRun = true;
            continue;
        }

        if (arg === "--batch-size") {
            const value = argv[i + 1];
            i += 1;
            if (!value) {
                throw new Error("Missing value for --batch-size.");
            }

            const parsed = Number.parseInt(value, 10);
            if (!Number.isFinite(parsed)) {
                throw new Error("--batch-size must be an integer.");
            }
            batchSize = parsed;
            continue;
        }

        throw new Error(`Unknown argument: ${arg}`);
    }

    return { dryRun, batchSize };
}

function normalizeBatchSize(value?: number) {
    if (!Number.isFinite(value) || typeof value !== "number") return DEFAULT_BATCH_SIZE;
    return Math.min(Math.max(Math.trunc(value), MIN_BATCH_SIZE), MAX_BATCH_SIZE);
}

async function main() {
    const runtimeEnv = validateRuntimeEnv(process.env);
    const { dryRun, batchSize: requestedBatchSize } = parseArgs(process.argv.slice(2));
    const batchSize = normalizeBatchSize(requestedBatchSize);
    const startedAtMs = Date.now();
    const startedAtIso = new Date().toISOString();
    const retentionDays = runtimeEnv.auditLogRetentionDays;
    const cutoff = new Date(Date.now() - retentionDays * DAY_MS);
    const adapter = new PrismaPg({ connectionString: runtimeEnv.databaseUrl });
    const prisma = new PrismaClient({ adapter, log: ["error"] });
    let lockHeld = false;

    try {
        const lockRows = await prisma.$queryRaw<LockRow[]>`SELECT pg_try_advisory_lock(${AUDIT_LOG_RETENTION_ADVISORY_LOCK_KEY}) AS locked`;
        if (lockRows[0]?.locked !== true) {
            console.log("[audit-log-retention] skipped (lock not acquired)");
            console.log(
                JSON.stringify(
                    {
                        skipped: true,
                        reason: "lock-not-acquired",
                        dryRun,
                        retentionDays,
                        cutoffIso: cutoff.toISOString(),
                        batchSize,
                        deletedCount: 0,
                        batches: 0,
                        startedAt: startedAtIso,
                        finishedAt: new Date().toISOString(),
                        durationMs: Date.now() - startedAtMs,
                    },
                    null,
                    2
                )
            );
            return;
        }
        lockHeld = true;

        if (dryRun) {
            const candidateCount = await prisma.auditLog.count({
                where: { createdAt: { lt: cutoff } },
            });
            console.log("[audit-log-retention] dry run completed");
            console.log(
                JSON.stringify(
                    {
                        skipped: false,
                        reason: "completed",
                        dryRun: true,
                        retentionDays,
                        cutoffIso: cutoff.toISOString(),
                        batchSize,
                        candidateCount,
                        deletedCount: 0,
                        batches: 0,
                        startedAt: startedAtIso,
                        finishedAt: new Date().toISOString(),
                        durationMs: Date.now() - startedAtMs,
                    },
                    null,
                    2
                )
            );
            return;
        }

        let deletedCount = 0;
        let candidateCount = 0;
        let batches = 0;

        while (true) {
            const rows = await prisma.auditLog.findMany({
                where: { createdAt: { lt: cutoff } },
                orderBy: [
                    { createdAt: "asc" },
                    { id: "asc" },
                ],
                take: batchSize,
                select: { id: true },
            });
            if (rows.length === 0) break;

            candidateCount += rows.length;
            const deleted = await prisma.auditLog.deleteMany({
                where: {
                    id: {
                        in: rows.map((row) => row.id),
                    },
                },
            });
            deletedCount += deleted.count;
            batches += 1;

            if (rows.length < batchSize) break;
        }

        console.log("[audit-log-retention] run completed");
        console.log(
            JSON.stringify(
                {
                    skipped: false,
                    reason: "completed",
                    dryRun: false,
                    retentionDays,
                    cutoffIso: cutoff.toISOString(),
                    batchSize,
                    candidateCount,
                    deletedCount,
                    batches,
                    startedAt: startedAtIso,
                    finishedAt: new Date().toISOString(),
                    durationMs: Date.now() - startedAtMs,
                },
                null,
                2
            )
        );
    } finally {
        if (lockHeld) {
            await prisma.$queryRaw<UnlockRow[]>`SELECT pg_advisory_unlock(${AUDIT_LOG_RETENTION_ADVISORY_LOCK_KEY}) AS unlocked`;
        }
        await prisma.$disconnect();
    }
}

main().catch((error: unknown) => {
    console.error("[audit-log-retention] Error:", error);
    process.exit(1);
});
