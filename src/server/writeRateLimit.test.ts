import assert from "node:assert/strict";
import test from "node:test";
import {
    ensureWriteRequestAllowed,
    getWriteRateLimitConfig,
    resetWriteRateLimitStateForTests,
} from "@/server/writeRateLimit";

test("write limiter blocks requests after configured burst size", () => {
    resetWriteRateLimitStateForTests();

    const req = new Request("https://portal.example.com/api/stores/manage", {
        method: "POST",
        headers: { "x-forwarded-for": "198.51.100.10" },
    });
    const { maxRequests } = getWriteRateLimitConfig("storesManage");

    for (let i = 0; i < maxRequests; i += 1) {
        const decision = ensureWriteRequestAllowed({
            scope: "storesManage",
            req,
            actorId: "admin-1",
            nowMs: 0,
        });
        assert.equal(decision.allowed, true);
    }

    const blocked = ensureWriteRequestAllowed({
        scope: "storesManage",
        req,
        actorId: "admin-1",
        nowMs: 0,
    });
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.remaining, 0);
    assert.ok(blocked.retryAfterSeconds >= 1);
});

test("write limiter refills after the configured window", () => {
    resetWriteRateLimitStateForTests();

    const req = new Request("https://portal.example.com/api/system/maintenance", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.77" },
    });
    const { maxRequests, windowMs } = getWriteRateLimitConfig("maintenance");

    for (let i = 0; i < maxRequests; i += 1) {
        const decision = ensureWriteRequestAllowed({
            scope: "maintenance",
            req,
            actorId: "admin-2",
            nowMs: 0,
        });
        assert.equal(decision.allowed, true);
    }

    const blocked = ensureWriteRequestAllowed({
        scope: "maintenance",
        req,
        actorId: "admin-2",
        nowMs: 0,
    });
    assert.equal(blocked.allowed, false);

    const afterRefill = ensureWriteRequestAllowed({
        scope: "maintenance",
        req,
        actorId: "admin-2",
        nowMs: windowMs,
    });
    assert.equal(afterRefill.allowed, true);
});

test("write limiter keys catalog writes by store and actor", () => {
    resetWriteRateLimitStateForTests();

    const req = new Request("https://portal.example.com/api/catalog/state", {
        method: "POST",
        headers: { "x-forwarded-for": "192.0.2.55" },
    });
    const { maxRequests } = getWriteRateLimitConfig("catalog");

    for (let i = 0; i < maxRequests; i += 1) {
        ensureWriteRequestAllowed({
            scope: "catalog",
            req,
            actorId: "user-a",
            storeId: "store-1",
            nowMs: 0,
        });
    }

    const blocked = ensureWriteRequestAllowed({
        scope: "catalog",
        req,
        actorId: "user-a",
        storeId: "store-1",
        nowMs: 0,
    });
    assert.equal(blocked.allowed, false);

    const otherStore = ensureWriteRequestAllowed({
        scope: "catalog",
        req,
        actorId: "user-a",
        storeId: "store-2",
        nowMs: 0,
    });
    assert.equal(otherStore.allowed, true);

    const otherActor = ensureWriteRequestAllowed({
        scope: "catalog",
        req,
        actorId: "user-b",
        storeId: "store-1",
        nowMs: 0,
    });
    assert.equal(otherActor.allowed, true);
});
