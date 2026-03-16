import { NextResponse } from "next/server";
import { getSessionUser, hashPassword, verifyPassword } from "@/server/auth";
import { prisma } from "@/server/db";
import { isJsonRequest, isSameOriginRequest } from "@/server/requestSecurity";
import { handleApiRoute } from "@/server/apiRoute";
import { parseRequestJsonWithSchema, parseString } from "@/server/requestSchema";

function json(body: { ok: boolean; message?: string }, status = 200) {
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export const POST = handleApiRoute("api/auth/set-password.POST", async (req: Request) => {
    if (!isSameOriginRequest(req)) {
        return json({ ok: false, message: "Invalid request origin." }, 403);
    }

    if (!isJsonRequest(req)) {
        return json({ ok: false, message: "Unsupported content type." }, 415);
    }

    const user = await getSessionUser({ allowCookieMutation: true });
    if (!user) {
        return json({ ok: false, message: "Unauthorized." }, 401);
    }

    if (!user.requiresPasswordReset) {
        return json({ ok: true });
    }

    const payload = await parseRequestJsonWithSchema(
        req,
        {
            password: {
                parse: (value) => parseString(value, { trim: false, allowEmpty: true }),
            },
        },
        {
            invalidPayloadMessage: "Invalid payload.",
            invalidFieldMessages: {
                password: "Invalid payload.",
            },
        }
    );
    if (!payload.ok) {
        return json({ ok: false, message: payload.message }, 400);
    }

    const nextPassword = payload.data.password;
    if (nextPassword.length < 8) {
        return json({ ok: false, message: "Password must be at least 8 characters." }, 400);
    }

    const sameAsTemporary = await verifyPassword(user.passwordHash, nextPassword);
    if (sameAsTemporary) {
        return json({ ok: false, message: "Please choose a different password from the temporary one." }, 400);
    }

    const nextPasswordHash = await hashPassword(nextPassword);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            passwordHash: nextPasswordHash,
            requiresPasswordReset: false,
        },
    });

    await prisma.auditLog.create({
        data: {
            actorId: user.id,
            action: "AUTH_PASSWORD_SET",
            entity: "User",
            entityId: user.id,
            meta: {
                employeeId: user.employeeId,
                firstLoginReset: true,
            },
        },
    });

    return json({ ok: true });
});
