import "server-only";
import { getRuntimeEnv } from "@/server/env";

export const AUTH_FAILURE_ALERT_THRESHOLD = 5;
const ALERT_TIMEOUT_MS = 4_000;

export type AlertCategory = "auth_failure" | "admin_action" | "maintenance_operation";
export type AlertSeverity = "low" | "medium" | "high";

type RuntimeAlertContext = {
    nodeEnv: string;
    appOrigin: string | null;
};

type BaseAlertInput = {
    category: AlertCategory;
    severity: AlertSeverity;
    summary: string;
    routeId: string;
    actorId?: string | null;
    details?: Record<string, unknown>;
};

type AuthFailureAlertInput = {
    routeId: string;
    reason: "invalid_credentials_threshold" | "rate_limited";
    employeeId?: string;
    ipHash: string;
    recentFailureCount: number;
    userAgent?: string | null;
};

type AdminActionAlertInput = {
    routeId: string;
    action: string;
    actorId: string;
    entity: string;
    entityId: string;
    details?: Record<string, unknown>;
};

type MaintenanceOperationAlertInput = {
    routeId: string;
    action: string;
    actorId: string;
    deleted: {
        expiredSessions: number;
        loginAttempts: number;
        auditLogs: number;
    };
    retentionDays: {
        loginAttempts: number;
        auditLogs: number;
    };
    auditLogCleanup?: {
        skipped: boolean;
        reason: "completed" | "lock-not-acquired";
        cutoffIso: string;
        batches: number;
    } | null;
};

function filterDefined(details: Record<string, unknown> | undefined) {
    if (!details) return {} as Record<string, unknown>;

    const output: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(details)) {
        if (value === undefined) continue;
        output[key] = value;
    }
    return output;
}

export function shouldAlertAuthFailures(recentFailureCount: number) {
    return Number.isInteger(recentFailureCount)
        && recentFailureCount >= AUTH_FAILURE_ALERT_THRESHOLD
        && recentFailureCount % AUTH_FAILURE_ALERT_THRESHOLD === 0;
}

export function buildAnomalyAlertPayload(
    input: BaseAlertInput,
    context: RuntimeAlertContext
) {
    const timestamp = new Date().toISOString();
    const prefix = `[Veloro][${input.category}]`;
    const text = `${prefix} ${input.summary}`;

    return {
        text,
        content: text,
        source: "veloro",
        category: input.category,
        severity: input.severity,
        summary: input.summary,
        timestamp,
        routeId: input.routeId,
        environment: context.nodeEnv,
        appOrigin: context.appOrigin,
        actorId: input.actorId ?? null,
        details: filterDefined(input.details),
    };
}

export async function sendAnomalyAlert(input: BaseAlertInput) {
    const runtimeEnv = getRuntimeEnv();
    const webhookUrl = runtimeEnv.alertWebhookUrl;
    if (!webhookUrl) return false;

    const payload = buildAnomalyAlertPayload(input, {
        nodeEnv: runtimeEnv.nodeEnv,
        appOrigin: runtimeEnv.appOrigin,
    });

    try {
        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(ALERT_TIMEOUT_MS),
        });

        if (!response.ok) {
            console.error(`[anomaly-alert:${input.category}] Webhook rejected event`, {
                status: response.status,
                routeId: input.routeId,
            });
            return false;
        }

        return true;
    } catch (error: unknown) {
        console.error(`[anomaly-alert:${input.category}] Failed to deliver webhook`, {
            routeId: input.routeId,
            error: error instanceof Error ? { message: error.message, name: error.name } : error,
        });
        return false;
    }
}

export function sendAuthFailureAlert(input: AuthFailureAlertInput) {
    const summary = input.reason === "rate_limited"
        ? `Login rate limit hit for employee ${input.employeeId || "unknown"}`
        : `Repeated failed login attempts for employee ${input.employeeId || "unknown"}`;

    return sendAnomalyAlert({
        category: "auth_failure",
        severity: input.reason === "rate_limited" ? "high" : "medium",
        summary,
        routeId: input.routeId,
        details: {
            reason: input.reason,
            employeeId: input.employeeId || null,
            ipHash: input.ipHash,
            recentFailureCount: input.recentFailureCount,
            userAgent: input.userAgent || null,
        },
    });
}

export function sendAdminActionAlert(input: AdminActionAlertInput) {
    return sendAnomalyAlert({
        category: "admin_action",
        severity: "medium",
        summary: `Admin action executed: ${input.action}`,
        routeId: input.routeId,
        actorId: input.actorId,
        details: {
            action: input.action,
            entity: input.entity,
            entityId: input.entityId,
            ...filterDefined(input.details),
        },
    });
}

export function sendMaintenanceOperationAlert(input: MaintenanceOperationAlertInput) {
    return sendAnomalyAlert({
        category: "maintenance_operation",
        severity: "high",
        summary: `Maintenance operation executed: ${input.action}`,
        routeId: input.routeId,
        actorId: input.actorId,
        details: {
            action: input.action,
            deleted: input.deleted,
            retentionDays: input.retentionDays,
            auditLogCleanup: input.auditLogCleanup ?? null,
        },
    });
}
