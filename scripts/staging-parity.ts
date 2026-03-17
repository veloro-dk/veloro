import fs from "node:fs";
import path from "node:path";

type EndpointCheck = {
    id: string;
    label: string;
    path: string;
    acceptedStatuses: number[];
    requiresJsonPayload?: boolean;
};

type EndpointSnapshot = {
    id: string;
    label: string;
    path: string;
    url: string;
    status: number | null;
    durationMs: number;
    headers: Record<string, string>;
    jsonPayload: Record<string, unknown> | null;
    error: string | null;
};

type ParityMismatch = {
    checkId: string;
    field: string;
    staging: string;
    production: string;
    reason: string;
};

type ParityReport = {
    ok: boolean;
    checkedAt: string;
    timeoutMs: number;
    stagingBaseUrl: string;
    productionBaseUrl: string;
    checks: Array<{
        id: string;
        label: string;
        stagingStatus: number | null;
        productionStatus: number | null;
        stagingDurationMs: number;
        productionDurationMs: number;
    }>;
    mismatches: ParityMismatch[];
};

const DEFAULT_TIMEOUT_MS = 20_000;
const CHECKS: EndpointCheck[] = [
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
        id: "api-ping",
        label: "API ping",
        path: "/api/system/ping",
        acceptedStatuses: [200],
        requiresJsonPayload: true,
    },
];

const EXACT_SECURITY_HEADERS: Array<{ name: string; expected: string }> = [
    { name: "x-frame-options", expected: "DENY" },
    { name: "x-content-type-options", expected: "nosniff" },
    { name: "referrer-policy", expected: "no-referrer" },
];

const REQUIRED_CSP_DIRECTIVES = [
    "default-src 'self'",
    "script-src",
    "frame-ancestors 'none'",
    "object-src 'none'",
] as const;

function normalizeBaseUrl(rawValue: string, variableName: string) {
    const parsed = new URL(rawValue);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error(`${variableName} must be an http/https URL.`);
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
        throw new Error("PARITY_TIMEOUT_MS must be a positive integer.");
    }

    return parsed;
}

function toStringValue(value: unknown) {
    if (value === null || value === undefined) return "";
    return String(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

async function captureEndpoint(
    baseUrl: string,
    timeoutMs: number,
    check: EndpointCheck
): Promise<EndpointSnapshot> {
    const started = Date.now();
    const url = new URL(check.path, `${baseUrl}/`).toString();

    try {
        const response = await fetch(url, {
            method: "GET",
            redirect: "manual",
            cache: "no-store",
            headers: {
                "user-agent": "veloro-staging-parity/1.0",
            },
            signal: AbortSignal.timeout(timeoutMs),
        });

        const headers: Record<string, string> = {};
        for (const [name, value] of response.headers.entries()) {
            headers[name.toLowerCase()] = value;
        }

        let jsonPayload: Record<string, unknown> | null = null;
        if (check.requiresJsonPayload) {
            const contentType = headers["content-type"] || "";
            if (contentType.toLowerCase().includes("application/json")) {
                const payload = await response.clone().json().catch(() => null);
                jsonPayload = isRecord(payload) ? payload : null;
            }
        }

        return {
            id: check.id,
            label: check.label,
            path: check.path,
            url,
            status: response.status,
            durationMs: Date.now() - started,
            headers,
            jsonPayload,
            error: null,
        };
    } catch (error: unknown) {
        return {
            id: check.id,
            label: check.label,
            path: check.path,
            url,
            status: null,
            durationMs: Date.now() - started,
            headers: {},
            jsonPayload: null,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

function compareCheck(
    check: EndpointCheck,
    staging: EndpointSnapshot,
    production: EndpointSnapshot
): ParityMismatch[] {
    const mismatches: ParityMismatch[] = [];

    if (staging.error || production.error) {
        mismatches.push({
            checkId: check.id,
            field: "request",
            staging: staging.error || `HTTP ${staging.status ?? "NO_RESPONSE"}`,
            production: production.error || `HTTP ${production.status ?? "NO_RESPONSE"}`,
            reason: "Endpoint probe failed on one or both environments.",
        });
        return mismatches;
    }

    if (staging.status === null || production.status === null) {
        mismatches.push({
            checkId: check.id,
            field: "status",
            staging: toStringValue(staging.status),
            production: toStringValue(production.status),
            reason: "Missing response status.",
        });
        return mismatches;
    }

    if (!check.acceptedStatuses.includes(staging.status)) {
        mismatches.push({
            checkId: check.id,
            field: "staging-status",
            staging: String(staging.status),
            production: String(production.status),
            reason: `Staging status is outside accepted set (${check.acceptedStatuses.join(", ")}).`,
        });
    }

    if (!check.acceptedStatuses.includes(production.status)) {
        mismatches.push({
            checkId: check.id,
            field: "production-status",
            staging: String(staging.status),
            production: String(production.status),
            reason: `Production status is outside accepted set (${check.acceptedStatuses.join(", ")}).`,
        });
    }

    if (staging.status !== production.status) {
        mismatches.push({
            checkId: check.id,
            field: "status",
            staging: String(staging.status),
            production: String(production.status),
            reason: "Status mismatch between staging and production.",
        });
    }

    if (check.requiresJsonPayload) {
        const stagingOk = staging.jsonPayload?.ok;
        const productionOk = production.jsonPayload?.ok;

        if (stagingOk !== true || productionOk !== true) {
            mismatches.push({
                checkId: check.id,
                field: "json.ok",
                staging: toStringValue(stagingOk),
                production: toStringValue(productionOk),
                reason: "JSON health payload must report ok=true in both environments.",
            });
        }

        const stagingService = staging.jsonPayload?.service;
        const productionService = production.jsonPayload?.service;

        if (stagingService !== "veloro-api" || productionService !== "veloro-api") {
            mismatches.push({
                checkId: check.id,
                field: "json.service",
                staging: toStringValue(stagingService),
                production: toStringValue(productionService),
                reason: "API health service identifier mismatch.",
            });
        }
    }

    return mismatches;
}

function compareSecurityHeaders(
    stagingLogin: EndpointSnapshot,
    productionLogin: EndpointSnapshot,
    requireHsts: boolean,
    requireBaseline: boolean
): ParityMismatch[] {
    const mismatches: ParityMismatch[] = [];

    for (const header of EXACT_SECURITY_HEADERS) {
        const stagingValue = stagingLogin.headers[header.name] || "";
        const productionValue = productionLogin.headers[header.name] || "";
        const stagingHas = stagingValue.length > 0;
        const productionHas = productionValue.length > 0;

        if (stagingHas !== productionHas) {
            mismatches.push({
                checkId: "login",
                field: header.name,
                staging: stagingValue,
                production: productionValue,
                reason: "Security header presence mismatch between staging and production.",
            });
            continue;
        }

        if (stagingHas && productionHas && stagingValue !== productionValue) {
            mismatches.push({
                checkId: "login",
                field: header.name,
                staging: stagingValue,
                production: productionValue,
                reason: "Security header value mismatch between staging and production.",
            });
        }

        if (requireBaseline && (stagingValue !== header.expected || productionValue !== header.expected)) {
            mismatches.push({
                checkId: "login",
                field: header.name,
                staging: stagingValue,
                production: productionValue,
                reason: `Expected exact header value \"${header.expected}\" in both environments.`,
            });
        }
    }

    const stagingCsp = stagingLogin.headers["content-security-policy"] || "";
    const productionCsp = productionLogin.headers["content-security-policy"] || "";
    const stagingHasCsp = stagingCsp.length > 0;
    const productionHasCsp = productionCsp.length > 0;

    if (stagingHasCsp !== productionHasCsp) {
        mismatches.push({
            checkId: "login",
            field: "content-security-policy",
            staging: stagingHasCsp ? "present" : "missing",
            production: productionHasCsp ? "present" : "missing",
            reason: "CSP header presence mismatch between staging and production.",
        });
    }

    if (stagingHasCsp && productionHasCsp) {
        for (const directive of REQUIRED_CSP_DIRECTIVES) {
            const stagingHasDirective = stagingCsp.includes(directive);
            const productionHasDirective = productionCsp.includes(directive);

            if (stagingHasDirective !== productionHasDirective) {
                mismatches.push({
                    checkId: "login",
                    field: "content-security-policy",
                    staging: stagingHasDirective ? "contains" : "missing",
                    production: productionHasDirective ? "contains" : "missing",
                    reason: `CSP directive parity mismatch for \"${directive}\".`,
                });
            } else if (requireBaseline && (!stagingHasDirective || !productionHasDirective)) {
                mismatches.push({
                    checkId: "login",
                    field: "content-security-policy",
                    staging: stagingHasDirective ? "contains" : "missing",
                    production: productionHasDirective ? "contains" : "missing",
                    reason: `Missing CSP directive fragment \"${directive}\".`,
                });
            }
        }
    }

    if (requireHsts) {
        const stagingHsts = stagingLogin.headers["strict-transport-security"] || "";
        const productionHsts = productionLogin.headers["strict-transport-security"] || "";
        const stagingHasHsts = stagingHsts.length > 0;
        const productionHasHsts = productionHsts.length > 0;

        if (stagingHasHsts !== productionHasHsts) {
            mismatches.push({
                checkId: "login",
                field: "strict-transport-security",
                staging: stagingHsts || "missing",
                production: productionHsts || "missing",
                reason: "HSTS header presence mismatch between staging and production.",
            });
        } else if (stagingHasHsts && stagingHsts !== productionHsts) {
            mismatches.push({
                checkId: "login",
                field: "strict-transport-security",
                staging: stagingHsts,
                production: productionHsts,
                reason: "HSTS header value mismatch between staging and production.",
            });
        } else if (requireBaseline && !stagingHasHsts) {
            mismatches.push({
                checkId: "login",
                field: "strict-transport-security",
                staging: "missing",
                production: "missing",
                reason: "Expected Strict-Transport-Security in both HTTPS environments.",
            });
        }
    }

    return mismatches;
}

function printSummary(report: ParityReport) {
    console.log(`Staging parity check @ ${report.checkedAt}`);
    console.log(`Staging:    ${report.stagingBaseUrl}`);
    console.log(`Production: ${report.productionBaseUrl}`);
    console.log(`Timeout: ${report.timeoutMs} ms`);

    for (const check of report.checks) {
        const status = report.mismatches.some((mismatch) => mismatch.checkId === check.id)
            ? "FAIL"
            : "PASS";

        const stagingStatus = check.stagingStatus === null ? "NO_RESPONSE" : String(check.stagingStatus);
        const productionStatus = check.productionStatus === null ? "NO_RESPONSE" : String(check.productionStatus);

        console.log(
            `[${status}] ${check.id.padEnd(10)} staging=${stagingStatus.padEnd(11)} production=${productionStatus.padEnd(11)} `
            + `(dur ${String(check.stagingDurationMs).padStart(4)}ms/${String(check.productionDurationMs).padStart(4)}ms)`
        );
    }

    if (report.mismatches.length === 0) {
        console.log("Result: parity checks passed.");
        return;
    }

    console.error("Result: parity mismatches found.");
    for (const mismatch of report.mismatches) {
        console.error(
            `- [${mismatch.checkId}] ${mismatch.field}: ${mismatch.reason} `
            + `(staging=${mismatch.staging}; production=${mismatch.production})`
        );
    }
}

function writeReportIfRequested(report: ParityReport) {
    const outputFile = process.env.PARITY_OUTPUT_FILE?.trim();
    if (!outputFile) return;

    const outputPath = path.resolve(process.cwd(), outputFile);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`Saved report to ${outputPath}`);
}

async function main() {
    const stagingInput = (process.env.STAGING_BASE_URL || "").trim();
    const productionInput = (process.env.PRODUCTION_BASE_URL || "").trim();

    if (!stagingInput) {
        throw new Error("Missing STAGING_BASE_URL.");
    }

    if (!productionInput) {
        throw new Error("Missing PRODUCTION_BASE_URL.");
    }

    const stagingBaseUrl = normalizeBaseUrl(stagingInput, "STAGING_BASE_URL");
    const productionBaseUrl = normalizeBaseUrl(productionInput, "PRODUCTION_BASE_URL");
    const timeoutMs = parseTimeoutMs(process.env.PARITY_TIMEOUT_MS);
    const requireSecurityBaseline = String(process.env.PARITY_REQUIRE_SECURITY_BASELINE || "")
        .trim()
        .toLowerCase() === "true";

    const [stagingSnapshots, productionSnapshots] = await Promise.all([
        Promise.all(CHECKS.map((check) => captureEndpoint(stagingBaseUrl, timeoutMs, check))),
        Promise.all(CHECKS.map((check) => captureEndpoint(productionBaseUrl, timeoutMs, check))),
    ]);

    const stagingById = new Map(stagingSnapshots.map((snapshot) => [snapshot.id, snapshot]));
    const productionById = new Map(productionSnapshots.map((snapshot) => [snapshot.id, snapshot]));

    const mismatches: ParityMismatch[] = [];
    for (const check of CHECKS) {
        const staging = stagingById.get(check.id);
        const production = productionById.get(check.id);

        if (!staging || !production) {
            mismatches.push({
                checkId: check.id,
                field: "snapshot",
                staging: staging ? "present" : "missing",
                production: production ? "present" : "missing",
                reason: "Missing endpoint snapshot.",
            });
            continue;
        }

        mismatches.push(...compareCheck(check, staging, production));
    }

    const stagingLogin = stagingById.get("login");
    const productionLogin = productionById.get("login");
    if (stagingLogin && productionLogin) {
        const requireHsts = stagingBaseUrl.startsWith("https://") && productionBaseUrl.startsWith("https://");
        mismatches.push(...compareSecurityHeaders(stagingLogin, productionLogin, requireHsts, requireSecurityBaseline));
    }

    const report: ParityReport = {
        ok: mismatches.length === 0,
        checkedAt: new Date().toISOString(),
        timeoutMs,
        stagingBaseUrl,
        productionBaseUrl,
        checks: CHECKS.map((check) => {
            const staging = stagingById.get(check.id);
            const production = productionById.get(check.id);
            return {
                id: check.id,
                label: check.label,
                stagingStatus: staging?.status ?? null,
                productionStatus: production?.status ?? null,
                stagingDurationMs: staging?.durationMs ?? 0,
                productionDurationMs: production?.durationMs ?? 0,
            };
        }),
        mismatches,
    };

    printSummary(report);
    writeReportIfRequested(report);

    if (!report.ok) {
        process.exitCode = 1;
    }
}

main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Staging parity check failed.";
    console.error(message);
    process.exitCode = 1;
});
