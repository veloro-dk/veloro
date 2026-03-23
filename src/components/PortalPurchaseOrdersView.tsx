"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from "react";
import { ArrowUpDown, ChevronDown, Filter, Plus, Search } from "lucide-react";
import { Button } from "@/components/Button";
import { PortalModal } from "@/components/PortalModal";
import { usePortalNavigation } from "@/components/PortalNavigationContext";
import { PortalPageTitle } from "@/components/PortalPageTitle";
import { notifyPortalAction } from "@/components/portalActionNotifications";
import { fetchCatalogStateFromApi, getCachedCatalogStateSnapshot, saveCatalogStateToApi } from "@/lib/catalogStateClient";
import type { CatalogProduct } from "@/lib/productCatalog";
import type { PurchaseOrder, PurchaseOrderStatus } from "@/lib/purchaseOrders";
import { loadStoredSortKey, saveStoredSortKey } from "@/lib/tableSortStorage";

type StoreSummary = {
    id: string;
    name: string;
};

type PortalPurchaseOrdersViewProps = {
    stores: StoreSummary[];
    activeStoreId: string;
};

type SortKey =
    | "updated-desc"
    | "updated-asc"
    | "number-asc"
    | "number-desc"
    | "supplier-asc"
    | "supplier-desc"
    | "total-desc"
    | "total-asc"
    | "purchase-date-desc"
    | "purchase-date-asc"
    | "status-asc";

const PURCHASE_ORDER_SORT_KEYS: SortKey[] = [
    "updated-desc",
    "updated-asc",
    "number-asc",
    "number-desc",
    "supplier-asc",
    "supplier-desc",
    "total-desc",
    "total-asc",
    "purchase-date-desc",
    "purchase-date-asc",
    "status-asc",
];

type PurchaseOrderFilters = {
    query: string;
    status: "ALL" | PurchaseOrderStatus;
};

type PurchaseOrderView = {
    id: string;
    label: string;
    builtIn: boolean;
    builtInId?: "all" | "draft" | "ordered" | "received" | "partial";
    filters: PurchaseOrderFilters;
};

const SORT_OPTIONS: Record<SortKey, string> = {
    "updated-desc": "Newest first",
    "updated-asc": "Oldest first",
    "number-asc": "PO number (A-Z)",
    "number-desc": "PO number (Z-A)",
    "supplier-asc": "Supplier (A-Z)",
    "supplier-desc": "Supplier (Z-A)",
    "total-desc": "Total high to low",
    "total-asc": "Total low to high",
    "purchase-date-desc": "Purchase date (newest)",
    "purchase-date-asc": "Purchase date (oldest)",
    "status-asc": "Status",
};

const STATUS_OPTIONS: Array<PurchaseOrderFilters["status"]> = ["ALL", "DRAFT", "ORDERED", "RECEIVED", "PARTIAL", "CANCELLED"];

const STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
    DRAFT: "Draft",
    ORDERED: "Ordered",
    PARTIAL: "Partial",
    RECEIVED: "Received",
    CANCELLED: "Cancelled",
};

const DEFAULT_FILTERS: PurchaseOrderFilters = {
    query: "",
    status: "ALL",
};

const BUILT_IN_VIEWS: PurchaseOrderView[] = [
    { id: "all", builtInId: "all", label: "all", builtIn: true, filters: { ...DEFAULT_FILTERS } },
    { id: "draft", builtInId: "draft", label: "draft", builtIn: true, filters: { ...DEFAULT_FILTERS, status: "DRAFT" } },
    { id: "ordered", builtInId: "ordered", label: "ordered", builtIn: true, filters: { ...DEFAULT_FILTERS, status: "ORDERED" } },
    { id: "received", builtInId: "received", label: "received", builtIn: true, filters: { ...DEFAULT_FILTERS, status: "RECEIVED" } },
    { id: "partial", builtInId: "partial", label: "partial", builtIn: true, filters: { ...DEFAULT_FILTERS, status: "PARTIAL" } },
];

const BUILT_IN_VIEW_IDS = new Set(BUILT_IN_VIEWS.map((view) => view.id));
const PURCHASE_ORDERS_CUSTOM_VIEWS_STORAGE_KEY = "veloro_purchase_orders_custom_views_v1";
const PURCHASE_ORDERS_SORT_STORAGE_KEY = "veloro_purchase_orders_sort_v1";

type PurchaseOrderRow = {
    id: string;
    poNumber: string;
    supplierName: string;
    destinationName: string;
    status: PurchaseOrderStatus;
    receivedText: string;
    total: number;
    totalCurrency: string;
    purchaseDate: string;
    updatedAt: string;
    searchText: string;
};

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function cloneFilters(filters: PurchaseOrderFilters): PurchaseOrderFilters {
    return {
        query: filters.query,
        status: filters.status,
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function parseFilters(value: unknown): PurchaseOrderFilters {
    if (!isRecord(value)) return { ...DEFAULT_FILTERS };
    const status = STATUS_OPTIONS.includes(value.status as PurchaseOrderFilters["status"])
        ? value.status as PurchaseOrderFilters["status"]
        : "ALL";
    return {
        query: typeof value.query === "string" ? value.query : "",
        status,
    };
}

function parseStoredView(value: unknown): PurchaseOrderView | null {
    if (!isRecord(value)) return null;
    if (value.builtIn === true) return null;

    const id = typeof value.id === "string" ? value.id.trim() : "";
    const label = typeof value.label === "string" ? value.label.trim() : "";
    if (!id || !label || BUILT_IN_VIEW_IDS.has(id)) return null;

    return {
        id,
        label,
        builtIn: false,
        filters: parseFilters(value.filters),
    };
}

function loadCustomViewsFromStorage() {
    if (typeof window === "undefined") return [] as PurchaseOrderView[];

    try {
        const raw = window.localStorage.getItem(PURCHASE_ORDERS_CUSTOM_VIEWS_STORAGE_KEY);
        if (!raw) return [] as PurchaseOrderView[];
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [] as PurchaseOrderView[];
        const seen = new Set<string>();
        const views: PurchaseOrderView[] = [];
        parsed.forEach((entry) => {
            const normalized = parseStoredView(entry);
            if (!normalized || seen.has(normalized.id)) return;
            seen.add(normalized.id);
            views.push(normalized);
        });
        return views;
    } catch {
        return [] as PurchaseOrderView[];
    }
}

function createCustomViewId() {
    return `view_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getViewLabel(view: PurchaseOrderView) {
    if (!view.builtIn || !view.builtInId) return view.label;
    return view.label.charAt(0).toUpperCase() + view.label.slice(1);
}

function formatDate(value: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toISOString().slice(0, 10);
}

function getOrderTotal(order: PurchaseOrder) {
    const subtotal = order.lines.reduce((sum, line) => sum + (line.quantity * line.unitCost), 0);
    const taxTotal = order.lines.reduce((sum, line) => sum + ((line.quantity * line.unitCost) * (line.taxPercent / 100)), 0);
    const adjustmentTotal = order.adjustments.reduce((sum, adjustment) => sum + adjustment.amount, 0);
    return subtotal + taxTotal + adjustmentTotal;
}

function formatMoney(amount: number, currency: string) {
    try {
        return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
    } catch {
        return `${amount.toFixed(2)} ${currency}`;
    }
}

function buildRows(
    orders: PurchaseOrder[],
    stores: StoreSummary[],
    products: CatalogProduct[]
): PurchaseOrderRow[] {
    const storeNameById = new Map(stores.map((store) => [store.id, store.name]));
    const productNameById = new Map(products.map((product) => [product.id, product.name]));

    return orders.map((order) => {
        const destinationName = (storeNameById.get(order.destinationStoreId) ?? order.destinationStoreId) || "-";
        const receivedText = `${order.receivedPackages}/${order.expectedPackages}`;
        const total = getOrderTotal(order);
        const searchText = [
            order.poNumber,
            order.supplierName,
            destinationName,
            STATUS_LABELS[order.status],
            order.trackingNumber,
            ...order.lines.map((line) => productNameById.get(line.productId) ?? line.sku ?? line.productId),
        ].join(" ").toLowerCase();

        return {
            id: order.id,
            poNumber: order.poNumber,
            supplierName: order.supplierName || "-",
            destinationName,
            status: order.status,
            receivedText,
            total,
            totalCurrency: order.supplierCurrency,
            purchaseDate: order.purchaseDate,
            updatedAt: order.updatedAt,
            searchText,
        };
    });
}

export function PortalPurchaseOrdersView({ stores, activeStoreId }: PortalPurchaseOrdersViewProps) {
    const { navigateTo } = usePortalNavigation();
    const cached = getCachedCatalogStateSnapshot();
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => cached?.purchaseOrders ?? []);
    const [products, setProducts] = useState<CatalogProduct[]>(() => cached?.products ?? []);

    const [views, setViews] = useState<PurchaseOrderView[]>(BUILT_IN_VIEWS);
    const [activeViewId, setActiveViewId] = useState(BUILT_IN_VIEWS[0].id);
    const [workingFilters, setWorkingFilters] = useState<PurchaseOrderFilters>(cloneFilters(BUILT_IN_VIEWS[0].filters));
    const [searchMode, setSearchMode] = useState(false);
    const [viewComposerOpen, setViewComposerOpen] = useState(false);
    const [viewDraftName, setViewDraftName] = useState("");
    const [hasHydratedViews, setHasHydratedViews] = useState(false);
    const [catalogLoaded, setCatalogLoaded] = useState(Boolean(cached));

    const [sortBy, setSortBy] = useState<SortKey>(() => (
        loadStoredSortKey(PURCHASE_ORDERS_SORT_STORAGE_KEY, PURCHASE_ORDER_SORT_KEYS, "updated-desc")
    ));
    const [sortMenuOpen, setSortMenuOpen] = useState(false);
    const [statusFilterMenuOpen, setStatusFilterMenuOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [purchaseOrdersTableScrolledX, setPurchaseOrdersTableScrolledX] = useState(false);

    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteConfirmIds, setDeleteConfirmIds] = useState<string[]>([]);
    const [deleteConfirmError, setDeleteConfirmError] = useState<string | null>(null);
    const [deleteConfirmSubmitting, setDeleteConfirmSubmitting] = useState(false);

    const sortMenuRef = useRef<HTMLDivElement | null>(null);
    const statusFilterMenuRef = useRef<HTMLDivElement | null>(null);
    const selectAllRef = useRef<HTMLInputElement | null>(null);
    const purchaseOrdersTableScrollRef = useRef<HTMLDivElement | null>(null);
    const searchQueryInputRef = useRef<HTMLInputElement | null>(null);
    const viewDraftInputRef = useRef<HTMLInputElement | null>(null);

    const activeView = useMemo(
        () => views.find((view) => view.id === activeViewId) ?? views[0],
        [views, activeViewId]
    );

    const rows = useMemo(
        () => buildRows(purchaseOrders, stores, products),
        [purchaseOrders, stores, products]
    );

    useEffect(() => {
        let cancelled = false;
        let gateTimeoutId: number | null = null;

        const hydrate = async () => {
            gateTimeoutId = window.setTimeout(() => {
                if (cancelled) return;
                setCatalogLoaded(true);
            }, 8000);
            try {
                const state = await fetchCatalogStateFromApi();
                if (cancelled) return;
                setPurchaseOrders(state.purchaseOrders ?? []);
                setProducts(state.products ?? []);
            } catch {
                if (cancelled) return;
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
            if (gateTimeoutId !== null) {
                window.clearTimeout(gateTimeoutId);
            }
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        const customViews = loadCustomViewsFromStorage();
        queueMicrotask(() => {
            if (cancelled) return;
            setViews([...BUILT_IN_VIEWS, ...customViews]);
            setHasHydratedViews(true);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!hasHydratedViews || typeof window === "undefined") return;
        const customViews = views
            .filter((view) => !view.builtIn)
            .map((view) => ({
                id: view.id,
                label: view.label,
                filters: cloneFilters(view.filters),
            }));
        window.localStorage.setItem(PURCHASE_ORDERS_CUSTOM_VIEWS_STORAGE_KEY, JSON.stringify(customViews));
    }, [views, hasHydratedViews]);

    useEffect(() => {
        saveStoredSortKey(PURCHASE_ORDERS_SORT_STORAGE_KEY, sortBy);
    }, [sortBy]);

    useEffect(() => {
        if (!searchMode) return;
        searchQueryInputRef.current?.focus();
    }, [searchMode]);

    useEffect(() => {
        if (!viewComposerOpen) return;
        viewDraftInputRef.current?.focus();
    }, [viewComposerOpen]);

    useEffect(() => {
        const onPointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (sortMenuOpen && sortMenuRef.current && !sortMenuRef.current.contains(target)) {
                setSortMenuOpen(false);
            }
            if (statusFilterMenuOpen && statusFilterMenuRef.current && !statusFilterMenuRef.current.contains(target)) {
                setStatusFilterMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, [sortMenuOpen, statusFilterMenuOpen]);

    const visibleRows = useMemo(() => {
        const query = workingFilters.query.trim().toLowerCase();
        const filtered = rows.filter((row) => {
            if (workingFilters.status !== "ALL" && row.status !== workingFilters.status) return false;
            if (!query) return true;
            return row.searchText.includes(query);
        });

        return filtered.sort((left, right) => {
            switch (sortBy) {
                case "updated-desc":
                    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
                case "updated-asc":
                    return new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime();
                case "number-asc":
                    return left.poNumber.localeCompare(right.poNumber);
                case "number-desc":
                    return right.poNumber.localeCompare(left.poNumber);
                case "supplier-asc":
                    return left.supplierName.localeCompare(right.supplierName);
                case "supplier-desc":
                    return right.supplierName.localeCompare(left.supplierName);
                case "total-desc":
                    return right.total - left.total;
                case "total-asc":
                    return left.total - right.total;
                case "purchase-date-desc":
                    return new Date(right.purchaseDate).getTime() - new Date(left.purchaseDate).getTime();
                case "purchase-date-asc":
                    return new Date(left.purchaseDate).getTime() - new Date(right.purchaseDate).getTime();
                case "status-asc":
                    return STATUS_LABELS[left.status].localeCompare(STATUS_LABELS[right.status]);
                default:
                    return 0;
            }
        });
    }, [rows, sortBy, workingFilters]);

    const visibleIds = useMemo(() => visibleRows.map((row) => row.id), [visibleRows]);
    const selectedVisibleCount = useMemo(
        () => visibleIds.filter((id) => selectedIds.has(id)).length,
        [visibleIds, selectedIds]
    );
    const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
    const hasSelection = selectedIds.size > 0;
    const hasActiveFilters = useMemo(
        () => workingFilters.query.trim().length > 0 || workingFilters.status !== activeView.filters.status,
        [activeView.filters.status, workingFilters]
    );
    const statusFilterLabel = workingFilters.status === "ALL" ? "Status" : `Status: ${STATUS_LABELS[workingFilters.status]}`;
    const sortLabel = SORT_OPTIONS[sortBy];
    const hasAnyProducts = products.length > 0;
    const showPurchaseOrdersOnboarding = purchaseOrders.length === 0;
    const tableColumnSpan = 8;

    const handleCreatePurchaseOrder = () => {
        if (!hasAnyProducts) {
            notifyPortalAction({
                tone: "warning",
                message: "Create a product before creating a purchase order.",
            });
            return;
        }
        void navigateTo("/products/purchase-orders/new");
    };

    useEffect(() => {
        if (!selectAllRef.current) return;
        selectAllRef.current.indeterminate = selectedVisibleCount > 0 && !allVisibleSelected;
    }, [selectedVisibleCount, allVisibleSelected]);

    const handlePurchaseOrdersTableScroll = useCallback(() => {
        const tableScroll = purchaseOrdersTableScrollRef.current;
        if (!tableScroll) return;
        setPurchaseOrdersTableScrolledX(tableScroll.scrollLeft > 0);
    }, []);

    const openSearchAndFilter = () => {
        setSearchMode(true);
        setSortMenuOpen(false);
        setStatusFilterMenuOpen(false);
    };

    const resetToActiveView = () => {
        const next = cloneFilters(activeView.filters);
        setWorkingFilters(next);
        setSearchMode(false);
        setSortMenuOpen(false);
        setStatusFilterMenuOpen(false);
        setSelectedIds(new Set());
    };

    const openViewComposer = () => {
        setViewDraftName("");
        setViewComposerOpen(true);
    };

    const saveCurrentView = () => {
        const label = viewDraftName.trim();
        if (!label) return;
        const id = createCustomViewId();
        const nextView: PurchaseOrderView = {
            id,
            label,
            builtIn: false,
            filters: cloneFilters(workingFilters),
        };
        setViews((current) => [...current, nextView]);
        setActiveViewId(id);
        setSearchMode(false);
        setViewComposerOpen(false);
        setViewDraftName("");
    };

    const handleViewSelect = (viewId: string) => {
        setActiveViewId(viewId);
        const targetView = views.find((view) => view.id === viewId);
        if (!targetView) return;
        setWorkingFilters(cloneFilters(targetView.filters));
        setSearchMode(false);
        setSortMenuOpen(false);
        setStatusFilterMenuOpen(false);
        setSelectedIds(new Set());
    };

    const updateFilter = <K extends keyof PurchaseOrderFilters>(key: K, value: PurchaseOrderFilters[K]) => {
        setWorkingFilters((current) => ({
            ...current,
            [key]: value,
        }));
        setSelectedIds(new Set());
    };

    const toggleAllVisible = (checked: boolean) => {
        setSelectedIds((current) => {
            const next = new Set(current);
            if (checked) visibleIds.forEach((id) => next.add(id));
            else visibleIds.forEach((id) => next.delete(id));
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

    const openOrder = (orderId: string) => {
        void navigateTo(`/products/purchase-orders/${encodeURIComponent(orderId)}`);
    };

    const onRowClick = (event: ReactMouseEvent<HTMLTableRowElement>, orderId: string) => {
        const target = event.target as HTMLElement;
        if (target.closest("input,button,a,select,textarea,label")) return;
        openOrder(orderId);
    };

    const onRowKeyDown = (event: ReactKeyboardEvent<HTMLTableRowElement>, orderId: string) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        openOrder(orderId);
    };

    const openDeleteConfirm = (ids: string[]) => {
        if (ids.length === 0) return;
        setDeleteConfirmIds(ids);
        setDeleteConfirmError(null);
        setDeleteConfirmOpen(true);
    };

    const closeDeleteConfirm = () => {
        if (deleteConfirmSubmitting) return;
        setDeleteConfirmOpen(false);
        setDeleteConfirmIds([]);
        setDeleteConfirmError(null);
    };

    const confirmDeleteOrders = async () => {
        if (deleteConfirmIds.length === 0 || deleteConfirmSubmitting) return;
        setDeleteConfirmSubmitting(true);
        setDeleteConfirmError(null);

        try {
            const state = await fetchCatalogStateFromApi();
            const deleteSet = new Set(deleteConfirmIds);
            const ordersToDelete = state.purchaseOrders.filter((order) => deleteSet.has(order.id));
            const lineIds = new Set(ordersToDelete.flatMap((order) => order.lines.map((line) => line.id)));
            const nextPurchaseOrders = state.purchaseOrders.filter((order) => !deleteSet.has(order.id));
            const nextInventorySales = state.inventorySales.filter((sale) => !lineIds.has(sale.batchId));

            const nextState = await saveCatalogStateToApi({
                purchaseOrders: nextPurchaseOrders,
                inventorySales: nextInventorySales,
            });

            setPurchaseOrders(nextState.purchaseOrders);
            setProducts(nextState.products);
            setSelectedIds((current) => {
                const next = new Set(current);
                deleteConfirmIds.forEach((id) => next.delete(id));
                return next;
            });
            setDeleteConfirmOpen(false);
            setDeleteConfirmIds([]);
        } catch {
            setDeleteConfirmError("Unable to delete selected purchase orders.");
        } finally {
            setDeleteConfirmSubmitting(false);
        }
    };

    if (!catalogLoaded) {
        return null;
    }

    return (
        <section className="portalPurchaseOrdersPage__V2m8Q4">
            <PortalPageTitle
                page="purchaseOrders"
                actions={catalogLoaded ? (
                    <>
                        {purchaseOrders.length > 0 ? (
                            <Button
                                type="button"
                                kind="primary"
                                size="xsmall"
                                onClick={handleCreatePurchaseOrder}
                            >
                                Create purchase order
                            </Button>
                        ) : null}
                    </>
                ) : null}
            />

            {showPurchaseOrdersOnboarding ? (
                <section className="portalProductsTableShell__G4m7N1 ui-surface-card">
                    <div className="portalProductsEmptyCard__X5m2Q8 portalProductsEmptyCardCentered__K2m8Q4">
                        <div className="portalProductsOnboardingArt__A5m2Q6" aria-hidden="true">
                            <span className="portalProductsOnboardingArtCard__W3m2Q8 portalProductsOnboardingArtCardPrimary__Y2m8Q5" />
                            <span className="portalProductsOnboardingArtCard__W3m2Q8 portalProductsOnboardingArtCardSecondary__F5m2Q4" />
                            <span className="portalProductsOnboardingArtCard__W3m2Q8 portalProductsOnboardingArtCardTertiary__B2m8Q1" />
                        </div>
                        <h3 className="typography__heading6__H5j9s0 portalProductsEmptyHeading__D2m8Q4">Manage your purchase orders</h3>
                        <p className="typography__small__Q9j2p0 portalProductsEmptyBody__J3m2Q7">Track and receive inventory ordered from suppliers in one place.</p>
                        <Button type="button" kind="primary" size="xsmall" onClick={handleCreatePurchaseOrder}>
                            Create purchase order
                        </Button>
                    </div>
                </section>
            ) : (
                <section className="portalProductsTableShell__G4m7N1 ui-surface-card">
                    <div className="portalProductsControlsTableWrap__Q4m2R7">
                        <table className="portalProductsTable__E8n4Q7 portalProductsControlsTable__N2m8Q5">
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
                                                            placeholder="Search purchase orders, suppliers, products"
                                                        />
                                                    </label>

                                                    <div className="portalProductsTableActions__P5d8K3">
                                                        <Button type="button" kind="toggle" size="xsmall" className="portalProductsCancelButton__T2m8V1" onClick={resetToActiveView}>
                                                            Cancel
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
                                                                aria-label={`Sort: ${sortLabel}`}
                                                                onClick={() => {
                                                                    setSortMenuOpen((current) => !current);
                                                                    setStatusFilterMenuOpen(false);
                                                                }}
                                                            >
                                                                <ArrowUpDown aria-hidden="true" />
                                                            </Button>

                                                            {sortMenuOpen ? (
                                                                <div role="menu" className="portalProductsMenuPanel__A8d2P7">
                                                                    {(Object.keys(SORT_OPTIONS) as SortKey[]).map((sortOption) => (
                                                                        <button
                                                                            key={sortOption}
                                                                            type="button"
                                                                            role="menuitemradio"
                                                                            aria-checked={sortBy === sortOption}
                                                                            className={cn("portalProductsMenuItem__E3n8R6", sortBy === sortOption && "portalProductsMenuItemActive__M6p3D9")}
                                                                            onClick={() => {
                                                                                setSortBy(sortOption);
                                                                                setSortMenuOpen(false);
                                                                            }}
                                                                        >
                                                                            {SORT_OPTIONS[sortOption]}
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
                                                                (workingFilters.status !== "ALL" || statusFilterMenuOpen) && "portalProductsDashedFilterButtonActive__W2n9K5"
                                                            )}
                                                            aria-haspopup="menu"
                                                            aria-expanded={statusFilterMenuOpen}
                                                            onClick={() => {
                                                                setStatusFilterMenuOpen((current) => !current);
                                                                setSortMenuOpen(false);
                                                            }}
                                                        >
                                                            {statusFilterLabel}
                                                        </button>

                                                        {statusFilterMenuOpen ? (
                                                            <div role="menu" className="portalProductsMenuPanel__A8d2P7 portalProductsMenuPanelAlignLeft__V1m8Q2">
                                                                {STATUS_OPTIONS.map((status) => (
                                                                    <button
                                                                        key={status}
                                                                        type="button"
                                                                        role="menuitemradio"
                                                                        aria-checked={workingFilters.status === status}
                                                                        className={cn(
                                                                            "portalProductsMenuItem__E3n8R6",
                                                                            workingFilters.status === status && "portalProductsMenuItemActive__M6p3D9"
                                                                        )}
                                                                        onClick={() => {
                                                                            updateFilter("status", status);
                                                                            setStatusFilterMenuOpen(false);
                                                                        }}
                                                                    >
                                                                        {status === "ALL" ? "All statuses" : STATUS_LABELS[status]}
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
                                                <div className="portalProductsViewsRow__R6m1V2" role="tablist" aria-label="Purchase order views">
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
                                                            aria-label={`Sort: ${sortLabel}`}
                                                            onClick={() => {
                                                                setSortMenuOpen((current) => !current);
                                                                setStatusFilterMenuOpen(false);
                                                            }}
                                                        >
                                                            <ArrowUpDown aria-hidden="true" />
                                                        </Button>

                                                        {sortMenuOpen ? (
                                                            <div role="menu" className="portalProductsMenuPanel__A8d2P7">
                                                                {(Object.keys(SORT_OPTIONS) as SortKey[]).map((sortOption) => (
                                                                    <button
                                                                        key={sortOption}
                                                                        type="button"
                                                                        role="menuitemradio"
                                                                        aria-checked={sortBy === sortOption}
                                                                        className={cn("portalProductsMenuItem__E3n8R6", sortBy === sortOption && "portalProductsMenuItemActive__M6p3D9")}
                                                                        onClick={() => {
                                                                            setSortBy(sortOption);
                                                                            setSortMenuOpen(false);
                                                                        }}
                                                                    >
                                                                        {SORT_OPTIONS[sortOption]}
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
                        ref={purchaseOrdersTableScrollRef}
                        onScroll={handlePurchaseOrdersTableScroll}
                        className={cn(
                            "portalProductsTableScroll__H7q2M4 portalProductsDataTableScroll__W5m2Q9",
                            purchaseOrdersTableScrolledX && "portalProductsDataTableScrolled__F2m8Q6"
                        )}
                    >
                        <table className="portalProductsTable__E8n4Q7 portalProductsDataTable__B2m8Q4">
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
                                                    aria-label="Select all purchase orders"
                                                />
                                            </th>
                                            <th colSpan={tableColumnSpan - 1} className="portalProductsBulkHeader__L1p7V4">
                                                <div className="portalProductsBulkActions__S6m2N8">
                                                    <div className="portalProductsBulkSummary__K4m9P2">
                                                        <span>{selectedIds.size} selected</span>
                                                    </div>
                                                    <div className="portalProductsBulkButtons__W5m2R8">
                                                        <Button
                                                            type="button"
                                                            kind="basic"
                                                            size="xsmall"
                                                            onClick={() => openDeleteConfirm(Array.from(selectedIds))}
                                                        >
                                                            Delete purchase orders
                                                        </Button>
                                                    </div>
                                                </div>
                                            </th>
                                        </tr>
                                        <tr className="portalProductsColumnSizerRow__P8m2Q4" aria-hidden="true">
                                            <th className="portalProductsCellCheckbox__C5m1R9">
                                                <span />
                                            </th>
                                            <th data-sticky-primary="true">Purchase order</th>
                                            <th>Supplier</th>
                                            <th>Destination</th>
                                            <th>Status</th>
                                            <th>Received</th>
                                            <th>Total</th>
                                            <th>Purchase date</th>
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
                                                aria-label="Select all purchase orders"
                                            />
                                        </th>
                                        <th data-sticky-primary="true">Purchase order</th>
                                        <th>Supplier</th>
                                        <th>Destination</th>
                                        <th>Status</th>
                                        <th>Received</th>
                                        <th>Total</th>
                                        <th>Purchase date</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody>
                                {visibleRows.length === 0 ? (
                                    <tr className="portalProductsEmptyRow__S2m8Q4">
                                        <td colSpan={tableColumnSpan} className="portalProductsEmpty__D3m7K2">
                                            Table is empty.
                                        </td>
                                    </tr>
                                ) : (
                                    visibleRows.map((row) => {
                                        const checked = selectedIds.has(row.id);
                                        return (
                                            <tr
                                                key={row.id}
                                                className={cn("portalProductsRowInteractive__T4m8Q1", checked && "portalProductsRowSelected__Q9m2N4")}
                                                onClick={(event) => onRowClick(event, row.id)}
                                                onKeyDown={(event) => onRowKeyDown(event, row.id)}
                                                tabIndex={0}
                                                role="button"
                                            >
                                                <td className="portalProductsCellCheckbox__C5m1R9">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={(event) => toggleRow(row.id, event.target.checked)}
                                                        aria-label={`Select ${row.poNumber}`}
                                                    />
                                                </td>
                                                <td data-sticky-primary="true">
                                                    <span className="portalProductsName__V6p3M1">{row.poNumber}</span>
                                                </td>
                                                <td>{row.supplierName}</td>
                                                <td>{row.destinationName}</td>
                                                <td>{STATUS_LABELS[row.status]}</td>
                                                <td>{row.receivedText}</td>
                                                <td>{formatMoney(row.total, row.totalCurrency)}</td>
                                                <td>{formatDate(row.purchaseDate)}</td>
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
                            Cancel
                        </Button>
                        <Button type="button" kind="primary" size="xsmall" onClick={saveCurrentView} disabled={!viewDraftName.trim()}>
                            Create view
                        </Button>
                    </>
                )}
            >
                <label className="portalVariantsField__J8m2Q1">
                    <span>Name</span>
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

            <PortalModal
                open={deleteConfirmOpen}
                title="Delete purchase orders"
                closeLabel="Close delete purchase orders pop-up"
                onClose={closeDeleteConfirm}
                footer={(
                    <>
                        <Button type="button" kind="secondary" size="xsmall" onClick={closeDeleteConfirm} disabled={deleteConfirmSubmitting}>
                            Cancel
                        </Button>
                        <Button type="button" kind="danger" size="xsmall" onClick={() => void confirmDeleteOrders()} disabled={deleteConfirmSubmitting}>
                            {deleteConfirmSubmitting ? "Deleting..." : "Delete"}
                        </Button>
                    </>
                )}
            >
                <p className="portalProductsDeleteConfirmText__A8m2Q6">This also removes linked inventory history.</p>
                {deleteConfirmError ? <p className="portalVariantsError__A2m8Q4">{deleteConfirmError}</p> : null}
            </PortalModal>

            <input type="hidden" value={activeStoreId} readOnly />
        </section>
    );
}
