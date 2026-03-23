import assert from "node:assert/strict";
import test from "node:test";
import {
    COUNTRY_FLAG_CDN_ORIGIN,
    STRICT_TRANSPORT_SECURITY_VALUE,
    buildContentSecurityPolicy,
    createCspNonce,
    shouldSetStrictTransportSecurity,
} from "@/server/securityHeaders";

test("createCspNonce returns a stable, token-safe nonce", () => {
    const nonce = createCspNonce();

    assert.match(nonce, /^[A-Za-z0-9]+$/);
    assert.ok(nonce.length >= 16);
});

test("buildContentSecurityPolicy includes nonce-based script policy", () => {
    const policy = buildContentSecurityPolicy({
        nonce: "abc123",
        includeUpgradeInsecureRequests: true,
    });

    assert.match(policy, /default-src 'self'/);
    assert.match(policy, /base-uri 'self'/);
    assert.match(policy, /object-src 'none'/);
    assert.match(policy, /frame-ancestors 'none'/);
    assert.match(policy, /script-src 'self' 'nonce-abc123' 'strict-dynamic'/);
    assert.doesNotMatch(policy, /script-src[^;]*'unsafe-inline'/);
    assert.match(policy, new RegExp(`img-src 'self' data: ${COUNTRY_FLAG_CDN_ORIGIN}`));
    assert.match(policy, /upgrade-insecure-requests/);
});

test("buildContentSecurityPolicy can allow unsafe-eval when needed for local dev", () => {
    const policy = buildContentSecurityPolicy({
        nonce: "abc123",
        includeUpgradeInsecureRequests: false,
        includeUnsafeEval: true,
    });

    assert.match(policy, /script-src 'self' 'nonce-abc123' 'strict-dynamic' 'unsafe-eval'/);
});

test("buildContentSecurityPolicy can disable upgrade-insecure-requests", () => {
    const policy = buildContentSecurityPolicy({
        nonce: "abc123",
        includeUpgradeInsecureRequests: false,
    });

    assert.doesNotMatch(policy, /upgrade-insecure-requests/);
});

test("shouldSetStrictTransportSecurity only in production over https", () => {
    assert.equal(
        shouldSetStrictTransportSecurity({ nodeEnv: "production", isHttps: true }),
        true
    );
    assert.equal(
        shouldSetStrictTransportSecurity({ nodeEnv: "production", isHttps: false }),
        false
    );
    assert.equal(
        shouldSetStrictTransportSecurity({ nodeEnv: "development", isHttps: true }),
        false
    );

    assert.equal(STRICT_TRANSPORT_SECURITY_VALUE, "max-age=31536000; includeSubDomains");
});
