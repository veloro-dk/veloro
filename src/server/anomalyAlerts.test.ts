import assert from "node:assert/strict";
import test from "node:test";
import {
    AUTH_FAILURE_ALERT_THRESHOLD,
    buildAnomalyAlertPayload,
    shouldAlertAuthFailures,
} from "@/server/anomalyAlerts";

test("shouldAlertAuthFailures triggers on threshold multiples", () => {
    assert.equal(shouldAlertAuthFailures(AUTH_FAILURE_ALERT_THRESHOLD - 1), false);
    assert.equal(shouldAlertAuthFailures(AUTH_FAILURE_ALERT_THRESHOLD), true);
    assert.equal(shouldAlertAuthFailures(AUTH_FAILURE_ALERT_THRESHOLD * 2), true);
    assert.equal(shouldAlertAuthFailures(AUTH_FAILURE_ALERT_THRESHOLD + 1), false);
});

test("buildAnomalyAlertPayload includes webhook-friendly text and metadata", () => {
    const payload = buildAnomalyAlertPayload(
        {
            category: "admin_action",
            severity: "medium",
            summary: "Admin action executed: STORE_CREATE",
            routeId: "api/stores/manage.POST",
            actorId: "user_123",
            details: {
                action: "STORE_CREATE",
                entityId: "store_1",
                ignored: undefined,
            },
        },
        {
            nodeEnv: "production",
            appOrigin: "https://portal.example.com",
        }
    );

    assert.equal(payload.text, "[Veloro][admin_action] Admin action executed: STORE_CREATE");
    assert.equal(payload.content, payload.text);
    assert.equal(payload.environment, "production");
    assert.equal(payload.appOrigin, "https://portal.example.com");
    assert.equal(payload.actorId, "user_123");
    assert.equal(payload.routeId, "api/stores/manage.POST");
    assert.deepEqual(payload.details, {
        action: "STORE_CREATE",
        entityId: "store_1",
    });
});
