import { primeCatalogStateCache } from "@/lib/catalogStateClient";
import { normalizePortalPublicPathname } from "@/lib/portalRoutes";

function normalizePortalRoutePath(pathname: string) {
    return normalizePortalPublicPathname(pathname) || "/";
}

export function routeRequiresCatalogState(pathname: string) {
    const normalizedPath = normalizePortalRoutePath(pathname);
    return normalizedPath === "/" || normalizedPath.startsWith("/products");
}

export async function preloadPortalRouteData(pathname: string) {
    if (!routeRequiresCatalogState(pathname)) return;
    await primeCatalogStateCache();
}
