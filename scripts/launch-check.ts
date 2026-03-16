import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

type Status = "ok" | "warn" | "error" | "info";

type CheckResult = {
    status: Status;
    label: string;
    detail: string;
};

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);
const FEATURE_FLAGS = [
    "FF_PORTAL_FINANCE_ENABLED",
    "FF_PORTAL_ANALYTICS_ENABLED",
    "FF_PORTAL_ANALYTICS_REPORTS_ENABLED",
    "FF_PORTAL_ANALYTICS_LIVE_VIEW_ENABLED",
    "FF_PORTAL_ASSISTANT_ENABLED",
    "FF_PORTAL_NOTIFICATIONS_ENABLED",
] as const;

function addEnvFileIfPresent(fileName: string, loadedFiles: string[]) {
    const filePath = path.resolve(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) return;

    dotenv.config({ path: filePath, override: true });
    loadedFiles.push(fileName);
}

function parseWebUrl(value: string, label: string) {
    let parsed: URL;
    try {
        parsed = new URL(value);
    } catch {
        throw new Error(`${label} is not a valid URL.`);
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error(`${label} must start with http:// or https://.`);
    }
}

function parsePostgresUrl(value: string) {
    let parsed: URL;
    try {
        parsed = new URL(value);
    } catch {
        throw new Error("DATABASE_URL is not a valid URL.");
    }

    if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
        throw new Error("DATABASE_URL must start with postgres:// or postgresql://.");
    }
}

function parseBooleanValue(name: string, rawValue: string | undefined) {
    if (!rawValue) return null;

    const normalized = rawValue.trim().toLowerCase();
    if (TRUE_VALUES.has(normalized)) return true;
    if (FALSE_VALUES.has(normalized)) return false;
    throw new Error(`${name} must be true/false if you set it.`);
}

function latestBackupFile() {
    const backupDir = path.resolve(process.cwd(), process.env.DB_BACKUP_DIR || "backups");
    if (!fs.existsSync(backupDir)) return null;

    const candidates = fs
        .readdirSync(backupDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith(".dump"))
        .map((entry) => {
            const fullPath = path.join(backupDir, entry.name);
            const stats = fs.statSync(fullPath);
            return {
                fileName: entry.name,
                fullPath,
                mtimeMs: stats.mtimeMs,
                sizeBytes: stats.size,
            };
        })
        .sort((left, right) => right.mtimeMs - left.mtimeMs);

    return candidates[0] || null;
}

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function printCheck(result: CheckResult) {
    const prefix = {
        ok: "[OK]  ",
        warn: "[WARN]",
        error: "[FAIL]",
        info: "[INFO]",
    }[result.status];
    console.log(`${prefix} ${result.label}: ${result.detail}`);
}

function main() {
    const loadedFiles: string[] = [];
    addEnvFileIfPresent(".env", loadedFiles);
    addEnvFileIfPresent(".env.local", loadedFiles);
    addEnvFileIfPresent(".env.production", loadedFiles);
    addEnvFileIfPresent(".env.production.local", loadedFiles);

    const results: CheckResult[] = [];
    const errors: string[] = [];

    const databaseUrl = (process.env.DATABASE_URL || "").trim();
    if (!databaseUrl) {
        results.push({
            status: "error",
            label: "DATABASE_URL",
            detail: "Missing. Add your PostgreSQL or Supabase connection string.",
        });
        errors.push("DATABASE_URL");
    } else {
        try {
            parsePostgresUrl(databaseUrl);
            results.push({
                status: "ok",
                label: "DATABASE_URL",
                detail: "Present and looks like a PostgreSQL connection string.",
            });
        } catch (error: unknown) {
            results.push({
                status: "error",
                label: "DATABASE_URL",
                detail: error instanceof Error ? error.message : "Invalid DATABASE_URL.",
            });
            errors.push("DATABASE_URL");
        }
    }

    const appUrl = (process.env.APP_URL || "").trim();
    if (!appUrl) {
        results.push({
            status: "error",
            label: "APP_URL",
            detail: "Missing. Add the real public URL of the site, for example https://portal.example.com.",
        });
        errors.push("APP_URL");
    } else {
        try {
            parseWebUrl(appUrl, "APP_URL");
            results.push({
                status: "ok",
                label: "APP_URL",
                detail: "Present and looks like a valid site URL.",
            });
        } catch (error: unknown) {
            results.push({
                status: "error",
                label: "APP_URL",
                detail: error instanceof Error ? error.message : "Invalid APP_URL.",
            });
            errors.push("APP_URL");
        }
    }

    const webhookUrl = (process.env.ALERT_WEBHOOK_URL || "").trim();
    if (!webhookUrl) {
        results.push({
            status: "info",
            label: "ALERT_WEBHOOK_URL",
            detail: "Not configured. This is optional and only needed for alert webhooks.",
        });
    } else {
        try {
            parseWebUrl(webhookUrl, "ALERT_WEBHOOK_URL");
            results.push({
                status: "ok",
                label: "ALERT_WEBHOOK_URL",
                detail: "Configured.",
            });
        } catch (error: unknown) {
            results.push({
                status: "error",
                label: "ALERT_WEBHOOK_URL",
                detail: error instanceof Error ? error.message : "Invalid ALERT_WEBHOOK_URL.",
            });
            errors.push("ALERT_WEBHOOK_URL");
        }
    }

    const disabledFlags: string[] = [];
    for (const name of FEATURE_FLAGS) {
        try {
            const parsed = parseBooleanValue(name, process.env[name]);
            if (parsed === false) {
                disabledFlags.push(name);
            }
        } catch (error: unknown) {
            results.push({
                status: "error",
                label: name,
                detail: error instanceof Error ? error.message : `Invalid value for ${name}.`,
            });
            errors.push(name);
        }
    }

    if (disabledFlags.length === 0) {
        results.push({
            status: "info",
            label: "Feature flags",
            detail: "No portal sections are hidden. 'Coming soon' sections will stay visible.",
        });
    } else {
        results.push({
            status: "info",
            label: "Feature flags",
            detail: `Hidden sections: ${disabledFlags.join(", ")}.`,
        });
    }

    const smokeBaseUrl = (process.env.SMOKE_BASE_URL || "").trim();
    const smokeEmployeeId = (process.env.SMOKE_EMPLOYEE_ID || "").trim();
    const smokePassword = (process.env.SMOKE_PASSWORD || "").trim();
    const smokeConfigured = Boolean(smokeBaseUrl && smokeEmployeeId && smokePassword);
    if (smokeConfigured) {
        results.push({
            status: "ok",
            label: "Smoke test secrets",
            detail: "All smoke-test values are present.",
        });
    } else {
        results.push({
            status: "info",
            label: "Smoke test secrets",
            detail: "Not fully configured. This is optional unless you want GitHub smoke tests.",
        });
    }

    const backup = latestBackupFile();
    if (!backup) {
        results.push({
            status: "warn",
            label: "Latest backup",
            detail: "No local .dump backup file was found yet. Run npm run db:backup before production deploy.",
        });
    } else {
        results.push({
            status: "ok",
            label: "Latest backup",
            detail: `${backup.fileName} (${formatBytes(backup.sizeBytes)})`,
        });
    }

    console.log("Veloro launch readiness check");
    console.log("");
    console.log(
        loadedFiles.length > 0
            ? `Loaded environment files: ${loadedFiles.join(", ")}`
            : "Loaded environment files: none"
    );
    console.log("");

    for (const result of results) {
        printCheck(result);
    }

    console.log("");
    if (errors.length > 0) {
        console.log("Result: setup is not ready yet.");
        console.log("Next: fill in the missing required values and run npm run launch:check again.");
        process.exit(1);
    }

    console.log("Result: required launch settings look good.");
    console.log("Next: run npm run db:backup, then npx prisma migrate deploy, then npm run build.");
}

main();
