export type PortalFeatureFlags = {
    finance: boolean;
    analytics: boolean;
    analyticsReports: boolean;
    analyticsLiveView: boolean;
    assistant: boolean;
    notifications: boolean;
};

export const DEFAULT_PORTAL_FEATURE_FLAGS: PortalFeatureFlags = {
    finance: true,
    analytics: true,
    analyticsReports: true,
    analyticsLiveView: true,
    assistant: true,
    notifications: true,
};

export function isPortalPathEnabled(path: string, flags: PortalFeatureFlags) {
    switch (path) {
        case "/finance":
            return flags.finance;
        case "/analytics":
            return flags.analytics;
        case "/analytics/reports":
            return flags.analytics && flags.analyticsReports;
        case "/analytics/live-view":
            return flags.analytics && flags.analyticsLiveView;
        default:
            return true;
    }
}

export function isSearchPageEnabled(pageId: string, flags: PortalFeatureFlags) {
    switch (pageId) {
        case "finance":
            return flags.finance;
        case "analytics":
            return flags.analytics;
        case "reports":
            return flags.analytics && flags.analyticsReports;
        case "liveView":
            return flags.analytics && flags.analyticsLiveView;
        default:
            return true;
    }
}
