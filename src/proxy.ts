import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
    STRICT_TRANSPORT_SECURITY_VALUE,
    buildContentSecurityPolicy,
    createCspNonce,
    shouldSetStrictTransportSecurity,
} from "@/server/securityHeaders";
import {
    isLegacyPortalPath,
    toInternalPortalPath,
    toPublicPortalPath,
} from "@/lib/portalRoutes";

function applySecurityHeaders(
    response: NextResponse,
    {
        contentSecurityPolicy,
        includeStrictTransportSecurity,
    }: {
        contentSecurityPolicy: string;
        includeStrictTransportSecurity: boolean;
    }
) {
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("Content-Security-Policy", contentSecurityPolicy);

    if (includeStrictTransportSecurity) {
        response.headers.set("Strict-Transport-Security", STRICT_TRANSPORT_SECURITY_VALUE);
    }

    return response;
}

function isPortalHost(hostHeader: string) {
    const host = hostHeader.split(":")[0].toLowerCase();
    return host === "portal.veloro.dk"
        || host === "portal.veloro-one.vercel.app"
        || host === "localhost"
        || host === "127.0.0.1"
        || host.startsWith("portal.")
        || host.endsWith(".vercel.app");
}

function isHttpsRequest(request: NextRequest) {
    const forwardedProtoHeader = request.headers.get("x-forwarded-proto");
    if (forwardedProtoHeader) {
        return forwardedProtoHeader
            .split(",")
            .some((proto) => proto.trim().toLowerCase() === "https");
    }
    return request.nextUrl.protocol === "https:";
}

function createRequestHeaders(request: NextRequest, nonce: string, contentSecurityPolicy: string) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);
    return requestHeaders;
}

export function proxy(request: NextRequest) {
    const host = request.headers.get("host") || "";
    const pathname = request.nextUrl.pathname;
    const nonce = createCspNonce();
    const contentSecurityPolicy = buildContentSecurityPolicy({
        nonce,
        includeUpgradeInsecureRequests: process.env.NODE_ENV === "production",
        includeUnsafeEval: process.env.NODE_ENV !== "production",
    });
    const includeStrictTransportSecurity = shouldSetStrictTransportSecurity({
        nodeEnv: process.env.NODE_ENV,
        isHttps: isHttpsRequest(request),
    });

    const requestHeaders = createRequestHeaders(request, nonce, contentSecurityPolicy);

    if (pathname.startsWith("/api")) {
        return applySecurityHeaders(
            NextResponse.next({ request: { headers: requestHeaders } }),
            {
                contentSecurityPolicy,
                includeStrictTransportSecurity,
            }
        );
    }

    if (pathname.startsWith("/_vercel")) {
        return applySecurityHeaders(
            NextResponse.next({ request: { headers: requestHeaders } }),
            {
                contentSecurityPolicy,
                includeStrictTransportSecurity,
            }
        );
    }

    if (!isPortalHost(host)) {
        return applySecurityHeaders(
            NextResponse.next({ request: { headers: requestHeaders } }),
            {
                contentSecurityPolicy,
                includeStrictTransportSecurity,
            }
        );
    }

    if (isLegacyPortalPath(pathname)) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = toPublicPortalPath(pathname);

        return applySecurityHeaders(
            NextResponse.redirect(redirectUrl, 308),
            {
                contentSecurityPolicy,
                includeStrictTransportSecurity,
            }
        );
    }

    if (pathname === "/") {
        return applySecurityHeaders(
            NextResponse.rewrite(new URL(toInternalPortalPath(pathname), request.url), {
                request: { headers: requestHeaders },
            }),
            {
                contentSecurityPolicy,
                includeStrictTransportSecurity,
            }
        );
    }

    return applySecurityHeaders(
        NextResponse.rewrite(new URL(toInternalPortalPath(pathname), request.url), {
            request: { headers: requestHeaders },
        }),
        {
            contentSecurityPolicy,
            includeStrictTransportSecurity,
        }
    );
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|_vercel|favicon.ico|robots.txt|sitemap.xml).*)"],
};
