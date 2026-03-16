import "server-only";
import { getRuntimeEnv } from "@/server/env";

function getOrigin(value: string) {
    try {
        return new URL(value).origin;
    } catch {
        return null;
    }
}

function getAllowedOrigins(req: Request) {
    const allowed = new Set<string>();
    const requestOrigin = getOrigin(req.url);
    if (requestOrigin) {
        allowed.add(requestOrigin);
        try {
            const parsed = new URL(requestOrigin);
            const isLoopback = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1";
            if (isLoopback) {
                allowed.add(`${parsed.protocol}//localhost${parsed.port ? `:${parsed.port}` : ""}`);
                allowed.add(`${parsed.protocol}//127.0.0.1${parsed.port ? `:${parsed.port}` : ""}`);
                allowed.add(`${parsed.protocol}://[::1]${parsed.port ? `:${parsed.port}` : ""}`);
            }
        } catch {
            // Ignore malformed URL parsing here.
        }
    }

    const runtimeEnv = getRuntimeEnv();
    if (runtimeEnv.appOrigin) allowed.add(runtimeEnv.appOrigin);

    return allowed;
}

export function isSameOriginRequest(req: Request) {
    const allowedOrigins = getAllowedOrigins(req);

    const originHeader = req.headers.get("origin");
    if (originHeader) {
        const origin = getOrigin(originHeader);
        return Boolean(origin && allowedOrigins.has(origin));
    }

    const refererHeader = req.headers.get("referer");
    if (refererHeader) {
        const refererOrigin = getOrigin(refererHeader);
        return Boolean(refererOrigin && allowedOrigins.has(refererOrigin));
    }

    const fetchSiteHeader = (req.headers.get("sec-fetch-site") || "").toLowerCase();
    if (fetchSiteHeader === "same-origin" || fetchSiteHeader === "none") {
        return true;
    }

    return false;
}

export function isJsonRequest(req: Request) {
    const contentType = req.headers.get("content-type") || "";
    return contentType.toLowerCase().startsWith("application/json");
}
