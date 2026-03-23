"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from "react";
import { ArrowUpDown, Filter, Plus, Search } from "lucide-react";
import { Button } from "@/components/Button";
import { PortalModal } from "@/components/PortalModal";
import { PortalPageTitle } from "@/components/PortalPageTitle";
import { notifyPortalAction } from "@/components/portalActionNotifications";
import {
    createUniqueVariantId,
    getDefaultProductCategoryDefinitions,
    getDefaultProducts,
    getDefaultVariantDefinitions,
    type CatalogProduct,
    type ProductCategoryDefinition,
    type VariantDefinition,
    type VariantInputType,
} from "@/lib/productCatalog";
import {
    deleteCatalogEntriesFromApi,
    fetchCatalogStateFromApi,
    getCachedCatalogStateSnapshot,
    saveCatalogStateToApi,
} from "@/lib/catalogStateClient";
import { appendMultiValueInput, normalizeMultiValueList, removeMultiValue } from "@/lib/multiValueInput";
import { loadStoredSortKey, saveStoredSortKey } from "@/lib/tableSortStorage";
import { countVariantOptionUsage } from "@/lib/variantOptionUsage";

type SortKey =
    | "name-asc"
    | "name-desc"
    | "inventory-desc"
    | "inventory-asc"
    | "category-asc"
    | "category-desc"
    | "input-type-asc"
    | "input-type-desc"
    | "values-desc"
    | "values-asc"
    | "filters-used-first"
    | "filters-unused-first";

type VariantFilters = {
    query: string;
    condition: "ALL" | VariantInputType;
};

type VariantView = {
    id: string;
    label: string;
    builtIn: boolean;
    builtInId?: "all";
    filters: VariantFilters;
};

type VariantFormErrorKey =
    | "nameRequired"
    | "nameConflict"
    | "selectValuesRequired";

const INPUT_TYPE_OPTIONS: Array<{ value: VariantInputType; label: string }> = [
    { value: "select", label: "Select" },
    { value: "input", label: "Input" },
    { value: "textarea", label: "Textarea" },
    { value: "date", label: "Date" },
];

const SORT_OPTIONS: Record<SortKey, string> = {
    "name-asc": "Name (A-Z)",
    "name-desc": "Name (Z-A)",
    "inventory-desc": "Inventory high to low",
    "inventory-asc": "Inventory low to high",
    "category-asc": "Category (A-Z)",
    "category-desc": "Category (Z-A)",
    "input-type-asc": "Input type (A-Z)",
    "input-type-desc": "Input type (Z-A)",
    "values-desc": "Values high to low",
    "values-asc": "Values low to high",
    "filters-used-first": "Used in filters first",
    "filters-unused-first": "Not used in filters first",
};
const VARIANT_SORT_KEYS = Object.keys(SORT_OPTIONS) as SortKey[];

const DEFAULT_FILTERS: VariantFilters = {
    query: "",
    condition: "ALL",
};

const BUILT_IN_VIEWS: VariantView[] = [
    { id: "all", builtInId: "all", label: "all", builtIn: true, filters: { ...DEFAULT_FILTERS } },
];

const BUILT_IN_VIEW_IDS = new Set(BUILT_IN_VIEWS.map((view) => view.id));
const VARIANT_CUSTOM_VIEWS_STORAGE_KEY = "veloro_variants_custom_views_v1";
const VARIANT_SORT_STORAGE_KEY = "veloro_variants_sort_v1";
const VARIANT_VALUES_PREVIEW_MAX_CHARS = 52;
const CATEGORY_PREVIEW_MAX_CHARS = 40;
const VARIANT_FORM_ERROR_MESSAGES: Record<VariantFormErrorKey, string> = {
    nameRequired: "Variant name is required.",
    nameConflict: "A variant with this name already exists.",
    selectValuesRequired: "Select variants need at least one value.",
};
const DUPLICATE_VALUE_MESSAGE = "Duplicate value is not allowed.";

function buildVariantOptionInUseMessage(value: string, usageCount: number) {
    return `"${value}" is tied to ${usageCount} product${usageCount === 1 ? "" : "s"}. Untie it before deleting.`;
}

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function truncatePreviewText(value: string, maxChars: number) {
    if (value.length <= maxChars) return value;
    return `${value.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`;
}

function cloneFilters(filters: VariantFilters): VariantFilters {
    return {
        query: filters.query,
        condition: filters.condition,
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function parseVariantFilters(value: unknown): VariantFilters {
    if (!isRecord(value)) return { ...DEFAULT_FILTERS };

    const rawCondition = value.condition;
    const condition = rawCondition === "ALL"
        || rawCondition === "select"
        || rawCondition === "input"
        || rawCondition === "textarea"
        || rawCondition === "date"
        ? rawCondition
        : "ALL";

    return {
        query: typeof value.query === "string" ? value.query : "",
        condition,
    };
}

function parseStoredVariantView(value: unknown): VariantView | null {
    if (!isRecord(value)) return null;
    if (value.builtIn === true) return null;

    const id = typeof value.id === "string" ? value.id.trim() : "";
    const label = typeof value.label === "string" ? value.label.trim() : "";
    if (!id || !label || BUILT_IN_VIEW_IDS.has(id)) return null;

    return {
        id,
        label,
        builtIn: false,
        filters: parseVariantFilters(value.filters),
    };
}

function loadVariantCustomViewsFromStorage() {
    if (typeof window === "undefined") return [] as VariantView[];

    try {
        const raw = window.localStorage.getItem(VARIANT_CUSTOM_VIEWS_STORAGE_KEY);
        if (!raw) return [] as VariantView[];

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [] as VariantView[];

        const seen = new Set<string>();
        const customViews: VariantView[] = [];
        parsed.forEach((entry) => {
            const normalized = parseStoredVariantView(entry);
            if (!normalized || seen.has(normalized.id)) return;
            seen.add(normalized.id);
            customViews.push(normalized);
        });
        return customViews;
    } catch {
        return [] as VariantView[];
    }
}

function createCustomViewId() {
    return `view_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getViewLabel(view: VariantView) {
    if (!view.builtIn || !view.builtInId) return view.label;
    return "All";
}

function getInputTypeLabel(value: VariantInputType) {
    return INPUT_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function PortalVariantsView() {
    const cachedCatalogState = getCachedCatalogStateSnapshot();
    const [variants, setVariants] = useState<VariantDefinition[]>(() => cachedCatalogState?.variantDefinitions ?? getDefaultVariantDefinitions());
    const [categories, setCategories] = useState<ProductCategoryDefinition[]>(() => cachedCatalogState?.categoryDefinitions ?? getDefaultProductCategoryDefinitions());
    const [products, setProducts] = useState<CatalogProduct[]>(() => cachedCatalogState?.products ?? getDefaultProducts());

    const [views, setViews] = useState<VariantView[]>(BUILT_IN_VIEWS);
    const [activeViewId, setActiveViewId] = useState<string>(BUILT_IN_VIEWS[0].id);
    const [workingFilters, setWorkingFilters] = useState<VariantFilters>(cloneFilters(BUILT_IN_VIEWS[0].filters));
    const [searchMode, setSearchMode] = useState(false);
    const [viewComposerOpen, setViewComposerOpen] = useState(false);
    const [viewDraftName, setViewDraftName] = useState("");
    const [hasHydratedViews, setHasHydratedViews] = useState(false);
    const [catalogLoaded, setCatalogLoaded] = useState(Boolean(cachedCatalogState));

    const [sortBy, setSortBy] = useState<SortKey>(() => (
        loadStoredSortKey(VARIANT_SORT_STORAGE_KEY, VARIANT_SORT_KEYS, "name-asc")
    ));
    const [sortMenuOpen, setSortMenuOpen] = useState(false);
    const [conditionFilterMenuOpen, setConditionFilterMenuOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [createOpen, setCreateOpen] = useState(false);
    const [createName, setCreateName] = useState("");
    const [createInputType, setCreateInputType] = useState<VariantInputType>("select");
    const [createValuesDraft, setCreateValuesDraft] = useState<string[]>([]);
    const [createValueInput, setCreateValueInput] = useState("");
    const [createError, setCreateError] = useState<VariantFormErrorKey | null>(null);

    const [editOpen, setEditOpen] = useState(false);
    const [editVariantId, setEditVariantId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editInputType, setEditInputType] = useState<VariantInputType>("select");
    const [editValuesDraft, setEditValuesDraft] = useState<string[]>([]);
    const [editValueInput, setEditValueInput] = useState("");
    const [editError, setEditError] = useState<VariantFormErrorKey | null>(null);

    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteConfirmIds, setDeleteConfirmIds] = useState<string[]>([]);
    const [deleteConfirmError, setDeleteConfirmError] = useState<string | null>(null);
    const [deleteConfirmSubmitting, setDeleteConfirmSubmitting] = useState(false);

    const sortMenuRef = useRef<HTMLDivElement | null>(null);
    const conditionFilterMenuRef = useRef<HTMLDivElement | null>(null);
    const selectAllRef = useRef<HTMLInputElement | null>(null);
    const searchQueryInputRef = useRef<HTMLInputElement | null>(null);
    const viewDraftInputRef = useRef<HTMLInputElement | null>(null);

    const activeView = useMemo(() => views.find((view) => view.id === activeViewId) ?? views[0], [views, activeViewId]);
    const conditionOptions = useMemo<Array<VariantFilters["condition"]>>(
        () => ["ALL", ...INPUT_TYPE_OPTIONS.map((option) => option.value)],
        []
    );

    useEffect(() => {
        let cancelled = false;
        let gateTimeoutId: number | null = null;

        const hydrate = async () => {
            const customViews = loadVariantCustomViewsFromStorage();
            gateTimeoutId = window.setTimeout(() => {
                if (cancelled) return;
                setHasHydratedViews(true);
                setCatalogLoaded(true);
            }, 8000);
            try {
                const state = await fetchCatalogStateFromApi();
                if (cancelled) return;
                setVariants(state.variantDefinitions);
                setCategories(state.categoryDefinitions);
                setProducts(state.products);
            } catch {
                if (cancelled) return;
                setVariants(getDefaultVariantDefinitions());
                setCategories(getDefaultProductCategoryDefinitions());
                setProducts(getDefaultProducts());
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
        function onPointerDown(event: MouseEvent) {
            const target = event.target as Node;
            if (sortMenuOpen && sortMenuRef.current && !sortMenuRef.current.contains(target)) {
                setSortMenuOpen(false);
            }
            if (conditionFilterMenuOpen && conditionFilterMenuRef.current && !conditionFilterMenuRef.current.contains(target)) {
                setConditionFilterMenuOpen(false);
            }
        }

        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, [sortMenuOpen, conditionFilterMenuOpen]);

    useEffect(() => {
        if (!hasHydratedViews || typeof window === "undefined") return;
        const customViews = views
            .filter((view) => !view.builtIn)
            .map((view) => ({
                id: view.id,
                label: view.label,
                filters: cloneFilters(view.filters),
            }));
        window.localStorage.setItem(VARIANT_CUSTOM_VIEWS_STORAGE_KEY, JSON.stringify(customViews));
    }, [views, hasHydratedViews]);

    useEffect(() => {
        saveStoredSortKey(VARIANT_SORT_STORAGE_KEY, sortBy);
    }, [sortBy]);

    useEffect(() => {
        if (!searchMode) return;
        searchQueryInputRef.current?.focus();
    }, [searchMode]);

    useEffect(() => {
        if (!viewComposerOpen) return;
        viewDraftInputRef.current?.focus();
    }, [viewComposerOpen]);

    const variantRows = useMemo(() => {
        const categoryTitlesByVariantId = new Map<string, string[]>();
        categories.forEach((category) => {
            category.variantRules.forEach((rule) => {
                const list = categoryTitlesByVariantId.get(rule.variantId) ?? [];
                list.push(category.title);
                categoryTitlesByVariantId.set(rule.variantId, list);
            });
        });

        const inventoryByVariantId = new Map<string, number>();
        products.forEach((product) => {
            Object.keys(product.variants).forEach((variantId) => {
                inventoryByVariantId.set(variantId, (inventoryByVariantId.get(variantId) ?? 0) + product.inventory);
            });
        });

        return variants.map((variant) => {
            const categoryTitles = categoryTitlesByVariantId.get(variant.id) ?? [];
            const categoryTooltip = categoryTitles.length > 0 ? categoryTitles.join(", ") : "Unassigned";
            const categoryText = truncatePreviewText(categoryTooltip, CATEGORY_PREVIEW_MAX_CHARS);
            const inventory = inventoryByVariantId.get(variant.id) ?? 0;
            const usedInFilters = categoryTitles.length > 0;
            const valuesText = variant.values.join(", ") || "No values";
            const valuesDisplay = variant.inputType === "select"
                ? truncatePreviewText(valuesText, VARIANT_VALUES_PREVIEW_MAX_CHARS)
                : "N/A";

            return {
                id: variant.id,
                label: variant.label,
                inputType: variant.inputType,
                inventory,
                categoryText,
                categoryTooltip,
                valuesText,
                valuesDisplay,
                valuesCount: variant.values.length,
                usedInFilters,
                usedInFiltersLabel: usedInFilters ? "Yes" : "No",
            };
        });
    }, [categories, products, variants]);

    const visibleVariantRows = useMemo(() => {
        const normalizedQuery = workingFilters.query.trim().toLowerCase();

        const filtered = variantRows.filter((row) => {
            if (workingFilters.condition !== "ALL" && row.inputType !== workingFilters.condition) return false;

            if (!normalizedQuery) return true;

            const searchable = [
                row.label,
                String(row.inventory),
                row.categoryTooltip,
                row.inputType,
                row.valuesText,
                row.usedInFiltersLabel,
            ]
                .join(" ")
                .toLowerCase();
            return searchable.includes(normalizedQuery);
        });

        return filtered.sort((left, right) => {
            switch (sortBy) {
                case "name-asc":
                    return left.label.localeCompare(right.label, undefined, { sensitivity: "base" });
                case "name-desc":
                    return right.label.localeCompare(left.label, undefined, { sensitivity: "base" });
                case "inventory-desc":
                    return right.inventory - left.inventory;
                case "inventory-asc":
                    return left.inventory - right.inventory;
                case "category-asc":
                    return left.categoryTooltip.localeCompare(right.categoryTooltip, undefined, { sensitivity: "base" });
                case "category-desc":
                    return right.categoryTooltip.localeCompare(left.categoryTooltip, undefined, { sensitivity: "base" });
                case "input-type-asc":
                    return left.inputType.localeCompare(right.inputType, undefined, { sensitivity: "base" });
                case "input-type-desc":
                    return right.inputType.localeCompare(left.inputType, undefined, { sensitivity: "base" });
                case "values-desc":
                    return right.valuesCount - left.valuesCount;
                case "values-asc":
                    return left.valuesCount - right.valuesCount;
                case "filters-used-first":
                    return Number(right.usedInFilters) - Number(left.usedInFilters);
                case "filters-unused-first":
                    return Number(left.usedInFilters) - Number(right.usedInFilters);
                default:
                    return 0;
            }
        });
    }, [sortBy, variantRows, workingFilters]);

    const visibleVariantIds = useMemo(() => visibleVariantRows.map((variant) => variant.id), [visibleVariantRows]);
    const selectedVisibleCount = useMemo(
        () => visibleVariantIds.filter((id) => selectedIds.has(id)).length,
        [selectedIds, visibleVariantIds]
    );
    const allVisibleSelected = visibleVariantIds.length > 0 && selectedVisibleCount === visibleVariantIds.length;
    const hasActiveFilters = useMemo(
        () => workingFilters.query.trim().length > 0 || workingFilters.condition !== "ALL",
        [workingFilters]
    );

    useEffect(() => {
        if (!selectAllRef.current) return;
        selectAllRef.current.indeterminate = selectedVisibleCount > 0 && !allVisibleSelected;
    }, [selectedVisibleCount, allVisibleSelected]);

    useEffect(() => {
        setSelectedIds((current) => {
            const validIds = new Set(variants.map((variant) => variant.id));
            let changed = false;
            const next = new Set<string>();
            current.forEach((id) => {
                if (!validIds.has(id)) {
                    changed = true;
                    return;
                }
                next.add(id);
            });
            return changed ? next : current;
        });
    }, [variants]);

    const resetMenus = () => {
        setSortMenuOpen(false);
        setConditionFilterMenuOpen(false);
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
        const nextView: VariantView = {
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

    const updateFilter = <K extends keyof VariantFilters>(key: K, value: VariantFilters[K]) => {
        setWorkingFilters((current) => ({
            ...current,
            [key]: value,
        }));
        setSelectedIds(new Set());
    };

    const toggleAllVisible = (checked: boolean) => {
        setSelectedIds((current) => {
            const next = new Set(current);
            if (checked) {
                visibleVariantIds.forEach((id) => next.add(id));
            } else {
                visibleVariantIds.forEach((id) => next.delete(id));
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

    const openEditModal = (variant: VariantDefinition) => {
        setEditVariantId(variant.id);
        setEditName(variant.label);
        setEditInputType(variant.inputType);
        setEditValuesDraft(normalizeMultiValueList(variant.values));
        setEditValueInput("");
        setEditError(null);
        setEditOpen(true);
    };

    const openEditVariantById = (variantId: string) => {
        const variant = variants.find((entry) => entry.id === variantId);
        if (!variant) return;
        openEditModal(variant);
    };

    const onRowClick = (event: ReactMouseEvent<HTMLTableRowElement>, variantId: string) => {
        const target = event.target as HTMLElement;
        if (target.closest("input,button,a,select,textarea,label")) return;
        openEditVariantById(variantId);
    };

    const onRowKeyDown = (event: ReactKeyboardEvent<HTMLTableRowElement>, variantId: string) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        openEditVariantById(variantId);
    };

    const addCreateValues = (rawValue: string) => {
        let hasDuplicate = false;
        setCreateValuesDraft((current) => {
            const { nextValues, duplicateValues } = appendMultiValueInput(current, rawValue);
            hasDuplicate = duplicateValues.length > 0;
            return nextValues;
        });
        if (hasDuplicate) {
            notifyPortalAction({ message: DUPLICATE_VALUE_MESSAGE, tone: "warning" });
        }
    };

    const removeCreateValue = (valueToRemove: string) => {
        setCreateValuesDraft((current) => removeMultiValue(current, valueToRemove));
    };

    const addEditValues = (rawValue: string) => {
        let hasDuplicate = false;
        setEditValuesDraft((current) => {
            const { nextValues, duplicateValues } = appendMultiValueInput(current, rawValue);
            hasDuplicate = duplicateValues.length > 0;
            return nextValues;
        });
        if (hasDuplicate) {
            notifyPortalAction({ message: DUPLICATE_VALUE_MESSAGE, tone: "warning" });
        }
    };

    const removeEditValue = (valueToRemove: string) => {
        if (editVariantId) {
            const usageCount = countVariantOptionUsage(products, editVariantId, valueToRemove);
            if (usageCount > 0) {
                notifyPortalAction({
                    message: buildVariantOptionInUseMessage(valueToRemove, usageCount),
                    tone: "warning",
                });
                return;
            }
        }
        setEditValuesDraft((current) => removeMultiValue(current, valueToRemove));
    };

    const resetCreateModal = () => {
        setCreateName("");
        setCreateInputType("select");
        setCreateValuesDraft([]);
        setCreateValueInput("");
        setCreateError(null);
    };

    const openCreateModal = () => {
        resetCreateModal();
        setCreateOpen(true);
    };

    const closeCreateModal = () => {
        setCreateOpen(false);
        resetCreateModal();
    };

    const createVariant = () => {
        const name = createName.trim();
        if (!name) {
            setCreateError("nameRequired");
            return;
        }

        const hasNameConflict = variants.some((variant) => variant.label.toLowerCase() === name.toLowerCase());
        if (hasNameConflict) {
            setCreateError("nameConflict");
            return;
        }

        const valuesResult = createInputType === "select"
            ? appendMultiValueInput(createValuesDraft, createValueInput)
            : null;
        const values = valuesResult?.nextValues ?? [];
        if (valuesResult && valuesResult.duplicateValues.length > 0) {
            notifyPortalAction({ message: DUPLICATE_VALUE_MESSAGE, tone: "warning" });
        }
        if (createInputType === "select" && values.length === 0) {
            setCreateError("selectValuesRequired");
            return;
        }

        const id = createUniqueVariantId(name, variants);
        const nextVariants: VariantDefinition[] = [
            ...variants,
            {
                id,
                label: name,
                inputType: createInputType,
                values: normalizeMultiValueList(values),
            },
        ];

        setVariants(nextVariants);
        void saveCatalogStateToApi({ variantDefinitions: nextVariants }).catch(() => undefined);
        closeCreateModal();
    };

    const closeEditModal = () => {
        setEditOpen(false);
        setEditVariantId(null);
        setEditName("");
        setEditInputType("select");
        setEditValuesDraft([]);
        setEditValueInput("");
        setEditError(null);
    };

    const saveEditVariant = () => {
        if (!editVariantId) return;

        const name = editName.trim();
        if (!name) {
            setEditError("nameRequired");
            return;
        }

        const hasNameConflict = variants.some((variant) =>
            variant.id !== editVariantId
            && variant.label.toLowerCase() === name.toLowerCase()
        );
        if (hasNameConflict) {
            setEditError("nameConflict");
            return;
        }

        const valuesResult = editInputType === "select"
            ? appendMultiValueInput(editValuesDraft, editValueInput)
            : null;
        const values = valuesResult?.nextValues ?? [];
        if (valuesResult && valuesResult.duplicateValues.length > 0) {
            notifyPortalAction({ message: DUPLICATE_VALUE_MESSAGE, tone: "warning" });
        }
        if (editInputType === "select" && values.length === 0) {
            setEditError("selectValuesRequired");
            return;
        }

        if (editInputType === "select") {
            const existing = variants.find((variant) => variant.id === editVariantId);
            const removedValues = (existing?.values ?? []).filter((value) => !values.includes(value));
            const blockedValue = removedValues.find((value) => countVariantOptionUsage(products, editVariantId, value) > 0);
            if (blockedValue) {
                const usageCount = countVariantOptionUsage(products, editVariantId, blockedValue);
                notifyPortalAction({
                    message: buildVariantOptionInUseMessage(blockedValue, usageCount),
                    tone: "warning",
                });
                return;
            }
        }

        const nextVariants = variants.map((variant) =>
            variant.id === editVariantId
                ? {
                    ...variant,
                    label: name,
                    values: normalizeMultiValueList(values),
                }
                : variant
        );

        setVariants(nextVariants);
        void saveCatalogStateToApi({ variantDefinitions: nextVariants }).catch(() => undefined);
        closeEditModal();
    };

    const openDeleteConfirm = (variantId: string) => {
        setDeleteConfirmIds([variantId]);
        setDeleteConfirmError(null);
        setDeleteConfirmOpen(true);
    };

    const requestDeleteFromEdit = () => {
        if (!editVariantId) return;
        const variantId = editVariantId;
        closeEditModal();
        openDeleteConfirm(variantId);
    };

    const closeDeleteConfirm = () => {
        if (deleteConfirmSubmitting) return;
        setDeleteConfirmOpen(false);
        setDeleteConfirmIds([]);
        setDeleteConfirmError(null);
    };

    const confirmDeleteVariants = async () => {
        if (deleteConfirmIds.length === 0 || deleteConfirmSubmitting) return;

        const selectedVariants = variants.filter((variant) => deleteConfirmIds.includes(variant.id));
        const selectedKeys = selectedVariants.map((variant) => variant.id);
        if (selectedKeys.length === 0) {
            closeDeleteConfirm();
            return;
        }

        setDeleteConfirmSubmitting(true);
        setDeleteConfirmError(null);

        try {
            const payload = await deleteCatalogEntriesFromApi({
                entity: "variables",
                keys: selectedKeys,
            });
            const nextState = payload.state ?? await fetchCatalogStateFromApi();

            const keySet = new Set(selectedKeys);
            setVariants(nextState.variantDefinitions);
            setSelectedIds((current) => {
                const next = new Set(current);
                keySet.forEach((key) => next.delete(key));
                return next;
            });
            setCategories(nextState.categoryDefinitions);
            setProducts(nextState.products);

            setDeleteConfirmOpen(false);
            setDeleteConfirmIds([]);
        } catch {
            setDeleteConfirmError("Unable to delete selected variants.");
        } finally {
            setDeleteConfirmSubmitting(false);
        }
    };

    const sortLabel = SORT_OPTIONS[sortBy];
    const conditionLabel = workingFilters.condition === "ALL"
        ? "Input type"
        : `Input type: ${getInputTypeLabel(workingFilters.condition)}`;
    const hasAnyProducts = products.length > 0;
    const showVariantsOnboarding = variants.length === 0;

    if (!catalogLoaded) {
        return null;
    }

    return (
        <section className="portalVariantsPage__F3m8Q1">
            <PortalPageTitle
                page="variants"
                actions={catalogLoaded && hasAnyProducts ? (
                    <Button type="button" kind="primary" size="xsmall" onClick={openCreateModal}>
                        Create variant
                    </Button>
                ) : null}
            />

            {showVariantsOnboarding ? (
                <section className="portalProductsTableShell__G4m7N1 ui-surface-card">
                    <div className="portalProductsEmptyCard__X5m2Q8 portalProductsEmptyCardCentered__K2m8Q4">
                        <div className="portalProductsOnboardingArt__A5m2Q6" aria-hidden="true">
                            <span className="portalProductsOnboardingArtCard__W3m2Q8 portalProductsOnboardingArtCardPrimary__Y2m8Q5" />
                            <span className="portalProductsOnboardingArtCard__W3m2Q8 portalProductsOnboardingArtCardSecondary__F5m2Q4" />
                            <span className="portalProductsOnboardingArtCard__W3m2Q8 portalProductsOnboardingArtCardTertiary__B2m8Q1" />
                        </div>
                        <h3 className="typography__heading6__H5j9s0 portalProductsEmptyHeading__D2m8Q4">Create variants for your catalog</h3>
                        <p className="typography__small__Q9j2p0 portalProductsEmptyBody__J3m2Q7">Use variants to define structured product details for categories and stock.</p>
                        <Button type="button" kind="primary" size="xsmall" onClick={openCreateModal}>
                            Create variant
                        </Button>
                    </div>
                </section>
            ) : (
                <section className="portalProductsTableShell__G4m7N1 ui-surface-card">
                <div className="portalProductsTableScroll__H7q2M4">
                    <table className="portalProductsTable__E8n4Q7">
                        <thead>
                            <tr>
                                <th colSpan={7} className="portalProductsControlsHeader__B6m2R1">
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
                                                        placeholder="Search variants, categories, filters"
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
                                                            onClick={toggleSortMenu}
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
                                                                        className={cn(
                                                                            "portalProductsMenuItem__E3n8R6",
                                                                            sortBy === sortOption && "portalProductsMenuItemActive__M6p3D9"
                                                                        )}
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
                                                <div className="portalProductsMenuWrap__P6k2T1" ref={conditionFilterMenuRef}>
                                                    <button
                                                        type="button"
                                                        className={cn(
                                                            "portalProductsDashedFilterButton__R4m8Q2",
                                                            (workingFilters.condition !== "ALL" || conditionFilterMenuOpen) && "portalProductsDashedFilterButtonActive__W2n9K5"
                                                        )}
                                                        aria-haspopup="menu"
                                                        aria-expanded={conditionFilterMenuOpen}
                                                        onClick={() => {
                                                            setConditionFilterMenuOpen((current) => !current);
                                                            setSortMenuOpen(false);
                                                        }}
                                                    >
                                                        {conditionLabel}
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
                                                                    {condition === "ALL" ? "All types" : getInputTypeLabel(condition)}
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
                                            <div className="portalProductsViewsRow__R6m1V2" role="tablist" aria-label="Variant views">
                                                {views.map((view) => (
                                                    <Button
                                                        key={view.id}
                                                        type="button"
                                                        kind="toggle"
                                                        size="xsmall"
                                                        role="tab"
                                                        aria-selected={view.id === activeViewId}
                                                        className="portalProductsViewTab__D8m4Q5"
                                                        onClick={() => handleViewSelect(view.id)}
                                                    >
                                                        <span>{getViewLabel(view)}</span>
                                                    </Button>
                                                ))}

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
                                                        onClick={toggleSortMenu}
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
                                                                    className={cn(
                                                                        "portalProductsMenuItem__E3n8R6",
                                                                        sortBy === sortOption && "portalProductsMenuItemActive__M6p3D9"
                                                                    )}
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
                            <tr>
                                <th className="portalProductsCellCheckbox__C5m1R9">
                                    <input
                                        ref={selectAllRef}
                                        type="checkbox"
                                        checked={allVisibleSelected}
                                        onChange={(event) => toggleAllVisible(event.target.checked)}
                                        aria-label="Select all variants"
                                    />
                                </th>
                                <th>Name</th>
                                <th>Inventory</th>
                                <th>Category</th>
                                <th>Input type</th>
                                <th>Values</th>
                                <th>Used in filters</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleVariantRows.length === 0 ? (
                                <tr className="portalProductsEmptyRow__S2m8Q4">
                                    <td colSpan={7} className="portalProductsEmpty__D3m7K2">
                                        Table is empty.
                                    </td>
                                </tr>
                            ) : (
                                visibleVariantRows.map((row) => {
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
                                                    aria-label={`Select ${row.label}`}
                                                />
                                            </td>
                                            <td>
                                                <span className="portalProductsName__V6p3M1">{row.label}</span>
                                            </td>
                                            <td>{row.inventory}</td>
                                            <td title={row.categoryTooltip}>{row.categoryText}</td>
                                            <td>{row.inputType}</td>
                                            <td title={row.inputType === "select" ? row.valuesText : "N/A"}>{row.valuesDisplay}</td>
                                            <td>{row.usedInFiltersLabel}</td>
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
                open={createOpen}
                title="Create variant"
                closeLabel="Close create variant pop-up"
                onClose={closeCreateModal}
                footer={(
                    <>
                        <Button type="button" kind="secondary" size="xsmall" onClick={closeCreateModal}>
                            Cancel
                        </Button>
                        <Button type="button" kind="primary" size="xsmall" onClick={createVariant}>
                            Add variant
                        </Button>
                    </>
                )}
            >
                <div className="portalVariantsFormGrid__T2m8Q4">
                    <label className="portalVariantsField__J8m2Q1">
                        <span>Name</span>
                        <input
                            className="form__input__Z3n7q0"
                            value={createName}
                            onChange={(event) => {
                                setCreateName(event.target.value);
                                if (createError === "nameRequired" || createError === "nameConflict") {
                                    setCreateError(null);
                                }
                            }}
                        />
                        {createError === "nameRequired" || createError === "nameConflict" ? (
                            <p className="portalVariantsError__A2m8Q4">{VARIANT_FORM_ERROR_MESSAGES[createError]}</p>
                        ) : null}
                    </label>

                    <label className="portalVariantsField__J8m2Q1">
                        <span>Input type</span>
                        <select
                            className="form__select__P9j2k0"
                            value={createInputType}
                            onChange={(event) => {
                                const nextType = event.target.value as VariantInputType;
                                setCreateInputType(nextType);
                                if (nextType !== "select") {
                                    setCreateValuesDraft([]);
                                    setCreateValueInput("");
                                }
                            }}
                        >
                            {INPUT_TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    {createInputType === "select" ? (
                        <label className="portalVariantsField__J8m2Q1">
                            <span>Select values</span>
                            <div className="portalProductCreateTagInputWrap__K5m2Q4 portalCategoriesSelectValuesInputWrap__V7m2Q5">
                                <div className="portalProductCreateTagList__L8m1Q2">
                                    {createValuesDraft.map((value) => (
                                        <span key={value} className="portalProductCreateTagChip__R9m2Q6">
                                            <span>{value}</span>
                                            <button
                                                type="button"
                                                className="portalProductCreateTagChipRemove__W2m9Q1"
                                                onClick={() => {
                                                    removeCreateValue(value);
                                                    if (createError === "selectValuesRequired") {
                                                        setCreateError(null);
                                                    }
                                                }}
                                                aria-label={`Remove ${value}`}
                                            >
                                                x
                                            </button>
                                        </span>
                                    ))}
                                    <input
                                        className="portalProductCreateTagInput__Q3m8Q4"
                                        value={createValueInput}
                                        onChange={(event) => {
                                            setCreateValueInput(event.target.value);
                                            if (createError === "selectValuesRequired") {
                                                setCreateError(null);
                                            }
                                        }}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter" || event.key === ",") {
                                                event.preventDefault();
                                                if (!createValueInput.trim()) return;
                                                addCreateValues(createValueInput);
                                                setCreateValueInput("");
                                                if (createError === "selectValuesRequired") {
                                                    setCreateError(null);
                                                }
                                                return;
                                            }

                                            if (event.key === "Backspace" && createValueInput.trim().length === 0 && createValuesDraft.length > 0) {
                                                removeCreateValue(createValuesDraft[createValuesDraft.length - 1]);
                                            }
                                        }}
                                        aria-label="Add select value"
                                        placeholder="Add value"
                                    />
                                </div>
                            </div>
                            {createError === "selectValuesRequired" ? (
                                <p className="portalVariantsError__A2m8Q4">{VARIANT_FORM_ERROR_MESSAGES.selectValuesRequired}</p>
                            ) : null}
                        </label>
                    ) : null}
                </div>
            </PortalModal>

            <PortalModal
                open={editOpen}
                title="Configure variant"
                closeLabel="Close configure variant pop-up"
                onClose={closeEditModal}
                footer={(
                    <>
                        <Button type="button" kind="secondary" size="xsmall" onClick={closeEditModal}>
                            Cancel
                        </Button>
                        <Button type="button" kind="danger" size="xsmall" onClick={requestDeleteFromEdit} disabled={!editVariantId}>
                            Delete
                        </Button>
                        <Button type="button" kind="primary" size="xsmall" onClick={saveEditVariant}>
                            Save
                        </Button>
                    </>
                )}
            >
                <div className="portalVariantsFormGrid__T2m8Q4">
                    <label className="portalVariantsField__J8m2Q1">
                        <span>Name</span>
                        <input
                            className="form__input__Z3n7q0"
                            value={editName}
                            onChange={(event) => {
                                setEditName(event.target.value);
                                if (editError === "nameRequired" || editError === "nameConflict") {
                                    setEditError(null);
                                }
                            }}
                        />
                        {editError === "nameRequired" || editError === "nameConflict" ? (
                            <p className="portalVariantsError__A2m8Q4">{VARIANT_FORM_ERROR_MESSAGES[editError]}</p>
                        ) : null}
                    </label>

                    <label className="portalVariantsField__J8m2Q1">
                        <span>Input type</span>
                        <select
                            className="form__select__P9j2k0"
                            value={editInputType}
                            disabled
                            onChange={() => undefined}
                        >
                            {INPUT_TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    {editInputType === "select" ? (
                        <label className="portalVariantsField__J8m2Q1">
                            <span>Select values</span>
                            <div className="portalProductCreateTagInputWrap__K5m2Q4 portalCategoriesSelectValuesInputWrap__V7m2Q5">
                                <div className="portalProductCreateTagList__L8m1Q2">
                                    {editValuesDraft.map((value) => (
                                        <span key={value} className="portalProductCreateTagChip__R9m2Q6">
                                            <span>{value}</span>
                                            <button
                                                type="button"
                                                className="portalProductCreateTagChipRemove__W2m9Q1"
                                                onClick={() => {
                                                    removeEditValue(value);
                                                    if (editError === "selectValuesRequired") {
                                                        setEditError(null);
                                                    }
                                                }}
                                                aria-label={`Remove ${value}`}
                                            >
                                                x
                                            </button>
                                        </span>
                                    ))}
                                    <input
                                        className="portalProductCreateTagInput__Q3m8Q4"
                                        value={editValueInput}
                                        onChange={(event) => {
                                            setEditValueInput(event.target.value);
                                            if (editError === "selectValuesRequired") {
                                                setEditError(null);
                                            }
                                        }}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter" || event.key === ",") {
                                                event.preventDefault();
                                                if (!editValueInput.trim()) return;
                                                addEditValues(editValueInput);
                                                setEditValueInput("");
                                                if (editError === "selectValuesRequired") {
                                                    setEditError(null);
                                                }
                                                return;
                                            }

                                            if (event.key === "Backspace" && editValueInput.trim().length === 0 && editValuesDraft.length > 0) {
                                                removeEditValue(editValuesDraft[editValuesDraft.length - 1]);
                                            }
                                        }}
                                        aria-label="Add select value"
                                        placeholder="Add value"
                                    />
                                </div>
                            </div>
                            {editError === "selectValuesRequired" ? (
                                <p className="portalVariantsError__A2m8Q4">{VARIANT_FORM_ERROR_MESSAGES.selectValuesRequired}</p>
                            ) : null}
                        </label>
                    ) : null}
                </div>
            </PortalModal>

            <PortalModal
                open={deleteConfirmOpen}
                title={`Delete ${deleteConfirmIds.length} ${deleteConfirmIds.length === 1 ? "variant" : "variants"}`}
                closeLabel="Cancel delete variants"
                onClose={closeDeleteConfirm}
                footer={(
                    <>
                        <Button type="button" kind="secondary" size="xsmall" onClick={closeDeleteConfirm} disabled={deleteConfirmSubmitting}>
                            Cancel
                        </Button>
                        <Button type="button" kind="danger" size="xsmall" onClick={confirmDeleteVariants} disabled={deleteConfirmSubmitting}>
                            Delete
                        </Button>
                    </>
                )}
            >
                <p className="portalVariantsDeleteConfirmText__W2m8Q3">This cannot be undone.</p>
                {deleteConfirmError ? <p className="portalVariantsError__A2m8Q4">{deleteConfirmError}</p> : null}
            </PortalModal>
        </section>
    );
}
