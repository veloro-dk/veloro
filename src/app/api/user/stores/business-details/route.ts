import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { isJsonRequest, isSameOriginRequest } from "@/server/requestSecurity";
import { userCanAccessStore } from "@/server/stores";
import { parseBusinessType } from "@/i18n/businessTypes";
import { handleApiRoute } from "@/server/apiRoute";
import { parseRequestJsonWithSchema, parseString } from "@/server/requestSchema";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-()\s]{5,32}$/;

function json(body: { ok: boolean; message?: string }, status = 200) {
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function normalize(input: unknown, max: number) {
    const value = typeof input === "string" ? input.trim() : "";
    if (!value) return null;
    return value.slice(0, max);
}

export const POST = handleApiRoute("api/user/stores/business-details.POST", async (req: Request) => {
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
            name: { parse: (value) => parseString(value) },
            country: { parse: (value) => parseString(value, { allowEmpty: true }) ?? "", required: false },
            businessType: { parse: (value) => parseString(value, { allowEmpty: true }) ?? "", required: false },
            legalFirstName: { parse: (value) => parseString(value, { allowEmpty: true }) ?? "", required: false },
            legalLastName: { parse: (value) => parseString(value, { allowEmpty: true }) ?? "", required: false },
            street: { parse: (value) => parseString(value, { allowEmpty: true }) ?? "", required: false },
            houseNumber: { parse: (value) => parseString(value, { allowEmpty: true }) ?? "", required: false },
            addressLine2: { parse: (value) => parseString(value, { allowEmpty: true }) ?? "", required: false },
            postalCode: { parse: (value) => parseString(value, { allowEmpty: true }) ?? "", required: false },
            city: { parse: (value) => parseString(value, { allowEmpty: true }) ?? "", required: false },
            email: { parse: (value) => parseString(value, { allowEmpty: true }) ?? "", required: false },
            phone: { parse: (value) => parseString(value, { allowEmpty: true }) ?? "", required: false },
        },
        {
            invalidPayloadMessage: "Invalid payload.",
            invalidFieldMessages: {
                name: "Business name is required.",
            },
        }
    );
    if (!payload.ok) return json({ ok: false, message: payload.message }, 400);

    const businessName = payload.data.name.trim().slice(0, 120);
    if (!businessName) {
        return json({ ok: false, message: "Business name is required." }, 400);
    }

    const businessTypeRaw = payload.data.businessType?.trim() ?? "";
    const businessType = businessTypeRaw ? parseBusinessType(businessTypeRaw) : null;
    if (businessTypeRaw && !businessType) {
        return json({ ok: false, message: "Invalid business type value." }, 400);
    }

    const businessEmail = normalize(payload.data.email, 190);
    if (businessEmail && !EMAIL_RE.test(businessEmail)) {
        return json({ ok: false, message: "Invalid business email format." }, 400);
    }

    const businessPhone = normalize(payload.data.phone, 32);
    if (businessPhone && !PHONE_RE.test(businessPhone)) {
        return json({ ok: false, message: "Invalid business phone format." }, 400);
    }

    const settings = await prisma.userSettings.findUnique({
        where: { userId: user.id },
        select: { activeStoreId: true },
    });

    const activeStoreId = settings?.activeStoreId?.trim() ?? "";
    if (!activeStoreId) {
        return json({ ok: false, message: "No active store selected." }, 400);
    }

    const canAccessStore = await userCanAccessStore(user.id, activeStoreId);
    if (!canAccessStore) {
        return json({ ok: false, message: "You do not have access to that store." }, 403);
    }

    const data = {
        name: businessName,
        businessCountry: normalize(payload.data.country, 120),
        businessType: businessType ?? null,
        legalFirstName: normalize(payload.data.legalFirstName, 80),
        legalLastName: normalize(payload.data.legalLastName, 80),
        businessStreet: normalize(payload.data.street, 180),
        businessHouseNumber: normalize(payload.data.houseNumber, 40),
        businessAddressLine2: normalize(payload.data.addressLine2, 120),
        businessPostalCode: normalize(payload.data.postalCode, 32),
        businessCity: normalize(payload.data.city, 120),
        businessEmail,
        businessPhone,
    };

    try {
        await prisma.store.update({
            where: { id: activeStoreId },
            data,
        });

        await prisma.auditLog.create({
            data: {
                actorId: user.id,
                action: "STORE_BUSINESS_DETAILS_UPDATE",
                entity: "Store",
                entityId: activeStoreId,
                meta: data,
            },
        });
    } catch (error: unknown) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return json({ ok: false, message: "Business name is already in use." }, 409);
        }

        console.error("[store.business-details.post]", error);
        return json({ ok: false, message: "Unable to update business details." }, 500);
    }

    return json({ ok: true });
});
