import fs from "node:fs";
import path from "node:path";

type SmokeCheckResult = {
    id: string;
    label: string;
    path: string;
    url: string;
    status: number | null;
    durationMs: number;
    ok: boolean;
    error: string | null;
};

type SmokeReport = {
    ok: boolean;
    checkedAt: string;
    baseUrl: string;
    timeoutMs: number;
    checks: SmokeCheckResult[];
};

type RequestProbe = {
    url: string;
    status: number | null;
    durationMs: number;
    error: string | null;
    response: Response | null;
};

type RequestOptions = {
    path: string;
    method?: "GET" | "POST";
    body?: string;
    headers?: Record<string, string>;
};

const DEFAULT_TIMEOUT_MS = 20_000;
const SESSION_COOKIE_NAME = "veloro_session";
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function normalizeBaseUrl(value: string) {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("SMOKE_BASE_URL must be an http/https URL.");
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
        throw new Error("SMOKE_TIMEOUT_MS must be a positive integer.");
    }
    return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function readSetCookieHeaders(headers: Headers) {
    const maybe = headers as unknown as { getSetCookie?: () => string[] };
    if (typeof maybe.getSetCookie === "function") {
        const values = maybe.getSetCookie();
        if (Array.isArray(values) && values.length > 0) {
            return values;
        }
    }

    const fallback = headers.get("set-cookie");
    return fallback ? [fallback] : [];
}

function updateCookieJar(cookieJar: Map<string, string>, headers: Headers) {
    for (const setCookieLine of readSetCookieHeaders(headers)) {
        const firstSegment = setCookieLine.split(";")[0]?.trim() || "";
        if (!firstSegment.includes("=")) continue;

        const separatorIndex = firstSegment.indexOf("=");
        const name = firstSegment.slice(0, separatorIndex).trim();
        const value = firstSegment.slice(separatorIndex + 1);
        if (!name) continue;

        if (!value) {
            cookieJar.delete(name);
        } else {
            cookieJar.set(name, value);
        }
    }
}

function buildCookieHeader(cookieJar: Map<string, string>) {
    if (cookieJar.size === 0) return null;

    const pairs: string[] = [];
    for (const [name, value] of cookieJar.entries()) {
        pairs.push(`${name}=${value}`);
    }
    return pairs.join("; ");
}

async function performRequest(
    baseUrl: string,
    timeoutMs: number,
    cookieJar: Map<string, string>,
    options: RequestOptions
): Promise<RequestProbe> {
    const started = Date.now();
    const method = options.method || "GET";
    const url = new URL(options.path, `${baseUrl}/`).toString();

    const headers: Record<string, string> = {
        "user-agent": "veloro-smoke-e2e/1.0",
        ...(options.headers || {}),
    };

    const cookieHeader = buildCookieHeader(cookieJar);
    if (cookieHeader && !headers.cookie) {
        headers.cookie = cookieHeader;
    }

    try {
        const response = await fetch(url, {
            method,
            redirect: "manual",
            cache: "no-store",
            headers,
            body: options.body,
            signal: AbortSignal.timeout(timeoutMs),
        });

        updateCookieJar(cookieJar, response.headers);

        return {
            url,
            status: response.status,
            durationMs: Date.now() - started,
            error: null,
            response,
        };
    } catch (error: unknown) {
        return {
            url,
            status: null,
            durationMs: Date.now() - started,
            error: error instanceof Error ? error.message : "Unknown request error",
            response: null,
        };
    }
}

function formatProbeError(probe: RequestProbe) {
    if (probe.error) return probe.error;
    if (probe.status === null) return "No response status.";
    return `Unexpected status: ${probe.status}`;
}

function pushResult(
    checks: SmokeCheckResult[],
    meta: { id: string; label: string; path: string },
    probe: RequestProbe,
    ok: boolean,
    error: string | null
) {
    checks.push({
        id: meta.id,
        label: meta.label,
        path: meta.path,
        url: probe.url,
        status: probe.status,
        durationMs: probe.durationMs,
        ok,
        error: ok ? null : (error || formatProbeError(probe)),
    });
}

async function parseJson(response: Response | null) {
    if (!response) return null;
    return response.json().catch(() => null);
}

function printReport(report: SmokeReport) {
    console.log(`Smoke e2e checks @ ${report.checkedAt}`);
    console.log(`Base URL: ${report.baseUrl}`);
    console.log(`Timeout: ${report.timeoutMs} ms`);

    for (const check of report.checks) {
        const statusLabel = check.status === null ? "NO_RESPONSE" : String(check.status);
        const outcome = check.ok ? "PASS" : "FAIL";
        console.log(
            `[${outcome}] ${check.id.padEnd(20)} ${statusLabel.padEnd(11)} ${String(check.durationMs).padStart(5)} ms  ${check.path}`
        );
        if (!check.ok && check.error) {
            console.log(`       reason: ${check.error}`);
        }
    }

    const passed = report.checks.filter((check) => check.ok).length;
    console.log(`Result: ${passed}/${report.checks.length} checks passing`);
}

function writeReportIfRequested(report: SmokeReport) {
    const outputFile = (process.env.SMOKE_OUTPUT_FILE || "").trim();
    if (!outputFile) return;

    const outputPath = path.resolve(process.cwd(), outputFile);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`Saved report to ${outputPath}`);
}

async function main() {
    const cliBaseUrl = process.argv[2];
    const rawBaseUrl = (cliBaseUrl || process.env.SMOKE_BASE_URL || "").trim();
    if (!rawBaseUrl) {
        throw new Error("Missing SMOKE_BASE_URL. Set env var or pass it as the first argument.");
    }

    const employeeId = (process.env.SMOKE_EMPLOYEE_ID || "").trim();
    const password = (process.env.SMOKE_PASSWORD || "").trim();
    if (!employeeId || !password) {
        throw new Error("Missing SMOKE_EMPLOYEE_ID or SMOKE_PASSWORD.");
    }

    const baseUrl = normalizeBaseUrl(rawBaseUrl);
    const timeoutMs = parseTimeoutMs(process.env.SMOKE_TIMEOUT_MS);
    const cookieJar = new Map<string, string>();
    const checks: SmokeCheckResult[] = [];

    const loginPage = await performRequest(baseUrl, timeoutMs, cookieJar, { path: "/login" });
    pushResult(
        checks,
        { id: "public-login-page", label: "Public login page", path: "/login" },
        loginPage,
        loginPage.status === 200,
        null
    );

    const ping = await performRequest(baseUrl, timeoutMs, cookieJar, { path: "/api/system/ping" });
    const pingPayload = await parseJson(ping.response);
    const pingOk = ping.status === 200
        && isRecord(pingPayload)
        && pingPayload.ok === true
        && pingPayload.service === "veloro-api";
    pushResult(
        checks,
        { id: "public-api-ping", label: "Public API ping", path: "/api/system/ping" },
        ping,
        pingOk,
        pingOk ? null : "Expected 200 and JSON payload { ok: true, service: \"veloro-api\" }."
    );

    const login = await performRequest(baseUrl, timeoutMs, cookieJar, {
        path: "/api/auth/login",
        method: "POST",
        headers: {
            "content-type": "application/json",
            origin: baseUrl,
            referer: `${baseUrl}/login`,
            "sec-fetch-site": "same-origin",
        },
        body: JSON.stringify({ employeeId, password }),
    });
    const loginPayload = await parseJson(login.response);
    const loginOk = login.status === 200
        && isRecord(loginPayload)
        && loginPayload.ok === true
        && loginPayload.requiresPasswordReset !== true
        && cookieJar.has(SESSION_COOKIE_NAME);
    pushResult(
        checks,
        { id: "auth-login", label: "Authenticate user", path: "/api/auth/login" },
        login,
        loginOk,
        loginOk
            ? null
            : "Expected successful login, requiresPasswordReset=false, and session cookie."
    );

    if (loginOk) {
        const dashboard = await performRequest(baseUrl, timeoutMs, cookieJar, { path: "/" });
        pushResult(
            checks,
            { id: "auth-dashboard", label: "Dashboard after login", path: "/" },
            dashboard,
            dashboard.status === 200,
            null
        );

        const products = await performRequest(baseUrl, timeoutMs, cookieJar, { path: "/products" });
        pushResult(
            checks,
            { id: "auth-products", label: "Products page after login", path: "/products" },
            products,
            products.status === 200,
            null
        );

        const settings = await performRequest(baseUrl, timeoutMs, cookieJar, { path: "/settings" });
        pushResult(
            checks,
            { id: "auth-settings", label: "Settings page after login", path: "/settings" },
            settings,
            settings.status === 200,
            null
        );

        const catalog = await performRequest(baseUrl, timeoutMs, cookieJar, { path: "/api/catalog/state" });
        const catalogPayload = await parseJson(catalog.response);
        const catalogOk = catalog.status === 200
            && isRecord(catalogPayload)
            && catalogPayload.ok === true
            && isRecord(catalogPayload.state)
            && typeof catalogPayload.version === "number"
            && Number.isFinite(catalogPayload.version)
            && catalogPayload.version >= 1;
        pushResult(
            checks,
            { id: "auth-catalog-state", label: "Catalog state API", path: "/api/catalog/state" },
            catalog,
            catalogOk,
            catalogOk ? null : "Expected { ok: true, state: object, version: number >= 1 }."
        );

        const searchIndex = await performRequest(baseUrl, timeoutMs, cookieJar, { path: "/api/search/index?language=en" });
        const searchPayload = await parseJson(searchIndex.response);
        const searchOk = searchIndex.status === 200
            && isRecord(searchPayload)
            && searchPayload.ok === true
            && typeof searchPayload.language === "string"
            && isRecord(searchPayload.contentById);
        pushResult(
            checks,
            { id: "auth-search-index", label: "Search index API", path: "/api/search/index?language=en" },
            searchIndex,
            searchOk,
            searchOk ? null : "Expected { ok: true, language: string, contentById: object }."
        );

        const health = await performRequest(baseUrl, timeoutMs, cookieJar, { path: "/api/system/health" });
        const healthPayload = await parseJson(health.response);
        const healthOk = health.status === 200
            && isRecord(healthPayload)
            && typeof healthPayload.ok === "boolean"
            && Array.isArray(healthPayload.checks);
        pushResult(
            checks,
            { id: "auth-system-health", label: "System health API", path: "/api/system/health" },
            health,
            healthOk,
            healthOk ? null : "Expected status 200 with report payload containing ok:boolean and checks:array."
        );

        const logout = await performRequest(baseUrl, timeoutMs, cookieJar, {
            path: "/api/auth/logout",
            method: "POST",
            headers: {
                origin: baseUrl,
                referer: `${baseUrl}/`,
                "sec-fetch-site": "same-origin",
            },
        });
        const logoutPayload = await parseJson(logout.response);
        const logoutOk = logout.status === 200
            && isRecord(logoutPayload)
            && logoutPayload.ok === true;
        pushResult(
            checks,
            { id: "auth-logout", label: "Logout user", path: "/api/auth/logout" },
            logout,
            logoutOk,
            logoutOk ? null : "Expected status 200 with { ok: true }."
        );

        const postLogout = await performRequest(baseUrl, timeoutMs, cookieJar, { path: "/" });
        const location = postLogout.response?.headers.get("location") || "";
        const postLogoutOk = postLogout.status !== null
            && REDIRECT_STATUSES.has(postLogout.status)
            && location.includes("/login");
        pushResult(
            checks,
            { id: "post-logout-guard", label: "Dashboard blocked after logout", path: "/" },
            postLogout,
            postLogoutOk,
            postLogoutOk ? null : "Expected redirect to /login after logout."
        );
    }

    const report: SmokeReport = {
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
    const message = error instanceof Error ? error.message : "Smoke e2e run failed.";
    console.error(message);
    process.exitCode = 1;
});
