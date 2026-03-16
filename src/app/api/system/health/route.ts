import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth";
import { runSystemHealthCheck } from "@/server/systemHealth";
import { handleApiRoute } from "@/server/apiRoute";

export const GET = handleApiRoute("api/system/health.GET", async (req: Request) => {
    const user = await getSessionUser({ allowCookieMutation: true });
    if (!user) {
        return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const origin = new URL(req.url).origin;
    const report = await runSystemHealthCheck({
        origin,
        cookieHeader: req.headers.get("cookie"),
    });

    return NextResponse.json(
        report,
        {
            headers: {
                "Cache-Control": "no-store",
            },
        }
    );
});
