import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth";
import { handleApiRoute } from "@/server/apiRoute";
import { prisma } from "@/server/db";
import { isJsonRequest, isSameOriginRequest } from "@/server/requestSecurity";
import { parseRequestJsonWithSchema, parseString } from "@/server/requestSchema";
import { sendAdminActionAlert } from "@/server/anomalyAlerts";

type AdminStoreUser = {
    id: string;
    employeeId: string;
    name: string | null;
    role: "ADMIN" | "MANAGER" | "EMPLOYEE";
    status: "ACTIVE" | "DISABLED";
    activeStoreId: string | null;
    storeIds: string[];
};

function json(body: unknown, status = 200) {
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

async function requireAdmin() {
    const user = await getSessionUser({ allowCookieMutation: true });
    if (!user) return { error: json({ ok: false, message: "Unauthorized." }, 401), user: null };
    if (user.role !== "ADMIN") return { error: json({ ok: false, message: "Admin access required." }, 403), user: null };
    return { error: null, user };
}

async function fetchUsers() {
    const users = await prisma.user.findMany({
        orderBy: [
            { role: "asc" },
            { employeeId: "asc" },
        ],
        select: {
            id: true,
            employeeId: true,
            name: true,
            role: true,
            status: true,
            settings: {
                select: {
                    activeStoreId: true,
                },
            },
            storeAccess: {
                orderBy: {
                    store: { name: "asc" },
                },
                select: {
                    storeId: true,
                },
            },
        },
    });

    return users.map<AdminStoreUser>((entry) => ({
        id: entry.id,
        employeeId: entry.employeeId,
        name: entry.name,
        role: entry.role,
        status: entry.status,
        activeStoreId: entry.settings?.activeStoreId ?? null,
        storeIds: entry.storeAccess.map((access) => access.storeId),
    }));
}

export const GET = handleApiRoute("api/admin/stores/access.GET", async () => {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const [stores, users] = await Promise.all([
        prisma.store.findMany({
            where: { isActive: true },
            orderBy: { name: "asc" },
            select: {
                id: true,
                name: true,
                slug: true,
            },
        }),
        fetchUsers(),
    ]);

    return json({ ok: true, stores, users });
});

export const POST = handleApiRoute("api/admin/stores/access.POST", async (req: Request) => {
    if (!isSameOriginRequest(req)) {
        return json({ ok: false, message: "Invalid request origin." }, 403);
    }

    if (!isJsonRequest(req)) {
        return json({ ok: false, message: "Unsupported content type." }, 415);
    }

    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const payload = await parseRequestJsonWithSchema(
        req,
        {
            userId: { parse: (value) => parseString(value) },
            storeIds: {
                parse: (value) => {
                    if (!Array.isArray(value)) return [];
                    return value
                        .filter((entry): entry is string => typeof entry === "string")
                        .map((entry) => entry.trim())
                        .filter((entry) => entry.length > 0);
                },
                required: false,
            },
            activeStoreId: {
                parse: (value) => parseString(value, { allowEmpty: true }),
                required: false,
            },
        },
        {
            invalidPayloadMessage: "Invalid payload.",
            invalidFieldMessages: {
                userId: "Missing user id.",
                storeIds: "Invalid payload.",
                activeStoreId: "Invalid payload.",
            },
        }
    );
    if (!payload.ok) return json({ ok: false, message: payload.message }, 400);

    const userId = payload.data.userId;
    const incomingStoreIds = payload.data.storeIds ?? [];
    const activeStoreIdInput = (payload.data.activeStoreId ?? "").trim() || null;

    const uniqueStoreIds: string[] = Array.from(new Set(incomingStoreIds));
    if (uniqueStoreIds.length === 0) {
        return json({ ok: false, message: "A user must have access to at least one store." }, 400);
    }

    const [targetUser, stores] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
        prisma.store.findMany({
            where: {
                id: { in: uniqueStoreIds },
                isActive: true,
            },
            select: { id: true },
        }),
    ]);

    if (!targetUser) {
        return json({ ok: false, message: "User not found." }, 404);
    }

    if (stores.length !== uniqueStoreIds.length) {
        return json({ ok: false, message: "One or more stores are invalid." }, 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
        const existing = await tx.userStoreAccess.findMany({
            where: { userId },
            select: { storeId: true },
        });

        const existingIds = new Set(existing.map((row) => row.storeId));
        const incomingIds = new Set(uniqueStoreIds);

        const toCreate = uniqueStoreIds.filter((id) => !existingIds.has(id));
        const toDelete = existing.map((row) => row.storeId).filter((id) => !incomingIds.has(id));

        if (toDelete.length > 0) {
            await tx.userStoreAccess.deleteMany({
                where: {
                    userId,
                    storeId: { in: toDelete },
                },
            });
        }

        if (toCreate.length > 0) {
            await tx.userStoreAccess.createMany({
                data: toCreate.map((storeId) => ({ userId, storeId })),
                skipDuplicates: true,
            });
        }

        const currentSettings = await tx.userSettings.findUnique({
            where: { userId },
            select: { activeStoreId: true },
        });

        const nextActiveStoreId = activeStoreIdInput && incomingIds.has(activeStoreIdInput)
            ? activeStoreIdInput
            : (currentSettings?.activeStoreId && incomingIds.has(currentSettings.activeStoreId)
                ? currentSettings.activeStoreId
                : uniqueStoreIds[0]);

        await tx.userSettings.upsert({
            where: { userId },
            update: { activeStoreId: nextActiveStoreId },
            create: {
                userId,
                activeStoreId: nextActiveStoreId,
            },
        });

        return {
            activeStoreId: nextActiveStoreId,
            storeIds: uniqueStoreIds,
        };
    });

    await prisma.auditLog.create({
        data: {
            actorId: auth.user!.id,
            action: "ADMIN_STORE_ACCESS_UPDATE",
            entity: "User",
            entityId: userId,
            meta: {
                storeIds: updated.storeIds,
                activeStoreId: updated.activeStoreId,
            },
        },
    });

    void sendAdminActionAlert({
        routeId: "api/admin/stores/access.POST",
        action: "ADMIN_STORE_ACCESS_UPDATE",
        actorId: auth.user!.id,
        entity: "User",
        entityId: userId,
        details: {
            storeIds: updated.storeIds,
            activeStoreId: updated.activeStoreId,
        },
    });

    const users = await fetchUsers();

    return json({ ok: true, users });
});
