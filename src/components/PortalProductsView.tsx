"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type UIEvent as ReactUIEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, ChevronDown, Copy, Ellipsis, Filter, GripVertical, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/Button";
import { PortalModal } from "@/components/PortalModal";
import { PortalTableLoading } from "@/components/PortalTableLoading";
import {
    BUILT_IN_VIEWS,
    LANGUAGE_TO_LOCALE,
    PRODUCT_CUSTOM_VIEWS_STORAGE_KEY,
    PRODUCT_SORT_STORAGE_KEY,
    PRODUCT_VISIBLE_COLUMNS_STORAGE_KEY,
    SORT_KEYS,
    STATUS_SORT_ORDER,
    cloneFilters,
    createCustomViewId,
    fillTemplate,
    formatInventory,
    getSortOptions,
    getViewLabel,
    loadProductCustomViewsFromStorage,
    loadStoredColumnIds,
    type Product,
    type ProductFilters,
    type ProductView,
    type SortKey,
} from "@/components/products/viewState";
import {
    COLUMN_DRAGGING_BODY_CLASS,
    PRODUCT_DEFAULT_VISIBLE_COLUMNS,
    type ColumnSection,
    type ProductColumnDragPreview,
    type ProductColumnDropTarget,
    type ProductTableColumn,
    type ProductTableColumnId,
} from "@/components/products/viewColumnsConfig";
import { PRODUCT_TRANSLATIONS } from "@/components/products/translations";
import { Tooltip } from "@/components/Tooltip";
import { renderPortalPageIcon } from "@/components/portalPageIcons";
import { usePortalI18n } from "@/i18n/PortalI18nContext";
import {
    getDefaultProducts,
    getDefaultProductCategoryDefinitions,
    getDefaultVariantDefinitions,
    getProductCategoryTitles,
    type ProductCategoryDefinition,
    type VariantDefinition,
} from "@/lib/productCatalog";
import {
    syncProductsWithInventory,
    type InventoryBatch,
    type InventorySale,
} from "@/lib/productInventory";
import {
    deleteCatalogEntriesFromApi,
    fetchCatalogStateFromApi,
    getCachedCatalogStateSnapshot,
    saveCatalogStateToApi,
} from "@/lib/catalogStateClient";
import { cn } from "@/lib/cn";
import { loadStoredSortKey, saveStoredSortKey } from "@/lib/tableSortStorage";

const PRODUCT_SEED: Product[] = getDefaultProducts();

export function PortalProductsView() {
    const router = useRouter();
    const { messages, language } = usePortalI18n();
    const text = PRODUCT_TRANSLATIONS[language] ?? PRODUCT_TRANSLATIONS.en;
    const sortOptions = useMemo(() => getSortOptions(text), [text]);
    const cachedCatalogState = getCachedCatalogStateSnapshot();
    const cachedProductCount = cachedCatalogState?.products.length ?? PRODUCT_SEED.length;

    const [products, setProducts] = useState<Product[]>(() => (
        cachedCatalogState
            ? syncProductsWithInventory(cachedCatalogState.products, cachedCatalogState.inventoryBatches)
            : PRODUCT_SEED
    ));
    const [views, setViews] = useState<ProductView[]>(BUILT_IN_VIEWS);
    const [activeViewId, setActiveViewId] = useState<string>(BUILT_IN_VIEWS[0].id);
    const [workingFilters, setWorkingFilters] = useState<ProductFilters>(cloneFilters(BUILT_IN_VIEWS[0].filters));
    const [sortBy, setSortBy] = useState<SortKey>(() => (
        loadStoredSortKey(PRODUCT_SORT_STORAGE_KEY, SORT_KEYS, "updated-desc")
    ));
    const [variantDefinitions, setVariantDefinitions] = useState<VariantDefinition[]>(() => cachedCatalogState?.variantDefinitions ?? getDefaultVariantDefinitions());
    const [categoryDefinitions, setCategoryDefinitions] = useState<ProductCategoryDefinition[]>(() => (
        cachedCatalogState?.categoryDefinitions ?? getDefaultProductCategoryDefinitions()
    ));
    const [, setInventoryBatches] = useState<InventoryBatch[]>(() => cachedCatalogState?.inventoryBatches ?? []);
    const [, setInventorySales] = useState<InventorySale[]>(() => cachedCatalogState?.inventorySales ?? []);
    const [hasHydratedProducts, setHasHydratedProducts] = useState(false);
    const [hasHydratedViews, setHasHydratedViews] = useState(false);
    const [catalogLoaded, setCatalogLoaded] = useState(false);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [searchMode, setSearchMode] = useState(false);
    const [viewComposerOpen, setViewComposerOpen] = useState(false);
    const [viewDraftName, setViewDraftName] = useState("");
    const [viewMenuOpenId, setViewMenuOpenId] = useState<string | null>(null);
    const [renameViewId, setRenameViewId] = useState<string | null>(null);
    const [renameViewDraftName, setRenameViewDraftName] = useState("");
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteConfirmIds, setDeleteConfirmIds] = useState<string[]>([]);
    const [deleteConfirmError, setDeleteConfirmError] = useState<string | null>(null);
    const [deleteConfirmSubmitting, setDeleteConfirmSubmitting] = useState(false);

    const [sortMenuOpen, setSortMenuOpen] = useState(false);
    const [importMenuOpen, setImportMenuOpen] = useState(false);
    const [exportMenuOpen, setExportMenuOpen] = useState(false);
    const [columnEditorOpen, setColumnEditorOpen] = useState(false);
    const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
    const [statusFilterMenuOpen, setStatusFilterMenuOpen] = useState(false);
    const [categoryFilterMenuOpen, setCategoryFilterMenuOpen] = useState(false);
    const [tagFilterMenuOpen, setTagFilterMenuOpen] = useState(false);
    const [addVariantFilterMenuOpen, setAddVariantFilterMenuOpen] = useState(false);
    const [variantFilterMenuOpenId, setVariantFilterMenuOpenId] = useState<string | null>(null);
    const [visibleColumnIds, setVisibleColumnIds] = useState<ProductTableColumnId[]>(PRODUCT_DEFAULT_VISIBLE_COLUMNS);
    const [hasHydratedColumns, setHasHydratedColumns] = useState(false);
    const [draggedColumnId, setDraggedColumnId] = useState<ProductTableColumnId | null>(null);
    const [columnDropTarget, setColumnDropTarget] = useState<ProductColumnDropTarget | null>(null);
    const [columnDragPreview, setColumnDragPreview] = useState<ProductColumnDragPreview | null>(null);
    const [productsTableScrolledX, setProductsTableScrolledX] = useState(false);

    const selectAllRef = useRef<HTMLInputElement | null>(null);
    const sortMenuRef = useRef<HTMLDivElement | null>(null);
    const importMenuRef = useRef<HTMLDivElement | null>(null);
    const exportMenuRef = useRef<HTMLDivElement | null>(null);
    const columnEditorMenuRef = useRef<HTMLDivElement | null>(null);
    const bulkMenuRef = useRef<HTMLDivElement | null>(null);
    const statusFilterMenuRef = useRef<HTMLDivElement | null>(null);
    const categoryFilterMenuRef = useRef<HTMLDivElement | null>(null);
    const tagFilterMenuRef = useRef<HTMLDivElement | null>(null);
    const addVariantFilterMenuRef = useRef<HTMLDivElement | null>(null);
    const variantFilterMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const viewMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const draggedColumnIdRef = useRef<ProductTableColumnId | null>(null);
    const columnDropTargetRef = useRef<ProductColumnDropTarget | null>(null);
    const viewDraftInputRef = useRef<HTMLInputElement | null>(null);
    const renameViewInputRef = useRef<HTMLInputElement | null>(null);
    const searchQueryInputRef = useRef<HTMLInputElement | null>(null);
    const productsTableScrollRef = useRef<HTMLDivElement | null>(null);

    const activeView = useMemo(() => views.find((view) => view.id === activeViewId) ?? views[0], [views, activeViewId]);

    const categoryOptions = useMemo(() => {
        const values = products.flatMap((product) => getProductCategoryTitles(product, categoryDefinitions));
        return ["ALL", ...Array.from(new Set(values)).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }))];
    }, [categoryDefinitions, products]);

    const tagOptions = useMemo(
        () => ["ALL", ...Array.from(new Set(products.flatMap((product) => product.tags).sort((a, b) => a.localeCompare(b))))],
        [products]
    );

    const variantDefinitionById = useMemo(() => {
        const next = new Map<string, VariantDefinition>();
        variantDefinitions.forEach((definition) => next.set(definition.id, definition));
        return next;
    }, [variantDefinitions]);

    const variantFilters = useMemo(
        () => Object.entries(workingFilters.variantValues),
        [workingFilters.variantValues]
    );
    const hasAnyProducts = products.length > 0;
    const tableLoadingMode = cachedProductCount > 0 ? "populated" : "empty";

    const availableVariantFilters = useMemo(
        () => variantDefinitions.filter((definition) => !workingFilters.variantValues[definition.id]),
        [variantDefinitions, workingFilters.variantValues]
    );

    const allColumns = useMemo<ProductTableColumn[]>(() => [
        {
            id: "product",
            label: text.table.product,
            locked: true,
        },
        {
            id: "status",
            label: text.table.status,
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
            id: `variant:${definition.id}` as ProductTableColumnId,
            label: definition.label,
            variantId: definition.id,
        })),
    ], [text.table, variantDefinitions]);
    const normalizedVisibleColumnIds = useMemo(() => {
        const knownIds = new Set(allColumns.map((column) => column.id));
        const next: ProductTableColumnId[] = [];
        const seen = new Set<ProductTableColumnId>();

        visibleColumnIds.forEach((columnId) => {
            if (!knownIds.has(columnId) || seen.has(columnId)) return;
            next.push(columnId);
            seen.add(columnId);
        });

        allColumns.forEach((column) => {
            if (!column.locked || seen.has(column.id)) return;
            if (column.variantId) {
                next.push(column.id);
            } else {
                const firstVariantIndex = next.findIndex((entry) => entry.startsWith("variant:"));
                if (firstVariantIndex < 0) next.unshift(column.id);
                else next.splice(firstVariantIndex, 0, column.id);
            }
            seen.add(column.id);
        });

        return next.length > 0 ? next : PRODUCT_DEFAULT_VISIBLE_COLUMNS;
    }, [allColumns, visibleColumnIds]);

    const editorColumnsBySection = useMemo(() => {
        const visibleOrder = new Map<ProductTableColumnId, number>();
        normalizedVisibleColumnIds.forEach((columnId, index) => {
            visibleOrder.set(columnId, index);
        });
        const defaultOrder = new Map<ProductTableColumnId, number>();
        allColumns.forEach((column, index) => {
            defaultOrder.set(column.id, index);
        });

        const sortColumns = (left: ProductTableColumn, right: ProductTableColumn) => {
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
            .filter((column): column is ProductTableColumn => Boolean(column));
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

    const visibleProducts = useMemo(() => {
        const normalizedQuery = workingFilters.query.trim().toLowerCase();

        const filtered = products.filter((product) => {
            if (workingFilters.status !== "ANY" && product.status !== workingFilters.status) return false;
            const productCategoryTitles = getProductCategoryTitles(product, categoryDefinitions);
            if (workingFilters.category !== "ALL" && !productCategoryTitles.includes(workingFilters.category)) return false;
            if (workingFilters.tag !== "ALL" && !product.tags.includes(workingFilters.tag)) return false;
            for (const [variantId, variantValue] of Object.entries(workingFilters.variantValues)) {
                if (variantValue === "ALL") continue;
                const definition = variantDefinitionById.get(variantId);
                if (!definition) continue;

                const productValue = (product.variants[variantId] ?? "").trim();
                if (definition.inputType === "select") {
                    if (productValue !== variantValue) return false;
                    continue;
                }

                if (!productValue.toLowerCase().includes(variantValue.trim().toLowerCase())) return false;
            }

            if (!normalizedQuery) return true;

            const searchText = [
                product.name,
                product.sku,
                ...getProductCategoryTitles(product, categoryDefinitions),
                text.statusLabels[product.status],
                ...product.tags,
                ...Object.values(product.variants),
            ]
                .join(" ")
                .toLowerCase();

            return searchText.includes(normalizedQuery);
        });

        return filtered.sort((a, b) => {
            switch (sortBy) {
                case "updated-desc":
                    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
                case "updated-asc":
                    return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
                case "name-asc":
                    return a.name.localeCompare(b.name);
                case "name-desc":
                    return b.name.localeCompare(a.name);
                case "inventory-desc":
                    return b.inventory - a.inventory;
                case "inventory-asc":
                    return a.inventory - b.inventory;
                case "status":
                    return STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
                default:
                    return 0;
            }
        });
    }, [categoryDefinitions, products, sortBy, text.statusLabels, workingFilters, variantDefinitionById]);

    const visibleProductIds = useMemo(() => visibleProducts.map((product) => product.id), [visibleProducts]);

    const selectedVisibleCount = useMemo(
        () => visibleProductIds.filter((id) => selectedIds.has(id)).length,
        [visibleProductIds, selectedIds]
    );

    const allVisibleSelected = visibleProductIds.length > 0 && selectedVisibleCount === visibleProductIds.length;
    const hasSelection = selectedIds.size > 0;
    const hasActiveFilters = useMemo(() => {
        return (
            workingFilters.query.trim().length > 0
            || workingFilters.status !== "ANY"
            || workingFilters.category !== "ALL"
            || workingFilters.tag !== "ALL"
            || Object.values(workingFilters.variantValues).some((value) => value !== "ALL")
        );
    }, [workingFilters]);

    const locale = LANGUAGE_TO_LOCALE[language] ?? "en-US";

    const dateFormatter = useMemo(
        () =>
            new Intl.DateTimeFormat(locale, {
                year: "numeric",
                month: "short",
                day: "numeric",
                timeZone: "UTC",
            }),
        [locale]
    );

    useEffect(() => {
        function handlePointerDown(event: MouseEvent) {
            const target = event.target as Node;

            if (sortMenuOpen && sortMenuRef.current && !sortMenuRef.current.contains(target)) {
                setSortMenuOpen(false);
            }

            if (importMenuOpen && importMenuRef.current && !importMenuRef.current.contains(target)) {
                setImportMenuOpen(false);
            }

            if (exportMenuOpen && exportMenuRef.current && !exportMenuRef.current.contains(target)) {
                setExportMenuOpen(false);
            }

            if (columnEditorOpen && columnEditorMenuRef.current && !columnEditorMenuRef.current.contains(target)) {
                setColumnEditorOpen(false);
            }

            if (bulkMenuOpen && bulkMenuRef.current && !bulkMenuRef.current.contains(target)) {
                setBulkMenuOpen(false);
            }

            if (statusFilterMenuOpen && statusFilterMenuRef.current && !statusFilterMenuRef.current.contains(target)) {
                setStatusFilterMenuOpen(false);
            }

            if (categoryFilterMenuOpen && categoryFilterMenuRef.current && !categoryFilterMenuRef.current.contains(target)) {
                setCategoryFilterMenuOpen(false);
            }

            if (tagFilterMenuOpen && tagFilterMenuRef.current && !tagFilterMenuRef.current.contains(target)) {
                setTagFilterMenuOpen(false);
            }

            if (addVariantFilterMenuOpen && addVariantFilterMenuRef.current && !addVariantFilterMenuRef.current.contains(target)) {
                setAddVariantFilterMenuOpen(false);
            }

            if (variantFilterMenuOpenId) {
                const openRef = variantFilterMenuRefs.current[variantFilterMenuOpenId];
                if (openRef && !openRef.contains(target)) {
                    setVariantFilterMenuOpenId(null);
                }
            }

            if (viewMenuOpenId) {
                const viewMenuRef = viewMenuRefs.current[viewMenuOpenId];
                if (viewMenuRef && !viewMenuRef.contains(target)) {
                    setViewMenuOpenId(null);
                }
            }
        }

        document.addEventListener("mousedown", handlePointerDown);
        return () => document.removeEventListener("mousedown", handlePointerDown);
    }, [
        sortMenuOpen,
        importMenuOpen,
        exportMenuOpen,
        columnEditorOpen,
        bulkMenuOpen,
        statusFilterMenuOpen,
        categoryFilterMenuOpen,
        tagFilterMenuOpen,
        addVariantFilterMenuOpen,
        variantFilterMenuOpenId,
        viewMenuOpenId,
    ]);

    useEffect(() => {
        if (!selectAllRef.current) return;
        selectAllRef.current.indeterminate = selectedVisibleCount > 0 && !allVisibleSelected;
    }, [selectedVisibleCount, allVisibleSelected]);

    useEffect(() => {
        if (!viewComposerOpen) return;
        viewDraftInputRef.current?.focus();
    }, [viewComposerOpen]);

    useEffect(() => {
        if (!renameViewId) return;
        renameViewInputRef.current?.focus();
    }, [renameViewId]);

    useEffect(() => {
        let cancelled = false;
        let gateTimeoutId: number | null = null;

        const hydrate = async () => {
            const customViews = loadProductCustomViewsFromStorage();
            gateTimeoutId = window.setTimeout(() => {
                if (cancelled) return;
                setHasHydratedProducts(true);
                setHasHydratedViews(true);
                setCatalogLoaded(true);
            }, 8000);
            try {
                const state = await fetchCatalogStateFromApi();
                if (cancelled) return;

                setVariantDefinitions(state.variantDefinitions);
                setCategoryDefinitions(state.categoryDefinitions);
                setInventoryBatches(state.inventoryBatches);
                setInventorySales(state.inventorySales);
                setProducts(syncProductsWithInventory(state.products, state.inventoryBatches));
            } catch {
                if (cancelled) return;
                setVariantDefinitions(getDefaultVariantDefinitions());
                setCategoryDefinitions(getDefaultProductCategoryDefinitions());
                setInventoryBatches([]);
                setInventorySales([]);
                setProducts(syncProductsWithInventory(PRODUCT_SEED, []));
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
            setHasHydratedProducts(true);
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
        if (!hasHydratedProducts) return;
        void saveCatalogStateToApi({ products }).catch(() => undefined);
    }, [products, hasHydratedProducts]);

    useEffect(() => {
        if (!hasHydratedViews || typeof window === "undefined") return;
        const customViews = views
            .filter((view) => !view.builtIn)
            .map((view) => ({
                id: view.id,
                label: view.label,
                filters: cloneFilters(view.filters),
            }));
        window.localStorage.setItem(PRODUCT_CUSTOM_VIEWS_STORAGE_KEY, JSON.stringify(customViews));
    }, [views, hasHydratedViews]);

    useEffect(() => {
        saveStoredSortKey(PRODUCT_SORT_STORAGE_KEY, sortBy);
    }, [sortBy]);

    useEffect(() => {
        let cancelled = false;
        const stored = loadStoredColumnIds(PRODUCT_VISIBLE_COLUMNS_STORAGE_KEY);
        queueMicrotask(() => {
            if (cancelled) return;
            if (stored.length > 0) {
                setVisibleColumnIds(stored as ProductTableColumnId[]);
            }
            setHasHydratedColumns(true);
        });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!hasHydratedColumns || typeof window === "undefined") return;
        window.localStorage.setItem(PRODUCT_VISIBLE_COLUMNS_STORAGE_KEY, JSON.stringify(normalizedVisibleColumnIds));
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

    const resetMenus = useCallback(() => {
        setSortMenuOpen(false);
        setImportMenuOpen(false);
        setExportMenuOpen(false);
        draggedColumnIdRef.current = null;
        setColumnEditorOpen(false);
        setDraggedColumnId(null);
        setColumnDropTarget(null);
        setColumnDragPreview(null);
        setBulkMenuOpen(false);
        setStatusFilterMenuOpen(false);
        setCategoryFilterMenuOpen(false);
        setTagFilterMenuOpen(false);
        setAddVariantFilterMenuOpen(false);
        setVariantFilterMenuOpenId(null);
        setViewMenuOpenId(null);
    }, []);

    const openSearchAndFilter = useCallback(() => {
        if (!hasAnyProducts) return;
        setSearchMode(true);
        setViewComposerOpen(false);
        setViewDraftName("");
        setRenameViewId(null);
        setRenameViewDraftName("");
        resetMenus();

        window.requestAnimationFrame(() => {
            searchQueryInputRef.current?.focus();
        });
    }, [hasAnyProducts, resetMenus]);

    const toggleSortMenu = useCallback(() => {
        if (!hasAnyProducts) return;
        setSortMenuOpen((current) => !current);
        setImportMenuOpen(false);
        setExportMenuOpen(false);
        setStatusFilterMenuOpen(false);
        setCategoryFilterMenuOpen(false);
        setTagFilterMenuOpen(false);
        setAddVariantFilterMenuOpen(false);
        setVariantFilterMenuOpenId(null);
        draggedColumnIdRef.current = null;
        setColumnEditorOpen(false);
        setDraggedColumnId(null);
        setColumnDropTarget(null);
        setColumnDragPreview(null);
    }, [hasAnyProducts]);

    const toggleColumnEditor = () => {
        if (!hasAnyProducts) return;
        setColumnEditorOpen((current) => !current);
        setSortMenuOpen(false);
        setImportMenuOpen(false);
        setExportMenuOpen(false);
        setBulkMenuOpen(false);
        setStatusFilterMenuOpen(false);
        setCategoryFilterMenuOpen(false);
        setTagFilterMenuOpen(false);
        setAddVariantFilterMenuOpen(false);
        setVariantFilterMenuOpenId(null);
        setViewMenuOpenId(null);
        draggedColumnIdRef.current = null;
        setDraggedColumnId(null);
        setColumnDropTarget(null);
        setColumnDragPreview(null);
    };

    const isDefaultColumnLayout = useMemo(() => (
        normalizedVisibleColumnIds.length === PRODUCT_DEFAULT_VISIBLE_COLUMNS.length
        && normalizedVisibleColumnIds.every((columnId, index) => columnId === PRODUCT_DEFAULT_VISIBLE_COLUMNS[index])
    ), [normalizedVisibleColumnIds]);

    const resetColumnsToDefaultLayout = () => {
        draggedColumnIdRef.current = null;
        setDraggedColumnId(null);
        setColumnDropTarget(null);
        setColumnDragPreview(null);
        setVisibleColumnIds(PRODUCT_DEFAULT_VISIBLE_COLUMNS);
    };

    const resetToActiveView = () => {
        setWorkingFilters(cloneFilters(activeView.filters));
        setSearchMode(false);
        setSelectedIds(new Set());
        setViewComposerOpen(false);
        setViewDraftName("");
        setRenameViewId(null);
        setRenameViewDraftName("");
        resetMenus();
    };

    const handleViewSelect = (viewId: string) => {
        const view = views.find((entry) => entry.id === viewId);
        if (!view) return;

        if (!view.builtIn && activeViewId === viewId) {
            setViewMenuOpenId((current) => (current === viewId ? null : viewId));
            return;
        }

        setActiveViewId(viewId);
        setWorkingFilters(cloneFilters(view.filters));
        setSearchMode(false);
        setSelectedIds(new Set());
        setViewComposerOpen(false);
        setViewDraftName("");
        setRenameViewId(null);
        setRenameViewDraftName("");
        resetMenus();
    };

    const updateFilter = <K extends keyof ProductFilters>(key: K, value: ProductFilters[K]) => {
        setWorkingFilters((current) => ({
            ...current,
            [key]: value,
        }));
        setSelectedIds(new Set());
    };

    const getColumnSection = (columnId: ProductTableColumnId): ColumnSection => (
        columnId.startsWith("variant:") ? "variant" : "standard"
    );

    const normalizeColumnIds = (columnIds: ProductTableColumnId[]) => {
        const knownIds = new Set(allColumns.map((column) => column.id));
        const next: ProductTableColumnId[] = [];
        const seen = new Set<ProductTableColumnId>();

        columnIds.forEach((columnId) => {
            if (!knownIds.has(columnId) || seen.has(columnId)) return;
            next.push(columnId);
            seen.add(columnId);
        });

        allColumns.forEach((column) => {
            if (!column.locked || seen.has(column.id)) return;
            if (column.variantId) {
                next.push(column.id);
            } else {
                const firstVariantIndex = next.findIndex((entry) => getColumnSection(entry) === "variant");
                if (firstVariantIndex < 0) next.unshift(column.id);
                else next.splice(firstVariantIndex, 0, column.id);
            }
            seen.add(column.id);
        });

        return next.length > 0 ? next : PRODUCT_DEFAULT_VISIBLE_COLUMNS;
    };

    const toggleColumnVisibility = (columnId: ProductTableColumnId, checked: boolean) => {
        setVisibleColumnIds((current) => {
            const next = normalizeColumnIds(current);
            const section = getColumnSection(columnId);
            const nextSet = new Set(next);
            if (checked) {
                if (!nextSet.has(columnId)) {
                    if (section === "variant") {
                        next.push(columnId);
                    } else {
                        const firstVariantIndex = next.findIndex((entry) => getColumnSection(entry) === "variant");
                        if (firstVariantIndex < 0) {
                            next.push(columnId);
                        } else {
                            next.splice(firstVariantIndex, 0, columnId);
                        }
                    }
                }
            } else if (nextSet.has(columnId)) {
                const index = next.indexOf(columnId);
                if (index >= 0) next.splice(index, 1);
            }

            return normalizeColumnIds(next);
        });
    };

    const reorderVisibleColumnByDrop = (
        draggedId: ProductTableColumnId,
        targetId: ProductTableColumnId,
        position: "before" | "after"
    ) => {
        setVisibleColumnIds((current) => {
            const next = normalizeColumnIds(current);
            const draggedIndex = next.indexOf(draggedId);
            const targetIndex = next.indexOf(targetId);
            if (draggedIndex < 0 || targetIndex < 0) return current;

            let insertionIndex = targetIndex + (position === "after" ? 1 : 0);
            if (draggedIndex < insertionIndex) insertionIndex -= 1;
            if (insertionIndex === draggedIndex) return current;

            const [entry] = next.splice(draggedIndex, 1);
            next.splice(insertionIndex, 0, entry);
            return next;
        });
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

    const onColumnReorderPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, columnId: ProductTableColumnId) => {
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
                const targetId = dropTargetElement.dataset.columnDropId as ProductTableColumnId | undefined;
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

            const targetId = rowTargetElement.dataset.columnRowId as ProductTableColumnId | undefined;
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

    const addVariantFilter = (variantId: string) => {
        setWorkingFilters((current) => ({
            ...current,
            variantValues: {
                ...current.variantValues,
                [variantId]: "ALL",
            },
        }));
        setSelectedIds(new Set());
        setAddVariantFilterMenuOpen(false);
        setVariantFilterMenuOpenId(variantId);
    };

    const setVariantFilterValue = (variantId: string, value: string) => {
        setWorkingFilters((current) => ({
            ...current,
            variantValues: {
                ...current.variantValues,
                [variantId]: value,
            },
        }));
        setSelectedIds(new Set());
    };

    const removeVariantFilter = (variantId: string) => {
        setWorkingFilters((current) => {
            const nextVariantValues = { ...current.variantValues };
            delete nextVariantValues[variantId];
            return {
                ...current,
                variantValues: nextVariantValues,
            };
        });
        setSelectedIds(new Set());
        setVariantFilterMenuOpenId((current) => (current === variantId ? null : current));
    };

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

    const navigateToProductEdit = (id: string) => {
        router.push(`/portal/products/${id}`);
    };

    const handleRowClick = (event: ReactMouseEvent<HTMLTableRowElement>, id: string) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest("input,button,a,select,textarea,label")) return;
        navigateToProductEdit(id);
    };

    const handleRowKeyDown = (event: ReactKeyboardEvent<HTMLTableRowElement>, id: string) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        navigateToProductEdit(id);
    };

    const openViewComposer = () => {
        if (!hasAnyProducts) return;
        resetMenus();
        setRenameViewId(null);
        setRenameViewDraftName("");
        if (viewComposerOpen) {
            setViewComposerOpen(false);
            return;
        }
        setViewDraftName("");
        setViewComposerOpen(true);
    };

    const handleOpenCreateProduct = () => {
        router.push("/portal/products/new");
    };

    useEffect(() => {
        if (hasAnyProducts) return;
        setSearchMode(false);
        setViewComposerOpen(false);
        setViewDraftName("");
        setRenameViewId(null);
        setRenameViewDraftName("");
        setSelectedIds(new Set());
        resetMenus();
    }, [hasAnyProducts, resetMenus]);

    const saveCurrentView = () => {
        const name = viewDraftName.trim();
        if (!name) return;

        const id = createCustomViewId();
        const nextView: ProductView = {
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
        setViewMenuOpenId(null);
    };

    const openRenameView = (viewId: string) => {
        const view = views.find((entry) => entry.id === viewId && !entry.builtIn);
        if (!view) return;

        setRenameViewId(view.id);
        setRenameViewDraftName(view.label);
        setViewMenuOpenId(null);
        setViewComposerOpen(false);
        setViewDraftName("");
    };

    const closeRenameView = () => {
        setRenameViewId(null);
        setRenameViewDraftName("");
    };

    const saveRenameView = () => {
        if (!renameViewId) return;
        const name = renameViewDraftName.trim();
        if (!name) return;

        setViews((current) => current.map((view) => (view.id === renameViewId ? { ...view, label: name } : view)));
        closeRenameView();
    };

    const duplicateView = (viewId: string) => {
        const source = views.find((entry) => entry.id === viewId && !entry.builtIn);
        if (!source) return;

        const baseLabel = `${source.label} ${text.viewMenu.duplicate}`;
        const labelSet = new Set(views.map((view) => view.label.trim().toLowerCase()));
        let nextLabel = baseLabel;
        let suffix = 2;
        while (labelSet.has(nextLabel.toLowerCase())) {
            nextLabel = `${baseLabel} ${suffix}`;
            suffix += 1;
        }

        const nextId = createCustomViewId();
        const nextView: ProductView = {
            id: nextId,
            label: nextLabel,
            builtIn: false,
            filters: cloneFilters(source.filters),
        };

        setViews((current) => [...current, nextView]);
        setActiveViewId(nextId);
        setWorkingFilters(cloneFilters(source.filters));
        setSearchMode(false);
        setSelectedIds(new Set());
        setViewComposerOpen(false);
        setViewDraftName("");
        setViewMenuOpenId(null);
        closeRenameView();
    };

    const deleteView = (viewId: string) => {
        const target = views.find((entry) => entry.id === viewId && !entry.builtIn);
        if (!target) return;

        setViews((current) => current.filter((view) => view.id !== viewId));
        setViewMenuOpenId(null);
        if (renameViewId === viewId) {
            closeRenameView();
        }

        if (activeViewId === viewId) {
            const fallbackView = BUILT_IN_VIEWS[0];
            setActiveViewId(fallbackView.id);
            setWorkingFilters(cloneFilters(fallbackView.filters));
            setSearchMode(false);
            setSelectedIds(new Set());
        }
    };

    const withSelectedProducts = (mutate: (product: Product) => Product | null) => {
        setProducts((current) => {
            const next: Product[] = [];
            current.forEach((product) => {
                if (!selectedIds.has(product.id)) {
                    next.push(product);
                    return;
                }

                const updated = mutate(product);
                if (updated) next.push(updated);
            });
            return next;
        });
    };

    const handleSetSelectedActive = () => {
        withSelectedProducts((product) => ({ ...product, status: "ACTIVE" }));
        setBulkMenuOpen(false);
    };

    const handleDeleteSelected = () => {
        if (selectedIds.size === 0) return;
        setDeleteConfirmIds(Array.from(selectedIds));
        setDeleteConfirmError(null);
        setDeleteConfirmOpen(true);
        setBulkMenuOpen(false);
    };

    const closeDeleteConfirm = () => {
        if (deleteConfirmSubmitting) return;
        setDeleteConfirmOpen(false);
        setDeleteConfirmIds([]);
        setDeleteConfirmError(null);
    };

    const confirmDeleteSelected = async () => {
        if (deleteConfirmIds.length === 0 || deleteConfirmSubmitting) return;

        const selectedProducts = products.filter((product) => deleteConfirmIds.includes(product.id));
        setDeleteConfirmSubmitting(true);
        setDeleteConfirmError(null);

        try {
            const payload = await deleteCatalogEntriesFromApi({
                entity: "products",
                ids: selectedProducts.map((product) => product.id),
                skus: selectedProducts.map((product) => product.sku),
            });
            const nextState = payload.state ?? await fetchCatalogStateFromApi();
            setInventoryBatches(nextState.inventoryBatches);
            setInventorySales(nextState.inventorySales);
            setProducts(nextState.products);
            setSelectedIds(new Set());
            setDeleteConfirmOpen(false);
            setDeleteConfirmIds([]);
        } catch {
            setDeleteConfirmError("Unable to delete selected products.");
        } finally {
            setDeleteConfirmSubmitting(false);
        }
    };

    const handleUnlistSelected = () => {
        withSelectedProducts((product) => ({ ...product, status: "ARCHIVED" }));
        setBulkMenuOpen(false);
    };

    const handleAddFeaturedTag = () => {
        withSelectedProducts((product) => ({
            ...product,
            tags: product.tags.includes("featured") ? product.tags : [...product.tags, "featured"],
        }));
        setBulkMenuOpen(false);
    };

    const handleRemoveFeaturedTag = () => {
        withSelectedProducts((product) => ({
            ...product,
            tags: product.tags.filter((tag) => tag !== "featured"),
        }));
        setBulkMenuOpen(false);
    };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (viewComposerOpen) return;
            if (event.defaultPrevented) return;
            if (event.metaKey || event.ctrlKey || event.altKey) return;

            const target = event.target as HTMLElement | null;
            if (target) {
                const tag = target.tagName;
                if (target.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
            }

            const key = event.key.toLowerCase();
            if (key === "f") {
                event.preventDefault();
                openSearchAndFilter();
                return;
            }

            if (key === "s") {
                event.preventDefault();
                toggleSortMenu();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [openSearchAndFilter, toggleSortMenu, viewComposerOpen]);

    const renderProductTableCell = (product: Product, column: ProductTableColumn): ReactNode => {
        if (column.id === "product") {
            return (
                <div className="portalProductsNameCell__R8m2Q1">
                    <span className="portalProductsName__V6p3M1">{product.name}</span>
                    <span className="portalProductsSku__N3m9K5">{product.sku}</span>
                </div>
            );
        }

        if (column.id === "status") {
            return (
                <span className="portalProductsStatusBadge__M4n2P6" data-status={product.status}>
                    {text.statusLabels[product.status]}
                </span>
            );
        }

        if (column.id === "inventory") {
            return formatInventory(product.inventory);
        }

        if (column.id === "category") {
            const value = getProductCategoryTitles(product, categoryDefinitions).join(", ").trim();
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

    const currentSortLabel = sortOptions.find((option) => option.value === sortBy)?.label ?? text.sort.button;
    const statusFilterLabel = workingFilters.status === "ANY"
        ? text.filters.status
        : `${text.filters.status}: ${text.statusLabels[workingFilters.status]}`;
    const categoryFilterLabel = workingFilters.category === "ALL"
        ? text.filters.category
        : `${text.filters.category}: ${workingFilters.category}`;
    const tagFilterLabel = workingFilters.tag === "ALL"
        ? text.filters.tag
        : `${text.filters.tag}: ${workingFilters.tag}`;
    const deleteConfirmTitle = `Delete ${deleteConfirmIds.length} ${deleteConfirmIds.length === 1 ? "product" : "products"}`;
    const handleProductsTableScroll = (event: ReactUIEvent<HTMLDivElement>) => {
        setProductsTableScrolledX(event.currentTarget.scrollLeft > 0);
    };

    useEffect(() => {
        const tableScroll = productsTableScrollRef.current;
        if (!tableScroll) return;
        setProductsTableScrolledX(tableScroll.scrollLeft > 0);
    }, [visibleColumns.length, visibleProducts.length, hasSelection]);

    return (
        <section className="portalProductsPage__C4p8M2">
            <header className="portalProductsHeader__N7v2R4">
                <div className="portalProductsHeadingWrap__B6k1Q9">
                    {renderPortalPageIcon("products", {
                        className: "portalProductsHeadingIcon__Q8m2D5",
                        "aria-hidden": "true",
                    })}
                    <h1 className="portalProductsHeading__L2m8T6">{messages.pages.products}</h1>
                </div>

                {catalogLoaded && hasAnyProducts ? (
                    <div className="portalProductsHeaderActions__J9r2V3">
                    <div className="portalProductsMenuWrap__P6k2T1" ref={exportMenuRef}>
                        <Button
                            type="button"
                            kind="highlight"
                            size="xsmall"
                            aria-haspopup="menu"
                            aria-expanded={exportMenuOpen}
                            onClick={() => {
                                setExportMenuOpen((current) => !current);
                                setImportMenuOpen(false);
                                setSortMenuOpen(false);
                            }}
                        >
                            <span>{text.actions.export}</span>
                        </Button>

                        {exportMenuOpen ? (
                            <div role="menu" className="portalProductsMenuPanel__A8d2P7">
                                <button type="button" className="portalProductsMenuItem__E3n8R6" role="menuitem" onClick={() => setExportMenuOpen(false)}>
                                    {text.menus.excelCsv}
                                </button>
                                <button type="button" className="portalProductsMenuItem__E3n8R6" role="menuitem" onClick={() => setExportMenuOpen(false)}>
                                    {text.menus.plainCsv}
                                </button>
                            </div>
                        ) : null}
                    </div>

                    <div className="portalProductsMenuWrap__P6k2T1" ref={importMenuRef}>
                        <Button
                            type="button"
                            kind="highlight"
                            size="xsmall"
                            aria-haspopup="menu"
                            aria-expanded={importMenuOpen}
                            onClick={() => {
                                setImportMenuOpen((current) => !current);
                                setExportMenuOpen(false);
                                setSortMenuOpen(false);
                            }}
                        >
                            <span>{text.actions.import}</span>
                        </Button>

                        {importMenuOpen ? (
                            <div role="menu" className="portalProductsMenuPanel__A8d2P7">
                                <button type="button" className="portalProductsMenuItem__E3n8R6" role="menuitem" onClick={() => setImportMenuOpen(false)}>
                                    {text.menus.csvFile}
                                </button>
                                <button type="button" className="portalProductsMenuItem__E3n8R6" role="menuitem" onClick={() => setImportMenuOpen(false)}>
                                    {text.menus.csvForExcel}
                                </button>
                            </div>
                        ) : null}
                    </div>

                    <div className="portalProductsMenuWrap__P6k2T1 portalProductsEditMenuWrap__R5m2Q4" ref={columnEditorMenuRef}>
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

                    <Button type="button" kind="primary" size="xsmall" onClick={handleOpenCreateProduct}>
                        <span>{text.actions.addProduct}</span>
                    </Button>
                    </div>
                ) : null}
            </header>

            {!catalogLoaded ? (
                <section className="portalProductsTableShell__G4m7N1 ui-surface-card">
                    <PortalTableLoading mode={tableLoadingMode} />
                </section>
            ) : (
                <section className="portalProductsTableShell__G4m7N1 ui-surface-card">
                <div className="portalProductsControlsTableWrap__Q4m2R7">
                    <table className="portalProductsTable__E8n4Q7 portalProductsControlsTable__N2m8Q5">
                        <thead>
                            <tr>
                                <th colSpan={tableColumnSpan} className="portalProductsControlsHeader__B6m2R1">
                {searchMode && hasAnyProducts ? (
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
                                    {text.actions.saveAs}
                                </Button>

                                <div className="portalProductsMenuWrap__P6k2T1" ref={sortMenuRef}>
                                    <Tooltip content={text.filters.sortShortcut}>
                                        <Button
                                            type="button"
                                            kind="basic"
                                            size="xsmall"
                                            className="portalProductsIconButton__D6m8P2"
                                            aria-haspopup="menu"
                                            aria-expanded={sortMenuOpen}
                                            aria-label={`${text.sort.sortProducts} (S): ${currentSortLabel}`}
                                            onClick={toggleSortMenu}
                                        >
                                            <ArrowUpDown aria-hidden="true" />
                                        </Button>
                                    </Tooltip>

                                    {sortMenuOpen ? (
                                        <div role="menu" className="portalProductsMenuPanel__A8d2P7">
                                            {sortOptions.map((option) => (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    role="menuitemradio"
                                                    aria-checked={sortBy === option.value}
                                                    className={cn(
                                                        "portalProductsMenuItem__E3n8R6",
                                                        sortBy === option.value && "portalProductsMenuItemActive__M6p3D9"
                                                    )}
                                                    onClick={() => {
                                                        setSortBy(option.value);
                                                        setSortMenuOpen(false);
                                                    }}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        <div className="portalProductsSearchFiltersRow__G8m1P7">
                            <div className="portalProductsMenuWrap__P6k2T1" ref={statusFilterMenuRef}>
                                <button
                                    type="button"
                                    className={cn(
                                        "portalProductsDashedFilterButton__R4m8Q2",
                                        (workingFilters.status !== "ANY" || statusFilterMenuOpen) && "portalProductsDashedFilterButtonActive__W2n9K5"
                                    )}
                                    aria-haspopup="menu"
                                    aria-expanded={statusFilterMenuOpen}
                                    onClick={() => {
                                        setStatusFilterMenuOpen((current) => !current);
                                        setCategoryFilterMenuOpen(false);
                                        setTagFilterMenuOpen(false);
                                        setSortMenuOpen(false);
                                        setAddVariantFilterMenuOpen(false);
                                        setVariantFilterMenuOpenId(null);
                                    }}
                                >
                                    {statusFilterLabel}
                                </button>

                                {statusFilterMenuOpen ? (
                                    <div role="menu" className="portalProductsMenuPanel__A8d2P7 portalProductsMenuPanelAlignLeft__V1m8Q2">
                                        <button
                                            type="button"
                                            role="menuitemradio"
                                            aria-checked={workingFilters.status === "ANY"}
                                            className={cn(
                                                "portalProductsMenuItem__E3n8R6",
                                                workingFilters.status === "ANY" && "portalProductsMenuItemActive__M6p3D9"
                                            )}
                                                onClick={() => {
                                                    updateFilter("status", "ANY");
                                                    setStatusFilterMenuOpen(false);
                                                    setVariantFilterMenuOpenId(null);
                                                }}
                                            >
                                            {text.filters.anyStatus}
                                        </button>
                                        <button
                                            type="button"
                                            role="menuitemradio"
                                            aria-checked={workingFilters.status === "ACTIVE"}
                                            className={cn(
                                                "portalProductsMenuItem__E3n8R6",
                                                workingFilters.status === "ACTIVE" && "portalProductsMenuItemActive__M6p3D9"
                                            )}
                                                onClick={() => {
                                                    updateFilter("status", "ACTIVE");
                                                    setStatusFilterMenuOpen(false);
                                                    setVariantFilterMenuOpenId(null);
                                                }}
                                            >
                                            {text.statusLabels.ACTIVE}
                                        </button>
                                        <button
                                            type="button"
                                            role="menuitemradio"
                                            aria-checked={workingFilters.status === "DRAFT"}
                                            className={cn(
                                                "portalProductsMenuItem__E3n8R6",
                                                workingFilters.status === "DRAFT" && "portalProductsMenuItemActive__M6p3D9"
                                            )}
                                                onClick={() => {
                                                    updateFilter("status", "DRAFT");
                                                    setStatusFilterMenuOpen(false);
                                                    setVariantFilterMenuOpenId(null);
                                                }}
                                            >
                                            {text.statusLabels.DRAFT}
                                        </button>
                                        <button
                                            type="button"
                                            role="menuitemradio"
                                            aria-checked={workingFilters.status === "ARCHIVED"}
                                            className={cn(
                                                "portalProductsMenuItem__E3n8R6",
                                                workingFilters.status === "ARCHIVED" && "portalProductsMenuItemActive__M6p3D9"
                                            )}
                                                onClick={() => {
                                                    updateFilter("status", "ARCHIVED");
                                                    setStatusFilterMenuOpen(false);
                                                    setVariantFilterMenuOpenId(null);
                                                }}
                                            >
                                            {text.statusLabels.ARCHIVED}
                                        </button>
                                    </div>
                                ) : null}
                            </div>

                            <div className="portalProductsMenuWrap__P6k2T1" ref={categoryFilterMenuRef}>
                                <button
                                    type="button"
                                    className={cn(
                                        "portalProductsDashedFilterButton__R4m8Q2",
                                        (workingFilters.category !== "ALL" || categoryFilterMenuOpen) && "portalProductsDashedFilterButtonActive__W2n9K5"
                                    )}
                                    aria-haspopup="menu"
                                    aria-expanded={categoryFilterMenuOpen}
                                    onClick={() => {
                                        setCategoryFilterMenuOpen((current) => !current);
                                        setStatusFilterMenuOpen(false);
                                        setTagFilterMenuOpen(false);
                                        setSortMenuOpen(false);
                                        setAddVariantFilterMenuOpen(false);
                                        setVariantFilterMenuOpenId(null);
                                    }}
                                >
                                    {categoryFilterLabel}
                                </button>

                                {categoryFilterMenuOpen ? (
                                    <div role="menu" className="portalProductsMenuPanel__A8d2P7 portalProductsMenuPanelAlignLeft__V1m8Q2">
                                        {categoryOptions.map((category) => (
                                            <button
                                                key={category}
                                                type="button"
                                                role="menuitemradio"
                                                aria-checked={workingFilters.category === category}
                                                className={cn(
                                                    "portalProductsMenuItem__E3n8R6",
                                                    workingFilters.category === category && "portalProductsMenuItemActive__M6p3D9"
                                                )}
                                                onClick={() => {
                                                    updateFilter("category", category);
                                                    setCategoryFilterMenuOpen(false);
                                                    setVariantFilterMenuOpenId(null);
                                                }}
                                            >
                                                {category === "ALL" ? text.filters.allCategories : category}
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                            </div>

                            <div className="portalProductsMenuWrap__P6k2T1" ref={tagFilterMenuRef}>
                                <button
                                    type="button"
                                    className={cn(
                                        "portalProductsDashedFilterButton__R4m8Q2",
                                        (workingFilters.tag !== "ALL" || tagFilterMenuOpen) && "portalProductsDashedFilterButtonActive__W2n9K5"
                                    )}
                                    aria-haspopup="menu"
                                    aria-expanded={tagFilterMenuOpen}
                                    onClick={() => {
                                        setTagFilterMenuOpen((current) => !current);
                                        setStatusFilterMenuOpen(false);
                                        setCategoryFilterMenuOpen(false);
                                        setSortMenuOpen(false);
                                        setAddVariantFilterMenuOpen(false);
                                        setVariantFilterMenuOpenId(null);
                                    }}
                                >
                                    {tagFilterLabel}
                                </button>

                                {tagFilterMenuOpen ? (
                                    <div role="menu" className="portalProductsMenuPanel__A8d2P7 portalProductsMenuPanelAlignLeft__V1m8Q2">
                                        {tagOptions.map((tag) => (
                                            <button
                                                key={tag}
                                                type="button"
                                                role="menuitemradio"
                                                aria-checked={workingFilters.tag === tag}
                                                className={cn(
                                                    "portalProductsMenuItem__E3n8R6",
                                                    workingFilters.tag === tag && "portalProductsMenuItemActive__M6p3D9"
                                                )}
                                                onClick={() => {
                                                    updateFilter("tag", tag);
                                                    setTagFilterMenuOpen(false);
                                                    setVariantFilterMenuOpenId(null);
                                                }}
                                            >
                                                {tag === "ALL" ? text.filters.allTags : tag}
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                            </div>

                            {variantFilters.map(([variantId, variantValue]) => {
                                const definition = variantDefinitionById.get(variantId);
                                if (!definition) return null;

                                const label = variantValue === "ALL" ? definition.label : `${definition.label}: ${variantValue}`;
                                const isOpen = variantFilterMenuOpenId === variantId;

                                return (
                                    <div
                                        key={variantId}
                                        className="portalProductsMenuWrap__P6k2T1"
                                        ref={(node) => {
                                            variantFilterMenuRefs.current[variantId] = node;
                                        }}
                                    >
                                        <button
                                            type="button"
                                            className={cn(
                                                "portalProductsDashedFilterButton__R4m8Q2",
                                                (variantValue !== "ALL" || isOpen) && "portalProductsDashedFilterButtonActive__W2n9K5"
                                            )}
                                            aria-haspopup="menu"
                                            aria-expanded={isOpen}
                                            onClick={() => {
                                                setVariantFilterMenuOpenId((current) => (current === variantId ? null : variantId));
                                                setAddVariantFilterMenuOpen(false);
                                                setStatusFilterMenuOpen(false);
                                                setCategoryFilterMenuOpen(false);
                                                setTagFilterMenuOpen(false);
                                                setSortMenuOpen(false);
                                            }}
                                        >
                                            {label}
                                        </button>

                                        {isOpen ? (
                                            <div role="menu" className="portalProductsMenuPanel__A8d2P7 portalProductsMenuPanelAlignLeft__V1m8Q2">
                                                {definition.inputType === "select" ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            role="menuitemradio"
                                                            aria-checked={variantValue === "ALL"}
                                                            className={cn(
                                                                "portalProductsMenuItem__E3n8R6",
                                                                variantValue === "ALL" && "portalProductsMenuItemActive__M6p3D9"
                                                            )}
                                                            onClick={() => {
                                                                setVariantFilterValue(variantId, "ALL");
                                                                setVariantFilterMenuOpenId(null);
                                                            }}
                                                        >
                                                            {text.filters.allValues}
                                                        </button>
                                                        {definition.values.map((value) => (
                                                            <button
                                                                key={value}
                                                                type="button"
                                                                role="menuitemradio"
                                                                aria-checked={variantValue === value}
                                                                className={cn(
                                                                    "portalProductsMenuItem__E3n8R6",
                                                                    variantValue === value && "portalProductsMenuItemActive__M6p3D9"
                                                                )}
                                                                onClick={() => {
                                                                    setVariantFilterValue(variantId, value);
                                                                    setVariantFilterMenuOpenId(null);
                                                                }}
                                                            >
                                                                {value}
                                                            </button>
                                                        ))}
                                                    </>
                                                ) : (
                                                    <div className="portalProductsVariableFilterInput__M5n2Q8">
                                                        <input
                                                            className="form__input__Z3n7q0"
                                                            value={variantValue === "ALL" ? "" : variantValue}
                                                            onChange={(event) => setVariantFilterValue(variantId, event.target.value || "ALL")}
                                                            placeholder={fillTemplate(text.filters.filterBy, { label: definition.label.toLowerCase() })}
                                                        />
                                                        <div className="portalProductsVariableFilterActions__U7m2Q9">
                                                            <Button
                                                                type="button"
                                                                kind="highlight"
                                                                size="xsmall"
                                                                onClick={() => setVariantFilterValue(variantId, "ALL")}
                                                            >
                                                                {text.actions.clear}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                                <button
                                                    type="button"
                                                    role="menuitem"
                                                    className="portalProductsMenuItem__E3n8R6"
                                                    onClick={() => removeVariantFilter(variantId)}
                                                >
                                                    {text.actions.removeFilter}
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })}

                            <div className="portalProductsMenuWrap__P6k2T1" ref={addVariantFilterMenuRef}>
                                <button
                                    type="button"
                                    className="portalProductsDashedFilterButton__R4m8Q2"
                                    aria-haspopup="menu"
                                    aria-expanded={addVariantFilterMenuOpen}
                                    disabled={availableVariantFilters.length === 0}
                                    onClick={() => {
                                        setAddVariantFilterMenuOpen((current) => !current);
                                        setVariantFilterMenuOpenId(null);
                                        setStatusFilterMenuOpen(false);
                                        setCategoryFilterMenuOpen(false);
                                        setTagFilterMenuOpen(false);
                                        setSortMenuOpen(false);
                                    }}
                                >
                                    {text.actions.addFilter}
                                </button>

                                {addVariantFilterMenuOpen ? (
                                    <div role="menu" className="portalProductsMenuPanel__A8d2P7 portalProductsMenuPanelAlignLeft__V1m8Q2">
                                        {availableVariantFilters.map((definition) => (
                                            <button
                                                key={definition.id}
                                                type="button"
                                                role="menuitem"
                                                className="portalProductsMenuItem__E3n8R6"
                                                onClick={() => addVariantFilter(definition.id)}
                                            >
                                                {definition.label}
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className={cn("portalProductsTableTopRow__Y3m9Q5", !hasAnyProducts && "portalProductsTableTopRowDisabled__B4m2Q6")}>
                        <div className="portalProductsViewsRow__R6m1V2" role="tablist" aria-label={text.views.productViews}>
                            {views.map((view) => {
                                const isCustomView = !view.builtIn;
                                const isMenuOpen = isCustomView && viewMenuOpenId === view.id;
                                return (
                                    <div
                                        key={view.id}
                                        className="portalProductsViewItem__X5m8Q2"
                                        ref={(node) => {
                                            if (!isCustomView) return;
                                            viewMenuRefs.current[view.id] = node;
                                        }}
                                    >
                                        <Button
                                            type="button"
                                            kind="toggle"
                                            size="xsmall"
                                            role="tab"
                                            aria-selected={view.id === activeViewId}
                                            aria-haspopup={isCustomView ? "menu" : undefined}
                                            aria-expanded={isCustomView ? isMenuOpen : undefined}
                                            className="portalProductsViewTab__D8m4Q5"
                                            disabled={!hasAnyProducts}
                                            onClick={() => handleViewSelect(view.id)}
                                        >
                                            <span className="portalProductsViewLabel__J2m8Q6">{getViewLabel(view, text)}</span>
                                            {isCustomView && view.id === activeViewId ? (
                                                <ChevronDown
                                                    aria-hidden="true"
                                                    className={cn(
                                                        "portalProductsViewChevron__M3m8Q2",
                                                        isMenuOpen && "portalProductsViewChevronOpen__P4m9Q1"
                                                    )}
                                                />
                                            ) : null}
                                        </Button>

                                        {isMenuOpen ? (
                                            <div role="menu" className="portalProductsMenuPanel__A8d2P7 portalProductsViewMenuPanel__C7m2Q5">
                                                <button
                                                    type="button"
                                                    role="menuitem"
                                                    className="portalProductsMenuItem__E3n8R6 portalProductsMenuItemWithIcon__R4m8Q7"
                                                    onClick={() => openRenameView(view.id)}
                                                >
                                                    <Pencil aria-hidden="true" />
                                                    <span>{text.viewMenu.rename}</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    role="menuitem"
                                                    className="portalProductsMenuItem__E3n8R6 portalProductsMenuItemWithIcon__R4m8Q7"
                                                    onClick={() => duplicateView(view.id)}
                                                >
                                                    <Copy aria-hidden="true" />
                                                    <span>{text.viewMenu.duplicate}</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    role="menuitem"
                                                    className="portalProductsMenuItem__E3n8R6 portalProductsMenuItemWithIcon__R4m8Q7 portalProductsMenuItemDanger__L2m7Q9"
                                                    onClick={() => deleteView(view.id)}
                                                >
                                                    <Trash2 aria-hidden="true" />
                                                    <span>{text.viewMenu.delete}</span>
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })}

                            <Tooltip content={text.views.createView}>
                                <Button
                                    type="button"
                                    kind="ghost"
                                    size="xsmall"
                                    className="portalProductsNewViewButton__S8n2K6"
                                    aria-label={text.views.createView}
                                    disabled={!hasAnyProducts}
                                    onClick={openViewComposer}
                                >
                                    <Plus aria-hidden="true" />
                                </Button>
                            </Tooltip>
                        </div>

		                        <div className="portalProductsTableActions__P5d8K3">
		                            <Tooltip content={text.filters.searchAndFilterShortcut}>
	                                <Button
	                                    type="button"
                                    kind="basic"
                                    size="xsmall"
                                    className="portalProductsSearchFilterButton__M9r2D1"
                                    aria-label={text.filters.searchAndFilterShortcut}
                                    disabled={!hasAnyProducts}
                                    onClick={openSearchAndFilter}
                                >
                                    <Search aria-hidden="true" />
                                    <Filter aria-hidden="true" />
                                </Button>
                            </Tooltip>

                            <div className="portalProductsMenuWrap__P6k2T1" ref={sortMenuRef}>
                                <Tooltip content={text.filters.sortShortcut}>
                                    <Button
                                        type="button"
                                        kind="basic"
                                        size="xsmall"
                                        className="portalProductsIconButton__D6m8P2"
                                        aria-haspopup="menu"
                                        aria-expanded={sortMenuOpen}
                                        aria-label={`${text.sort.sortProducts} (S): ${currentSortLabel}`}
                                        disabled={!hasAnyProducts}
                                        onClick={toggleSortMenu}
                                    >
                                        <ArrowUpDown aria-hidden="true" />
                                    </Button>
                                </Tooltip>

                                {sortMenuOpen ? (
                                    <div role="menu" className="portalProductsMenuPanel__A8d2P7">
                                        {sortOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                role="menuitemradio"
                                                aria-checked={sortBy === option.value}
                                                className={cn(
                                                    "portalProductsMenuItem__E3n8R6",
                                                    sortBy === option.value && "portalProductsMenuItemActive__M6p3D9"
                                                )}
                                                onClick={() => {
                                                    setSortBy(option.value);
                                                    setSortMenuOpen(false);
                                                }}
                                            >
                                                {option.label}
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
                    ref={productsTableScrollRef}
                    onScroll={handleProductsTableScroll}
                    className={cn(
                        "portalProductsTableScroll__H7q2M4 portalProductsDataTableScroll__W5m2Q9",
                        productsTableScrolledX && "portalProductsDataTableScrolled__F2m8Q6"
                    )}
                >
                    <table className="portalProductsTable__E8n4Q7 portalProductsDataTable__B2m8Q4">
                        {hasAnyProducts ? (
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
                                                aria-label={text.table.selectAllProducts}
                                            />
                                        </th>
	                                        <th colSpan={visibleColumns.length} className="portalProductsBulkHeader__L1p7V4">
                                            <div className="portalProductsBulkActions__S6m2N8">
                                                <div className="portalProductsBulkSummary__K4m9P2">
                                                    <span>{selectedIds.size} {text.bulk.selected}</span>
                                                </div>

                                                <div className="portalProductsBulkButtons__W5m2R8">
                                                    <Button type="button" kind="basic" size="xsmall">
                                                        {text.bulk.bulkEdit}
                                                    </Button>
                                                    <Button type="button" kind="basic" size="xsmall" onClick={handleSetSelectedActive}>
                                                        {text.bulk.setAsActive}
                                                    </Button>

                                                    <div className="portalProductsMenuWrap__P6k2T1" ref={bulkMenuRef}>
                                                        <Button
                                                            type="button"
                                                            kind="basic"
                                                            size="xsmall"
                                                            className="portalProductsIconButton__D6m8P2"
                                                            aria-haspopup="menu"
                                                            aria-expanded={bulkMenuOpen}
                                                            onClick={() => setBulkMenuOpen((current) => !current)}
                                                        >
                                                            <Ellipsis aria-hidden="true" />
                                                        </Button>

                                                        {bulkMenuOpen ? (
                                                            <div role="menu" className="portalProductsMenuPanel__A8d2P7">
                                                                <button type="button" className="portalProductsMenuItem__E3n8R6" role="menuitem" onClick={handleDeleteSelected}>
                                                                    {text.bulk.deleteProducts}
                                                                </button>
                                                                <button type="button" className="portalProductsMenuItem__E3n8R6" role="menuitem" onClick={handleUnlistSelected}>
                                                                    {text.bulk.unlistProducts}
                                                                </button>
                                                                <button type="button" className="portalProductsMenuItem__E3n8R6" role="menuitem" onClick={handleAddFeaturedTag}>
                                                                    {text.bulk.addFeaturedTag}
                                                                </button>
                                                                <button type="button" className="portalProductsMenuItem__E3n8R6" role="menuitem" onClick={handleRemoveFeaturedTag}>
                                                                    {text.bulk.removeFeaturedTag}
                                                                </button>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                        </th>
                                    </tr>
                                    <tr className="portalProductsColumnSizerRow__P8m2Q4" aria-hidden="true">
                                        <th className="portalProductsCellCheckbox__C5m1R9">
                                            <span />
                                        </th>
	                                        {visibleColumns.map((column, index) => (
	                                            <th
                                                    key={column.id}
                                                    data-column-id={column.id}
                                                    data-sticky-primary={index === 0 ? "true" : undefined}
                                                >
                                                    {column.label}
                                                </th>
	                                        ))}
                                    </tr>
                                </>
                            ) : (
                                <tr>
                                    <th className="portalProductsCellCheckbox__C5m1R9">
                                        <input
                                            ref={selectAllRef}
                                            type="checkbox"
                                            checked={allVisibleSelected}
                                            onChange={(event) => toggleAllVisible(event.target.checked)}
                                            aria-label={text.table.selectAllProducts}
                                        />
                                    </th>
	                                    {visibleColumns.map((column, index) => (
	                                        <th
                                                key={column.id}
                                                data-column-id={column.id}
                                                data-sticky-primary={index === 0 ? "true" : undefined}
                                            >
                                                {column.label}
                                            </th>
	                                    ))}
	                                </tr>
	                            )}
	                        </thead>
                        ) : null}

                        <tbody>
                            {visibleProducts.length === 0 ? (
                                <tr className="portalProductsEmptyRow__S2m8Q4">
	                                    <td colSpan={tableColumnSpan} className={cn("portalProductsEmpty__D3m7K2", !hasAnyProducts && "portalProductsOnboardingCell__M2m8Q9")}>
                                            {hasAnyProducts ? (
	                                            text.table.noProductsFound
                                            ) : (
                                                <div className="portalProductsOnboardingRow__D2m8Q7">
                                                    <div className="portalProductsOnboardingContent__G7m2Q3">
                                                        <h3 className="typography__heading6__H5j9s0 portalProductsEmptyHeading__D2m8Q4">Add your products</h3>
                                                        <p className="typography__small__Q9j2p0 portalProductsEmptyBody__J3m2Q7">Start by stocking your store with products your customers will love.</p>
                                                        <div className="portalProductsOnboardingActions__V8m2Q4">
                                                            <Button type="button" kind="primary" size="xsmall" onClick={handleOpenCreateProduct}>
                                                                <Plus aria-hidden="true" />
                                                                <span>{text.actions.addProduct}</span>
                                                            </Button>
                                                            <Button type="button" kind="basic" size="xsmall">
                                                                <Upload aria-hidden="true" />
                                                                <span>{text.actions.import}</span>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <div className="portalProductsOnboardingArt__A5m2Q6" aria-hidden="true">
                                                        <span className="portalProductsOnboardingArtCard__W3m2Q8 portalProductsOnboardingArtCardPrimary__Y2m8Q5" />
                                                        <span className="portalProductsOnboardingArtCard__W3m2Q8 portalProductsOnboardingArtCardSecondary__F5m2Q4" />
                                                        <span className="portalProductsOnboardingArtCard__W3m2Q8 portalProductsOnboardingArtCardTertiary__B2m8Q1" />
                                                    </div>
                                                </div>
                                            )}
	                                    </td>
	                                </tr>
                            ) : (
                                visibleProducts.map((product) => {
                                    const checked = selectedIds.has(product.id);

                                    return (
                                        <tr
                                            key={product.id}
                                            className={cn("portalProductsRowInteractive__T4m8Q1", checked && "portalProductsRowSelected__Q9m2N4")}
                                            onClick={(event) => handleRowClick(event, product.id)}
                                            onKeyDown={(event) => handleRowKeyDown(event, product.id)}
                                            tabIndex={0}
                                            role="link"
                                        >
                                            <td className="portalProductsCellCheckbox__C5m1R9">
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={(event) => toggleRow(product.id, event.target.checked)}
                                                    aria-label={fillTemplate(text.table.selectProduct, { name: product.name })}
                                                />
                                            </td>
	                                            {visibleColumns.map((column, index) => (
	                                                <td
                                                        key={column.id}
                                                        data-column-id={column.id}
                                                        data-sticky-primary={index === 0 ? "true" : undefined}
                                                    >
                                                        {renderProductTableCell(product, column)}
                                                    </td>
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
                open={deleteConfirmOpen}
                title={deleteConfirmTitle}
                closeLabel={text.actions.cancel}
                onClose={closeDeleteConfirm}
                footer={(
                    <>
                        <Button type="button" kind="secondary" size="xsmall" onClick={closeDeleteConfirm} disabled={deleteConfirmSubmitting}>
                            {text.actions.cancel}
                        </Button>
                        <Button type="button" kind="danger" size="xsmall" onClick={confirmDeleteSelected} disabled={deleteConfirmSubmitting}>
                            Delete
                        </Button>
                    </>
                )}
            >
                <p className="portalProductsDeleteConfirmText__A8m2Q6">This cannot be undone.</p>
                {deleteConfirmError ? <p className="portalProductsDeleteConfirmError__N2m8Q7">{deleteConfirmError}</p> : null}
            </PortalModal>

            <PortalModal
                open={viewComposerOpen}
                title={text.modal.createNewView}
                closeLabel={text.modal.closeCreateView}
                onClose={() => setViewComposerOpen(false)}
                footer={(
                    <>
                        <Button type="button" kind="secondary" size="xsmall" onClick={() => setViewComposerOpen(false)}>
                            {text.actions.cancel}
                        </Button>
                        <Button type="button" kind="primary" size="xsmall" onClick={saveCurrentView} disabled={!viewDraftName.trim()}>
                            {text.modal.createView}
                        </Button>
                    </>
                )}
            >
                <label className="portalProductsViewDialogField__W4m9P3">
                    <span>{text.modal.name}</span>
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
                        placeholder={text.modal.viewNamePlaceholder}
                        maxLength={48}
                    />
                </label>
            </PortalModal>

            <PortalModal
                open={renameViewId !== null}
                title={text.viewMenu.renameTitle}
                closeLabel={text.actions.cancel}
                onClose={closeRenameView}
                footer={(
                    <>
                        <Button type="button" kind="secondary" size="xsmall" onClick={closeRenameView}>
                            {text.actions.cancel}
                        </Button>
                        <Button type="button" kind="primary" size="xsmall" onClick={saveRenameView} disabled={!renameViewDraftName.trim()}>
                            {text.viewMenu.renameSave}
                        </Button>
                    </>
                )}
            >
                <label className="portalProductsViewDialogField__W4m9P3">
                    <span>{text.viewMenu.renameLabel}</span>
                    <input
                        ref={renameViewInputRef}
                        className="form__input__Z3n7q0"
                        value={renameViewDraftName}
                        onChange={(event) => setRenameViewDraftName(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key !== "Enter") return;
                            event.preventDefault();
                            saveRenameView();
                        }}
                        placeholder={text.viewMenu.renamePlaceholder}
                        maxLength={48}
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
