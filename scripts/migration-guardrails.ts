import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

type DbMigrationRow = {
    migrationName: string;
    startedAt: string | null;
    finishedAt: string | null;
    rolledBackAt: string | null;
    appliedStepsCount: number;
    logs: string | null;
};

type GuardrailReport = {
    generatedAt: string;
    allowPending: boolean;
    localMigrationCount: number;
    appliedMigrationCount: number;
    rolledBackMigrationCount: number;
    failedMigrationCount: number;
    pendingLocalMigrations: string[];
    unknownAppliedMigrations: string[];
    failedMigrations: Array<{
        migrationName: string;
        startedAt: string | null;
        logs: string | null;
    }>;
    status: "passed" | "failed";
};

function resolveConnectionString() {
    const value = process.env.DIRECT_URL || process.env.DATABASE_URL;
    if (!value) throw new Error("Missing DIRECT_URL or DATABASE_URL");
    return value;
}

function parseBooleanEnv(name: string, fallback: boolean) {
    const raw = process.env[name];
    if (raw === undefined) return fallback;
    const normalized = raw.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
    throw new Error(`Invalid boolean value for ${name}: "${raw}"`);
}

function toIsoString(value: unknown) {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString();
    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
}

function toNumber(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function unique(values: string[]) {
    return [...new Set(values)];
}

function readLocalMigrationNames() {
    const migrationsDir = path.resolve(process.cwd(), "prisma/migrations");
    if (!fs.existsSync(migrationsDir)) {
        throw new Error(`Missing prisma migrations directory: ${migrationsDir}`);
    }

    return fs
        .readdirSync(migrationsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .filter((name) => fs.existsSync(path.join(migrationsDir, name, "migration.sql")))
        .sort();
}

async function hasPrismaMigrationsTable(prisma: PrismaClient) {
    const result = await prisma.$queryRawUnsafe<Array<{ exists: string | null }>>(
        "SELECT to_regclass('public._prisma_migrations')::text AS exists"
    );
    return Boolean(result[0]?.exists);
}

async function readDbMigrations(prisma: PrismaClient) {
    const result = await prisma.$queryRawUnsafe<
        Array<{
            migration_name: string;
            started_at: unknown;
            finished_at: unknown;
            rolled_back_at: unknown;
            applied_steps_count: unknown;
            logs: string | null;
        }>
    >(
        [
            "SELECT migration_name, started_at, finished_at, rolled_back_at, applied_steps_count, logs",
            'FROM "_prisma_migrations"',
            "ORDER BY started_at ASC NULLS LAST, migration_name ASC",
        ].join(" ")
    );

    return result.map<DbMigrationRow>((row) => ({
        migrationName: row.migration_name,
        startedAt: toIsoString(row.started_at),
        finishedAt: toIsoString(row.finished_at),
        rolledBackAt: toIsoString(row.rolled_back_at),
        appliedStepsCount: toNumber(row.applied_steps_count),
        logs: row.logs,
    }));
}

function writeReportIfRequested(report: GuardrailReport) {
    const outputFile = (process.env.MIGRATION_GUARD_OUTPUT_FILE || "").trim();
    if (!outputFile) return;

    const resolvedPath = path.resolve(process.cwd(), outputFile);
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    fs.writeFileSync(resolvedPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`Guardrail report written to: ${resolvedPath}`);
}

async function main() {
    const allowPending = parseBooleanEnv("MIGRATION_GUARD_ALLOW_PENDING", false);
    const localMigrations = readLocalMigrationNames();

    const adapter = new PrismaPg({ connectionString: resolveConnectionString() });
    const prisma = new PrismaClient({ adapter, log: ["error"] });

    try {
        const hasTable = await hasPrismaMigrationsTable(prisma);
        if (!hasTable) {
            throw new Error('Missing "_prisma_migrations" table. Run `npx prisma migrate deploy` first.');
        }

        const dbRows = await readDbMigrations(prisma);

        const failedRows = dbRows.filter((row) => !row.finishedAt && !row.rolledBackAt);
        const rolledBack = unique(dbRows.filter((row) => row.rolledBackAt).map((row) => row.migrationName));
        const applied = unique(
            dbRows.filter((row) => row.finishedAt && !row.rolledBackAt).map((row) => row.migrationName)
        );

        const localSet = new Set(localMigrations);
        const appliedSet = new Set(applied);

        const pendingLocal = localMigrations.filter((name) => !appliedSet.has(name));
        const unknownApplied = applied.filter((name) => !localSet.has(name));

        const errors: string[] = [];

        if (failedRows.length > 0) {
            const names = unique(failedRows.map((row) => row.migrationName));
            errors.push(
                `Found ${failedRows.length} failed/incomplete migration row(s): ${names.join(", ")}.`
            );
        }

        if (unknownApplied.length > 0) {
            errors.push(
                `Database has applied migration(s) missing from repository: ${unknownApplied.join(", ")}.`
            );
        }

        if (!allowPending && pendingLocal.length > 0) {
            errors.push(
                `Repository has pending migration(s) not yet applied to database: ${pendingLocal.join(", ")}.`
            );
        }

        const report: GuardrailReport = {
            generatedAt: new Date().toISOString(),
            allowPending,
            localMigrationCount: localMigrations.length,
            appliedMigrationCount: applied.length,
            rolledBackMigrationCount: rolledBack.length,
            failedMigrationCount: failedRows.length,
            pendingLocalMigrations: pendingLocal,
            unknownAppliedMigrations: unknownApplied,
            failedMigrations: failedRows.map((row) => ({
                migrationName: row.migrationName,
                startedAt: row.startedAt,
                logs: row.logs ? row.logs.slice(0, 1200) : null,
            })),
            status: errors.length > 0 ? "failed" : "passed",
        };

        writeReportIfRequested(report);

        console.log("Migration guardrail summary:");
        console.log(`- local migrations: ${report.localMigrationCount}`);
        console.log(`- applied migrations: ${report.appliedMigrationCount}`);
        console.log(`- rolled-back migrations: ${report.rolledBackMigrationCount}`);
        console.log(`- failed migrations: ${report.failedMigrationCount}`);
        console.log(`- pending local migrations: ${report.pendingLocalMigrations.length}`);
        console.log(`- unknown applied migrations: ${report.unknownAppliedMigrations.length}`);

        if (errors.length > 0) {
            console.error("Migration guardrails failed:");
            for (const error of errors) {
                console.error(`- ${error}`);
            }
            process.exit(1);
        }

        console.log("Migration guardrails passed.");
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error: unknown) => {
    console.error("[migration-guardrails]", error);
    process.exit(1);
});
