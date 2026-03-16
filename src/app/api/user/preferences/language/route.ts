import { NextResponse } from "next/server";
import { parseLanguage } from "@/i18n/portal";
import { getSessionUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { isJsonRequest, isSameOriginRequest } from "@/server/requestSecurity";
import { handleApiRoute } from "@/server/apiRoute";
import { parseRequestJsonWithSchema, parseString } from "@/server/requestSchema";

function json(body: { ok: boolean; message?: string; language?: string }, status = 200) {
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export const POST = handleApiRoute("api/user/preferences/language.POST", async (req: Request) => {
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
            language: { parse: (value) => parseString(value) },
        },
        {
            invalidPayloadMessage: "Invalid language value.",
            invalidFieldMessages: {
                language: "Invalid language value.",
            },
        }
    );
    if (!payload.ok) return json({ ok: false, message: payload.message }, 400);
    const preferredLanguage = parseLanguage(payload.data.language);

    if (!preferredLanguage) {
        return json({ ok: false, message: "Invalid language value." }, 400);
    }

    await prisma.userSettings.upsert({
        where: { userId: user.id },
        update: { preferredLanguage },
        create: {
            userId: user.id,
            preferredLanguage,
        },
    });

    await prisma.auditLog.create({
        data: {
            actorId: user.id,
            action: "USER_LANGUAGE_UPDATE",
            entity: "UserSettings",
            entityId: user.id,
            meta: { preferredLanguage },
        },
    });

    return json({ ok: true, language: preferredLanguage });
});
