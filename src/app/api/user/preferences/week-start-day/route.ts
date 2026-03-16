import { NextResponse } from "next/server";
import { parseWeekStartDay } from "@/i18n/portal";
import { getSessionUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { isJsonRequest, isSameOriginRequest } from "@/server/requestSecurity";
import { handleApiRoute } from "@/server/apiRoute";
import { parseRequestJsonWithSchema, parseString } from "@/server/requestSchema";

function json(body: { ok: boolean; message?: string; weekStartDay?: string }, status = 200) {
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export const POST = handleApiRoute("api/user/preferences/week-start-day.POST", async (req: Request) => {
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

    const payload = await parseRequestJsonWithSchema(
        req,
        {
            weekStartDay: { parse: (value) => parseString(value) },
        },
        {
            invalidPayloadMessage: "Invalid week start day value.",
            invalidFieldMessages: {
                weekStartDay: "Invalid week start day value.",
            },
        }
    );
    if (!payload.ok) return json({ ok: false, message: payload.message }, 400);
    const weekStartDay = parseWeekStartDay(payload.data.weekStartDay);

    if (!weekStartDay) {
        return json({ ok: false, message: "Invalid week start day value." }, 400);
    }

    await prisma.userSettings.upsert({
        where: { userId: user.id },
        update: { weekStartDay },
        create: {
            userId: user.id,
            weekStartDay,
        },
    });

    await prisma.auditLog.create({
        data: {
            actorId: user.id,
            action: "USER_WEEK_START_DAY_UPDATE",
            entity: "UserSettings",
            entityId: user.id,
            meta: { weekStartDay },
        },
    });

    return json({ ok: true, weekStartDay });
});
