import type { LanguageCode, PortalMessages } from "@/i18n/portal";
import type { PortalActionNotificationTone } from "@/components/portalActionNotifications";
import { normalizePortalPublicPathname } from "@/lib/portalRoutes";
import {
    SEARCH_CONTENT_IGNORE_SELECTOR,
    SEARCH_CONTENT_ROOT_SELECTORS,
    SEARCH_CONTENT_SELECTOR,
    SEARCH_INDEX_CACHE_KEY_PREFIX,
    SEARCH_INDEX_CACHE_TTL_MS,
    SEARCH_INDEX_CACHE_VERSION,
    type AssistantConversation,
    type SearchIndexCachePayload,
    type SearchItem,
    type SearchItemType,
    type SearchPageDefinition,
    type SearchPageId,
    type SearchSettingAction,
    type ThemePreference,
} from "@/components/shell/viewConfig";

export function createAssistantConversation(title = "New conversation"): AssistantConversation {
    const now = Date.now();
    const id = `assistant-${now}-${Math.random().toString(36).slice(2, 10)}`;
    return {
        id,
        title,
        updatedAt: now,
    };
}

export function parseAssistantConversations(raw: string | null): AssistantConversation[] {
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];

        return parsed
            .map((entry) => {
                if (!entry || typeof entry !== "object") return null;
                const id = (entry as { id?: unknown }).id;
                const title = (entry as { title?: unknown }).title;
                const updatedAt = (entry as { updatedAt?: unknown }).updatedAt;
                if (typeof id !== "string" || typeof title !== "string") return null;

                return {
                    id,
                    title: title.trim() || "New conversation",
                    updatedAt: typeof updatedAt === "number" && Number.isFinite(updatedAt) ? updatedAt : 0,
                } satisfies AssistantConversation;
            })
            .filter((entry): entry is AssistantConversation => Boolean(entry));
    } catch {
        return [];
    }
}

export function formatAssistantTimestamp(value: number) {
    if (!Number.isFinite(value) || value <= 0) return "";

    try {
        return new Intl.DateTimeFormat(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(value));
    } catch {
        return "";
    }
}

export function isThemePreference(value: string | null): value is ThemePreference {
    return value === "system" || value === "light" || value === "dark";
}

export function nextTheme(current: ThemePreference): ThemePreference {
    if (current === "system") return "light";
    if (current === "light") return "dark";
    return "system";
}

export function normalizeSearchText(value: string) {
    return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function formatSearchTemplate(template: string, params: Record<string, string>) {
    return template.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? "");
}

export function getSearchIndexCacheKey(language: LanguageCode) {
    return `${SEARCH_INDEX_CACHE_KEY_PREFIX}:${language}`;
}

export function applySearchIndexContent(items: SearchItem[], contentById: Record<string, string>) {
    return items.map((item) => {
        const indexedContent = contentById[item.id];
        if (!indexedContent) return item;

        return {
            ...item,
            content: indexedContent,
            searchText: normalizeSearchText(`${item.searchText} ${indexedContent}`),
        };
    });
}

export function parseSearchIndexCache(raw: string | null, language: LanguageCode): Record<string, string> | null {
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw) as Partial<SearchIndexCachePayload>;
        if (
            parsed.version !== SEARCH_INDEX_CACHE_VERSION
            || parsed.language !== language
            || typeof parsed.createdAt !== "number"
            || Date.now() - parsed.createdAt > SEARCH_INDEX_CACHE_TTL_MS
            || !parsed.contentById
            || typeof parsed.contentById !== "object"
        ) {
            return null;
        }

        const contentById: Record<string, string> = {};
        for (const [id, value] of Object.entries(parsed.contentById)) {
            if (typeof value === "string" && value.length > 0) {
                contentById[id] = value.slice(0, 7000);
            }
        }

        return contentById;
    } catch {
        return null;
    }
}

export function resolveSearchPageTitle(definition: SearchPageDefinition, messages: PortalMessages) {
    if (definition.pageKey) return messages.pages[definition.pageKey];
    if (definition.id === "system-status") return messages.menu.systemStatus;
    return definition.titleFallback ?? definition.id;
}

export function shouldIgnoreSearchNode(node: Element) {
    if (node.matches(SEARCH_CONTENT_IGNORE_SELECTOR)) return true;
    if (node.closest(SEARCH_CONTENT_IGNORE_SELECTOR)) return true;
    return false;
}

export function splitSearchContentIntoChunks(source: string) {
    return source
        .split("\n")
        .map((chunk) => chunk.trim())
        .filter((chunk) => chunk.length > 0);
}

export function extractNodeTextWithoutIgnoredDescendants(node: Element) {
    const doc = node.ownerDocument;
    if (!doc?.createTreeWalker || typeof NodeFilter === "undefined") {
        return node.textContent?.replace(/\s+/g, " ").trim() ?? "";
    }

    const textParts: string[] = [];
    const walker = doc.createTreeWalker(
        node,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode(textNode) {
                const parent = textNode.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                if (shouldIgnoreSearchNode(parent)) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            },
        }
    );

    let current = walker.nextNode();
    while (current) {
        const text = current.nodeValue?.replace(/\s+/g, " ").trim();
        if (text) textParts.push(text);
        current = walker.nextNode();
    }

    return textParts.join(" ").trim();
}

export function extractSearchContentFromHtml(html: string) {
    if (typeof DOMParser === "undefined") return "";

    const doc = new DOMParser().parseFromString(html, "text/html");
    const roots = SEARCH_CONTENT_ROOT_SELECTORS.flatMap((selector) => Array.from(doc.querySelectorAll(selector)));
    const targets = roots.length > 0 ? roots : [doc.body];
    const chunks = new Set<string>();

    for (const target of targets) {
        for (const node of target.querySelectorAll(SEARCH_CONTENT_SELECTOR)) {
            if (shouldIgnoreSearchNode(node)) continue;
            const text = extractNodeTextWithoutIgnoredDescendants(node);
            if (!text || text.length < 2) continue;
            chunks.add(text);
        }
    }

    return Array.from(chunks).join("\n").slice(0, 7000);
}

export function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildSearchSnippet(source: string, query: string, fallback: string) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return fallback;

    const chunks = splitSearchContentIntoChunks(source);
    const matchingChunk = chunks.find((chunk) => chunk.toLowerCase().includes(normalized));

    const raw = matchingChunk || fallback;
    const index = raw.toLowerCase().indexOf(normalized);
    if (index === -1) return fallback;

    const start = Math.max(0, index - 58);
    const end = Math.min(raw.length, index + normalized.length + 96);
    const prefix = start > 0 ? "... " : "";
    const suffix = end < raw.length ? " ..." : "";
    return `${prefix}${raw.slice(start, end).trim()}${suffix}`;
}

export type SearchDebugItem = {
    id: string;
    type: SearchItemType;
    title: string;
    href?: string;
    action?: SearchSettingAction;
    chunks: string[];
};

export type SearchDebugPayload = {
    generatedAt: string;
    language: LanguageCode;
    includeSelector: string;
    ignoreSelector: string;
    rootSelectors: readonly string[];
    pages: SearchDebugItem[];
    settings: SearchDebugItem[];
};

export function getShortcutLabel() {
    return "⌘ K";
}

export function parseSearchPageId(itemId: string): SearchPageId | null {
    if (!itemId.startsWith("page:")) return null;
    const raw = itemId.slice(5) as SearchPageId;
    return raw;
}

export function scoreSearchItem(item: SearchItem, normalizedQuery: string) {
    if (!normalizedQuery) return 0;

    let score = 0;
    const title = normalizeSearchText(item.title);
    const description = normalizeSearchText(item.description);
    const text = item.searchText;

    if (title === normalizedQuery) score += 120;
    if (title.startsWith(normalizedQuery)) score += 90;
    if (title.includes(normalizedQuery)) score += 52;
    if (description.includes(normalizedQuery)) score += 28;

    const firstOccurrence = text.indexOf(normalizedQuery);
    if (firstOccurrence >= 0) {
        score += Math.max(0, 34 - Math.min(firstOccurrence, 34));
    }

    if (item.type === "setting") score -= 8;
    return score;
}

export function getHeaderValue(headers: HeadersInit | undefined, name: string): string | null {
    if (!headers) return null;

    if (headers instanceof Headers) {
        return headers.get(name);
    }

    if (Array.isArray(headers)) {
        const found = headers.find(([key]) => key.toLowerCase() === name.toLowerCase());
        return found?.[1] ?? null;
    }

    const key = Object.keys(headers).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
    if (!key) return null;

    const value = headers[key as keyof typeof headers];
    return typeof value === "string" ? value : null;
}

export function normalizePathname(value: string) {
    if (!value) return "/";
    if (value === "/") return "/";
    return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function normalizeNotificationMessage(value: string) {
    return value.replace(/\s+/g, " ").trim();
}

export function inferPortalActionNotificationTone(elementClassName: string, message: string): PortalActionNotificationTone {
    if (/Success__/i.test(elementClassName)) return "success";
    if (/Warning__/i.test(elementClassName)) return "warning";
    if (/Hint__/i.test(elementClassName)) return "info";
    if (/Error__/i.test(elementClassName)) return "error";

    if (/\b(success|saved|created|updated|deleted|sent)\b/i.test(message)) return "success";
    if (/\b(warn|caution|attention)\b/i.test(message)) return "warning";
    if (/\b(unable|error|required|invalid|missing|failed|cannot|can't|not found)\b/i.test(message)) return "error";
    return "info";
}

export function isTrackedRouteLoadRequest(input: RequestInfo | URL, init?: RequestInit, currentPathname?: string) {
    if (typeof window === "undefined") return false;

    const rawUrl = input instanceof Request ? input.url : input instanceof URL ? input.toString() : String(input);
    let url: URL;

    try {
        url = new URL(rawUrl, window.location.origin);
    } catch {
        return false;
    }

    if (url.origin !== window.location.origin) return false;
    if (url.pathname.startsWith("/api")) return false;

    const normalizedTargetPath = normalizePathname(normalizePortalPublicPathname(url.pathname));
    if (typeof currentPathname === "string" && normalizedTargetPath === normalizePathname(normalizePortalPublicPathname(currentPathname))) {
        return false;
    }

    const requestPrefetch = getHeaderValue(input instanceof Request ? input.headers : undefined, "Next-Router-Prefetch");
    const initPrefetch = getHeaderValue(init?.headers, "Next-Router-Prefetch");
    if (requestPrefetch || initPrefetch) return false;

    const requestRsc = getHeaderValue(input instanceof Request ? input.headers : undefined, "RSC");
    const initRsc = getHeaderValue(init?.headers, "RSC");

    return url.searchParams.has("_rsc") || !!requestRsc || !!initRsc;
}
