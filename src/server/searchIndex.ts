import "server-only";
import {
    SEARCH_CONTENT_IGNORE_SELECTOR,
    SEARCH_CONTENT_SELECTOR,
} from "@/components/shell/viewConfig";

const SEARCH_CONTENT_MAX_LENGTH = 7000;
const BLOCKED_TAGS = ["script", "style", "noscript", "template", "svg", "iframe", "canvas"] as const;
const ENTITY_MAP: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: "\"",
    apos: "'",
    nbsp: " ",
};

const INCLUDE_TAG_NAMES = SEARCH_CONTENT_SELECTOR
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

const IGNORE_TAG_NAMES = SEARCH_CONTENT_IGNORE_SELECTOR
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtmlEntities(value: string) {
    return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (fullMatch, entity: string) => {
        if (entity.startsWith("#x") || entity.startsWith("#X")) {
            const parsed = Number.parseInt(entity.slice(2), 16);
            if (Number.isFinite(parsed) && parsed > 0) {
                return String.fromCodePoint(parsed);
            }
            return fullMatch;
        }

        if (entity.startsWith("#")) {
            const parsed = Number.parseInt(entity.slice(1), 10);
            if (Number.isFinite(parsed) && parsed > 0) {
                return String.fromCodePoint(parsed);
            }
            return fullMatch;
        }

        return ENTITY_MAP[entity.toLowerCase()] ?? fullMatch;
    });
}

function normalizeText(value: string) {
    return decodeHtmlEntities(value.replace(/<[^>]+>/g, " "))
        .replace(/\s+/g, " ")
        .trim();
}

function stripBlockedTags(html: string) {
    let output = html.replace(/<!--[\s\S]*?-->/g, " ");

    for (const tag of BLOCKED_TAGS) {
        const escapedTag = escapeRegExp(tag);
        output = output
            .replace(new RegExp(`<${escapedTag}\\b[^>]*>[\\s\\S]*?<\\/${escapedTag}>`, "gi"), " ")
            .replace(new RegExp(`<${escapedTag}\\b[^>]*\\/?>`, "gi"), " ");
    }

    return output;
}

function stripIgnoredTags(html: string) {
    let output = html;

    for (const tag of IGNORE_TAG_NAMES) {
        const escapedTag = escapeRegExp(tag);
        output = output
            .replace(new RegExp(`<${escapedTag}\\b[^>]*>[\\s\\S]*?<\\/${escapedTag}>`, "gi"), " ")
            .replace(new RegExp(`<${escapedTag}\\b[^>]*\\/?>`, "gi"), " ");
    }

    return output;
}

function extractBodyHtml(html: string) {
    const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
    return bodyMatch?.[1] ?? html;
}

export function extractSearchContentFromHtmlServer(html: string) {
    const source = stripIgnoredTags(stripBlockedTags(extractBodyHtml(html)));
    const chunks = new Set<string>();

    for (const tag of INCLUDE_TAG_NAMES) {
        const escapedTag = escapeRegExp(tag);
        const regex = new RegExp(`<${escapedTag}\\b[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`, "gi");
        let match = regex.exec(source);

        while (match) {
            const normalized = normalizeText(match[1] || "");
            if (normalized.length >= 2) {
                chunks.add(normalized);
            }

            match = regex.exec(source);
        }
    }

    if (chunks.size === 0) {
        return normalizeText(source).slice(0, SEARCH_CONTENT_MAX_LENGTH);
    }

    return Array.from(chunks).join("\n").slice(0, SEARCH_CONTENT_MAX_LENGTH);
}
