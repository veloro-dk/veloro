import type { ReactNode } from "react";
import { Tooltip } from "@/components/Tooltip";
import {
    PRODUCT_TYPE_TREE,
    normalizeProductTypePath,
    type ProductTypeNode,
} from "@/lib/productTypes";
import type { CategoryVariantRule, VariantInputType } from "@/lib/productCatalog";

export const COLUMN_DRAGGING_BODY_CLASS = "portalProductsGlobalDragActive__F4m2Q8";

export const VARIANT_INPUT_TYPE_ORDER: Record<VariantInputType, number> = {
    select: 0,
    input: 1,
    textarea: 2,
    date: 3,
};

export const DUPLICATE_VALUE_MESSAGE = "Duplicate value is not allowed.";

export function buildVariantOptionInUseMessage(value: string, usageCount: number) {
    return `"${value}" is tied to ${usageCount} product${usageCount === 1 ? "" : "s"}. Untie it before deleting.`;
}

export function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

export function getVariantInputTypeLabel(inputType: VariantInputType) {
    if (inputType === "select") return "Select";
    if (inputType === "input") return "Input";
    if (inputType === "textarea") return "Textarea";
    return "Date";
}

export function reorderVariantRulesByInsertionIndex(
    rules: CategoryVariantRule[],
    sourceIndex: number,
    targetIndexRaw: number
) {
    if (sourceIndex < 0 || sourceIndex >= rules.length) return rules;

    const targetIndex = Math.max(0, Math.min(targetIndexRaw, rules.length));
    const normalizedTarget = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex;
    if (normalizedTarget === sourceIndex) return rules;

    const next = [...rules];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(normalizedTarget, 0, moved);
    return next;
}

type ProductSectionHeaderProps = {
    title: string;
    description: string;
    action?: ReactNode;
    showTooltip?: boolean;
};

export function ProductSectionHeader({ title, description, action, showTooltip = true }: ProductSectionHeaderProps) {
    return (
        <div className="portalCategoryCreateSectionHeader__H8m2Q4 ui-card-heading-row">
            <h3 className="portalCategoryCreateSectionTitle__B2m8Q7 ui-card-heading">
                {showTooltip ? (
                    <Tooltip title={title} description={description}>
                        <button
                            type="button"
                            className="portalCategoryCreateSectionTitleHint__A2m8Q4 ui-card-heading-hint"
                            aria-label={`Show details for ${title}`}
                        >
                            {title}
                        </button>
                    </Tooltip>
                ) : (
                    <span className="portalCategoryCreateSectionTitleText__M7m2Q4 ui-card-heading-text">{title}</span>
                )}
            </h3>
            {action ? <div className="portalCategoryCreateSectionAction__N8m2Q6 ui-card-heading-action">{action}</div> : null}
        </div>
    );
}

export function getProductTypeLevels(path: string[]) {
    const normalizedPath = normalizeProductTypePath(path);
    const levels: ProductTypeNode[][] = [];

    let currentOptions = PRODUCT_TYPE_TREE;
    let index = 0;
    while (currentOptions.length > 0) {
        levels.push(currentOptions);
        const selectedAtLevel = normalizedPath[index];
        const selectedNode = currentOptions.find((node) => node.id === selectedAtLevel);
        if (!selectedNode || !selectedNode.children || selectedNode.children.length === 0) {
            break;
        }
        currentOptions = selectedNode.children;
        index += 1;
        if (index > 11) break;
    }

    return { levels, normalizedPath };
}

export function resolvePathFromLevels(path: string[], levelIndex: number, nodeId: string) {
    const normalizedPath = normalizeProductTypePath(path);
    const next = normalizedPath.slice(0, levelIndex);
    if (nodeId) next.push(nodeId);
    return normalizeProductTypePath(next);
}

export function parseIsoTimestamp(value: string) {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
}

export function parseDateOnlyTimestamp(value: string) {
    if (!value) return 0;
    const parsed = Date.parse(`${value}T12:00:00.000Z`);
    return Number.isNaN(parsed) ? 0 : parsed;
}

export function formatMoney(amount: number, currency: string, locale: string) {
    try {
        return new Intl.NumberFormat(locale, {
            style: "currency",
            currency,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        return `${amount.toFixed(2)} ${currency}`;
    }
}

export function formatDateTime(timestamp: number, locale: string) {
    if (!Number.isFinite(timestamp) || timestamp <= 0) return "Unknown";
    return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(timestamp));
}

export function formatRelativeTime(timestamp: number, locale: string) {
    if (!Number.isFinite(timestamp) || timestamp <= 0) return "Just now";
    const now = Date.now();
    const diffMs = timestamp - now;
    const absMs = Math.abs(diffMs);
    const minuteMs = 60 * 1000;
    const hourMs = 60 * minuteMs;
    const dayMs = 24 * hourMs;
    const weekMs = 7 * dayMs;
    const monthMs = 30 * dayMs;
    const yearMs = 365 * dayMs;

    let value = 0;
    let unit: Intl.RelativeTimeFormatUnit = "minute";
    if (absMs < hourMs) {
        value = Math.round(diffMs / minuteMs);
        unit = "minute";
    } else if (absMs < dayMs) {
        value = Math.round(diffMs / hourMs);
        unit = "hour";
    } else if (absMs < weekMs) {
        value = Math.round(diffMs / dayMs);
        unit = "day";
    } else if (absMs < monthMs) {
        value = Math.round(diffMs / weekMs);
        unit = "week";
    } else if (absMs < yearMs) {
        value = Math.round(diffMs / monthMs);
        unit = "month";
    } else {
        value = Math.round(diffMs / yearMs);
        unit = "year";
    }

    if (value === 0) return "Just now";
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(value, unit);
}

export function getInitials(value: string) {
    const cleaned = value
        .replace(/[^a-zA-Z0-9 ]/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (cleaned.length === 0) return "U";
    if (cleaned.length === 1) return cleaned[0].slice(0, 2).toUpperCase();
    return `${cleaned[0][0] ?? ""}${cleaned[1][0] ?? ""}`.toUpperCase();
}

export function createTimelineCommentId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return `timeline_${crypto.randomUUID()}`;
    }
    return `timeline_${Date.now()}_${Math.round(Math.random() * 1_000_000)}`;
}
