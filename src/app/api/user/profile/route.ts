import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/auth";
import { SUPPORTED_LANGUAGES, type LanguageCode } from "@/i18n/portal";
import { isJsonRequest, isSameOriginRequest } from "@/server/requestSecurity";
import { parseProfilePayload } from "@/server/profilePayload";
import { handleApiRoute } from "@/server/apiRoute";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-()\s]{5,32}$/;

export const POST = handleApiRoute("api/user/profile.POST", async (req: Request) => {
    if (!isSameOriginRequest(req)) {
        return NextResponse.json({ ok: false, message: "Invalid request origin." }, { status: 403 });
    }

    if (!isJsonRequest(req)) {
        return NextResponse.json({ ok: false, message: "Unsupported content type." }, { status: 415 });
    }

    const user = await getSessionUser({ allowCookieMutation: true });
    if (!user) {
        return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const parsed = parseProfilePayload(await req.json().catch(() => null));
    const firstName = parsed.firstName;
    const lastName = parsed.lastName;
    const emailRaw = parsed.emailRaw;
    const phoneRaw = parsed.phoneRaw;
    const preferredLanguage = parsed.preferredLanguage as LanguageCode;
    const timeZone = parsed.timeZone;

    if (!firstName || !lastName) {
        return NextResponse.json({ ok: false, message: "First and last name are required." }, { status: 400 });
    }

    if (!SUPPORTED_LANGUAGES.includes(preferredLanguage)) {
        return NextResponse.json({ ok: false, message: "Invalid language." }, { status: 400 });
    }

    if (emailRaw && !EMAIL_RE.test(emailRaw)) {
        return NextResponse.json({ ok: false, message: "Invalid email format." }, { status: 400 });
    }

    if (phoneRaw && !PHONE_RE.test(phoneRaw)) {
        return NextResponse.json({ ok: false, message: "Invalid phone format." }, { status: 400 });
    }

    const name = `${firstName} ${lastName}`.trim();
    const email = emailRaw || null;
    const phone = phoneRaw || null;

    await prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: user.id },
            data: {
                name,
                firstName,
                lastName,
                email,
                phone,
            },
        });

        await tx.userSettings.upsert({
            where: { userId: user.id },
            update: {
                preferredLanguage,
                timeZone,
            },
            create: {
                userId: user.id,
                preferredLanguage,
                timeZone,
            },
        });

        await tx.auditLog.create({
            data: {
                actorId: user.id,
                action: "PROFILE_UPDATED",
                entity: "User",
                entityId: user.id,
                meta: {
                    preferredLanguage,
                    timeZone,
                },
            },
        });
    });

    return NextResponse.json({
        ok: true,
        profile: {
            firstName,
            lastName,
            name,
            email,
            phone,
            preferredLanguage,
            timeZone,
        },
    });
});
