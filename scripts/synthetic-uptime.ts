import fs from "node:fs";
import path from "node:path";

type SyntheticCheck = {
    id: string;
    label: string;
    path: string;
    acceptedStatuses: number[];
};

type SyntheticCheckResult = {
    id: string;
    label: string;
    path: string;
    url: string;
    ok: boolean;
    status: number | null;
    durationMs: number;
    error: string | null;
};

type SyntheticReport = {
    ok: boolean;
    checkedAt: string;
    baseUrl: string;
    timeoutMs: number;
    checks: SyntheticCheckResult[];
};

const DEFAULT_TIMEOUT_MS = 15_000;
const CHECKS: SyntheticCheck[] = [
    {
        id: "login",
        label: "Login page",
        path: "/login",
        acceptedStatuses: [200, 301, 302, 303, 307, 308],
    },
    {
        id: "dashboard",
        label: "Dashboard page",
        path: "/",
        acceptedStatuses: [200, 301, 302, 303, 307, 308],
    },
    {
        id: "products",
        label: "Products page",
        path: "/products",
        acceptedStatuses: [200, 301, 302, 303, 307, 308],
    },
    {
        id: "settings",
        label: "Settings page",
        path: "/settings",
        acceptedStatuses: [200, 301, 302, 303, 307, 308],
    },
    {
        id: "api-health",
        label: "API health",
        path: "/api/system/ping",
        acceptedStatuses: [200],
    },
];

function normalizeBaseUrl(value: string) {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("SYNTHETIC_BASE_URL must be an http/https URL.");
    }
    parsed.pathname = "/";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
}

function parseTimeoutMs(rawValue: string | undefined) {
    if (!rawValue) return DEFAULT_TIMEOUT_MS;
    const parsed = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error("SYNTHETIC_TIMEOUT_MS must be a positive integer.");
    }
    return parsed;
}

async function runCheck(
    baseUrl: string,
    timeoutMs: number,
    check: SyntheticCheck
): Promise<SyntheticCheckResult> {
    const started = Date.now();
    const url = new URL(check.path, `${baseUrl}/`).toString();

    try {
        const response = await fetch(url, {
            method: "GET",
            redirect: "manual",
            cache: "no-store",
            headers: {
                "user-agent": "veloro-synthetic-uptime/1.0",
            },
            signal: AbortSignal.timeout(timeoutMs),
        });

        const durationMs = Date.now() - started;
        const ok = check.acceptedStatuses.includes(response.status);

        return {
            id: check.id,
            label: check.label,
            path: check.path,
            url,
            ok,
            status: response.status,
            durationMs,
            error: null,
        };
    } catch (error: unknown) {
        const durationMs = Date.now() - started;
        return {
            id: check.id,
            label: check.label,
            path: check.path,
            url,
            ok: false,
            status: null,
            durationMs,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

function printReport(report: SyntheticReport) {
    console.log(`Synthetic uptime checks @ ${report.checkedAt}`);
    console.log(`Base URL: ${report.baseUrl}`);
    console.log(`Timeout: ${report.timeoutMs} ms`);

    for (const check of report.checks) {
        const statusLabel = check.status === null ? "NO_RESPONSE" : String(check.status);
        const outcome = check.ok ? "PASS" : "FAIL";

        console.log(
            `[${outcome}] ${check.id.padEnd(11)} ${statusLabel.padEnd(11)} ${String(check.durationMs).padStart(5)} ms  ${check.path}`
        );

        if (!check.ok && check.error) {
            console.log(`       reason: ${check.error}`);
        }
    }

    const passed = report.checks.filter((check) => check.ok).length;
    console.log(`Result: ${passed}/${report.checks.length} checks passing`);
}

function writeReportIfRequested(report: SyntheticReport) {
    const outputFile = process.env.SYNTHETIC_OUTPUT_FILE?.trim();
    if (!outputFile) return;

    const outputPath = path.resolve(process.cwd(), outputFile);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`Saved report to ${outputPath}`);
}

async function main() {
    const cliBaseUrl = process.argv[2];
    const rawBaseUrl = (cliBaseUrl || process.env.SYNTHETIC_BASE_URL || "").trim();

    if (!rawBaseUrl) {
        throw new Error("Missing SYNTHETIC_BASE_URL. Set env var or pass it as the first argument.");
    }

    const baseUrl = normalizeBaseUrl(rawBaseUrl);
    const timeoutMs = parseTimeoutMs(process.env.SYNTHETIC_TIMEOUT_MS);

    const checks = await Promise.all(
        CHECKS.map((check) => runCheck(baseUrl, timeoutMs, check))
    );

    const report: SyntheticReport = {
        ok: checks.every((check) => check.ok),
        checkedAt: new Date().toISOString(),
        baseUrl,
        timeoutMs,
        checks,
    };

    printReport(report);
    writeReportIfRequested(report);

    if (!report.ok) {
        process.exitCode = 1;
    }
}

main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Synthetic uptime check failed.";
    console.error(message);
    process.exitCode = 1;
});
