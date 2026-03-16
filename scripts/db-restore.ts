import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

function getConnectionString() {
    const value = process.env.DIRECT_URL || process.env.DATABASE_URL;
    if (!value) throw new Error("Missing DIRECT_URL or DATABASE_URL");
    return value;
}

function parseBackupPath() {
    const [inputPath] = process.argv.slice(2);
    if (!inputPath) {
        throw new Error("Missing backup path. Usage: npm run db:restore -- <path-to-backup.dump>");
    }
    if (!inputPath.endsWith(".dump")) {
        throw new Error("Unsupported backup format. Expected a .dump file.");
    }
    return path.resolve(process.cwd(), inputPath);
}

async function assertRestoreGuardrails(backupPath: string) {
    await fs.promises.access(backupPath, fs.constants.R_OK);

    const confirmation = String(process.env.DB_RESTORE_CONFIRM ?? "").trim().toUpperCase();
    if (confirmation !== "YES") {
        throw new Error("Refusing restore. Set DB_RESTORE_CONFIRM=YES to proceed.");
    }

    if (
        process.env.NODE_ENV === "production"
        && String(process.env.ALLOW_PRODUCTION_DB_RESTORE ?? "").trim().toUpperCase() !== "YES"
    ) {
        throw new Error("Refusing production restore. Set ALLOW_PRODUCTION_DB_RESTORE=YES to proceed.");
    }
}

function runCommand(command: string, args: string[]) {
    return new Promise<void>((resolve, reject) => {
        const child = spawn(command, args, { stdio: "inherit" });

        child.on("error", (error: NodeJS.ErrnoException) => {
            if (error.code === "ENOENT") {
                reject(new Error(`Missing required command "${command}". Install PostgreSQL client tools.`));
                return;
            }
            reject(error);
        });

        child.on("close", (code) => {
            if (code === 0) {
                resolve();
                return;
            }
            reject(new Error(`Command "${command}" failed with exit code ${code ?? "unknown"}.`));
        });
    });
}

async function main() {
    const connectionString = getConnectionString();
    const backupPath = parseBackupPath();
    await assertRestoreGuardrails(backupPath);

    await runCommand("pg_restore", [
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-privileges",
        "--single-transaction",
        "--exit-on-error",
        "--dbname",
        connectionString,
        backupPath,
    ]);

    console.log(`Restore completed from: ${backupPath}`);
}

main().catch((error: unknown) => {
    console.error("[db-restore]", error);
    process.exit(1);
});
