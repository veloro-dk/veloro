"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type UIEvent as ReactUIEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, ChevronDown, Copy, Filter, GripVertical, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/Button";
import { PortalModal } from "@/components/PortalModal";
import { PortalPageTitle } from "@/components/PortalPageTitle";
import { PortalTableLoading } from "@/components/PortalTableLoading";
import { Tooltip } from "@/components/Tooltip";
import {
    BUILT_IN_VIEWS,
    CATEGORIES_TRANSLATIONS,
    CATEGORY_CUSTOM_VIEWS_STORAGE_KEY,
    CATEGORY_DEFAULT_VISIBLE_COLUMNS,
    CATEGORY_SORT_STORAGE_KEY,
    CATEGORY_VISIBLE_COLUMNS_STORAGE_KEY,
    type CategoryColumnDragPreview,
    type CategoryColumnDropTarget,
    COLUMN_DRAGGING_BODY_CLASS,
    SORT_KEYS,
    type CategoryErrorKey,
    type CategoryFilters,
    type CategoryTableColumn,
    type CategoryTableColumnId,
    type CategoryView,
    type ColumnSection,
    type SortKey,
} from "@/components/categories/viewConfig";
import {
    cn,
    createCustomViewId,
    fillTemplate,
    getSortOptions,
    getViewLabel,
    loadCategoryCustomViewsFromStorage,
    loadStoredColumnIds,
    parseVariantValues,
} from "@/components/categories/viewHelpers";
import { usePortalI18n } from "@/i18n/PortalI18nContext";
import {
    getDefaultProducts,
    createUniqueVariantId,
    createUniqueCategoryId,
    getDefaultProductCategoryDefinitions,
    getDefaultVariantDefinitions,
    type CatalogProduct,
    type CategoryVariantRule,
    type ProductCategoryDefinition,
    type VariantInputType,
    type VariantDefinition,
} from "@/lib/productCatalog";
import {
    deleteCatalogEntriesFromApi,
    fetchCatalogStateFromApi,
    getCachedCatalogStateSnapshot,
    saveCatalogStateToApi,
} from "@/lib/catalogStateClient";
import { loadStoredSortKey, saveStoredSortKey } from "@/lib/tableSortStorage";

export function PortalCategoriesView() {
    const router = useRouter();
    const { language } = usePortalI18n();
    const text = CATEGORIES_TRANSLATIONS[language] ?? CATEGORIES_TRANSLATIONS.en;
    const sortOptions = useMemo(() => getSortOptions(text), [text]);
    const cachedCatalogState = getCachedCatalogStateSnapshot();
    const cachedCategoryCount = cachedCatalogState?.categoryDefinitions.length ?? 0;

    const [, setProducts] = useState<CatalogProduct[]>(() => cachedCatalogState?.products ?? getDefaultProducts());
    const [variantDefinitions, setVariantDefinitions] = useState<VariantDefinition[]>(() => cachedCatalogState?.variantDefinitions ?? getDefaultVariantDefinitions());
    const [categories, setCategories] = useState<ProductCategoryDefinition[]>(() => cachedCatalogState?.categoryDefinitions ?? getDefaultProductCategoryDefinitions());
    const [views, setViews] = useState<CategoryView[]>(BUILT_IN_VIEWS);
    const [activeViewId, setActiveViewId] = useState<string>(BUILT_IN_VIEWS[0].id);
    const [workingFilters, setWorkingFilters] = useState<CategoryFilters>({ ...BUILT_IN_VIEWS[0].filters });
    const [sortBy, setSortBy] = useState<SortKey>(() => (
        loadStoredSortKey(CATEGORY_SORT_STORAGE_KEY, SORT_KEYS, "title-asc")
    ));

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
    const [hasHydratedViews, setHasHydratedViews] = useState(false);
    const [catalogLoaded, setCatalogLoaded] = useState(false);
    const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
    const [categoryNameDraft, setCategoryNameDraft] = useState("");
    const [categoryConditionDraft, setCategoryConditionDraft] = useState(text.modal.defaultCondition);
    const [categoryVariantRulesDraft, setCategoryVariantRulesDraft] = useState<CategoryVariantRule[]>([]);
    const [createCategoryError, setCreateCategoryError] = useState<CategoryErrorKey | null>(null);
    const [newVariableNameDraft, setNewVariableNameDraft] = useState("");
    const [newVariableTypeDraft, setNewVariableTypeDraft] = useState<VariantInputType>("select");
    const [newVariableValuesDraft, setNewVariableValuesDraft] = useState("");
    const [newVariableRequiredDraft, setNewVariableRequiredDraft] = useState(false);
    const createCategoryNameError = createCategoryError === "categoryNameRequired" ? text.errors.categoryNameRequired : null;
    const createCategoryVariantRulesError = createCategoryError === "variantRuleRequired" ? text.errors.variantRuleRequired : null;
    const createCategoryVariantNameError = createCategoryError === "variableNameRequired" || createCategoryError === "variableConflict"
        ? text.errors[createCategoryError]
        : null;
    const createCategoryVariantValuesError = createCategoryError === "selectValuesRequired" ? text.errors.selectValuesRequired : null;

    const [sortMenuOpen, setSortMenuOpen] = useState(false);
    const [conditionFilterMenuOpen, setConditionFilterMenuOpen] = useState(false);
    const [columnEditorOpen, setColumnEditorOpen] = useState(false);
    const [visibleColumnIds, setVisibleColumnIds] = useState<CategoryTableColumnId[]>(CATEGORY_DEFAULT_VISIBLE_COLUMNS);
    const [hasHydratedColumns, setHasHydratedColumns] = useState(false);
    const [draggedColumnId, setDraggedColumnId] = useState<CategoryTableColumnId | null>(null);
    const [columnDropTarget, setColumnDropTarget] = useState<CategoryColumnDropTarget | null>(null);
    const [columnDragPreview, setColumnDragPreview] = useState<CategoryColumnDragPreview | null>(null);
    const [categoriesTableScrolledX, setCategoriesTableScrolledX] = useState(false);

    const selectAllRef = useRef<HTMLInputElement | null>(null);
    const sortMenuRef = useRef<HTMLDivElement | null>(null);
    const conditionFilterMenuRef = useRef<HTMLDivElement | null>(null);
    const columnEditorMenuRef = useRef<HTMLDivElement | null>(null);
    const viewMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const draggedColumnIdRef = useRef<CategoryTableColumnId | null>(null);
    const columnDropTargetRef = useRef<CategoryColumnDropTarget | null>(null);
    const viewDraftInputRef = useRef<HTMLInputElement | null>(null);
    const renameViewInputRef = useRef<HTMLInputElement | null>(null);
    const searchQueryInputRef = useRef<HTMLInputElement | null>(null);
    const categoryNameInputRef = useRef<HTMLInputElement | null>(null);
    const categoriesTableScrollRef = useRef<HTMLDivElement | null>(null);

    const activeView = useMemo(() => views.find((view) => view.id === activeViewId) ?? views[0], [views, activeViewId]);

    const conditionOptions = useMemo(
        () => ["ALL", ...Array.from(new Set(categories.map((category) => category.productCondition))).sort((a, b) => a.localeCompare(b))],
        [categories]
    );

    const visibleCategories = useMemo(() => {
        const normalizedQuery = workingFilters.query.trim().toLowerCase();

        const filtered = categories.filter((category) => {
            if (workingFilters.condition !== "ALL" && category.productCondition !== workingFilters.condition) return false;

            if (!normalizedQuery) return true;

            const searchText = [category.title, category.productCondition, String(category.products)]
                .join(" ")
                .toLowerCase();

            return searchText.includes(normalizedQuery);
        });

        return filtered.sort((a, b) => {
            switch (sortBy) {
                case "title-asc":
                    return a.title.localeCompare(b.title);
                case "title-desc":
                    return b.title.localeCompare(a.title);
                case "products-desc":
                    return b.products - a.products;
                case "products-asc":
                    return a.products - b.products;
                default:
                    return 0;
            }
        });
    }, [categories, sortBy, workingFilters]);

    const visibleCategoryIds = useMemo(() => visibleCategories.map((category) => category.id), [visibleCategories]);

    const selectedVisibleCount = useMemo(
        () => visibleCategoryIds.filter((id) => selectedIds.has(id)).length,
        [visibleCategoryIds, selectedIds]
    );

    const allVisibleSelected = visibleCategoryIds.length > 0 && selectedVisibleCount === visibleCategoryIds.length;
    const hasSelection = selectedIds.size > 0;
    const hasActiveFilters = workingFilters.query.trim().length > 0 || workingFilters.condition !== "ALL";
    const variantDefinitionById = useMemo(() => {
        const next = new Map<string, VariantDefinition>();
        variantDefinitions.forEach((definition) => next.set(definition.id, definition));
        return next;
    }, [variantDefinitions]);
    const selectedVariantRuleIds = useMemo(
        () => new Set(categoryVariantRulesDraft.map((rule) => rule.variantId)),
        [categoryVariantRulesDraft]
    );
    const availableVariantDefinitions = useMemo(
        () => variantDefinitions.filter((definition) => !selectedVariantRuleIds.has(definition.id)),
        [variantDefinitions, selectedVariantRuleIds]
    );

    const allColumns = useMemo<CategoryTableColumn[]>(() => [
        {
            id: "title",
            label: text.table.title,
            locked: true,
        },
        {
            id: "products",
            label: text.table.products,
        },
        {
            id: "productConditions",
            label: text.table.productConditions,
        },
        ...variantDefinitions.map((definition) => ({
            id: `variant:${definition.id}` as CategoryTableColumnId,
            label: definition.label,
            variantId: definition.id,
        })),
    ], [text.table, variantDefinitions]);
    const normalizedVisibleColumnIds = useMemo(() => {
        const knownIds = new Set(allColumns.map((column) => column.id));
        const next: CategoryTableColumnId[] = [];
        const seen = new Set<CategoryTableColumnId>();

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

        return next.length > 0 ? next : CATEGORY_DEFAULT_VISIBLE_COLUMNS;
    }, [allColumns, visibleColumnIds]);

    const editorColumnsBySection = useMemo(() => {
        const visibleOrder = new Map<CategoryTableColumnId, number>();
        normalizedVisibleColumnIds.forEach((columnId, index) => {
            visibleOrder.set(columnId, index);
        });
        const defaultOrder = new Map<CategoryTableColumnId, number>();
        allColumns.forEach((column, index) => {
            defaultOrder.set(column.id, index);
        });

        const sortColumns = (left: CategoryTableColumn, right: CategoryTableColumn) => {
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
            .filter((column): column is CategoryTableColumn => Boolean(column));
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

    useEffect(() => {
        function handlePointerDown(event: MouseEvent) {
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

            if (viewMenuOpenId) {
                const viewMenuRef = viewMenuRefs.current[viewMenuOpenId];
                if (viewMenuRef && !viewMenuRef.contains(target)) {
                    setViewMenuOpenId(null);
                }
            }
        }

        document.addEventListener("mousedown", handlePointerDown);
        return () => document.removeEventListener("mousedown", handlePointerDown);
    }, [sortMenuOpen, conditionFilterMenuOpen, columnEditorOpen, viewMenuOpenId]);

    useEffect(() => {
        let cancelled = false;
        let gateTimeoutId: number | null = null;

        const hydrate = async () => {
            const customViews = loadCategoryCustomViewsFromStorage();
            gateTimeoutId = window.setTimeout(() => {
                if (cancelled) return;
                setHasHydratedViews(true);
                setCatalogLoaded(true);
            }, 8000);
            try {
                const state = await fetchCatalogStateFromApi();
                if (cancelled) return;
                setProducts(state.products);
                setVariantDefinitions(state.variantDefinitions);
                setCategories(state.categoryDefinitions);
            } catch {
                if (cancelled) return;
                setProducts(getDefaultProducts());
                setVariantDefinitions(getDefaultVariantDefinitions());
                setCategories(getDefaultProductCategoryDefinitions());
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
        if (!createCategoryOpen) return;
        categoryNameInputRef.current?.focus();
    }, [createCategoryOpen]);

    useEffect(() => {
        if (!hasHydratedViews || typeof window === "undefined") return;
        const customViews = views
            .filter((view) => !view.builtIn)
            .map((view) => ({
                id: view.id,
                label: view.label,
                filters: { ...view.filters },
            }));
        window.localStorage.setItem(CATEGORY_CUSTOM_VIEWS_STORAGE_KEY, JSON.stringify(customViews));
    }, [views, hasHydratedViews]);

    useEffect(() => {
        saveStoredSortKey(CATEGORY_SORT_STORAGE_KEY, sortBy);
    }, [sortBy]);

    useEffect(() => {
        let cancelled = false;
        const stored = loadStoredColumnIds(CATEGORY_VISIBLE_COLUMNS_STORAGE_KEY);
        queueMicrotask(() => {
            if (cancelled) return;
            if (stored.length > 0) {
                setVisibleColumnIds(stored as CategoryTableColumnId[]);
            }
            setHasHydratedColumns(true);
        });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!hasHydratedColumns || typeof window === "undefined") return;
        window.localStorage.setItem(CATEGORY_VISIBLE_COLUMNS_STORAGE_KEY, JSON.stringify(normalizedVisibleColumnIds));
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

    const resetMenus = () => {
        setSortMenuOpen(false);
        setConditionFilterMenuOpen(false);
        setColumnEditorOpen(false);
        draggedColumnIdRef.current = null;
        setDraggedColumnId(null);
        setColumnDropTarget(null);
        setColumnDragPreview(null);
        setViewMenuOpenId(null);
    };

    const openSearchAndFilter = () => {
        setSearchMode(true);
        setViewComposerOpen(false);
        setViewDraftName("");
        setRenameViewId(null);
        setRenameViewDraftName("");
        resetMenus();

        window.requestAnimationFrame(() => {
            searchQueryInputRef.current?.focus();
        });
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
        setViewMenuOpenId(null);
        draggedColumnIdRef.current = null;
        setDraggedColumnId(null);
        setColumnDropTarget(null);
        setColumnDragPreview(null);
    };

    const isDefaultColumnLayout = useMemo(() => (
        normalizedVisibleColumnIds.length === CATEGORY_DEFAULT_VISIBLE_COLUMNS.length
        && normalizedVisibleColumnIds.every((columnId, index) => columnId === CATEGORY_DEFAULT_VISIBLE_COLUMNS[index])
    ), [normalizedVisibleColumnIds]);

    const resetColumnsToDefaultLayout = () => {
        draggedColumnIdRef.current = null;
        setDraggedColumnId(null);
        setColumnDropTarget(null);
        setColumnDragPreview(null);
        setVisibleColumnIds(CATEGORY_DEFAULT_VISIBLE_COLUMNS);
    };

    const resetToActiveView = () => {
        setWorkingFilters({ ...activeView.filters });
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
        setWorkingFilters({ ...view.filters });
        setSearchMode(false);
        setSelectedIds(new Set());
        setViewComposerOpen(false);
        setViewDraftName("");
        setRenameViewId(null);
        setRenameViewDraftName("");
        resetMenus();
    };

    const updateFilter = <K extends keyof CategoryFilters>(key: K, value: CategoryFilters[K]) => {
        setWorkingFilters((current) => ({
            ...current,
            [key]: value,
        }));
        setSelectedIds(new Set());
    };

    const getColumnSection = (columnId: CategoryTableColumnId): ColumnSection => (
        columnId.startsWith("variant:") ? "variant" : "standard"
    );

    const normalizeColumnIds = (columnIds: CategoryTableColumnId[]) => {
        const knownIds = new Set(allColumns.map((column) => column.id));
        const next: CategoryTableColumnId[] = [];
        const seen = new Set<CategoryTableColumnId>();

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

        return next.length > 0 ? next : CATEGORY_DEFAULT_VISIBLE_COLUMNS;
    };

    const toggleColumnVisibility = (columnId: CategoryTableColumnId, checked: boolean) => {
        setVisibleColumnIds((current) => {
            const next = normalizeColumnIds(current);
            const nextSet = new Set(next);
            if (checked) {
                if (!nextSet.has(columnId)) {
                    if (getColumnSection(columnId) === "variant") {
                        next.push(columnId);
                    } else {
                        const firstVariantIndex = next.findIndex((entry) => getColumnSection(entry) === "variant");
                        if (firstVariantIndex < 0) next.push(columnId);
                        else next.splice(firstVariantIndex, 0, columnId);
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
        draggedId: CategoryTableColumnId,
        targetId: CategoryTableColumnId,
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

    const onColumnReorderPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, columnId: CategoryTableColumnId) => {
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
                const targetId = dropTargetElement.dataset.columnDropId as CategoryTableColumnId | undefined;
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

            const targetId = rowTargetElement.dataset.columnRowId as CategoryTableColumnId | undefined;
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

    const toggleAllVisible = (checked: boolean) => {
        setSelectedIds((current) => {
            const next = new Set(current);
            if (checked) {
                visibleCategoryIds.forEach((id) => next.add(id));
            } else {
                visibleCategoryIds.forEach((id) => next.delete(id));
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

    const navigateToCategoryEdit = (id: string) => {
        router.push(`/products/categories/${id}`);
    };

    const handleCategoryRowClick = (event: ReactMouseEvent<HTMLTableRowElement>, id: string) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest("input,button,a,select,textarea,label")) return;
        navigateToCategoryEdit(id);
    };

    const handleCategoryRowKeyDown = (event: ReactKeyboardEvent<HTMLTableRowElement>, id: string) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        navigateToCategoryEdit(id);
    };

    const openViewComposer = () => {
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

    const closeCreateCategoryModal = () => {
        setCreateCategoryOpen(false);
        setCreateCategoryError(null);
    };

    const addCategoryVariantRule = (variantId: string) => {
        setCategoryVariantRulesDraft((current) => {
            if (current.some((rule) => rule.variantId === variantId)) return current;
            return [...current, { variantId, required: false }];
        });
        if (createCategoryError === "variantRuleRequired") {
            setCreateCategoryError(null);
        }
    };

    const removeCategoryVariantRule = (variantId: string) => {
        setCategoryVariantRulesDraft((current) => current.filter((rule) => rule.variantId !== variantId));
    };

    const toggleCategoryVariantRequired = (variantId: string, required: boolean) => {
        setCategoryVariantRulesDraft((current) =>
            current.map((rule) => (rule.variantId === variantId ? { ...rule, required } : rule))
        );
    };

    const moveCategoryVariantRule = (variantId: string, direction: -1 | 1) => {
        setCategoryVariantRulesDraft((current) => {
            const index = current.findIndex((rule) => rule.variantId === variantId);
            if (index < 0) return current;
            const nextIndex = index + direction;
            if (nextIndex < 0 || nextIndex >= current.length) return current;

            const next = [...current];
            const [entry] = next.splice(index, 1);
            next.splice(nextIndex, 0, entry);
            return next;
        });
    };

    const createVariableForCategory = () => {
        const name = newVariableNameDraft.trim();
        if (!name) {
            setCreateCategoryError("variableNameRequired");
            return;
        }

        const hasConflict = variantDefinitions.some((definition) => definition.label.toLowerCase() === name.toLowerCase());
        if (hasConflict) {
            setCreateCategoryError("variableConflict");
            return;
        }

        const values = newVariableTypeDraft === "select" ? parseVariantValues(newVariableValuesDraft) : [];
        if (newVariableTypeDraft === "select" && values.length === 0) {
            setCreateCategoryError("selectValuesRequired");
            return;
        }

        const id = createUniqueVariantId(name, variantDefinitions);
        const nextVariantDefinitions: VariantDefinition[] = [
            ...variantDefinitions,
            {
                id,
                label: name,
                inputType: newVariableTypeDraft,
                values,
            },
        ];
        setVariantDefinitions(nextVariantDefinitions);
        void saveCatalogStateToApi({ variantDefinitions: nextVariantDefinitions }).catch(() => undefined);
        setCategoryVariantRulesDraft((current) => [
            ...current,
            {
                variantId: id,
                required: newVariableRequiredDraft,
            },
        ]);

        setCreateCategoryError(null);
        setNewVariableNameDraft("");
        setNewVariableTypeDraft("select");
        setNewVariableValuesDraft("");
        setNewVariableRequiredDraft(false);
    };

    const createCategory = () => {
        const title = categoryNameDraft.trim();
        if (!title) {
            setCreateCategoryError("categoryNameRequired");
            return;
        }

        if (categoryVariantRulesDraft.length === 0) {
            setCreateCategoryError("variantRuleRequired");
            return;
        }

        const nextCategory: ProductCategoryDefinition = {
            id: createUniqueCategoryId(title, categories),
            title,
            description: undefined,
            type: "MANUAL",
            conditionMode: "ALL",
            conditions: [],
            manualProductIds: [],
            storeIds: [],
            products: 0,
            productCondition: categoryConditionDraft.trim() || text.modal.defaultCondition,
            variantRules: categoryVariantRulesDraft.map((rule) => ({
                variantId: rule.variantId,
                required: rule.required,
            })),
        };

        const nextCategories = [nextCategory, ...categories];
        setCategories(nextCategories);
        void saveCatalogStateToApi({ categoryDefinitions: nextCategories }).catch(() => undefined);
        closeCreateCategoryModal();
    };

    const saveCurrentView = () => {
        const name = viewDraftName.trim();
        if (!name) return;

        const id = createCustomViewId();
        const nextView: CategoryView = {
            id,
            label: name,
            builtIn: false,
            filters: { ...workingFilters },
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
        const nextView: CategoryView = {
            id: nextId,
            label: nextLabel,
            builtIn: false,
            filters: { ...source.filters },
        };

        setViews((current) => [...current, nextView]);
        setActiveViewId(nextId);
        setWorkingFilters({ ...source.filters });
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
            setWorkingFilters({ ...fallbackView.filters });
            setSearchMode(false);
            setSelectedIds(new Set());
        }
    };

    const handleDeleteSelected = () => {
        if (selectedIds.size === 0) return;
        setDeleteConfirmIds(Array.from(selectedIds));
        setDeleteConfirmError(null);
        setDeleteConfirmOpen(true);
    };

    const closeDeleteConfirm = () => {
        if (deleteConfirmSubmitting) return;
        setDeleteConfirmOpen(false);
        setDeleteConfirmIds([]);
        setDeleteConfirmError(null);
    };

    const confirmDeleteSelected = async () => {
        if (deleteConfirmIds.length === 0 || deleteConfirmSubmitting) return;

        const selectedCategories = categories.filter((category) => deleteConfirmIds.includes(category.id));
        setDeleteConfirmSubmitting(true);
        setDeleteConfirmError(null);

        try {
            const payload = await deleteCatalogEntriesFromApi({
                entity: "categories",
                ids: selectedCategories.map((category) => category.id),
            });
            const nextState = payload.state ?? await fetchCatalogStateFromApi();
            setCategories(nextState.categoryDefinitions);
            setSelectedIds(new Set());
            setDeleteConfirmOpen(false);
            setDeleteConfirmIds([]);
        } catch {
            setDeleteConfirmError("Unable to delete selected categories.");
        } finally {
            setDeleteConfirmSubmitting(false);
        }
    };

    const renderCategoryTableCell = (category: ProductCategoryDefinition, column: CategoryTableColumn): ReactNode => {
        if (column.id === "title") {
            const value = category.title.trim();
            return (
                <span className="portalProductsName__V6p3M1" title={value || "-"}>
                    {value || "-"}
                </span>
            );
        }

        if (column.id === "products") {
            return String(Math.max(0, category.products));
        }

        if (column.id === "productConditions") {
            const value = category.productCondition.trim();
            return (
                <span className="portalProductsCellTruncate__N5m2Q8" title={value || "-"}>
                    {value || "-"}
                </span>
            );
        }

        if (!column.variantId) {
            return "-";
        }

        const variantRule = category.variantRules.find((rule) => rule.variantId === column.variantId);
        if (!variantRule) return "-";
        return variantRule.required ? "Required" : "Optional";
    };

    const currentSortLabel = sortOptions.find((option) => option.value === sortBy)?.label ?? text.sort.button;
    const conditionFilterLabel = workingFilters.condition === "ALL"
        ? text.filters.condition
        : `${text.filters.condition}: ${workingFilters.condition}`;
    const hasAnyCategories = categories.length > 0;
    const showCategoriesOnboarding = categories.length === 0;
    const tableLoadingMode = cachedCategoryCount > 0 ? "populated" : "empty";
    const deleteConfirmTitle = `Delete ${deleteConfirmIds.length} ${deleteConfirmIds.length === 1 ? "category" : "categories"}`;
    const handleCategoriesTableScroll = (event: ReactUIEvent<HTMLDivElement>) => {
        setCategoriesTableScrolledX(event.currentTarget.scrollLeft > 0);
    };

    useEffect(() => {
        const tableScroll = categoriesTableScrollRef.current;
        if (!tableScroll) return;
        setCategoriesTableScrolledX(tableScroll.scrollLeft > 0);
    }, [visibleColumns.length, visibleCategories.length, hasSelection]);

    return (
        <section className="portalProductsPage__C4p8M2">
            <PortalPageTitle
                page="categories"
                actions={catalogLoaded && hasAnyCategories ? (
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
                        <Button type="button" kind="primary" size="xsmall" onClick={() => router.push("/products/categories/new")}>
                            {text.actions.addCategory}
                        </Button>
                    </>
                ) : null}
            />

            {!catalogLoaded ? (
                <section className="portalProductsTableShell__G4m7N1 ui-surface-card">
                    <PortalTableLoading mode={tableLoadingMode} />
                </section>
            ) : showCategoriesOnboarding ? (
                <section className="portalProductsTableShell__G4m7N1 ui-surface-card">
                    <div className="portalProductsEmptyCard__X5m2Q8 portalProductsEmptyCardCentered__K2m8Q4">
                        <div className="portalProductsOnboardingArt__A5m2Q6" aria-hidden="true">
                            <span className="portalProductsOnboardingArtCard__W3m2Q8 portalProductsOnboardingArtCardPrimary__Y2m8Q5" />
                            <span className="portalProductsOnboardingArtCard__W3m2Q8 portalProductsOnboardingArtCardSecondary__F5m2Q4" />
                            <span className="portalProductsOnboardingArtCard__W3m2Q8 portalProductsOnboardingArtCardTertiary__B2m8Q1" />
                        </div>
                        <h3 className="typography__heading6__H5j9s0 portalProductsEmptyHeading__D2m8Q4">Create categories for your products</h3>
                        <p className="typography__small__Q9j2p0 portalProductsEmptyBody__J3m2Q7">Use categories to organize your products before you start adding inventory.</p>
                        <Button type="button" kind="primary" size="xsmall" onClick={() => router.push("/products/categories/new")}>
                            {text.actions.addCategory}
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
                                    placeholder={text.filters.searchCategories}
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
                                            aria-label={`${text.sort.sortCategories} (S): ${currentSortLabel}`}
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
                                                {condition === "ALL" ? text.filters.allConditions : condition}
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                            </div>

                            <button type="button" className="portalProductsDashedFilterButton__R4m8Q2">
                                {text.actions.addFilter}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="portalProductsTableTopRow__Y3m9Q5">
                        <div className="portalProductsViewsRow__R6m1V2" role="tablist" aria-label={text.views.categoryViews}>
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
                                        aria-label={`${text.sort.sortCategories} (S): ${currentSortLabel}`}
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
                    ref={categoriesTableScrollRef}
                    onScroll={handleCategoriesTableScroll}
                    className={cn(
                        "portalProductsTableScroll__H7q2M4 portalProductsDataTableScroll__W5m2Q9",
                        categoriesTableScrolledX && "portalProductsDataTableScrolled__F2m8Q6"
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
                                                aria-label={text.table.selectAllCategories}
                                            />
                                        </th>
	                                        <th colSpan={visibleColumns.length} className="portalProductsBulkHeader__L1p7V4">
                                            <div className="portalProductsBulkActions__S6m2N8">
                                                <div className="portalProductsBulkSummary__K4m9P2">
                                                    <span>{selectedIds.size} {text.bulk.selected}</span>
                                                </div>

                                                <div className="portalProductsBulkButtons__W5m2R8">
                                                    <Button type="button" kind="basic" size="xsmall">
                                                        {text.actions.bulkEdit}
                                                    </Button>
                                                    <Button type="button" kind="basic" size="xsmall" onClick={handleDeleteSelected}>
                                                        {text.actions.deleteCategories}
                                                    </Button>
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
                                            aria-label={text.table.selectAllCategories}
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

                        <tbody>
                            {visibleCategories.length === 0 ? (
                                <tr className="portalProductsEmptyRow__S2m8Q4">
	                                    <td colSpan={tableColumnSpan} className="portalProductsEmpty__D3m7K2">
	                                        {text.table.noCategoriesFound}
	                                    </td>
	                                </tr>
                            ) : (
                                visibleCategories.map((category) => {
                                    const checked = selectedIds.has(category.id);

                                    return (
                                        <tr
                                            key={category.id}
                                            className={cn("portalProductsRowInteractive__T4m8Q1", checked && "portalProductsRowSelected__Q9m2N4")}
                                            onClick={(event) => handleCategoryRowClick(event, category.id)}
                                            onKeyDown={(event) => handleCategoryRowKeyDown(event, category.id)}
                                            tabIndex={0}
                                            role="link"
                                        >
                                            <td className="portalProductsCellCheckbox__C5m1R9">
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={(event) => toggleRow(category.id, event.target.checked)}
                                                    aria-label={fillTemplate(text.table.selectCategory, { name: category.title })}
                                                />
                                            </td>
	                                            {visibleColumns.map((column, index) => (
	                                                <td
                                                        key={column.id}
                                                        data-column-id={column.id}
                                                        data-sticky-primary={index === 0 ? "true" : undefined}
                                                    >
                                                        {renderCategoryTableCell(category, column)}
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
                open={createCategoryOpen}
                title={text.modal.createCategory}
                closeLabel={text.modal.closeCreateCategory}
                onClose={closeCreateCategoryModal}
                footer={(
                    <>
                        <Button type="button" kind="secondary" size="xsmall" onClick={closeCreateCategoryModal}>
                            {text.actions.cancel}
                        </Button>
                        <Button type="button" kind="primary" size="xsmall" onClick={createCategory}>
                            {text.actions.createCategory}
                        </Button>
                    </>
                )}
            >
                <label className="portalCategoriesField__R8m2Q3">
                    <span>{text.modal.name}</span>
                    <input
                        ref={categoryNameInputRef}
                        className="form__input__Z3n7q0"
                        value={categoryNameDraft}
                        onChange={(event) => {
                            setCategoryNameDraft(event.target.value);
                            if (createCategoryError === "categoryNameRequired") {
                                setCreateCategoryError(null);
                            }
                        }}
                        placeholder={text.modal.categoryNamePlaceholder}
                        maxLength={64}
                    />
                    {createCategoryNameError ? <p className="portalCategoriesError__C6m2Q8">{createCategoryNameError}</p> : null}
                </label>

                <label className="portalCategoriesField__R8m2Q3">
                    <span>{text.modal.productCondition}</span>
                    <input
                        className="form__input__Z3n7q0"
                        value={categoryConditionDraft}
                        onChange={(event) => setCategoryConditionDraft(event.target.value)}
                        placeholder={text.modal.categoryConditionPlaceholder}
                        maxLength={120}
                    />
                </label>

                <section className="portalCategoriesVariantRules__K4m2Q9">
                    <header className="portalCategoriesVariantRulesHeader__V3m7Q2">
                        <h3>{text.modal.variableOrderAndRequirement}</h3>
                        <p>{text.modal.variableOrderHelp}</p>
                    </header>

                    {categoryVariantRulesDraft.length === 0 ? (
                        <p className="portalCategoriesVariantRulesEmpty__Q2m8K5">{text.modal.noVariantsSelected}</p>
                    ) : (
                        <div className="portalCategoriesVariantRulesList__N6m3Q4">
                            {categoryVariantRulesDraft.map((rule, index) => {
                                const label = variantDefinitionById.get(rule.variantId)?.label ?? rule.variantId;
                                const inputType = variantDefinitionById.get(rule.variantId)?.inputType ?? "input";
                                return (
                                    <div key={rule.variantId} className="portalCategoriesVariantRuleRow__H7m2Q8">
                                        <span className="portalCategoriesVariantRuleName__W9m2Q1">{label}</span>
                                        <span className="portalCategoriesVariantRuleType__M2m7Q4">{text.inputTypeLabels[inputType]}</span>

                                        <label className="portalCategoriesVariantRuleRequired__P4m8Q2">
                                            <input
                                                type="checkbox"
                                                checked={rule.required}
                                                onChange={(event) => toggleCategoryVariantRequired(rule.variantId, event.target.checked)}
                                            />
                                            {text.modal.required}
                                        </label>

                                        <div className="portalCategoriesVariantRuleActions__X3m7Q9">
                                            <Button
                                                type="button"
                                                kind="highlight"
                                                size="xsmall"
                                                onClick={() => moveCategoryVariantRule(rule.variantId, -1)}
                                                disabled={index === 0}
                                            >
                                                {text.actions.up}
                                            </Button>
                                            <Button
                                                type="button"
                                                kind="highlight"
                                                size="xsmall"
                                                onClick={() => moveCategoryVariantRule(rule.variantId, 1)}
                                                disabled={index === categoryVariantRulesDraft.length - 1}
                                            >
                                                {text.actions.down}
                                            </Button>
                                            <Button type="button" kind="highlight" size="xsmall" onClick={() => removeCategoryVariantRule(rule.variantId)}>
                                                {text.actions.remove}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {createCategoryVariantRulesError ? <p className="portalCategoriesError__C6m2Q8">{createCategoryVariantRulesError}</p> : null}
                </section>

                <section className="portalCategoriesVariantAdd__T8m2Q4">
                    <span>{text.modal.addVariable}</span>
                    {availableVariantDefinitions.length === 0 ? (
                        <p className="portalCategoriesVariantRulesEmpty__Q2m8K5">{text.modal.allVariablesAdded}</p>
                    ) : (
                        <div className="portalCategoriesVariantAddList__J2m8Q6">
                            {availableVariantDefinitions.map((definition) => (
                                <button
                                    key={definition.id}
                                    type="button"
                                    className="portalCategoriesVariantAddButton__M9m2Q3"
                                    onClick={() => addCategoryVariantRule(definition.id)}
                                >
                                    <Plus aria-hidden="true" />
                                    <span>{definition.label} ({text.inputTypeLabels[definition.inputType]})</span>
                                </button>
                            ))}
                        </div>
                    )}
                </section>

                <section className="portalCategoriesVariantCreate__U6m2Q1">
                    <span>{text.modal.createVariableForCategory}</span>
                    <div className="portalCategoriesVariantCreateGrid__P5m2Q8">
                        <label className="portalCategoriesField__R8m2Q3">
                            <span>{text.modal.name}</span>
                            <input
                                className="form__input__Z3n7q0"
                                value={newVariableNameDraft}
                                onChange={(event) => {
                                    setNewVariableNameDraft(event.target.value);
                                    if (createCategoryError === "variableNameRequired" || createCategoryError === "variableConflict") {
                                        setCreateCategoryError(null);
                                    }
                                }}
                                placeholder={text.modal.variableNamePlaceholder}
                            />
                            {createCategoryVariantNameError ? <p className="portalCategoriesError__C6m2Q8">{createCategoryVariantNameError}</p> : null}
                        </label>
                        <label className="portalCategoriesField__R8m2Q3">
                            <span>{text.modal.inputType}</span>
                            <select
                                className="form__select__P9j2k0"
                                value={newVariableTypeDraft}
                                onChange={(event) => {
                                    setNewVariableTypeDraft(event.target.value as VariantInputType);
                                    if (createCategoryError === "selectValuesRequired") {
                                        setCreateCategoryError(null);
                                    }
                                }}
                            >
                                <option value="select">{text.inputTypeLabels.select}</option>
                                <option value="input">{text.inputTypeLabels.input}</option>
                                <option value="textarea">{text.inputTypeLabels.textarea}</option>
                                <option value="date">{text.inputTypeLabels.date}</option>
                            </select>
                        </label>
                        {newVariableTypeDraft === "select" ? (
                            <label className="portalCategoriesField__R8m2Q3">
                                <span>{text.modal.selectValues}</span>
                                <input
                                    className="form__input__Z3n7q0"
                                    value={newVariableValuesDraft}
                                    onChange={(event) => {
                                        setNewVariableValuesDraft(event.target.value);
                                        if (createCategoryError === "selectValuesRequired") {
                                            setCreateCategoryError(null);
                                        }
                                    }}
                                    placeholder={text.modal.variableValuesPlaceholder}
                                />
                                {createCategoryVariantValuesError ? <p className="portalCategoriesError__C6m2Q8">{createCategoryVariantValuesError}</p> : null}
                            </label>
                        ) : null}
                        <label className="portalCategoriesVariantRuleRequired__P4m8Q2 portalCategoriesVariantCreateRequired__L7m2Q5">
                            <input
                                type="checkbox"
                                checked={newVariableRequiredDraft}
                                onChange={(event) => setNewVariableRequiredDraft(event.target.checked)}
                            />
                            {text.modal.requiredInCategory}
                        </label>
                    </div>
                    <div className="portalCategoriesVariantCreateActions__G2m8Q6">
                        <Button type="button" kind="basic" size="xsmall" onClick={createVariableForCategory}>
                            {text.modal.addVariableButton}
                        </Button>
                    </div>
                </section>
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
                            {text.actions.createView}
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
