import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { handleApiRoute } from "@/server/apiRoute";

function json(body: unknown, status = 200) {
    return NextResponse.json(body, {
        status,
        headers: {
            "Cache-Control": "no-store",
        },
    });
}

export const GET = handleApiRoute("api/system/ping.GET", async () => {
    const startedAt = Date.now();

    try {
        await prisma.$queryRaw`SELECT 1`;

        return json({
            ok: true,
            service: "veloro-api",
            checkedAt: new Date().toISOString(),
            durationMs: Date.now() - startedAt,
        });
    } catch {
        return json(
            {
                ok: false,
                service: "veloro-api",
                checkedAt: new Date().toISOString(),
                durationMs: Date.now() - startedAt,
            },
            503
        );
    }
});
