import { NextResponse } from "next/server";
import { SEARCH_PAGE_DEFINITIONS } from "@/components/shell/viewConfig";
import { parseLanguage } from "@/i18n/portal";
import { isSearchPageEnabled } from "@/lib/portalFeatureFlags";
import { handleApiRoute } from "@/server/apiRoute";
import { getSessionUser } from "@/server/auth";
import { getRuntimeEnv } from "@/server/env";
import { extractSearchContentFromHtmlServer } from "@/server/searchIndex";

type SearchIndexResponse = {
    ok: true;
    language: string;
    createdAt: number;
    contentById: Record<string, string>;
};

function json(body: SearchIndexResponse | { ok: false; message: string }, status = 200) {
    return NextResponse.json(body, {
        status,
        headers: {
            "Cache-Control": "no-store",
        },
    });
}

async function buildSearchIndex(req: Request, language: string) {
    const requestUrl = new URL(req.url);
    const cookieHeader = req.headers.get("cookie");
    const featureFlags = getRuntimeEnv().featureFlags;
    const contentById: Record<string, string> = {};

    for (const page of SEARCH_PAGE_DEFINITIONS) {
        if (!isSearchPageEnabled(page.id, featureFlags)) continue;

        try {
            const targetUrl = new URL(page.href, requestUrl.origin);
            const response = await fetch(targetUrl, {
                method: "GET",
                cache: "no-store",
                headers: {
                    ...(cookieHeader ? { cookie: cookieHeader } : {}),
                    "accept-language": language,
                },
            });

            if (!response.ok) continue;

            const html = await response.text();
            const extracted = extractSearchContentFromHtmlServer(html);
            if (!extracted) continue;

            contentById[`page:${page.id}`] = extracted;
        } catch {
            // Skip pages that fail to hydrate; fallback content still keeps search functional.
        }
    }

    return contentById;
}

export const GET = handleApiRoute("api/search/index.GET", async (req: Request) => {
    const user = await getSessionUser({ allowCookieMutation: true });
    if (!user) {
        return json({ ok: false, message: "Unauthorized." }, 401);
    }

    const language = parseLanguage(new URL(req.url).searchParams.get("language")) ?? "en";
    const contentById = await buildSearchIndex(req, language);

    return json({
        ok: true,
        language,
        createdAt: Date.now(),
        contentById,
    });
});
