import { NextResponse } from "next/server";
import { parseDateFormat } from "@/i18n/portal";
import { getSessionUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { isJsonRequest, isSameOriginRequest } from "@/server/requestSecurity";
import { handleApiRoute } from "@/server/apiRoute";
import { parseRequestJsonWithSchema, parseString } from "@/server/requestSchema";

function json(body: { ok: boolean; message?: string; dateFormat?: string }, status = 200) {
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export const POST = handleApiRoute("api/user/preferences/date-format.POST", async (req: Request) => {
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
            dateFormat: { parse: (value) => parseString(value) },
        },
        {
            invalidPayloadMessage: "Invalid date format value.",
            invalidFieldMessages: {
                dateFormat: "Invalid date format value.",
            },
        }
    );
    if (!payload.ok) return json({ ok: false, message: payload.message }, 400);
    const dateFormat = parseDateFormat(payload.data.dateFormat);

    if (!dateFormat) {
        return json({ ok: false, message: "Invalid date format value." }, 400);
    }

    await prisma.userSettings.upsert({
        where: { userId: user.id },
        update: { dateFormat },
        create: {
            userId: user.id,
            dateFormat,
        },
    });

    await prisma.auditLog.create({
        data: {
            actorId: user.id,
            action: "USER_DATE_FORMAT_UPDATE",
            entity: "UserSettings",
            entityId: user.id,
            meta: { dateFormat },
        },
    });

    return json({ ok: true, dateFormat });
});
