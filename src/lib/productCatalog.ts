import type { PurchaseOrder } from "@/lib/purchaseOrders";
import { normalizeMultiValueList } from "@/lib/multiValueInput";

export type VariantDefinition = {
    id: string;
    label: string;
    inputType: VariantInputType;
    values: string[];
};

export type VariantInputType = "select" | "input" | "textarea" | "date";

export type CategoryVariantRule = {
    variantId: string;
    required: boolean;
};

export type CategoryType = "MANUAL" | "SMART";
export type CategoryConditionMatchMode = "ALL" | "ANY";
export type CategoryConditionField =
    | "TITLE"
    | "SKU"
    | "TAG"
    | "INVENTORY"
    | "STATUS"
    | "LISTED_SALE_PRICE"
    | "LATEST_PURCHASE_ORDER_UNIT_COST"
    | "AVERAGE_PURCHASE_ORDER_UNIT_COST";
export type CategoryConditionOperator =
    | "EQ"
    | "NEQ"
    | "STARTS_WITH"
    | "ENDS_WITH"
    | "CONTAINS"
    | "NOT_CONTAINS"
    | "GT"
    | "LT";
export type CategoryCondition = {
    id: string;
    field: CategoryConditionField;
    operator: CategoryConditionOperator;
    value: string;
    valueCurrency?: string;
};

export type ProductCategoryDefinition = {
    id: string;
    title: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
    updatedBy?: string;
    type: CategoryType;
    conditionMode: CategoryConditionMatchMode;
    conditions: CategoryCondition[];
    manualProductIds: string[];
    storeIds: string[];
    products: number;
    productCondition: string;
    variantRules: CategoryVariantRule[];
};

export type ProductStatus = "ACTIVE" | "DRAFT" | "ARCHIVED";

export type ProductMaintenanceEntry = {
    id: string;
    description: string;
    amount: number;
    currency: string;
    createdAt: string;
};

export type ProductTimelineComment = {
    id: string;
    text: string;
    authorName?: string;
    storeName?: string;
    createdAt: string;
    updatedAt: string;
};

export type CatalogProduct = {
    id: string;
    name: string;
    sku: string;
    description?: string;
    status: ProductStatus;
    inventory: number;
    productTypePath?: string[];
    productTypeLabel?: string;
    defaultTaxPercent?: number;
    listedSalePrice?: number;
    organizationType?: string;
    vendor?: string;
    barcode?: string;
    category: string;
    categoryIds: string[];
    maintenanceCost?: number;
    maintenanceEntries?: ProductMaintenanceEntry[];
    timelineComments?: ProductTimelineComment[];
    saleDate?: string | null;
    saleDiscount?: number;
    saleTotal?: number;
    updatedAt: string;
    tags: string[];
    variants: Record<string, string>;
    productVariantRules: CategoryVariantRule[];
};

export const DEFAULT_PRODUCTS: CatalogProduct[] = [];

export const DEFAULT_PRODUCT_CATEGORIES: readonly string[] = [];

export const DEFAULT_VARIANT_DEFINITIONS: VariantDefinition[] = [];

const DEFAULT_CATEGORY_VARIANT_RULES: CategoryVariantRule[] = [];
const DEFAULT_CATEGORY_CONDITIONS: CategoryCondition[] = [];

export const DEFAULT_PRODUCT_CATEGORY_DEFINITIONS: ProductCategoryDefinition[] = [];

function cloneVariantDefinition(definition: VariantDefinition): VariantDefinition {
    return {
        id: definition.id,
        label: definition.label,
        inputType: definition.inputType,
        values: [...definition.values],
    };
}

function cloneCategoryVariantRule(rule: CategoryVariantRule): CategoryVariantRule {
    return {
        variantId: rule.variantId,
        required: rule.required,
    };
}

function cloneCategoryCondition(condition: CategoryCondition): CategoryCondition {
    return {
        id: condition.id,
        field: condition.field,
        operator: condition.operator,
        value: condition.value,
        valueCurrency: condition.valueCurrency,
    };
}

function cloneProductCategoryDefinition(definition: ProductCategoryDefinition): ProductCategoryDefinition {
    return {
        id: definition.id,
        title: definition.title,
        description: definition.description,
        createdAt: definition.createdAt,
        updatedAt: definition.updatedAt,
        updatedBy: definition.updatedBy,
        type: definition.type,
        conditionMode: definition.conditionMode,
        conditions: definition.conditions.map(cloneCategoryCondition),
        manualProductIds: [...definition.manualProductIds],
        storeIds: [...definition.storeIds],
        products: definition.products,
        productCondition: definition.productCondition,
        variantRules: definition.variantRules.map(cloneCategoryVariantRule),
    };
}

function cloneCatalogProduct(product: CatalogProduct): CatalogProduct {
    return {
        ...product,
        productTypePath: product.productTypePath ? [...product.productTypePath] : undefined,
        categoryIds: [...product.categoryIds],
        tags: [...product.tags],
        variants: { ...product.variants },
        maintenanceEntries: product.maintenanceEntries
            ? product.maintenanceEntries.map((entry) => ({ ...entry }))
            : undefined,
        timelineComments: product.timelineComments
            ? product.timelineComments.map((comment) => ({ ...comment }))
            : undefined,
        productVariantRules: product.productVariantRules.map(cloneCategoryVariantRule),
    };
}

function toVariantId(value: string) {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function sanitizeVariantInputType(value: unknown): VariantInputType {
    if (value === "select" || value === "input" || value === "textarea" || value === "date") return value;
    return "select";
}

function sanitizeCategoryType(value: unknown): CategoryType {
    if (value === "MANUAL" || value === "SMART") return value;
    return "MANUAL";
}

function sanitizeConditionMatchMode(value: unknown): CategoryConditionMatchMode {
    if (value === "ALL" || value === "ANY") return value;
    return "ALL";
}

function sanitizeConditionField(value: unknown): CategoryConditionField {
    if (
        value === "TITLE"
        || value === "SKU"
        || value === "TAG"
        || value === "INVENTORY"
        || value === "STATUS"
        || value === "LISTED_SALE_PRICE"
        || value === "LATEST_PURCHASE_ORDER_UNIT_COST"
        || value === "AVERAGE_PURCHASE_ORDER_UNIT_COST"
    ) {
        return value;
    }
    return "TITLE";
}

function sanitizeConditionOperator(value: unknown): CategoryConditionOperator {
    if (
        value === "EQ"
        || value === "NEQ"
        || value === "STARTS_WITH"
        || value === "ENDS_WITH"
        || value === "CONTAINS"
        || value === "NOT_CONTAINS"
        || value === "GT"
        || value === "LT"
    ) {
        return value;
    }
    return "CONTAINS";
}

export function cloneVariantDefinitions(definitions: VariantDefinition[]) {
    return definitions.map(cloneVariantDefinition);
}

export function getDefaultVariantDefinitions() {
    return cloneVariantDefinitions(DEFAULT_VARIANT_DEFINITIONS);
}

export function cloneProductCategoryDefinitions(definitions: ProductCategoryDefinition[]) {
    return definitions.map(cloneProductCategoryDefinition);
}

export function getDefaultProductCategoryDefinitions() {
    return cloneProductCategoryDefinitions(DEFAULT_PRODUCT_CATEGORY_DEFINITIONS);
}

export function getDefaultProducts() {
    return DEFAULT_PRODUCTS.map(cloneCatalogProduct);
}

export function sanitizeVariantDefinitions(raw: unknown) {
    if (!Array.isArray(raw)) return getDefaultVariantDefinitions();

    const seenIds = new Set<string>();
    const sanitized: VariantDefinition[] = [];

    for (const entry of raw) {
        if (!entry || typeof entry !== "object") continue;

        const record = entry as Partial<VariantDefinition>;
        const baseId = typeof record.id === "string" ? toVariantId(record.id) : "";
        const baseLabel = typeof record.label === "string" ? record.label.trim() : "";
        const inputType = sanitizeVariantInputType(record.inputType);
        const id = baseId || toVariantId(baseLabel);
        const label = baseLabel || id;
        const parsedValues = Array.isArray(record.values)
            ? normalizeMultiValueList(
                record.values
                    .map((value) => (typeof value === "string" ? value : ""))
            )
            : [];
        const values = inputType === "select" ? parsedValues : [];

        if (!id || !label || seenIds.has(id)) continue;
        seenIds.add(id);

        sanitized.push({
            id,
            label,
            inputType,
            values,
        });
    }

    if (sanitized.length === 0) return getDefaultVariantDefinitions();
    return sanitized;
}

function sanitizeCategoryVariantRules(raw: unknown, knownVariantIds: Set<string>) {
    if (!Array.isArray(raw)) return [];

    const seenIds = new Set<string>();
    const sanitized: CategoryVariantRule[] = [];

    for (const entry of raw) {
        if (!entry || typeof entry !== "object") continue;

        const record = entry as Partial<CategoryVariantRule>;
        const variantId = typeof record.variantId === "string" ? toVariantId(record.variantId) : "";
        if (!variantId || !knownVariantIds.has(variantId) || seenIds.has(variantId)) continue;
        seenIds.add(variantId);

        sanitized.push({
            variantId,
            required: Boolean(record.required),
        });
    }

    return sanitized;
}

function getDefaultCategoryVariantRules(knownVariantIds: Set<string>) {
    return DEFAULT_CATEGORY_VARIANT_RULES.filter((rule) => knownVariantIds.has(rule.variantId)).map(cloneCategoryVariantRule);
}

function sanitizeCategoryConditionValue(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (typeof value === "string") return value.trim();
    return "";
}

function sanitizeCategoryConditions(raw: unknown) {
    if (!Array.isArray(raw)) return [] as CategoryCondition[];

    const seenIds = new Set<string>();
    const sanitized: CategoryCondition[] = [];

    raw.forEach((entry, index) => {
        if (!entry || typeof entry !== "object") return;
        const record = entry as Partial<CategoryCondition>;
        const fallbackId = `condition_${index + 1}`;
        const id = typeof record.id === "string" && record.id.trim().length > 0
            ? toVariantId(record.id) || fallbackId
            : fallbackId;
        if (seenIds.has(id)) return;
        seenIds.add(id);

        const value = sanitizeCategoryConditionValue(record.value);
        const valueCurrency = typeof record.valueCurrency === "string" && record.valueCurrency.trim().length > 0
            ? record.valueCurrency.trim().toUpperCase()
            : undefined;

        sanitized.push({
            id,
            field: sanitizeConditionField(record.field),
            operator: sanitizeConditionOperator(record.operator),
            value,
            valueCurrency,
        });
    });

    return sanitized;
}

function sanitizeStringArray(value: unknown) {
    if (!Array.isArray(value)) return [] as string[];
    return Array.from(new Set(
        value
            .filter((entry): entry is string => typeof entry === "string")
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0)
    ));
}

export function sanitizeProductCategoryDefinitions(raw: unknown, variantDefinitions: VariantDefinition[] = getDefaultVariantDefinitions()) {
    if (!Array.isArray(raw)) return getDefaultProductCategoryDefinitions();

    const knownVariantIds = new Set(variantDefinitions.map((definition) => definition.id));
    const seenIds = new Set<string>();
    const sanitized: ProductCategoryDefinition[] = [];

    for (const entry of raw) {
        if (!entry || typeof entry !== "object") continue;

        const record = entry as Partial<ProductCategoryDefinition>;
        const title = typeof record.title === "string" ? record.title.trim() : "";
        if (!title) continue;

        const baseId = typeof record.id === "string" ? toVariantId(record.id) : "";
        const id = baseId || toVariantId(title);
        if (!id || seenIds.has(id)) continue;
        seenIds.add(id);

        const products = typeof record.products === "number" && Number.isFinite(record.products)
            ? Math.max(0, Math.round(record.products))
            : 0;

        const type = sanitizeCategoryType((record as { type?: unknown }).type);
        const conditionMode = sanitizeConditionMatchMode((record as { conditionMode?: unknown }).conditionMode);
        const conditions = sanitizeCategoryConditions((record as { conditions?: unknown }).conditions);
        const manualProductIds = sanitizeStringArray((record as { manualProductIds?: unknown }).manualProductIds);
        const storeIds = sanitizeStringArray((record as { storeIds?: unknown }).storeIds);
        const description = typeof record.description === "string" && record.description.trim().length > 0
            ? record.description.trim()
            : undefined;
        const createdAt = typeof (record as { createdAt?: unknown }).createdAt === "string"
            ? (record as { createdAt?: string }).createdAt
            : undefined;
        const updatedAt = typeof (record as { updatedAt?: unknown }).updatedAt === "string"
            ? (record as { updatedAt?: string }).updatedAt
            : undefined;
        const updatedBy = typeof (record as { updatedBy?: unknown }).updatedBy === "string"
            ? (record as { updatedBy?: string }).updatedBy
            : undefined;

        const productCondition = typeof record.productCondition === "string" && record.productCondition.trim().length > 0
            ? record.productCondition.trim()
            : (type === "SMART" ? "Smart category" : "Manual category");

        const variantRules = sanitizeCategoryVariantRules(record.variantRules, knownVariantIds);
        const fallbackRules = getDefaultCategoryVariantRules(knownVariantIds);

        sanitized.push({
            id,
            title,
            description,
            createdAt,
            updatedAt,
            updatedBy,
            type,
            conditionMode,
            conditions: conditions.length > 0 ? conditions : DEFAULT_CATEGORY_CONDITIONS.map(cloneCategoryCondition),
            manualProductIds,
            storeIds,
            products,
            productCondition,
            variantRules: variantRules.length > 0 ? variantRules : fallbackRules,
        });
    }

    if (sanitized.length === 0) return getDefaultProductCategoryDefinitions();
    return sanitized;
}

function sanitizeProductStatus(value: unknown): ProductStatus {
    if (value === "ACTIVE" || value === "DRAFT" || value === "ARCHIVED") return value;
    return "DRAFT";
}

function sanitizeVariantValueMap(raw: unknown, knownVariantIds?: Set<string>) {
    if (!raw || typeof raw !== "object") return {} as Record<string, string>;

    return Object.fromEntries(
        Object.entries(raw)
            .filter(([key, value]) => typeof key === "string" && key.trim().length > 0 && typeof value === "string")
            .map(([key, value]) => [toVariantId(key), value.trim()])
            .filter(([key, value]) => key.length > 0 && value.length > 0 && (!knownVariantIds || knownVariantIds.has(key)))
    );
}

function sanitizeProductVariantRules(raw: unknown, knownVariantIds?: Set<string>) {
    if (!Array.isArray(raw)) return [] as CategoryVariantRule[];
    if (knownVariantIds) {
        return sanitizeCategoryVariantRules(raw, knownVariantIds);
    }

    const seenIds = new Set<string>();
    const sanitized: CategoryVariantRule[] = [];
    raw.forEach((entry) => {
        if (!entry || typeof entry !== "object") return;

        const record = entry as Partial<CategoryVariantRule>;
        const variantId = typeof record.variantId === "string" ? toVariantId(record.variantId) : "";
        if (!variantId || seenIds.has(variantId)) return;
        seenIds.add(variantId);
        sanitized.push({
            variantId,
            required: Boolean(record.required),
        });
    });
    return sanitized;
}

function sanitizeProductMaintenanceEntries(raw: unknown) {
    if (!Array.isArray(raw)) return undefined;

    const sanitized = raw.flatMap((entry, index) => {
        if (!entry || typeof entry !== "object") return [] as ProductMaintenanceEntry[];
        const record = entry as Partial<ProductMaintenanceEntry>;
        const description = typeof record.description === "string" ? record.description.trim() : "";
        const amount = typeof record.amount === "number" && Number.isFinite(record.amount)
            ? Math.max(0, record.amount)
            : Number.NaN;
        if (!description || !Number.isFinite(amount)) return [] as ProductMaintenanceEntry[];

        const id = typeof record.id === "string" && record.id.trim().length > 0
            ? record.id.trim()
            : `maint_${index}_${Math.round(amount * 100)}`;
        const currency = typeof record.currency === "string" && record.currency.trim().length > 0
            ? record.currency.trim().toUpperCase()
            : "EUR";
        const createdAt = typeof record.createdAt === "string" && !Number.isNaN(Date.parse(record.createdAt))
            ? record.createdAt
            : new Date().toISOString();

        return [{ id, description, amount, currency, createdAt }];
    });

    return sanitized.length > 0 ? sanitized : undefined;
}

function sanitizeProductTimelineComments(raw: unknown) {
    if (!Array.isArray(raw)) return undefined;

    const seenIds = new Set<string>();
    const sanitized: ProductTimelineComment[] = [];

    raw.forEach((entry, index) => {
        if (!entry || typeof entry !== "object") return;
        const record = entry as Partial<ProductTimelineComment>;
        const text = typeof record.text === "string" ? record.text.trim() : "";
        if (!text) return;
        const createdAt = typeof record.createdAt === "string" && !Number.isNaN(Date.parse(record.createdAt))
            ? record.createdAt
            : new Date().toISOString();
        const updatedAt = typeof record.updatedAt === "string" && !Number.isNaN(Date.parse(record.updatedAt))
            ? record.updatedAt
            : createdAt;
        const id = typeof record.id === "string" && record.id.trim().length > 0
            ? record.id.trim()
            : `timeline_${index}_${Date.parse(createdAt) || Date.now()}`;
        const authorName = typeof record.authorName === "string" && record.authorName.trim().length > 0
            ? record.authorName.trim()
            : undefined;
        const storeName = typeof record.storeName === "string" && record.storeName.trim().length > 0
            ? record.storeName.trim()
            : undefined;
        if (seenIds.has(id)) return;
        seenIds.add(id);
        sanitized.push({
            id,
            text,
            authorName,
            storeName,
            createdAt,
            updatedAt,
        });
    });

    return sanitized.length > 0 ? sanitized : undefined;
}

function sanitizeProductEntry(raw: unknown, knownVariantIds?: Set<string>): CatalogProduct | null {
    if (!raw || typeof raw !== "object") return null;
    const record = raw as Partial<CatalogProduct>;

    const id = typeof record.id === "string" && record.id.trim().length > 0 ? record.id.trim() : "";
    const name = typeof record.name === "string" && record.name.trim().length > 0 ? record.name.trim() : "";
    const sku = typeof record.sku === "string" && record.sku.trim().length > 0 ? record.sku.trim() : "";
    const description = typeof record.description === "string" && record.description.trim().length > 0
        ? record.description.trim()
        : undefined;
    const productTypePath = sanitizeStringArray((record as { productTypePath?: unknown }).productTypePath)
        .map(toVariantId)
        .filter(Boolean);
    const productTypeLabel = typeof (record as { productTypeLabel?: unknown }).productTypeLabel === "string"
        && (record as { productTypeLabel?: string }).productTypeLabel?.trim().length
        ? (record as { productTypeLabel?: string }).productTypeLabel?.trim()
        : undefined;
    const defaultTaxPercent = typeof (record as { defaultTaxPercent?: unknown }).defaultTaxPercent === "number"
        && Number.isFinite((record as { defaultTaxPercent?: number }).defaultTaxPercent)
        ? Math.max(0, Math.min(100, (record as { defaultTaxPercent?: number }).defaultTaxPercent ?? 0))
        : undefined;
    const listedSalePrice = typeof (record as { listedSalePrice?: unknown }).listedSalePrice === "number"
        && Number.isFinite((record as { listedSalePrice?: number }).listedSalePrice)
        ? Math.max(0, (record as { listedSalePrice?: number }).listedSalePrice ?? 0)
        : undefined;
    const organizationType = typeof (record as { organizationType?: unknown }).organizationType === "string"
        && (record as { organizationType?: string }).organizationType?.trim().length
        ? (record as { organizationType?: string }).organizationType?.trim()
        : undefined;
    const vendor = typeof (record as { vendor?: unknown }).vendor === "string"
        && (record as { vendor?: string }).vendor?.trim().length
        ? (record as { vendor?: string }).vendor?.trim()
        : undefined;
    const barcode = typeof (record as { barcode?: unknown }).barcode === "string"
        && (record as { barcode?: string }).barcode?.trim().length
        ? (record as { barcode?: string }).barcode?.trim()
        : undefined;
    const category = typeof record.category === "string" && record.category.trim().length > 0 ? record.category.trim() : "";
    if (!id || !name || !sku) return null;

    const categoryIds = sanitizeStringArray((record as { categoryIds?: unknown }).categoryIds).map(toVariantId).filter(Boolean);

    const inventory = typeof record.inventory === "number" && Number.isFinite(record.inventory) ? Math.max(0, Math.round(record.inventory)) : 0;
    const maintenanceCost = typeof record.maintenanceCost === "number" && Number.isFinite(record.maintenanceCost)
        ? Math.max(0, record.maintenanceCost)
        : undefined;
    const maintenanceEntries = sanitizeProductMaintenanceEntries(
        (record as { maintenanceEntries?: unknown }).maintenanceEntries
    );
    const timelineComments = sanitizeProductTimelineComments(
        (record as { timelineComments?: unknown }).timelineComments
    );
    const saleDate = typeof record.saleDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(record.saleDate)
        ? record.saleDate
        : record.saleDate === null
            ? null
            : undefined;
    const saleDiscount = typeof record.saleDiscount === "number" && Number.isFinite(record.saleDiscount)
        ? Math.max(0, record.saleDiscount)
        : undefined;
    const saleTotal = typeof record.saleTotal === "number" && Number.isFinite(record.saleTotal)
        ? Math.max(0, record.saleTotal)
        : undefined;
    const updatedAt = typeof record.updatedAt === "string" && !Number.isNaN(Date.parse(record.updatedAt)) ? record.updatedAt : new Date().toISOString();
    const tags = Array.isArray(record.tags)
        ? normalizeMultiValueList(
            record.tags.filter((entry): entry is string => typeof entry === "string")
        )
        : [];
    const variants = sanitizeVariantValueMap(record.variants, knownVariantIds);
    const productVariantRules = sanitizeProductVariantRules(
        (record as { productVariantRules?: unknown }).productVariantRules,
        knownVariantIds
    );

    return {
        id,
        name,
        sku,
        description,
        status: sanitizeProductStatus(record.status),
        inventory,
        productTypePath: productTypePath.length > 0 ? productTypePath : ["uncategorized"],
        productTypeLabel,
        defaultTaxPercent,
        listedSalePrice,
        organizationType,
        vendor,
        barcode,
        category,
        categoryIds,
        maintenanceCost,
        maintenanceEntries,
        timelineComments,
        saleDate,
        saleDiscount,
        saleTotal,
        updatedAt,
        tags,
        variants,
        productVariantRules,
    };
}

export function sanitizeProducts(
    raw: unknown,
    fallback: CatalogProduct[] = [],
    variantDefinitions?: VariantDefinition[]
) {
    if (!Array.isArray(raw)) return fallback;
    const knownVariantIds = variantDefinitions && variantDefinitions.length > 0
        ? new Set(variantDefinitions.map((definition) => definition.id))
        : undefined;
    const seen = new Set<string>();
    const sanitized: CatalogProduct[] = [];

    raw.forEach((entry) => {
        const normalized = sanitizeProductEntry(entry, knownVariantIds);
        if (!normalized || seen.has(normalized.id)) return;
        seen.add(normalized.id);
        sanitized.push(normalized);
    });

    return sanitized.length > 0 ? sanitized : fallback;
}

export function createRandomProductSku(prefix = "VLR") {
    let numericPart = "";
    for (let index = 0; index < 8; index += 1) {
        numericPart += String(Math.floor(Math.random() * 10));
    }
    return `${prefix}${numericPart}`;
}

export function createUniqueVariantId(label: string, existing: VariantDefinition[]) {
    const base = toVariantId(label) || "variant";
    const usedIds = new Set(existing.map((definition) => definition.id));
    if (!usedIds.has(base)) return base;

    let index = 2;
    while (usedIds.has(`${base}-${index}`)) {
        index += 1;
    }
    return `${base}-${index}`;
}

export function createUniqueCategoryId(title: string, existing: ProductCategoryDefinition[]) {
    const base = toVariantId(title) || "category";
    const usedIds = new Set(existing.map((category) => category.id));
    if (!usedIds.has(base)) return base;

    let index = 2;
    while (usedIds.has(`${base}-${index}`)) {
        index += 1;
    }
    return `${base}-${index}`;
}

type ProductPurchaseMetrics = {
    latestUnitCost: number | null;
    averageUnitCost: number | null;
    latestListedSalePrice: number | null;
};

function normalizeTextValue(value: string) {
    return value.trim().toLowerCase();
}

function toNumericValue(value: string) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function compareTextOperator(leftRaw: string, operator: CategoryConditionOperator, rightRaw: string) {
    const left = normalizeTextValue(leftRaw);
    const right = normalizeTextValue(rightRaw);
    if (!right) return true;

    switch (operator) {
        case "EQ":
            return left === right;
        case "NEQ":
            return left !== right;
        case "STARTS_WITH":
            return left.startsWith(right);
        case "ENDS_WITH":
            return left.endsWith(right);
        case "CONTAINS":
            return left.includes(right);
        case "NOT_CONTAINS":
            return !left.includes(right);
        default:
            return left.includes(right);
    }
}

function compareNumberOperator(left: number | null, operator: CategoryConditionOperator, right: number | null) {
    if (left === null || right === null) return false;
    switch (operator) {
        case "EQ":
            return left === right;
        case "NEQ":
            return left !== right;
        case "GT":
            return left > right;
        case "LT":
            return left < right;
        default:
            return false;
    }
}

function buildProductPurchaseMetrics(purchaseOrders: PurchaseOrder[]) {
    const byProduct = new Map<string, { latestAt: number; latestUnitCost: number; sumUnitCost: number; count: number; latestListedSalePrice: number }>();

    purchaseOrders.forEach((order) => {
        if (order.status === "DRAFT" || order.status === "CANCELLED") return;
        const orderTime = new Date(order.purchaseDate).getTime();
        order.lines.forEach((line) => {
            if (!line.productId) return;
            const current = byProduct.get(line.productId) ?? {
                latestAt: Number.NEGATIVE_INFINITY,
                latestUnitCost: 0,
                sumUnitCost: 0,
                count: 0,
                latestListedSalePrice: 0,
            };
            current.sumUnitCost += Math.max(0, line.unitCost);
            current.count += 1;

            if (orderTime >= current.latestAt) {
                current.latestAt = orderTime;
                current.latestUnitCost = Math.max(0, line.unitCost);
                const listed = Math.max(0, line.unitCost + (line.unitCost * (Math.max(0, line.taxPercent) / 100)));
                current.latestListedSalePrice = listed;
            }
            byProduct.set(line.productId, current);
        });
    });

    const metrics = new Map<string, ProductPurchaseMetrics>();
    byProduct.forEach((value, productId) => {
        metrics.set(productId, {
            latestUnitCost: value.count > 0 ? value.latestUnitCost : null,
            averageUnitCost: value.count > 0 ? value.sumUnitCost / value.count : null,
            latestListedSalePrice: value.count > 0 ? value.latestListedSalePrice : null,
        });
    });
    return metrics;
}

function evaluateCategoryCondition(
    product: CatalogProduct,
    condition: CategoryCondition,
    purchaseMetrics: ProductPurchaseMetrics
) {
    switch (condition.field) {
        case "TITLE":
            return compareTextOperator(product.name, condition.operator, condition.value);
        case "SKU":
            return compareTextOperator(product.sku, condition.operator, condition.value);
        case "TAG": {
            const joined = product.tags.join(" ");
            return compareTextOperator(joined, condition.operator, condition.value);
        }
        case "STATUS":
            return compareTextOperator(product.status, condition.operator, condition.value);
        case "INVENTORY":
            return compareNumberOperator(product.inventory, condition.operator, toNumericValue(condition.value));
        case "LATEST_PURCHASE_ORDER_UNIT_COST":
            return compareNumberOperator(purchaseMetrics.latestUnitCost, condition.operator, toNumericValue(condition.value));
        case "AVERAGE_PURCHASE_ORDER_UNIT_COST":
            return compareNumberOperator(purchaseMetrics.averageUnitCost, condition.operator, toNumericValue(condition.value));
        case "LISTED_SALE_PRICE":
            return compareNumberOperator(purchaseMetrics.latestListedSalePrice, condition.operator, toNumericValue(condition.value));
        default:
            return false;
    }
}

function evaluateSmartCategoryMatch(
    product: CatalogProduct,
    category: ProductCategoryDefinition,
    purchaseMetrics: ProductPurchaseMetrics
) {
    if (category.conditions.length === 0) return false;
    const matches = category.conditions.map((condition) => (
        evaluateCategoryCondition(product, condition, purchaseMetrics)
    ));
    if (category.conditionMode === "ANY") return matches.some(Boolean);
    return matches.every(Boolean);
}

function buildProductConditionSummary(category: ProductCategoryDefinition) {
    if (category.type === "MANUAL") return "Manual category";
    const modeText = category.conditionMode === "ANY" ? "Any condition" : "All conditions";
    return `${modeText} (${category.conditions.length})`;
}

function dedupeCategoryIds(ids: string[]) {
    return Array.from(new Set(ids.map((id) => toVariantId(id)).filter(Boolean)));
}

export function getProductCategoryTitles(product: CatalogProduct, categories: ProductCategoryDefinition[]) {
    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const titles: string[] = [];
    const seen = new Set<string>();
    dedupeCategoryIds(product.categoryIds).forEach((categoryId) => {
        const title = categoryById.get(categoryId)?.title?.trim() ?? "";
        if (!title) return;
        const normalized = title.toLowerCase();
        if (seen.has(normalized)) return;
        seen.add(normalized);
        titles.push(title);
    });
    if (titles.length === 0 && product.category.trim().length > 0) {
        titles.push(product.category.trim());
    }
    return titles;
}

export function reconcileCatalogProductsAndCategories(input: {
    products: CatalogProduct[];
    categories: ProductCategoryDefinition[];
    purchaseOrders?: PurchaseOrder[];
}) {
    const categories = cloneProductCategoryDefinitions(input.categories);
    const products = input.products.map(cloneCatalogProduct);
    const manualCategories = categories.filter((category) => category.type === "MANUAL");
    const smartCategories = categories.filter((category) => category.type === "SMART");
    const manualCategoryIds = new Set(manualCategories.map((category) => category.id));
    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const categoryIdByTitle = new Map(categories.map((category) => [category.title.trim().toLowerCase(), category.id]));
    const purchaseMetricsByProductId = buildProductPurchaseMetrics(input.purchaseOrders ?? []);

    const manualByProduct = new Map<string, Set<string>>();
    products.forEach((product) => {
        const fromProduct = dedupeCategoryIds(product.categoryIds).filter((categoryId) => manualCategoryIds.has(categoryId));
        const fromLegacy = categoryIdByTitle.get(product.category.trim().toLowerCase() ?? "");
        const current = new Set<string>(fromProduct);
        if (fromLegacy && manualCategoryIds.has(fromLegacy)) {
            current.add(fromLegacy);
        }
        manualByProduct.set(product.id, current);
    });

    manualCategories.forEach((category) => {
        category.manualProductIds.forEach((productId) => {
            const current = manualByProduct.get(productId) ?? new Set<string>();
            current.add(category.id);
            manualByProduct.set(productId, current);
        });
    });

    const smartByProduct = new Map<string, Set<string>>();
    products.forEach((product) => {
        const metrics = purchaseMetricsByProductId.get(product.id) ?? {
            latestUnitCost: null,
            averageUnitCost: null,
            latestListedSalePrice: null,
        };
        const next = new Set<string>();
        smartCategories.forEach((category) => {
            if (evaluateSmartCategoryMatch(product, category, metrics)) {
                next.add(category.id);
            }
        });
        smartByProduct.set(product.id, next);
    });

    products.forEach((product) => {
        const manualIds = Array.from(manualByProduct.get(product.id) ?? new Set<string>());
        const smartIds = Array.from(smartByProduct.get(product.id) ?? new Set<string>());
        const mergedIds = [...manualIds, ...smartIds];
        product.categoryIds = dedupeCategoryIds(mergedIds);

        const primaryManualId = manualIds[0];
        if (primaryManualId) {
            product.category = categoryById.get(primaryManualId)?.title ?? product.category;
        } else if (product.categoryIds.length > 0) {
            product.category = categoryById.get(product.categoryIds[0])?.title ?? product.category;
        }
    });

    const productIdsByCategory = new Map<string, Set<string>>();
    categories.forEach((category) => {
        productIdsByCategory.set(category.id, new Set<string>());
    });
    products.forEach((product) => {
        product.categoryIds.forEach((categoryId) => {
            const set = productIdsByCategory.get(categoryId);
            if (!set) return;
            set.add(product.id);
        });
    });

    categories.forEach((category) => {
        const productIds = productIdsByCategory.get(category.id) ?? new Set<string>();
        category.products = productIds.size;
        category.productCondition = buildProductConditionSummary(category);
        if (category.type === "MANUAL") {
            category.manualProductIds = Array.from(productIds);
        } else {
            category.manualProductIds = [];
        }
    });

    return { products, categories };
}
