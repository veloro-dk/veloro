"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type UIEvent as ReactUIEvent } from "react";
import { ArrowUpDown, ChevronDown, Filter, GripVertical, Pencil, Plus, Search } from "lucide-react";
import { Button } from "@/components/Button";
import { usePortalNavigation } from "@/components/PortalNavigationContext";
import {
    BUILT_IN_VIEWS,
    INVENTORY_CUSTOM_VIEWS_STORAGE_KEY,
    INVENTORY_FALLBACK_USD_RATES,
    INVENTORY_SORT_KEYS,
    INVENTORY_SORT_STORAGE_KEY,
    INVENTORY_VISIBLE_COLUMNS_STORAGE_KEY,
    LANGUAGE_TO_LOCALE,
    cloneFilters,
    convertWithUsdRates,
    createCustomViewId,
    fillTemplate,
    formatDateOnly,
    formatInventory,
    formatStatus,
    getViewLabel,
    loadInventoryCustomViewsFromStorage,
    loadStoredColumnIds,
    type InventoryFilters,
    type InventoryView,
    type Product,
    type SortKey,
} from "@/components/inventory/viewState";
import {
    COLUMN_DRAGGING_BODY_CLASS,
    INVENTORY_DEFAULT_VISIBLE_COLUMNS,
    cn,
    getColumnSection,
    type InventoryColumnDragPreview,
    type InventoryColumnDropTarget,
    normalizeVisibleColumnIds,
    reorderVisibleColumnIds,
    toggleVisibleColumnIds,
    type InventoryTableColumn,
    type InventoryTableColumnId,
} from "@/components/inventory/viewColumns";
import { INVENTORY_TRANSLATIONS } from "@/components/inventory/translations";
import {
    type AddStockFieldErrorKey,
    type MaintenanceFieldErrorKey,
    type SellStockFieldErrorKey,
} from "@/components/inventory/viewTypes";
import { PortalModal } from "@/components/PortalModal";
import { PortalPageTitle } from "@/components/PortalPageTitle";
import { usePortalI18n } from "@/i18n/PortalI18nContext";
import { SUPPORTED_CURRENCIES } from "@/i18n/portal";
import { getCurrencyDisplayLabel, getLocalIsoCurrencyCodes, isIsoCurrencyCode, mergeCurrencyCodes } from "@/lib/currencies";
import {
    getDefaultVariantDefinitions,
    getDefaultProducts,
    type VariantDefinition,
} from "@/lib/productCatalog";
import {
    createInventoryRecordId,
    getSellableBatchesForProduct,
    syncProductsWithInventory,
    type InventoryBatch,
    type InventoryMaintenanceEntry,
    type InventorySale,
} from "@/lib/productInventory";
import { fetchCatalogStateFromApi, getCachedCatalogStateSnapshot, saveCatalogStateToApi } from "@/lib/catalogStateClient";
import { loadStoredSortKey, saveStoredSortKey } from "@/lib/tableSortStorage";

export function PortalInventoryView() {
    const { navigateTo } = usePortalNavigation();
    const { language, currency, storeCurrency } = usePortalI18n();
    const text = INVENTORY_TRANSLATIONS[language] ?? INVENTORY_TRANSLATIONS.en;
    const locale = LANGUAGE_TO_LOCALE[language] ?? "en-US";
    const defaultEntryCurrency = isIsoCurrencyCode(currency) ? currency : storeCurrency;
    const cachedCatalogState = getCachedCatalogStateSnapshot();

    const [batches, setBatches] = useState<InventoryBatch[]>(() => cachedCatalogState?.inventoryBatches ?? []);
    const [sales, setSales] = useState<InventorySale[]>(() => cachedCatalogState?.inventorySales ?? []);
    const [products, setProducts] = useState<Product[]>(() => (
        cachedCatalogState
            ? syncProductsWithInventory(cachedCatalogState.products, cachedCatalogState.inventoryBatches)
            : getDefaultProducts()
    ));
    const [variantDefinitions, setVariantDefinitions] = useState<VariantDefinition[]>(() => (
        cachedCatalogState?.variantDefinitions ?? getDefaultVariantDefinitions()
    ));
    const [views, setViews] = useState<InventoryView[]>(BUILT_IN_VIEWS);
    const [activeViewId, setActiveViewId] = useState<string>(BUILT_IN_VIEWS[0].id);
    const [workingFilters, setWorkingFilters] = useState<InventoryFilters>(cloneFilters(BUILT_IN_VIEWS[0].filters));
    const [searchMode, setSearchMode] = useState(false);
    const [viewComposerOpen, setViewComposerOpen] = useState(false);
    const [viewDraftName, setViewDraftName] = useState("");
    const [hasHydratedViews, setHasHydratedViews] = useState(false);
    const [hasHydratedColumns, setHasHydratedColumns] = useState(false);
    const [catalogLoaded, setCatalogLoaded] = useState(Boolean(cachedCatalogState));
    const [sortBy, setSortBy] = useState<SortKey>(() => (
        loadStoredSortKey(INVENTORY_SORT_STORAGE_KEY, INVENTORY_SORT_KEYS, "updated-desc")
    ));
    const [sortMenuOpen, setSortMenuOpen] = useState(false);
    const [conditionFilterMenuOpen, setConditionFilterMenuOpen] = useState(false);
    const [columnEditorOpen, setColumnEditorOpen] = useState(false);
    const [visibleColumnIds, setVisibleColumnIds] = useState<InventoryTableColumnId[]>(INVENTORY_DEFAULT_VISIBLE_COLUMNS);
    const [draggedColumnId, setDraggedColumnId] = useState<InventoryTableColumnId | null>(null);
    const [columnDropTarget, setColumnDropTarget] = useState<InventoryColumnDropTarget | null>(null);
    const [columnDragPreview, setColumnDragPreview] = useState<InventoryColumnDragPreview | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [, setAddStockOpen] = useState(false);
    const [, setSellStockOpen] = useState(false);
    const [sellProductId, setSellProductId] = useState<string | null>(null);
    const [, setMaintenanceOpen] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [, setAddStockErrors] = useState<Partial<Record<AddStockFieldErrorKey, string>>>({});
    const [, setSellStockErrors] = useState<Partial<Record<SellStockFieldErrorKey, string>>>({});
    const [, setMaintenanceErrors] = useState<Partial<Record<MaintenanceFieldErrorKey, string>>>({});
    const [inventoryTableScrolledX, setInventoryTableScrolledX] = useState(false);

    const [addProductId, setAddProductId] = useState("");
    const [addPurchaseDate, setAddPurchaseDate] = useState(() => formatDateOnly(new Date()));
    const [addQuantity, setAddQuantity] = useState("");
    const [addPurchaseUnitPrice, setAddPurchaseUnitPrice] = useState("");
    const [addSaleUnitPrice, setAddSaleUnitPrice] = useState("");
    const [addVendor, setAddVendor] = useState("");
    const [addNotes, setAddNotes] = useState("");

    const [sellDate, setSellDate] = useState(() => formatDateOnly(new Date()));
    const [sellQuantity, setSellQuantity] = useState("");
    const [sellBatchId, setSellBatchId] = useState("");
    const [sellDiscountCurrency, setSellDiscountCurrency] = useState<string>(defaultEntryCurrency);
    const [sellDiscountPerUnit, setSellDiscountPerUnit] = useState("0");
    const [sellNotes, setSellNotes] = useState("");
    const [maintenanceProductId, setMaintenanceProductId] = useState("");
    const [maintenanceBatchId, setMaintenanceBatchId] = useState("");
    const [maintenanceCurrency, setMaintenanceCurrency] = useState<string>(defaultEntryCurrency);
    const [maintenanceDescription, setMaintenanceDescription] = useState("");
    const [maintenancePrice, setMaintenancePrice] = useState("");
    const [availableCurrencies, setAvailableCurrencies] = useState<string[]>(() => [...SUPPORTED_CURRENCIES]);
    const [usdRates, setUsdRates] = useState<Record<string, number>>(INVENTORY_FALLBACK_USD_RATES);

    const sortMenuRef = useRef<HTMLDivElement | null>(null);
    const conditionFilterMenuRef = useRef<HTMLDivElement | null>(null);
    const columnEditorMenuRef = useRef<HTMLDivElement | null>(null);
    const selectAllRef = useRef<HTMLInputElement | null>(null);
    const inventoryTableScrollRef = useRef<HTMLDivElement | null>(null);
    const draggedColumnIdRef = useRef<InventoryTableColumnId | null>(null);
    const columnDropTargetRef = useRef<InventoryColumnDropTarget | null>(null);
    const searchQueryInputRef = useRef<HTMLInputElement | null>(null);
    const viewDraftInputRef = useRef<HTMLInputElement | null>(null);

    const activeView = useMemo(() => views.find((view) => view.id === activeViewId) ?? views[0], [views, activeViewId]);
    const conditionOptions = useMemo(() => ["ALL", "ACTIVE", "DRAFT", "ARCHIVED"] as const, []);

    const dateFormatter = useMemo(
        () => new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }),
        [locale]
    );
    const currencyOptions = useMemo(
        () => mergeCurrencyCodes(availableCurrencies, [defaultEntryCurrency, storeCurrency, sellDiscountCurrency, maintenanceCurrency]),
        [availableCurrencies, defaultEntryCurrency, maintenanceCurrency, sellDiscountCurrency, storeCurrency]
    );
    const currencyLabelByCode = useMemo(() => {
        const labels = new Map<string, string>();
        currencyOptions.forEach((code) => {
            labels.set(code, getCurrencyDisplayLabel(code, locale));
        });
        return labels;
    }, [currencyOptions, locale]);

    const variantDefinitionById = useMemo(() => {
        const next = new Map<string, VariantDefinition>();
        variantDefinitions.forEach((definition) => next.set(definition.id, definition));
        return next;
    }, [variantDefinitions]);

    const allColumns = useMemo<InventoryTableColumn[]>(() => [
        {
            id: "product",
            label: text.table.product,
            locked: true,
        },
        {
            id: "inventory",
            label: text.table.inventory,
        },
        {
            id: "category",
            label: text.table.category,
        },
        {
            id: "updated",
            label: text.table.updated,
        },
        ...variantDefinitions.map((definition) => ({
            id: `variant:${definition.id}` as InventoryTableColumnId,
            label: definition.label,
            variantId: definition.id,
        })),
    ], [text.table, variantDefinitions]);
    const normalizedVisibleColumnIds = useMemo(
        () => normalizeVisibleColumnIds(visibleColumnIds, allColumns),
        [allColumns, visibleColumnIds]
    );

    const editorColumnsBySection = useMemo(() => {
        const visibleOrder = new Map<InventoryTableColumnId, number>();
        normalizedVisibleColumnIds.forEach((columnId, index) => {
            visibleOrder.set(columnId, index);
        });
        const defaultOrder = new Map<InventoryTableColumnId, number>();
        allColumns.forEach((column, index) => {
            defaultOrder.set(column.id, index);
        });

        const sortColumns = (left: InventoryTableColumn, right: InventoryTableColumn) => {
            const leftVisibleIndex = visibleOrder.get(left.id);
            const rightVisibleIndex = visibleOrder.get(right.id);
            if (typeof leftVisibleIndex === "number" && typeof rightVisibleIndex === "number") {
                return leftVisibleIndex - rightVisibleIndex;
            }
            if (typeof leftVisibleIndex === "number") return -1;
            if (typeof rightVisibleIndex === "number") return 1;
            return (defaultOrder.get(left.id) ?? 0) - (defaultOrder.get(right.id) ?? 0);
        };

        return {
            standard: allColumns.filter((column) => !column.variantId).sort(sortColumns),
            variant: allColumns.filter((column) => Boolean(column.variantId)).sort(sortColumns),
        };
    }, [allColumns, normalizedVisibleColumnIds]);
    const standardColumns = editorColumnsBySection.standard;
    const variantColumns = editorColumnsBySection.variant;

    const visibleColumns = useMemo(() => {
        const columnById = new Map(allColumns.map((column) => [column.id, column]));
        return normalizedVisibleColumnIds
            .map((columnId) => columnById.get(columnId))
            .filter((column): column is InventoryTableColumn => Boolean(column));
    }, [allColumns, normalizedVisibleColumnIds]);

    const visibleColumnIdSet = useMemo(
        () => new Set(visibleColumns.map((column) => column.id)),
        [visibleColumns]
    );
    const visibleColumnIndexById = useMemo(
        () => new Map(visibleColumns.map((column, index) => [column.id, index] as const)),
        [visibleColumns]
    );

    const tableColumnSpan = 1 + visibleColumns.length;

    const addStockProduct = useMemo(
        () => products.find((product) => product.id === addProductId) ?? null,
        [products, addProductId]
    );

    const addStockProductDetails = useMemo(
        () => addStockProduct
            ? Object.entries(addStockProduct.variants)
                .map(([variantId, value]) => ({
                    id: variantId,
                    label: variantDefinitionById.get(variantId)?.label ?? variantId,
                    value,
                }))
                .filter((entry) => entry.value.trim().length > 0)
            : [],
        [addStockProduct, variantDefinitionById]
    );

    useEffect(() => {
        let cancelled = false;
        let gateTimeoutId: number | null = null;

        const hydrate = async () => {
            const customViews = loadInventoryCustomViewsFromStorage();
            gateTimeoutId = window.setTimeout(() => {
                if (cancelled) return;
                setHasHydratedViews(true);
                setCatalogLoaded(true);
            }, 8000);
            try {
                const state = await fetchCatalogStateFromApi();
                if (cancelled) return;
                setBatches(state.inventoryBatches);
                setSales(state.inventorySales);
                setProducts(syncProductsWithInventory(state.products, state.inventoryBatches));
                setVariantDefinitions(state.variantDefinitions);
            } catch {
                if (cancelled) return;
                setBatches([]);
                setSales([]);
                setProducts(syncProductsWithInventory(getDefaultProducts(), []));
                setVariantDefinitions(getDefaultVariantDefinitions());
            } finally {
                if (cancelled) return;
                if (gateTimeoutId !== null) {
                    window.clearTimeout(gateTimeoutId);
                    gateTimeoutId = null;
                }
                setCatalogLoaded(true);
            }

            if (cancelled) return;
            if (customViews.length > 0) {
                setViews([...BUILT_IN_VIEWS, ...customViews]);
            }
            setHasHydratedViews(true);
        };

        void hydrate();

        return () => {
            cancelled = true;
            if (gateTimeoutId !== null) {
                window.clearTimeout(gateTimeoutId);
            }
        };
    }, []);

    useEffect(() => {
        setSellDiscountCurrency(defaultEntryCurrency);
        setMaintenanceCurrency(defaultEntryCurrency);
    }, [defaultEntryCurrency]);

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
                // Keep fallback currency list and fallback rates.
            }
        };

        void hydrateRates();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const onPointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (sortMenuOpen && sortMenuRef.current && !sortMenuRef.current.contains(target)) {
                setSortMenuOpen(false);
            }
            if (conditionFilterMenuOpen && conditionFilterMenuRef.current && !conditionFilterMenuRef.current.contains(target)) {
                setConditionFilterMenuOpen(false);
            }
            if (columnEditorOpen && columnEditorMenuRef.current && !columnEditorMenuRef.current.contains(target)) {
                setColumnEditorOpen(false);
            }
        };

        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, [sortMenuOpen, conditionFilterMenuOpen, columnEditorOpen]);

    useEffect(() => {
        if (!hasHydratedViews || typeof window === "undefined") return;
        const customViews = views
            .filter((view) => !view.builtIn)
            .map((view) => ({
                id: view.id,
                label: view.label,
                filters: cloneFilters(view.filters),
            }));
        window.localStorage.setItem(INVENTORY_CUSTOM_VIEWS_STORAGE_KEY, JSON.stringify(customViews));
    }, [views, hasHydratedViews]);

    useEffect(() => {
        saveStoredSortKey(INVENTORY_SORT_STORAGE_KEY, sortBy);
    }, [sortBy]);

    useEffect(() => {
        let cancelled = false;
        const stored = loadStoredColumnIds(INVENTORY_VISIBLE_COLUMNS_STORAGE_KEY);

        queueMicrotask(() => {
            if (cancelled) return;
            if (stored.length > 0) {
                setVisibleColumnIds(stored as InventoryTableColumnId[]);
            }
            setHasHydratedColumns(true);
        });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!hasHydratedColumns || typeof window === "undefined") return;
        window.localStorage.setItem(INVENTORY_VISIBLE_COLUMNS_STORAGE_KEY, JSON.stringify(normalizedVisibleColumnIds));
    }, [normalizedVisibleColumnIds, hasHydratedColumns]);

    useEffect(() => {
        columnDropTargetRef.current = columnDropTarget;
    }, [columnDropTarget]);

    useEffect(() => {
        if (typeof document === "undefined") return;
        document.body.classList.toggle(COLUMN_DRAGGING_BODY_CLASS, Boolean(draggedColumnId));
        return () => {
            document.body.classList.remove(COLUMN_DRAGGING_BODY_CLASS);
        };
    }, [draggedColumnId]);

    useEffect(() => {
        if (!searchMode) return;
        searchQueryInputRef.current?.focus();
    }, [searchMode]);

    useEffect(() => {
        if (!viewComposerOpen) return;
        viewDraftInputRef.current?.focus();
    }, [viewComposerOpen]);

    const visibleProducts = useMemo(() => {
        const normalizedQuery = workingFilters.query.trim().toLowerCase();
        const filtered = products.filter((product) => {
            if (workingFilters.condition !== "ALL" && product.status !== workingFilters.condition) return false;
            if (!normalizedQuery) return true;

            const searchText = [
                product.name,
                product.sku,
                product.category,
                formatStatus(product.status, text.statusLabels),
                ...product.tags,
                ...Object.values(product.variants),
            ]
                .join(" ")
                .toLowerCase();

            return searchText.includes(normalizedQuery);
        });

        return filtered.sort((left, right) => {
            switch (sortBy) {
                case "updated-desc":
                    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
                case "updated-asc":
                    return new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime();
                case "name-asc":
                    return left.name.localeCompare(right.name);
                case "name-desc":
                    return right.name.localeCompare(left.name);
                case "inventory-desc":
                    return right.inventory - left.inventory;
                case "inventory-asc":
                    return left.inventory - right.inventory;
                default:
                    return 0;
            }
        });
    }, [products, sortBy, text.statusLabels, workingFilters]);

    const visibleProductIds = useMemo(() => visibleProducts.map((product) => product.id), [visibleProducts]);
    const selectedVisibleCount = useMemo(
        () => visibleProductIds.filter((id) => selectedIds.has(id)).length,
        [visibleProductIds, selectedIds]
    );
    const allVisibleSelected = visibleProductIds.length > 0 && selectedVisibleCount === visibleProductIds.length;
    const hasSelection = selectedIds.size > 0;
    const hasActiveFilters = useMemo(
        () => workingFilters.query.trim().length > 0 || workingFilters.condition !== "ACTIVE",
        [workingFilters]
    );

    useEffect(() => {
        if (!selectAllRef.current) return;
        selectAllRef.current.indeterminate = selectedVisibleCount > 0 && !allVisibleSelected;
    }, [selectedVisibleCount, allVisibleSelected]);

    const actionProductId = useMemo(() => {
        const [firstSelected] = Array.from(selectedIds);
        return firstSelected ?? null;
    }, [selectedIds]);

    const sellableProductIdSet = useMemo(() => {
        const next = new Set<string>();
        batches.forEach((batch) => {
            if (batch.remainingQuantity <= 0) return;
            next.add(batch.productId);
        });
        return next;
    }, [batches]);

    const sellableProducts = useMemo(
        () => products.filter((product) => sellableProductIdSet.has(product.id)),
        [products, sellableProductIdSet]
    );

    const firstSellableProductId = useMemo(
        () => products.find((product) => sellableProductIdSet.has(product.id))?.id ?? null,
        [products, sellableProductIdSet]
    );
    const hasSellableInventory = firstSellableProductId !== null;

    const sellProduct = useMemo(
        () => (sellProductId ? products.find((product) => product.id === sellProductId) ?? null : null),
        [products, sellProductId]
    );

    const sellProductBatches = useMemo(
        () => (sellProduct ? getSellableBatchesForProduct(sellProduct.id, batches) : []),
        [sellProduct, batches]
    );
    const sellSelectedBatch = useMemo(
        () => sellProductBatches.find((batch) => batch.id === sellBatchId) ?? null,
        [sellProductBatches, sellBatchId]
    );

    const maintenanceProductBatches = useMemo(
        () => (maintenanceProductId ? getSellableBatchesForProduct(maintenanceProductId, batches) : []),
        [maintenanceProductId, batches]
    );
    const maintenanceSelectedBatch = useMemo(
        () => maintenanceProductBatches.find((batch) => batch.id === maintenanceBatchId) ?? null,
        [maintenanceProductBatches, maintenanceBatchId]
    );

    const currencyFormatterByCode = useCallback((code: string) => {
        try {
            return new Intl.NumberFormat(locale, { style: "currency", currency: code });
        } catch {
            return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
        }
    }, [locale]);

    useEffect(() => {
        if (!sellProductId) return;
        if (sellProductBatches.length === 0) {
            setSellBatchId("");
            return;
        }
        if (sellBatchId && sellProductBatches.some((batch) => batch.id === sellBatchId)) return;
        setSellBatchId("");
    }, [sellBatchId, sellProductBatches, sellProductId]);

    useEffect(() => {
        if (!maintenanceProductId) {
            setMaintenanceBatchId("");
            return;
        }
        if (maintenanceBatchId && maintenanceProductBatches.some((batch) => batch.id === maintenanceBatchId)) return;
        setMaintenanceBatchId("");
    }, [maintenanceBatchId, maintenanceProductBatches, maintenanceProductId]);

    const applyInventory = (
        nextBatches: InventoryBatch[],
        nextSales: InventorySale[],
        updatedProductIds: string[] = []
    ) => {
        const updatedSet = new Set(updatedProductIds);
        const nowIso = new Date().toISOString();
        setBatches(nextBatches);
        setSales(nextSales);
        setProducts((current) => {
            const synced = syncProductsWithInventory(current, nextBatches).map((product) => (
                updatedSet.has(product.id)
                    ? { ...product, updatedAt: nowIso }
                    : product
            ));
            void saveCatalogStateToApi({
                products: synced,
                inventoryBatches: nextBatches,
                inventorySales: nextSales,
            }).catch(() => undefined);
            return synced;
        });
    };

    const resetAddStockForm = () => {
        setAddProductId("");
        setAddPurchaseDate(formatDateOnly(new Date()));
        setAddQuantity("");
        setAddPurchaseUnitPrice("");
        setAddSaleUnitPrice("");
        setAddVendor("");
        setAddNotes("");
        setAddStockErrors({});
    };

    const resetSellStockForm = () => {
        setSellDate(formatDateOnly(new Date()));
        setSellBatchId("");
        setSellQuantity("");
        setSellDiscountCurrency(defaultEntryCurrency);
        setSellDiscountPerUnit("0");
        setSellNotes("");
        setSellStockErrors({});
    };

    const resetMaintenanceForm = (nextProductId?: string) => {
        setMaintenanceProductId(nextProductId ?? "");
        setMaintenanceBatchId("");
        setMaintenanceCurrency(defaultEntryCurrency);
        setMaintenanceDescription("");
        setMaintenancePrice("");
        setMaintenanceErrors({});
    };

    const openAddStock = () => {
        setActionError(null);
        const query = actionProductId ? `?productId=${encodeURIComponent(actionProductId)}` : "";
        void navigateTo(`/products/purchase-orders/new${query}`);
    };

    const createPurchaseOrderForSelected = () => {
        const selectedProductIds = Array.from(selectedIds)
            .filter((productId) => products.some((product) => product.id === productId));
        if (selectedProductIds.length === 0) return;
        const params = new URLSearchParams();
        selectedProductIds.forEach((productId) => {
            params.append("productId", productId);
        });
        void navigateTo(`/products/purchase-orders/new?${params.toString()}`);
    };

    const openSellStock = () => {
        if (!hasSellableInventory) {
            setActionError(text.errors.noSellableStock);
            return;
        }
        const prefillProductId = selectedIds.size === 1 && actionProductId && sellableProductIdSet.has(actionProductId)
            ? actionProductId
            : null;
        const query = prefillProductId
            ? `?productId=${encodeURIComponent(prefillProductId)}`
            : "";
        setActionError(null);
        void navigateTo(`/products/inventory/sell${query}`);
    };

    const openMaintenance = () => {
        if (!hasSellableInventory) {
            setActionError(text.errors.noSellableStock);
            return;
        }
        const prefillProductId = selectedIds.size === 1 && actionProductId && sellableProductIdSet.has(actionProductId)
            ? actionProductId
            : null;
        const query = prefillProductId
            ? `?productId=${encodeURIComponent(prefillProductId)}`
            : "";
        setActionError(null);
        void navigateTo(`/products/inventory/maintenance${query}`);
    };

    const onSellProductChange = (nextProductId: string) => {
        setSellProductId(nextProductId);
        setSellBatchId("");
        setSellDiscountCurrency(defaultEntryCurrency);
        setSellDiscountPerUnit("0");
        setSellStockErrors((current) => {
            const next = { ...current };
            delete next.productId;
            delete next.batchId;
            return next;
        });
    };

    const onSellBatchChange = (nextBatchId: string) => {
        setSellBatchId(nextBatchId);
        const selectedBatch = sellProductBatches.find((batch) => batch.id === nextBatchId) ?? null;
        if (selectedBatch) {
            setSellDiscountCurrency(selectedBatch.saleCurrency || defaultEntryCurrency);
            setSellDiscountPerUnit("0");
        } else {
            setSellDiscountCurrency(defaultEntryCurrency);
        }
        setSellStockErrors((current) => {
            const next = { ...current };
            delete next.batchId;
            delete next.discountCurrency;
            return next;
        });
    };

    const onMaintenanceProductChange = (nextProductId: string) => {
        setMaintenanceProductId(nextProductId);
        setMaintenanceBatchId("");
        setMaintenanceCurrency(defaultEntryCurrency);
        setMaintenancePrice("");
        setMaintenanceErrors((current) => {
            const next = { ...current };
            delete next.productId;
            delete next.batchId;
            return next;
        });
    };

    const onMaintenanceBatchChange = (nextBatchId: string) => {
        setMaintenanceBatchId(nextBatchId);
        const selectedBatch = maintenanceProductBatches.find((batch) => batch.id === nextBatchId) ?? null;
        if (selectedBatch) {
            setMaintenanceCurrency(selectedBatch.purchaseCurrency || defaultEntryCurrency);
            setMaintenancePrice(String(selectedBatch.purchaseUnitPrice));
        } else {
            setMaintenanceCurrency(defaultEntryCurrency);
            setMaintenancePrice("");
        }
        setMaintenanceErrors((current) => {
            const next = { ...current };
            delete next.batchId;
            delete next.currency;
            return next;
        });
    };

    const onMaintenanceConfirm = () => {
        const price = Number(maintenancePrice);
        const nextErrors: Partial<Record<MaintenanceFieldErrorKey, string>> = {};
        if (!maintenanceProductId) {
            nextErrors.productId = text.errors.chooseProduct;
        }
        if (!maintenanceBatchId) {
            nextErrors.batchId = text.errors.maintenanceInvalid;
        }
        if (!isIsoCurrencyCode(maintenanceCurrency)) {
            nextErrors.currency = text.errors.maintenanceInvalid;
        }
        if (maintenanceDescription.trim().length === 0) {
            nextErrors.description = text.errors.maintenanceInvalid;
        }
        if (!Number.isFinite(price) || price < 0) {
            nextErrors.price = text.errors.maintenanceInvalid;
        }

        if (Object.keys(nextErrors).length > 0) {
            setMaintenanceErrors(nextErrors);
            return;
        }

        const targetBatch = maintenanceProductBatches.find((batch) => batch.id === maintenanceBatchId) ?? null;
        if (!targetBatch || targetBatch.remainingQuantity <= 0) {
            setMaintenanceErrors({ batchId: text.errors.maintenanceInvalid });
            return;
        }

        const nowIso = new Date().toISOString();
        const maintenanceEntry: InventoryMaintenanceEntry = {
            id: createInventoryRecordId("batch"),
            description: maintenanceDescription.trim(),
            currency: maintenanceCurrency,
            amount: price,
            createdAt: nowIso,
        };

        const nextBatches = batches.map((batch) => (
            batch.id === targetBatch.id
                ? {
                    ...batch,
                    maintenanceEntries: [maintenanceEntry, ...(batch.maintenanceEntries ?? [])],
                    updatedAt: nowIso,
                }
                : batch
        ));

        applyInventory(nextBatches, sales, [targetBatch.productId]);
        setMaintenanceOpen(false);
        setMaintenanceErrors({});
        setActionError(null);
    };

    const onAddProductChange = (nextProductId: string) => {
        setAddProductId(nextProductId);
        setAddStockErrors((current) => {
            const next = { ...current };
            delete next.productId;
            return next;
        });
    };

    const onAddStockConfirm = () => {
        if (!addProductId || !addStockProduct) {
            setActionError(text.errors.chooseProduct);
            return;
        }

        const quantity = Number(addQuantity);
        const purchaseUnitPrice = Number(addPurchaseUnitPrice);
        const saleUnitPrice = Number(addSaleUnitPrice);
        const nextErrors: Partial<Record<AddStockFieldErrorKey, string>> = {};
        if (!addProductId) {
            nextErrors.productId = text.errors.chooseProduct;
        }
        if (addPurchaseDate.trim().length === 0) {
            nextErrors.purchaseDate = text.errors.addStockInvalid;
        }
        if (!Number.isFinite(quantity) || quantity <= 0) {
            nextErrors.quantity = text.errors.addStockInvalid;
        }
        if (!Number.isFinite(purchaseUnitPrice) || purchaseUnitPrice < 0) {
            nextErrors.purchaseUnitPrice = text.errors.addStockInvalid;
        }
        if (!Number.isFinite(saleUnitPrice) || saleUnitPrice < 0) {
            nextErrors.saleUnitPrice = text.errors.addStockInvalid;
        }

        if (Object.keys(nextErrors).length > 0) {
            setAddStockErrors(nextErrors);
            return;
        }

        setAddStockErrors({});
        const nowIso = new Date().toISOString();
        const nextBatch: InventoryBatch = {
            id: createInventoryRecordId("batch"),
            productId: addStockProduct.id,
            variantValues: {},
            purchaseDate: addPurchaseDate,
            quantity: Math.round(quantity),
            remainingQuantity: Math.round(quantity),
            purchaseCurrency: storeCurrency,
            purchaseUnitPrice,
            saleCurrency: storeCurrency,
            saleUnitPrice,
            vendor: addVendor.trim() || undefined,
            notes: addNotes.trim() || undefined,
            createdAt: nowIso,
            updatedAt: nowIso,
        };

        applyInventory([nextBatch, ...batches], sales, [addStockProduct.id]);
        setAddStockOpen(false);
        setActionError(null);
    };

    const onSellStockConfirm = () => {
        if (!sellProduct) {
            setSellStockErrors({ productId: text.errors.chooseProduct });
            return;
        }
        if (!sellSelectedBatch) {
            setSellStockErrors({ batchId: text.errors.sellStockInvalid });
            return;
        }

        const quantity = Number(sellQuantity);
        const listedSaleUnitPrice = sellSelectedBatch.saleUnitPrice;
        const discountPerUnitInput = Number(sellDiscountPerUnit);

        const nextErrors: Partial<Record<SellStockFieldErrorKey, string>> = {};
        if (!sellProductId) {
            nextErrors.productId = text.errors.chooseProduct;
        }
        if (!sellBatchId) {
            nextErrors.batchId = text.errors.sellStockInvalid;
        }
        if (sellDate.trim().length === 0) {
            nextErrors.soldAt = text.errors.sellStockInvalid;
        }
        const availableQuantity = sellSelectedBatch.remainingQuantity;
        if (!Number.isFinite(quantity) || quantity <= 0 || quantity > availableQuantity) {
            nextErrors.quantity = text.errors.sellStockInvalid;
        }
        if (!isIsoCurrencyCode(sellDiscountCurrency)) {
            nextErrors.discountCurrency = text.errors.sellStockInvalid;
        }
        if (!Number.isFinite(discountPerUnitInput) || discountPerUnitInput < 0) {
            nextErrors.discountPerUnit = text.errors.sellStockInvalid;
        }

        if (Object.keys(nextErrors).length > 0) {
            setSellStockErrors(nextErrors);
            return;
        }

        const discountPerUnit = Math.max(
            0,
            convertWithUsdRates(
                discountPerUnitInput,
                sellDiscountCurrency,
                sellSelectedBatch.saleCurrency,
                usdRates
            )
        );
        if (discountPerUnit > listedSaleUnitPrice) {
            setSellStockErrors({ discountPerUnit: text.errors.sellStockInvalid });
            return;
        }

        const finalSaleUnitPrice = Math.max(0, listedSaleUnitPrice - discountPerUnit);
        setSellStockErrors({});
        const soldQuantity = Math.round(quantity);
        const nowIso = new Date().toISOString();
        const saleDateIso = new Date(`${sellDate}T00:00:00.000Z`).toISOString();
        const generatedSale: InventorySale = {
            id: createInventoryRecordId("sale"),
            productId: sellProduct.id,
            batchId: sellSelectedBatch.id,
            soldAt: saleDateIso,
            quantity: soldQuantity,
            currency: sellSelectedBatch.saleCurrency,
            listedSaleUnitPrice,
            discountPerUnit,
            saleUnitPrice: finalSaleUnitPrice,
            totalAmount: soldQuantity * finalSaleUnitPrice,
            notes: sellNotes.trim() || undefined,
            createdAt: nowIso,
        };

        const nextBatches = batches.map((batch) => {
            if (batch.id !== sellSelectedBatch.id) return batch;
            return {
                ...batch,
                remainingQuantity: Math.max(0, batch.remainingQuantity - soldQuantity),
                updatedAt: nowIso,
            };
        });

        applyInventory(nextBatches, [generatedSale, ...sales], [sellProduct.id]);
        setSellStockOpen(false);
        setSellProductId(null);
        setSellBatchId("");
        setActionError(null);
    };

    // Reserved inline modal handlers/state are intentionally kept for the route-level action flow.
    void [
        currencyLabelByCode,
        addStockProductDetails,
        sellableProducts,
        maintenanceSelectedBatch,
        currencyFormatterByCode,
        resetAddStockForm,
        resetSellStockForm,
        resetMaintenanceForm,
        openAddStock,
        onSellProductChange,
        onSellBatchChange,
        onMaintenanceProductChange,
        onMaintenanceBatchChange,
        onMaintenanceConfirm,
        onAddProductChange,
        onAddStockConfirm,
        onSellStockConfirm,
    ];

    const toggleAllVisible = (checked: boolean) => {
        setSelectedIds((current) => {
            const next = new Set(current);
            if (checked) {
                visibleProductIds.forEach((id) => next.add(id));
            } else {
                visibleProductIds.forEach((id) => next.delete(id));
            }
            return next;
        });
    };

    const toggleRow = (id: string, checked: boolean) => {
        setSelectedIds((current) => {
            const next = new Set(current);
            if (checked) next.add(id);
            else next.delete(id);
            return next;
        });
    };

    const openProductEditor = (productId: string) => {
        void navigateTo(`/products/${encodeURIComponent(productId)}`);
    };

    const onInventoryRowClick = (event: ReactMouseEvent<HTMLTableRowElement>, productId: string) => {
        const target = event.target as HTMLElement;
        if (target.closest("input,button,a,select,textarea,label")) return;
        toggleRow(productId, !selectedIds.has(productId));
    };

    const onInventoryRowKeyDown = (event: ReactKeyboardEvent<HTMLTableRowElement>, productId: string) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        toggleRow(productId, !selectedIds.has(productId));
    };

    const resetMenus = () => {
        setSortMenuOpen(false);
        setConditionFilterMenuOpen(false);
        setColumnEditorOpen(false);
        draggedColumnIdRef.current = null;
        setDraggedColumnId(null);
        setColumnDropTarget(null);
        setColumnDragPreview(null);
    };

    const openSearchAndFilter = () => {
        setSearchMode(true);
        setViewComposerOpen(false);
        setViewDraftName("");
        resetMenus();
    };

    const toggleSortMenu = () => {
        setSortMenuOpen((current) => !current);
        setConditionFilterMenuOpen(false);
        setColumnEditorOpen(false);
        draggedColumnIdRef.current = null;
        setDraggedColumnId(null);
        setColumnDropTarget(null);
        setColumnDragPreview(null);
    };

    const toggleColumnEditor = () => {
        setColumnEditorOpen((current) => !current);
        setSortMenuOpen(false);
        setConditionFilterMenuOpen(false);
        draggedColumnIdRef.current = null;
        setDraggedColumnId(null);
        setColumnDropTarget(null);
        setColumnDragPreview(null);
    };

    const isDefaultColumnLayout = useMemo(() => (
        normalizedVisibleColumnIds.length === INVENTORY_DEFAULT_VISIBLE_COLUMNS.length
        && normalizedVisibleColumnIds.every((columnId, index) => columnId === INVENTORY_DEFAULT_VISIBLE_COLUMNS[index])
    ), [normalizedVisibleColumnIds]);

    const resetColumnsToDefaultLayout = () => {
        draggedColumnIdRef.current = null;
        setDraggedColumnId(null);
        setColumnDropTarget(null);
        setColumnDragPreview(null);
        setVisibleColumnIds(INVENTORY_DEFAULT_VISIBLE_COLUMNS);
    };

    const resetToActiveView = () => {
        setWorkingFilters(cloneFilters(activeView.filters));
        setSearchMode(false);
        setSelectedIds(new Set());
        setViewComposerOpen(false);
        setViewDraftName("");
        resetMenus();
    };

    const handleViewSelect = (viewId: string) => {
        const view = views.find((entry) => entry.id === viewId);
        if (!view) return;

        setActiveViewId(viewId);
        setWorkingFilters(cloneFilters(view.filters));
        setSearchMode(false);
        setSelectedIds(new Set());
        setViewComposerOpen(false);
        setViewDraftName("");
        resetMenus();
    };

    const openViewComposer = () => {
        if (viewComposerOpen) {
            setViewComposerOpen(false);
            return;
        }
        setViewDraftName("");
        setViewComposerOpen(true);
    };

    const saveCurrentView = () => {
        const name = viewDraftName.trim();
        if (!name) return;

        const id = createCustomViewId();
        const nextView: InventoryView = {
            id,
            label: name,
            builtIn: false,
            filters: cloneFilters(workingFilters),
        };

        setViews((current) => [...current, nextView]);
        setActiveViewId(id);
        setSearchMode(false);
        setViewComposerOpen(false);
        setViewDraftName("");
    };

    const updateFilter = <K extends keyof InventoryFilters>(key: K, value: InventoryFilters[K]) => {
        setWorkingFilters((current) => ({
            ...current,
            [key]: value,
        }));
        setSelectedIds(new Set());
    };

    const toggleColumnVisibility = (columnId: InventoryTableColumnId, checked: boolean) => {
        setVisibleColumnIds((current) => toggleVisibleColumnIds(current, allColumns, columnId, checked));
    };

    const reorderVisibleColumnByDrop = (
        draggedId: InventoryTableColumnId,
        targetId: InventoryTableColumnId,
        position: "before" | "after"
    ) => {
        setVisibleColumnIds((current) => (
            reorderVisibleColumnIds(current, allColumns, draggedId, targetId, position)
        ));
    };
    const reorderVisibleColumnByDropRef = useRef(reorderVisibleColumnByDrop);
    useEffect(() => {
        reorderVisibleColumnByDropRef.current = reorderVisibleColumnByDrop;
    });

    const clearColumnDragState = () => {
        if (typeof document !== "undefined") {
            document.body.classList.remove(COLUMN_DRAGGING_BODY_CLASS);
        }
        draggedColumnIdRef.current = null;
        setDraggedColumnId(null);
        setColumnDropTarget(null);
        setColumnDragPreview(null);
    };

    const onColumnReorderPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, columnId: InventoryTableColumnId) => {
        if (!visibleColumnIdSet.has(columnId)) return;
        if (event.button !== 0) return;
        event.preventDefault();
        if (typeof document !== "undefined") {
            document.body.classList.add(COLUMN_DRAGGING_BODY_CLASS);
        }
        draggedColumnIdRef.current = columnId;
        setDraggedColumnId(columnId);
        const columnLabel = allColumns.find((column) => column.id === columnId)?.label ?? "";
        setColumnDragPreview({ label: columnLabel, x: event.clientX, y: event.clientY });
        const sectionColumns = (getColumnSection(columnId) === "variant" ? variantColumns : standardColumns)
            .map((column) => column.id)
            .filter((id) => visibleColumnIdSet.has(id));
        const currentIndex = sectionColumns.indexOf(columnId);
        if (currentIndex < 0 || sectionColumns.length < 2) {
            setColumnDropTarget(null);
            return;
        }
        if (currentIndex < sectionColumns.length - 1) {
            setColumnDropTarget({ columnId: sectionColumns[currentIndex + 1], position: "before" });
            return;
        }
        setColumnDropTarget({ columnId: sectionColumns[currentIndex - 1], position: "after" });
    };

    useEffect(() => {
        if (!draggedColumnId) return;

        const onPointerMove = (event: PointerEvent) => {
            const activeDraggedColumnId = draggedColumnIdRef.current;
            if (!activeDraggedColumnId) return;
            setColumnDragPreview((current) => (
                current
                    ? { ...current, x: event.clientX, y: event.clientY }
                    : current
            ));

            const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
            if (!target) return;

            if (columnEditorMenuRef.current && !columnEditorMenuRef.current.contains(target)) {
                setColumnDropTarget(null);
                return;
            }

            const dropTargetElement = target.closest<HTMLElement>("[data-column-drop-id]");
            if (dropTargetElement) {
                const targetId = dropTargetElement.dataset.columnDropId as InventoryTableColumnId | undefined;
                const position = dropTargetElement.dataset.columnDropPosition as "before" | "after" | undefined;
                if (!targetId || !position || targetId === activeDraggedColumnId) {
                    setColumnDropTarget(null);
                    return;
                }
                if (getColumnSection(activeDraggedColumnId) !== getColumnSection(targetId)) {
                    setColumnDropTarget(null);
                    return;
                }
                setColumnDropTarget((current) => (
                    current?.columnId === targetId && current.position === position
                        ? current
                        : { columnId: targetId, position }
                ));
                return;
            }

            const rowTargetElement = target.closest<HTMLElement>("[data-column-row-id]");
            if (!rowTargetElement) return;

            const targetId = rowTargetElement.dataset.columnRowId as InventoryTableColumnId | undefined;
            if (!targetId || targetId === activeDraggedColumnId) {
                setColumnDropTarget(null);
                return;
            }
            if (getColumnSection(activeDraggedColumnId) !== getColumnSection(targetId)) {
                setColumnDropTarget(null);
                return;
            }

            const rect = rowTargetElement.getBoundingClientRect();
            const currentTarget = columnDropTargetRef.current;
            const isSameTarget = currentTarget?.columnId === targetId;
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
            setColumnDropTarget((current) => (
                current?.columnId === targetId && current.position === position
                    ? current
                    : { columnId: targetId, position }
            ));
        };

        const onPointerFinish = () => {
            const activeDraggedColumnId = draggedColumnIdRef.current;
            const target = columnDropTargetRef.current;
            if (activeDraggedColumnId && target && activeDraggedColumnId !== target.columnId) {
                if (getColumnSection(activeDraggedColumnId) === getColumnSection(target.columnId)) {
                    reorderVisibleColumnByDropRef.current(activeDraggedColumnId, target.columnId, target.position);
                }
            }
            clearColumnDragState();
        };

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerFinish);
        window.addEventListener("pointercancel", onPointerFinish);
        return () => {
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerFinish);
            window.removeEventListener("pointercancel", onPointerFinish);
        };
    }, [draggedColumnId]);

    const renderInventoryTableCell = (product: Product, column: InventoryTableColumn): ReactNode => {
        if (column.id === "product") {
            return (
                <div className="portalProductsNameCell__R8m2Q1">
                    <button
                        type="button"
                        className="portalProductsNameButton__N6m2Q5 portalInventoryProductLinkButton__G3m2Q8"
                        onClick={() => openProductEditor(product.id)}
                    >
                        <span className="portalProductsName__V6p3M1">{product.name}</span>
                    </button>
                    <span className="portalProductsSku__N3m9K5">{product.sku}</span>
                </div>
            );
        }

        if (column.id === "inventory") {
            return formatInventory(product.inventory);
        }

        if (column.id === "category") {
            const value = product.category.trim();
            return (
                <span className="portalProductsCellTruncate__N5m2Q8" title={value || "-"}>
                    {value || "-"}
                </span>
            );
        }

        if (column.id === "updated") {
            return dateFormatter.format(new Date(product.updatedAt));
        }

        if (!column.variantId) {
            return "-";
        }

        const variantValue = (product.variants[column.variantId] ?? "").trim();
        return (
            <span className="portalProductsCellTruncate__N5m2Q8" title={variantValue || "-"}>
                {variantValue || "-"}
            </span>
        );
    };

    const sortLabel = text.sort.options[sortBy];
    const conditionFilterLabel = workingFilters.condition === "ALL"
        ? "Status"
        : `Status: ${formatStatus(workingFilters.condition, text.statusLabels)}`;
    const hasAnyProducts = products.length > 0;
    const showInventoryOnboarding = products.length === 0;
    const handleInventoryTableScroll = (event: ReactUIEvent<HTMLDivElement>) => {
        setInventoryTableScrolledX(event.currentTarget.scrollLeft > 0);
    };

    useEffect(() => {
        const tableScroll = inventoryTableScrollRef.current;
        if (!tableScroll) return;
        setInventoryTableScrolledX(tableScroll.scrollLeft > 0);
    }, [visibleColumns.length, visibleProducts.length]);

    if (!catalogLoaded) {
        return null;
    }

    return (
        <section className="portalInventoryPage__P8m2Q1">
            <PortalPageTitle
                page="inventory"
                actions={catalogLoaded && hasAnyProducts ? (
                    <>
                        <div className="portalProductsMenuWrap__P6k2T1" ref={columnEditorMenuRef}>
                            <Button
                                type="button"
                                kind="highlight"
                                size="xsmall"
                                className="portalProductsEditColumnsButton__L8m2Q5"
                                aria-haspopup="menu"
                                aria-expanded={columnEditorOpen}
                                aria-label="Edit columns"
                                aria-pressed={columnEditorOpen}
                                onClick={toggleColumnEditor}
                            >
                                <Pencil aria-hidden="true" />
                            </Button>

                            {columnEditorOpen ? (
                                <div
                                    role="menu"
                                    className={cn(
                                        "portalProductsMenuPanel__A8d2P7 portalProductsColumnsMenuPanel__B2m8Q4",
                                        draggedColumnId && "portalProductsColumnsMenuDragging__T2m8Q6"
                                    )}
                                >
                                    <section className="portalProductsColumnsSection__M5m2Q8">
                                        <p className="portalProductsColumnsSectionTitle__P4m8Q1">Standard</p>
                                        <div className="portalProductsColumnsSectionList__V3m8Q6">
                                            {standardColumns.map((column) => {
                                                const checked = visibleColumnIdSet.has(column.id);
                                                const visibleIndex = visibleColumnIndexById.get(column.id);
                                                const canDrag = checked;
                                                const isDragging = draggedColumnId === column.id;
                                                if (isDragging) return null;
                                                const isDropBefore = columnDropTarget?.columnId === column.id
                                                    && columnDropTarget.position === "before"
                                                    && draggedColumnId !== column.id;
                                                const isDropAfter = columnDropTarget?.columnId === column.id
                                                    && columnDropTarget.position === "after"
                                                    && draggedColumnId !== column.id;
                                                return (
                                                    <div key={column.id} className="portalProductsColumnOptionItem__A4m2Q7">
                                                        {isDropBefore ? (
                                                            <div
                                                                className="portalProductsColumnDropPlaceholder__Q2m8P6"
                                                                aria-hidden="true"
                                                                data-column-drop-id={column.id}
                                                                data-column-drop-position="before"
                                                            />
                                                        ) : null}
                                                        <div
                                                            data-column-row-id={column.id}
                                                            className={cn(
                                                                "portalProductsColumnOptionRow__H4m8Q7",
                                                                isDragging && "portalProductsColumnOptionRowDragging__K2m8Q4"
                                                            )}
                                                        >
                                                            <label className="portalProductsColumnOption__V2m8Q6">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={checked}
                                                                    disabled={column.locked}
                                                                    onChange={(event) => toggleColumnVisibility(column.id, event.target.checked)}
                                                                />
                                                                <span className="portalProductsColumnOptionLabel__K7m2Q1">{column.label}</span>
                                                            </label>

                                                            <span className="portalProductsColumnOrderControls__D3m8Q9">
                                                                <button
                                                                    type="button"
                                                                    className="portalProductsColumnDragHandle__W7m2Q6"
                                                                    aria-label={`Drag ${column.label}`}
                                                                    disabled={!canDrag || typeof visibleIndex !== "number"}
                                                                    onPointerDown={(event) => onColumnReorderPointerDown(event, column.id)}
                                                                >
                                                                    <GripVertical aria-hidden="true" />
                                                                </button>
                                                            </span>
                                                        </div>
                                                        {isDropAfter ? (
                                                            <div
                                                                className="portalProductsColumnDropPlaceholder__Q2m8P6"
                                                                aria-hidden="true"
                                                                data-column-drop-id={column.id}
                                                                data-column-drop-position="after"
                                                            />
                                                        ) : null}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </section>

                                    {variantColumns.length > 0 ? (
                                        <section className="portalProductsColumnsSection__M5m2Q8">
                                            <p className="portalProductsColumnsSectionTitle__P4m8Q1">Variant</p>
                                            <div className="portalProductsColumnsSectionList__V3m8Q6">
                                                {variantColumns.map((column) => {
                                                    const checked = visibleColumnIdSet.has(column.id);
                                                    const visibleIndex = visibleColumnIndexById.get(column.id);
                                                    const canDrag = checked;
                                                    const isDragging = draggedColumnId === column.id;
                                                    if (isDragging) return null;
                                                    const isDropBefore = columnDropTarget?.columnId === column.id
                                                        && columnDropTarget.position === "before"
                                                        && draggedColumnId !== column.id;
                                                    const isDropAfter = columnDropTarget?.columnId === column.id
                                                        && columnDropTarget.position === "after"
                                                        && draggedColumnId !== column.id;
                                                    return (
                                                        <div key={column.id} className="portalProductsColumnOptionItem__A4m2Q7">
                                                            {isDropBefore ? (
                                                                <div
                                                                    className="portalProductsColumnDropPlaceholder__Q2m8P6"
                                                                    aria-hidden="true"
                                                                    data-column-drop-id={column.id}
                                                                    data-column-drop-position="before"
                                                                />
                                                            ) : null}
                                                            <div
                                                                data-column-row-id={column.id}
                                                                className={cn(
                                                                    "portalProductsColumnOptionRow__H4m8Q7",
                                                                    isDragging && "portalProductsColumnOptionRowDragging__K2m8Q4"
                                                                )}
                                                            >
                                                                <label className="portalProductsColumnOption__V2m8Q6">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={checked}
                                                                        disabled={column.locked}
                                                                        onChange={(event) => toggleColumnVisibility(column.id, event.target.checked)}
                                                                    />
                                                                    <span className="portalProductsColumnOptionLabel__K7m2Q1">{column.label}</span>
                                                                </label>

                                                                <span className="portalProductsColumnOrderControls__D3m8Q9">
                                                                    <button
                                                                        type="button"
                                                                        className="portalProductsColumnDragHandle__W7m2Q6"
                                                                        aria-label={`Drag ${column.label}`}
                                                                        disabled={!canDrag || typeof visibleIndex !== "number"}
                                                                        onPointerDown={(event) => onColumnReorderPointerDown(event, column.id)}
                                                                    >
                                                                        <GripVertical aria-hidden="true" />
                                                                    </button>
                                                                </span>
                                                            </div>
                                                            {isDropAfter ? (
                                                                <div
                                                                    className="portalProductsColumnDropPlaceholder__Q2m8P6"
                                                                    aria-hidden="true"
                                                                    data-column-drop-id={column.id}
                                                                    data-column-drop-position="after"
                                                                />
                                                            ) : null}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </section>
                                    ) : null}

                                    <div className="portalProductsColumnsMenuFooter__V7m2Q3">
                                        <button
                                            type="button"
                                            className="portalProductsMenuItem__E3n8R6 portalProductsColumnsResetButton__N6m2Q8"
                                            onClick={resetColumnsToDefaultLayout}
                                            disabled={isDefaultColumnLayout}
                                        >
                                            Reset to default layout
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                        <Button type="button" kind="basic" size="xsmall" onClick={openSellStock}>
                            Sell stock
                        </Button>
                        <Button type="button" kind="basic" size="xsmall" onClick={openMaintenance}>
                            Add maintenance
                        </Button>
                    </>
                ) : null}
            />

            {actionError ? <p className="portalInventoryError__X4m2Q6">{actionError}</p> : null}

            {showInventoryOnboarding ? (
                <section className="portalProductsTableShell__G4m7N1 ui-surface-card">
                    <div className="portalProductsEmptyCard__X5m2Q8 portalProductsEmptyCardCentered__K2m8Q4">
                        <div className="portalProductsOnboardingArt__A5m2Q6" aria-hidden="true">
                            <span className="portalProductsOnboardingArtCard__W3m2Q8 portalProductsOnboardingArtCardPrimary__Y2m8Q5" />
                            <span className="portalProductsOnboardingArtCard__W3m2Q8 portalProductsOnboardingArtCardSecondary__F5m2Q4" />
                            <span className="portalProductsOnboardingArtCard__W3m2Q8 portalProductsOnboardingArtCardTertiary__B2m8Q1" />
                        </div>
                        <h3 className="typography__heading6__H5j9s0 portalProductsEmptyHeading__D2m8Q4">Keep track of your inventory</h3>
                        <p className="typography__small__Q9j2p0 portalProductsEmptyBody__J3m2Q7">When you enable inventory tracking on your products, you can view and adjust counts here.</p>
                        <Button type="button" kind="primary" size="xsmall" onClick={() => void navigateTo("/products")}>
                            Go to products
                        </Button>
                    </div>
                </section>
            ) : (
                <section className="portalProductsTableShell__G4m7N1 ui-surface-card">
                <div className="portalInventoryControlsTableWrap__V4m2Q7">
                    <table className="portalProductsTable__E8n4Q7 portalInventoryControlsTable__B4m2Q5">
                        <thead>
                            <tr>
                                <th colSpan={tableColumnSpan} className="portalProductsControlsHeader__B6m2R1">
                                    {searchMode ? (
                                        <div className="portalProductsSearchMode__K2m8R4">
                                            <div className="portalProductsSearchTopRow__V8n2Q1">
                                                <label className="portalProductsSearchGhostField__P4m9D2">
                                                    <Search aria-hidden="true" className="portalProductsSearchGhostIcon__S7m2N4" />
                                                    <input
                                                        ref={searchQueryInputRef}
                                                        className="portalProductsSearchGhostInput__A5n2V9"
                                                        value={workingFilters.query}
                                                        onChange={(event) => updateFilter("query", event.target.value)}
                                                        placeholder={text.filters.searchProducts}
                                                    />
                                                </label>

                                                <div className="portalProductsTableActions__P5d8K3">
                                                    <Button type="button" kind="toggle" size="xsmall" className="portalProductsCancelButton__T2m8V1" onClick={resetToActiveView}>
                                                        {text.actions.cancel}
                                                    </Button>
                                                    <Button type="button" kind="basic" size="xsmall" onClick={openViewComposer} disabled={!hasActiveFilters}>
                                                        Save as
                                                    </Button>

                                                    <div className="portalProductsMenuWrap__P6k2T1" ref={sortMenuRef}>
                                                        <Button
                                                            type="button"
                                                            kind="basic"
                                                            size="xsmall"
                                                            className="portalProductsIconButton__D6m8P2"
                                                            aria-haspopup="menu"
                                                            aria-expanded={sortMenuOpen}
                                                            aria-label={`${text.sort.label}: ${sortLabel}`}
                                                            onClick={toggleSortMenu}
                                                        >
                                                            <ArrowUpDown aria-hidden="true" />
                                                        </Button>

                                                        {sortMenuOpen ? (
                                                            <div role="menu" className="portalProductsMenuPanel__A8d2P7">
                                                                {(Object.keys(text.sort.options) as SortKey[]).map((sortOption) => (
                                                                    <button
                                                                        key={sortOption}
                                                                        type="button"
                                                                        role="menuitemradio"
                                                                        aria-checked={sortBy === sortOption}
                                                                        className={cn(
                                                                            "portalProductsMenuItem__E3n8R6",
                                                                            sortBy === sortOption && "portalProductsMenuItemActive__M6p3D9"
                                                                        )}
                                                                        onClick={() => {
                                                                            setSortBy(sortOption);
                                                                            setSortMenuOpen(false);
                                                                        }}
                                                                    >
                                                                        {text.sort.options[sortOption]}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="portalProductsSearchFiltersRow__G8m1P7">
                                                <div className="portalProductsMenuWrap__P6k2T1" ref={conditionFilterMenuRef}>
                                                    <button
                                                        type="button"
                                                        className={cn(
                                                            "portalProductsDashedFilterButton__R4m8Q2",
                                                            (workingFilters.condition !== "ACTIVE" || conditionFilterMenuOpen) && "portalProductsDashedFilterButtonActive__W2n9K5"
                                                        )}
                                                        aria-haspopup="menu"
                                                        aria-expanded={conditionFilterMenuOpen}
                                                        onClick={() => {
                                                            setConditionFilterMenuOpen((current) => !current);
                                                            setSortMenuOpen(false);
                                                        }}
                                                    >
                                                        {conditionFilterLabel}
                                                    </button>

                                                    {conditionFilterMenuOpen ? (
                                                        <div role="menu" className="portalProductsMenuPanel__A8d2P7 portalProductsMenuPanelAlignLeft__V1m8Q2">
                                                            {conditionOptions.map((condition) => (
                                                                <button
                                                                    key={condition}
                                                                    type="button"
                                                                    role="menuitemradio"
                                                                    aria-checked={workingFilters.condition === condition}
                                                                    className={cn(
                                                                        "portalProductsMenuItem__E3n8R6",
                                                                        workingFilters.condition === condition && "portalProductsMenuItemActive__M6p3D9"
                                                                    )}
                                                                    onClick={() => {
                                                                        updateFilter("condition", condition);
                                                                        setConditionFilterMenuOpen(false);
                                                                    }}
                                                                >
                                                                    {condition === "ALL" ? "All statuses" : formatStatus(condition, text.statusLabels)}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                </div>

                                                <button type="button" className="portalProductsDashedFilterButton__R4m8Q2">
                                                    Add filter
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="portalProductsTableTopRow__Y3m9Q5">
                                            <div className="portalProductsViewsRow__R6m1V2" role="tablist" aria-label="Inventory views">
                                                {views.map((view) => {
                                                    const isCustomView = !view.builtIn;
                                                    const isActive = view.id === activeViewId;
                                                    return (
                                                        <Button
                                                            key={view.id}
                                                            type="button"
                                                            kind="toggle"
                                                            size="xsmall"
                                                            role="tab"
                                                            aria-selected={isActive}
                                                            className="portalProductsViewTab__D8m4Q5"
                                                            onClick={() => handleViewSelect(view.id)}
                                                        >
                                                            <span className="portalProductsViewLabel__J2m8Q6">{getViewLabel(view)}</span>
                                                            {isCustomView && isActive ? <ChevronDown aria-hidden="true" className="portalProductsViewChevron__M3m8Q2" /> : null}
                                                        </Button>
                                                    );
                                                })}

                                                <Button
                                                    type="button"
                                                    kind="ghost"
                                                    size="xsmall"
                                                    className="portalProductsNewViewButton__S8n2K6"
                                                    aria-label="Create view"
                                                    onClick={openViewComposer}
                                                >
                                                    <Plus aria-hidden="true" />
                                                </Button>
                                            </div>

		                                            <div className="portalProductsTableActions__P5d8K3">
		                                                <Button
		                                                    type="button"
		                                                    kind="basic"
                                                    size="xsmall"
                                                    className="portalProductsSearchFilterButton__M9r2D1"
                                                    aria-label="Search and filter"
                                                    onClick={openSearchAndFilter}
                                                >
                                                    <Search aria-hidden="true" />
                                                    <Filter aria-hidden="true" />
                                                </Button>

                                                <div className="portalProductsMenuWrap__P6k2T1" ref={sortMenuRef}>
                                                    <Button
                                                        type="button"
                                                        kind="basic"
                                                        size="xsmall"
                                                        className="portalProductsIconButton__D6m8P2"
                                                        aria-haspopup="menu"
                                                        aria-expanded={sortMenuOpen}
                                                        aria-label={`${text.sort.label}: ${sortLabel}`}
                                                        onClick={toggleSortMenu}
                                                    >
                                                        <ArrowUpDown aria-hidden="true" />
                                                    </Button>

                                                    {sortMenuOpen ? (
                                                        <div role="menu" className="portalProductsMenuPanel__A8d2P7">
                                                            {(Object.keys(text.sort.options) as SortKey[]).map((sortOption) => (
                                                                <button
                                                                    key={sortOption}
                                                                    type="button"
                                                                    role="menuitemradio"
                                                                    aria-checked={sortBy === sortOption}
                                                                    className={cn(
                                                                        "portalProductsMenuItem__E3n8R6",
                                                                        sortBy === sortOption && "portalProductsMenuItemActive__M6p3D9"
                                                                    )}
                                                                    onClick={() => {
                                                                        setSortBy(sortOption);
                                                                        setSortMenuOpen(false);
                                                                    }}
                                                                >
                                                                    {text.sort.options[sortOption]}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </th>
                            </tr>
                        </thead>
                    </table>
                </div>

                <div
                    ref={inventoryTableScrollRef}
                    onScroll={handleInventoryTableScroll}
                    className={cn(
                        "portalProductsTableScroll__H7q2M4 portalInventoryDataTableScroll__C2m8Q4",
                        inventoryTableScrolledX && "portalInventoryDataTableScrolled__Q2m8P5"
                    )}
                >
                    <table className="portalProductsTable__E8n4Q7 portalInventoryTable__K9m2Q4">
                        <thead>
                            {hasSelection ? (
                                <>
                                    <tr>
                                        <th className="portalProductsCellCheckbox__C5m1R9">
                                            <input
                                                ref={selectAllRef}
                                                type="checkbox"
                                                checked={allVisibleSelected}
                                                onChange={(event) => toggleAllVisible(event.target.checked)}
                                                aria-label={text.table.selectAll}
                                            />
                                        </th>
                                        <th colSpan={visibleColumns.length} className="portalProductsBulkHeader__L1p7V4">
                                            <div className="portalProductsBulkActions__S6m2N8">
                                                <div className="portalProductsBulkSummary__K4m9P2">
                                                    <span>{selectedIds.size} selected</span>
                                                </div>
                                                <div className="portalProductsBulkButtons__W5m2R8">
                                                    <Button type="button" kind="basic" size="xsmall" onClick={createPurchaseOrderForSelected}>
                                                        Create purchase order
                                                    </Button>
                                                    <Button type="button" kind="basic" size="xsmall" onClick={openSellStock}>
                                                        Sell stock
                                                    </Button>
                                                    <Button type="button" kind="basic" size="xsmall" onClick={openMaintenance}>
                                                        Add maintenance
                                                    </Button>
                                                </div>
                                            </div>
                                        </th>
                                    </tr>
                                    <tr className="portalProductsColumnSizerRow__P8m2Q4" aria-hidden="true">
                                        <th className="portalProductsCellCheckbox__C5m1R9">
                                            <span />
                                        </th>
                                        {visibleColumns.map((column) => (
                                            <th key={column.id} data-column-id={column.id}>{column.label}</th>
                                        ))}
                                    </tr>
                                </>
                            ) : (
                                <tr className="portalInventoryColumnsRow__M4m2Q6">
                                    <th className="portalProductsCellCheckbox__C5m1R9">
                                        <input
                                            ref={selectAllRef}
                                            type="checkbox"
                                            checked={allVisibleSelected}
                                            onChange={(event) => toggleAllVisible(event.target.checked)}
                                            aria-label={text.table.selectAll}
                                        />
                                    </th>
                                    {visibleColumns.map((column) => (
                                        <th key={column.id} data-column-id={column.id}>{column.label}</th>
                                    ))}
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {visibleProducts.length === 0 ? (
                                <tr className="portalProductsEmptyRow__S2m8Q4">
                                    <td colSpan={tableColumnSpan} className="portalProductsEmpty__D3m7K2">
                                        {text.table.noProductsFound}
                                    </td>
                                </tr>
                            ) : (
                                visibleProducts.map((product) => {
                                    const checked = selectedIds.has(product.id);
                                    return (
                                        <tr
                                            key={product.id}
                                            className={cn("portalProductsRowInteractive__T4m8Q1", checked && "portalProductsRowSelected__Q9m2N4")}
                                            onClick={(event) => onInventoryRowClick(event, product.id)}
                                            onKeyDown={(event) => onInventoryRowKeyDown(event, product.id)}
                                            tabIndex={0}
                                            role="button"
                                        >
                                            <td className="portalProductsCellCheckbox__C5m1R9">
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={(event) => toggleRow(product.id, event.target.checked)}
                                                    aria-label={fillTemplate(text.table.selectProduct, { name: product.name })}
                                                />
                                            </td>
                                            {visibleColumns.map((column) => (
                                                <td key={column.id} data-column-id={column.id}>{renderInventoryTableCell(product, column)}</td>
                                            ))}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
            )}

            <PortalModal
                open={viewComposerOpen}
                title="Create view"
                closeLabel="Close create view pop-up"
                onClose={() => setViewComposerOpen(false)}
                footer={(
                    <>
                        <Button type="button" kind="secondary" size="xsmall" onClick={() => setViewComposerOpen(false)}>
                            {text.actions.cancel}
                        </Button>
                        <Button type="button" kind="primary" size="xsmall" onClick={saveCurrentView} disabled={!viewDraftName.trim()}>
                            Create view
                        </Button>
                    </>
                )}
            >
                <label className="form__group__K7p2s0">
                    <span className="form__label__B9f4k0">Name</span>
                    <input
                        ref={viewDraftInputRef}
                        className="form__input__Z3n7q0"
                        value={viewDraftName}
                        onChange={(event) => setViewDraftName(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key !== "Enter") return;
                            event.preventDefault();
                            saveCurrentView();
                        }}
                    />
                </label>
            </PortalModal>

            {columnDragPreview ? (
                <div
                    className="portalProductsColumnDragPreview__H7m2Q4"
                    style={{ left: `${columnDragPreview.x}px`, top: `${columnDragPreview.y}px` }}
                    aria-hidden="true"
                >
                    <span className="portalProductsColumnDragPreviewLabel__D8m2Q6">{columnDragPreview.label}</span>
                </div>
            ) : null}
        </section>
    );
}
