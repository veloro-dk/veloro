import crypto from "crypto";

export type WriteRateLimitScope = "catalog" | "teamUsers" | "storesManage" | "maintenance";

type WriteRateLimitConfig = {
    maxRequests: number;
    windowMs: number;
};

type WriteRateLimitBucket = {
    tokens: number;
    lastRefillMs: number;
    touchedAtMs: number;
};

export type WriteRateLimitDecision = {
    allowed: boolean;
    limit: number;
    remaining: number;
    retryAfterSeconds: number;
};

const WRITE_RATE_LIMITS: Record<WriteRateLimitScope, WriteRateLimitConfig> = {
    catalog: { maxRequests: 240, windowMs: 5 * 60 * 1000 },
    teamUsers: { maxRequests: 30, windowMs: 10 * 60 * 1000 },
    storesManage: { maxRequests: 10, windowMs: 10 * 60 * 1000 },
    maintenance: { maxRequests: 6, windowMs: 10 * 60 * 1000 },
};

const PRUNE_INTERVAL_MS = 60 * 1000;
const BUCKET_TTL_MS = Math.max(...Object.values(WRITE_RATE_LIMITS).map((limit) => limit.windowMs)) * 2;

const writeRateBuckets = new Map<string, WriteRateLimitBucket>();
let lastPruneAtMs = 0;

function sha256Hex(input: string) {
    return crypto.createHash("sha256").update(input).digest("hex");
}

function hashIp(ip: string) {
    return sha256Hex(ip).slice(0, 64);
}

function getClientIpFromRequest(req: Request) {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
        const first = forwarded.split(",")[0]?.trim();
        if (first) return first;
    }

    const realIp = req.headers.get("x-real-ip")?.trim();
    if (realIp) return realIp;

    const cloudflareIp = req.headers.get("cf-connecting-ip")?.trim();
    if (cloudflareIp) return cloudflareIp;

    return "unknown";
}

function buildBucketKey(params: { scope: WriteRateLimitScope; req: Request; actorId: string; storeId?: string }) {
    const ipHash = hashIp(getClientIpFromRequest(params.req));
    const actorId = params.actorId.trim() || "anonymous";
    const storeId = params.storeId?.trim() || "global";
    return `${params.scope}:${ipHash}:${actorId}:${storeId}`;
}

function pruneStaleBuckets(nowMs: number) {
    if (nowMs - lastPruneAtMs < PRUNE_INTERVAL_MS) return;
    lastPruneAtMs = nowMs;

    for (const [key, bucket] of writeRateBuckets.entries()) {
        if (nowMs - bucket.touchedAtMs > BUCKET_TTL_MS) {
            writeRateBuckets.delete(key);
        }
    }
}

export function getWriteRateLimitConfig(scope: WriteRateLimitScope) {
    return WRITE_RATE_LIMITS[scope];
}

export function ensureWriteRequestAllowed(params: {
    scope: WriteRateLimitScope;
    req: Request;
    actorId: string;
    storeId?: string;
    nowMs?: number;
}): WriteRateLimitDecision {
    const config = WRITE_RATE_LIMITS[params.scope];
    const nowMs = params.nowMs ?? Date.now();
    const key = buildBucketKey(params);
    const refillPerMs = config.maxRequests / config.windowMs;

    pruneStaleBuckets(nowMs);

    const existingBucket = writeRateBuckets.get(key);

    let availableTokens = config.maxRequests;
    if (existingBucket) {
        const elapsedMs = Math.max(0, nowMs - existingBucket.lastRefillMs);
        availableTokens = Math.min(
            config.maxRequests,
            existingBucket.tokens + elapsedMs * refillPerMs
        );
    }

    if (availableTokens < 1) {
        const missingTokens = 1 - availableTokens;
        const retryAfterSeconds = Math.max(1, Math.ceil((missingTokens / refillPerMs) / 1000));
        writeRateBuckets.set(key, {
            tokens: availableTokens,
            lastRefillMs: nowMs,
            touchedAtMs: nowMs,
        });
        return {
            allowed: false,
            limit: config.maxRequests,
            remaining: 0,
            retryAfterSeconds,
        };
    }

    const remainingTokens = availableTokens - 1;
    writeRateBuckets.set(key, {
        tokens: remainingTokens,
        lastRefillMs: nowMs,
        touchedAtMs: nowMs,
    });

    return {
        allowed: true,
        limit: config.maxRequests,
        remaining: Math.max(0, Math.floor(remainingTokens)),
        retryAfterSeconds: 0,
    };
}

export function resetWriteRateLimitStateForTests() {
    writeRateBuckets.clear();
    lastPruneAtMs = 0;
}
