"use client";

import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type DragEvent as ReactDragEvent,
    type PointerEvent as ReactPointerEvent,
} from "react";
import { ArrowLeftRight, CalendarDays, Check, ChevronDown, ChevronUp, DollarSign, GripVertical, Maximize2, Minimize2, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { PortalModal } from "@/components/PortalModal";
import { PortalPageTitle } from "@/components/PortalPageTitle";
import { Tooltip } from "@/components/Tooltip";
import {
    DASHBOARD_CURRENCY_EMPTY_MESSAGE,
    DASHBOARD_CURRENCY_SEARCH_PLACEHOLDER,
    DASHBOARD_DATE_ALL_LABEL,
    DASHBOARD_DATE_APPLY_LABEL,
    DASHBOARD_DATE_DIALOG_LABEL,
    DASHBOARD_DATE_END_LABEL,
    DASHBOARD_DATE_PRESET_OPTIONS,
    DASHBOARD_DATE_START_LABEL,
    DASHBOARD_DATE_WEEKDAY_LABELS,
    DASHBOARD_DEFAULT_SECTION_ID,
    DASHBOARD_DEFAULT_SECTION_NAME,
    DASHBOARD_FALLBACK_USD_RATES,
    DASHBOARD_GRID_COLUMNS,
    DASHBOARD_GRID_MIN_COLS,
    DASHBOARD_GRID_MIN_ROWS,
    DASHBOARD_GRID_ROW_SIZE,
    DASHBOARD_LAYOUT_STORAGE_KEY,
    DASHBOARD_MOBILE_BREAKPOINT,
    DASHBOARD_SECTION_MIN_ROWS,
    DASHBOARD_TIME_SPECIFIC_BADGE,
    DASHBOARD_TIME_SPECIFIC_WIDGETS,
    DASHBOARD_UNNAMED_SECTION_NAME,
    DASHBOARD_WIDGET_COPY,
    DASHBOARD_WIDGETS,
    DASHBOARD_WIDGETS_BY_ID,
    DAY_MS,
    LANGUAGE_TO_LOCALE,
    type DashboardDatePreset,
    type DashboardDateRange,
    type DashboardLayoutState,
    type DashboardMetrics,
    type DashboardSectionLayout,
    type DashboardWidgetLayout,
    type DashboardWidgetLocaleCopy,
    type WidgetSize,
} from "@/components/dashboard/viewConfig";
import {
    applyWidgetRectChangeForSection,
    areLayoutsEqual,
    areRectsEqual,
    areSectionsEqual,
    buildDefaultDashboardLayoutState,
    buildPlacedWidgetLayout,
    cloneLayoutSections,
    cloneLayoutWidgets,
    compactVisibleWidgetLayoutForSection,
    ensureDashboardLayoutWidget,
    getDraggedWidgetIdFromDataTransfer,
    getWidgetMaxRect,
    normalizeLayoutSections,
    normalizeLayoutWidgets,
    type DashboardInteractionState,
    type DashboardPlacedWidget,
    type DashboardRect,
} from "@/components/dashboard/layoutEngine";
import {
    buildCalendarMonthGrid,
    buildPresetDateRange,
    clamp,
    cn,
    convertCurrencyAmount,
    convertMetricsCurrency,
    formatLastUpdatedTime,
    getCurrencyDisplayLabel,
    getCurrencySelectorLabel,
    getLocalIsoCurrencyCodes,
    isIsoCurrencyCode,
    normalizeDateRange,
    normalizeLineSeries,
    normalizeSparkline,
    parseDateInputToStart,
    parseTimestamp,
    resolveDateRangeTimestamps,
    sampleSeries,
    toDayKey,
    toPercentage,
    toScatterChartPoints,
    toStartOfDay,
} from "@/components/dashboard/viewHelpers";
import {
    DASHBOARD_WIDGET_MENU_EVENT,
    type DashboardWidgetMenuEventDetail,
} from "@/components/dashboardEditorEvents";
import { usePendingChangesHeader } from "@/components/usePendingChangesHeader";
import { getDashboardMessages } from "@/i18n/dashboard";
import { usePortalI18n } from "@/i18n/PortalI18nContext";
import { SUPPORTED_CURRENCIES } from "@/i18n/portal";
import { fetchCatalogStateFromApi, getCachedCatalogStateSnapshot, type CatalogStateSnapshot } from "@/lib/catalogStateClient";

function parseStoredDashboardLayout(raw: string | null): DashboardLayoutState | null {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as {
            version?: unknown;
            widgets?: unknown;
            sections?: unknown;
            lastEditedAt?: unknown;
        };

        if ((parsed.version !== 1 && parsed.version !== 2) || !Array.isArray(parsed.widgets)) return null;

        const rawSections = parsed.version === 2 && Array.isArray(parsed.sections)
            ? parsed.sections
                .map((entry) => {
                    if (!entry || typeof entry !== "object") return null;
                    const record = entry as Partial<DashboardSectionLayout>;
                    if (typeof record.id !== "string") return null;
                    return {
                        id: record.id,
                        name: typeof record.name === "string" ? record.name : DASHBOARD_UNNAMED_SECTION_NAME,
                        collapsed: record.collapsed === true,
                        minRows: typeof record.minRows === "number" ? record.minRows : DASHBOARD_SECTION_MIN_ROWS,
                        order: typeof record.order === "number" ? record.order : 0,
                    } satisfies DashboardSectionLayout;
                })
                .filter((entry): entry is DashboardSectionLayout => Boolean(entry))
            : [
                {
                    id: DASHBOARD_DEFAULT_SECTION_ID,
                    name: DASHBOARD_DEFAULT_SECTION_NAME,
                    collapsed: false,
                    minRows: DASHBOARD_SECTION_MIN_ROWS,
                    order: 0,
                },
            ];

        const sections = normalizeLayoutSections(rawSections);

        const rawWidgets = parsed.widgets
            .map((entry) => {
                if (!entry || typeof entry !== "object") return null;
                const record = entry as Partial<DashboardWidgetLayout> & { size?: WidgetSize };
                if (typeof record.id !== "string") return null;
                const legacySize = record.size;
                const legacyDefinition = DASHBOARD_WIDGETS_BY_ID.get(record.id);
                const legacySpan = (legacyDefinition && legacySize && legacyDefinition.spans[legacySize])
                    ? legacyDefinition.spans[legacySize]
                    : legacyDefinition?.spans[legacyDefinition.defaultSize];
                return {
                    id: record.id,
                    sectionId: typeof record.sectionId === "string" ? record.sectionId : DASHBOARD_DEFAULT_SECTION_ID,
                    visible: record.visible !== false,
                    x: typeof record.x === "number" ? record.x : 0,
                    y: typeof record.y === "number" ? record.y : 0,
                    w: typeof record.w === "number" ? record.w : legacySpan?.cols ?? 3,
                    h: typeof record.h === "number" ? record.h : legacySpan?.rows ?? 2,
                    order: typeof record.order === "number" ? record.order : 0,
                } satisfies DashboardWidgetLayout;
            })
            .filter((entry): entry is DashboardWidgetLayout => Boolean(entry));

        const widgets = normalizeLayoutWidgets(rawWidgets, sections);
        const lastEditedAt = typeof parsed.lastEditedAt === "number" && Number.isFinite(parsed.lastEditedAt)
            ? parsed.lastEditedAt
            : null;

        return {
            sections,
            widgets,
            lastEditedAt,
        };
    } catch {
        return null;
    }
}

function buildEmptyMetrics(): DashboardMetrics {
    return {
        inventoryCostValue: 0,
        inventoryRetailValue: 0,
        inventoryMarginPotential: 0,
        unitsInStock: 0,
        activeProducts: 0,
        activeProductsInStock: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        activeCoveragePercent: 0,
        catalogCoveragePercent: 0,
        salesLast30Revenue: 0,
        salesLast30Units: 0,
        salesLast30Orders: 0,
        salesLast30Points: [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20],
        marginLast30Amount: 0,
        marginLast30Percent: 0,
        categoryRows: [],
        inventoryAgeAverageDays: 0,
        inventoryAgeOldestDays: 0,
        inventoryAgeNewestDays: 0,
        stockRiskRows: [],
        topStockRows: [],
        movementRows: [],
        costOfGoodsSold: 0,
        profitTotal: 0,
        averageProfitPerOrder: 0,
        averageProfitPerUnit: 0,
        averageProfitPerProduct: 0,
        averageMarginPercent: 0,
        averageRoiPercent: 0,
        averageMarginPerCategory: 0,
        averageRoiPerCategory: 0,
        averageMarginPerProduct: 0,
        averageRoiPerProduct: 0,
        soldProductsCount: 0,
        categoryProfitRows: [],
        cumulativeProfitPoints: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50],
        priceProfitPoints: [],
        holdingProfitPoints: [],
        variantPerformanceTitle: "Variant",
        variantPerformanceRows: [],
    };
}

function buildDashboardMetrics(
    catalogState: CatalogStateSnapshot | null,
    range?: { startAt: number | null; endAt: number | null },
    storeCurrency = "EUR",
    usdRates: Record<string, number> = DASHBOARD_FALLBACK_USD_RATES
): DashboardMetrics {
    const empty = buildEmptyMetrics();
    if (!catalogState) return empty;

    const products = catalogState.products;
    const batches = catalogState.inventoryBatches;
    const sales = catalogState.inventorySales;
    if (products.length === 0 && batches.length === 0 && sales.length === 0) return empty;

    const now = Date.now();
    const hasDateFilter = range?.startAt !== null && range?.endAt !== null;
    const rangeStart = range?.startAt ?? null;
    const rangeEnd = range?.endAt ?? null;
    const normalizeCurrencyCode = (value: string | null | undefined) => {
        const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
        return isIsoCurrencyCode(normalized) ? normalized : storeCurrency;
    };
    const toStoreCurrency = (value: number, sourceCurrency: string | null | undefined) => (
        convertCurrencyAmount(value, normalizeCurrencyCode(sourceCurrency), storeCurrency, usdRates)
    );

    const categoryById = new Map(catalogState.categoryDefinitions.map((category) => [category.id, category.title]));
    const variantLabelById = new Map(catalogState.variantDefinitions.map((variant) => [variant.id, variant.label]));
    const productById = new Map(products.map((product) => [product.id, product]));
    const batchById = new Map(batches.map((batch) => [batch.id, batch]));
    const onHandByProduct = new Map<string, number>();
    const costByProduct = new Map<string, number>();

    let inventoryCostValue = 0;
    let inventoryRetailValue = 0;
    let unitsInStock = 0;
    const ageSamples: number[] = [];

    batches.forEach((batch) => {
        const remaining = Math.max(0, batch.remainingQuantity);
        if (remaining <= 0) return;

        unitsInStock += remaining;
        onHandByProduct.set(batch.productId, (onHandByProduct.get(batch.productId) ?? 0) + remaining);

        const cost = remaining * toStoreCurrency(Math.max(0, batch.purchaseUnitPrice), batch.purchaseCurrency);
        const retail = remaining * toStoreCurrency(Math.max(0, batch.saleUnitPrice), batch.saleCurrency);
        inventoryCostValue += cost;
        inventoryRetailValue += retail;
        costByProduct.set(batch.productId, (costByProduct.get(batch.productId) ?? 0) + cost);

        const timestamp = parseTimestamp(batch.purchaseDate) ?? parseTimestamp(batch.createdAt);
        if (timestamp !== null) {
            ageSamples.push((now - timestamp) / DAY_MS);
        }
    });

    let salesLast30Revenue = 0;
    let salesLast30Units = 0;
    let salesLast30Orders = 0;
    let marginLast30Amount = 0;
    let costOfGoodsSold = 0;

    const revenueByDay = new Map<string, number>();
    const profitByDay = new Map<string, number>();
    const soldProductIds = new Set<string>();
    const categoryProfitByLabel = new Map<string, { revenue: number; cost: number; profit: number; orders: number; units: number }>();
    const productProfitById = new Map<string, { revenue: number; cost: number; profit: number; orders: number; units: number }>();
    const variantPerformanceById = new Map<string, Map<string, { profit: number; cost: number; orders: number; units: number }>>();
    const priceProfitPointsRaw: Array<{ price: number; profitPerUnit: number }> = [];
    const holdingProfitPointsRaw: Array<{ holdingDays: number; profitPerUnit: number }> = [];

    sales.forEach((sale) => {
        const saleTimestamp = parseTimestamp(sale.soldAt);
        if (saleTimestamp === null) return;
        if (hasDateFilter && rangeStart !== null && rangeEnd !== null && (saleTimestamp < rangeStart || saleTimestamp > rangeEnd)) return;

        const quantity = Math.max(0, sale.quantity);
        if (quantity <= 0) return;
        const amount = toStoreCurrency(Math.max(0, sale.totalAmount), sale.currency);
        salesLast30Revenue += amount;
        salesLast30Units += quantity;
        salesLast30Orders += 1;

        const dayKey = toDayKey(saleTimestamp);
        revenueByDay.set(dayKey, (revenueByDay.get(dayKey) ?? 0) + amount);

        const linkedBatch = batchById.get(sale.batchId);
        const estimatedUnitCost = linkedBatch
            ? toStoreCurrency(Math.max(0, linkedBatch.purchaseUnitPrice), linkedBatch.purchaseCurrency)
            : toStoreCurrency(Math.max(0, sale.saleUnitPrice - Math.max(0, sale.discountPerUnit)), sale.currency);
        const costAmount = estimatedUnitCost * quantity;
        const profitAmount = amount - costAmount;
        costOfGoodsSold += costAmount;
        marginLast30Amount += profitAmount;
        profitByDay.set(dayKey, (profitByDay.get(dayKey) ?? 0) + profitAmount);

        const product = productById.get(sale.productId);
        const categoryLabel = categoryById.get(product?.category ?? "") ?? product?.category ?? "Uncategorized";
        soldProductIds.add(sale.productId);

        const categoryAggregate = categoryProfitByLabel.get(categoryLabel) ?? { revenue: 0, cost: 0, profit: 0, orders: 0, units: 0 };
        categoryAggregate.revenue += amount;
        categoryAggregate.cost += costAmount;
        categoryAggregate.profit += profitAmount;
        categoryAggregate.orders += 1;
        categoryAggregate.units += quantity;
        categoryProfitByLabel.set(categoryLabel, categoryAggregate);

        const productAggregate = productProfitById.get(sale.productId) ?? { revenue: 0, cost: 0, profit: 0, orders: 0, units: 0 };
        productAggregate.revenue += amount;
        productAggregate.cost += costAmount;
        productAggregate.profit += profitAmount;
        productAggregate.orders += 1;
        productAggregate.units += quantity;
        productProfitById.set(sale.productId, productAggregate);

        const profitPerUnit = quantity > 0 ? profitAmount / quantity : 0;
        priceProfitPointsRaw.push({
            price: toStoreCurrency(Math.max(0, sale.saleUnitPrice), sale.currency),
            profitPerUnit,
        });

        const purchaseTimestamp = linkedBatch
            ? (parseTimestamp(`${linkedBatch.purchaseDate}T00:00:00.000Z`) ?? parseTimestamp(linkedBatch.createdAt))
            : null;
        if (purchaseTimestamp !== null) {
            holdingProfitPointsRaw.push({
                holdingDays: Math.max(0, (saleTimestamp - purchaseTimestamp) / DAY_MS),
                profitPerUnit,
            });
        }

        const variantValues = linkedBatch?.variantValues ?? {};
        Object.entries(variantValues).forEach(([variantId, rawValue]) => {
            const value = rawValue.trim();
            if (!value) return;
            const variantValueMap = variantPerformanceById.get(variantId) ?? new Map<string, { profit: number; cost: number; orders: number; units: number }>();
            const variantAggregate = variantValueMap.get(value) ?? { profit: 0, cost: 0, orders: 0, units: 0 };
            variantAggregate.profit += profitAmount;
            variantAggregate.cost += costAmount;
            variantAggregate.orders += 1;
            variantAggregate.units += quantity;
            variantValueMap.set(value, variantAggregate);
            variantPerformanceById.set(variantId, variantValueMap);
        });
    });

    const activeProducts = products.filter((product) => product.status === "ACTIVE");
    const totalProducts = products.length;
    const activeProductsInStock = activeProducts.filter((product) => (onHandByProduct.get(product.id) ?? 0) > 0).length;
    const outOfStockCount = activeProducts.filter((product) => (onHandByProduct.get(product.id) ?? 0) <= 0).length;
    const lowStockCount = activeProducts.filter((product) => {
        const amount = onHandByProduct.get(product.id) ?? 0;
        return amount > 0 && amount <= 3;
    }).length;

    const categoryCountMap = new Map<string, number>();
    products.forEach((product) => {
        const categoryLabel = categoryById.get(product.category) ?? product.category;
        categoryCountMap.set(categoryLabel, (categoryCountMap.get(categoryLabel) ?? 0) + 1);
    });

    const categoryRows = Array.from(categoryCountMap.entries())
        .sort((left, right) => right[1] - left[1])
        .slice(0, 5)
        .map(([label, count]) => ({
            label,
            count,
            share: toPercentage(count, Math.max(1, totalProducts)),
        }));

    const inventoryAgeAverageDays = ageSamples.length > 0
        ? Math.round(ageSamples.reduce((sum, value) => sum + value, 0) / ageSamples.length)
        : 0;
    const inventoryAgeOldestDays = ageSamples.length > 0 ? Math.round(Math.max(...ageSamples)) : 0;
    const inventoryAgeNewestDays = ageSamples.length > 0 ? Math.round(Math.min(...ageSamples)) : 0;

    const stockRiskRows = activeProducts
        .map((product) => ({
            label: product.name || product.sku || product.id,
            onHand: onHandByProduct.get(product.id) ?? 0,
        }))
        .filter((entry) => entry.onHand <= 3)
        .sort((left, right) => left.onHand - right.onHand)
        .slice(0, 6);

    const topStockRows = products
        .map((product) => {
            const units = onHandByProduct.get(product.id) ?? 0;
            if (units <= 0) return null;
            return {
                name: product.name || product.sku || product.id,
                units,
                value: costByProduct.get(product.id) ?? 0,
            };
        })
        .filter((entry): entry is { name: string; units: number; value: number } => Boolean(entry))
        .sort((left, right) => right.units - left.units || right.value - left.value)
        .slice(0, 6);

    const movementRows = [
        ...batches.map((batch) => {
            const timestamp = parseTimestamp(batch.createdAt) ?? parseTimestamp(batch.purchaseDate) ?? 0;
            const product = productById.get(batch.productId);
            return {
                id: `purchase-${batch.id}`,
                label: product?.name || product?.sku || batch.productId,
                quantity: Math.max(0, batch.quantity),
                amount: Math.max(0, batch.quantity) * toStoreCurrency(Math.max(0, batch.purchaseUnitPrice), batch.purchaseCurrency),
                kind: "purchase" as const,
                timestamp,
            };
        }),
        ...sales.map((sale) => {
            const timestamp = parseTimestamp(sale.soldAt) ?? 0;
            const product = productById.get(sale.productId);
            return {
                id: `sale-${sale.id}`,
                label: product?.name || product?.sku || sale.productId,
                quantity: Math.max(0, sale.quantity),
                amount: toStoreCurrency(Math.max(0, sale.totalAmount), sale.currency),
                kind: "sale" as const,
                timestamp,
            };
        }),
    ]
        .filter((entry) => {
            if (!hasDateFilter || rangeStart === null || rangeEnd === null) return true;
            return entry.timestamp >= rangeStart && entry.timestamp <= rangeEnd;
        })
        .sort((left, right) => right.timestamp - left.timestamp)
        .slice(0, 8)
        .map((entry) => ({
            id: entry.id,
            label: entry.label,
            quantity: entry.quantity,
            amount: entry.amount,
            kind: entry.kind,
        }));

    const sparklineEnd = hasDateFilter && rangeEnd !== null ? rangeEnd : now;
    const sparklineStart = hasDateFilter && rangeStart !== null
        ? rangeStart
        : sparklineEnd - (29 * DAY_MS);
    const sparklineDays = Math.max(1, Math.round((toStartOfDay(sparklineEnd) - toStartOfDay(sparklineStart)) / DAY_MS) + 1);
    const bucketCount = Math.min(12, sparklineDays);
    const bucketSize = Math.max(1, Math.ceil(sparklineDays / Math.max(1, bucketCount)));
    const sparklineBuckets = Array.from({ length: bucketCount }, (_, bucketIndex) => {
        const bucketStart = toStartOfDay(sparklineStart) + (bucketIndex * bucketSize * DAY_MS);
        const bucketEnd = bucketStart + (bucketSize * DAY_MS) - 1;
        let revenueValue = 0;
        let profitValue = 0;
        revenueByDay.forEach((amount, dayKey) => {
            const timestamp = parseTimestamp(`${dayKey}T00:00:00.000Z`);
            if (timestamp === null) return;
            if (timestamp >= bucketStart && timestamp <= bucketEnd) {
                revenueValue += amount;
            }
        });
        profitByDay.forEach((amount, dayKey) => {
            const timestamp = parseTimestamp(`${dayKey}T00:00:00.000Z`);
            if (timestamp === null) return;
            if (timestamp >= bucketStart && timestamp <= bucketEnd) {
                profitValue += amount;
            }
        });
        return { revenue: revenueValue, profit: profitValue };
    });
    const salesLast30Points = normalizeSparkline(sparklineBuckets.map((entry) => entry.revenue));
    const cumulativeProfitRaw: number[] = [];
    sparklineBuckets.reduce((running, bucket) => {
        const next = running + bucket.profit;
        cumulativeProfitRaw.push(next);
        return next;
    }, 0);
    const cumulativeProfitPoints = normalizeLineSeries(cumulativeProfitRaw);

    const marginLast30Percent = salesLast30Revenue > 0
        ? Math.round((marginLast30Amount / salesLast30Revenue) * 1000) / 10
        : 0;
    const profitTotal = salesLast30Revenue - costOfGoodsSold;
    const soldProductsCount = soldProductIds.size;
    const averageProfitPerOrder = salesLast30Orders > 0 ? profitTotal / salesLast30Orders : 0;
    const averageProfitPerUnit = salesLast30Units > 0 ? profitTotal / salesLast30Units : 0;
    const averageProfitPerProduct = soldProductsCount > 0 ? profitTotal / soldProductsCount : 0;
    const averageMarginPercent = salesLast30Revenue > 0 ? Math.round((profitTotal / salesLast30Revenue) * 1000) / 10 : 0;
    const averageRoiPercent = costOfGoodsSold > 0 ? Math.round((profitTotal / costOfGoodsSold) * 1000) / 10 : 0;

    const categoryProfitRows = Array.from(categoryProfitByLabel.entries())
        .map(([label, values]) => {
            const margin = values.revenue > 0 ? (values.profit / values.revenue) * 100 : 0;
            const roi = values.cost > 0 ? (values.profit / values.cost) * 100 : 0;
            return {
                label,
                revenue: values.revenue,
                cost: values.cost,
                profit: values.profit,
                margin: Math.round(margin * 10) / 10,
                roi: Math.round(roi * 10) / 10,
                units: values.units,
            };
        })
        .sort((left, right) => right.profit - left.profit)
        .slice(0, 6);

    const averageMarginPerCategory = categoryProfitRows.length > 0
        ? Math.round((categoryProfitRows.reduce((sum, row) => sum + row.margin, 0) / categoryProfitRows.length) * 10) / 10
        : 0;
    const averageRoiPerCategory = categoryProfitRows.length > 0
        ? Math.round((categoryProfitRows.reduce((sum, row) => sum + row.roi, 0) / categoryProfitRows.length) * 10) / 10
        : 0;

    const productProfitRows = [...productProfitById.values()];
    const averageMarginPerProduct = productProfitRows.length > 0
        ? Math.round(
            (productProfitRows.reduce(
                (sum, row) => sum + (row.revenue > 0 ? (row.profit / row.revenue) * 100 : 0),
                0
            ) / productProfitRows.length) * 10
        ) / 10
        : 0;
    const averageRoiPerProduct = productProfitRows.length > 0
        ? Math.round(
            (productProfitRows.reduce(
                (sum, row) => sum + (row.cost > 0 ? (row.profit / row.cost) * 100 : 0),
                0
            ) / productProfitRows.length) * 10
        ) / 10
        : 0;

    const priceProfitPoints = sampleSeries(priceProfitPointsRaw, 120);
    const holdingProfitPoints = sampleSeries(holdingProfitPointsRaw, 120);

    let variantPerformanceTitle = "Variant values";
    let variantPerformanceRows: Array<{ label: string; profit: number; roi: number; orders: number }> = [];
    if (variantPerformanceById.size > 0) {
        const variantFocus = [...variantPerformanceById.entries()]
            .map(([variantId, valueMap]) => ({
                variantId,
                totalOrders: [...valueMap.values()].reduce((sum, row) => sum + row.orders, 0),
            }))
            .sort((left, right) => right.totalOrders - left.totalOrders)[0];

        if (variantFocus) {
            variantPerformanceTitle = variantLabelById.get(variantFocus.variantId) ?? variantFocus.variantId;
            const valuesMap = variantPerformanceById.get(variantFocus.variantId) ?? new Map();
            variantPerformanceRows = [...valuesMap.entries()]
                .map(([label, values]) => ({
                    label,
                    profit: values.profit,
                    roi: values.cost > 0 ? Math.round((values.profit / values.cost) * 1000) / 10 : 0,
                    orders: values.orders,
                }))
                .sort((left, right) => right.profit - left.profit || right.orders - left.orders)
                .slice(0, 6);
        }
    }

    return {
        inventoryCostValue,
        inventoryRetailValue,
        inventoryMarginPotential: inventoryRetailValue - inventoryCostValue,
        unitsInStock,
        activeProducts: activeProducts.length,
        activeProductsInStock,
        lowStockCount,
        outOfStockCount,
        activeCoveragePercent: toPercentage(activeProductsInStock, Math.max(1, activeProducts.length)),
        catalogCoveragePercent: toPercentage(activeProductsInStock, Math.max(1, totalProducts)),
        salesLast30Revenue,
        salesLast30Units,
        salesLast30Orders,
        salesLast30Points,
        marginLast30Amount,
        marginLast30Percent,
        categoryRows,
        inventoryAgeAverageDays,
        inventoryAgeOldestDays,
        inventoryAgeNewestDays,
        stockRiskRows,
        topStockRows,
        movementRows,
        costOfGoodsSold,
        profitTotal,
        averageProfitPerOrder,
        averageProfitPerUnit,
        averageProfitPerProduct,
        averageMarginPercent,
        averageRoiPercent,
        averageMarginPerCategory,
        averageRoiPerCategory,
        averageMarginPerProduct,
        averageRoiPerProduct,
        soldProductsCount,
        categoryProfitRows,
        cumulativeProfitPoints,
        priceProfitPoints,
        holdingProfitPoints,
        variantPerformanceTitle,
        variantPerformanceRows,
    };
}

function getWidgetDataDescriptor(widgetId: string) {
    const descriptors: Record<string, { heading: string; description: string }> = {
        "inventory-value": {
            heading: "Inventory valuation",
            description: "Current on-hand retail value, cost basis, and potential margin from unsold stock.",
        },
        "inventory-units": {
            heading: "On-hand units",
            description: "How many units are currently available across active inventory records.",
        },
        "product-coverage": {
            heading: "Coverage ratio",
            description: "Share of products with stock available, versus active products and full catalog.",
        },
        "stock-alerts": {
            heading: "Risk watch",
            description: "Products currently at zero stock or low stock thresholds.",
        },
        "sales-30d": {
            heading: "Sales trend",
            description: "Revenue trend and order flow within the selected date window.",
        },
        "margin-30d": {
            heading: "Margin trend",
            description: "Estimated gross margin performance in the selected date window.",
        },
        "category-balance": {
            heading: "Category mix",
            description: "Distribution of product count across your categories.",
        },
        "inventory-age": {
            heading: "Aging profile",
            description: "Average, oldest, and newest age of currently held inventory.",
        },
        "top-stock": {
            heading: "Stock concentration",
            description: "Products with the largest remaining on-hand unit positions.",
        },
        "recent-movements": {
            heading: "Movement feed",
            description: "Latest purchases and sales in the selected date window.",
        },
        "total-units-sold": {
            heading: "Total units sold",
            description: "Total sold quantity in the active comparison window.",
        },
        "cogs-total": {
            heading: "Cost of goods sold",
            description: "Estimated purchase-cost value for sold units in the selected window.",
        },
        "profit-total": {
            heading: "Total profit",
            description: "Estimated gross profit from all sales in the selected date window.",
        },
        "avg-profit": {
            heading: "Average profit",
            description: "Average profit per order, unit, and sold product.",
        },
        "avg-roi": {
            heading: "Average ROI",
            description: "Return on cost and margin averages across orders, products, and categories.",
        },
        "category-profit": {
            heading: "Category profit",
            description: "Category-level profitability split, including revenue, profit, and ROI.",
        },
        "cumulative-profit": {
            heading: "Cumulative profit curve",
            description: "Running profit accumulation across the selected date range.",
        },
        "price-profit-scatter": {
            heading: "Price versus profit",
            description: "Scatter view of sale unit price compared with unit-level profit.",
        },
        "holding-profit-scatter": {
            heading: "Holding period versus profit",
            description: "Scatter view of inventory holding days against unit-level profit.",
        },
        "variant-performance": {
            heading: "Variant performance",
            description: "Profit and ROI by value for the highest-activity variant.",
        },
    };

    const resolved = descriptors[widgetId] ?? {
        heading: "Widget data",
        description: "Current summary for this widget.",
    };

    return {
        ...resolved,
        timeSpecific: DASHBOARD_TIME_SPECIFIC_WIDGETS.has(widgetId),
    };
}

function renderWidgetLoadingBody(size: WidgetSize, twoRowCompact: boolean) {
    const skeletonSize = twoRowCompact ? "compact" : size;
    return (
        <div className="portalHomeDashboardWidgetLoading__S2m2R7" data-size={skeletonSize} aria-hidden="true">
            <span className="portalHomeDashboardWidgetLoadingBlock__C2m2R6 portalHomeDashboardWidgetLoadingBlockPrimary__L2m2R5" />
            <span className="portalHomeDashboardWidgetLoadingBlock__C2m2R6 portalHomeDashboardWidgetLoadingBlockSecondary__M2m2R4" />
            <span className="portalHomeDashboardWidgetLoadingBlock__C2m2R6 portalHomeDashboardWidgetLoadingBlockTertiary__P2m2R3" />
            <span className="portalHomeDashboardWidgetLoadingBlock__C2m2R6 portalHomeDashboardWidgetLoadingBlockChart__V2m2R8" />
        </div>
    );
}

function renderWidgetBody(
    widgetId: string,
    size: WidgetSize,
    metrics: DashboardMetrics,
    currencyFormatter: Intl.NumberFormat,
    fallbackText: string,
    twoRowCompact: boolean,
    copy: DashboardWidgetLocaleCopy
) {
    const compact = size === "sm" || size === "md";
    const tiny = size === "sm";
    const listLimit = tiny ? 2 : compact ? 3 : 5;
    const cumulativeLinePoints = metrics.cumulativeProfitPoints.slice(-(tiny ? 6 : compact ? 9 : 12));
    const cumulativeLinePath = cumulativeLinePoints.map((point, index, array) => {
        const x = array.length > 1 ? (index / (array.length - 1)) * 100 : 50;
        const y = 100 - point;
        return `${x},${y}`;
    }).join(" ");
    const scatterPointLimit = tiny ? 18 : compact ? 36 : 64;
    const priceScatterPoints = toScatterChartPoints(
        metrics.priceProfitPoints.map((point) => ({ x: point.price, y: point.profitPerUnit })),
        scatterPointLimit
    );
    const holdingScatterPoints = toScatterChartPoints(
        metrics.holdingProfitPoints.map((point) => ({ x: point.holdingDays, y: point.profitPerUnit })),
        scatterPointLimit
    );
    const variantRows = metrics.variantPerformanceRows.slice(0, listLimit);
    const maxVariantProfit = Math.max(1, ...variantRows.map((row) => Math.abs(row.profit)));
    const maxVariantRoi = Math.max(1, ...variantRows.map((row) => Math.abs(row.roi)));

    if (twoRowCompact) {
        switch (widgetId) {
            case "inventory-value":
                return <div className="portalHomeDashboardWidgetStat__Q7m2R4">{currencyFormatter.format(metrics.inventoryCostValue)}</div>;
            case "inventory-units":
                return <div className="portalHomeDashboardWidgetStat__Q7m2R4">{metrics.unitsInStock}</div>;
            case "product-coverage":
                return <div className="portalHomeDashboardWidgetStat__Q7m2R4">{metrics.activeCoveragePercent}%</div>;
            case "stock-alerts":
                return <div className="portalHomeDashboardWidgetStat__Q7m2R4">{metrics.lowStockCount}</div>;
            case "sales-30d":
                return <div className="portalHomeDashboardWidgetStat__Q7m2R4">{currencyFormatter.format(metrics.salesLast30Revenue)}</div>;
            case "margin-30d":
                return <div className="portalHomeDashboardWidgetStat__Q7m2R4">{metrics.marginLast30Percent}%</div>;
            case "category-balance":
                return (
                    <div className="portalHomeDashboardWidgetStat__Q7m2R4">
                        {metrics.categoryRows.length > 0 ? `${metrics.categoryRows[0].share}%` : "-"}
                    </div>
                );
            case "inventory-age":
                return <div className="portalHomeDashboardWidgetStat__Q7m2R4">{`${metrics.inventoryAgeAverageDays}d`}</div>;
            case "top-stock":
                return (
                    <div className="portalHomeDashboardWidgetStat__Q7m2R4">
                        {metrics.topStockRows.length > 0 ? metrics.topStockRows[0].units : "-"}
                    </div>
                );
            case "recent-movements":
                return <div className="portalHomeDashboardWidgetStat__Q7m2R4">{metrics.movementRows.length}</div>;
            case "total-units-sold":
                return <div className="portalHomeDashboardWidgetStat__Q7m2R4">{metrics.salesLast30Units}</div>;
            case "cogs-total":
                return <div className="portalHomeDashboardWidgetStat__Q7m2R4">{currencyFormatter.format(metrics.costOfGoodsSold)}</div>;
            case "profit-total":
                return <div className="portalHomeDashboardWidgetStat__Q7m2R4">{currencyFormatter.format(metrics.profitTotal)}</div>;
            case "avg-profit":
                return <div className="portalHomeDashboardWidgetStat__Q7m2R4">{currencyFormatter.format(metrics.averageProfitPerOrder)}</div>;
            case "avg-roi":
                return <div className="portalHomeDashboardWidgetStat__Q7m2R4">{metrics.averageRoiPercent}%</div>;
            case "category-profit":
                return (
                    <div className="portalHomeDashboardWidgetStat__Q7m2R4">
                        {metrics.categoryProfitRows.length > 0 ? currencyFormatter.format(metrics.categoryProfitRows[0].profit) : "-"}
                    </div>
                );
            case "cumulative-profit":
                return <div className="portalHomeDashboardWidgetStat__Q7m2R4">{currencyFormatter.format(metrics.profitTotal)}</div>;
            case "price-profit-scatter":
                return <div className="portalHomeDashboardWidgetStat__Q7m2R4">{metrics.priceProfitPoints.length}</div>;
            case "holding-profit-scatter":
                return <div className="portalHomeDashboardWidgetStat__Q7m2R4">{metrics.holdingProfitPoints.length}</div>;
            case "variant-performance":
                return (
                    <div className="portalHomeDashboardWidgetStat__Q7m2R4">
                        {variantRows.length > 0 ? currencyFormatter.format(variantRows[0].profit) : "-"}
                    </div>
                );
            default:
                return <div className="portalHomeDashboardWidgetStat__Q7m2R4">-</div>;
        }
    }

    switch (widgetId) {
        case "inventory-value":
            return (
                <>
                    <div className="portalHomeDashboardWidgetStat__Q7m2R4">
                        {currencyFormatter.format(metrics.inventoryCostValue)}
                    </div>
                    <ul className="portalHomeDashboardList__N7m2R1">
                        <li>
                            <span>{copy.labels.costValue}</span>
                            <strong>{currencyFormatter.format(metrics.inventoryCostValue)}</strong>
                        </li>
                        <li>
                            <span>{copy.labels.marginPotential}</span>
                            <strong>{currencyFormatter.format(metrics.inventoryMarginPotential)}</strong>
                        </li>
                    </ul>
                </>
            );
        case "inventory-units":
            return (
                <div className="portalHomeDashboardMetric__X4m2Q5">
                    <div className="portalHomeDashboardWidgetStat__Q7m2R4">{metrics.unitsInStock}</div>
                    <p>{copy.labels.activeProductsInStock.replace("{count}", String(metrics.activeProductsInStock))}</p>
                </div>
            );
        case "product-coverage":
            return (
                <div className="portalHomeDashboardProgress__W6m2Q4">
                    <div>
                        <div className="portalHomeDashboardProgressLabel__R4m2Q2">
                            <span>{copy.labels.activeCoverage}</span>
                            <strong>{metrics.activeCoveragePercent}%</strong>
                        </div>
                        <div className="portalHomeDashboardProgressTrack__J4m2Q4" aria-hidden="true">
                            <span style={{ width: `${metrics.activeCoveragePercent}%` }} />
                        </div>
                    </div>
                    {!tiny ? (
                        <div>
                            <div className="portalHomeDashboardProgressLabel__R4m2Q2">
                                <span>{copy.labels.catalogCoverage}</span>
                                <strong>{metrics.catalogCoveragePercent}%</strong>
                            </div>
                            <div className="portalHomeDashboardProgressTrack__J4m2Q4" aria-hidden="true">
                                <span style={{ width: `${metrics.catalogCoveragePercent}%` }} />
                            </div>
                        </div>
                    ) : null}
                </div>
            );
        case "stock-alerts":
            return (
                <div className="portalHomeDashboardMetric__X4m2Q5">
                    <ul className="portalHomeDashboardList__N7m2R1">
                        <li>
                            <span>{copy.labels.zeroStock}</span>
                            <strong>{metrics.outOfStockCount}</strong>
                        </li>
                        <li>
                            <span>{copy.labels.lowStock}</span>
                            <strong>{metrics.lowStockCount}</strong>
                        </li>
                    </ul>
                    {!tiny && metrics.stockRiskRows.length > 0 ? (
                        <ul className="portalHomeDashboardTags__H6m2Q4">
                            {metrics.stockRiskRows.slice(0, listLimit).map((row) => (
                                <li key={row.label}>
                                    <span>{row.label}</span>
                                    <small>{`${row.onHand} ${copy.labels.unitsShort}`}</small>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </div>
            );
        case "sales-30d":
            return (
                <>
                    <div className="portalHomeDashboardWidgetStat__Q7m2R4">
                        {currencyFormatter.format(metrics.salesLast30Revenue)}
                    </div>
                    <ul className="portalHomeDashboardList__N7m2R1">
                        <li>
                            <span>{copy.labels.orders}</span>
                            <strong>{metrics.salesLast30Orders}</strong>
                        </li>
                        <li>
                            <span>{copy.labels.unitsSold}</span>
                            <strong>{metrics.salesLast30Units}</strong>
                        </li>
                    </ul>
                    <div className="portalHomeDashboardSparkline__M6m2Q7" aria-hidden="true">
                        {metrics.salesLast30Points.slice(-(tiny ? 6 : compact ? 9 : 12)).map((point, index) => (
                            <span key={index} style={{ height: `${point}%` }} />
                        ))}
                    </div>
                </>
            );
        case "margin-30d":
            return (
                <div className="portalHomeDashboardMetric__X4m2Q5">
                    <div className="portalHomeDashboardWidgetStat__Q7m2R4">{metrics.marginLast30Percent}%</div>
                    <ul className="portalHomeDashboardList__N7m2R1">
                        <li>
                            <span>{copy.labels.estimatedMargin}</span>
                            <strong>{currencyFormatter.format(metrics.marginLast30Amount)}</strong>
                        </li>
                        {!tiny ? (
                            <li>
                                <span>{copy.labels.revenue}</span>
                                <strong>{currencyFormatter.format(metrics.salesLast30Revenue)}</strong>
                            </li>
                        ) : null}
                    </ul>
                </div>
            );
        case "category-balance":
            return metrics.categoryRows.length > 0 ? (
                <div className="portalHomeDashboardProgress__W6m2Q4">
                    {metrics.categoryRows.slice(0, tiny ? 2 : compact ? 3 : 5).map((row) => (
                        <div key={row.label}>
                            <div className="portalHomeDashboardProgressLabel__R4m2Q2">
                                <span>{row.label}</span>
                                <strong>{`${row.count} (${row.share}%)`}</strong>
                            </div>
                            <div className="portalHomeDashboardProgressTrack__J4m2Q4" aria-hidden="true">
                                <span style={{ width: `${row.share}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="portalHomeDashboardMetric__X4m2Q5">
                    <div className="portalHomeDashboardWidgetStat__Q7m2R4">-</div>
                    <p>{fallbackText}</p>
                </div>
            );
        case "inventory-age":
            return (
                <div className="portalHomeDashboardSplitStats__A6m2Q8">
                    <div>
                        <span>{copy.labels.average}</span>
                        <strong>{`${metrics.inventoryAgeAverageDays}d`}</strong>
                    </div>
                    <div>
                        <span>{copy.labels.oldest}</span>
                        <strong>{`${metrics.inventoryAgeOldestDays}d`}</strong>
                    </div>
                    {!tiny ? (
                        <div>
                            <span>{copy.labels.newest}</span>
                            <strong>{`${metrics.inventoryAgeNewestDays}d`}</strong>
                        </div>
                    ) : null}
                </div>
            );
        case "top-stock":
            return metrics.topStockRows.length > 0 ? (
                <ul className="portalHomeDashboardTags__H6m2Q4">
                    {metrics.topStockRows.slice(0, listLimit).map((row) => (
                        <li key={row.name}>
                            <span>{row.name}</span>
                            <small>
                                {row.units} {copy.labels.unitsShort}
                                {!tiny ? ` · ${currencyFormatter.format(row.value)}` : ""}
                            </small>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="portalHomeDashboardMetric__X4m2Q5">
                    <div className="portalHomeDashboardWidgetStat__Q7m2R4">-</div>
                    <p>{fallbackText}</p>
                </div>
            );
        case "recent-movements":
            return metrics.movementRows.length > 0 ? (
                <ul className="portalHomeDashboardTags__H6m2Q4">
                    {metrics.movementRows.slice(0, listLimit).map((row) => (
                        <li key={row.id}>
                            <span>{row.label}</span>
                            <small>
                                {`${row.kind === "sale" ? copy.labels.sold : copy.labels.purchased} ${row.quantity} ${copy.labels.unitsShort}`}
                                {!tiny ? ` · ${row.kind === "sale" ? "+" : "-"}${currencyFormatter.format(row.amount)}` : ""}
                            </small>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="portalHomeDashboardMetric__X4m2Q5">
                    <div className="portalHomeDashboardWidgetStat__Q7m2R4">-</div>
                    <p>{fallbackText}</p>
                </div>
            );
        case "total-units-sold":
            return (
                <div className="portalHomeDashboardMetric__X4m2Q5">
                    <div className="portalHomeDashboardWidgetStat__Q7m2R4">{metrics.salesLast30Units}</div>
                    <p>{`${metrics.salesLast30Orders} orders across ${metrics.soldProductsCount} products`}</p>
                </div>
            );
        case "cogs-total":
            return (
                <div className="portalHomeDashboardMetric__X4m2Q5">
                    <div className="portalHomeDashboardWidgetStat__Q7m2R4">{currencyFormatter.format(metrics.costOfGoodsSold)}</div>
                    <ul className="portalHomeDashboardList__N7m2R1">
                        <li>
                            <span>Units sold</span>
                            <strong>{metrics.salesLast30Units}</strong>
                        </li>
                        {!tiny ? (
                            <li>
                                <span>Avg cost per unit</span>
                                <strong>{currencyFormatter.format(metrics.salesLast30Units > 0 ? metrics.costOfGoodsSold / metrics.salesLast30Units : 0)}</strong>
                            </li>
                        ) : null}
                    </ul>
                </div>
            );
        case "profit-total":
            return (
                <div className="portalHomeDashboardMetric__X4m2Q5">
                    <div className="portalHomeDashboardWidgetStat__Q7m2R4">{currencyFormatter.format(metrics.profitTotal)}</div>
                    <ul className="portalHomeDashboardList__N7m2R1">
                        <li>
                            <span>Margin</span>
                            <strong>{metrics.averageMarginPercent}%</strong>
                        </li>
                        <li>
                            <span>ROI</span>
                            <strong>{metrics.averageRoiPercent}%</strong>
                        </li>
                        {!tiny ? (
                            <li>
                                <span>Avg per order</span>
                                <strong>{currencyFormatter.format(metrics.averageProfitPerOrder)}</strong>
                            </li>
                        ) : null}
                    </ul>
                </div>
            );
        case "avg-profit":
            return (
                <div className="portalHomeDashboardMetric__X4m2Q5">
                    <div className="portalHomeDashboardWidgetStat__Q7m2R4">{currencyFormatter.format(metrics.averageProfitPerOrder)}</div>
                    <ul className="portalHomeDashboardList__N7m2R1">
                        <li>
                            <span>Per unit</span>
                            <strong>{currencyFormatter.format(metrics.averageProfitPerUnit)}</strong>
                        </li>
                        <li>
                            <span>Per product</span>
                            <strong>{currencyFormatter.format(metrics.averageProfitPerProduct)}</strong>
                        </li>
                    </ul>
                </div>
            );
        case "avg-roi":
            return (
                <div className="portalHomeDashboardProgress__W6m2Q4">
                    <div>
                        <div className="portalHomeDashboardProgressLabel__R4m2Q2">
                            <span>Order ROI</span>
                            <strong>{metrics.averageRoiPercent}%</strong>
                        </div>
                        <div className="portalHomeDashboardProgressTrack__J4m2Q4" aria-hidden="true">
                            <span style={{ width: `${clamp(Math.round(Math.abs(metrics.averageRoiPercent)), 0, 100)}%` }} />
                        </div>
                    </div>
                    <div>
                        <div className="portalHomeDashboardProgressLabel__R4m2Q2">
                            <span>Category ROI</span>
                            <strong>{metrics.averageRoiPerCategory}%</strong>
                        </div>
                        <div className="portalHomeDashboardProgressTrack__J4m2Q4" aria-hidden="true">
                            <span style={{ width: `${clamp(Math.round(Math.abs(metrics.averageRoiPerCategory)), 0, 100)}%` }} />
                        </div>
                    </div>
                    {!tiny ? (
                        <div>
                            <div className="portalHomeDashboardProgressLabel__R4m2Q2">
                                <span>Product margin</span>
                                <strong>{metrics.averageMarginPerProduct}%</strong>
                            </div>
                            <div className="portalHomeDashboardProgressTrack__J4m2Q4" aria-hidden="true">
                                <span style={{ width: `${clamp(Math.round(Math.abs(metrics.averageMarginPerProduct)), 0, 100)}%` }} />
                            </div>
                        </div>
                    ) : null}
                </div>
            );
        case "category-profit":
            return metrics.categoryProfitRows.length > 0 ? (
                <ul className="portalHomeDashboardTags__H6m2Q4">
                    {metrics.categoryProfitRows.slice(0, listLimit).map((row) => (
                        <li key={row.label}>
                            <span>{row.label}</span>
                            <small>{`${currencyFormatter.format(row.profit)} · ${row.roi}% ROI`}</small>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="portalHomeDashboardMetric__X4m2Q5">
                    <div className="portalHomeDashboardWidgetStat__Q7m2R4">-</div>
                    <p>{fallbackText}</p>
                </div>
            );
        case "cumulative-profit":
            return (
                <div className="portalHomeDashboardMetric__X4m2Q5">
                    <div className="portalHomeDashboardWidgetStat__Q7m2R4">{currencyFormatter.format(metrics.profitTotal)}</div>
                    <div className="portalHomeDashboardLineChart__P3m2R4" aria-hidden="true">
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                            {cumulativeLinePath ? (
                                <polyline points={cumulativeLinePath} />
                            ) : null}
                        </svg>
                    </div>
                </div>
            );
        case "price-profit-scatter":
            return priceScatterPoints.length > 0 ? (
                <div className="portalHomeDashboardMetric__X4m2Q5">
                    <div className="portalHomeDashboardScatter__Q4m2R6" aria-hidden="true">
                        {priceScatterPoints.map((point, index) => (
                            <span key={index} style={{ left: `${point.x}%`, bottom: `${point.y}%` }} />
                        ))}
                    </div>
                    {!tiny ? <p>Price (x) versus unit profit (y)</p> : null}
                </div>
            ) : (
                <div className="portalHomeDashboardMetric__X4m2Q5">
                    <div className="portalHomeDashboardWidgetStat__Q7m2R4">-</div>
                    <p>{fallbackText}</p>
                </div>
            );
        case "holding-profit-scatter":
            return holdingScatterPoints.length > 0 ? (
                <div className="portalHomeDashboardMetric__X4m2Q5">
                    <div className="portalHomeDashboardScatter__Q4m2R6" aria-hidden="true">
                        {holdingScatterPoints.map((point, index) => (
                            <span key={index} style={{ left: `${point.x}%`, bottom: `${point.y}%` }} />
                        ))}
                    </div>
                    {!tiny ? <p>Holding days (x) versus unit profit (y)</p> : null}
                </div>
            ) : (
                <div className="portalHomeDashboardMetric__X4m2Q5">
                    <div className="portalHomeDashboardWidgetStat__Q7m2R4">-</div>
                    <p>{fallbackText}</p>
                </div>
            );
        case "variant-performance":
            return variantRows.length > 0 ? (
                <div className="portalHomeDashboardMetric__X4m2Q5">
                    {!tiny ? <p>{metrics.variantPerformanceTitle}</p> : null}
                    <ul className="portalHomeDashboardVariantRows__R8m2R4">
                        {variantRows.map((row) => (
                            <li key={row.label}>
                                <div className="portalHomeDashboardVariantRowsLabel__A3m2R8">
                                    <span>{row.label}</span>
                                    <small>{`${currencyFormatter.format(row.profit)} · ${row.roi}%`}</small>
                                </div>
                                <div className="portalHomeDashboardVariantRowsBars__U2m2R7" aria-hidden="true">
                                    <span style={{ width: `${clamp((Math.abs(row.profit) / maxVariantProfit) * 100, 8, 100)}%` }} />
                                    <span style={{ width: `${clamp((Math.abs(row.roi) / maxVariantRoi) * 100, 8, 100)}%` }} />
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <div className="portalHomeDashboardMetric__X4m2Q5">
                    <div className="portalHomeDashboardWidgetStat__Q7m2R4">-</div>
                    <p>{fallbackText}</p>
                </div>
            );
        default:
            return (
                <div className="portalHomeDashboardMetric__X4m2Q5">
                    <div className="portalHomeDashboardWidgetStat__Q7m2R4">-</div>
                    <p>{fallbackText}</p>
                </div>
            );
    }
}

export function PortalDashboardView() {
    const { language, currency, storeCurrency } = usePortalI18n();
    const router = useRouter();
    const locale = LANGUAGE_TO_LOCALE[language] ?? "en-US";
    const messages = useMemo(() => getDashboardMessages(language), [language]);
    const widgetCopy = useMemo(
        () => DASHBOARD_WIDGET_COPY[language] ?? DASHBOARD_WIDGET_COPY.en,
        [language]
    );
    const dashboardRef = useRef<HTMLElement | null>(null);
    const gridRefsBySectionRef = useRef<Map<string, HTMLElement>>(new Map());
    const cardNodeByIdRef = useRef<Map<string, HTMLElement>>(new Map());
    const previousCardRectsRef = useRef<Map<string, DOMRect>>(new Map());
    const externalDragSnapshotRef = useRef<DashboardWidgetLayout[] | null>(null);
    const externalDragWidgetIdRef = useRef<string | null>(null);
    const externalDragCommittedRef = useRef(false);
    const sectionSequenceMenuRef = useRef<HTMLDivElement | null>(null);

    const cachedCatalogState = getCachedCatalogStateSnapshot();
    const [catalogState, setCatalogState] = useState<CatalogStateSnapshot | null>(() => cachedCatalogState);
    const [catalogLoaded, setCatalogLoaded] = useState<boolean>(() => Boolean(cachedCatalogState));
    const [layoutState, setLayoutState] = useState<DashboardLayoutState>(() => buildDefaultDashboardLayoutState());
    const [layoutLoaded, setLayoutLoaded] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [draftSections, setDraftSections] = useState<DashboardSectionLayout[] | null>(null);
    const [draftWidgets, setDraftWidgets] = useState<DashboardWidgetLayout[] | null>(null);
    const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
    const [editingSectionNameDraft, setEditingSectionNameDraft] = useState("");
    const [sectionSequenceOpen, setSectionSequenceOpen] = useState(false);
    const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
    const [sectionDropTarget, setSectionDropTarget] = useState<{ sectionId: string; position: "before" | "after" } | null>(null);
    const [sectionDragPreview, setSectionDragPreview] = useState<{ label: string; x: number; y: number } | null>(null);
    const draggedSectionIdRef = useRef<string | null>(null);
    const sectionDropTargetRef = useRef<{ sectionId: string; position: "before" | "after" } | null>(null);
    const cancelSectionNameEditRef = useRef(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [nowTimestamp, setNowTimestamp] = useState<number | null>(null);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const [hoveredWidgetId, setHoveredWidgetId] = useState<string | null>(null);
    const [interaction, setInteraction] = useState<DashboardInteractionState | null>(null);
    const [externalDrop, setExternalDrop] = useState<{ sectionId: string; widgetId: string; rect: DashboardRect } | null>(null);
    const [selectedCurrency, setSelectedCurrency] = useState<string>(currency);
    const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
    const [currencySearch, setCurrencySearch] = useState("");
    const [updatingCurrency, setUpdatingCurrency] = useState(false);
    const [availableCurrencies, setAvailableCurrencies] = useState<string[]>(() => [...SUPPORTED_CURRENCIES]);
    const [usdRates, setUsdRates] = useState<Record<string, number>>({ ...DASHBOARD_FALLBACK_USD_RATES });
    const [dateMenuOpen, setDateMenuOpen] = useState(false);
    const [activeDateRange, setActiveDateRange] = useState<DashboardDateRange>(() => buildPresetDateRange("last-year", Date.now()));
    const [draftDateRange, setDraftDateRange] = useState<DashboardDateRange>(() => buildPresetDateRange("last-year", Date.now()));
    const currencyMenuRef = useRef<HTMLDivElement | null>(null);
    const dateMenuRef = useRef<HTMLDivElement | null>(null);

    const activeRangeTimestamps = useMemo(
        () => resolveDateRangeTimestamps(activeDateRange),
        [activeDateRange]
    );
    const rawMetrics = useMemo(
        () => buildDashboardMetrics(catalogState, activeRangeTimestamps, storeCurrency, usdRates),
        [activeRangeTimestamps, catalogState, storeCurrency, usdRates]
    );
    const metrics = useMemo(
        () => convertMetricsCurrency(rawMetrics, storeCurrency, selectedCurrency, usdRates),
        [rawMetrics, selectedCurrency, storeCurrency, usdRates]
    );
    const formatterCurrency = useMemo(() => {
        try {
            if (isIsoCurrencyCode(selectedCurrency)) {
                new Intl.NumberFormat(locale, { style: "currency", currency: selectedCurrency }).format(0);
                return selectedCurrency;
            }
        } catch {
            // Fall through to store/default currency.
        }

        try {
            new Intl.NumberFormat(locale, { style: "currency", currency: storeCurrency }).format(0);
            return storeCurrency;
        } catch {
            return "USD";
        }
    }, [locale, selectedCurrency, storeCurrency]);
    const currencyFormatter = useMemo(
        () => new Intl.NumberFormat(locale, { style: "currency", currency: formatterCurrency, maximumFractionDigits: 0 }),
        [formatterCurrency, locale]
    );
    const dashboardReady = layoutLoaded;
    const widgetContentLoading = !catalogLoaded;

    const activeLayoutSections = useMemo(
        () => (isEditMode ? (draftSections ?? layoutState.sections) : layoutState.sections),
        [draftSections, isEditMode, layoutState.sections]
    );
    const sortedSections = useMemo(
        () => [...activeLayoutSections].sort((left, right) => left.order - right.order),
        [activeLayoutSections]
    );
    const sectionById = useMemo(
        () => new Map(sortedSections.map((section) => [section.id, section])),
        [sortedSections]
    );
    const activeLayoutWidgets = useMemo(
        () => (isEditMode ? (draftWidgets ?? layoutState.widgets) : layoutState.widgets),
        [draftWidgets, isEditMode, layoutState.widgets]
    );
    const sortedWidgets = useMemo(
        () => [...activeLayoutWidgets].sort((left, right) => left.order - right.order),
        [activeLayoutWidgets]
    );
    const widgetsBySectionId = useMemo(() => {
        const map = new Map<string, DashboardWidgetLayout[]>();
        sortedSections.forEach((section) => map.set(section.id, []));
        sortedWidgets.forEach((widget) => {
            const sectionId = sectionById.has(widget.sectionId) ? widget.sectionId : (sortedSections[0]?.id ?? DASHBOARD_DEFAULT_SECTION_ID);
            const bucket = map.get(sectionId);
            if (!bucket) return;
            bucket.push(widget);
        });
        return map;
    }, [sectionById, sortedSections, sortedWidgets]);
    const visibleWidgetsBySectionId = useMemo(() => {
        const map = new Map<string, DashboardWidgetLayout[]>();
        sortedSections.forEach((section) => {
            const sectionWidgets = widgetsBySectionId.get(section.id) ?? [];
            if (section.collapsed) {
                map.set(section.id, []);
                return;
            }
            map.set(section.id, sectionWidgets.filter((widget) => widget.visible));
        });
        return map;
    }, [sortedSections, widgetsBySectionId]);
    const placedWidgetGridBySection = useMemo(() => {
        const map = new Map<string, ReturnType<typeof buildPlacedWidgetLayout>>();
        sortedSections.forEach((section) => {
            const sectionWidgets = visibleWidgetsBySectionId.get(section.id) ?? [];
            map.set(section.id, buildPlacedWidgetLayout(sectionWidgets, isMobileViewport));
        });
        return map;
    }, [isMobileViewport, sortedSections, visibleWidgetsBySectionId]);
    const placedWidgetMapBySection = useMemo(() => {
        const map = new Map<string, Map<string, DashboardPlacedWidget>>();
        sortedSections.forEach((section) => {
            const placed = placedWidgetGridBySection.get(section.id);
            map.set(section.id, new Map((placed?.items ?? []).map((item) => [item.layout.id, item])));
        });
        return map;
    }, [placedWidgetGridBySection, sortedSections]);
    const placedWidgetItems = useMemo(
        () => sortedSections.flatMap((section) => placedWidgetGridBySection.get(section.id)?.items ?? []),
        [placedWidgetGridBySection, sortedSections]
    );
    const dragPreviewItem = useMemo(
        () => {
            if (!interaction || interaction.type !== "drag" || isMobileViewport) return null;
            return placedWidgetMapBySection.get(interaction.sectionId)?.get(interaction.widgetId) ?? null;
        },
        [interaction, isMobileViewport, placedWidgetMapBySection]
    );
    const dragPreviewStyle = useMemo<CSSProperties | undefined>(
        () => {
            if (!interaction || interaction.type !== "drag" || isMobileViewport) return undefined;
            return {
                width: interaction.cardRect.width,
                height: interaction.cardRect.height,
                transform: `translate3d(${interaction.pointerPosition.x - interaction.pointerOffset.x}px, ${interaction.pointerPosition.y - interaction.pointerOffset.y}px, 0)`,
            };
        },
        [interaction, isMobileViewport]
    );
    const resizeLiveStyle = useMemo<CSSProperties | undefined>(
        () => {
            if (!interaction || interaction.type !== "resize" || isMobileViewport) return undefined;
            const deltaX = interaction.pointerPosition.x - interaction.startPointer.x;
            const deltaY = interaction.pointerPosition.y - interaction.startPointer.y;

            const minWidth = interaction.unitSize.width * DASHBOARD_GRID_MIN_COLS;
            const minHeight = interaction.unitSize.height * DASHBOARD_GRID_MIN_ROWS;
            const maxWidth = interaction.unitSize.width * interaction.maxRect.w;
            const maxHeight = interaction.unitSize.height * interaction.maxRect.h;

            const width = clamp(interaction.cardRect.width + deltaX, minWidth, maxWidth);
            const height = clamp(interaction.cardRect.height + deltaY, minHeight, maxHeight);

            return {
                width,
                height,
                justifySelf: "start",
                alignSelf: "start",
                zIndex: 32,
            };
        },
        [interaction, isMobileViewport]
    );
    const isDashboardDirty = useMemo(() => {
        if (!isEditMode) return false;
        const currentSections = draftSections ?? layoutState.sections;
        const currentWidgets = draftWidgets ?? layoutState.widgets;
        return !areSectionsEqual(currentSections, layoutState.sections)
            || !areLayoutsEqual(currentWidgets, layoutState.widgets);
    }, [draftSections, draftWidgets, isEditMode, layoutState.sections, layoutState.widgets]);
    const canReorderSections = sortedSections.length > 1;
    const isDefaultDashboardLayout = useMemo(() => {
        const defaults = buildDefaultDashboardLayoutState();
        const currentSections = normalizeLayoutSections(cloneLayoutSections(
            (isEditMode ? (draftSections ?? layoutState.sections) : layoutState.sections)
        ));
        const currentWidgets = normalizeLayoutWidgets(
            cloneLayoutWidgets(isEditMode ? (draftWidgets ?? layoutState.widgets) : layoutState.widgets),
            currentSections
        );
        return areSectionsEqual(currentSections, defaults.sections) && areLayoutsEqual(currentWidgets, defaults.widgets);
    }, [draftSections, draftWidgets, isEditMode, layoutState.sections, layoutState.widgets]);
    const hasVisibleWidgets = useMemo(
        () => sortedSections.some((section) => (visibleWidgetsBySectionId.get(section.id)?.length ?? 0) > 0),
        [sortedSections, visibleWidgetsBySectionId]
    );

    const localizedWidgetMeta = useMemo(() => {
        const map = new Map<string, { title: string; subtitle: string; category: string }>();
        DASHBOARD_WIDGETS.forEach((widget) => {
            const localized = widgetCopy.widgetMeta[widget.id] ?? messages.widgetMeta[widget.id];
            map.set(widget.id, {
                title: localized?.title ?? widget.title,
                subtitle: localized?.subtitle ?? widget.subtitle,
                category: localized?.category ?? widget.category,
            });
        });
        return map;
    }, [messages.widgetMeta, widgetCopy.widgetMeta]);
    const widgetLayoutById = useMemo(
        () => new Map(sortedWidgets.map((widget) => [widget.id, widget])),
        [sortedWidgets]
    );
    const widgetMenuItems = useMemo(
        () => DASHBOARD_WIDGETS
            .map((definition) => {
                const layoutWidget = widgetLayoutById.get(definition.id);
                const localized = localizedWidgetMeta.get(definition.id);
                return {
                    id: definition.id,
                    title: localized?.title ?? definition.title,
                    category: localized?.category ?? definition.category ?? messages.sectionLabel,
                    visible: layoutWidget?.visible ?? false,
                };
            })
            .filter((item) => !item.visible),
        [localizedWidgetMeta, messages.sectionLabel, widgetLayoutById]
    );
    const currencyOptions = useMemo(
        () => Array.from(new Set([...availableCurrencies, selectedCurrency])).sort((left, right) => left.localeCompare(right)),
        [availableCurrencies, selectedCurrency]
    );
    const currencyLabelByCode = useMemo(() => {
        const labels = new Map<string, string>();
        currencyOptions.forEach((code) => {
            labels.set(code, getCurrencyDisplayLabel(code, locale));
        });
        return labels;
    }, [currencyOptions, locale]);
    const selectedCurrencyLabel = useMemo(
        () => getCurrencySelectorLabel(selectedCurrency, locale),
        [locale, selectedCurrency]
    );
    const filteredCurrencyCodes = useMemo(() => {
        const query = currencySearch.trim().toLowerCase();
        if (!query) return currencyOptions;
        return currencyOptions.filter((code) => {
            const label = (currencyLabelByCode.get(code) ?? code).toLowerCase();
            return code.toLowerCase().includes(query) || label.includes(query);
        });
    }, [currencyLabelByCode, currencyOptions, currencySearch]);

    const lastUpdatedLabel = useMemo(() => {
        if (!dashboardReady || nowTimestamp === null) return undefined;
        return formatLastUpdatedTime(layoutState.lastEditedAt, nowTimestamp, locale, messages);
    }, [dashboardReady, layoutState.lastEditedAt, locale, messages, nowTimestamp]);

    const getGridMetrics = useCallback((sectionId: string) => {
        const node = gridRefsBySectionRef.current.get(sectionId) ?? null;
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        if (rect.width <= 0) return null;
        return {
            left: rect.left,
            top: rect.top,
            colWidth: rect.width / DASHBOARD_GRID_COLUMNS,
        };
    }, []);
    const resolveExternalDropRect = useCallback((sectionId: string, widgetId: string, pointer: { x: number; y: number }): DashboardRect | null => {
        const metricsForGrid = getGridMetrics(sectionId);
        if (!metricsForGrid) return null;
        const widget = activeLayoutWidgets.find((entry) => entry.id === widgetId);
        const definition = DASHBOARD_WIDGETS_BY_ID.get(widgetId);
        if (!definition) return null;

        const { maxW, maxH } = getWidgetMaxRect(definition);
        const defaultSpan = definition.spans[definition.defaultSize];
        const baseWidth = widget?.visible ? widget.w : defaultSpan.cols;
        const baseHeight = widget?.visible ? widget.h : defaultSpan.rows;
        const w = clamp(baseWidth, DASHBOARD_GRID_MIN_COLS, maxW);
        const h = clamp(baseHeight, DASHBOARD_GRID_MIN_ROWS, maxH);
        const pointerColumn = Math.floor((pointer.x - metricsForGrid.left) / metricsForGrid.colWidth);
        const pointerRow = Math.floor((pointer.y - metricsForGrid.top) / DASHBOARD_GRID_ROW_SIZE);
        const x = clamp(pointerColumn - Math.floor(w / 2), 0, DASHBOARD_GRID_COLUMNS - w);
        const y = Math.max(0, pointerRow - Math.floor(h / 2));
        return { x, y, w, h };
    }, [activeLayoutWidgets, getGridMetrics]);

    const resolveInteractionRect = useCallback((
        current: DashboardInteractionState,
        pointer: { x: number; y: number }
    ): DashboardRect => {
        const metricsForGrid = getGridMetrics(current.sectionId);
        if (!metricsForGrid) return current.latestRect;
        if (current.type === "drag") {
            const x = clamp(
                Math.floor((pointer.x - metricsForGrid.left - current.pointerOffset.x) / metricsForGrid.colWidth),
                0,
                DASHBOARD_GRID_COLUMNS - current.latestRect.w
            );
            const y = Math.max(
                0,
                Math.floor((pointer.y - metricsForGrid.top - current.pointerOffset.y) / DASHBOARD_GRID_ROW_SIZE)
            );
            return {
                x,
                y,
                w: current.latestRect.w,
                h: current.latestRect.h,
            };
        }

        const deltaCols = Math.round((pointer.x - current.startPointer.x) / metricsForGrid.colWidth);
        const deltaRows = Math.round((pointer.y - current.startPointer.y) / DASHBOARD_GRID_ROW_SIZE);
        const w = clamp(current.originRect.w + deltaCols, DASHBOARD_GRID_MIN_COLS, current.maxRect.w);
        const h = clamp(current.originRect.h + deltaRows, DASHBOARD_GRID_MIN_ROWS, current.maxRect.h);

        return {
            x: clamp(current.originRect.x, 0, DASHBOARD_GRID_COLUMNS - w),
            y: current.originRect.y,
            w,
            h,
        };
    }, [getGridMetrics]);

    const startEditMode = useCallback(() => {
        setDraftSections(cloneLayoutSections(layoutState.sections));
        setDraftWidgets(cloneLayoutWidgets(layoutState.widgets));
        setEditingSectionId(null);
        setEditingSectionNameDraft("");
        setSectionSequenceOpen(false);
        setDraggedSectionId(null);
        setSectionDropTarget(null);
        setSectionDragPreview(null);
        draggedSectionIdRef.current = null;
        sectionDropTargetRef.current = null;
        setHoveredWidgetId(null);
        setInteraction(null);
        setExternalDrop(null);
        externalDragSnapshotRef.current = null;
        externalDragWidgetIdRef.current = null;
        externalDragCommittedRef.current = false;
        setIsEditMode(true);
    }, [layoutState.sections, layoutState.widgets]);

    const resetLayout = useCallback(() => {
        const next = buildDefaultDashboardLayoutState();
        if (isEditMode) {
            setDraftSections(next.sections);
            setDraftWidgets(next.widgets);
            setEditingSectionId(null);
            setEditingSectionNameDraft("");
            setSectionSequenceOpen(false);
            setDraggedSectionId(null);
            setSectionDropTarget(null);
            setSectionDragPreview(null);
            draggedSectionIdRef.current = null;
            sectionDropTargetRef.current = null;
            setInteraction(null);
            setExternalDrop(null);
            externalDragSnapshotRef.current = null;
            externalDragWidgetIdRef.current = null;
            externalDragCommittedRef.current = false;
            setHoveredWidgetId(null);
            return;
        }
        setLayoutState({
            sections: next.sections,
            widgets: next.widgets,
            lastEditedAt: Date.now(),
        });
    }, [isEditMode]);

    const onRemoveWidget = useCallback((widgetId: string) => {
        if (!isEditMode) return;
        const targetSectionId = activeLayoutWidgets.find((entry) => entry.id === widgetId)?.sectionId;
        setDraftWidgets((current) => {
            const base = cloneLayoutWidgets(current ?? layoutState.widgets);
            const next = base.map((entry) => (
                entry.id === widgetId
                    ? { ...entry, visible: false }
                    : entry
            ));
            if (!targetSectionId) return next;
            return compactVisibleWidgetLayoutForSection(next, targetSectionId);
        });

        setHoveredWidgetId((current) => (current === widgetId ? null : current));
        setInteraction((current) => (current?.widgetId === widgetId ? null : current));
    }, [activeLayoutWidgets, isEditMode, layoutState.widgets]);
    const onExternalWidgetDragOver = useCallback((sectionId: string, event: ReactDragEvent<HTMLElement>) => {
        if (!isEditMode || isMobileViewport || interaction) return;
        const widgetId = getDraggedWidgetIdFromDataTransfer(event.dataTransfer);
        if (!widgetId) return;
        const definition = DASHBOARD_WIDGETS_BY_ID.get(widgetId);
        if (!definition) return;
        const widget = activeLayoutWidgets.find((entry) => entry.id === widgetId);

        event.preventDefault();
        event.dataTransfer.dropEffect = widget?.visible ? "move" : "copy";

        const nextRect = resolveExternalDropRect(sectionId, widgetId, { x: event.clientX, y: event.clientY });
        if (!nextRect) return;
        const unchangedDrop = externalDrop
            && externalDrop.sectionId === sectionId
            && externalDrop.widgetId === widgetId
            && areRectsEqual(externalDrop.rect, nextRect);

        setExternalDrop((current) => {
            if (current && current.sectionId === sectionId && current.widgetId === widgetId && areRectsEqual(current.rect, nextRect)) return current;
            return { sectionId, widgetId, rect: nextRect };
        });
        if (unchangedDrop) return;

        setDraftWidgets((existing) => {
            const base = ensureDashboardLayoutWidget(cloneLayoutWidgets(existing ?? layoutState.widgets), widgetId, sectionId);
            if (externalDragWidgetIdRef.current !== widgetId || !externalDragSnapshotRef.current) {
                externalDragSnapshotRef.current = cloneLayoutWidgets(base);
                externalDragWidgetIdRef.current = widgetId;
                externalDragCommittedRef.current = false;
            }

            const next = base.map((entry) => {
                if (entry.id !== widgetId) return entry;
                return {
                    ...entry,
                    sectionId,
                    visible: true,
                    w: nextRect.w,
                    h: nextRect.h,
                };
            });

            const projected = applyWidgetRectChangeForSection(next, sectionId, widgetId, nextRect, {
                swapAnchorRect: nextRect,
                allowSwap: false,
                lockTarget: true,
                preferRightShift: false,
                jumpAboveLocked: false,
            });

            if (existing && areLayoutsEqual(existing, projected)) return existing;
            return projected;
        });
    }, [activeLayoutWidgets, externalDrop, interaction, isEditMode, isMobileViewport, layoutState.widgets, resolveExternalDropRect]);
    const onExternalWidgetDragLeave = useCallback((event: ReactDragEvent<HTMLElement>) => {
        if (!isEditMode || isMobileViewport) return;
        if (event.currentTarget !== event.target) return;
        setExternalDrop(null);
    }, [isEditMode, isMobileViewport]);
    const onExternalWidgetDrop = useCallback((sectionId: string, event: ReactDragEvent<HTMLElement>) => {
        if (!isEditMode || isMobileViewport) return;
        const widgetId = getDraggedWidgetIdFromDataTransfer(event.dataTransfer);
        if (!widgetId) return;
        const definition = DASHBOARD_WIDGETS_BY_ID.get(widgetId);
        if (!definition) return;

        event.preventDefault();
        const resolvedRect = resolveExternalDropRect(sectionId, widgetId, { x: event.clientX, y: event.clientY })
            ?? (externalDrop?.sectionId === sectionId && externalDrop?.widgetId === widgetId ? externalDrop.rect : null);
        setExternalDrop(null);
        if (!resolvedRect) return;

        externalDragCommittedRef.current = true;
        externalDragSnapshotRef.current = null;
        externalDragWidgetIdRef.current = null;

        setDraftWidgets((existing) => {
            const base = ensureDashboardLayoutWidget(cloneLayoutWidgets(existing ?? layoutState.widgets), widgetId, sectionId).map((entry) => {
                if (entry.id !== widgetId) return entry;
                return {
                    ...entry,
                    sectionId,
                    visible: true,
                    x: resolvedRect.x,
                    y: resolvedRect.y,
                    w: resolvedRect.w,
                    h: resolvedRect.h,
                };
            });

            const projected = applyWidgetRectChangeForSection(base, sectionId, widgetId, resolvedRect, {
                swapAnchorRect: resolvedRect,
                allowSwap: false,
                lockTarget: true,
                preferRightShift: false,
                jumpAboveLocked: false,
            });
            if (existing && areLayoutsEqual(existing, projected)) return existing;
            return projected;
        });
        setHoveredWidgetId(widgetId);
    }, [externalDrop, isEditMode, isMobileViewport, layoutState.widgets, resolveExternalDropRect]);

    const onWidgetPointerDown = useCallback((sectionId: string, widgetId: string, event: ReactPointerEvent<HTMLElement>) => {
        if (!isEditMode || isMobileViewport || event.button !== 0 || interaction) return;
        const target = event.target as HTMLElement;
        if (target.closest("[data-dashboard-action]")) return;

        const widget = activeLayoutWidgets.find((entry) => entry.id === widgetId && entry.visible && entry.sectionId === sectionId);
        if (!widget) return;
        const definition = DASHBOARD_WIDGETS_BY_ID.get(widget.id);
        if (!definition) return;
        const maxRect = getWidgetMaxRect(definition);

        const cardRect = event.currentTarget.getBoundingClientRect();
        const originRect: DashboardRect = {
            x: widget.x,
            y: widget.y,
            w: widget.w,
            h: widget.h,
        };

        event.preventDefault();
        setHoveredWidgetId(widgetId);
        setExternalDrop(null);
        setInteraction({
            type: "drag",
            sectionId,
            widgetId,
            pointerId: event.pointerId,
            originRect,
            latestRect: originRect,
            startPointer: { x: event.clientX, y: event.clientY },
            cardRect: { width: cardRect.width, height: cardRect.height },
            unitSize: {
                width: cardRect.width / Math.max(1, originRect.w),
                height: cardRect.height / Math.max(1, originRect.h),
            },
            maxRect: { w: maxRect.maxW, h: maxRect.maxH },
            pointerOffset: {
                x: event.clientX - cardRect.left,
                y: event.clientY - cardRect.top,
            },
            pointerPosition: { x: event.clientX, y: event.clientY },
        });

        if (event.currentTarget.setPointerCapture) {
            try {
                event.currentTarget.setPointerCapture(event.pointerId);
            } catch {
                // Ignore pointer-capture errors on unsupported browsers.
            }
        }
    }, [activeLayoutWidgets, interaction, isEditMode, isMobileViewport]);

    const onWidgetResizePointerDown = useCallback((sectionId: string, widgetId: string, event: ReactPointerEvent<HTMLButtonElement>) => {
        if (!isEditMode || isMobileViewport || event.button !== 0 || interaction) return;
        event.preventDefault();
        event.stopPropagation();

        const widget = activeLayoutWidgets.find((entry) => entry.id === widgetId && entry.visible && entry.sectionId === sectionId);
        if (!widget) return;
        const definition = DASHBOARD_WIDGETS_BY_ID.get(widget.id);
        if (!definition) return;
        const maxRect = getWidgetMaxRect(definition);

        const card = event.currentTarget.closest("[data-dashboard-widget-card='1']") as HTMLElement | null;
        const cardRect = card?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect();
        const originRect: DashboardRect = {
            x: widget.x,
            y: widget.y,
            w: widget.w,
            h: widget.h,
        };

        setHoveredWidgetId(widgetId);
        setExternalDrop(null);
        setInteraction({
            type: "resize",
            sectionId,
            widgetId,
            pointerId: event.pointerId,
            originRect,
            latestRect: originRect,
            startPointer: { x: event.clientX, y: event.clientY },
            cardRect: { width: cardRect.width, height: cardRect.height },
            unitSize: {
                width: cardRect.width / Math.max(1, originRect.w),
                height: cardRect.height / Math.max(1, originRect.h),
            },
            maxRect: { w: maxRect.maxW, h: maxRect.maxH },
            pointerOffset: { x: 0, y: 0 },
            pointerPosition: { x: event.clientX, y: event.clientY },
        });

        if (event.currentTarget.setPointerCapture) {
            try {
                event.currentTarget.setPointerCapture(event.pointerId);
            } catch {
                // Ignore pointer-capture errors on unsupported browsers.
            }
        }
    }, [activeLayoutWidgets, interaction, isEditMode, isMobileViewport]);

    const onSaveDashboardChanges = useCallback(() => {
        if (!isEditMode) return;

        const nextSections = normalizeLayoutSections(cloneLayoutSections(draftSections ?? layoutState.sections));
        const nextWidgets = normalizeLayoutWidgets(cloneLayoutWidgets(draftWidgets ?? layoutState.widgets), nextSections);
        setLayoutState((current) => {
            if (areSectionsEqual(current.sections, nextSections) && areLayoutsEqual(current.widgets, nextWidgets)) return current;
            return {
                sections: nextSections,
                widgets: nextWidgets,
                lastEditedAt: Date.now(),
            };
        });
        setDraftSections(null);
        setDraftWidgets(null);
        setEditingSectionId(null);
        setEditingSectionNameDraft("");
        setSectionSequenceOpen(false);
        setDraggedSectionId(null);
        setSectionDropTarget(null);
        setSectionDragPreview(null);
        draggedSectionIdRef.current = null;
        sectionDropTargetRef.current = null;
        setHoveredWidgetId(null);
        setInteraction(null);
        setExternalDrop(null);
        externalDragSnapshotRef.current = null;
        externalDragWidgetIdRef.current = null;
        externalDragCommittedRef.current = false;
        setIsEditMode(false);
    }, [draftSections, draftWidgets, isEditMode, layoutState.sections, layoutState.widgets]);

    const onDiscardDashboardChanges = useCallback(() => {
        setDraftSections(null);
        setDraftWidgets(null);
        setEditingSectionId(null);
        setEditingSectionNameDraft("");
        setSectionSequenceOpen(false);
        setDraggedSectionId(null);
        setSectionDropTarget(null);
        setSectionDragPreview(null);
        draggedSectionIdRef.current = null;
        sectionDropTargetRef.current = null;
        setHoveredWidgetId(null);
        setInteraction(null);
        setExternalDrop(null);
        externalDragSnapshotRef.current = null;
        externalDragWidgetIdRef.current = null;
        externalDragCommittedRef.current = false;
        setIsEditMode(false);
    }, []);

    const commitSectionName = useCallback((sectionId: string) => {
        if (cancelSectionNameEditRef.current) {
            cancelSectionNameEditRef.current = false;
            setEditingSectionId(null);
            setEditingSectionNameDraft("");
            return;
        }
        const normalized = editingSectionNameDraft.trim() || DASHBOARD_UNNAMED_SECTION_NAME;
        setDraftSections((current) => {
            const base = cloneLayoutSections(current ?? layoutState.sections);
            return base.map((section) => (section.id === sectionId ? { ...section, name: normalized } : section));
        });
        setEditingSectionId(null);
        setEditingSectionNameDraft("");
    }, [editingSectionNameDraft, layoutState.sections]);

    const cancelSectionNameEdit = useCallback(() => {
        cancelSectionNameEditRef.current = false;
        setEditingSectionId(null);
        setEditingSectionNameDraft("");
    }, []);

    const startSectionNameEdit = useCallback((sectionId: string) => {
        if (!isEditMode) return;
        const section = sortedSections.find((entry) => entry.id === sectionId);
        if (!section) return;
        cancelSectionNameEditRef.current = false;
        setEditingSectionId(sectionId);
        setEditingSectionNameDraft(section.name);
    }, [isEditMode, sortedSections]);

    const onToggleSectionCollapsed = useCallback((sectionId: string) => {
        if (!isEditMode) return;
        setDraftSections((current) => {
            const base = cloneLayoutSections(current ?? layoutState.sections);
            return base.map((section) => (
                section.id === sectionId
                    ? { ...section, collapsed: !section.collapsed }
                    : section
            ));
        });
        setInteraction((current) => (current?.sectionId === sectionId ? null : current));
        setExternalDrop((current) => (current?.sectionId === sectionId ? null : current));
    }, [isEditMode, layoutState.sections]);

    const onDeleteSection = useCallback((sectionId: string) => {
        if (!isEditMode) return;
        const baseSections = cloneLayoutSections(draftSections ?? layoutState.sections);
        if (baseSections.length <= 1) return;

        const remainingSections = baseSections
            .filter((section) => section.id !== sectionId)
            .map((section, index) => ({ ...section, order: index }));
        const fallbackSectionId = remainingSections[0]?.id ?? DASHBOARD_DEFAULT_SECTION_ID;

        setDraftSections(remainingSections);
        setDraftWidgets((current) => {
            const baseWidgets = cloneLayoutWidgets(current ?? layoutState.widgets);
            return baseWidgets.map((widget) => (
                widget.sectionId === sectionId
                    ? { ...widget, visible: false, sectionId: fallbackSectionId }
                    : widget
            ));
        });
        setEditingSectionId((current) => (current === sectionId ? null : current));
        setEditingSectionNameDraft("");
        setInteraction((current) => (current?.sectionId === sectionId ? null : current));
        setExternalDrop((current) => (current?.sectionId === sectionId ? null : current));
    }, [draftSections, isEditMode, layoutState.sections, layoutState.widgets]);

    const onAddSection = useCallback(() => {
        if (!isEditMode) return;
        const nextId = `section-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        setDraftSections((current) => {
            const base = cloneLayoutSections(current ?? layoutState.sections);
            const shifted = base.map((section) => ({ ...section, order: section.order + 1 }));
            return [
                {
                    id: nextId,
                    name: DASHBOARD_UNNAMED_SECTION_NAME,
                    collapsed: false,
                    minRows: DASHBOARD_SECTION_MIN_ROWS,
                    order: 0,
                },
                ...shifted,
            ];
        });
        setEditingSectionId(nextId);
        setEditingSectionNameDraft("");
    }, [isEditMode, layoutState.sections]);

    const reorderSectionsByDrop = useCallback((draggedId: string, targetId: string, position: "before" | "after") => {
        setDraftSections((current) => {
            const base = cloneLayoutSections(current ?? layoutState.sections).sort((left, right) => left.order - right.order);
            const draggedIndex = base.findIndex((section) => section.id === draggedId);
            const targetIndex = base.findIndex((section) => section.id === targetId);
            if (draggedIndex < 0 || targetIndex < 0) return base;
            let insertionIndex = targetIndex + (position === "after" ? 1 : 0);
            if (draggedIndex < insertionIndex) insertionIndex -= 1;
            if (insertionIndex === draggedIndex) return base;
            const [entry] = base.splice(draggedIndex, 1);
            base.splice(insertionIndex, 0, entry);
            return base.map((section, index) => ({ ...section, order: index }));
        });
    }, [layoutState.sections]);

    const clearSectionSequenceDragState = useCallback(() => {
        draggedSectionIdRef.current = null;
        sectionDropTargetRef.current = null;
        setDraggedSectionId(null);
        setSectionDropTarget(null);
        setSectionDragPreview(null);
    }, []);

    const onSectionReorderPointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>, sectionId: string) => {
        if (!canReorderSections) return;
        if (event.button !== 0) return;
        event.preventDefault();
        const section = sortedSections.find((entry) => entry.id === sectionId);
        if (!section) return;
        draggedSectionIdRef.current = sectionId;
        setDraggedSectionId(sectionId);
        setSectionDragPreview({ label: section.name, x: event.clientX, y: event.clientY });
        const sortedIds = sortedSections.map((entry) => entry.id);
        const sourceIndex = sortedIds.indexOf(sectionId);
        if (sourceIndex < 0 || sortedIds.length < 2) {
            setSectionDropTarget(null);
            sectionDropTargetRef.current = null;
            return;
        }
        if (sourceIndex < sortedIds.length - 1) {
            const nextTarget = { sectionId: sortedIds[sourceIndex + 1], position: "before" as const };
            setSectionDropTarget(nextTarget);
            sectionDropTargetRef.current = nextTarget;
            return;
        }
        const nextTarget = { sectionId: sortedIds[sourceIndex - 1], position: "after" as const };
        setSectionDropTarget(nextTarget);
        sectionDropTargetRef.current = nextTarget;
    }, [canReorderSections, sortedSections]);

    usePendingChangesHeader({
        active: isEditMode,
        scope: "dashboard",
        saveDisabled: !isDashboardDirty,
        onSave: onSaveDashboardChanges,
        onDiscard: onDiscardDashboardChanges,
    });

    const onUpdateCurrency = useCallback(async (next: string) => {
        if (updatingCurrency || next === selectedCurrency) {
            setCurrencyMenuOpen(false);
            return;
        }

        const previous = selectedCurrency;
        setSelectedCurrency(next);

        setUpdatingCurrency(true);
        try {
            const res = await fetch("/api/user/preferences/currency", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ currency: next }),
            });
            const payload = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
            if (!res.ok || !payload?.ok) {
                throw new Error(payload?.message || "Unable to update currency.");
            }
            router.refresh();
        } catch {
            setSelectedCurrency(previous);
        } finally {
            setUpdatingCurrency(false);
            setCurrencyMenuOpen(false);
        }
    }, [router, selectedCurrency, updatingCurrency]);

    const onToggleCurrencyMenu = useCallback(() => {
        setCurrencyMenuOpen((current) => {
            const next = !current;
            if (next) {
                setCurrencySearch("");
            }
            return next;
        });
        setDateMenuOpen(false);
    }, []);

    const onToggleDateMenu = useCallback(() => {
        setDateMenuOpen((current) => {
            const next = !current;
            if (next) {
                setDraftDateRange(activeDateRange);
            }
            return next;
        });
        setCurrencyMenuOpen(false);
    }, [activeDateRange]);

    const onPickDatePreset = useCallback((preset: DashboardDatePreset) => {
        const next = buildPresetDateRange(preset, Date.now());
        setDraftDateRange(next);
    }, []);

    const onDraftDateFieldChange = useCallback((key: "startDate" | "endDate", value: string) => {
        setDraftDateRange((current) => ({
            ...current,
            preset: "none",
            [key]: value.trim() === "" ? null : value,
        }));
    }, []);

    const onPickDraftCalendarDate = useCallback((value: string) => {
        setDraftDateRange((current) => {
            if (!current.startDate || (current.startDate && current.endDate)) {
                return { ...current, preset: "none", startDate: value, endDate: null };
            }
            const start = parseDateInputToStart(current.startDate);
            const next = parseDateInputToStart(value);
            if (start === null || next === null) {
                return { ...current, preset: "none", startDate: value, endDate: current.endDate };
            }
            if (next < start) {
                return { ...current, preset: "none", startDate: value, endDate: current.startDate };
            }
            return { ...current, preset: "none", endDate: value };
        });
    }, []);

    const onCancelDateRange = useCallback(() => {
        setDraftDateRange(activeDateRange);
        setDateMenuOpen(false);
    }, [activeDateRange]);

    const todayLabel = useMemo(
        () => new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(nowTimestamp ?? Date.now()),
        [locale, nowTimestamp]
    );

    const normalizedDraftDateRange = useMemo(
        () => normalizeDateRange(draftDateRange),
        [draftDateRange]
    );
    const draftRangeTimestamps = useMemo(
        () => resolveDateRangeTimestamps(normalizedDraftDateRange),
        [normalizedDraftDateRange]
    );
    const hasDraftStartDate = normalizedDraftDateRange.startDate !== null;
    const hasDraftEndDate = normalizedDraftDateRange.endDate !== null;
    const canSaveDateRange = useMemo(
        () => (!hasDraftStartDate && !hasDraftEndDate) || (draftRangeTimestamps.startAt !== null && draftRangeTimestamps.endAt !== null),
        [draftRangeTimestamps.endAt, draftRangeTimestamps.startAt, hasDraftEndDate, hasDraftStartDate]
    );
    const draftDateSummary = useMemo(() => {
        if (!normalizedDraftDateRange.startDate || !normalizedDraftDateRange.endDate) return DASHBOARD_DATE_ALL_LABEL;
        const start = parseDateInputToStart(normalizedDraftDateRange.startDate);
        const end = parseDateInputToStart(normalizedDraftDateRange.endDate);
        if (start === null || end === null) return DASHBOARD_DATE_ALL_LABEL;
        const formatter = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" });
        return `${formatter.format(start)} - ${formatter.format(end)}`;
    }, [locale, normalizedDraftDateRange.endDate, normalizedDraftDateRange.startDate]);
    const onSaveDateRange = useCallback(() => {
        if (!canSaveDateRange) return;
        setActiveDateRange(normalizeDateRange(draftDateRange));
        setDateMenuOpen(false);
    }, [canSaveDateRange, draftDateRange]);

    const calendarMonths = useMemo(() => {
        const anchor = nowTimestamp ?? Date.now();
        const currentMonth = new Date(anchor);
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);
        const previousMonth = new Date(currentMonth);
        previousMonth.setMonth(currentMonth.getMonth() - 1);
        return [buildCalendarMonthGrid(previousMonth.getTime()), buildCalendarMonthGrid(currentMonth.getTime())];
    }, [nowTimestamp]);

    const onToggleFullscreen = useCallback(async () => {
        const node = dashboardRef.current;
        if (!node) return;

        try {
            if (document.fullscreenElement === node) {
                await document.exitFullscreen();
                return;
            }
            await node.requestFullscreen();
        } catch {
            // Ignore fullscreen API failures.
        }
    }, []);

    useEffect(() => {
        sectionDropTargetRef.current = sectionDropTarget;
    }, [sectionDropTarget]);

    useEffect(() => {
        if (!draggedSectionId) return;

        const onPointerMove = (event: PointerEvent) => {
            const activeDraggedSectionId = draggedSectionIdRef.current;
            if (!activeDraggedSectionId) return;

            setSectionDragPreview((current) => (
                current ? { ...current, x: event.clientX, y: event.clientY } : current
            ));

            const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
            if (!target) return;

            if (sectionSequenceMenuRef.current && !sectionSequenceMenuRef.current.contains(target)) {
                setSectionDropTarget(null);
                sectionDropTargetRef.current = null;
                return;
            }

            const dropTargetElement = target.closest<HTMLElement>("[data-dashboard-section-drop-id]");
            if (dropTargetElement) {
                const targetId = dropTargetElement.dataset.dashboardSectionDropId;
                const position = dropTargetElement.dataset.dashboardSectionDropPosition as "before" | "after" | undefined;
                if (!targetId || !position || targetId === activeDraggedSectionId) {
                    setSectionDropTarget(null);
                    sectionDropTargetRef.current = null;
                    return;
                }
                const nextTarget = { sectionId: targetId, position };
                setSectionDropTarget(nextTarget);
                sectionDropTargetRef.current = nextTarget;
                return;
            }

            const rowTargetElement = target.closest<HTMLElement>("[data-dashboard-section-row-id]");
            if (!rowTargetElement) return;

            const targetId = rowTargetElement.dataset.dashboardSectionRowId;
            if (!targetId || targetId === activeDraggedSectionId) {
                setSectionDropTarget(null);
                sectionDropTargetRef.current = null;
                return;
            }

            const rect = rowTargetElement.getBoundingClientRect();
            const currentTarget = sectionDropTargetRef.current;
            const isSameTarget = currentTarget?.sectionId === targetId;
            const beforeThreshold = rect.top + rect.height * 0.4;
            const afterThreshold = rect.top + rect.height * 0.6;
            const position: "before" | "after" = isSameTarget
                ? event.clientY <= beforeThreshold
                    ? "before"
                    : event.clientY >= afterThreshold
                        ? "after"
                        : currentTarget.position
                : event.clientY < rect.top + rect.height / 2
                    ? "before"
                    : "after";

            const nextTarget = { sectionId: targetId, position };
            setSectionDropTarget(nextTarget);
            sectionDropTargetRef.current = nextTarget;
        };

        const onPointerFinish = () => {
            const activeDraggedSectionId = draggedSectionIdRef.current;
            const target = sectionDropTargetRef.current;
            if (activeDraggedSectionId && target && activeDraggedSectionId !== target.sectionId) {
                reorderSectionsByDrop(activeDraggedSectionId, target.sectionId, target.position);
            }
            clearSectionSequenceDragState();
        };

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerFinish);
        window.addEventListener("pointercancel", onPointerFinish);
        return () => {
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerFinish);
            window.removeEventListener("pointercancel", onPointerFinish);
        };
    }, [clearSectionSequenceDragState, draggedSectionId, reorderSectionsByDrop]);

    useEffect(() => {
        const detail: DashboardWidgetMenuEventDetail = (isEditMode && !isMobileViewport)
            ? { open: true, items: widgetMenuItems }
            : { open: false, items: [] };
        window.dispatchEvent(new CustomEvent(DASHBOARD_WIDGET_MENU_EVENT, { detail }));
    }, [isEditMode, isMobileViewport, widgetMenuItems]);

    useEffect(() => {
        return () => {
            const detail: DashboardWidgetMenuEventDetail = { open: false, items: [] };
            window.dispatchEvent(new CustomEvent(DASHBOARD_WIDGET_MENU_EVENT, { detail }));
        };
    }, []);

    useEffect(() => {
        const stored = parseStoredDashboardLayout(window.localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY));
        setLayoutState(stored ?? buildDefaultDashboardLayoutState());
        setLayoutLoaded(true);
    }, []);

    useEffect(() => {
        setSelectedCurrency(currency);
    }, [currency]);

    useEffect(() => {
        const localCodes = getLocalIsoCurrencyCodes();
        if (localCodes.length === 0) return;
        setAvailableCurrencies((current) => {
            const merged = Array.from(new Set([...current, ...localCodes]));
            return merged.sort((left, right) => left.localeCompare(right));
        });
    }, []);

    useEffect(() => {
        let cancelled = false;
        let intervalHandle: ReturnType<typeof setInterval> | null = null;

        const hydrateRates = async () => {
            try {
                const res = await fetch("/api/currency/rates?base=USD", { cache: "no-store" });
                const payload = (await res.json().catch(() => null)) as {
                    ok?: boolean;
                    rates?: Record<string, number>;
                    codes?: string[];
                } | null;
                if (!res.ok || !payload?.ok || !payload?.rates || cancelled) return;

                const nextRates: Record<string, number> = {};
                Object.entries(payload.rates).forEach(([code, value]) => {
                    if (!isIsoCurrencyCode(code) || typeof value !== "number" || !Number.isFinite(value) || value <= 0) return;
                    nextRates[code] = value;
                });
                if (Object.keys(nextRates).length === 0) return;

                const nextCodes = Array.from(new Set(
                    (payload.codes ?? Object.keys(nextRates))
                        .filter((code): code is string => isIsoCurrencyCode(code))
                )).sort((left, right) => left.localeCompare(right));

                setUsdRates((current) => ({ ...current, ...nextRates }));
                setAvailableCurrencies((current) => {
                    const merged = Array.from(new Set([...current, ...nextCodes]));
                    return merged.sort((left, right) => left.localeCompare(right));
                });
            } catch {
                // Keep fallback conversion rates and currency list.
            }
        };

        void hydrateRates();
        intervalHandle = setInterval(() => {
            void hydrateRates();
        }, 30 * 60 * 1000);

        return () => {
            cancelled = true;
            if (intervalHandle) clearInterval(intervalHandle);
        };
    }, []);

    useEffect(() => {
        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (currencyMenuOpen && currencyMenuRef.current && !currencyMenuRef.current.contains(target)) {
                setCurrencyMenuOpen(false);
            }
            if (dateMenuOpen && dateMenuRef.current && !dateMenuRef.current.contains(target)) {
                setDateMenuOpen(false);
                setDraftDateRange(activeDateRange);
            }
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            setCurrencyMenuOpen(false);
            if (dateMenuOpen) {
                setDateMenuOpen(false);
                setDraftDateRange(activeDateRange);
            }
        };

        window.addEventListener("pointerdown", onPointerDown);
        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [activeDateRange, currencyMenuOpen, dateMenuOpen]);

    useEffect(() => {
        const media = window.matchMedia(`(max-width: ${DASHBOARD_MOBILE_BREAKPOINT}px)`);
        const updateViewport = () => setIsMobileViewport(media.matches);
        updateViewport();

        if (typeof media.addEventListener === "function") {
            media.addEventListener("change", updateViewport);
            return () => media.removeEventListener("change", updateViewport);
        }

        media.addListener(updateViewport);
        return () => media.removeListener(updateViewport);
    }, []);

    useEffect(() => {
        if (!interaction || !isEditMode || isMobileViewport) return;

        const onPointerMove = (event: PointerEvent) => {
            if (event.pointerId !== interaction.pointerId) return;
            const pointerPosition = { x: event.clientX, y: event.clientY };

            setInteraction((current) => {
                if (!current || current.pointerId !== event.pointerId) return current;
                const nextRect = resolveInteractionRect(current, pointerPosition);

                if (!areRectsEqual(nextRect, current.latestRect)) {
                    setDraftWidgets((existing) => {
                        const base = cloneLayoutWidgets(existing ?? layoutState.widgets);
                        return applyWidgetRectChangeForSection(base, current.sectionId, current.widgetId, nextRect, {
                            swapAnchorRect: current.originRect,
                            allowSwap: current.type === "drag",
                            lockTarget: true,
                            preferRightShift: false,
                            jumpAboveLocked: current.type === "drag" && nextRect.y > current.originRect.y,
                        });
                    });
                }

                return {
                    ...current,
                    pointerPosition,
                    latestRect: nextRect,
                };
            });
        };

        const onPointerEnd = (event: PointerEvent) => {
            if (event.pointerId !== interaction.pointerId) return;
            setInteraction(null);
        };

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerEnd);
        window.addEventListener("pointercancel", onPointerEnd);

        return () => {
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerEnd);
            window.removeEventListener("pointercancel", onPointerEnd);
        };
    }, [interaction, isEditMode, isMobileViewport, layoutState.widgets, resolveInteractionRect]);

    useEffect(() => {
        if (!isEditMode || isMobileViewport || interaction || externalDrop) return;
        setDraftWidgets((current) => {
            if (!current) return current;
            let compacted = cloneLayoutWidgets(current);
            sortedSections.forEach((section) => {
                compacted = compactVisibleWidgetLayoutForSection(compacted, section.id);
            });
            return areLayoutsEqual(current, compacted) ? current : compacted;
        });
    }, [externalDrop, interaction, isEditMode, isMobileViewport, sortedSections]);

    useEffect(() => {
        if (!isEditMode) return;
        const finalizeExternalDrag = () => {
            setExternalDrop(null);

            if (externalDragCommittedRef.current) {
                externalDragCommittedRef.current = false;
                externalDragSnapshotRef.current = null;
                externalDragWidgetIdRef.current = null;
                return;
            }

            if (externalDragSnapshotRef.current) {
                setDraftWidgets(cloneLayoutWidgets(externalDragSnapshotRef.current));
            }
            externalDragSnapshotRef.current = null;
            externalDragWidgetIdRef.current = null;
        };

        window.addEventListener("dragend", finalizeExternalDrag);
        window.addEventListener("drop", finalizeExternalDrag);
        return () => {
            window.removeEventListener("dragend", finalizeExternalDrag);
            window.removeEventListener("drop", finalizeExternalDrag);
        };
    }, [isEditMode]);

    useEffect(() => {
        if (!isEditMode) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            if (!interaction && !externalDrop) return;
            event.preventDefault();
            setInteraction(null);
            setExternalDrop(null);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [externalDrop, interaction, isEditMode]);

    useEffect(() => {
        if (isEditMode) return;
        setDraftSections(null);
        setEditingSectionId(null);
        setEditingSectionNameDraft("");
        setSectionSequenceOpen(false);
        setDraggedSectionId(null);
        setSectionDropTarget(null);
        setSectionDragPreview(null);
        draggedSectionIdRef.current = null;
        sectionDropTargetRef.current = null;
        setHoveredWidgetId(null);
        setInteraction(null);
        setExternalDrop(null);
        externalDragSnapshotRef.current = null;
        externalDragWidgetIdRef.current = null;
        externalDragCommittedRef.current = false;
    }, [isEditMode]);

    useEffect(() => {
        if (!isMobileViewport) return;
        setInteraction(null);
        setExternalDrop(null);
        externalDragSnapshotRef.current = null;
        externalDragWidgetIdRef.current = null;
        externalDragCommittedRef.current = false;
    }, [isMobileViewport]);

    useEffect(() => {
        if (!layoutLoaded) return;
        window.localStorage.setItem(
            DASHBOARD_LAYOUT_STORAGE_KEY,
            JSON.stringify({
                version: 2,
                sections: layoutState.sections,
                widgets: layoutState.widgets,
                lastEditedAt: layoutState.lastEditedAt,
            })
        );
    }, [layoutLoaded, layoutState.lastEditedAt, layoutState.sections, layoutState.widgets]);

    useEffect(() => {
        let cancelled = false;
        let gateTimeoutId: number | null = null;

        gateTimeoutId = window.setTimeout(() => {
            if (cancelled) return;
            setCatalogLoaded(true);
        }, 8000);

        const hydrate = async () => {
            try {
                const state = await fetchCatalogStateFromApi();
                if (cancelled) return;
                setCatalogState(state);
            } catch {
                if (cancelled) return;
                setCatalogState((current) => current);
            } finally {
                if (cancelled) return;
                if (gateTimeoutId !== null) {
                    window.clearTimeout(gateTimeoutId);
                    gateTimeoutId = null;
                }
                setCatalogLoaded(true);
            }
        };

        void hydrate();

        return () => {
            cancelled = true;
            if (gateTimeoutId !== null) window.clearTimeout(gateTimeoutId);
        };
    }, []);

    useEffect(() => {
        const onFullscreenChange = () => {
            setIsFullscreen(document.fullscreenElement === dashboardRef.current);
        };

        document.addEventListener("fullscreenchange", onFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
    }, []);

    useEffect(() => {
        const now = Date.now();
        setNowTimestamp(now);
        const interval = window.setInterval(() => {
            setNowTimestamp(Date.now());
        }, 60000);
        return () => window.clearInterval(interval);
    }, []);

    useEffect(() => {
        if (typeof document === "undefined") return;
        if (!interaction) return;
        document.body.classList.add("portalHomeDashboardInteractingBody__A4m2Q7");
        return () => document.body.classList.remove("portalHomeDashboardInteractingBody__A4m2Q7");
    }, [interaction]);

    useLayoutEffect(() => {
        if (!dashboardReady || isMobileViewport) {
            previousCardRectsRef.current = new Map();
            return;
        }

        const cardNodes = cardNodeByIdRef.current;
        const nextRects = new Map<string, DOMRect>();
        cardNodes.forEach((node, widgetId) => {
            nextRects.set(widgetId, node.getBoundingClientRect());
        });

        const previousRects = previousCardRectsRef.current;
        const activeWidgetId = interaction?.widgetId ?? null;
        cardNodes.forEach((node, widgetId) => {
            if (widgetId === activeWidgetId) return;
            const previousRect = previousRects.get(widgetId);
            const nextRect = nextRects.get(widgetId);
            if (!previousRect || !nextRect) return;

            const deltaX = previousRect.left - nextRect.left;
            const deltaY = previousRect.top - nextRect.top;
            if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) return;

            if (typeof node.animate === "function") {
                node.animate(
                    [
                        { transform: `translate(${deltaX}px, ${deltaY}px)` },
                        { transform: "translate(0px, 0px)" },
                    ],
                    {
                        duration: 220,
                        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
                    }
                );
            }
        });

        previousCardRectsRef.current = nextRects;
    }, [dashboardReady, interaction?.widgetId, isMobileViewport, placedWidgetItems]);

    return (
        <section
            ref={dashboardRef}
            className={cn("portalHomeDashboardRoot__A2m8Q4", isFullscreen && "portalHomeDashboardFullscreen__X4m8Q7")}
        >
            <PortalPageTitle
                page="home"
                meta={lastUpdatedLabel}
                metaInline
                actions={(
                    dashboardReady ? (
                        isEditMode ? (
                            <>
                                <Button type="button" kind="basic" size="small" onClick={onAddSection}>
                                    <span>Add section</span>
                                </Button>
                                <Button
                                    type="button"
                                    kind="basic"
                                    size="small"
                                    disabled={!canReorderSections}
                                    onClick={() => setSectionSequenceOpen(true)}
                                >
                                    <span>Change section sequence</span>
                                </Button>
                                <Button type="button" kind="basic" size="small" onClick={resetLayout} disabled={isDefaultDashboardLayout}>
                                    <span>{messages.resetToDefault}</span>
                                </Button>
                            </>
                        ) : (
                            <>
                                <Tooltip content={messages.editDashboard}>
                                    <Button
                                        type="button"
                                        kind="highlight"
                                        size="xsmall"
                                        className="portalHomeDashboardHeaderIconButton__K7m2Q4"
                                        aria-label={messages.editDashboard}
                                        onClick={startEditMode}
                                    >
                                        <Pencil aria-hidden="true" />
                                    </Button>
                                </Tooltip>
                                <Tooltip content={isFullscreen ? messages.exitFullscreenDashboard : messages.expandDashboardToFullscreen}>
                                    <Button
                                        type="button"
                                        kind="highlight"
                                        size="xsmall"
                                        className="portalHomeDashboardHeaderIconButton__K7m2Q4"
                                        aria-label={isFullscreen ? messages.exitFullscreenDashboard : messages.expandDashboardToFullscreen}
                                        onClick={() => void onToggleFullscreen()}
                                    >
                                        {isFullscreen ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
                                    </Button>
                                </Tooltip>
                                <div className="portalHomeDashboardHeaderMenuWrap__E8m2Q4" ref={currencyMenuRef}>
                                    <Button
                                        type="button"
                                        kind="basic"
                                        size="xsmall"
                                        className="portalHomeDashboardHeaderFilterButton__J8m2Q4 portalProductsSearchFilterButton__M9r2D1"
                                        aria-haspopup="menu"
                                        aria-expanded={currencyMenuOpen}
                                        data-state={currencyMenuOpen ? "on" : "off"}
                                        onClick={onToggleCurrencyMenu}
                                    >
                                        <span className="portalHomeDashboardCurrencyIconGroup__V5m2Q4" aria-hidden="true">
                                            <DollarSign aria-hidden="true" />
                                            <ArrowLeftRight aria-hidden="true" />
                                        </span>
                                        <span>{selectedCurrencyLabel}</span>
                                    </Button>

                                    {currencyMenuOpen ? (
                                        <div role="menu" className="portalHomeDashboardHeaderMenuPanel__T6m2Q8 portalProductsMenuPanel__A8d2P7">
                                            <div className="portalHomeDashboardCurrencySearchWrap__D2m2Q4">
                                                <input
                                                    type="search"
                                                    value={currencySearch}
                                                    onChange={(event) => setCurrencySearch(event.target.value)}
                                                    placeholder={DASHBOARD_CURRENCY_SEARCH_PLACEHOLDER}
                                                    className="portalHomeDashboardCurrencySearchInput__Q2m2Q4"
                                                    aria-label={DASHBOARD_CURRENCY_SEARCH_PLACEHOLDER}
                                                />
                                            </div>
                                            <div className="portalHomeDashboardCurrencyList__C2m2Q6">
                                                {filteredCurrencyCodes.length > 0 ? (
                                                    filteredCurrencyCodes.map((code) => (
                                                        <button
                                                            key={code}
                                                            type="button"
                                                            role="menuitemradio"
                                                            aria-checked={selectedCurrency === code}
                                                            className="portalProductsMenuItem__E3n8R6 portalHomeDashboardCurrencyOption__S4m2Q7"
                                                            disabled={updatingCurrency}
                                                            onClick={() => void onUpdateCurrency(code)}
                                                        >
                                                            <span className="portalHomeDashboardCurrencyOptionLabel__X3m2Q8">
                                                                {currencyLabelByCode.get(code) ?? code}
                                                            </span>
                                                            <Check aria-hidden="true" className="portalHomeDashboardCurrencyOptionCheck__L7m2Q6" />
                                                        </button>
                                                    ))
                                                ) : (
                                                    <p className="portalHomeDashboardCurrencyEmpty__N2m2Q5">{DASHBOARD_CURRENCY_EMPTY_MESSAGE}</p>
                                                )}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>

                                <div className="portalHomeDashboardHeaderMenuWrap__E8m2Q4" ref={dateMenuRef}>
                                    <Button
                                        type="button"
                                        kind="basic"
                                        size="xsmall"
                                        className="portalHomeDashboardHeaderFilterButton__J8m2Q4 portalProductsSearchFilterButton__M9r2D1"
                                        aria-haspopup="dialog"
                                        aria-expanded={dateMenuOpen}
                                        data-state={dateMenuOpen ? "on" : "off"}
                                        onClick={onToggleDateMenu}
                                    >
                                        <CalendarDays aria-hidden="true" />
                                        <span>{todayLabel}</span>
                                    </Button>

                                    {dateMenuOpen ? (
                                        <div className="portalHomeDashboardDatePanel__V4m2Q7" role="dialog" aria-label={DASHBOARD_DATE_DIALOG_LABEL}>
                                            <div className="portalHomeDashboardDatePresetColumn__R5m2Q6">
                                                {DASHBOARD_DATE_PRESET_OPTIONS.map((option) => (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        className={cn(
                                                            "portalHomeDashboardDatePresetButton__Q3m2Q6",
                                                            normalizedDraftDateRange.preset === option.value && "portalHomeDashboardDatePresetButtonActive__F2m2Q9"
                                                        )}
                                                        onClick={() => onPickDatePreset(option.value)}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="portalHomeDashboardDateCalendarColumn__D2m2Q4">
                                                <div className="portalHomeDashboardDateInputs__A2m2Q7">
                                                    <label>
                                                        <span>{DASHBOARD_DATE_START_LABEL}</span>
                                                        <input
                                                            className="form__inputDateCompact__B2m9Q7"
                                                            type="date"
                                                            value={normalizedDraftDateRange.startDate ?? ""}
                                                            placeholder="YYYY-MM-DD"
                                                            onChange={(event) => onDraftDateFieldChange("startDate", event.target.value)}
                                                        />
                                                    </label>
                                                    <label>
                                                        <span>{DASHBOARD_DATE_END_LABEL}</span>
                                                        <input
                                                            className="form__inputDateCompact__B2m9Q7"
                                                            type="date"
                                                            value={normalizedDraftDateRange.endDate ?? ""}
                                                            placeholder="YYYY-MM-DD"
                                                            onChange={(event) => onDraftDateFieldChange("endDate", event.target.value)}
                                                        />
                                                    </label>
                                                </div>
                                                <p className="portalHomeDashboardDateSummary__A8m2Q4">{draftDateSummary}</p>

                                                <div className="portalHomeDashboardCalendarGrid__H6m2Q3">
                                                    {calendarMonths.map((month) => (
                                                        <section key={month.monthStart} className="portalHomeDashboardCalendarMonth__Y6m2Q5">
                                                            <h4>
                                                                {new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(month.monthStart)}
                                                            </h4>
                                                            <div className="portalHomeDashboardCalendarWeekdays__J6m2Q4">
                                                                {DASHBOARD_DATE_WEEKDAY_LABELS.map((day) => (
                                                                    <span key={day}>{day}</span>
                                                                ))}
                                                            </div>
                                                            <div className="portalHomeDashboardCalendarDays__B2m2Q5">
                                                                {Array.from({ length: month.firstWeekday }, (_, index) => (
                                                                    <span key={`empty-${index}`} className="portalHomeDashboardCalendarDayEmpty__G2m2Q2" />
                                                                ))}
                                                                {month.days.map((day) => {
                                                                    const isStart = normalizedDraftDateRange.startDate === day.value;
                                                                    const isEnd = normalizedDraftDateRange.endDate === day.value;
                                                                    const isSingleDayRange = isStart && isEnd;
                                                                    const dayTimestamp = toStartOfDay(day.timestamp);
                                                                    const inRange = draftRangeTimestamps.startAt !== null
                                                                        && draftRangeTimestamps.endAt !== null
                                                                        && dayTimestamp >= draftRangeTimestamps.startAt
                                                                        && dayTimestamp <= draftRangeTimestamps.endAt;
                                                                    return (
                                                                        <button
                                                                            key={day.value}
                                                                            type="button"
                                                                            className={cn(
                                                                                "portalHomeDashboardCalendarDay__H7m2Q4",
                                                                                inRange && "portalHomeDashboardCalendarDayInRange__K2m2Q4",
                                                                                isStart && "portalHomeDashboardCalendarDayStart__E3m2Q4",
                                                                                isEnd && "portalHomeDashboardCalendarDayEnd__M4m2Q6",
                                                                                isSingleDayRange && "portalHomeDashboardCalendarDaySingle__A3m2Q9"
                                                                            )}
                                                                            onClick={() => onPickDraftCalendarDate(day.value)}
                                                                        >
                                                                            {day.day}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </section>
                                                    ))}
                                                </div>

                                                <div className="portalHomeDashboardDateFooter__S7m2Q8">
                                                    <Button type="button" kind="basic" size="xsmall" onClick={onCancelDateRange}>
                                                        {messages.cancel}
                                                    </Button>
                                                    <Button type="button" kind="primary" size="xsmall" disabled={!canSaveDateRange} onClick={onSaveDateRange}>
                                                        {DASHBOARD_DATE_APPLY_LABEL}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </>
                        )
                    ) : null
                )}
            />

            {!dashboardReady ? (
                <div className="portalHomeDashboardGate__D4m2Q8" aria-hidden="true" />
            ) : (
                <>
                    {!isEditMode && !hasVisibleWidgets ? (
                        <div className="portalHomeDashboardEmpty__D8m2Q4 ui-surface-card">
                            <p>{messages.noSectionsVisible}</p>
                        </div>
                    ) : null}

                    {sortedSections.map((section) => {
                        const sectionVisibleWidgets = visibleWidgetsBySectionId.get(section.id) ?? [];
                        const placedWidgetGrid = placedWidgetGridBySection.get(section.id) ?? { items: [], rows: 1 };
                        const sectionMinRows = Math.max(DASHBOARD_SECTION_MIN_ROWS, section.minRows);
                        const sectionOverlayRect = interaction?.sectionId === section.id
                            ? interaction.latestRect
                            : externalDrop?.sectionId === section.id
                                ? externalDrop.rect
                                : null;
                        const sectionOverlayRows = Math.max(
                            sectionMinRows,
                            placedWidgetGrid.rows,
                            sectionOverlayRect ? sectionOverlayRect.y + sectionOverlayRect.h : 0
                        );
                        const sectionGridOverlayCells = Array.from(
                            { length: sectionOverlayRows * DASHBOARD_GRID_COLUMNS },
                            (_, index) => {
                                const col = index % DASHBOARD_GRID_COLUMNS;
                                const row = Math.floor(index / DASHBOARD_GRID_COLUMNS);
                                const isTarget = Boolean(
                                    sectionOverlayRect
                                    && col >= sectionOverlayRect.x
                                    && col < sectionOverlayRect.x + sectionOverlayRect.w
                                    && row >= sectionOverlayRect.y
                                    && row < sectionOverlayRect.y + sectionOverlayRect.h
                                );
                                return { index, isTarget };
                            }
                        );
                        const isSectionNameEditing = isEditMode && editingSectionId === section.id;

                        return (
                            <section key={section.id} className="portalHomeDashboardSection__U4m2Q6">
                                <div
                                    className={cn(
                                        "portalHomeDashboardSectionHeader__R5m2Q8",
                                        isSectionNameEditing && "portalHomeDashboardSectionHeaderEditing__F8m2Q5"
                                    )}
                                    onClick={() => {
                                        if (!isEditMode || isSectionNameEditing) return;
                                        startSectionNameEdit(section.id);
                                    }}
                                >
                                    <div className="portalHomeDashboardSectionHeaderNameWrap__H6m2Q9">
                                        {isSectionNameEditing ? (
                                            <input
                                                type="text"
                                                value={editingSectionNameDraft}
                                                onChange={(event) => setEditingSectionNameDraft(event.target.value)}
                                                className="portalHomeDashboardSectionHeaderInput__C7m2Q3"
                                                autoFocus
                                                onBlur={() => commitSectionName(section.id)}
                                                onKeyDown={(event) => {
                                                    if (event.key === "Enter") {
                                                        event.preventDefault();
                                                        commitSectionName(section.id);
                                                    }
                                                    if (event.key === "Escape") {
                                                        event.preventDefault();
                                                        cancelSectionNameEdit();
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <p className="portalHomeDashboardSectionHeaderName__D3m2Q7">{section.name}</p>
                                        )}
                                    </div>

                                    <div className="portalHomeDashboardSectionHeaderActions__T7m2Q4">
                                        {isEditMode && isSectionNameEditing ? (
                                            <button
                                                type="button"
                                                className="portalHomeDashboardSectionIconButton__Q8m2Q5"
                                                onPointerDown={(event) => {
                                                    event.stopPropagation();
                                                    cancelSectionNameEditRef.current = true;
                                                }}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    cancelSectionNameEdit();
                                                }}
                                                aria-label={`Cancel editing ${section.name}`}
                                            >
                                                <X aria-hidden="true" />
                                            </button>
                                        ) : isEditMode ? (
                                            <>
                                                <button
                                                    type="button"
                                                    className="portalHomeDashboardSectionIconButton__Q8m2Q5"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        startSectionNameEdit(section.id);
                                                    }}
                                                    aria-label={`Rename ${section.name}`}
                                                >
                                                    <Pencil aria-hidden="true" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="portalHomeDashboardSectionIconButton__Q8m2Q5"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        onDeleteSection(section.id);
                                                    }}
                                                    aria-label={`Delete ${section.name}`}
                                                    disabled={sortedSections.length <= 1}
                                                >
                                                    <Trash2 aria-hidden="true" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="portalHomeDashboardSectionIconButton__Q8m2Q5"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        onToggleSectionCollapsed(section.id);
                                                    }}
                                                    aria-label={`${section.collapsed ? "Expand" : "Collapse"} ${section.name}`}
                                                >
                                                    {section.collapsed ? <ChevronDown aria-hidden="true" /> : <ChevronUp aria-hidden="true" />}
                                                </button>
                                            </>
                                        ) : null}
                                    </div>
                                </div>

                                {!section.collapsed ? (
                                    <section
                                        ref={(node) => {
                                            if (node) {
                                                gridRefsBySectionRef.current.set(section.id, node);
                                                return;
                                            }
                                            gridRefsBySectionRef.current.delete(section.id);
                                        }}
                                        className={cn(
                                            "portalHomeDashboardGrid__E2m8Q4",
                                            isEditMode && "portalHomeDashboardGridEdit__M7m2Q4",
                                            Boolean((interaction?.sectionId === section.id) || (externalDrop?.sectionId === section.id))
                                            && "portalHomeDashboardGridInteracting__J7m2Q5"
                                        )}
                                        onDragOver={(event) => onExternalWidgetDragOver(section.id, event)}
                                        onDragLeave={onExternalWidgetDragLeave}
                                        onDrop={(event) => onExternalWidgetDrop(section.id, event)}
                                        style={{ minHeight: `calc(var(--portal-home-grid-row-size) * ${sectionMinRows})` }}
                                    >
                                        {isEditMode ? (
                                            <div className="portalHomeDashboardGridOverlay__L7m2Q4" aria-hidden="true">
                                                {sectionGridOverlayCells.map((cell) => {
                                                    const isFirstColumn = cell.index % DASHBOARD_GRID_COLUMNS === 0;
                                                    const isLastColumn = (cell.index + 1) % DASHBOARD_GRID_COLUMNS === 0;
                                                    const isTopRow = cell.index < DASHBOARD_GRID_COLUMNS;
                                                    const cellStyle = {
                                                        "--portal-home-grid-cell-inset-top": isTopRow ? "0px" : "var(--portal-home-grid-inset)",
                                                        "--portal-home-grid-cell-inset-right": isLastColumn ? "0px" : "var(--portal-home-grid-inset)",
                                                        "--portal-home-grid-cell-inset-bottom": "var(--portal-home-grid-inset)",
                                                        "--portal-home-grid-cell-inset-left": isFirstColumn ? "0px" : "var(--portal-home-grid-inset)",
                                                    } as CSSProperties;

                                                    return (
                                                        <span
                                                            key={cell.index}
                                                            className={cn(
                                                                "portalHomeDashboardGridCell__J4m2Q6",
                                                                cell.isTarget && "portalHomeDashboardGridCellTarget__N4m2Q3"
                                                            )}
                                                            style={cellStyle}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        ) : null}

                                        {isEditMode && sectionVisibleWidgets.length === 0 ? (
                                            <div
                                                className="portalHomeDashboardEmptyEdit__M7m2Q9"
                                                aria-hidden="true"
                                                style={{ minHeight: `calc(var(--portal-home-grid-row-size) * ${sectionMinRows})` }}
                                            >
                                                <p>{messages.noSectionsVisible}</p>
                                            </div>
                                        ) : null}

                                        {placedWidgetGrid.items.map((item) => {
                                            const localized = localizedWidgetMeta.get(item.layout.id);
                                            const title = localized?.title ?? item.definition.title;
                                            const dataDescriptor = getWidgetDataDescriptor(item.layout.id);
                                            const removeLabel = messages.removeWidget.replace("{name}", title);
                                            const resizeLabel = messages.resizeWidget.replace("{name}", title);
                                            const isHovered = hoveredWidgetId === item.layout.id;
                                            const isDraggingSource = interaction?.type === "drag" && interaction.widgetId === item.layout.id;
                                            const isResizingSource = interaction?.type === "resize" && interaction.widgetId === item.layout.id;
                                            const isExternalPreviewCard = Boolean(
                                                isEditMode
                                                && externalDrop
                                                && externalDrop.sectionId === section.id
                                                && externalDrop.widgetId === item.layout.id
                                                && externalDragSnapshotRef.current?.find((entry) => entry.id === item.layout.id)?.visible === false
                                            );
                                            const showResizeHandle = isEditMode && !isMobileViewport && (isHovered || isResizingSource);
                                            const twoRowCompact = item.rowSpan <= 2;
                                            const spansLastColumn = item.colStart + item.colSpan - 1 >= DASHBOARD_GRID_COLUMNS;
                                            const cardStyle = {
                                                gridColumn: `${item.colStart} / span ${item.colSpan}`,
                                                gridRow: `${item.rowStart} / span ${item.rowSpan}`,
                                                "--portal-home-card-inset-top": item.rowStart === 1 ? "0px" : "var(--portal-home-grid-inset)",
                                                "--portal-home-card-inset-right": spansLastColumn ? "0px" : "var(--portal-home-grid-inset)",
                                                "--portal-home-card-inset-bottom": "var(--portal-home-grid-inset)",
                                                "--portal-home-card-inset-left": item.colStart === 1 ? "0px" : "var(--portal-home-grid-inset)",
                                            } as CSSProperties;
                                            const activeCardStyle = isResizingSource && resizeLiveStyle
                                                ? { ...cardStyle, ...resizeLiveStyle }
                                                : cardStyle;

                                            if (isExternalPreviewCard) return null;

                                            return (
                                                <article
                                                    key={item.layout.id}
                                                    data-dashboard-widget-card="1"
                                                    ref={(node) => {
                                                        if (node) {
                                                            cardNodeByIdRef.current.set(item.layout.id, node);
                                                            return;
                                                        }
                                                        cardNodeByIdRef.current.delete(item.layout.id);
                                                    }}
                                                    className={cn(
                                                        "portalHomeDashboardCard__U3m8Q2 ui-surface-card",
                                                        twoRowCompact && "portalHomeDashboardCardTwoRowCompact__Q9m2R4",
                                                        isEditMode && "portalHomeDashboardCardEdit__T3m2Q4",
                                                        isEditMode && isHovered && "portalHomeDashboardCardEditHover__T3m2Q8",
                                                        isDraggingSource && "portalHomeDashboardCardDragSource__Q4m2Q8",
                                                        isResizingSource && "portalHomeDashboardCardResizeSource__M8m2Q5"
                                                    )}
                                                    style={activeCardStyle}
                                                    data-size={item.renderSize}
                                                    onPointerEnter={() => {
                                                        if (!isEditMode) return;
                                                        setHoveredWidgetId(item.layout.id);
                                                    }}
                                                    onPointerLeave={() => {
                                                        if (!isEditMode) return;
                                                        setHoveredWidgetId((current) => (current === item.layout.id ? null : current));
                                                    }}
                                                    onPointerDown={(event) => onWidgetPointerDown(section.id, item.layout.id, event)}
                                                >
                                                    <header className="portalHomeDashboardCardHead__H2m8Q4">
                                                        <div className="portalHomeDashboardCardHeading__Q4m7V6">
                                                            <div className="portalHomeDashboardCardTitleRow__A2m2Q5">
                                                                <h3>
                                                                    <Tooltip title={dataDescriptor.heading} description={dataDescriptor.description}>
                                                                        <button
                                                                            type="button"
                                                                            data-dashboard-action="info"
                                                                            className="portalHomeDashboardCardTitleHint__G2m2Q6"
                                                                            aria-label={`Show details for ${dataDescriptor.heading}`}
                                                                        >
                                                                            {title}
                                                                        </button>
                                                                    </Tooltip>
                                                                </h3>
                                                                {dataDescriptor.timeSpecific ? (
                                                                    <span className="portalHomeDashboardCardTimeBadge__F8m2Q4">{DASHBOARD_TIME_SPECIFIC_BADGE}</span>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                        {isEditMode ? (
                                                            <button
                                                                type="button"
                                                                data-dashboard-action="delete"
                                                                className="portalHomeDashboardCardDelete__D6m2Q4"
                                                                aria-label={removeLabel}
                                                                onClick={() => onRemoveWidget(item.layout.id)}
                                                            >
                                                                <X aria-hidden="true" />
                                                            </button>
                                                        ) : null}
                                                    </header>
                                                    <div className={cn(
                                                        "portalHomeDashboardCardBody__Z4m2Q7",
                                                        isEditMode && "portalHomeDashboardCardBodyEdit__J3m2Q7"
                                                    )}>
                                                        {widgetContentLoading
                                                            ? renderWidgetLoadingBody(item.renderSize, twoRowCompact)
                                                            : renderWidgetBody(
                                                                item.layout.id,
                                                                item.renderSize,
                                                                metrics,
                                                                currencyFormatter,
                                                                messages.widgetPreviewUnavailable,
                                                                twoRowCompact,
                                                                widgetCopy
                                                            )}
                                                    </div>
                                                    {showResizeHandle ? (
                                                        <button
                                                            type="button"
                                                            data-dashboard-action="resize"
                                                            className="portalHomeDashboardResizeHandle__K4m2Q7"
                                                            aria-label={resizeLabel}
                                                            onPointerDown={(event) => onWidgetResizePointerDown(section.id, item.layout.id, event)}
                                                        >
                                                            <svg
                                                                className="portalHomeDashboardResizeHandleSvg__T6m2Q4"
                                                                viewBox="0 0 16 16"
                                                                aria-hidden="true"
                                                                focusable="false"
                                                            >
                                                                <path
                                                                    className="portalHomeDashboardResizeHandleIcon__T6m2Q4"
                                                                    d="M14 4.2 V10.4 A3.6 3.6 0 0 1 10.4 14 H4.8 A1.1 1.1 0 0 1 4.02 12.13 L12.13 4.02 A1.1 1.1 0 0 1 14 4.2 Z"
                                                                />
                                                            </svg>
                                                        </button>
                                                    ) : null}
                                                </article>
                                            );
                                        })}

                                        {dragPreviewItem && dragPreviewStyle && interaction?.sectionId === section.id ? (
                                            <article
                                                className="portalHomeDashboardDragPreview__E4m2Q6 ui-surface-card"
                                                style={dragPreviewStyle}
                                                aria-hidden="true"
                                            >
                                                <header className="portalHomeDashboardCardHead__H2m8Q4">
                                                    <div className="portalHomeDashboardCardHeading__Q4m7V6">
                                                        <h3>{localizedWidgetMeta.get(dragPreviewItem.layout.id)?.title ?? dragPreviewItem.definition.title}</h3>
                                                    </div>
                                                </header>
                                                <div className="portalHomeDashboardCardBody__Z4m2Q7 portalHomeDashboardCardBodyEdit__J3m2Q7">
                                                    {widgetContentLoading
                                                        ? renderWidgetLoadingBody(dragPreviewItem.renderSize, dragPreviewItem.rowSpan <= 2)
                                                        : renderWidgetBody(
                                                            dragPreviewItem.layout.id,
                                                            dragPreviewItem.renderSize,
                                                            metrics,
                                                            currencyFormatter,
                                                            messages.widgetPreviewUnavailable,
                                                            dragPreviewItem.rowSpan <= 2,
                                                            widgetCopy
                                                        )}
                                                </div>
                                            </article>
                                        ) : null}
                                    </section>
                                ) : null}
                            </section>
                        );
                    })}
                </>
            )}

            <PortalModal
                open={sectionSequenceOpen}
                title="Section sequence"
                onClose={() => {
                    setSectionSequenceOpen(false);
                    clearSectionSequenceDragState();
                }}
            >
                <div className="portalHomeDashboardSectionSequence__M8m2Q5" ref={sectionSequenceMenuRef}>
                    {sortedSections.map((section) => {
                        const isDragging = draggedSectionId === section.id;
                        if (isDragging) return null;
                        const isDropBefore = sectionDropTarget?.sectionId === section.id && sectionDropTarget.position === "before";
                        const isDropAfter = sectionDropTarget?.sectionId === section.id && sectionDropTarget.position === "after";

                        return (
                            <div key={section.id} className="portalHomeDashboardSectionSequenceItem__S2m2Q7">
                                {isDropBefore ? (
                                    <div
                                        className="portalHomeDashboardSectionDropPlaceholder__X4m2Q8"
                                        data-dashboard-section-drop-id={section.id}
                                        data-dashboard-section-drop-position="before"
                                    />
                                ) : null}
                                <div className="portalHomeDashboardSectionSequenceRow__B4m2Q6" data-dashboard-section-row-id={section.id}>
                                    <span>{section.name}</span>
                                    <button
                                        type="button"
                                        className="portalHomeDashboardSectionSequenceHandle__Q5m2Q7"
                                        aria-label={`Drag ${section.name}`}
                                        onPointerDown={(event) => onSectionReorderPointerDown(event, section.id)}
                                        disabled={!canReorderSections}
                                    >
                                        <GripVertical aria-hidden="true" />
                                    </button>
                                </div>
                                {isDropAfter ? (
                                    <div
                                        className="portalHomeDashboardSectionDropPlaceholder__X4m2Q8"
                                        data-dashboard-section-drop-id={section.id}
                                        data-dashboard-section-drop-position="after"
                                    />
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </PortalModal>

            {sectionDragPreview ? (
                <div
                    className="portalHomeDashboardSectionDragPreview__W7m2Q9"
                    style={{ left: `${sectionDragPreview.x}px`, top: `${sectionDragPreview.y}px` }}
                    aria-hidden="true"
                >
                    <span>{sectionDragPreview.label}</span>
                </div>
            ) : null}
        </section>
    );
}
