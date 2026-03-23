"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/Button";
import { usePortalNavigation } from "@/components/PortalNavigationContext";
import { PortalPageTitle } from "@/components/PortalPageTitle";
import { Tooltip } from "@/components/Tooltip";
import { usePendingChangesHeader } from "@/components/usePendingChangesHeader";
import { usePortalI18n } from "@/i18n/PortalI18nContext";
import { getCurrencyDisplayLabel, getLocalIsoCurrencyCodes, isIsoCurrencyCode, mergeCurrencyCodes } from "@/lib/currencies";
import { fetchCatalogStateFromApi, getCachedCatalogStateSnapshot, saveCatalogStateToApi } from "@/lib/catalogStateClient";
import type { CatalogProduct, VariantDefinition } from "@/lib/productCatalog";
import { createInventoryRecordId, getSellableBatchesForProduct, type InventoryBatch, type InventorySale } from "@/lib/productInventory";
import type { PurchaseOrder } from "@/lib/purchaseOrders";

type InventoryActionMode = "sell" | "maintenance";

type PortalInventoryActionViewProps = {
    mode: InventoryActionMode;
};

type FieldErrors = Partial<Record<"productId" | "batchId" | "date" | "quantity" | "saleUnitPrice" | "description" | "price" | "priceCurrency", string>>;

const FALLBACK_USD_RATES: Record<string, number> = {
    USD: 1,
    EUR: 0.92,
    DKK: 6.89,
    GBP: 0.78,
    CAD: 1.35,
    AUD: 1.51,
    SEK: 10.38,
    NOK: 10.62,
    CHF: 0.88,
    JPY: 148.2,
};

function normalizeText(value: string) {
    return value.trim();
}

function formatDateOnly(value: Date) {
    return value.toISOString().slice(0, 10);
}

function formatMoney(amount: number, currency: string, locale: string) {
    try {
        return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
    } catch {
        return `${amount.toFixed(2)} ${currency}`;
    }
}

function convertWithUsdRates(amount: number, from: string, to: string, usdRates: Record<string, number>) {
    if (!Number.isFinite(amount)) return 0;
    if (from === to) return amount;
    const fromRate = usdRates[from];
    const toRate = usdRates[to];
    if (!Number.isFinite(fromRate) || fromRate <= 0 || !Number.isFinite(toRate) || toRate <= 0) {
        return amount;
    }

    const amountInUsd = amount / fromRate;
    return amountInUsd * toRate;
}

type InventoryActionSectionHeaderProps = {
    title: string;
    description: string;
    action?: ReactNode;
    showTooltip?: boolean;
};

function InventoryActionSectionHeader({ title, description, action, showTooltip = true }: InventoryActionSectionHeaderProps) {
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

function buildInitialInventoryActionState({
    cached,
    isSellMode,
    searchParams,
    defaultCurrency,
}: {
    cached: ReturnType<typeof getCachedCatalogStateSnapshot>;
    isSellMode: boolean;
    searchParams: URLSearchParams;
    defaultCurrency: string;
}) {
    const emptyState = {
        catalogLoaded: false,
        loadError: null as string | null,
        selectedProductId: "",
        selectedBatchId: "",
        sellDate: formatDateOnly(new Date()),
        sellQuantity: "1",
        sellFinalUnitPrice: "0",
        sellNote: "",
        maintenanceDate: formatDateOnly(new Date()),
        maintenanceCurrency: defaultCurrency,
        maintenanceAmount: "",
        maintenanceDescription: "",
        editingSaleId: null as string | null,
        editingMaintenanceId: null as string | null,
    };

    if (!cached) {
        return emptyState;
    }

    const queryProductId = searchParams.get("productId");
    const queryBatchId = searchParams.get("batchId");
    const querySaleId = searchParams.get("saleId");
    const queryMaintenanceId = searchParams.get("maintenanceId");

    if (isSellMode && querySaleId) {
        const existingSale = cached.inventorySales.find((sale) => sale.id === querySaleId) ?? null;
        if (existingSale) {
            return {
                ...emptyState,
                catalogLoaded: true,
                selectedProductId: existingSale.productId,
                selectedBatchId: existingSale.batchId,
                sellDate: existingSale.soldAt.slice(0, 10),
                sellQuantity: String(existingSale.quantity),
                sellFinalUnitPrice: String(existingSale.saleUnitPrice),
                sellNote: existingSale.notes ?? "",
                editingSaleId: existingSale.id,
            };
        }
    }

    if (!isSellMode && queryMaintenanceId) {
        const byBatch = queryBatchId
            ? cached.inventoryBatches.find((batch) => batch.id === queryBatchId)
            : null;
        const matchingBatch = byBatch
            ?? cached.inventoryBatches.find((batch) => (
                (queryProductId ? batch.productId === queryProductId : true)
                && (batch.maintenanceEntries ?? []).some((entry) => entry.id === queryMaintenanceId)
            ))
            ?? null;
        const matchingEntry = matchingBatch?.maintenanceEntries?.find((entry) => entry.id === queryMaintenanceId) ?? null;

        if (matchingBatch && matchingEntry) {
            return {
                ...emptyState,
                catalogLoaded: true,
                selectedProductId: matchingBatch.productId,
                selectedBatchId: matchingBatch.id,
                maintenanceDate: matchingEntry.createdAt.slice(0, 10),
                maintenanceCurrency: matchingEntry.currency,
                maintenanceAmount: String(matchingEntry.amount),
                maintenanceDescription: matchingEntry.description,
                editingMaintenanceId: matchingEntry.id,
            };
        }
    }

    const sellableProductIds = new Set(
        cached.inventoryBatches
            .filter((batch) => batch.remainingQuantity > 0)
            .map((batch) => batch.productId)
    );
    const productsWithBatches = new Set(cached.inventoryBatches.map((batch) => batch.productId));
    const fallbackProductId = isSellMode
        ? cached.products.find((product) => sellableProductIds.has(product.id))?.id ?? ""
        : cached.products.find((product) => productsWithBatches.has(product.id))?.id ?? "";
    const selectedProductId = queryProductId
        && (isSellMode ? sellableProductIds.has(queryProductId) : productsWithBatches.has(queryProductId))
        ? queryProductId
        : fallbackProductId;
    const availableBatches = selectedProductId ? getSellableBatchesForProduct(selectedProductId, cached.inventoryBatches) : [];
    const selectedBatchId = queryBatchId && availableBatches.some((batch) => batch.id === queryBatchId)
        ? queryBatchId
        : availableBatches[0]?.id ?? "";

    return {
        ...emptyState,
        catalogLoaded: true,
        selectedProductId,
        selectedBatchId,
    };
}

export function PortalInventoryActionView({ mode }: PortalInventoryActionViewProps) {
    const { navigateTo } = usePortalNavigation();
    const searchParams = useSearchParams();
    const { language, currency, storeCurrency } = usePortalI18n();
    const cached = getCachedCatalogStateSnapshot();
    const locale = language || "en";
    const isSellMode = mode === "sell";
    const defaultCurrency = isIsoCurrencyCode(currency) ? currency : storeCurrency;
    const initialActionState = useMemo(
        () => buildInitialInventoryActionState({
            cached,
            isSellMode,
            searchParams: new URLSearchParams(searchParams.toString()),
            defaultCurrency,
        }),
        [cached, defaultCurrency, isSellMode, searchParams]
    );

    const [catalogLoaded, setCatalogLoaded] = useState(initialActionState.catalogLoaded);
    const [loadError, setLoadError] = useState<string | null>(initialActionState.loadError);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [products, setProducts] = useState<CatalogProduct[]>(() => cached?.products ?? []);
    const [variantDefinitions, setVariantDefinitions] = useState<VariantDefinition[]>(() => cached?.variantDefinitions ?? []);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => cached?.purchaseOrders ?? []);
    const [batches, setBatches] = useState<InventoryBatch[]>(() => cached?.inventoryBatches ?? []);
    const [inventorySales, setInventorySales] = useState<InventorySale[]>(() => cached?.inventorySales ?? []);

    const [availableCurrencies, setAvailableCurrencies] = useState<string[]>(() => mergeCurrencyCodes(getLocalIsoCurrencyCodes(), [defaultCurrency, storeCurrency]));
    const [usdRates, setUsdRates] = useState<Record<string, number>>(FALLBACK_USD_RATES);

    const [selectedProductId, setSelectedProductId] = useState(initialActionState.selectedProductId);
    const [selectedBatchId, setSelectedBatchId] = useState(initialActionState.selectedBatchId);
    const [sellDate, setSellDate] = useState(initialActionState.sellDate);
    const [sellQuantity, setSellQuantity] = useState(initialActionState.sellQuantity);
    const [sellFinalUnitPrice, setSellFinalUnitPrice] = useState(initialActionState.sellFinalUnitPrice);
    const [sellNote, setSellNote] = useState(initialActionState.sellNote);
    const [maintenanceDate, setMaintenanceDate] = useState(initialActionState.maintenanceDate);
    const [maintenanceCurrency, setMaintenanceCurrency] = useState(initialActionState.maintenanceCurrency);
    const [maintenanceAmount, setMaintenanceAmount] = useState(initialActionState.maintenanceAmount);
    const [maintenanceDescription, setMaintenanceDescription] = useState(initialActionState.maintenanceDescription);
    const [editingSaleId, setEditingSaleId] = useState<string | null>(initialActionState.editingSaleId);
    const [editingMaintenanceId, setEditingMaintenanceId] = useState<string | null>(initialActionState.editingMaintenanceId);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

    const isEditingExistingEntry = isSellMode ? Boolean(editingSaleId) : Boolean(editingMaintenanceId);

    const productById = useMemo(() => {
        const next = new Map<string, CatalogProduct>();
        products.forEach((product) => next.set(product.id, product));
        return next;
    }, [products]);

    const variantById = useMemo(() => {
        const next = new Map<string, VariantDefinition>();
        variantDefinitions.forEach((definition) => next.set(definition.id, definition));
        return next;
    }, [variantDefinitions]);

    const productOptions = useMemo(
        () => [...products].sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" })),
        [products]
    );

    const sellableProductIdSet = useMemo(() => {
        const next = new Set<string>();
        batches.forEach((batch) => {
            if (batch.remainingQuantity <= 0) return;
            next.add(batch.productId);
        });
        return next;
    }, [batches]);

    const availableProducts = useMemo(() => {
        const base = productOptions.filter((product) => (
            isSellMode
                ? sellableProductIdSet.has(product.id)
                : batches.some((batch) => batch.productId === product.id)
        ));
        if (selectedProductId && !base.some((product) => product.id === selectedProductId)) {
            const selected = productById.get(selectedProductId);
            if (selected) return [selected, ...base];
        }
        return base;
    }, [batches, isSellMode, productById, productOptions, selectedProductId, sellableProductIdSet]);

    const selectedProduct = useMemo(
        () => (selectedProductId ? productById.get(selectedProductId) ?? null : null),
        [productById, selectedProductId]
    );

    const availableBatches = useMemo(() => {
        if (!selectedProductId) return [];
        const base = getSellableBatchesForProduct(selectedProductId, batches);
        if (selectedBatchId && !base.some((batch) => batch.id === selectedBatchId)) {
            const selected = batches.find((batch) => batch.productId === selectedProductId && batch.id === selectedBatchId);
            if (selected) return [selected, ...base];
        }
        return base;
    }, [batches, selectedBatchId, selectedProductId]);

    const editingSale = useMemo(
        () => (editingSaleId ? inventorySales.find((sale) => sale.id === editingSaleId) ?? null : null),
        [editingSaleId, inventorySales]
    );

    const selectedBatch = useMemo(
        () => availableBatches.find((batch) => batch.id === selectedBatchId) ?? null,
        [availableBatches, selectedBatchId]
    );

    const selectedOrder = useMemo(
        () => (selectedBatch?.purchaseOrderId ? purchaseOrders.find((order) => order.id === selectedBatch.purchaseOrderId) ?? null : null),
        [purchaseOrders, selectedBatch]
    );

    const variantRows = useMemo(() => {
        if (!selectedBatch) return [];
        return Object.entries(selectedBatch.variantValues)
            .map(([variantId, value]) => ({
                id: variantId,
                label: variantById.get(variantId)?.label ?? variantId,
                value,
            }))
            .filter((entry) => entry.value.trim().length > 0);
    }, [selectedBatch, variantById]);

    const buildBatchOptionLabel = useCallback((batch: InventoryBatch, index: number) => {
        const productVariantOrder = selectedProduct?.productVariantRules?.map((rule) => rule.variantId) ?? [];
        const firstVariantFromProductOrder = productVariantOrder
            .map((variantId) => {
                const rawValue = batch.variantValues[variantId];
                return {
                    variantId,
                    value: typeof rawValue === "string" ? rawValue.trim() : "",
                    label: variantById.get(variantId)?.label ?? variantId,
                };
            })
            .find((entry) => entry.value.length > 0);

        const firstVariantFallback = Object.entries(batch.variantValues)
            .map(([variantId, rawValue]) => ({
                variantId,
                value: (rawValue ?? "").trim(),
                label: variantById.get(variantId)?.label ?? variantId,
            }))
            .filter((entry) => entry.value.length > 0)
            .sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: "base" }))[0];

        const firstVariant = firstVariantFromProductOrder ?? firstVariantFallback;
        const leadText = firstVariant
            ? `${firstVariant.label}: ${firstVariant.value}`
            : selectedProduct?.sku
                ? `SKU: ${selectedProduct.sku}`
                : `Entry ${index + 1}`;

        return `${leadText} · ${batch.purchaseDate} · ${batch.remainingQuantity} left`;
    }, [selectedProduct, variantById]);

    const sellFinalUnitPriceValue = Number(sellFinalUnitPrice);
    const sellQuantityValue = Number(sellQuantity);

    const maintenanceTotalInSaleCurrency = useMemo(() => {
        if (!selectedBatch) return 0;
        return (selectedBatch.maintenanceEntries ?? []).reduce((sum, entry) => {
            const converted = Math.max(0, convertWithUsdRates(entry.amount, entry.currency, selectedBatch.saleCurrency, usdRates));
            return sum + converted;
        }, 0);
    }, [selectedBatch, usdRates]);

    const finalSaleUnitPrice = useMemo(() => {
        if (!selectedBatch || !Number.isFinite(sellFinalUnitPriceValue) || sellFinalUnitPriceValue < 0) return 0;
        return sellFinalUnitPriceValue;
    }, [selectedBatch, sellFinalUnitPriceValue]);

    const paidPerUnitInSaleCurrency = useMemo(() => {
        if (!selectedBatch) return 0;
        return Math.max(0, convertWithUsdRates(
            selectedBatch.purchaseUnitPrice,
            selectedBatch.purchaseCurrency,
            selectedBatch.saleCurrency,
            usdRates
        ));
    }, [selectedBatch, usdRates]);

    const maintenancePerUnitInSaleCurrency = useMemo(() => {
        if (!selectedBatch || selectedBatch.quantity <= 0) return 0;
        return maintenanceTotalInSaleCurrency / selectedBatch.quantity;
    }, [maintenanceTotalInSaleCurrency, selectedBatch]);

    const profitPerUnit = useMemo(
        () => finalSaleUnitPrice - maintenancePerUnitInSaleCurrency - paidPerUnitInSaleCurrency,
        [finalSaleUnitPrice, maintenancePerUnitInSaleCurrency, paidPerUnitInSaleCurrency]
    );

    const totalProfit = useMemo(() => {
        if (!Number.isFinite(sellQuantityValue) || sellQuantityValue <= 0) return 0;
        return Math.round(sellQuantityValue) * profitPerUnit;
    }, [sellQuantityValue, profitPerUnit]);

    const sellQuantityMax = useMemo(() => {
        if (!selectedBatch) return undefined;
        return editingSale
            ? selectedBatch.remainingQuantity + editingSale.quantity
            : selectedBatch.remainingQuantity;
    }, [editingSale, selectedBatch]);

    const getFieldErrors = useCallback((): FieldErrors => {
        const nextErrors: FieldErrors = {};
        if (!selectedProductId) nextErrors.productId = "Select a product.";
        if (!selectedBatchId) nextErrors.batchId = "Select a stock entry.";

        if (isSellMode) {
            if (!normalizeText(sellDate)) nextErrors.date = "Sale date is required.";
            if (!Number.isFinite(sellQuantityValue) || sellQuantityValue <= 0) {
                nextErrors.quantity = "Enter a valid quantity.";
            } else if (selectedBatch) {
                const maxAllowed = editingSale
                    ? selectedBatch.remainingQuantity + editingSale.quantity
                    : selectedBatch.remainingQuantity;
                if (Math.round(sellQuantityValue) > maxAllowed) {
                    nextErrors.quantity = "Quantity exceeds remaining stock.";
                }
            }

            if (!Number.isFinite(sellFinalUnitPriceValue) || sellFinalUnitPriceValue < 0) {
                nextErrors.saleUnitPrice = "Enter a valid final sale price.";
            }
        } else {
            if (!normalizeText(maintenanceDate)) nextErrors.date = "Date is required.";
            if (!normalizeText(maintenanceDescription)) nextErrors.description = "Description is required.";
            const amount = Number(maintenanceAmount);
            if (!isIsoCurrencyCode(maintenanceCurrency)) nextErrors.priceCurrency = "Select a currency.";
            if (!Number.isFinite(amount) || amount < 0) nextErrors.price = "Enter a valid amount.";
        }

        return nextErrors;
    }, [
        isSellMode,
        maintenanceAmount,
        maintenanceCurrency,
        maintenanceDate,
        maintenanceDescription,
        editingSale,
        selectedBatch,
        selectedBatchId,
        selectedProductId,
        sellDate,
        sellFinalUnitPriceValue,
        sellQuantityValue,
    ]);

    const saveDisabled = useMemo(
        () => Object.keys(getFieldErrors()).length > 0 || isSaving || !catalogLoaded,
        [catalogLoaded, getFieldErrors, isSaving]
    );

    usePendingChangesHeader({
        active: catalogLoaded,
        scope: "productCreate",
        discardLabelVariant: "cancel",
        saveDisabled,
        onDiscard: () => void navigateTo("/products/inventory"),
        onSave: async () => {
            const nextErrors = getFieldErrors();
            setFieldErrors(nextErrors);
            setSubmitError(null);
            if (Object.keys(nextErrors).length > 0) return false;

            setIsSaving(true);
            try {
                const current = await fetchCatalogStateFromApi();
                const currentBatches = current.inventoryBatches;
                const batch = currentBatches.find((entry) => entry.id === selectedBatchId && entry.productId === selectedProductId) ?? null;
                if (!batch) {
                    setSubmitError("The selected stock entry is no longer available.");
                    return false;
                }
                if (!isEditingExistingEntry && batch.remainingQuantity <= 0) {
                    setSubmitError("The selected stock entry is no longer available.");
                    return false;
                }

                if (isSellMode) {
                    const quantity = Math.round(Number(sellQuantity));
                    if (!Number.isFinite(quantity) || quantity <= 0) {
                        setSubmitError("Quantity exceeds available stock.");
                        return false;
                    }

                    const finalInput = Number(sellFinalUnitPrice);
                    if (!Number.isFinite(finalInput) || finalInput < 0) {
                        setSubmitError("Enter a valid final sale price.");
                        return false;
                    }

                    const saleDateIso = new Date(`${sellDate}T00:00:00.000Z`).toISOString();
                    const nowIso = new Date().toISOString();
                    const saleUnitPrice = Math.max(0, finalInput);
                    const discountPerUnit = Math.max(0, batch.saleUnitPrice - saleUnitPrice);
                    if (editingSaleId) {
                        const existingSale = current.inventorySales.find((sale) => sale.id === editingSaleId) ?? null;
                        if (!existingSale) {
                            setSubmitError("The selected sale entry could not be found.");
                            return false;
                        }
                        const soldByOtherEntries = current.inventorySales
                            .filter((sale) => sale.batchId === batch.id && sale.id !== editingSaleId)
                            .reduce((sum, sale) => sum + sale.quantity, 0);
                        const maxAllowed = Math.max(0, batch.quantity - soldByOtherEntries);
                        if (quantity > maxAllowed) {
                            setSubmitError("Quantity exceeds available stock.");
                            return false;
                        }
                        const nextSales = current.inventorySales.map((sale) => {
                            if (sale.id !== editingSaleId) return sale;
                            return {
                                ...sale,
                                soldAt: saleDateIso,
                                quantity,
                                currency: batch.saleCurrency,
                                listedSaleUnitPrice: batch.saleUnitPrice,
                                discountPerUnit,
                                saleUnitPrice,
                                totalAmount: quantity * saleUnitPrice,
                                notes: normalizeText(sellNote) || undefined,
                            };
                        });
                        await saveCatalogStateToApi({ inventorySales: nextSales });
                    } else {
                        if (quantity > batch.remainingQuantity) {
                            setSubmitError("Quantity exceeds available stock.");
                            return false;
                        }
                        const nextSale: InventorySale = {
                            id: createInventoryRecordId("sale"),
                            productId: batch.productId,
                            batchId: batch.id,
                            soldAt: saleDateIso,
                            quantity,
                            currency: batch.saleCurrency,
                            listedSaleUnitPrice: batch.saleUnitPrice,
                            discountPerUnit,
                            saleUnitPrice,
                            totalAmount: quantity * saleUnitPrice,
                            notes: normalizeText(sellNote) || undefined,
                            createdAt: nowIso,
                        };

                        await saveCatalogStateToApi({
                            inventorySales: [nextSale, ...current.inventorySales],
                        });
                    }
                } else {
                    const amount = Number(maintenanceAmount);
                    const targetOrderId = batch.purchaseOrderId;
                    if (!targetOrderId) {
                        setSubmitError("This stock entry is not connected to a purchase order.");
                        return false;
                    }

                    const maintenanceCreatedAt = new Date(`${maintenanceDate}T00:00:00.000Z`).toISOString();
                    let updatedExistingEntry = false;
                    const nextPurchaseOrders = current.purchaseOrders.map((order) => {
                        if (order.id !== targetOrderId) return order;
                        return {
                            ...order,
                            updatedAt: new Date().toISOString(),
                            lines: order.lines.map((line) => {
                                if (line.id !== batch.id) return line;
                                const currentEntries = line.maintenanceEntries ?? [];
                                if (editingMaintenanceId) {
                                    return {
                                        ...line,
                                        maintenanceEntries: currentEntries.map((entry) => {
                                            if (entry.id !== editingMaintenanceId) return entry;
                                            updatedExistingEntry = true;
                                            return {
                                                ...entry,
                                                description: normalizeText(maintenanceDescription),
                                                currency: maintenanceCurrency,
                                                amount,
                                                createdAt: maintenanceCreatedAt,
                                            };
                                        }),
                                    };
                                }
                                return {
                                    ...line,
                                    maintenanceEntries: [
                                        {
                                            id: createInventoryRecordId("batch"),
                                            description: normalizeText(maintenanceDescription),
                                            currency: maintenanceCurrency,
                                            amount,
                                            createdAt: maintenanceCreatedAt,
                                        },
                                        ...currentEntries,
                                    ],
                                };
                            }),
                        };
                    });
                    if (editingMaintenanceId && !updatedExistingEntry) {
                        setSubmitError("The selected maintenance entry could not be found.");
                        return false;
                    }

                    await saveCatalogStateToApi({
                        purchaseOrders: nextPurchaseOrders,
                    });
                }

                void navigateTo("/products/inventory");
                return true;
            } catch {
                setSubmitError(isSellMode ? "Unable to save sale right now." : "Unable to save maintenance right now.");
                return false;
            } finally {
                setIsSaving(false);
            }
        },
    });

    useEffect(() => {
        let cancelled = false;
        const hydrate = async () => {
            try {
                const state = await fetchCatalogStateFromApi();
                if (cancelled) return;
                setProducts(state.products);
                setVariantDefinitions(state.variantDefinitions);
                setPurchaseOrders(state.purchaseOrders);
                setBatches(state.inventoryBatches);
                setInventorySales(state.inventorySales);
                setLoadError(null);
                setCatalogLoaded(true);

                const queryProductId = searchParams.get("productId");
                const queryBatchId = searchParams.get("batchId");
                const querySaleId = searchParams.get("saleId");
                const queryMaintenanceId = searchParams.get("maintenanceId");

                if (isSellMode && querySaleId) {
                    const existingSale = state.inventorySales.find((sale) => sale.id === querySaleId) ?? null;
                    if (existingSale) {
                        setEditingSaleId(existingSale.id);
                        setEditingMaintenanceId(null);
                        setSelectedProductId(existingSale.productId);
                        setSelectedBatchId(existingSale.batchId);
                        setSellDate(existingSale.soldAt.slice(0, 10));
                        setSellQuantity(String(existingSale.quantity));
                        setSellFinalUnitPrice(String(existingSale.saleUnitPrice));
                        setSellNote(existingSale.notes ?? "");
                        return;
                    }
                }

                if (!isSellMode && queryMaintenanceId) {
                    const byBatch = queryBatchId
                        ? state.inventoryBatches.find((batch) => batch.id === queryBatchId)
                        : null;
                    const matchingBatch = byBatch
                        ?? state.inventoryBatches.find((batch) => (
                            (queryProductId ? batch.productId === queryProductId : true)
                            && (batch.maintenanceEntries ?? []).some((entry) => entry.id === queryMaintenanceId)
                        ))
                        ?? null;
                    const matchingEntry = matchingBatch?.maintenanceEntries?.find((entry) => entry.id === queryMaintenanceId) ?? null;
                    if (matchingBatch && matchingEntry) {
                        setEditingMaintenanceId(matchingEntry.id);
                        setEditingSaleId(null);
                        setSelectedProductId(matchingBatch.productId);
                        setSelectedBatchId(matchingBatch.id);
                        setMaintenanceDate(matchingEntry.createdAt.slice(0, 10));
                        setMaintenanceCurrency(matchingEntry.currency);
                        setMaintenanceAmount(String(matchingEntry.amount));
                        setMaintenanceDescription(matchingEntry.description);
                        return;
                    }
                }

                setEditingSaleId(null);
                setEditingMaintenanceId(null);
                const sellableProductIds = new Set(
                    state.inventoryBatches
                        .filter((batch) => batch.remainingQuantity > 0)
                        .map((batch) => batch.productId)
                );
                const productsWithBatches = new Set(
                    state.inventoryBatches.map((batch) => batch.productId)
                );
                const fallbackProductId = isSellMode
                    ? state.products.find((product) => sellableProductIds.has(product.id))?.id ?? ""
                    : state.products.find((product) => productsWithBatches.has(product.id))?.id ?? "";
                const nextProductId = queryProductId
                    && (isSellMode ? sellableProductIds.has(queryProductId) : productsWithBatches.has(queryProductId))
                    ? queryProductId
                    : fallbackProductId;
                setSelectedProductId(nextProductId);
                const nextBatches = nextProductId ? getSellableBatchesForProduct(nextProductId, state.inventoryBatches) : [];
                const nextBatchId = queryBatchId && nextBatches.some((batch) => batch.id === queryBatchId)
                    ? queryBatchId
                    : nextBatches[0]?.id ?? "";
                setSelectedBatchId(nextBatchId);
            } catch {
                if (cancelled) return;
                setLoadError("Unable to load inventory data.");
                setCatalogLoaded(true);
            }
        };

        void hydrate();
        return () => {
            cancelled = true;
        };
    }, [isSellMode, searchParams]);

    useEffect(() => {
        const localCodes = getLocalIsoCurrencyCodes();
        if (localCodes.length > 0) {
            setAvailableCurrencies((current) => mergeCurrencyCodes(current, localCodes));
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        const hydrateRates = async () => {
            try {
                const response = await fetch("/api/currency/rates?base=USD", { method: "GET", cache: "no-store" });
                const payload = (await response.json().catch(() => null)) as
                    | { ok?: boolean; rates?: Record<string, number>; codes?: string[] }
                    | null;
                if (!response.ok || !payload?.ok || cancelled) return;

                const nextRates: Record<string, number> = {};
                Object.entries(payload.rates ?? {}).forEach(([code, value]) => {
                    if (!isIsoCurrencyCode(code) || typeof value !== "number" || !Number.isFinite(value) || value <= 0) return;
                    nextRates[code] = value;
                });
                if (Object.keys(nextRates).length > 0) {
                    setUsdRates((current) => ({ ...current, ...nextRates }));
                }

                const codes = (payload.codes ?? Object.keys(nextRates))
                    .map((code) => code.toUpperCase())
                    .filter((code): code is string => isIsoCurrencyCode(code));
                if (codes.length > 0) {
                    setAvailableCurrencies((current) => mergeCurrencyCodes(current, codes));
                }
            } catch {
                // Keep fallback rates.
            }
        };

        void hydrateRates();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!selectedProductId) {
            setSelectedBatchId("");
            return;
        }
        if (availableBatches.length === 0) {
            setSelectedBatchId("");
            return;
        }
        if (availableBatches.some((batch) => batch.id === selectedBatchId)) return;
        setSelectedBatchId(availableBatches[0]?.id ?? "");
    }, [availableBatches, selectedBatchId, selectedProductId]);

    useEffect(() => {
        if (!selectedBatch) return;
        if (isSellMode) {
            if (editingSaleId) return;
            setSellQuantity("1");
            setSellFinalUnitPrice("0");
            return;
        }
        if (editingMaintenanceId) return;
        setMaintenanceCurrency(selectedBatch.purchaseCurrency || defaultCurrency);
        setMaintenanceAmount(String(selectedBatch.purchaseUnitPrice));
    }, [defaultCurrency, editingMaintenanceId, editingSaleId, isSellMode, selectedBatch]);

    const onProductChange = (value: string) => {
        setSelectedProductId(value);
        setFieldErrors((current) => {
            const next = { ...current };
            delete next.productId;
            delete next.batchId;
            return next;
        });
        setSubmitError(null);
    };

    const onBatchChange = (value: string) => {
        setSelectedBatchId(value);
        setFieldErrors((current) => {
            const next = { ...current };
            delete next.batchId;
            return next;
        });
        setSubmitError(null);
    };

    const onSellQuantityChange = (value: string) => {
        if (!selectedBatch) {
            setSellQuantity(value);
            return;
        }

        if (!value.trim()) {
            setSellQuantity("");
            return;
        }

        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
            setSellQuantity(value);
            return;
        }

        const maxAllowed = editingSale
            ? selectedBatch.remainingQuantity + editingSale.quantity
            : selectedBatch.remainingQuantity;
        const clamped = Math.min(maxAllowed, Math.max(1, Math.round(parsed)));
        setSellQuantity(String(clamped));
        setFieldErrors((current) => {
            const next = { ...current };
            delete next.quantity;
            return next;
        });
        setSubmitError(null);
    };

    const onSellFinalUnitPriceChange = (value: string) => {
        setSellFinalUnitPrice(value);
        setFieldErrors((current) => {
            const next = { ...current };
            delete next.saleUnitPrice;
            return next;
        });
        setSubmitError(null);
    };

    const deleteExistingEntry = useCallback(async () => {
        if (isSaving) return;
        setSubmitError(null);
        setIsSaving(true);
        try {
            const current = await fetchCatalogStateFromApi();
            if (isSellMode) {
                if (!editingSaleId) return;
                const existingSale = current.inventorySales.find((sale) => sale.id === editingSaleId) ?? null;
                if (!existingSale) {
                    setSubmitError("The selected sale entry could not be found.");
                    return;
                }
                const nextSales = current.inventorySales.filter((sale) => sale.id !== editingSaleId);
                await saveCatalogStateToApi({ inventorySales: nextSales });
            } else {
                if (!editingMaintenanceId || !selectedBatch?.purchaseOrderId) return;
                let removed = false;
                const nextPurchaseOrders = current.purchaseOrders.map((order) => {
                    if (order.id !== selectedBatch.purchaseOrderId) return order;
                    return {
                        ...order,
                        updatedAt: new Date().toISOString(),
                        lines: order.lines.map((line) => {
                            if (line.id !== selectedBatch.id) return line;
                            const currentEntries = line.maintenanceEntries ?? [];
                            const nextEntries = currentEntries.filter((entry) => entry.id !== editingMaintenanceId);
                            if (nextEntries.length !== currentEntries.length) removed = true;
                            return {
                                ...line,
                                maintenanceEntries: nextEntries,
                            };
                        }),
                    };
                });
                if (!removed) {
                    setSubmitError("The selected maintenance entry could not be found.");
                    return;
                }
                await saveCatalogStateToApi({ purchaseOrders: nextPurchaseOrders });
            }
            void navigateTo("/products/inventory");
        } catch {
            setSubmitError(isSellMode ? "Unable to delete sale right now." : "Unable to delete maintenance right now.");
        } finally {
            setIsSaving(false);
        }
    }, [editingMaintenanceId, editingSaleId, isSaving, isSellMode, navigateTo, selectedBatch]);

    if (!catalogLoaded) {
        return null;
    }

    return (
        <section className="portalProductCreatePage__A3m8Q1 portalProductCreateTarget768__R2m8Q6">
            <PortalPageTitle page="inventory" title={isSellMode ? "Sell stock" : "Add maintenance"} />

            <div className="portalProductCreateLayout__F7m2Q1 portalPurchaseOrderSingleColumnLayout__T8m2Q4">
                <div className="portalProductCreateMainColumn__R7m2Q9">
                    <section className="portalProductCreateMainCard__N4m8Q3 ui-surface-card">
                        <InventoryActionSectionHeader
                            title="Selection"
                            description="Choose a product and stock entry before saving."
                        />
                        <div className="portalInventoryFormGrid__C2m8Q7">
                            <label className="form__group__K7p2s0">
                                <span className="form__label__B9f4k0">
                                    <span className="portalProductCreateRequiredStar__H4m2Q8" aria-hidden="true">*</span>
                                    Product
                                </span>
                                <select className="form__select__P9j2k0" value={selectedProductId} onChange={(event) => onProductChange(event.target.value)}>
                                    <option value="">Select product</option>
                                    {availableProducts.map((product) => (
                                        <option key={product.id} value={product.id}>{product.name}</option>
                                    ))}
                                </select>
                                {fieldErrors.productId ? <p className="portalProductCreateError__Q6m2P8">{fieldErrors.productId}</p> : null}
                            </label>

                            <label className="form__group__K7p2s0">
                                <span className="form__label__B9f4k0">
                                    <span className="portalProductCreateRequiredStar__H4m2Q8" aria-hidden="true">*</span>
                                    Stock entry
                                </span>
                                <select className="form__select__P9j2k0" value={selectedBatchId} onChange={(event) => onBatchChange(event.target.value)}>
                                    <option value="">Select stock entry</option>
                                    {availableBatches.map((batch, index) => (
                                        <option key={batch.id} value={batch.id}>
                                            {buildBatchOptionLabel(batch, index)}
                                        </option>
                                    ))}
                                </select>
                                {fieldErrors.batchId ? <p className="portalProductCreateError__Q6m2P8">{fieldErrors.batchId}</p> : null}
                            </label>
                        </div>
                    </section>

                    <section className="portalProductCreateMainCard__N4m8Q3 ui-surface-card">
                        <InventoryActionSectionHeader
                            title="Stock snapshot"
                            description="Read-only details for the selected stock entry."
                        />
                        {selectedProduct && selectedBatch ? (
                            <div className="portalInventoryDetail__B7m2Q4">
                                <div className="portalInventoryDetailGrid__N2m8Q6">
                                    <p><strong>Product:</strong> {selectedProduct.name}</p>
                                    <p><strong>SKU:</strong> {selectedProduct.sku || "-"}</p>
                                    <p><strong>Purchase order:</strong> {selectedOrder?.poNumber ?? "-"}</p>
                                    <p><strong>Supplier:</strong> {selectedBatch.vendor ?? selectedOrder?.supplierName ?? "-"}</p>
                                    <p><strong>Purchase date:</strong> {selectedBatch.purchaseDate}</p>
                                    <p><strong>Remaining:</strong> {selectedBatch.remainingQuantity}/{selectedBatch.quantity}</p>
                                    <p><strong>Purchase / unit:</strong> {formatMoney(selectedBatch.purchaseUnitPrice, selectedBatch.purchaseCurrency, locale)}</p>
                                    <p><strong>Listed sale / unit:</strong> {formatMoney(selectedBatch.saleUnitPrice, selectedBatch.saleCurrency, locale)}</p>
                                </div>
                                {variantRows.length > 0 ? (
                                    <div className="portalInventorySummaryCard__B3m8Q7">
                                        <p className="portalInventorySummaryTitle__G9m2Q4">Variants</p>
                                        <ul className="portalInventorySummaryList__M4m2Q9">
                                            {variantRows.map((variant) => (
                                                <li key={variant.id} className="portalInventorySummaryListRow__P6m8Q4">
                                                    <span className="portalInventorySummaryListLabel__Q3m2Q7">{variant.label}</span>
                                                    <span className="portalInventorySummaryListValue__Z2m8Q1">{variant.value}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : null}
                            </div>
                        ) : (
                            <p className="portalInventorySummaryEmpty__D8m2Q6">Select a product and stock entry to view details.</p>
                        )}
                    </section>

                    <div className="portalInventoryActionBottomGrid__H4m8Q5">
                        <section className="portalProductCreateMainCard__N4m8Q3 ui-surface-card">
                            <InventoryActionSectionHeader
                                title={isSellMode ? "Sale details" : "Maintenance details"}
                                description={isSellMode ? "Set quantity, final sale price, and sale date." : "Set maintenance date, description, and cost."}
                                action={isEditingExistingEntry ? (
                                    <Button
                                        type="button"
                                        kind="danger"
                                        size="xsmall"
                                        onClick={() => { void deleteExistingEntry(); }}
                                        disabled={isSaving}
                                    >
                                        Delete {isSellMode ? "sale" : "maintenance"}
                                    </Button>
                                ) : undefined}
                            />
                            {isSellMode ? (
                                <div className="portalInventoryFormGrid__C2m8Q7">
                                    <label className="form__group__K7p2s0">
                                        <span className="form__label__B9f4k0">
                                            <span className="portalProductCreateRequiredStar__H4m2Q8" aria-hidden="true">*</span>
                                            Sale date
                                        </span>
                                        <input
                                            className="form__input__Z3n7q0"
                                            type="date"
                                            value={sellDate}
                                            onChange={(event) => setSellDate(event.target.value)}
                                        />
                                        {fieldErrors.date ? <p className="portalProductCreateError__Q6m2P8">{fieldErrors.date}</p> : null}
                                    </label>

                                    <label className="form__group__K7p2s0">
                                        <span className="form__label__B9f4k0">
                                            <span className="portalProductCreateRequiredStar__H4m2Q8" aria-hidden="true">*</span>
                                            Quantity
                                        </span>
                                        <input
                                            className="form__input__Z3n7q0"
                                            type="number"
                                            min={1}
                                            max={sellQuantityMax}
                                            step={1}
                                            value={sellQuantity}
                                            onChange={(event) => onSellQuantityChange(event.target.value)}
                                            placeholder="1"
                                        />
                                        {fieldErrors.quantity ? <p className="portalProductCreateError__Q6m2P8">{fieldErrors.quantity}</p> : null}
                                    </label>

                                    <label className="form__group__K7p2s0 portalInventoryFullWidth__K2m8Q4">
                                        <span className="form__label__B9f4k0">
                                            <span className="portalProductCreateRequiredStar__H4m2Q8" aria-hidden="true">*</span>
                                            Final sell price / unit
                                        </span>
                                        <div className="portalProductCreateMoneyField__M4n2Q9">
                                            <span className="portalProductCreateMoneyFieldCurrency__T6m2Q7">
                                                <span className="portalProductCreateMoneyFieldCode__M9k2P4">{selectedBatch?.saleCurrency ?? storeCurrency}</span>
                                            </span>
                                            <input
                                                className="portalProductCreateMoneyFieldAmount__W8m2Q5"
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={sellFinalUnitPrice}
                                                onChange={(event) => onSellFinalUnitPriceChange(event.target.value)}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        {fieldErrors.saleUnitPrice ? (
                                            <p className="portalProductCreateError__Q6m2P8">{fieldErrors.saleUnitPrice}</p>
                                        ) : null}
                                    </label>

                                    <label className="form__group__K7p2s0 portalInventoryFullWidth__K2m8Q4">
                                        <span className="form__label__B9f4k0">Note</span>
                                        <textarea
                                            className="form__textarea__Q6p3f0"
                                            rows={4}
                                            value={sellNote}
                                            onChange={(event) => setSellNote(event.target.value)}
                                            placeholder="Note"
                                        />
                                    </label>
                                </div>
                            ) : (
                                <div className="portalInventoryFormGrid__C2m8Q7">
                                    <label className="form__group__K7p2s0">
                                        <span className="form__label__B9f4k0">
                                            <span className="portalProductCreateRequiredStar__H4m2Q8" aria-hidden="true">*</span>
                                            Maintenance date
                                        </span>
                                        <input
                                            className="form__input__Z3n7q0"
                                            type="date"
                                            value={maintenanceDate}
                                            onChange={(event) => setMaintenanceDate(event.target.value)}
                                        />
                                        {fieldErrors.date ? <p className="portalProductCreateError__Q6m2P8">{fieldErrors.date}</p> : null}
                                    </label>

                                    <label className="form__group__K7p2s0">
                                        <span className="form__label__B9f4k0">
                                            <span className="portalProductCreateRequiredStar__H4m2Q8" aria-hidden="true">*</span>
                                            Cost
                                        </span>
                                        <div className="portalProductCreateMoneyField__M4n2Q9">
                                            <span className="portalProductCreateMoneyFieldCurrency__T6m2Q7">
                                                <select
                                                    className="portalProductCreateMoneyFieldSelect__G2m8Q4"
                                                    value={maintenanceCurrency}
                                                    onChange={(event) => setMaintenanceCurrency(event.target.value)}
                                                    aria-label="Maintenance currency"
                                                >
                                                    {availableCurrencies.map((code) => (
                                                        <option key={code} value={code}>{getCurrencyDisplayLabel(code, locale)}</option>
                                                    ))}
                                                </select>
                                                <span className="portalProductCreateMoneyFieldCode__M9k2P4">{maintenanceCurrency}</span>
                                            </span>
                                            <input
                                                className="portalProductCreateMoneyFieldAmount__W8m2Q5"
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={maintenanceAmount}
                                                onChange={(event) => setMaintenanceAmount(event.target.value)}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        {fieldErrors.price || fieldErrors.priceCurrency ? (
                                            <p className="portalProductCreateError__Q6m2P8">{fieldErrors.price ?? fieldErrors.priceCurrency}</p>
                                        ) : null}
                                    </label>

                                    <label className="form__group__K7p2s0 portalInventoryFullWidth__K2m8Q4">
                                        <span className="form__label__B9f4k0">
                                            <span className="portalProductCreateRequiredStar__H4m2Q8" aria-hidden="true">*</span>
                                            Description
                                        </span>
                                        <textarea
                                            className="form__textarea__Q6p3f0"
                                            rows={4}
                                            value={maintenanceDescription}
                                            onChange={(event) => setMaintenanceDescription(event.target.value)}
                                            placeholder="Describe maintenance"
                                        />
                                        {fieldErrors.description ? <p className="portalProductCreateError__Q6m2P8">{fieldErrors.description}</p> : null}
                                    </label>
                                </div>
                            )}
                        </section>

                        <section className="portalProductCreateMainCard__N4m8Q3 ui-surface-card">
                            <InventoryActionSectionHeader
                                title="Summary"
                                description="Live totals before you save."
                            />
                            {selectedBatch ? (
                                <div className="portalInventorySummaryCard__B3m8Q7">
                                    <ul className="portalInventorySummaryList__M4m2Q9">
                                        {isSellMode ? (
                                            <>
                                                <li className="portalInventorySummaryListRow__P6m8Q4">
                                                    <span className="portalInventorySummaryListLabel__Q3m2Q7">Price paid / unit</span>
                                                    <span className="portalInventorySummaryListValue__Z2m8Q1">{formatMoney(paidPerUnitInSaleCurrency, selectedBatch.saleCurrency, locale)}</span>
                                                </li>
                                                <li className="portalInventorySummaryListRow__P6m8Q4">
                                                    <span className="portalInventorySummaryListLabel__Q3m2Q7">Maintenance total</span>
                                                    <span className="portalInventorySummaryListValue__Z2m8Q1">{formatMoney(maintenanceTotalInSaleCurrency, selectedBatch.saleCurrency, locale)}</span>
                                                </li>
                                                <li className="portalInventorySummaryListRow__P6m8Q4">
                                                    <span className="portalInventorySummaryListLabel__Q3m2Q7">Final sell price / unit</span>
                                                    <span className="portalInventorySummaryListValue__Z2m8Q1">{formatMoney(finalSaleUnitPrice, selectedBatch.saleCurrency, locale)}</span>
                                                </li>
                                                <li className="portalInventorySummaryListRow__P6m8Q4">
                                                    <span className="portalInventorySummaryListLabel__Q3m2Q7">Profit / unit</span>
                                                    <span className="portalInventorySummaryListValue__Z2m8Q1">{formatMoney(profitPerUnit, selectedBatch.saleCurrency, locale)}</span>
                                                </li>
                                                <li className="portalInventorySummaryListRow__P6m8Q4">
                                                    <span className="portalInventorySummaryListLabel__Q3m2Q7">Total profit</span>
                                                    <span className="portalInventorySummaryListValue__Z2m8Q1">{formatMoney(totalProfit, selectedBatch.saleCurrency, locale)}</span>
                                                </li>
                                            </>
                                        ) : (
                                            <>
                                                <li className="portalInventorySummaryListRow__P6m8Q4">
                                                    <span className="portalInventorySummaryListLabel__Q3m2Q7">Maintenance date</span>
                                                    <span className="portalInventorySummaryListValue__Z2m8Q1">{maintenanceDate || "-"}</span>
                                                </li>
                                                <li className="portalInventorySummaryListRow__P6m8Q4">
                                                    <span className="portalInventorySummaryListLabel__Q3m2Q7">Maintenance cost</span>
                                                    <span className="portalInventorySummaryListValue__Z2m8Q1">
                                                        {formatMoney(Number.isFinite(Number(maintenanceAmount)) ? Number(maintenanceAmount) : 0, maintenanceCurrency, locale)}
                                                    </span>
                                                </li>
                                            </>
                                        )}
                                    </ul>
                                </div>
                            ) : (
                                <p className="portalInventorySummaryEmpty__D8m2Q6">Select a stock entry to see the summary.</p>
                            )}
                        </section>
                    </div>

                    {loadError ? <p className="portalProductCreateError__Q6m2P8">{loadError}</p> : null}
                    {submitError ? <p className="portalProductCreateError__Q6m2P8">{submitError}</p> : null}
                </div>
            </div>
        </section>
    );
}
