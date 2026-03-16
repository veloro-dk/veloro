import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth";
import { handleApiRoute } from "@/server/apiRoute";
import { prisma } from "@/server/db";
import { isJsonRequest, isSameOriginRequest } from "@/server/requestSecurity";
import { parseRequestJsonWithSchema, parseString } from "@/server/requestSchema";
import { parseAdminFeedbackQuery } from "@/server/adminListQuery";
import { sendAdminActionAlert } from "@/server/anomalyAlerts";

function json(body: unknown, status = 200) {
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

async function requireAdmin() {
    const user = await getSessionUser({ allowCookieMutation: true });
    if (!user) {
        return { error: json({ ok: false, message: "Unauthorized." }, 401), user: null };
    }

    if (user.role !== "ADMIN") {
        return { error: json({ ok: false, message: "Admin access required." }, 403), user: null };
    }

    return { error: null, user };
}

export const GET = handleApiRoute("api/admin/feedback.GET", async (req: Request) => {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const parsed = parseAdminFeedbackQuery(new URL(req.url).searchParams);
    if (!parsed.ok) {
        return json({ ok: false, message: parsed.message }, 400);
    }

    const rows = await prisma.auditLog.findMany({
        where: {
            action: "FEEDBACK_SUBMIT",
            entity: "FeedbackMessage",
            ...(parsed.data.kind !== "ALL"
                ? {
                    meta: {
                        path: ["kind"],
                        equals: parsed.data.kind,
                    },
                }
                : {}),
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
                },
            },
        },
    });

    const hasMore = rows.length > parsed.data.limit;
    const pageRows = hasMore ? rows.slice(0, parsed.data.limit) : rows;
    const items = pageRows.map((row) => {
        const meta = row.meta && typeof row.meta === "object" && !Array.isArray(row.meta) ? row.meta : {};
        const rawKind = typeof (meta as { kind?: unknown }).kind === "string"
            ? ((meta as { kind: string }).kind.toUpperCase() === "ISSUE" ? "ISSUE" : "IDEA")
            : "IDEA";
        const pagePath = typeof (meta as { pagePath?: unknown }).pagePath === "string"
            ? (meta as { pagePath: string }).pagePath
            : "/portal";
        const message = typeof (meta as { message?: unknown }).message === "string"
            ? (meta as { message: string }).message
            : "";

        return {
            id: row.id,
            kind: rawKind,
            pagePath,
            message,
            createdAt: row.createdAt,
            createdBy: row.actor,
        };
    });

    return json({
        ok: true,
        items,
        hasMore,
        nextOffset: parsed.data.offset + items.length,
    });
});

export const DELETE = handleApiRoute("api/admin/feedback.DELETE", async (req: Request) => {
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
            id: { parse: (value) => parseString(value) },
        },
        {
            invalidPayloadMessage: "Missing feedback id.",
            invalidFieldMessages: {
                id: "Missing feedback id.",
            },
        }
    );
    if (!payload.ok) return json({ ok: false, message: payload.message }, 400);
    const id = payload.data.id;

    const existing = await prisma.auditLog.findFirst({
        where: { id },
        select: { id: true, action: true, entity: true },
    });

    if (!existing || existing.action !== "FEEDBACK_SUBMIT" || existing.entity !== "FeedbackMessage") {
        return json({ ok: false, message: "Feedback message not found." }, 404);
    }

    await prisma.auditLog.delete({ where: { id } });

    await prisma.auditLog.create({
        data: {
            actorId: auth.user!.id,
            action: "FEEDBACK_DELETE",
            entity: "FeedbackMessage",
            entityId: id,
        },
    });

    void sendAdminActionAlert({
        routeId: "api/admin/feedback.DELETE",
        action: "FEEDBACK_DELETE",
        actorId: auth.user!.id,
        entity: "FeedbackMessage",
        entityId: id,
    });

    return json({ ok: true, id });
});
