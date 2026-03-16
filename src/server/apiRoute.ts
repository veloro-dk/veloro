import "server-only";
import crypto from "crypto";
import { NextResponse } from "next/server";

type ApiRouteHandler<Args extends unknown[]> = (...args: Args) => Promise<Response> | Response;

type ApiErrorShape = {
    ok: false;
    message: string;
    error: {
        code: string;
        message: string;
    };
    requestId: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function inferErrorCode(status: number) {
    if (status === 400) return "BAD_REQUEST";
    if (status === 401) return "UNAUTHORIZED";
    if (status === 403) return "FORBIDDEN";
    if (status === 404) return "NOT_FOUND";
    if (status === 409) return "CONFLICT";
    if (status === 415) return "UNSUPPORTED_MEDIA_TYPE";
    if (status === 429) return "RATE_LIMITED";
    if (status >= 500) return "INTERNAL_SERVER_ERROR";
    return "API_ERROR";
}

function inferFallbackMessage(status: number) {
    if (status >= 500) return "Unexpected server error.";
    return "Request could not be processed.";
}

function buildErrorShape({
    status,
    requestId,
    message,
    code,
}: {
    status: number;
    requestId: string;
    message?: string;
    code?: string;
}): ApiErrorShape {
    const normalizedMessage = (message || "").trim() || inferFallbackMessage(status);
    return {
        ok: false,
        message: normalizedMessage,
        error: {
            code: code || inferErrorCode(status),
            message: normalizedMessage,
        },
        requestId,
    };
}

async function normalizeJsonErrorResponse(response: Response) {
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) return response;

    let payload: unknown;
    try {
        payload = await response.clone().json();
    } catch {
        return response;
    }

    if (!isRecord(payload) || payload.ok !== false) {
        return response;
    }

    const status = response.status;
    const requestIdCandidate = typeof payload.requestId === "string"
        ? payload.requestId
        : response.headers.get("x-veloro-request-id");
    const requestId = requestIdCandidate && requestIdCandidate.trim()
        ? requestIdCandidate
        : crypto.randomUUID();

    const existingError = isRecord(payload.error) ? payload.error : null;
    const message = typeof payload.message === "string"
        ? payload.message
        : (existingError && typeof existingError.message === "string" ? existingError.message : undefined);
    const code = existingError && typeof existingError.code === "string" ? existingError.code : undefined;

    const normalized = {
        ...payload,
        ...buildErrorShape({ status, requestId, message, code }),
    };

    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store");
    headers.set("x-veloro-request-id", requestId);

    return NextResponse.json(normalized, { status, headers });
}

export function handleApiRoute<Args extends unknown[]>(
    routeId: string,
    handler: ApiRouteHandler<Args>
) {
    return async (...args: Args): Promise<Response> => {
        try {
            const response = await handler(...args);
            return normalizeJsonErrorResponse(response);
        } catch (error: unknown) {
            const requestId = crypto.randomUUID();
            console.error(`[api:${routeId}]`, {
                requestId,
                error: error instanceof Error
                    ? { name: error.name, message: error.message, stack: error.stack }
                    : error,
            });

            return NextResponse.json(
                buildErrorShape({
                    status: 500,
                    requestId,
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Unexpected server error.",
                }),
                {
                    status: 500,
                    headers: {
                        "Cache-Control": "no-store",
                        "x-veloro-request-id": requestId,
                    },
                }
            );
        }
    };
}
