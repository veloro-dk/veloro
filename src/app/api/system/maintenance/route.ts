import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { isJsonRequest, isSameOriginRequest } from "@/server/requestSecurity";
import { runSystemHealthCheck } from "@/server/systemHealth";
import { handleApiRoute } from "@/server/apiRoute";
import { ensureWriteRequestAllowed } from "@/server/writeRateLimit";
import { parseEnum, parseRequestJsonWithSchema } from "@/server/requestSchema";
import { getAuditLogRetentionDays, runAuditLogRetention } from "@/server/auditLogRetention";
import { sendMaintenanceOperationAlert } from "@/server/anomalyAlerts";

type MaintenanceAction =
    | "cleanup_expired_sessions"
    | "cleanup_login_attempts"
    | "cleanup_audit_logs"
    | "cleanup_recommended";

const VALID_ACTIONS = new Set<MaintenanceAction>([
    "cleanup_expired_sessions",
    "cleanup_login_attempts",
    "cleanup_audit_logs",
    "cleanup_recommended",
]);
const MAINTENANCE_ACTIONS = [
    "cleanup_expired_sessions",
    "cleanup_login_attempts",
    "cleanup_audit_logs",
    "cleanup_recommended",
] as const;

const LOGIN_ATTEMPTS_RETENTION_DAYS = 30;

function json(body: unknown, status = 200, headers?: HeadersInit) {
    return NextResponse.json(body, {
        status,
        headers: {
            "Cache-Control": "no-store",
            ...(headers || {}),
        },
    });
}

export const POST = handleApiRoute("api/system/maintenance.POST", async (req: Request) => {
    if (!isSameOriginRequest(req)) {
        return json({ ok: false, message: "Invalid request origin." }, 403);
    }

    if (!isJsonRequest(req)) {
        return json({ ok: false, message: "Unsupported content type." }, 415);
    }

    const user = await getSessionUser({ allowCookieMutation: true });
    if (!user) return json({ ok: false, message: "Unauthorized" }, 401);
    if (user.role !== "ADMIN") return json({ ok: false, message: "Admin access required" }, 403);
    const writeLimit = ensureWriteRequestAllowed({
        scope: "maintenance",
        req,
        actorId: user.id,
    });
    if (!writeLimit.allowed) {
        return json(
            {
                ok: false,
                message: `Too many maintenance write requests. Please wait ${writeLimit.retryAfterSeconds} seconds and try again.`,
            },
            429,
            { "Retry-After": String(writeLimit.retryAfterSeconds) }
        );
    }

    const payload = await parseRequestJsonWithSchema(
        req,
        {
            action: {
                parse: (value) => parseEnum(value, MAINTENANCE_ACTIONS, { caseInsensitive: false }),
            },
        },
        {
            invalidPayloadMessage: "Invalid maintenance action",
            invalidFieldMessages: {
                action: "Invalid maintenance action",
            },
        }
    );
    if (!payload.ok) {
        return json({ ok: false, message: payload.message }, 400);
    }
    const action = payload.data.action;
    if (!VALID_ACTIONS.has(action)) return json({ ok: false, message: "Invalid maintenance action" }, 400);

    const now = new Date();
    const auditLogRetentionDays = getAuditLogRetentionDays();
    const loginAttemptsCutoff = new Date(now.getTime() - LOGIN_ATTEMPTS_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    const deleted = {
        expiredSessions: 0,
        loginAttempts: 0,
        auditLogs: 0,
    };
    let auditLogCleanup: {
        skipped: boolean;
        reason: "completed" | "lock-not-acquired";
        cutoffIso: string;
        batches: number;
    } | null = null;

    if (action === "cleanup_expired_sessions" || action === "cleanup_recommended") {
        const result = await prisma.session.deleteMany({
            where: {
                expiresAt: { lt: now },
            },
        });
        deleted.expiredSessions = result.count;
    }

    if (action === "cleanup_login_attempts" || action === "cleanup_recommended") {
        const result = await prisma.loginAttempt.deleteMany({
            where: {
                createdAt: { lt: loginAttemptsCutoff },
            },
        });
        deleted.loginAttempts = result.count;
    }

    if (action === "cleanup_audit_logs" || action === "cleanup_recommended") {
        const result = await runAuditLogRetention({
            now,
            retentionDays: auditLogRetentionDays,
            useAdvisoryLock: true,
        });
        deleted.auditLogs = result.deletedCount;
        auditLogCleanup = {
            skipped: result.skipped,
            reason: result.reason,
            cutoffIso: result.cutoffIso,
            batches: result.batches,
        };
    }

    await prisma.auditLog.create({
        data: {
            actorId: user.id,
            action: "SYSTEM_MAINTENANCE_RUN",
            entity: "SystemMaintenance",
            entityId: action,
            meta: {
                action,
                deleted,
                retentionDays: {
                    loginAttempts: LOGIN_ATTEMPTS_RETENTION_DAYS,
                    auditLogs: auditLogRetentionDays,
                },
                auditLogCleanup,
            },
        },
    });

    void sendMaintenanceOperationAlert({
        routeId: "api/system/maintenance.POST",
        action,
        actorId: user.id,
        deleted,
        retentionDays: {
            loginAttempts: LOGIN_ATTEMPTS_RETENTION_DAYS,
            auditLogs: auditLogRetentionDays,
        },
        auditLogCleanup,
    });

    const origin = new URL(req.url).origin;
    const report = await runSystemHealthCheck({
        origin,
        cookieHeader: req.headers.get("cookie"),
    });

    return json({
        ok: true,
        action,
        deleted,
        retentionDays: {
            loginAttempts: LOGIN_ATTEMPTS_RETENTION_DAYS,
            auditLogs: auditLogRetentionDays,
        },
        auditLogCleanup,
        report,
    });
});
