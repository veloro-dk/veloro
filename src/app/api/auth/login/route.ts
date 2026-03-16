import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { createSession, verifyPassword, getClientIp } from "@/server/auth";
import { ensureLoginAllowed, recordLoginAttempt } from "@/server/rateLimit";
import { isJsonRequest, isSameOriginRequest } from "@/server/requestSecurity";
import { parseLoginPayload } from "@/server/authPayload";
import { handleApiRoute } from "@/server/apiRoute";
import { sendAuthFailureAlert, shouldAlertAuthFailures } from "@/server/anomalyAlerts";

const DUMMY_PASSWORD_HASH = "$argon2id$v=19$m=65536,t=3,p=4$J+QaCIodZwr+3XWkjMK1kw$XG0TlJXQz5I48rLhEJvLpG02ItnHiMJCMGEERC83avw";
const LOGIN_ALERT_WINDOW_MS = 10 * 60 * 1000;

function json(body: { ok: boolean; message?: string; requiresPasswordReset?: boolean }, status = 200) {
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export const POST = handleApiRoute("api/auth/login.POST", async (req: Request) => {
    if (!isSameOriginRequest(req)) {
        return json({ ok: false, message: "Invalid request origin." }, 403);
    }

    if (!isJsonRequest(req)) {
        return json({ ok: false, message: "Unsupported content type." }, 415);
    }

    const parsed = parseLoginPayload(await req.json().catch(() => null));
    if (!parsed.isValid) {
        return json({ ok: false, message: "Please enter your employee ID and password." }, 400);
    }
    const { employeeId, password } = parsed;

    const ip = await getClientIp();
    const allowed = await ensureLoginAllowed({ ip, employeeId });

    if (!allowed.allowed) {
        await recordLoginAttempt({ ipHash: allowed.ipHash, employeeId, ok: false });
        void sendAuthFailureAlert({
            routeId: "api/auth/login.POST",
            reason: "rate_limited",
            employeeId,
            ipHash: allowed.ipHash,
            recentFailureCount: 10,
            userAgent: req.headers.get("user-agent"),
        });
        return json({ ok: false, message: "Too many attempts. Please wait and try again." }, 429);
    }

    const user = await prisma.user.findUnique({ where: { employeeId } });
    const passwordOk = await verifyPassword(user?.passwordHash ?? DUMMY_PASSWORD_HASH, password);
    const ok = !!user && passwordOk && user.status === "ACTIVE";

    await recordLoginAttempt({ ipHash: allowed.ipHash, employeeId, ok });

    if (!ok) {
        const failedSince = new Date(Date.now() - LOGIN_ALERT_WINDOW_MS);
        const [ipFailures, employeeFailures] = await Promise.all([
            prisma.loginAttempt.count({
                where: {
                    ipHash: allowed.ipHash,
                    ok: false,
                    createdAt: { gt: failedSince },
                },
            }),
            prisma.loginAttempt.count({
                where: {
                    employeeId,
                    ok: false,
                    createdAt: { gt: failedSince },
                },
            }),
        ]);

        const recentFailureCount = Math.max(ipFailures, employeeFailures);
        if (shouldAlertAuthFailures(recentFailureCount)) {
            void sendAuthFailureAlert({
                routeId: "api/auth/login.POST",
                reason: "invalid_credentials_threshold",
                employeeId,
                ipHash: allowed.ipHash,
                recentFailureCount,
                userAgent: req.headers.get("user-agent"),
            });
        }

        return json({ ok: false, message: "Invalid employee ID or password." }, 401);
    }

    await createSession(user!.id);

    await prisma.auditLog.create({
        data: {
            actorId: user!.id,
            action: "AUTH_LOGIN",
            entity: "User",
            entityId: user!.id,
            meta: { employeeId },
        },
    });

    return json({ ok: true, requiresPasswordReset: Boolean(user!.requiresPasswordReset) });
});
