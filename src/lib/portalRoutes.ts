export const PORTAL_ROUTE_PREFIX = "/portal";

export function isLegacyPortalPath(pathname: string) {
    return pathname === PORTAL_ROUTE_PREFIX || pathname.startsWith(`${PORTAL_ROUTE_PREFIX}/`);
}

export function toInternalPortalPath(pathname: string) {
    if (!pathname || pathname === "/") return PORTAL_ROUTE_PREFIX;
    if (isLegacyPortalPath(pathname)) return pathname;
    return `${PORTAL_ROUTE_PREFIX}${pathname}`;
}

export function toPublicPortalPath(pathname: string) {
    if (pathname === PORTAL_ROUTE_PREFIX) return "/";
    if (pathname.startsWith(`${PORTAL_ROUTE_PREFIX}/`)) {
        return pathname.slice(PORTAL_ROUTE_PREFIX.length) || "/";
    }
    return pathname || "/";
}

export function normalizePortalPublicPathname(pathname: string | null | undefined) {
    if (!pathname) return "/";
    return toPublicPortalPath(pathname);
}
