import { NextRequest, NextResponse } from "next/server";

export const config = {
    matcher: ["/((?!_next|api|favicon.ico|robots.txt|sitemap.xml).*)"],
};

export default function middleware(request: NextRequest) {
    const host = request.headers.get("host") || "";
    const url = request.nextUrl;

    const isPortalHost =
        host === "portal.veloro.dk" ||
        host === "portal.veloro-one.vercel.app" ||
        host.startsWith("portal.");

    if (!isPortalHost) return NextResponse.next();

    if (url.pathname === "/") {
        return NextResponse.rewrite(new URL("/portal", request.url));
    }

    if (url.pathname.startsWith("/portal")) return NextResponse.next();

    return NextResponse.rewrite(new URL(`/portal${url.pathname}`, request.url));
}