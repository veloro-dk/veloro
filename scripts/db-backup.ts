import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

function getConnectionString() {
    const value = process.env.DIRECT_URL || process.env.DATABASE_URL;
    if (!value) throw new Error("Missing DIRECT_URL or DATABASE_URL");
    return value;
}

function buildTimestamp() {
    const iso = new Date().toISOString();
    return iso
        .replace(/:/g, "")
        .replace(/\..+$/, "Z")
        .replace("T", "_");
}

function resolveBackupDir() {
    const configured = (process.env.DB_BACKUP_DIR || "backups").trim();
    if (!configured) return path.resolve(process.cwd(), "backups");
    return path.resolve(process.cwd(), configured);
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

async function sha256OfFile(filePath: string) {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    for await (const chunk of stream) {
        hash.update(chunk);
    }
    return hash.digest("hex");
}

async function main() {
    const connectionString = getConnectionString();
    const backupDir = resolveBackupDir();
    await fs.promises.mkdir(backupDir, { recursive: true });

    const timestamp = buildTimestamp();
    const fileName = `veloro_${timestamp}.dump`;
    const backupPath = path.join(backupDir, fileName);

    await runCommand("pg_dump", [
        "--format=custom",
        "--compress=9",
        "--no-owner",
        "--no-privileges",
        "--file",
        backupPath,
        connectionString,
    ]);

    const stats = await fs.promises.stat(backupPath);
    const checksum = await sha256OfFile(backupPath);

    let databaseRef = "unknown";
    try {
        const parsed = new URL(connectionString);
        const dbName = parsed.pathname.replace(/^\//, "") || "unknown";
        databaseRef = `${parsed.hostname}/${dbName}`;
    } catch {
        databaseRef = "unknown";
    }

    const metadataPath = `${backupPath}.json`;
    const metadata = {
        createdAt: new Date().toISOString(),
        file: backupPath,
        sizeBytes: stats.size,
        sha256: checksum,
        database: databaseRef,
    };
    await fs.promises.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");

    console.log(`Backup created: ${backupPath}`);
    console.log(`Metadata created: ${metadataPath}`);
}

main().catch((error: unknown) => {
    console.error("[db-backup]", error);
    process.exit(1);
});
