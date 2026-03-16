import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth";
import { handleApiRoute } from "@/server/apiRoute";
import { prisma } from "@/server/db";
import { isJsonRequest, isSameOriginRequest } from "@/server/requestSecurity";
import { ensureWriteRequestAllowed } from "@/server/writeRateLimit";
import { parseRequestJsonWithSchema, parseString } from "@/server/requestSchema";
import { sendAdminActionAlert } from "@/server/anomalyAlerts";

function json(body: unknown, status = 200, headers?: HeadersInit) {
    return NextResponse.json(body, {
        status,
        headers: {
            "Cache-Control": "no-store",
            ...(headers || {}),
        },
    });
}

function isManagerOrAdmin(role: string) {
    return role === "ADMIN" || role === "MANAGER";
}

const DEFAULT_PRODUCT_CODE_PREFIX = "VLR";

function normalizeSlug(value: string) {
    return value
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 150);
}

const STORE_SELECT = {
    id: true,
    name: true,
    slug: true,
    isActive: true,
    defaultCurrency: true,
    backupRegionCountry: true,
    unitSystem: true,
    timeZone: true,
    productCodePrefix: true,
    productCodeSuffix: true,
    businessCountry: true,
    businessType: true,
    legalFirstName: true,
    legalLastName: true,
    businessStreet: true,
    businessHouseNumber: true,
    businessAddressLine2: true,
    businessPostalCode: true,
    businessCity: true,
    businessEmail: true,
    businessPhone: true,
    createdAt: true,
    updatedAt: true,
} satisfies Prisma.StoreSelect;

async function getVisibleStores(actorId: string, actorRole: "ADMIN" | "MANAGER" | "EMPLOYEE") {
    if (actorRole === "ADMIN") {
        return prisma.store.findMany({
            orderBy: { name: "asc" },
            select: STORE_SELECT,
        });
    }

    return prisma.store.findMany({
        where: {
            userAccess: {
                some: { userId: actorId },
            },
        },
        orderBy: { name: "asc" },
        select: STORE_SELECT,
    });
}

async function getAvailableSlug(baseSlug: string) {
    let suffix = 0;
    while (suffix < 300) {
        const candidate = suffix === 0 ? baseSlug : `${baseSlug}-${suffix + 1}`;
        const existing = await prisma.store.findUnique({
            where: { slug: candidate },
            select: { id: true },
        });
        if (!existing) return candidate;
        suffix += 1;
    }

    return `${baseSlug}-${Date.now().toString().slice(-6)}`;
}

export const GET = handleApiRoute("api/stores/manage.GET", async () => {
    try {
        const actor = await getSessionUser({ allowCookieMutation: true });
        if (!actor) return json({ ok: false, message: "Unauthorized." }, 401);
        if (!isManagerOrAdmin(actor.role)) {
            return json({ ok: false, message: "Insufficient permissions." }, 403);
        }

        const stores = await getVisibleStores(actor.id, actor.role);
        return json({
            ok: true,
            canCreate: actor.role === "ADMIN",
            stores,
        });
    } catch (error: unknown) {
        console.error("[stores.manage.get]", error);
        return json({ ok: false, message: "Unable to load stores." }, 500);
    }
});

export const POST = handleApiRoute("api/stores/manage.POST", async (req: Request) => {
    if (!isSameOriginRequest(req)) return json({ ok: false, message: "Invalid request origin." }, 403);
    if (!isJsonRequest(req)) return json({ ok: false, message: "Unsupported content type." }, 415);

    const actor = await getSessionUser({ allowCookieMutation: true });
    if (!actor) return json({ ok: false, message: "Unauthorized." }, 401);
    if (actor.role !== "ADMIN") return json({ ok: false, message: "Admin access required." }, 403);
    const writeLimit = ensureWriteRequestAllowed({
        scope: "storesManage",
        req,
        actorId: actor.id,
    });
    if (!writeLimit.allowed) {
        return json(
            {
                ok: false,
                message: `Too many store management write requests. Please wait ${writeLimit.retryAfterSeconds} seconds and try again.`,
            },
            429,
            { "Retry-After": String(writeLimit.retryAfterSeconds) }
        );
    }

    const payload = await parseRequestJsonWithSchema(
        req,
        {
            name: {
                parse: (value) => parseString(value),
            },
        },
        {
            invalidPayloadMessage: "Store name is required.",
            invalidFieldMessages: {
                name: "Store name is required.",
            },
        }
    );
    if (!payload.ok) return json({ ok: false, message: payload.message }, 400);
    const name = payload.data.name;

    const existingName = await prisma.store.findUnique({
        where: { name },
        select: { id: true },
    });
    if (existingName) {
        return json({ ok: false, message: "A store with this name already exists." }, 409);
    }

    const baseSlug = normalizeSlug(name);
    if (!baseSlug) return json({ ok: false, message: "Unable to generate a valid store slug from this name." }, 400);

    try {
        let slug = await getAvailableSlug(baseSlug);
        const store = await prisma.store.create({
            data: {
                name,
                slug,
                productCodePrefix: DEFAULT_PRODUCT_CODE_PREFIX,
                productCodeSuffix: null,
            },
            select: STORE_SELECT,
        }).catch(async (error: unknown) => {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError
                && error.code === "P2002"
                && Array.isArray(error.meta?.target)
                && error.meta.target.includes("slug")
            ) {
                slug = await getAvailableSlug(baseSlug);
                return prisma.store.create({
                    data: {
                        name,
                        slug,
                        productCodePrefix: DEFAULT_PRODUCT_CODE_PREFIX,
                        productCodeSuffix: null,
                    },
                    select: STORE_SELECT,
                });
            }
            throw error;
        });

        await prisma.userStoreAccess.createMany({
            data: [{ userId: actor.id, storeId: store.id }],
            skipDuplicates: true,
        });

        await prisma.auditLog.create({
            data: {
                actorId: actor.id,
                action: "STORE_CREATE",
                entity: "Store",
                entityId: store.id,
                meta: {
                    name: store.name,
                    slug: store.slug,
                },
            },
        });

        void sendAdminActionAlert({
            routeId: "api/stores/manage.POST",
            action: "STORE_CREATE",
            actorId: actor.id,
            entity: "Store",
            entityId: store.id,
            details: {
                name: store.name,
                slug: store.slug,
            },
        });

        return json({ ok: true, store });
    } catch (error: unknown) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return json({ ok: false, message: "Unable to create store due to a unique constraint conflict." }, 409);
        }

        console.error("[stores.manage.post]", error);
        return json({ ok: false, message: "Unable to create store." }, 500);
    }
});
