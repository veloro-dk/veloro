import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { isJsonRequest, isSameOriginRequest } from "@/server/requestSecurity";
import { userCanAccessStore } from "@/server/stores";
import { parseStoreSelectionPayload } from "@/server/storeSelectionPayload";
import { handleApiRoute } from "@/server/apiRoute";

function json(body: { ok: boolean; message?: string; activeStoreId?: string }, status = 200) {
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export const POST = handleApiRoute("api/user/stores/select.POST", async (req: Request) => {
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

    const parsed = parseStoreSelectionPayload(await req.json().catch(() => null));
    if (!parsed.isValid) {
        return json({ ok: false, message: "Missing store id." }, 400);
    }
    const { storeId } = parsed;

    const canAccess = await userCanAccessStore(user.id, storeId);
    if (!canAccess) {
        return json({ ok: false, message: "You do not have access to that store." }, 403);
    }

    await prisma.userSettings.upsert({
        where: { userId: user.id },
        update: { activeStoreId: storeId },
        create: {
            userId: user.id,
            activeStoreId: storeId,
        },
    });

    await prisma.auditLog.create({
        data: {
            actorId: user.id,
            action: "USER_ACTIVE_STORE_UPDATE",
            entity: "UserSettings",
            entityId: user.id,
            meta: { activeStoreId: storeId },
        },
    });

    return json({ ok: true, activeStoreId: storeId });
});
