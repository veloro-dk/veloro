import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { handleApiRoute } from "@/server/apiRoute";
import { parseAdminLoginLogsQuery } from "@/server/adminListQuery";

function json(body: unknown, status = 200) {
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

async function requireAdmin() {
    const user = await getSessionUser({ allowCookieMutation: true });
    if (!user) return { error: json({ ok: false, message: "Unauthorized." }, 401), user: null };
    if (user.role !== "ADMIN") return { error: json({ ok: false, message: "Admin access required." }, 403), user: null };
    return { error: null, user };
}

export const GET = handleApiRoute("api/admin/login-logs.GET", async (req: Request) => {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const parsed = parseAdminLoginLogsQuery(new URL(req.url).searchParams);
    if (!parsed.ok) {
        return json({ ok: false, message: parsed.message }, 400);
    }

    const actorFilter: { role?: "ADMIN" | "MANAGER" | "EMPLOYEE"; employeeId?: string } = {};
    if (parsed.data.role !== "ALL") {
        actorFilter.role = parsed.data.role;
    }
    if (parsed.data.employeeId) {
        actorFilter.employeeId = parsed.data.employeeId;
    }

    const rows = await prisma.auditLog.findMany({
        where: {
            action: "AUTH_LOGIN",
            entity: "User",
            ...(Object.keys(actorFilter).length > 0 ? { actor: actorFilter } : {}),
        },
        orderBy: { createdAt: "desc" },
        skip: parsed.data.offset,
        take: parsed.data.limit + 1,
        select: {
            id: true,
            createdAt: true,
            meta: true,
            actor: {
                select: {
                    employeeId: true,
                    name: true,
                    role: true,
                },
            },
        },
    });

    const hasMore = rows.length > parsed.data.limit;
    const pageRows = hasMore ? rows.slice(0, parsed.data.limit) : rows;
    const items = pageRows.map((row) => {
        const meta = row.meta && typeof row.meta === "object" && !Array.isArray(row.meta) ? row.meta : {};
        const employeeIdFromMeta = typeof (meta as { employeeId?: unknown }).employeeId === "string"
            ? (meta as { employeeId: string }).employeeId
            : "";

        return {
            id: row.id,
            createdAt: row.createdAt,
            user: {
                employeeId: row.actor.employeeId || employeeIdFromMeta || "unknown",
                name: row.actor.name,
                role: row.actor.role,
            },
        };
    });

    return json({
        ok: true,
        items,
        hasMore,
        nextOffset: parsed.data.offset + items.length,
    });
});
