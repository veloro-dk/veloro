import assert from "node:assert/strict";
import test from "node:test";
import { validateRuntimeEnv } from "@/server/envValidation";

test("validateRuntimeEnv accepts valid runtime config", () => {
    const parsed = validateRuntimeEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/veloro",
        APP_URL: "https://portal.example.com/app",
        ALERT_WEBHOOK_URL: "https://hooks.example.com/veloro-alerts",
        SUPABASE_DB_LIMIT_MB: "500",
        AUDIT_LOG_RETENTION_DAYS: "120",
        FF_PORTAL_FINANCE_ENABLED: "true",
        FF_PORTAL_ANALYTICS_ENABLED: "true",
        FF_PORTAL_ANALYTICS_REPORTS_ENABLED: "true",
        FF_PORTAL_ANALYTICS_LIVE_VIEW_ENABLED: "true",
        FF_PORTAL_ASSISTANT_ENABLED: "true",
        FF_PORTAL_NOTIFICATIONS_ENABLED: "true",
    });

    assert.equal(parsed.nodeEnv, "production");
    assert.equal(parsed.databaseUrl, "postgresql://user:pass@localhost:5432/veloro");
    assert.equal(parsed.appOrigin, "https://portal.example.com");
    assert.equal(parsed.alertWebhookUrl, "https://hooks.example.com/veloro-alerts");
    assert.equal(parsed.supabaseDbLimitMb, 500);
    assert.equal(parsed.auditLogRetentionDays, 120);
    assert.equal(parsed.featureFlags.finance, true);
    assert.equal(parsed.featureFlags.analytics, true);
    assert.equal(parsed.featureFlags.analyticsReports, true);
    assert.equal(parsed.featureFlags.analyticsLiveView, true);
    assert.equal(parsed.featureFlags.assistant, true);
    assert.equal(parsed.featureFlags.notifications, true);
});

test("validateRuntimeEnv requires DATABASE_URL", () => {
    assert.throws(
        () => validateRuntimeEnv({ APP_URL: "http://localhost:3000" }),
        /Missing DATABASE_URL/
    );
});

test("validateRuntimeEnv requires APP_URL in production", () => {
    assert.throws(
        () => validateRuntimeEnv({
            NODE_ENV: "production",
            DATABASE_URL: "postgresql://user:pass@localhost:5432/veloro",
        }),
        /Missing APP_URL in production/
    );
});

test("validateRuntimeEnv validates SUPABASE_DB_LIMIT_MB format", () => {
    assert.throws(
        () => validateRuntimeEnv({
            DATABASE_URL: "postgresql://user:pass@localhost:5432/veloro",
            APP_URL: "http://localhost:3000",
            SUPABASE_DB_LIMIT_MB: "-10",
        }),
        /SUPABASE_DB_LIMIT_MB must be a positive number/
    );
});

test("validateRuntimeEnv validates ALERT_WEBHOOK_URL format", () => {
    assert.throws(
        () => validateRuntimeEnv({
            DATABASE_URL: "postgresql://user:pass@localhost:5432/veloro",
            APP_URL: "http://localhost:3000",
            ALERT_WEBHOOK_URL: "ftp://invalid-webhook.example.com",
        }),
        /ALERT_WEBHOOK_URL must be a valid http\/https URL/
    );
});

test("validateRuntimeEnv defaults AUDIT_LOG_RETENTION_DAYS when missing", () => {
    const parsed = validateRuntimeEnv({
        DATABASE_URL: "postgresql://user:pass@localhost:5432/veloro",
        APP_URL: "http://localhost:3000",
    });

    assert.equal(parsed.auditLogRetentionDays, 90);
});

test("validateRuntimeEnv validates AUDIT_LOG_RETENTION_DAYS format", () => {
    assert.throws(
        () => validateRuntimeEnv({
            DATABASE_URL: "postgresql://user:pass@localhost:5432/veloro",
            APP_URL: "http://localhost:3000",
            AUDIT_LOG_RETENTION_DAYS: "3",
        }),
        /AUDIT_LOG_RETENTION_DAYS must be between 7 and 3650/
    );

    assert.throws(
        () => validateRuntimeEnv({
            DATABASE_URL: "postgresql://user:pass@localhost:5432/veloro",
            APP_URL: "http://localhost:3000",
            AUDIT_LOG_RETENTION_DAYS: "ninety",
        }),
        /AUDIT_LOG_RETENTION_DAYS must be an integer/
    );
});

test("validateRuntimeEnv defaults portal feature flags to enabled", () => {
    const parsed = validateRuntimeEnv({
        DATABASE_URL: "postgresql://user:pass@localhost:5432/veloro",
        APP_URL: "http://localhost:3000",
    });

    assert.equal(parsed.featureFlags.finance, true);
    assert.equal(parsed.featureFlags.analytics, true);
    assert.equal(parsed.featureFlags.analyticsReports, true);
    assert.equal(parsed.featureFlags.analyticsLiveView, true);
    assert.equal(parsed.featureFlags.assistant, true);
    assert.equal(parsed.featureFlags.notifications, true);
});

test("validateRuntimeEnv validates portal feature flag format", () => {
    assert.throws(
        () => validateRuntimeEnv({
            DATABASE_URL: "postgresql://user:pass@localhost:5432/veloro",
            APP_URL: "http://localhost:3000",
            FF_PORTAL_ANALYTICS_ENABLED: "maybe",
        }),
        /FF_PORTAL_ANALYTICS_ENABLED must be a boolean/
    );
});
