import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { isJsonRequest, isSameOriginRequest } from "@/server/requestSecurity";
import { handleApiRoute } from "@/server/apiRoute";
import { parseEnum, parseRequestJsonWithSchema, parseString } from "@/server/requestSchema";

type FeedbackKind = "ISSUE" | "IDEA";

const VALID_FEEDBACK_KINDS = new Set<FeedbackKind>(["ISSUE", "IDEA"]);

function json(body: { ok: boolean; message?: string; id?: string }, status = 200) {
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function normalizeKind(raw: unknown): FeedbackKind | null {
    if (typeof raw !== "string") return null;
    const normalized = raw.trim().toUpperCase();
    if (!VALID_FEEDBACK_KINDS.has(normalized as FeedbackKind)) return null;
    return normalized as FeedbackKind;
}

function extractErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    return "Unknown error";
}

export const POST = handleApiRoute("api/feedback.POST", async (req: Request) => {
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
            kind: {
                parse: (value) => parseEnum(value, ["ISSUE", "IDEA"] as const, { caseInsensitive: true }),
            },
            message: {
                parse: (value) => parseString(value, { trim: true, allowEmpty: true }),
            },
            pagePath: {
                parse: (value) => parseString(value, { trim: true, allowEmpty: true }),
                required: false,
            },
        },
        {
            invalidPayloadMessage: "Invalid payload.",
            invalidFieldMessages: {
                kind: "Invalid feedback type.",
                message: "Feedback must be between 8 and 2000 characters.",
                pagePath: "Invalid payload.",
            },
        }
    );
    if (!payload.ok) {
        return json({ ok: false, message: payload.message }, 400);
    }

    const kind = normalizeKind(payload.data.kind);
    const message = payload.data.message;
    const pagePathRaw = payload.data.pagePath ?? "";
    const pagePath = pagePathRaw.startsWith("/portal") ? pagePathRaw : "/portal";

    if (!kind) {
        return json({ ok: false, message: "Invalid feedback type." }, 400);
    }

    if (message.length < 8 || message.length > 2000) {
        return json({ ok: false, message: "Feedback must be between 8 and 2000 characters." }, 400);
    }

    try {
        const record = await prisma.auditLog.create({
            data: {
                actorId: user.id,
                action: "FEEDBACK_SUBMIT",
                entity: "FeedbackMessage",
                entityId: null,
                meta: {
                    kind,
                    pagePath,
                    message,
                },
            },
        });

        return json({ ok: true, id: record.id });
    } catch (error: unknown) {
        const rawMessage = extractErrorMessage(error);
        const normalized = rawMessage.toUpperCase();
        const dbUnavailable = normalized.includes("P1001") || normalized.includes("CAN'T REACH DATABASE SERVER");
        const status = dbUnavailable ? 503 : 500;
        const message = dbUnavailable
            ? "Database is temporarily unreachable. Please check your network and retry."
            : "Unable to store feedback right now.";

        if (process.env.NODE_ENV !== "production") {
            console.error("[feedback.submit]", rawMessage);
        }

        return json({ ok: false, message }, status);
    }
});
