import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { isJsonRequest, isSameOriginRequest } from "@/server/requestSecurity";
import { handleApiRoute } from "@/server/apiRoute";
import { parseRequestJsonWithSchema, parseString } from "@/server/requestSchema";

function json(body: { ok: boolean; message?: string; defaultTimeZone?: string }, status = 200) {
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function parseTimeZone(input: unknown): string | null {
    const raw = typeof input === "string" ? input.trim() : "";
    if (!raw) return null;

    try {
        const maybeSupportedValuesOf = (Intl as unknown as { supportedValuesOf?: (key: "timeZone") => string[] }).supportedValuesOf;
        if (typeof maybeSupportedValuesOf === "function") {
            const all = maybeSupportedValuesOf("timeZone");
            return all.includes(raw) ? raw : null;
        }

        // Fallback when supportedValuesOf is unavailable.
        new Intl.DateTimeFormat("en-US", { timeZone: raw }).format(new Date());
        return raw;
    } catch {
        return null;
    }
}

export const POST = handleApiRoute("api/user/preferences/default-time-zone.POST", async (req: Request) => {
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
            defaultTimeZone: { parse: (value) => parseString(value) },
        },
        {
            invalidPayloadMessage: "Invalid default time zone value.",
            invalidFieldMessages: {
                defaultTimeZone: "Invalid default time zone value.",
            },
        }
    );
    if (!payload.ok) return json({ ok: false, message: payload.message }, 400);
    const defaultTimeZone = parseTimeZone(payload.data.defaultTimeZone);

    if (!defaultTimeZone) {
        return json({ ok: false, message: "Invalid default time zone value." }, 400);
    }

    await prisma.userSettings.upsert({
        where: { userId: user.id },
        update: { defaultTimeZone },
        create: {
            userId: user.id,
            defaultTimeZone,
        },
    });

    await prisma.auditLog.create({
        data: {
            actorId: user.id,
            action: "USER_DEFAULT_TIME_ZONE_UPDATE",
            entity: "UserSettings",
            entityId: user.id,
            meta: { defaultTimeZone },
        },
    });

    return json({ ok: true, defaultTimeZone });
});
