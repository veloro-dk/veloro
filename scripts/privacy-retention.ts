import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { validateRuntimeEnv } from "@/server/envValidation";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LOGIN_ATTEMPT_RETENTION_DAYS = 90;
const DEFAULT_FEEDBACK_RETENTION_DAYS = 365;
const MIN_RETENTION_DAYS = 7;
const MAX_RETENTION_DAYS = 3650;
const PRIVACY_RETENTION_ADVISORY_LOCK_KEY = 84217743;

type LockRow = { locked: boolean };
type UnlockRow = { unlocked: boolean };

type ParsedArgs = {
    dryRun: boolean;
    loginAttemptRetentionDays?: number;
    feedbackRetentionDays?: number;
};

function parseIntegerArg(value: string, label: string) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
        throw new Error(`${label} must be an integer.`);
    }
    return parsed;
}

function normalizeRetentionDays(value: number, label: string) {
    if (!Number.isFinite(value) || value < MIN_RETENTION_DAYS || value > MAX_RETENTION_DAYS) {
        throw new Error(`${label} must be between ${MIN_RETENTION_DAYS} and ${MAX_RETENTION_DAYS}.`);
    }
    return Math.trunc(value);
}

function parseBooleanEnv(name: string, fallback = false) {
    const raw = (process.env[name] || "").trim().toLowerCase();
    if (!raw) return fallback;
    if (["1", "true", "yes", "on"].includes(raw)) return true;
    if (["0", "false", "no", "off"].includes(raw)) return false;
    throw new Error(`${name} must be a boolean.`);
}

function parseArgs(argv: string[]): ParsedArgs {
    const parsed: ParsedArgs = {
        dryRun: parseBooleanEnv("PRIVACY_RETENTION_DRY_RUN", false),
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === "--dry-run") {
            parsed.dryRun = true;
            continue;
        }

        if (arg === "--login-attempt-days") {
            const value = argv[i + 1];
            i += 1;
            if (!value) throw new Error("Missing value for --login-attempt-days.");
            parsed.loginAttemptRetentionDays = parseIntegerArg(value, "--login-attempt-days");
            continue;
        }

        if (arg === "--feedback-days") {
            const value = argv[i + 1];
            i += 1;
            if (!value) throw new Error("Missing value for --feedback-days.");
            parsed.feedbackRetentionDays = parseIntegerArg(value, "--feedback-days");
            continue;
        }

        throw new Error(`Unknown argument: ${arg}`);
    }

    return parsed;
}

function readRetentionDays(
    argsValue: number | undefined,
    envName: string,
    fallback: number,
    label: string
) {
    if (Number.isFinite(argsValue)) {
        return normalizeRetentionDays(argsValue as number, label);
    }

    const envRaw = (process.env[envName] || "").trim();
    if (!envRaw) return fallback;
    return normalizeRetentionDays(parseIntegerArg(envRaw, envName), label);
}

async function main() {
    const runtimeEnv = validateRuntimeEnv(process.env);
    const args = parseArgs(process.argv.slice(2));
    const loginAttemptRetentionDays = readRetentionDays(
        args.loginAttemptRetentionDays,
        "PRIVACY_LOGIN_ATTEMPT_RETENTION_DAYS",
        DEFAULT_LOGIN_ATTEMPT_RETENTION_DAYS,
        "Login attempt retention days"
    );
    const feedbackRetentionDays = readRetentionDays(
        args.feedbackRetentionDays,
        "PRIVACY_FEEDBACK_RETENTION_DAYS",
        DEFAULT_FEEDBACK_RETENTION_DAYS,
        "Feedback retention days"
    );

    const startedAtMs = Date.now();
    const startedAtIso = new Date().toISOString();
    const loginAttemptCutoff = new Date(Date.now() - loginAttemptRetentionDays * DAY_MS);
    const feedbackCutoff = new Date(Date.now() - feedbackRetentionDays * DAY_MS);

    const adapter = new PrismaPg({ connectionString: runtimeEnv.databaseUrl });
    const prisma = new PrismaClient({ adapter, log: ["error"] });
    let lockHeld = false;

    try {
        const lockRows = await prisma.$queryRaw<LockRow[]>`SELECT pg_try_advisory_lock(${PRIVACY_RETENTION_ADVISORY_LOCK_KEY}) AS locked`;
        if (lockRows[0]?.locked !== true) {
            console.log("[privacy-retention] skipped (lock not acquired)");
            console.log(
                JSON.stringify(
                    {
                        skipped: true,
                        reason: "lock-not-acquired",
                        dryRun: args.dryRun,
                        loginAttemptRetentionDays,
                        feedbackRetentionDays,
                        loginAttemptCutoffIso: loginAttemptCutoff.toISOString(),
                        feedbackCutoffIso: feedbackCutoff.toISOString(),
                        expiredSessionsDeleted: 0,
                        loginAttemptsDeleted: 0,
                        feedbackMessagesDeleted: 0,
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

        const [expiredSessionCandidates, loginAttemptCandidates, feedbackCandidates] = await Promise.all([
            prisma.session.count({
                where: { expiresAt: { lt: new Date() } },
            }),
            prisma.loginAttempt.count({
                where: { createdAt: { lt: loginAttemptCutoff } },
            }),
            prisma.feedbackMessage.count({
                where: { createdAt: { lt: feedbackCutoff } },
            }),
        ]);

        if (args.dryRun) {
            console.log("[privacy-retention] dry run completed");
            console.log(
                JSON.stringify(
                    {
                        skipped: false,
                        reason: "completed",
                        dryRun: true,
                        loginAttemptRetentionDays,
                        feedbackRetentionDays,
                        loginAttemptCutoffIso: loginAttemptCutoff.toISOString(),
                        feedbackCutoffIso: feedbackCutoff.toISOString(),
                        expiredSessionCandidates,
                        loginAttemptCandidates,
                        feedbackCandidates,
                        expiredSessionsDeleted: 0,
                        loginAttemptsDeleted: 0,
                        feedbackMessagesDeleted: 0,
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

        const [expiredSessionsDeleted, loginAttemptsDeleted, feedbackMessagesDeleted] = await Promise.all([
            prisma.session.deleteMany({
                where: { expiresAt: { lt: new Date() } },
            }),
            prisma.loginAttempt.deleteMany({
                where: { createdAt: { lt: loginAttemptCutoff } },
            }),
            prisma.feedbackMessage.deleteMany({
                where: { createdAt: { lt: feedbackCutoff } },
            }),
        ]);

        console.log("[privacy-retention] run completed");
        console.log(
            JSON.stringify(
                {
                    skipped: false,
                    reason: "completed",
                    dryRun: false,
                    loginAttemptRetentionDays,
                    feedbackRetentionDays,
                    loginAttemptCutoffIso: loginAttemptCutoff.toISOString(),
                    feedbackCutoffIso: feedbackCutoff.toISOString(),
                    expiredSessionCandidates,
                    loginAttemptCandidates,
                    feedbackCandidates,
                    expiredSessionsDeleted: expiredSessionsDeleted.count,
                    loginAttemptsDeleted: loginAttemptsDeleted.count,
                    feedbackMessagesDeleted: feedbackMessagesDeleted.count,
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
            await prisma.$queryRaw<UnlockRow[]>`SELECT pg_advisory_unlock(${PRIVACY_RETENTION_ADVISORY_LOCK_KEY}) AS unlocked`;
        }
        await prisma.$disconnect();
    }
}

main().catch((error: unknown) => {
    console.error("[privacy-retention] Error:", error);
    process.exit(1);
});
