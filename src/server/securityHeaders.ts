export const COUNTRY_FLAG_CDN_ORIGIN = "https://purecatamphetamine.github.io";

export const STRICT_TRANSPORT_SECURITY_VALUE = "max-age=31536000; includeSubDomains";

type ContentSecurityPolicyOptions = {
    nonce: string;
    includeUpgradeInsecureRequests?: boolean;
    includeUnsafeEval?: boolean;
};

export function createCspNonce() {
    return crypto.randomUUID().replace(/-/g, "");
}

export function buildContentSecurityPolicy({
    nonce,
    includeUpgradeInsecureRequests = true,
    includeUnsafeEval = false,
}: ContentSecurityPolicyOptions) {
    const scriptSrc = ["script-src", "'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
    if (includeUnsafeEval) {
        scriptSrc.push("'unsafe-eval'");
    }

    const directives = [
        "default-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "object-src 'none'",
        scriptSrc.join(" "),
        "style-src 'self' 'unsafe-inline'",
        `img-src 'self' data: ${COUNTRY_FLAG_CDN_ORIGIN}`,
        "font-src 'self'",
        "connect-src 'self'",
        "frame-src 'none'",
    ];

    if (includeUpgradeInsecureRequests) {
        directives.push("upgrade-insecure-requests");
    }

    return directives.join("; ");
}

type StrictTransportSecurityOptions = {
    nodeEnv: string | undefined;
    isHttps: boolean;
};

export function shouldSetStrictTransportSecurity({
    nodeEnv,
    isHttps,
}: StrictTransportSecurityOptions) {
    return nodeEnv === "production" && isHttps;
}
