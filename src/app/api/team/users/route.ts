import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionUser, hashPassword } from "@/server/auth";
import { handleApiRoute } from "@/server/apiRoute";
import { prisma } from "@/server/db";
import { isJsonRequest, isSameOriginRequest } from "@/server/requestSecurity";
import { ensureWriteRequestAllowed } from "@/server/writeRateLimit";
import { parseRequestJsonWithSchema, parseString } from "@/server/requestSchema";
import { sendAdminActionAlert } from "@/server/anomalyAlerts";

type TeamManageableRole = "MANAGER" | "EMPLOYEE";

type TeamStore = {
    id: string;
    name: string;
    slug: string;
};

const EMPLOYEE_ID_PREFIX = "EMP";
const EMPLOYEE_ID_MIN_DIGITS = 4;

function parseGeneratedEmployeeId(value: string) {
    const match = /^EMP(\d+)$/.exec(value.trim().toUpperCase());
    if (!match) return null;
    const parsed = Number.parseInt(match[1] ?? "", 10);
    return Number.isFinite(parsed) ? parsed : null;
}

async function generateNextEmployeeId(client: Prisma.TransactionClient | typeof prisma) {
    const rows = await client.user.findMany({
        select: { employeeId: true },
    });

    const used = new Set<string>();
    let maxSequence = 0;

    for (const row of rows) {
        const normalized = row.employeeId.trim().toUpperCase();
        if (!normalized) continue;
        used.add(normalized);
        const parsed = parseGeneratedEmployeeId(normalized);
        if (parsed && parsed > maxSequence) maxSequence = parsed;
    }

    let nextSequence = Math.max(1, maxSequence + 1);
    while (true) {
        const candidate = `${EMPLOYEE_ID_PREFIX}${String(nextSequence).padStart(EMPLOYEE_ID_MIN_DIGITS, "0")}`;
        if (!used.has(candidate)) return candidate;
        nextSequence += 1;
    }
}

function json(body: unknown, status = 200, headers?: HeadersInit) {
    return NextResponse.json(body, {
        status,
        headers: {
            "Cache-Control": "no-store",
            ...(headers || {}),
        },
    });
}

function canManageTeam(role: string) {
    return role === "ADMIN" || role === "MANAGER";
}

function canManageRole(actorRole: string, targetRole: string) {
    if (actorRole === "ADMIN") return targetRole === "MANAGER" || targetRole === "EMPLOYEE";
    if (actorRole === "MANAGER") return targetRole === "EMPLOYEE";
    return false;
}

async function getActorStoreIds(userId: string) {
    const rows = await prisma.userStoreAccess.findMany({
        where: {
            userId,
            store: { isActive: true },
        },
        select: { storeId: true },
    });

    return rows.map((row) => row.storeId);
}

async function getAssignableStores(userId: string, role: string) {
    if (role === "ADMIN") {
        return prisma.store.findMany({
            where: { isActive: true },
            orderBy: { name: "asc" },
            select: { id: true, name: true, slug: true },
        });
    }

    const storeIds = await getActorStoreIds(userId);
    if (storeIds.length === 0) return [];

    return prisma.store.findMany({
        where: {
            isActive: true,
            id: { in: storeIds },
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true },
    });
}

async function getVisibleUsers(userId: string, role: string) {
    if (role === "ADMIN") {
        return prisma.user.findMany({
            where: {
                role: { in: ["MANAGER", "EMPLOYEE"] },
            },
            orderBy: [
                { role: "asc" },
                { employeeId: "asc" },
            ],
            select: {
                id: true,
                employeeId: true,
                firstName: true,
                lastName: true,
                name: true,
                role: true,
                status: true,
                settings: {
                    select: { activeStoreId: true },
                },
                storeAccess: {
                    where: { store: { isActive: true } },
                    orderBy: { store: { name: "asc" } },
                    select: {
                        store: {
                            select: { id: true, name: true, slug: true },
                        },
                    },
                },
            },
        });
    }

    const actorStoreIds = await getActorStoreIds(userId);
    if (actorStoreIds.length === 0) return [];

    return prisma.user.findMany({
        where: {
            role: "EMPLOYEE",
            storeAccess: {
                some: {
                    storeId: { in: actorStoreIds },
                    store: { isActive: true },
                },
            },
        },
        orderBy: [{ employeeId: "asc" }],
        select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            name: true,
            role: true,
            status: true,
            settings: {
                select: { activeStoreId: true },
            },
            storeAccess: {
                where: { store: { isActive: true } },
                orderBy: { store: { name: "asc" } },
                select: {
                    store: {
                        select: { id: true, name: true, slug: true },
                    },
                },
            },
        },
    });
}

function mapUsers(
    rows: Array<{
        id: string;
        employeeId: string;
        firstName: string;
        lastName: string;
        name: string;
        role: "ADMIN" | "MANAGER" | "EMPLOYEE";
        status: "ACTIVE" | "DISABLED";
        settings: { activeStoreId: string | null } | null;
        storeAccess: Array<{ store: TeamStore }>;
    }>
) {
    return rows.map((row) => ({
        id: row.id,
        employeeId: row.employeeId,
        firstName: row.firstName,
        lastName: row.lastName,
        name: row.name,
        role: row.role,
        status: row.status,
        activeStoreId: row.settings?.activeStoreId ?? null,
        stores: row.storeAccess.map((entry) => entry.store),
    }));
}

export const GET = handleApiRoute("api/team/users.GET", async () => {
    try {
        const actor = await getSessionUser({ allowCookieMutation: true });
        if (!actor) return json({ ok: false, message: "Unauthorized." }, 401);
        if (!canManageTeam(actor.role)) return json({ ok: false, message: "Insufficient permissions." }, 403);

        let stores: Awaited<ReturnType<typeof getAssignableStores>> = [];
        let users: Awaited<ReturnType<typeof getVisibleUsers>> = [];
        let nextEmployeeId = `${EMPLOYEE_ID_PREFIX}${"1".padStart(EMPLOYEE_ID_MIN_DIGITS, "0")}`;

        try {
            stores = await getAssignableStores(actor.id, actor.role);
        } catch (error: unknown) {
            console.error("[team.users.get.stores]", error);
        }

        try {
            users = await getVisibleUsers(actor.id, actor.role);
        } catch (error: unknown) {
            console.error("[team.users.get.users]", error);
        }

        try {
            nextEmployeeId = await generateNextEmployeeId(prisma);
        } catch (error: unknown) {
            console.error("[team.users.get.nextEmployeeId]", error);
        }

        return json({
            ok: true,
            stores,
            users: mapUsers(users),
            canManageManagers: actor.role === "ADMIN",
            nextEmployeeId,
        });
    } catch (error: unknown) {
        console.error("[team.users.get]", error);
        return json({ ok: false, message: "Unable to load team users." }, 500);
    }
});

export const POST = handleApiRoute("api/team/users.POST", async (req: Request) => {
    if (!isSameOriginRequest(req)) return json({ ok: false, message: "Invalid request origin." }, 403);
    if (!isJsonRequest(req)) return json({ ok: false, message: "Unsupported content type." }, 415);

    const actor = await getSessionUser({ allowCookieMutation: true });
    if (!actor) return json({ ok: false, message: "Unauthorized." }, 401);
    if (!canManageTeam(actor.role)) return json({ ok: false, message: "Insufficient permissions." }, 403);
    const writeLimit = ensureWriteRequestAllowed({
        scope: "teamUsers",
        req,
        actorId: actor.id,
    });
    if (!writeLimit.allowed) {
        return json(
            {
                ok: false,
                message: `Too many team user write requests. Please wait ${writeLimit.retryAfterSeconds} seconds and try again.`,
            },
            429,
            { "Retry-After": String(writeLimit.retryAfterSeconds) }
        );
    }

    const payload = await parseRequestJsonWithSchema(
        req,
        {
            firstName: { parse: (value) => parseString(value) },
            lastName: { parse: (value) => parseString(value) },
            password: { parse: (value) => parseString(value, { trim: false, allowEmpty: true }) },
            storeId: { parse: (value) => parseString(value) },
            role: { parse: (value) => parseString(value, { upperCase: true, allowEmpty: true }), required: false },
        },
        {
            invalidPayloadMessage: "Invalid payload.",
            invalidFieldMessages: {
                firstName: "First name and last name are required.",
                lastName: "First name and last name are required.",
                password: "Password must be at least 8 characters.",
                storeId: "Please select a store.",
                role: "Invalid payload.",
            },
        }
    );
    if (!payload.ok) {
        return json({ ok: false, message: payload.message }, 400);
    }

    const firstName = payload.data.firstName;
    const lastName = payload.data.lastName;
    const password = payload.data.password;
    const storeId = payload.data.storeId;
    const requestedRole = payload.data.role ?? "EMPLOYEE";
    const role = (requestedRole === "MANAGER" ? "MANAGER" : "EMPLOYEE") as TeamManageableRole;

    if (!firstName || !lastName) {
        return json({ ok: false, message: "First name and last name are required." }, 400);
    }

    if (password.length < 8) {
        return json({ ok: false, message: "Password must be at least 8 characters." }, 400);
    }

    if (!canManageRole(actor.role, role)) {
        return json({ ok: false, message: "You cannot create users with that role." }, 403);
    }

    if (!storeId) {
        return json({ ok: false, message: "Please select a store." }, 400);
    }

    const assignableStores = await getAssignableStores(actor.id, actor.role);
    const allowedStore = assignableStores.find((store) => store.id === storeId);
    if (!allowedStore) {
        return json({ ok: false, message: "Invalid store selection." }, 400);
    }

    const passwordHash = await hashPassword(password);
    const name = `${firstName} ${lastName}`.trim();
    const MAX_EMPLOYEE_ID_CREATE_ATTEMPTS = 5;

    try {
        let created: { id: string; employeeId: string } | null = null;

        for (let attempt = 0; attempt < MAX_EMPLOYEE_ID_CREATE_ATTEMPTS; attempt += 1) {
            try {
                created = await prisma.$transaction(async (tx) => {
                    const employeeId = await generateNextEmployeeId(tx);
                    const user = await tx.user.create({
                        data: {
                            employeeId,
                            firstName,
                            lastName,
                            name,
                            passwordHash,
                            requiresPasswordReset: true,
                            role,
                            status: "ACTIVE",
                        },
                        select: { id: true },
                    });

                    await tx.userStoreAccess.create({
                        data: {
                            userId: user.id,
                            storeId,
                        },
                    });

                    await tx.userSettings.create({
                        data: {
                            userId: user.id,
                            activeStoreId: storeId,
                        },
                    });

                    return {
                        id: user.id,
                        employeeId,
                    };
                });
                break;
            } catch (error: unknown) {
                if (
                    error instanceof Prisma.PrismaClientKnownRequestError &&
                    error.code === "P2002" &&
                    attempt < MAX_EMPLOYEE_ID_CREATE_ATTEMPTS - 1
                ) {
                    continue;
                }
                throw error;
            }
        }

        if (!created) {
            return json({ ok: false, message: "Unable to create user." }, 500);
        }

        await prisma.auditLog.create({
            data: {
                actorId: actor.id,
                action: "TEAM_USER_CREATE",
                entity: "User",
                entityId: created.id,
                meta: {
                    employeeId: created.employeeId,
                    role,
                    storeId,
                },
            },
        });

        if (actor.role === "ADMIN") {
            void sendAdminActionAlert({
                routeId: "api/team/users.POST",
                action: "TEAM_USER_CREATE",
                actorId: actor.id,
                entity: "User",
                entityId: created.id,
                details: {
                    employeeId: created.employeeId,
                    role,
                    storeId,
                },
            });
        }

        return json({ ok: true, id: created.id, employeeId: created.employeeId });
    } catch (error: unknown) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return json({ ok: false, message: "Unable to reserve a unique employee ID. Please try again." }, 409);
        }

        return json({ ok: false, message: "Unable to create user." }, 500);
    }
});

export const DELETE = handleApiRoute("api/team/users.DELETE", async (req: Request) => {
    if (!isSameOriginRequest(req)) return json({ ok: false, message: "Invalid request origin." }, 403);
    if (!isJsonRequest(req)) return json({ ok: false, message: "Unsupported content type." }, 415);

    const actor = await getSessionUser({ allowCookieMutation: true });
    if (!actor) return json({ ok: false, message: "Unauthorized." }, 401);
    if (!canManageTeam(actor.role)) return json({ ok: false, message: "Insufficient permissions." }, 403);
    const writeLimit = ensureWriteRequestAllowed({
        scope: "teamUsers",
        req,
        actorId: actor.id,
    });
    if (!writeLimit.allowed) {
        return json(
            {
                ok: false,
                message: `Too many team user write requests. Please wait ${writeLimit.retryAfterSeconds} seconds and try again.`,
            },
            429,
            { "Retry-After": String(writeLimit.retryAfterSeconds) }
        );
    }

    const payload = await parseRequestJsonWithSchema(
        req,
        {
            userId: { parse: (value) => parseString(value) },
        },
        {
            invalidPayloadMessage: "Missing user id.",
            invalidFieldMessages: {
                userId: "Missing user id.",
            },
        }
    );
    if (!payload.ok) return json({ ok: false, message: payload.message }, 400);
    const userId = payload.data.userId;
    if (userId === actor.id) return json({ ok: false, message: "You cannot delete your own account." }, 400);

    const target = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            role: true,
            employeeId: true,
            storeAccess: {
                where: { store: { isActive: true } },
                select: { storeId: true },
            },
        },
    });

    if (!target) return json({ ok: false, message: "User not found." }, 404);
    if (!canManageRole(actor.role, target.role)) {
        return json({ ok: false, message: "You cannot delete that user." }, 403);
    }

    if (actor.role === "MANAGER") {
        const actorStoreIds = new Set(await getActorStoreIds(actor.id));
        const sharedStore = target.storeAccess.some((row) => actorStoreIds.has(row.storeId));
        if (!sharedStore) {
            return json({ ok: false, message: "You can only delete employees in your stores." }, 403);
        }
    }

    try {
        await prisma.user.delete({ where: { id: target.id } });
    } catch (error: unknown) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
            return json({ ok: false, message: "User cannot be deleted because related records exist." }, 409);
        }
        return json({ ok: false, message: "Unable to delete user." }, 500);
    }

    await prisma.auditLog.create({
        data: {
            actorId: actor.id,
            action: "TEAM_USER_DELETE",
            entity: "User",
            entityId: target.id,
            meta: {
                employeeId: target.employeeId,
                role: target.role,
            },
        },
    });

    if (actor.role === "ADMIN") {
        void sendAdminActionAlert({
            routeId: "api/team/users.DELETE",
            action: "TEAM_USER_DELETE",
            actorId: actor.id,
            entity: "User",
            entityId: target.id,
            details: {
                employeeId: target.employeeId,
                role: target.role,
            },
        });
    }

    return json({ ok: true, id: target.id });
});
