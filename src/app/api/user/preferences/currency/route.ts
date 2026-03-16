import { NextResponse } from "next/server";
import { parseCurrency, parseSupportedCurrency } from "@/i18n/portal";
import { getSessionUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { isJsonRequest, isSameOriginRequest } from "@/server/requestSecurity";
import { PREFERRED_CURRENCY_COOKIE_NAME, isMissingDbColumnError } from "@/server/userSettings";
import { handleApiRoute } from "@/server/apiRoute";
import { parseRequestJsonWithSchema, parseString } from "@/server/requestSchema";

function json(body: { ok: boolean; message?: string; currency?: string }, status = 200) {
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function attachCurrencyCookie(response: NextResponse, currency: string) {
    response.cookies.set({
        name: PREFERRED_CURRENCY_COOKIE_NAME,
        value: currency,
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        httpOnly: false,
    });
    return response;
}

export const POST = handleApiRoute("api/user/preferences/currency.POST", async (req: Request) => {
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
            currency: { parse: (value) => parseString(value) },
        },
        {
            invalidPayloadMessage: "Invalid currency value.",
            invalidFieldMessages: {
                currency: "Invalid currency value.",
            },
        }
    );
    if (!payload.ok) return json({ ok: false, message: payload.message }, 400);
    const preferredCurrency = parseCurrency(payload.data.currency);

    if (!preferredCurrency) {
        return json({ ok: false, message: "Invalid currency value." }, 400);
    }

    const supportedCurrency = parseSupportedCurrency(preferredCurrency) ?? "EUR";

    try {
        await prisma.userSettings.upsert({
            where: { userId: user.id },
            update: { preferredCurrency: supportedCurrency },
            create: { userId: user.id, preferredCurrency: supportedCurrency },
        });
    } catch (error) {
        if (!isMissingDbColumnError(error)) throw error;
    }

    await prisma.auditLog.create({
        data: {
            actorId: user.id,
            action: "USER_CURRENCY_UPDATE",
            entity: "UserSettings",
            entityId: user.id,
            meta: { preferredCurrency, supportedCurrency },
        },
    });

    return attachCurrencyCookie(json({ ok: true, currency: preferredCurrency }), preferredCurrency);
});
