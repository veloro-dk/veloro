import { NextResponse } from "next/server";
import { destroySession, getSessionUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { isSameOriginRequest } from "@/server/requestSecurity";
import { handleApiRoute } from "@/server/apiRoute";

function json(body: { ok: boolean; message?: string }, status = 200) {
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export const POST = handleApiRoute("api/auth/logout.POST", async (req: Request) => {
    if (!isSameOriginRequest(req)) {
        return json({ ok: false, message: "Invalid request origin." }, 403);
    }

    const user = await getSessionUser({ allowCookieMutation: true });

    if (user) {
        await prisma.auditLog.create({
            data: {
                actorId: user.id,
                action: "AUTH_LOGOUT",
                entity: "User",
                entityId: user.id,
                meta: { employeeId: user.employeeId },
            },
        });
    }

    await destroySession();
    return json({ ok: true });
});
