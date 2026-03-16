import { NextResponse } from "next/server";
import { parseSupportedCurrency } from "@/i18n/portal";
import { getSessionUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { isJsonRequest, isSameOriginRequest } from "@/server/requestSecurity";
import { handleApiRoute } from "@/server/apiRoute";
import { parseRequestJsonWithSchema, parseString } from "@/server/requestSchema";

function json(body: { ok: boolean; message?: string; defaultCurrency?: string }, status = 200) {
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export const POST = handleApiRoute("api/user/preferences/default-currency.POST", async (req: Request) => {
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
            defaultCurrency: { parse: (value) => parseString(value) },
        },
        {
            invalidPayloadMessage: "Invalid default currency value.",
            invalidFieldMessages: {
                defaultCurrency: "Invalid default currency value.",
            },
        }
    );
    if (!payload.ok) return json({ ok: false, message: payload.message }, 400);
    const defaultCurrency = parseSupportedCurrency(payload.data.defaultCurrency);

    if (!defaultCurrency) {
        return json({ ok: false, message: "Invalid default currency value." }, 400);
    }

    await prisma.userSettings.upsert({
        where: { userId: user.id },
        update: { defaultCurrency },
        create: {
            userId: user.id,
            defaultCurrency,
        },
    });

    await prisma.auditLog.create({
        data: {
            actorId: user.id,
            action: "USER_DEFAULT_CURRENCY_UPDATE",
            entity: "UserSettings",
            entityId: user.id,
            meta: { defaultCurrency },
        },
    });

    return json({ ok: true, defaultCurrency });
});
