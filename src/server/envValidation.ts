import {
    DEFAULT_PORTAL_FEATURE_FLAGS,
    type PortalFeatureFlags,
} from "@/lib/portalFeatureFlags";

type RuntimeEnv = {
    nodeEnv: string;
    databaseUrl: string;
    appOrigin: string | null;
    alertWebhookUrl: string | null;
    supabaseDbLimitMb: number | null;
    auditLogRetentionDays: number;
    featureFlags: PortalFeatureFlags;
};

type RawEnv = Partial<Record<string, string | undefined>>;

const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"]);
const WEB_PROTOCOLS = new Set(["http:", "https:"]);
const DEFAULT_AUDIT_LOG_RETENTION_DAYS = 90;
const MIN_AUDIT_LOG_RETENTION_DAYS = 7;
const MAX_AUDIT_LOG_RETENTION_DAYS = 3650;
const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

function parseUrl(value: string, allowedProtocols: Set<string>) {
    const parsed = new URL(value);
    if (!allowedProtocols.has(parsed.protocol)) {
        throw new Error(`Unsupported URL protocol: ${parsed.protocol}`);
    }
    return parsed;
}

function parseBooleanFlag(
    rawValue: string | undefined,
    key: string,
    fallback: boolean,
    errors: string[]
) {
    const value = (rawValue || "").trim();
    if (!value) return fallback;

    const normalized = value.toLowerCase();
    if (TRUE_VALUES.has(normalized)) return true;
    if (FALSE_VALUES.has(normalized)) return false;

    errors.push(`${key} must be a boolean (true/false).`);
    return fallback;
}

export function validateRuntimeEnv(rawEnv: RawEnv): RuntimeEnv {
    const nodeEnv = (rawEnv.NODE_ENV || "development").trim() || "development";
    const errors: string[] = [];

    const databaseUrlRaw = (rawEnv.DATABASE_URL || "").trim();
    if (!databaseUrlRaw) {
        errors.push("Missing DATABASE_URL.");
    } else {
        try {
            parseUrl(databaseUrlRaw, POSTGRES_PROTOCOLS);
        } catch {
            errors.push("DATABASE_URL must be a valid postgres/postgresql URL.");
        }
    }

    const appUrlRaw = (rawEnv.APP_URL || "").trim();
    let appOrigin: string | null = null;
    if (!appUrlRaw) {
        if (nodeEnv === "production") {
            errors.push("Missing APP_URL in production.");
        }
    } else {
        try {
            appOrigin = parseUrl(appUrlRaw, WEB_PROTOCOLS).origin;
        } catch {
            errors.push("APP_URL must be a valid http/https URL.");
        }
    }

    const alertWebhookUrlRaw = (rawEnv.ALERT_WEBHOOK_URL || "").trim();
    let alertWebhookUrl: string | null = null;
    if (alertWebhookUrlRaw) {
        try {
            alertWebhookUrl = parseUrl(alertWebhookUrlRaw, WEB_PROTOCOLS).toString();
        } catch {
            errors.push("ALERT_WEBHOOK_URL must be a valid http/https URL.");
        }
    }

    const limitRaw = (rawEnv.SUPABASE_DB_LIMIT_MB || "").trim();
    let supabaseDbLimitMb: number | null = null;
    if (limitRaw) {
        const parsed = Number(limitRaw);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            errors.push("SUPABASE_DB_LIMIT_MB must be a positive number when provided.");
        } else {
            supabaseDbLimitMb = parsed;
        }
    }

    const auditRetentionRaw = (rawEnv.AUDIT_LOG_RETENTION_DAYS || "").trim();
    let auditLogRetentionDays = DEFAULT_AUDIT_LOG_RETENTION_DAYS;
    if (auditRetentionRaw) {
        const parsed = Number.parseInt(auditRetentionRaw, 10);
        if (!/^\d+$/.test(auditRetentionRaw) || !Number.isFinite(parsed)) {
            errors.push("AUDIT_LOG_RETENTION_DAYS must be an integer when provided.");
        } else if (parsed < MIN_AUDIT_LOG_RETENTION_DAYS || parsed > MAX_AUDIT_LOG_RETENTION_DAYS) {
            errors.push(
                `AUDIT_LOG_RETENTION_DAYS must be between ${MIN_AUDIT_LOG_RETENTION_DAYS} and ${MAX_AUDIT_LOG_RETENTION_DAYS}.`
            );
        } else {
            auditLogRetentionDays = parsed;
        }
    }

    const featureFlags: PortalFeatureFlags = {
        finance: parseBooleanFlag(
            rawEnv.FF_PORTAL_FINANCE_ENABLED,
            "FF_PORTAL_FINANCE_ENABLED",
            DEFAULT_PORTAL_FEATURE_FLAGS.finance,
            errors
        ),
        analytics: parseBooleanFlag(
            rawEnv.FF_PORTAL_ANALYTICS_ENABLED,
            "FF_PORTAL_ANALYTICS_ENABLED",
            DEFAULT_PORTAL_FEATURE_FLAGS.analytics,
            errors
        ),
        analyticsReports: parseBooleanFlag(
            rawEnv.FF_PORTAL_ANALYTICS_REPORTS_ENABLED,
            "FF_PORTAL_ANALYTICS_REPORTS_ENABLED",
            DEFAULT_PORTAL_FEATURE_FLAGS.analyticsReports,
            errors
        ),
        analyticsLiveView: parseBooleanFlag(
            rawEnv.FF_PORTAL_ANALYTICS_LIVE_VIEW_ENABLED,
            "FF_PORTAL_ANALYTICS_LIVE_VIEW_ENABLED",
            DEFAULT_PORTAL_FEATURE_FLAGS.analyticsLiveView,
            errors
        ),
        assistant: parseBooleanFlag(
            rawEnv.FF_PORTAL_ASSISTANT_ENABLED,
            "FF_PORTAL_ASSISTANT_ENABLED",
            DEFAULT_PORTAL_FEATURE_FLAGS.assistant,
            errors
        ),
        notifications: parseBooleanFlag(
            rawEnv.FF_PORTAL_NOTIFICATIONS_ENABLED,
            "FF_PORTAL_NOTIFICATIONS_ENABLED",
            DEFAULT_PORTAL_FEATURE_FLAGS.notifications,
            errors
        ),
    };

    if (errors.length > 0) {
        throw new Error(`Invalid runtime environment configuration: ${errors.join(" ")}`);
    }

    return {
        nodeEnv,
        databaseUrl: databaseUrlRaw,
        appOrigin,
        alertWebhookUrl,
        supabaseDbLimitMb,
        auditLogRetentionDays,
        featureFlags,
    };
}
