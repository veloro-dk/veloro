"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, PackagePlus, PackageSearch, Pencil, Search, Tags, Trash2 } from "lucide-react";
import { Button } from "@/components/Button";
import { PortalModal } from "@/components/PortalModal";
import { PortalPageTitle } from "@/components/PortalPageTitle";
import {
    COLUMN_DRAGGING_BODY_CLASS,
    DUPLICATE_VALUE_MESSAGE,
    VARIANT_INPUT_TYPE_ORDER,
    buildVariantOptionInUseMessage,
    cn,
    createTimelineCommentId,
    formatDateTime,
    formatMoney,
    formatRelativeTime,
    getInitials,
    getProductTypeLevels,
    getVariantInputTypeLabel,
    parseDateOnlyTimestamp,
    parseIsoTimestamp,
    ProductSectionHeader,
    reorderVariantRulesByInsertionIndex,
    resolvePathFromLevels,
} from "@/components/products/createViewHelpers";
import {
    type NewVariantErrorKey,
    type PortalProductCreateViewProps,
    type ProductCategorySearchBy,
    type ProductCategorySort,
    type ProductTimelineEvent,
    type VariantSearchBy,
    type VariantSort,
} from "@/components/products/createViewTypes";
import { notifyPortalAction } from "@/components/portalActionNotifications";
import { usePendingChangesHeader } from "@/components/usePendingChangesHeader";
import { usePortalI18n } from "@/i18n/PortalI18nContext";
import type { LanguageCode } from "@/i18n/portal";
import {
    createRandomProductSku,
    createUniqueVariantId,
    getDefaultProductCategoryDefinitions,
    getDefaultProducts,
    getDefaultVariantDefinitions,
    type CategoryVariantRule,
    type CatalogProduct,
    type ProductTimelineComment,
    type ProductCategoryDefinition,
    type VariantDefinition,
    type VariantInputType,
} from "@/lib/productCatalog";
import {
    getDefaultTaxPercentForProductType,
    getProductTypeLabel,
    getProductTypePathLabel,
    normalizeProductTypePath,
} from "@/lib/productTypes";
import {
    deleteCatalogEntriesFromApi,
    fetchCatalogStateFromApi,
    getCachedCatalogStateSnapshot,
    saveCatalogStateToApi,
} from "@/lib/catalogStateClient";
import { appendMultiValueInput, normalizeMultiValueList, removeMultiValue, tokenizeMultiValueInput } from "@/lib/multiValueInput";
import { countVariantOptionUsage } from "@/lib/variantOptionUsage";
import type { InventorySale } from "@/lib/productInventory";
import type { PurchaseOrder } from "@/lib/purchaseOrders";

export function PortalProductCreateView({
    storeCurrency,
    productId,
    commenterName,
    commenterStoreName,
}: PortalProductCreateViewProps) {
    const router = useRouter();
    const { language, messages, storeCurrency: contextStoreCurrency } = usePortalI18n();
    const effectiveStoreCurrency = storeCurrency ?? contextStoreCurrency;
    const timelineCommenterName = (commenterName ?? "Staff").trim() || "Staff";
    const timelineCommenterStoreName = (commenterStoreName ?? "Store").trim() || "Store";
    const timelineCommenterInitials = useMemo(() => getInitials(timelineCommenterName), [timelineCommenterName]);
    const cachedCatalogState = getCachedCatalogStateSnapshot();
    const isEditMode = Boolean(productId);

    const [catalogLoaded, setCatalogLoaded] = useState(false);
    const [products, setProducts] = useState<CatalogProduct[]>(() => cachedCatalogState?.products ?? getDefaultProducts());
    const [categories, setCategories] = useState<ProductCategoryDefinition[]>(() => cachedCatalogState?.categoryDefinitions ?? getDefaultProductCategoryDefinitions());
    const [variantDefinitions, setVariantDefinitions] = useState<VariantDefinition[]>(() => cachedCatalogState?.variantDefinitions ?? getDefaultVariantDefinitions());
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => cachedCatalogState?.purchaseOrders ?? []);
    const [inventorySales, setInventorySales] = useState<InventorySale[]>(() => cachedCatalogState?.inventorySales ?? []);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [productTypePath, setProductTypePath] = useState<string[]>(["uncategorized"]);

    const [categorySort, setCategorySort] = useState<ProductCategorySort>("TITLE_ASC");
    const [categorySearchBy, setCategorySearchBy] = useState<ProductCategorySearchBy>("TITLE");
    const [categoryPickerQuery, setCategoryPickerQuery] = useState("");
    const [categoryBrowseModalOpen, setCategoryBrowseModalOpen] = useState(false);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());

    const [variantSelections, setVariantSelections] = useState<Record<string, string>>({});

    const [listedSalePrice, setListedSalePrice] = useState("");
    const [sku, setSku] = useState("");
    const [barcode, setBarcode] = useState("");

    const [variantSort, setVariantSort] = useState<VariantSort>("CUSTOM");
    const [variantSearchBy, setVariantSearchBy] = useState<VariantSearchBy>("LABEL");
    const [variantPickerQuery, setVariantPickerQuery] = useState("");
    const [variantsModalOpen, setVariantsModalOpen] = useState(false);
    const [manageVariantsModalOpen, setManageVariantsModalOpen] = useState(false);
    const [variantLibraryQuery, setVariantLibraryQuery] = useState("");
    const [variantLibrarySearchBy, setVariantLibrarySearchBy] = useState<VariantSearchBy>("LABEL");

    const [newVariantNameDraft, setNewVariantNameDraft] = useState("");
    const [newVariantTypeDraft, setNewVariantTypeDraft] = useState<VariantInputType>("select");
    const [newVariantValuesDraft, setNewVariantValuesDraft] = useState<string[]>([]);
    const [newVariantValueInput, setNewVariantValueInput] = useState("");
    const [newVariantError, setNewVariantError] = useState<NewVariantErrorKey | null>(null);
    const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
    const [editVariantNameDraft, setEditVariantNameDraft] = useState("");
    const [editVariantValuesDraft, setEditVariantValuesDraft] = useState<string[]>([]);
    const [editVariantValueInput, setEditVariantValueInput] = useState("");
    const [editVariantError, setEditVariantError] = useState<NewVariantErrorKey | null>(null);
    const [variantManagerError, setVariantManagerError] = useState<string | null>(null);
    const [pendingVariantDeleteId, setPendingVariantDeleteId] = useState<string | null>(null);
    const [pendingVariantDeleteSubmitting, setPendingVariantDeleteSubmitting] = useState(false);
    const [pendingVariantDeleteError, setPendingVariantDeleteError] = useState<string | null>(null);

    const [productVariantRulesDraft, setProductVariantRulesDraft] = useState<CategoryVariantRule[]>([]);
    const [productVariantDragId, setProductVariantDragId] = useState<string | null>(null);
    const [productVariantDropIndex, setProductVariantDropIndex] = useState<number | null>(null);
    const [productVariantDragPreview, setProductVariantDragPreview] = useState<{ label: string; x: number; y: number } | null>(null);
    const productVariantDragIdRef = useRef<string | null>(null);
    const productVariantDropIndexRef = useRef<number | null>(null);
    const productVariantRowRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const productVariantPointerCleanupRef = useRef<(() => void) | null>(null);

    const [status, setStatus] = useState<CatalogProduct["status"]>("ACTIVE");
    const [organizationType, setOrganizationType] = useState("");
    const [vendor, setVendor] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [tagInputValue, setTagInputValue] = useState("");

    const [productError, setProductError] = useState<string | null>(null);
    const [productMissing, setProductMissing] = useState(false);
    const [timelineCommentDraft, setTimelineCommentDraft] = useState("");
    const [postingTimelineComment, setPostingTimelineComment] = useState(false);
    const [timelineDeleteCommentState, setTimelineDeleteCommentState] = useState<{ id: string; text: string } | null>(null);
    const [timelineDeleteCommentSaving, setTimelineDeleteCommentSaving] = useState(false);
    const [timelineDeleteCommentError, setTimelineDeleteCommentError] = useState<string | null>(null);
    const [categoryVariantConflict, setCategoryVariantConflict] = useState<{
        categoryId: string;
        categoryTitle: string;
        variantIds: string[];
    } | null>(null);

    const categoryModalSearchInputRef = useRef<HTMLInputElement | null>(null);
    const variantModalSearchInputRef = useRef<HTMLInputElement | null>(null);

    const hydrateEditState = useCallback((sourceProducts: CatalogProduct[], sourceCategories: ProductCategoryDefinition[]) => {
        if (!isEditMode || !productId) return;

        const existing = sourceProducts.find((product) => product.id === productId) ?? null;
        if (!existing) {
            setProductMissing(true);
            return;
        }

        setProductMissing(false);
        setTitle(existing.name);
        setDescription(existing.description ?? "");
        const existingProductTypePath = existing.productTypePath ?? [];
        setProductTypePath(existingProductTypePath.length > 0 ? existingProductTypePath : ["uncategorized"]);
        const existingCategoryIds = (existing.categoryIds ?? []).filter(
            (categoryId) => sourceCategories.some((category) => category.id === categoryId)
        );
        setSelectedCategoryIds(new Set(existingCategoryIds));
        setVariantSelections({ ...(existing.variants ?? {}) });
        setListedSalePrice(typeof existing.listedSalePrice === "number" && Number.isFinite(existing.listedSalePrice) ? String(existing.listedSalePrice) : "");
        setSku(existing.sku ?? "");
        setBarcode(existing.barcode ?? "");
        const categoryVariantIds = new Set(
            sourceCategories
                .filter((category) => existingCategoryIds.includes(category.id))
                .flatMap((category) => category.variantRules.map((rule) => rule.variantId))
        );
        setProductVariantRulesDraft((existing.productVariantRules ?? [])
            .map((rule) => ({
                variantId: rule.variantId,
                required: Boolean(rule.required),
            }))
            .filter((rule) => !categoryVariantIds.has(rule.variantId)));
        setStatus(existing.status ?? "ACTIVE");
        setOrganizationType(existing.organizationType ?? "");
        setVendor(existing.vendor ?? "");
        setTags(normalizeMultiValueList(existing.tags ?? []));
        setTagInputValue("");
    }, [isEditMode, productId]);

    useEffect(() => {
        let cancelled = false;

        const hydrate = async () => {
            try {
                const state = await fetchCatalogStateFromApi();
                if (cancelled) return;
                setProducts(state.products);
                setCategories(state.categoryDefinitions);
                setVariantDefinitions(state.variantDefinitions);
                setPurchaseOrders(state.purchaseOrders);
                setInventorySales(state.inventorySales);
                hydrateEditState(state.products, state.categoryDefinitions);
            } catch {
                if (cancelled) return;
                const fallbackProducts = getDefaultProducts();
                const fallbackCategories = getDefaultProductCategoryDefinitions();
                setProducts(fallbackProducts);
                setCategories(fallbackCategories);
                setVariantDefinitions(getDefaultVariantDefinitions());
                setPurchaseOrders([]);
                setInventorySales([]);
                hydrateEditState(fallbackProducts, fallbackCategories);
            } finally {
                if (!cancelled) {
                    setCatalogLoaded(true);
                }
            }
        };

        void hydrate();

        return () => {
            cancelled = true;
        };
    }, [hydrateEditState]);

    useEffect(() => {
        if (!categoryBrowseModalOpen) return;
        categoryModalSearchInputRef.current?.focus();
    }, [categoryBrowseModalOpen]);

    useEffect(() => {
        if (!variantsModalOpen) return;
        variantModalSearchInputRef.current?.focus();
    }, [variantsModalOpen]);

    useEffect(() => {
        if (!manageVariantsModalOpen) return;
        variantModalSearchInputRef.current?.focus();
    }, [manageVariantsModalOpen]);

    const manualCategories = useMemo(
        () => categories.filter((category) => category.type === "MANUAL"),
        [categories]
    );

    const sortedManualCategories = useMemo(() => {
        const next = [...manualCategories];
        next.sort((left, right) => {
            switch (categorySort) {
                case "TITLE_ASC":
                    return left.title.localeCompare(right.title, undefined, { sensitivity: "base" });
                case "TITLE_DESC":
                    return right.title.localeCompare(left.title, undefined, { sensitivity: "base" });
                case "NEWEST":
                    return new Date(right.updatedAt ?? right.createdAt ?? 0).getTime() - new Date(left.updatedAt ?? left.createdAt ?? 0).getTime();
                case "OLDEST":
                    return new Date(left.updatedAt ?? left.createdAt ?? 0).getTime() - new Date(right.updatedAt ?? right.createdAt ?? 0).getTime();
                default:
                    return 0;
            }
        });
        return next;
    }, [manualCategories, categorySort]);

    const selectedCategories = useMemo(
        () => sortedManualCategories.filter((category) => selectedCategoryIds.has(category.id)),
        [selectedCategoryIds, sortedManualCategories]
    );

    const filteredCategoryPickerResults = useMemo(() => {
        const query = categoryPickerQuery.trim().toLowerCase();
        if (!query) return sortedManualCategories;

        return sortedManualCategories.filter((category) => {
            if (categorySearchBy === "ID") {
                return category.id.toLowerCase().includes(query);
            }
            return category.title.toLowerCase().includes(query);
        });
    }, [categoryPickerQuery, categorySearchBy, sortedManualCategories]);

    const selectedCategoryVariantRules = useMemo(() => {
        const byVariantId = new Map<string, CategoryVariantRule>();

        selectedCategories.forEach((category) => {
            category.variantRules.forEach((rule) => {
                const existing = byVariantId.get(rule.variantId);
                if (!existing) {
                    byVariantId.set(rule.variantId, { variantId: rule.variantId, required: rule.required });
                    return;
                }
                if (rule.required && !existing.required) {
                    byVariantId.set(rule.variantId, { ...existing, required: true });
                }
            });
        });

        return Array.from(byVariantId.values());
    }, [selectedCategories]);

    const selectedCategoryVariantRuleIds = useMemo(
        () => new Set(selectedCategoryVariantRules.map((rule) => rule.variantId)),
        [selectedCategoryVariantRules]
    );

    useEffect(() => {
        setVariantSelections((current) => {
            const next: Record<string, string> = {};
            selectedCategoryVariantRules.forEach((rule) => {
                next[rule.variantId] = current[rule.variantId] ?? "";
            });
            return next;
        });
    }, [selectedCategoryVariantRules]);

    const categoryVariantDefinitionById = useMemo(() => {
        const map = new Map<string, VariantDefinition>();
        variantDefinitions.forEach((definition) => map.set(definition.id, definition));
        return map;
    }, [variantDefinitions]);

    const categoryVariantDefinitions = useMemo(
        () => selectedCategoryVariantRules
            .map((rule) => ({
                rule,
                definition: categoryVariantDefinitionById.get(rule.variantId),
            }))
            .filter((entry): entry is { rule: CategoryVariantRule; definition: VariantDefinition } => Boolean(entry.definition)),
        [categoryVariantDefinitionById, selectedCategoryVariantRules]
    );

    const hasRequiredCategoryVariantValues = useMemo(
        () => selectedCategoryVariantRules
            .filter((rule) => rule.required)
            .every((rule) => (variantSelections[rule.variantId] ?? "").trim().length > 0),
        [selectedCategoryVariantRules, variantSelections]
    );

    const sortedVariantDefinitions = useMemo(() => {
        const next = [...variantDefinitions];
        next.sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: "base" }));
        return next;
    }, [variantDefinitions]);

    const variantUsageCountById = useMemo(() => {
        const usage = new Map<string, number>();
        products.forEach((product) => {
            const usedIds = new Set<string>();
            Object.keys(product.variants ?? {}).forEach((variantId) => {
                if (variantId.trim()) usedIds.add(variantId);
            });
            (product.productVariantRules ?? []).forEach((rule) => {
                if (rule.variantId?.trim()) usedIds.add(rule.variantId);
            });
            usedIds.forEach((variantId) => {
                usage.set(variantId, (usage.get(variantId) ?? 0) + 1);
            });
        });
        return usage;
    }, [products]);

    const filteredVariantLibrary = useMemo(() => {
        const query = variantLibraryQuery.trim().toLowerCase();
        if (!query) return sortedVariantDefinitions;
        return sortedVariantDefinitions.filter((definition) => {
            if (variantLibrarySearchBy === "TYPE") return definition.inputType.toLowerCase().includes(query);
            if (variantLibrarySearchBy === "ID") return definition.id.toLowerCase().includes(query);
            return definition.label.toLowerCase().includes(query);
        });
    }, [sortedVariantDefinitions, variantLibraryQuery, variantLibrarySearchBy]);

    const pendingVariantDelete = useMemo(() => {
        if (!pendingVariantDeleteId) return null;
        const definition = variantDefinitions.find((entry) => entry.id === pendingVariantDeleteId) ?? null;
        if (!definition) return null;
        const usageCount = variantUsageCountById.get(definition.id) ?? 0;
        return { definition, usageCount };
    }, [pendingVariantDeleteId, variantDefinitions, variantUsageCountById]);

    const selectedProductVariantRuleIds = useMemo(
        () => new Set(productVariantRulesDraft.map((rule) => rule.variantId)),
        [productVariantRulesDraft]
    );

    const selectedProductVariantRuleIndexById = useMemo(() => {
        const next = new Map<string, number>();
        productVariantRulesDraft.forEach((rule, index) => next.set(rule.variantId, index));
        return next;
    }, [productVariantRulesDraft]);

    useEffect(() => {
        if (productVariantDragId && !selectedProductVariantRuleIds.has(productVariantDragId)) {
            if (typeof document !== "undefined") {
                document.body.classList.remove(COLUMN_DRAGGING_BODY_CLASS);
            }
            setProductVariantDragId(null);
            setProductVariantDropIndex(null);
            setProductVariantDragPreview(null);
            productVariantDragIdRef.current = null;
            productVariantDropIndexRef.current = null;
            productVariantPointerCleanupRef.current?.();
            productVariantPointerCleanupRef.current = null;
        }
    }, [productVariantDragId, selectedProductVariantRuleIds]);

    useEffect(() => () => {
        productVariantPointerCleanupRef.current?.();
        if (typeof document !== "undefined") {
            document.body.classList.remove(COLUMN_DRAGGING_BODY_CLASS);
        }
    }, []);

    const filteredVariantDefinitions = useMemo(() => {
        const query = variantPickerQuery.trim().toLowerCase();
        if (!query) return sortedVariantDefinitions;
        return sortedVariantDefinitions.filter((definition) => {
            if (variantSearchBy === "TYPE") {
                return definition.inputType.toLowerCase().includes(query);
            }
            if (variantSearchBy === "ID") {
                return definition.id.toLowerCase().includes(query);
            }
            return definition.label.toLowerCase().includes(query);
        });
    }, [sortedVariantDefinitions, variantPickerQuery, variantSearchBy]);

    const filteredProductVariantRules = useMemo(() => {
        const sortApplied = (() => {
            if (variantSort === "CUSTOM") return [...productVariantRulesDraft];
            const next = [...productVariantRulesDraft];
            next.sort((left, right) => {
                const leftDefinition = categoryVariantDefinitionById.get(left.variantId);
                const rightDefinition = categoryVariantDefinitionById.get(right.variantId);
                if (!leftDefinition || !rightDefinition) return 0;

                if (variantSort === "LABEL_ASC") {
                    return leftDefinition.label.localeCompare(rightDefinition.label, undefined, { sensitivity: "base" });
                }
                if (variantSort === "LABEL_DESC") {
                    return rightDefinition.label.localeCompare(leftDefinition.label, undefined, { sensitivity: "base" });
                }
                if (variantSort === "TYPE_ASC") {
                    const leftOrder = VARIANT_INPUT_TYPE_ORDER[leftDefinition.inputType] ?? 0;
                    const rightOrder = VARIANT_INPUT_TYPE_ORDER[rightDefinition.inputType] ?? 0;
                    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
                    return leftDefinition.label.localeCompare(rightDefinition.label, undefined, { sensitivity: "base" });
                }
                const leftOrder = VARIANT_INPUT_TYPE_ORDER[leftDefinition.inputType] ?? 0;
                const rightOrder = VARIANT_INPUT_TYPE_ORDER[rightDefinition.inputType] ?? 0;
                if (leftOrder !== rightOrder) return rightOrder - leftOrder;
                return rightDefinition.label.localeCompare(leftDefinition.label, undefined, { sensitivity: "base" });
            });
            return next;
        })();

        const query = variantPickerQuery.trim().toLowerCase();
        if (!query) return sortApplied;
        return sortApplied.filter((rule) => {
            const definition = categoryVariantDefinitionById.get(rule.variantId);
            if (!definition) return false;
            if (variantSearchBy === "TYPE") return definition.inputType.toLowerCase().includes(query);
            if (variantSearchBy === "ID") return definition.id.toLowerCase().includes(query);
            return definition.label.toLowerCase().includes(query);
        });
    }, [categoryVariantDefinitionById, productVariantRulesDraft, variantPickerQuery, variantSearchBy, variantSort]);

    const updateProductVariantDropIndex = (nextDropIndex: number) => {
        productVariantDropIndexRef.current = nextDropIndex;
        setProductVariantDropIndex((current) => (current === nextDropIndex ? current : nextDropIndex));
    };

    const commitProductVariantReorder = (nextDropIndex: number) => {
        const activeDragId = productVariantDragIdRef.current ?? productVariantDragId;
        if (!activeDragId) return;

        setProductVariantRulesDraft((current) => {
            const sourceIndex = current.findIndex((entry) => entry.variantId === activeDragId);
            if (sourceIndex < 0) return current;
            return reorderVariantRulesByInsertionIndex(current, sourceIndex, nextDropIndex);
        });

        if (typeof document !== "undefined") {
            document.body.classList.remove(COLUMN_DRAGGING_BODY_CLASS);
        }
        setProductVariantDropIndex(null);
        setProductVariantDragId(null);
        setProductVariantDragPreview(null);
        productVariantDragIdRef.current = null;
        productVariantDropIndexRef.current = null;
    };

    const clearProductVariantReorderDragState = () => {
        if (typeof document !== "undefined") {
            document.body.classList.remove(COLUMN_DRAGGING_BODY_CLASS);
        }
        setProductVariantDropIndex(null);
        setProductVariantDragId(null);
        setProductVariantDragPreview(null);
        productVariantDragIdRef.current = null;
        productVariantDropIndexRef.current = null;
    };

    const startProductVariantPointerDrag = (event: ReactPointerEvent<HTMLButtonElement>, variantId: string, sourceIndex: number) => {
        if (sourceIndex < 0 || sourceIndex >= productVariantRulesDraft.length) return;
        if (productVariantRulesDraft.length < 2) return;
        if (event.button !== 0) return;
        if (variantSort !== "CUSTOM" || variantPickerQuery.trim().length > 0) return;
        event.preventDefault();

        productVariantPointerCleanupRef.current?.();
        if (typeof document !== "undefined") {
            document.body.classList.add(COLUMN_DRAGGING_BODY_CLASS);
        }

        productVariantDragIdRef.current = variantId;
        productVariantDropIndexRef.current = sourceIndex;
        setProductVariantDragId(variantId);
        setProductVariantDropIndex(sourceIndex);
        setProductVariantDragPreview({
            label: categoryVariantDefinitionById.get(variantId)?.label ?? variantId,
            x: event.clientX,
            y: event.clientY,
        });

        const pointerId = event.pointerId;
        event.currentTarget.setPointerCapture(pointerId);

        const updateDropIndexFromClientY = (clientY: number) => {
            const currentRules = productVariantRulesDraft;
            let nextDropIndex = currentRules.length;
            for (let index = 0; index < currentRules.length; index += 1) {
                const row = productVariantRowRefs.current[currentRules[index].variantId];
                if (!row) continue;
                const rect = row.getBoundingClientRect();
                if (clientY < rect.top + rect.height / 2) {
                    nextDropIndex = index;
                    break;
                }
            }
            updateProductVariantDropIndex(nextDropIndex);
        };

        const cleanup = () => {
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
            window.removeEventListener("pointercancel", onPointerCancel);
            productVariantPointerCleanupRef.current = null;
        };

        const finish = (applyReorder: boolean) => {
            cleanup();
            if (!applyReorder) {
                clearProductVariantReorderDragState();
                return;
            }
            commitProductVariantReorder(productVariantDropIndexRef.current ?? sourceIndex);
        };

        const onPointerMove = (moveEvent: PointerEvent) => {
            if (moveEvent.pointerId !== pointerId) return;
            setProductVariantDragPreview((current) => (
                current
                    ? { ...current, x: moveEvent.clientX, y: moveEvent.clientY }
                    : current
            ));
            updateDropIndexFromClientY(moveEvent.clientY);
        };

        const onPointerUp = (upEvent: PointerEvent) => {
            if (upEvent.pointerId !== pointerId) return;
            finish(true);
        };

        const onPointerCancel = (cancelEvent: PointerEvent) => {
            if (cancelEvent.pointerId !== pointerId) return;
            finish(false);
        };

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
        window.addEventListener("pointercancel", onPointerCancel);
        productVariantPointerCleanupRef.current = cleanup;
    };

    const toggleProductVariantSelection = (variantId: string, checked: boolean) => {
        if (selectedCategoryVariantRuleIds.has(variantId)) return;
        setProductVariantRulesDraft((current) => {
            if (checked) {
                if (current.some((rule) => rule.variantId === variantId)) return current;
                return [...current, { variantId, required: false }];
            }
            return current.filter((rule) => rule.variantId !== variantId);
        });
    };

    const toggleProductVariantRequired = (variantId: string, required: boolean) => {
        setProductVariantRulesDraft((current) =>
            current.map((rule) => (
                rule.variantId === variantId
                    ? { ...rule, required }
                    : rule
            ))
        );
    };

    const toggleCategorySelection = (categoryId: string, checked: boolean) => {
        if (!checked) {
            setSelectedCategoryIds((current) => {
                const next = new Set(current);
                next.delete(categoryId);
                return next;
            });
            return;
        }

        const category = manualCategories.find((entry) => entry.id === categoryId);
        const overlapVariantIds = category
            ? category.variantRules
                .map((rule) => rule.variantId)
                .filter((variantId) => selectedProductVariantRuleIds.has(variantId))
            : [];

        if (overlapVariantIds.length > 0) {
            setCategoryVariantConflict({
                categoryId,
                categoryTitle: category?.title ?? "Selected category",
                variantIds: overlapVariantIds,
            });
            return;
        }

        setSelectedCategoryIds((current) => {
            const next = new Set(current);
            next.add(categoryId);
            return next;
        });
    };

    const cancelCategoryVariantConflict = useCallback(() => {
        setCategoryVariantConflict(null);
    }, []);

    const continueCategoryVariantConflict = useCallback(() => {
        if (!categoryVariantConflict) return;

        const removeSet = new Set(categoryVariantConflict.variantIds);
        setSelectedCategoryIds((current) => {
            const next = new Set(current);
            next.add(categoryVariantConflict.categoryId);
            return next;
        });
        setProductVariantRulesDraft((current) => current.filter((rule) => !removeSet.has(rule.variantId)));
        setCategoryVariantConflict(null);
    }, [categoryVariantConflict]);

    const openCategoryEdit = useCallback((categoryId: string) => {
        if (!categoryId) return;
        router.push(`/products/categories/${categoryId}`);
    }, [router]);

    const updateVariantSelection = (variantId: string, value: string) => {
        setVariantSelections((current) => ({
            ...current,
            [variantId]: value,
        }));
    };

    const addTagValues = useCallback((rawValue: string) => {
        let hasDuplicate = false;
        setTags((current) => {
            const { nextValues, duplicateValues } = appendMultiValueInput(current, rawValue);
            hasDuplicate = duplicateValues.length > 0;
            return nextValues;
        });
        if (hasDuplicate) {
            notifyPortalAction({ message: DUPLICATE_VALUE_MESSAGE, tone: "warning" });
        }
    }, []);

    const removeTagValue = useCallback((valueToRemove: string) => {
        setTags((current) => removeMultiValue(current, valueToRemove));
    }, []);

    const addNewVariantValues = (rawValue: string) => {
        let hasDuplicate = false;
        setNewVariantValuesDraft((current) => {
            const { nextValues, duplicateValues } = appendMultiValueInput(current, rawValue);
            hasDuplicate = duplicateValues.length > 0;
            return nextValues;
        });
        if (hasDuplicate) {
            notifyPortalAction({ message: DUPLICATE_VALUE_MESSAGE, tone: "warning" });
        }
    };

    const removeNewVariantValue = (valueToRemove: string) => {
        setNewVariantValuesDraft((current) => removeMultiValue(current, valueToRemove));
    };

    const addEditVariantValues = (rawValue: string) => {
        let hasDuplicate = false;
        setEditVariantValuesDraft((current) => {
            const { nextValues, duplicateValues } = appendMultiValueInput(current, rawValue);
            hasDuplicate = duplicateValues.length > 0;
            return nextValues;
        });
        if (hasDuplicate) {
            notifyPortalAction({ message: DUPLICATE_VALUE_MESSAGE, tone: "warning" });
        }
    };

    const removeEditVariantValue = (valueToRemove: string) => {
        if (editingVariantId) {
            const usageCount = countVariantOptionUsage(products, editingVariantId, valueToRemove);
            if (usageCount > 0) {
                notifyPortalAction({
                    message: buildVariantOptionInUseMessage(valueToRemove, usageCount),
                    tone: "warning",
                });
                return;
            }
        }
        setEditVariantValuesDraft((current) => removeMultiValue(current, valueToRemove));
    };

    const openEditVariant = (variantId: string) => {
        const existing = variantDefinitions.find((variant) => variant.id === variantId);
        if (!existing) return;
        setEditingVariantId(variantId);
        setEditVariantNameDraft(existing.label);
        setEditVariantValuesDraft(normalizeMultiValueList(existing.values));
        setEditVariantValueInput("");
        setEditVariantError(null);
        setVariantManagerError(null);
    };

    const closeEditVariant = () => {
        setEditingVariantId(null);
        setEditVariantNameDraft("");
        setEditVariantValuesDraft([]);
        setEditVariantValueInput("");
        setEditVariantError(null);
    };

    const createVariant = async () => {
        setVariantManagerError(null);
        const label = newVariantNameDraft.trim();
        if (!label) {
            setNewVariantError("name");
            return;
        }

        const hasConflict = variantDefinitions.some((definition) => (
            definition.label.localeCompare(label, undefined, { sensitivity: "base" }) === 0
                || definition.id.localeCompare(label, undefined, { sensitivity: "base" }) === 0
        ));
        if (hasConflict) {
            setNewVariantError("conflict");
            return;
        }

        const createValuesResult = newVariantTypeDraft === "select"
            ? appendMultiValueInput(newVariantValuesDraft, newVariantValueInput)
            : null;
        const createValues = createValuesResult?.nextValues ?? [];
        if (createValuesResult && createValuesResult.duplicateValues.length > 0) {
            notifyPortalAction({ message: DUPLICATE_VALUE_MESSAGE, tone: "warning" });
        }

        if (newVariantTypeDraft === "select" && createValues.length === 0) {
            setNewVariantError("selectValues");
            return;
        }

        const id = createUniqueVariantId(label, variantDefinitions);
        const nextVariant: VariantDefinition = {
            id,
            label,
            inputType: newVariantTypeDraft,
            values: newVariantTypeDraft === "select" ? normalizeMultiValueList(createValues) : [],
        };

        const nextDefinitions = [...variantDefinitions, nextVariant];
        setVariantDefinitions(nextDefinitions);
        setNewVariantNameDraft("");
        setNewVariantTypeDraft("select");
        setNewVariantValuesDraft([]);
        setNewVariantValueInput("");
        setNewVariantError(null);

        try {
            await saveCatalogStateToApi({ variantDefinitions: nextDefinitions });
        } catch {
            setVariantManagerError("Unable to save new variant right now.");
        }
    };

    const saveEditedVariant = async () => {
        if (!editingVariantId) return;
        setVariantManagerError(null);

        const existing = variantDefinitions.find((variant) => variant.id === editingVariantId);
        if (!existing) return;

        const label = editVariantNameDraft.trim();
        if (!label) {
            setEditVariantError("name");
            return;
        }

        const hasConflict = variantDefinitions.some((definition) => (
            definition.id !== editingVariantId
            && (
                definition.label.localeCompare(label, undefined, { sensitivity: "base" }) === 0
                || definition.id.localeCompare(label, undefined, { sensitivity: "base" }) === 0
            )
        ));
        if (hasConflict) {
            setEditVariantError("conflict");
            return;
        }

        const editValuesResult = existing.inputType === "select"
            ? appendMultiValueInput(editVariantValuesDraft, editVariantValueInput)
            : null;
        const editValues = editValuesResult?.nextValues ?? [];
        if (editValuesResult && editValuesResult.duplicateValues.length > 0) {
            notifyPortalAction({ message: DUPLICATE_VALUE_MESSAGE, tone: "warning" });
        }

        if (existing.inputType === "select" && editValues.length === 0) {
            setEditVariantError("selectValues");
            return;
        }

        if (existing.inputType === "select") {
            const removedValues = existing.values.filter((value) => !editValues.includes(value));
            const blockedValue = removedValues.find((value) => countVariantOptionUsage(products, editingVariantId, value) > 0);
            if (blockedValue) {
                const usageCount = countVariantOptionUsage(products, editingVariantId, blockedValue);
                notifyPortalAction({
                    message: buildVariantOptionInUseMessage(blockedValue, usageCount),
                    tone: "warning",
                });
                return;
            }
        }

        const nextDefinitions = variantDefinitions.map((definition) => {
            if (definition.id !== editingVariantId) return definition;
            return {
                ...definition,
                label,
                values: definition.inputType === "select" ? normalizeMultiValueList(editValues) : [],
            };
        });

        setVariantDefinitions(nextDefinitions);
        closeEditVariant();
        try {
            await saveCatalogStateToApi({ variantDefinitions: nextDefinitions });
        } catch {
            setVariantManagerError("Unable to update variant right now.");
        }
    };

    const openVariantDeleteConfirm = (variantId: string) => {
        setPendingVariantDeleteId(variantId);
        setPendingVariantDeleteError(null);
    };

    const closeVariantDeleteConfirm = () => {
        if (pendingVariantDeleteSubmitting) return;
        setPendingVariantDeleteId(null);
        setPendingVariantDeleteError(null);
    };

    const deleteVariant = async (variantId: string) => {
        setVariantManagerError(null);
        try {
            const payload = await deleteCatalogEntriesFromApi({
                entity: "variables",
                keys: [variantId],
            });
            const state = payload.state ?? await fetchCatalogStateFromApi();
            setVariantDefinitions(state.variantDefinitions);
            setCategories(state.categoryDefinitions);
            setProducts(state.products);
            setProductVariantRulesDraft((current) => current.filter((rule) => rule.variantId !== variantId));
            setVariantSelections((current) => {
                const next = { ...current };
                delete next[variantId];
                return next;
            });
            if (editingVariantId === variantId) {
                closeEditVariant();
            }
            return { ok: true as const };
        } catch {
            const message = "Unable to delete variant.";
            setVariantManagerError(message);
            return { ok: false as const, message };
        }
    };

    const confirmVariantDelete = async () => {
        if (!pendingVariantDeleteId) return;
        setPendingVariantDeleteSubmitting(true);
        setPendingVariantDeleteError(null);
        try {
            const result = await deleteVariant(pendingVariantDeleteId);
            if (!result?.ok) {
                setPendingVariantDeleteError(result?.message ?? "Unable to delete variant.");
                return;
            }
            setPendingVariantDeleteId(null);
            setPendingVariantDeleteError(null);
        } finally {
            setPendingVariantDeleteSubmitting(false);
        }
    };

    const productTypeLevels = useMemo(() => getProductTypeLevels(productTypePath), [productTypePath]);
    const productTypePathLabel = useMemo(
        () => getProductTypePathLabel(productTypePath, language as LanguageCode),
        [language, productTypePath]
    );

    const currentStoreQuantity = useMemo(() => {
        if (!isEditMode || !productId) return 0;
        const existing = products.find((product) => product.id === productId);
        if (!existing) return 0;
        return Math.max(0, Math.round(existing.inventory));
    }, [isEditMode, productId, products]);

    const applyCatalogState = useCallback((state: Awaited<ReturnType<typeof fetchCatalogStateFromApi>>) => {
        setProducts(state.products);
        setCategories(state.categoryDefinitions);
        setVariantDefinitions(state.variantDefinitions);
        setPurchaseOrders(state.purchaseOrders);
        setInventorySales(state.inventorySales);
    }, []);

    const timelineLocale = useMemo(() => {
        switch (language) {
            case "da":
                return "da-DK";
            case "de":
                return "de-DE";
            case "fr":
                return "fr-FR";
            case "es":
                return "es-ES";
            case "zh":
                return "zh-CN";
            case "en":
            default:
                return "en-US";
        }
    }, [language]);

    const productTimelineData = useMemo(() => {
        if (!isEditMode || !productId) {
            return {
                events: [] as ProductTimelineEvent[],
            };
        }

        const product = products.find((entry) => entry.id === productId) ?? null;
        const salesByBatchId = new Map<string, InventorySale[]>();
        inventorySales
            .filter((sale) => sale.productId === productId)
            .forEach((sale) => {
                const current = salesByBatchId.get(sale.batchId) ?? [];
                current.push(sale);
                salesByBatchId.set(sale.batchId, current);
            });
        const variantLabelById = new Map(variantDefinitions.map((definition) => [definition.id, definition.label]));

        const events: ProductTimelineEvent[] = [];

        purchaseOrders.forEach((order) => {
            order.lines
                .filter((line) => line.productId === productId)
                .forEach((line) => {
                    const lineSales = salesByBatchId.get(line.id) ?? [];
                    const maintenanceEntries = line.maintenanceEntries ?? [];
                    const purchaseDateTimestamp = parseDateOnlyTimestamp(order.purchaseDate);
                    const orderCreatedAtTimestamp = parseIsoTimestamp(order.createdAt);
                    const supplierName = order.supplierName || "Unknown supplier";
                    const lineVariantSummary = Object.entries(line.variantValues ?? {})
                        .filter(([, value]) => value.trim().length > 0)
                        .map(([variantId, value]) => `${variantLabelById.get(variantId) ?? variantId}: ${value}`)
                        .slice(0, 2)
                        .join(" • ");

                    events.push({
                        id: `event-po-${order.id}-${line.id}`,
                        type: "purchase-order",
                        timestamp: purchaseDateTimestamp || orderCreatedAtTimestamp,
                        title: `Purchase order ${order.poNumber}`,
                        details: `Quantity added: ${line.quantity} unit${line.quantity === 1 ? "" : "s"}${lineVariantSummary ? ` • ${lineVariantSummary}` : ""}`,
                        meta: `Supplier: ${supplierName} • Unit cost: ${formatMoney(line.unitCost, order.supplierCurrency, timelineLocale)}`,
                        editable: true,
                        purchaseOrderId: order.id,
                        lineId: line.id,
                        amount: line.unitCost,
                        currency: order.supplierCurrency,
                    });

                    maintenanceEntries.forEach((entry) => {
                        const maintenanceTimestamp = parseIsoTimestamp(entry.createdAt);
                        events.push({
                            id: `event-maintenance-${line.id}-${entry.id}`,
                            type: "maintenance",
                            timestamp: maintenanceTimestamp,
                            title: "Maintenance",
                            details: entry.description,
                            meta: `Cost: ${formatMoney(entry.amount, entry.currency, timelineLocale)} • Purchase order: ${order.poNumber}`,
                            editable: true,
                            purchaseOrderId: order.id,
                            lineId: line.id,
                            maintenanceEntryId: entry.id,
                            amount: entry.amount,
                            currency: entry.currency,
                        });
                    });

                    lineSales.forEach((sale) => {
                        const soldAtTimestamp = parseIsoTimestamp(sale.soldAt);
                        const quantityText = `${sale.quantity} unit${sale.quantity === 1 ? "" : "s"}`;
                        events.push({
                            id: `event-sale-${sale.id}`,
                            type: "sale",
                            timestamp: soldAtTimestamp,
                            title: "Sale",
                            details: `Quantity sold: ${quantityText}`,
                            meta: `Final unit price: ${formatMoney(sale.saleUnitPrice, sale.currency, timelineLocale)} • Total: ${formatMoney(sale.totalAmount, sale.currency, timelineLocale)}`,
                            editable: true,
                            saleId: sale.id,
                            lineId: sale.batchId,
                            amount: sale.saleUnitPrice,
                            currency: sale.currency,
                        });
                    });
                });
        });

        (product?.timelineComments ?? []).forEach((comment: ProductTimelineComment) => {
            const timestamp = parseIsoTimestamp(comment.createdAt);
            events.push({
                id: `event-comment-${comment.id}`,
                type: "comment",
                timestamp,
                title: "Comment",
                details: comment.text,
                deletable: true,
                commentId: comment.id,
                authorName: (comment.authorName ?? timelineCommenterName).trim() || timelineCommenterName,
                storeName: (comment.storeName ?? timelineCommenterStoreName).trim() || timelineCommenterStoreName,
            });
        });

        events.sort((left, right) => {
            if (left.timestamp !== right.timestamp) return right.timestamp - left.timestamp;
            return right.id.localeCompare(left.id);
        });

        return { events };
    }, [
        inventorySales,
        isEditMode,
        productId,
        products,
        purchaseOrders,
        timelineCommenterName,
        timelineCommenterStoreName,
        variantDefinitions,
        timelineLocale,
    ]);

    const canSaveProduct = useMemo(
        () => title.trim().length > 0 && hasRequiredCategoryVariantValues,
        [title, hasRequiredCategoryVariantValues]
    );

    const onSaveProduct = useCallback(async () => {
        if (!canSaveProduct) return false;

        const normalizedTags = normalizeMultiValueList([
            ...tags,
            ...tokenizeMultiValueInput(tagInputValue),
        ]);

        const selectedCategoryIdList = Array.from(selectedCategoryIds);
        const selectedCategoryTitle = categories.find((category) => category.id === selectedCategoryIdList[0])?.title ?? "";

        const normalizedVariants = Object.fromEntries(
            Object.entries(variantSelections)
                .map(([key, value]) => [key, value.trim()])
                .filter(([, value]) => value.length > 0)
        );

        const skuValue = sku.trim() || createRandomProductSku("VLR");
        const listedPriceValue = listedSalePrice.trim().length > 0
            ? Number(listedSalePrice)
            : Number.NaN;
        const listedPrice = Number.isFinite(listedPriceValue) && listedPriceValue >= 0
            ? listedPriceValue
            : undefined;

        const normalizedProductTypePath = normalizeProductTypePath(productTypePath);
        const defaultTaxPercent = getDefaultTaxPercentForProductType(normalizedProductTypePath);
        const nowIso = new Date().toISOString();
        const existingProduct = isEditMode && productId
            ? products.find((product) => product.id === productId) ?? null
            : null;
        if (isEditMode && !existingProduct) {
            setProductError("Product not found.");
            return false;
        }

        const nextProduct: CatalogProduct = {
            ...(existingProduct ?? {
                id: `prod_${Date.now()}`,
                inventory: 0,
            }),
            name: title.trim(),
            description: description.trim() || undefined,
            sku: skuValue,
            status,
            productTypePath: normalizedProductTypePath,
            productTypeLabel: getProductTypePathLabel(normalizedProductTypePath, language as LanguageCode),
            defaultTaxPercent,
            listedSalePrice: listedPrice,
            organizationType: organizationType.trim() || undefined,
            vendor: vendor.trim() || undefined,
            barcode: barcode.trim() || undefined,
            category: selectedCategoryTitle,
            categoryIds: selectedCategoryIdList,
            updatedAt: nowIso,
            tags: normalizedTags,
            variants: normalizedVariants,
            productVariantRules: productVariantRulesDraft.map((rule) => ({
                variantId: rule.variantId,
                required: Boolean(rule.required),
            })),
        };

        const nextProducts = existingProduct
            ? products.map((product) => (product.id === existingProduct.id ? nextProduct : product))
            : [nextProduct, ...products];

        const selectedCategorySet = new Set(selectedCategoryIdList);
        const nextCategories = categories.map((category) => {
            if (!existingProduct) {
                return selectedCategorySet.has(category.id)
                    ? { ...category, products: category.products + 1 }
                    : category;
            }

            const previousSet = new Set(existingProduct.categoryIds);
            const wasSelected = previousSet.has(category.id);
            const isSelected = selectedCategorySet.has(category.id);
            if (wasSelected === isSelected) return category;
            return {
                ...category,
                products: isSelected
                    ? category.products + 1
                    : Math.max(0, category.products - 1),
            };
        });

        try {
            await saveCatalogStateToApi({
                products: nextProducts,
                categoryDefinitions: nextCategories,
            });
        } catch {
            setProductError(isEditMode ? "Unable to update product. Please try again." : "Unable to create product. Please try again.");
            return false;
        }

        setProducts(nextProducts);
        setCategories(nextCategories);
        router.push("/products");
        return true;
    }, [
        canSaveProduct,
        tagInputValue,
        tags,
        selectedCategoryIds,
        categories,
        variantSelections,
        sku,
        listedSalePrice,
        productTypePath,
        title,
        description,
        status,
        language,
        organizationType,
        vendor,
        barcode,
        productVariantRulesDraft,
        products,
        isEditMode,
        productId,
        router,
    ]);

    const postTimelineComment = useCallback(async () => {
        if (!isEditMode || !productId) return;

        const text = timelineCommentDraft.trim();
        if (!text) {
            notifyPortalAction({ message: "Write a comment before posting.", tone: "warning" });
            return;
        }

        setPostingTimelineComment(true);
        try {
            const current = await fetchCatalogStateFromApi();
            const nowIso = new Date().toISOString();
            const nextProducts = current.products.map((product) => {
                if (product.id !== productId) return product;
                const nextComments = [
                    ...(product.timelineComments ?? []),
                    {
                        id: createTimelineCommentId(),
                        text,
                        authorName: timelineCommenterName,
                        storeName: timelineCommenterStoreName,
                        createdAt: nowIso,
                        updatedAt: nowIso,
                    },
                ];
                return {
                    ...product,
                    timelineComments: nextComments,
                };
            });

            const nextState = await saveCatalogStateToApi({
                products: nextProducts,
            });
            applyCatalogState(nextState);
            setTimelineCommentDraft("");
            notifyPortalAction({ message: "Timeline comment posted.", tone: "success" });
        } catch {
            notifyPortalAction({ message: "Unable to post timeline comment right now.", tone: "error" });
        } finally {
            setPostingTimelineComment(false);
        }
    }, [applyCatalogState, isEditMode, productId, timelineCommentDraft, timelineCommenterName, timelineCommenterStoreName]);

    const openTimelineEdit = useCallback((event: ProductTimelineEvent) => {
        if (!event.editable) return;
        if (event.type === "purchase-order" && event.purchaseOrderId) {
            router.push(`/products/purchase-orders/${event.purchaseOrderId}`);
            return;
        }
        if (event.type === "maintenance" && productId && event.lineId && event.maintenanceEntryId) {
            const params = new URLSearchParams({
                productId,
                batchId: event.lineId,
                maintenanceId: event.maintenanceEntryId,
            });
            router.push(`/products/inventory/maintenance?${params.toString()}`);
            return;
        }
        if (event.type === "sale" && productId) {
            const params = new URLSearchParams({ productId });
            if (event.lineId) params.set("batchId", event.lineId);
            if (event.saleId) params.set("saleId", event.saleId);
            router.push(`/products/inventory/sell?${params.toString()}`);
        }
    }, [productId, router]);

    const openTimelineCommentDelete = useCallback((event: ProductTimelineEvent) => {
        if (!event.commentId || event.type !== "comment") return;
        setTimelineDeleteCommentState({ id: event.commentId, text: event.details });
        setTimelineDeleteCommentError(null);
    }, []);

    const closeTimelineCommentDelete = useCallback(() => {
        if (timelineDeleteCommentSaving) return;
        setTimelineDeleteCommentState(null);
        setTimelineDeleteCommentError(null);
    }, [timelineDeleteCommentSaving]);

    const confirmTimelineCommentDelete = useCallback(async () => {
        if (!timelineDeleteCommentState || !productId) return;
        setTimelineDeleteCommentSaving(true);
        setTimelineDeleteCommentError(null);
        try {
            const current = await fetchCatalogStateFromApi();
            const nextProducts = current.products.map((product) => {
                if (product.id !== productId) return product;
                return {
                    ...product,
                    timelineComments: (product.timelineComments ?? []).filter((comment) => comment.id !== timelineDeleteCommentState.id),
                };
            });
            const nextState = await saveCatalogStateToApi({ products: nextProducts });
            applyCatalogState(nextState);
            setTimelineDeleteCommentState(null);
            notifyPortalAction({ message: "Comment deleted.", tone: "success" });
        } catch {
            setTimelineDeleteCommentError("Unable to delete comment right now.");
        } finally {
            setTimelineDeleteCommentSaving(false);
        }
    }, [applyCatalogState, productId, timelineDeleteCommentState]);

    usePendingChangesHeader({
        active: !isEditMode || (catalogLoaded && !productMissing),
        scope: "productCreate",
        discardLabelVariant: "cancel",
        saveDisabled: !canSaveProduct || (isEditMode && (!catalogLoaded || productMissing)),
        onSave: onSaveProduct,
        onDiscard: () => router.push("/products"),
    });

    const newVariantErrorMessage = newVariantError === "name"
        ? "Variant name is required."
        : newVariantError === "conflict"
            ? "A variant with this name already exists."
            : newVariantError === "selectValues"
                ? "Select variants need at least one value."
                : null;

    const editVariantErrorMessage = editVariantError === "name"
        ? "Variant name is required."
        : editVariantError === "conflict"
            ? "A variant with this name already exists."
            : editVariantError === "selectValues"
                ? "Select variants need at least one value."
                : null;

    if (isEditMode && !catalogLoaded) {
        return (
            <section className="portalProductCreatePage__A3m8Q1 portalProductCreateTarget768__R2m8Q6">
                <PortalPageTitle
                    page="products"
                    title="Edit product"
                    icon={<PackagePlus className="portalPageHeadingIcon__Q8m2D5" aria-hidden="true" />}
                />
                <section className="portalProductCreateMainCard__N4m8Q3 ui-surface-card portalProductCreateMissing__H9m2Q4">
                    <p>Loading product...</p>
                </section>
            </section>
        );
    }

    if (isEditMode && catalogLoaded && productMissing) {
        return (
            <section className="portalProductCreatePage__A3m8Q1 portalProductCreateTarget768__R2m8Q6">
                <PortalPageTitle
                    page="products"
                    title="Edit product"
                    icon={<PackagePlus className="portalPageHeadingIcon__Q8m2D5" aria-hidden="true" />}
                />
                <section className="portalProductCreateMainCard__N4m8Q3 ui-surface-card portalProductCreateMissing__H9m2Q4">
                    <p>Product not found.</p>
                </section>
            </section>
        );
    }

    return (
        <section className="portalProductCreatePage__A3m8Q1 portalProductCreateTarget768__R2m8Q6">
            <PortalPageTitle
                page="products"
                title={isEditMode ? "Edit product" : "Add product"}
                icon={<PackagePlus className="portalPageHeadingIcon__Q8m2D5" aria-hidden="true" />}
            />

            <div className="portalProductCreateLayout__F7m2Q1">
                <div className="portalProductCreateMainColumn__R7m2Q9">
                    <section className="portalProductCreateMainCard__N4m8Q3 ui-surface-card">
                        <ProductSectionHeader
                            title="Product details"
                            description="Set title, description, and a general product type for better filtering and defaults."
                            showTooltip={false}
                        />

                        <label className="form__group__K7p2s0">
                            <span className="form__label__B9f4k0">Title</span>
                            <input
                                className="form__input__Z3n7q0"
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                                placeholder="Product title"
                            />
                        </label>

                        <label className="form__group__K7p2s0">
                            <span className="form__label__B9f4k0">Description</span>
                            <textarea
                                className="form__textarea__Q6p3f0"
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                                rows={4}
                                placeholder="Describe this product"
                            />
                        </label>

                        <div className="form__group__K7p2s0">
                            <span className="form__label__B9f4k0">Product type</span>
                            <div className="portalProductTypeChain__M5m2Q9">
                                {productTypeLevels.levels.map((options, levelIndex) => (
                                    <select
                                        key={`product-type-level-${levelIndex}`}
                                        className="form__select__P9j2k0"
                                        value={productTypeLevels.normalizedPath[levelIndex] ?? ""}
                                        onChange={(event) => {
                                            const nextPath = resolvePathFromLevels(productTypePath, levelIndex, event.target.value);
                                            setProductTypePath(nextPath);
                                        }}
                                    >
                                        <option value="" disabled>
                                            Select
                                        </option>
                                        {options.map((option) => (
                                            <option key={option.id} value={option.id}>
                                                {getProductTypeLabel(language as LanguageCode, option.id)}
                                            </option>
                                        ))}
                                    </select>
                                ))}
                            </div>
                            <p className="portalProductCreateHint__A8m2Q1">
                                Selected: {productTypePathLabel || getProductTypeLabel(language as LanguageCode, "uncategorized")}
                            </p>
                        </div>
                    </section>

                    <section className="portalProductCreateMainCard__N4m8Q3 ui-surface-card">
                        <ProductSectionHeader
                            title="Categories"
                            description="Search, sort, and attach one or more of your store categories."
                        />

                        <div className="portalCategoryCreatePickerToolbar__P6m8Q1">
                            <label className="portalCategoryCreateSearchField__Q6m2Q8">
                                <Search aria-hidden="true" />
                                <input
                                    className="form__input__Z3n7q0 portalCategoryCreateSearchInput__T6m2Q3"
                                    value={categoryPickerQuery}
                                    onChange={(event) => {
                                        setCategoryPickerQuery(event.target.value);
                                        if (event.target.value.trim().length > 0) {
                                            setCategoryBrowseModalOpen(true);
                                        }
                                    }}
                                    placeholder="Search categories"
                                />
                            </label>
                            <Button type="button" kind="basic" size="xsmall" onClick={() => setCategoryBrowseModalOpen(true)}>
                                Browse
                            </Button>
                            <label className="portalCategoryCreateSearchByField__U2m8Q4 portalCategoryCreateSortField__X2m8Q1">
                                <span className="portalCategoryCreateSearchByPrefix__A8m2Q3">Sort by{" "}</span>
                                <select
                                    className="form__select__P9j2k0 portalCategoryCreateSearchBySelect__V2m8Q4 portalCategoryCreateSortSelect__J4m8Q2"
                                    value={categorySort}
                                    onChange={(event) => setCategorySort(event.target.value as ProductCategorySort)}
                                >
                                    <option value="TITLE_ASC">Title A-Z</option>
                                    <option value="TITLE_DESC">Title Z-A</option>
                                    <option value="NEWEST">Newest</option>
                                    <option value="OLDEST">Oldest</option>
                                </select>
                            </label>
                        </div>

                        {selectedCategories.length === 0 ? (
                            <div className="portalCategoryCreateEmptySupply__B3m2Q8">
                                <PackageSearch aria-hidden="true" />
                                <p>There are no categories attached to this product.</p>
                                <small>Search or browse to add categories.</small>
                            </div>
                        ) : (
                            <div className="portalCategoryCreateSupplyList__Q5m2Q8 portalProductCreateCategorySelectionList__A4m2Q8">
                                {selectedCategories.map((category) => (
                                    <div key={category.id} className="portalProductsColumnOptionItem__A4m2Q7">
                                        <div className="portalProductsColumnOptionRow__H4m8Q7">
                                            <label className="portalProductsColumnOption__V2m8Q6">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCategoryIds.has(category.id)}
                                                    onChange={(event) => toggleCategorySelection(category.id, event.target.checked)}
                                                />
                                                <span className="portalProductsColumnOptionLabel__K7m2Q1">{category.title}</span>
                                            </label>
                                            <span className="portalProductsColumnOrderControls__D3m8Q9 portalProductCreateCategorySelectionMeta__V8m2Q4">
                                                <span className="portalCategoryCreateBrowseItemMeta__X7m2Q4">{category.id}</span>
                                                <button
                                                    type="button"
                                                    className="portalCategoryCreateInlineLink__W4m8Q2"
                                                    onClick={() => openCategoryEdit(category.id)}
                                                >
                                                    Edit category
                                                </button>
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {selectedCategories.length > 0 ? (
                        <section className="portalProductCreateMainCard__N4m8Q3 ui-surface-card">
                            <ProductSectionHeader
                                title="Category variants"
                                description="Fill required and optional fields from the categories selected above."
                                action={(
                                    <button
                                        type="button"
                                        className="portalCategoryCreateInlineLink__W4m8Q2"
                                        onClick={() => {
                                            setVariantManagerError(null);
                                            setManageVariantsModalOpen(true);
                                        }}
                                    >
                                        Manage variants
                                    </button>
                                )}
                            />

                            <div className="portalProductCreateVariantGrid__C7m2Q6">
                                {categoryVariantDefinitions.length === 0 ? (
                                    <p className="portalProductCreateHint__A8m2Q1">
                                        No category variants required yet.
                                    </p>
                                ) : (
                                    categoryVariantDefinitions.map(({ rule, definition }) => (
                                        <div key={definition.id} className="form__group__K7p2s0">
                                            <span className="form__label__B9f4k0">
                                                {rule.required ? <span className="portalProductCreateRequiredStar__H4m2Q8" aria-hidden="true">*</span> : null}
                                                {definition.label}
                                            </span>

                                            {definition.inputType === "select" ? (
                                                <select
                                                    className="form__select__P9j2k0"
                                                    value={variantSelections[definition.id] ?? ""}
                                                    onChange={(event) => updateVariantSelection(definition.id, event.target.value)}
                                                >
                                                    <option value="">Select value</option>
                                                    {definition.values.map((value) => (
                                                        <option key={value} value={value}>{value}</option>
                                                    ))}
                                                </select>
                                            ) : null}

                                            {definition.inputType === "input" ? (
                                                <input
                                                    className="form__input__Z3n7q0"
                                                    value={variantSelections[definition.id] ?? ""}
                                                    onChange={(event) => updateVariantSelection(definition.id, event.target.value)}
                                                    placeholder={`Enter ${definition.label.toLowerCase()}`}
                                                />
                                            ) : null}

                                            {definition.inputType === "textarea" ? (
                                                <textarea
                                                    className="form__textarea__Q6p3f0"
                                                    value={variantSelections[definition.id] ?? ""}
                                                    onChange={(event) => updateVariantSelection(definition.id, event.target.value)}
                                                    rows={4}
                                                    placeholder={`Enter ${definition.label.toLowerCase()}`}
                                                />
                                            ) : null}

                                            {definition.inputType === "date" ? (
                                                <input
                                                    className="form__input__Z3n7q0"
                                                    type="date"
                                                    value={variantSelections[definition.id] ?? ""}
                                                    onChange={(event) => updateVariantSelection(definition.id, event.target.value)}
                                                />
                                            ) : null}
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>
                    ) : null}

                    <section className="portalProductCreateMainCard__N4m8Q3 ui-surface-card">
                        <ProductSectionHeader
                            title="Pricing"
                            description="Set an optional default sale price used as a baseline."
                        />

                        <label className="form__group__K7p2s0">
                            <span className="form__label__B9f4k0">Default sale price</span>
                            <div className="portalProductCreateMoneyField__M4n2Q9">
                                <span className="portalProductCreateMoneyFieldCurrency__T6m2Q7">
                                    <span className="portalProductCreateMoneyFieldCode__M9k2P4">{effectiveStoreCurrency}</span>
                                </span>
                                <input
                                    className="portalProductCreateMoneyFieldAmount__W8m2Q5"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={listedSalePrice}
                                    onChange={(event) => setListedSalePrice(event.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                        </label>

                        <p className="portalProductCreateHint__A8m2Q1">
                            Purchase-order line prices remain the source of truth for inventory costs.
                        </p>
                    </section>

                    <section className="portalProductCreateMainCard__N4m8Q3 ui-surface-card">
                        <ProductSectionHeader
                            title="Inventory & identifiers"
                            description="Inventory is added through purchase orders. SKU and barcode are optional."
                        />

                        <p className="portalProductCreateCurrencyHint__K8m2Q5">
                            Current store currency is <strong>{messages.currencyValues[effectiveStoreCurrency] ?? effectiveStoreCurrency}</strong>. Add inventory from Purchase Orders.
                        </p>

                        <div className="portalProductCreateInventorySummaryWrap__V9m2Q7 portalProductsTableScroll__H7q2M4">
                            <table className="portalProductsTable__E8n4Q7 portalProductCreateInventorySummaryTable__T4m2Q9">
                                <thead>
                                    <tr>
                                        <th>Store location</th>
                                        <th>Quantity</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Store Location</td>
                                        <td>{currentStoreQuantity}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="portalProductCreateIdentifiersGrid__M4m2Q8">
                            <div className="portalProductCreateSkuField__X7m2Q9">
                                <label className="form__group__K7p2s0">
                                    <span className="form__label__B9f4k0">SKU</span>
                                    <input
                                        className="form__input__Z3n7q0"
                                        value={sku}
                                        onChange={(event) => setSku(event.target.value)}
                                        placeholder="SKU"
                                    />
                                </label>
                                <button
                                    type="button"
                                    className="portalCategoryCreateInlineLink__W4m8Q2 portalProductCreateSkuGenerateLink__R8m2Q5"
                                    onClick={() => setSku(createRandomProductSku("VLR"))}
                                >
                                    Auto-generate SKU
                                </button>
                            </div>

                            <label className="form__group__K7p2s0">
                                <span className="form__label__B9f4k0">Barcode</span>
                                <input
                                    className="form__input__Z3n7q0"
                                    value={barcode}
                                    onChange={(event) => setBarcode(event.target.value)}
                                    placeholder="Barcode"
                                />
                            </label>
                        </div>
                    </section>

                    <section className="portalProductCreateMainCard__N4m8Q3 ui-surface-card">
                        <ProductSectionHeader
                            title="Variants"
                            description="Attach product-specific variants used when adding stock."
                        />

                        <div className="portalCategoryCreatePickerToolbar__P6m8Q1">
                            <label className="portalCategoryCreateSearchField__Q6m2Q8">
                                <Search aria-hidden="true" />
                                <input
                                    className="form__input__Z3n7q0 portalCategoryCreateSearchInput__T6m2Q3"
                                    value={variantPickerQuery}
                                    onChange={(event) => {
                                        setVariantPickerQuery(event.target.value);
                                        if (event.target.value.trim().length > 0) {
                                            setVariantManagerError(null);
                                            setVariantsModalOpen(true);
                                        }
                                    }}
                                    placeholder="Search variants"
                                />
                            </label>
                            <Button
                                type="button"
                                kind="basic"
                                size="xsmall"
                                onClick={() => {
                                    setVariantManagerError(null);
                                    setVariantsModalOpen(true);
                                }}
                            >
                                Browse
                            </Button>
                            <label className="portalCategoryCreateSearchByField__U2m8Q4 portalCategoryCreateSortField__X2m8Q1">
                                <span className="portalCategoryCreateSearchByPrefix__A8m2Q3">Sort by{" "}</span>
                                <select
                                    className="form__select__P9j2k0 portalCategoryCreateSearchBySelect__V2m8Q4 portalCategoryCreateSortSelect__J4m8Q2"
                                    value={variantSort}
                                    onChange={(event) => setVariantSort(event.target.value as VariantSort)}
                                >
                                    <option value="CUSTOM">Custom</option>
                                    <option value="LABEL_ASC">Name A-Z</option>
                                    <option value="LABEL_DESC">Name Z-A</option>
                                    <option value="TYPE_ASC">Input type sequence</option>
                                    <option value="TYPE_DESC">Input type reverse sequence</option>
                                </select>
                            </label>
                        </div>

                        {filteredProductVariantRules.length === 0 ? (
                            <div className="portalCategoryCreateEmptySupply__B3m2Q8">
                                <Tags aria-hidden="true" />
                                <p>There are no variants attached to this product.</p>
                                <small>Search or browse to add variants.</small>
                            </div>
                        ) : (
                            <div className="portalCategoryCreateOverviewList__N9m2Q5">
                                {filteredProductVariantRules.map((rule, visibleIndex) => {
                                    const definition = categoryVariantDefinitionById.get(rule.variantId);
                                    if (!definition) return null;
                                    const sourceIndex = productVariantRulesDraft.findIndex((entry) => entry.variantId === rule.variantId);
                                    const canDrag = variantSort === "CUSTOM" && variantPickerQuery.trim().length === 0 && productVariantRulesDraft.length > 1;
                                    const isDragging = productVariantDragId === rule.variantId;
                                    if (isDragging) return null;

                                    const isDropBefore = canDrag
                                        && productVariantDropIndex === sourceIndex
                                        && productVariantDragId !== rule.variantId;
                                    const isDropAfter = canDrag
                                        && visibleIndex === filteredProductVariantRules.length - 1
                                        && productVariantDropIndex === productVariantRulesDraft.length
                                        && productVariantDragId !== rule.variantId;

                                    return (
                                        <div key={rule.variantId} className="portalCategoryCreateOverviewItem__F4m8Q2">
                                            {isDropBefore ? <div className="portalProductsColumnDropPlaceholder__Q2m8P6" aria-hidden="true" /> : null}
                                            <div
                                                ref={(node) => {
                                                    productVariantRowRefs.current[rule.variantId] = node;
                                                }}
                                                className="portalCategoryCreateOverviewRow__Q7m2Q6"
                                            >
                                                {variantSort === "CUSTOM" ? (
                                                    <button
                                                        type="button"
                                                        className="portalProductsColumnDragHandle__W7m2Q6 portalCategoryCreateOverviewDragHandle__J3m8Q2"
                                                        aria-label={`Drag ${definition.label}`}
                                                        disabled={!canDrag}
                                                        onPointerDown={(pointerEvent) => startProductVariantPointerDrag(pointerEvent, rule.variantId, sourceIndex)}
                                                    >
                                                        <GripVertical aria-hidden="true" />
                                                    </button>
                                                ) : null}

                                                <div className="portalCategoryCreateOverviewMeta__S5m2Q7">
                                                    <strong>{definition.label}</strong>
                                                </div>

                                                <span className="portalProductsColumnOrderControls__D3m8Q9">
                                                    <label className="portalCategoriesVariantRuleRequiredInline__B7m2Q5">
                                                        <input
                                                            type="checkbox"
                                                            checked={rule.required}
                                                            onChange={(event) => toggleProductVariantRequired(rule.variantId, event.target.checked)}
                                                        />
                                                        Required
                                                    </label>

                                                    <button
                                                        type="button"
                                                        className="portalCategoryCreateVariantRemove__K2m8Q4"
                                                        aria-label={`Remove ${definition.label}`}
                                                        onClick={() => toggleProductVariantSelection(rule.variantId, false)}
                                                    >
                                                        <Trash2 aria-hidden="true" />
                                                    </button>
                                                </span>
                                            </div>
                                            {isDropAfter ? <div className="portalProductsColumnDropPlaceholder__Q2m8P6" aria-hidden="true" /> : null}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {productError ? <p className="portalProductCreateError__Q6m2P8">{productError}</p> : null}
                </div>

                <aside className="portalProductCreateSidebar__N9m2Q6">
                    <section className="portalProductCreateSidebarCard__K2m8Q3 ui-surface-card">
                        <ProductSectionHeader
                            title="Status"
                            description=""
                            showTooltip={false}
                        />
                        <label className="form__group__K7p2s0">
                            <span className="form__label__B9f4k0">Product status</span>
                            <select className="form__select__P9j2k0" value={status} onChange={(event) => setStatus(event.target.value as CatalogProduct["status"])}>
                                <option value="ACTIVE">Active</option>
                                <option value="DRAFT">Draft</option>
                                <option value="ARCHIVED">Archived</option>
                            </select>
                        </label>
                    </section>

                    <section className="portalProductCreateSidebarCard__K2m8Q3 ui-surface-card">
                        <ProductSectionHeader
                            title="Product organization"
                            description="Add custom product type text and tags for filtering."
                        />

                        <div className="portalProductCreateSidebarFields__G2m8Q9">
                            <label className="form__group__K7p2s0">
                                <span className="form__label__B9f4k0">Type</span>
                                <input
                                    className="form__input__Z3n7q0"
                                    value={organizationType}
                                    onChange={(event) => setOrganizationType(event.target.value)}
                                    placeholder="Custom type"
                                />
                            </label>

                            <label className="form__group__K7p2s0">
                                <span className="form__label__B9f4k0">Tags</span>
                                <div className="portalProductCreateTagInputWrap__K5m2Q4">
                                    <div className="portalProductCreateTagList__L8m1Q2">
                                        {tags.map((tag) => (
                                            <span key={tag} className="portalProductCreateTagChip__R9m2Q6">
                                                <span>{tag}</span>
                                                <button
                                                    type="button"
                                                    className="portalProductCreateTagChipRemove__W2m9Q1"
                                                    onClick={() => removeTagValue(tag)}
                                                    aria-label={`Remove ${tag}`}
                                                >
                                                    x
                                                </button>
                                            </span>
                                        ))}
                                        <input
                                            className="portalProductCreateTagInput__Q3m8Q4"
                                            value={tagInputValue}
                                            onChange={(event) => setTagInputValue(event.target.value)}
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter" || event.key === ",") {
                                                    event.preventDefault();
                                                    if (!tagInputValue.trim()) return;
                                                    addTagValues(tagInputValue);
                                                    setTagInputValue("");
                                                    return;
                                                }

                                                if (event.key === "Backspace" && tagInputValue.trim().length === 0 && tags.length > 0) {
                                                    removeTagValue(tags[tags.length - 1]);
                                                }
                                            }}
                                            placeholder="Add tag"
                                        />
                                    </div>
                                </div>
                            </label>
                        </div>
                    </section>

                    <section className="portalProductCreateSidebarCard__K2m8Q3 ui-surface-card">
                        <ProductSectionHeader
                            title="Summary"
                            description="Overview before saving this product."
                        />

                        <dl className="portalCategoryCreateSummaryList__M4m8Q2">
                            <div className="portalCategoryCreateSummaryRow__J8m2Q4">
                                <dt>Status</dt>
                                <dd>{status}</dd>
                            </div>
                            <div className="portalCategoryCreateSummaryRow__J8m2Q4">
                                <dt>Product type</dt>
                                <dd>{productTypePathLabel}</dd>
                            </div>
                            <div className="portalCategoryCreateSummaryRow__J8m2Q4">
                                <dt>Categories</dt>
                                <dd>{selectedCategoryIds.size}</dd>
                            </div>
                            <div className="portalCategoryCreateSummaryRow__J8m2Q4">
                                <dt>Category variants</dt>
                                <dd>{categoryVariantDefinitions.length}</dd>
                            </div>
                            <div className="portalCategoryCreateSummaryRow__J8m2Q4">
                                <dt>Stock variants</dt>
                                <dd>{productVariantRulesDraft.length}</dd>
                            </div>
                        </dl>
                    </section>
                </aside>
            </div>

            {isEditMode ? (
                <section className="portalProductTimelineSection__U8m2Q4">
                    <div className="portalProductTimelineHeader__B7m2Q6">
                        <h2 className="ui-card-heading">Timeline</h2>
                        <p className="ui-card-subheading">Track purchase orders, stock additions, maintenance, and sales for this product.</p>
                    </div>

                    <div className="portalProductTimelineComposerContainer__P3m8Q7">
                        <div className="portalProductTimelineComposerWrap__C9m2Q6 ui-surface-card">
                            <div className="portalProductTimelineComposer__P6m2Q8">
                                <span className="portalProfileAvatar__L4x7S1 portalProductTimelineAvatar__M3m2Q4" aria-hidden="true">{timelineCommenterInitials}</span>
                                <input
                                    className="portalProductTimelineComposerInput__V2m2Q9"
                                    type="text"
                                    value={timelineCommentDraft}
                                    onChange={(event) => setTimelineCommentDraft(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            event.preventDefault();
                                            void postTimelineComment();
                                        }
                                    }}
                                    placeholder="Leave a comment..."
                                />
                                <Button
                                    type="button"
                                    kind="basic"
                                    size="xsmall"
                                    onClick={() => { void postTimelineComment(); }}
                                    disabled={postingTimelineComment || timelineCommentDraft.trim().length === 0}
                                >
                                    {postingTimelineComment ? "Posting..." : "Post"}
                                </Button>
                            </div>
                        </div>
                        <p className="portalProductTimelineComposerNote__P5m2Q6">Only you and staff can see comments.</p>
                    </div>

                    {productTimelineData.events.length === 0 ? (
                        <p className="portalProductTimelineEmpty__X8m2Q7">No timeline events yet.</p>
                    ) : (
                        <ol className="portalProductTimelineList__S6m2Q1">
                            {productTimelineData.events.map((event) => {
                                const commentAuthorName = (event.authorName ?? timelineCommenterName).trim() || timelineCommenterName;
                                return (
                                    <li
                                        key={event.id}
                                        className={cn(
                                            "portalProductTimelineItem__W4m2Q8",
                                            event.type === "comment" && "portalProductTimelineItemComment__N6m2Q4"
                                        )}
                                    >
                                        <div className="portalProductTimelineRail__T8m2Q3" aria-hidden="true">
                                            {event.type === "comment" ? null : (
                                                <span
                                                    className={cn(
                                                        "portalProductTimelineDot__K5m2Q4",
                                                        event.type === "purchase-order" && "portalProductTimelineDotPurchase__N2m8Q6",
                                                        event.type === "maintenance" && "portalProductTimelineDotMaintenance__H3m2Q7",
                                                        event.type === "sale" && "portalProductTimelineDotSale__F2m8Q9"
                                                    )}
                                                />
                                            )}
                                        </div>
                                        <div className="portalProductTimelineContent__A4m2Q9">
                                            {event.type === "comment" ? (
                                                <div className="portalProductTimelineCommentCard__X2m2Q9 ui-surface-card">
                                                    <span className="portalProfileAvatar__L4x7S1 portalProductTimelineAvatar__M3m2Q4" aria-hidden="true">
                                                        {getInitials(commentAuthorName)}
                                                    </span>
                                                    <div className="portalProductTimelineCommentBody__Q4m8Q2">
                                                        <div className="portalProductTimelineCommentMetaLine__D5m2Q4">
                                                            <p className="portalProductTimelineCommentAuthor__N8m2Q3">{commentAuthorName}</p>
                                                            <p className="portalProductTimelineCommentTime__E4m2Q4">{formatRelativeTime(event.timestamp, timelineLocale)}</p>
                                                        </div>
                                                        <p className="portalProductTimelineCommentMessage__B6m2Q1">{event.details}</p>
                                                    </div>
                                                    {event.deletable ? (
                                                        <button
                                                            type="button"
                                                            className="portalProductTimelineActionButton__F2m8Q5 portalProductTimelineActionDelete__K9m2Q7"
                                                            aria-label="Delete comment"
                                                            onClick={() => openTimelineCommentDelete(event)}
                                                        >
                                                            <Trash2 aria-hidden="true" />
                                                        </button>
                                                    ) : null}
                                                </div>
                                            ) : (
                                                <div className="portalProductTimelineRowMain__K7m2Q3">
                                                    <div className="portalProductTimelineTextGroup__R3m2Q9">
                                                        <p className="portalProductTimelineTitle__Z2m8Q6">{event.title}</p>
                                                        <p className="portalProductTimelineDetails__Q7m2Q5">{event.details}</p>
                                                        {event.meta ? <p className="portalProductTimelineMeta__E8m2Q4">{event.meta}</p> : null}
                                                    </div>
                                                    {(event.editable || event.deletable) ? (
                                                        <span className="portalProductTimelineActions__W6m2Q8">
                                                            {event.editable ? (
                                                                <button
                                                                    type="button"
                                                                    className="portalProductTimelineActionButton__F2m8Q5"
                                                                    aria-label={`Edit ${event.title}`}
                                                                    onClick={() => openTimelineEdit(event)}
                                                                >
                                                                    <Pencil aria-hidden="true" />
                                                                </button>
                                                            ) : null}
                                                            {event.deletable ? (
                                                                <button
                                                                    type="button"
                                                                    className="portalProductTimelineActionButton__F2m8Q5 portalProductTimelineActionDelete__K9m2Q7"
                                                                    aria-label="Delete comment"
                                                                    onClick={() => openTimelineCommentDelete(event)}
                                                                >
                                                                    <Trash2 aria-hidden="true" />
                                                                </button>
                                                            ) : null}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            )}
                                        </div>
                                        {event.type === "comment" ? null : (
                                            <time className="portalProductTimelineTimestamp__Y2m8Q5">{formatDateTime(event.timestamp, timelineLocale)}</time>
                                        )}
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </section>
            ) : null}

            <PortalModal
                open={Boolean(timelineDeleteCommentState)}
                title="Delete comment"
                closeLabel="Close delete comment pop-up"
                onClose={closeTimelineCommentDelete}
                footer={(
                    <>
                        <Button type="button" kind="secondary" size="xsmall" onClick={closeTimelineCommentDelete} disabled={timelineDeleteCommentSaving}>
                            Cancel
                        </Button>
                        <Button type="button" kind="danger" size="xsmall" onClick={() => { void confirmTimelineCommentDelete(); }} disabled={timelineDeleteCommentSaving}>
                            {timelineDeleteCommentSaving ? "Deleting..." : "Delete"}
                        </Button>
                    </>
                )}
            >
                {timelineDeleteCommentState ? (
                    <div className="portalProductTimelineModalBody__U5m2Q6">
                        <p className="portalProductsDeleteConfirmText__A8m2Q6">This comment will be removed from the timeline.</p>
                        <p className="portalProductTimelineDeletePreview__Y6m2Q4">{timelineDeleteCommentState.text}</p>
                        {timelineDeleteCommentError ? <p className="portalProductCreateError__Q6m2P8">{timelineDeleteCommentError}</p> : null}
                    </div>
                ) : null}
            </PortalModal>

            <PortalModal
                open={categoryBrowseModalOpen}
                title="Browse categories"
                closeLabel="Close categories pop-up"
                onClose={() => setCategoryBrowseModalOpen(false)}
                bodyClassName="portalModalBodyTall__M2m8Q4"
                footer={(
                    <Button type="button" kind="primary" size="xsmall" onClick={() => setCategoryBrowseModalOpen(false)}>
                        Done
                    </Button>
                )}
            >
                <div className="portalCategoryCreateModalSections__Y4m8Q1">
                    <section className="portalProductsColumnsSection__M5m2Q8 portalCategoriesVariantPickerSection__J5m8Q4">
                        <div className="portalCategoryCreateBrowseToolbar__N4m8Q9">
                            <label className="portalCategoryCreateSearchField__Q6m2Q8">
                                <Search aria-hidden="true" />
                                <input
                                    ref={categoryModalSearchInputRef}
                                    className="form__input__Z3n7q0 portalCategoryCreateSearchInput__T6m2Q3"
                                    value={categoryPickerQuery}
                                    onChange={(event) => setCategoryPickerQuery(event.target.value)}
                                    placeholder="Search categories"
                                />
                            </label>
                            <label className="portalCategoryCreateSearchByField__U2m8Q4">
                                <span className="portalCategoryCreateSearchByPrefix__A8m2Q3">Search by{" "}</span>
                                <select
                                    className="form__select__P9j2k0 portalCategoryCreateSearchBySelect__V2m8Q4"
                                    value={categorySearchBy}
                                    onChange={(event) => setCategorySearchBy(event.target.value as ProductCategorySearchBy)}
                                >
                                    <option value="TITLE">Category title</option>
                                    <option value="ID">Category ID</option>
                                </select>
                            </label>
                        </div>

                        <div className="portalProductsColumnsSectionList__V3m8Q6 portalCategoriesVariantPickerList__A9m2Q5">
                            {filteredCategoryPickerResults.length === 0 ? (
                                <div className="portalCategoryCreatePickerEmpty__S2m8Q5">
                                    <PackageSearch aria-hidden="true" />
                                    <p>No categories found.</p>
                                    <small>Try adjusting the filters or search term.</small>
                                </div>
                            ) : filteredCategoryPickerResults.map((category) => (
                                <div key={category.id} className="portalProductsColumnOptionItem__A4m2Q7">
                                    <div className="portalProductsColumnOptionRow__H4m8Q7">
                                        <label className="portalProductsColumnOption__V2m8Q6">
                                            <input
                                                type="checkbox"
                                                checked={selectedCategoryIds.has(category.id)}
                                                onChange={(event) => toggleCategorySelection(category.id, event.target.checked)}
                                            />
                                            <span className="portalProductsColumnOptionLabel__K7m2Q1">{category.title}</span>
                                        </label>
                                        <span className="portalProductsColumnOrderControls__D3m8Q9">
                                            <span className="portalCategoryCreateBrowseItemMeta__X7m2Q4">{category.id}</span>
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </PortalModal>

            <PortalModal
                open={variantsModalOpen}
                title="Add variants"
                closeLabel="Close variants pop-up"
                onClose={() => {
                    setVariantManagerError(null);
                    setVariantsModalOpen(false);
                }}
                bodyClassName="portalModalBodyTall__M2m8Q4"
                footer={(
                    <Button
                        type="button"
                        kind="primary"
                        size="xsmall"
                        onClick={() => {
                            setVariantManagerError(null);
                            setVariantsModalOpen(false);
                        }}
                    >
                        Done
                    </Button>
                )}
            >
                <div className="portalCategoryCreateModalSections__Y4m8Q1">
                    <section className="portalProductsColumnsSection__M5m2Q8 portalCategoriesVariantPickerSection__J5m8Q4">
                        <div className="portalCategoryCreateBrowseToolbar__N4m8Q9">
                            <label className="portalCategoryCreateSearchField__Q6m2Q8">
                                <Search aria-hidden="true" />
                                <input
                                    ref={variantModalSearchInputRef}
                                    className="form__input__Z3n7q0 portalCategoryCreateSearchInput__T6m2Q3"
                                    value={variantPickerQuery}
                                    onChange={(event) => setVariantPickerQuery(event.target.value)}
                                    placeholder="Search variants"
                                />
                            </label>
                            <label className="portalCategoryCreateSearchByField__U2m8Q4">
                                <span className="portalCategoryCreateSearchByPrefix__A8m2Q3">Search by{" "}</span>
                                <select
                                    className="form__select__P9j2k0 portalCategoryCreateSearchBySelect__V2m8Q4"
                                    value={variantSearchBy}
                                    onChange={(event) => setVariantSearchBy(event.target.value as VariantSearchBy)}
                                >
                                    <option value="LABEL">Variant name</option>
                                    <option value="TYPE">Input type</option>
                                    <option value="ID">Variant ID</option>
                                </select>
                            </label>
                        </div>

                        <div className="portalProductsColumnsSectionList__V3m8Q6 portalCategoriesVariantPickerList__A9m2Q5">
                            {filteredVariantDefinitions.length === 0 ? (
                                <div className="portalCategoryCreatePickerEmpty__S2m8Q5">
                                    <Tags aria-hidden="true" />
                                    <p>No variants found.</p>
                                    <small>Try adjusting the filters or search term.</small>
                                </div>
                            ) : filteredVariantDefinitions.map((definition) => {
                                const selectedIndex = selectedProductVariantRuleIndexById.get(definition.id);
                                const categoryAssigned = selectedCategoryVariantRuleIds.has(definition.id);
                                const checked = categoryAssigned || typeof selectedIndex === "number";
                                const rule = typeof selectedIndex === "number"
                                    ? productVariantRulesDraft[selectedIndex]
                                    : null;
                                const usageCount = variantUsageCountById.get(definition.id) ?? 0;

                                return (
                                    <div key={definition.id} className="portalProductsColumnOptionItem__A4m2Q7">
                                        <div className="portalProductsColumnOptionRow__H4m8Q7">
                                            <label className="portalProductsColumnOption__V2m8Q6">
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    disabled={categoryAssigned}
                                                    onChange={(event) => toggleProductVariantSelection(definition.id, event.target.checked)}
                                                />
                                                <span className="portalProductsColumnOptionLabel__K7m2Q1">{definition.label}</span>
                                            </label>
                                            <span className="portalProductsColumnOrderControls__D3m8Q9">
                                                <span className="portalCategoryCreateBrowseItemMeta__X7m2Q4">
                                                    {getVariantInputTypeLabel(definition.inputType)}
                                                    {usageCount > 0 ? ` · Used by ${usageCount} product${usageCount === 1 ? "" : "s"}` : ""}
                                                </span>
                                                {categoryAssigned ? (
                                                    <span className="portalCategoryCreateBrowseItemMeta__X7m2Q4">From category</span>
                                                ) : rule ? (
                                                    <label className="portalCategoriesVariantRuleRequiredInline__B7m2Q5">
                                                        <input
                                                            type="checkbox"
                                                            checked={rule.required}
                                                            onChange={(event) => toggleProductVariantRequired(rule.variantId, event.target.checked)}
                                                        />
                                                        Required
                                                    </label>
                                                ) : null}
                                                <button
                                                    type="button"
                                                    className="portalCategoryCreateInlineLink__W4m8Q2"
                                                    onClick={() => openEditVariant(definition.id)}
                                                >
                                                    <Pencil aria-hidden="true" />
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    className="portalCategoryCreateVariantRemove__K2m8Q4"
                                                    aria-label={`Delete ${definition.label}`}
                                                    onClick={() => {
                                                        openVariantDeleteConfirm(definition.id);
                                                    }}
                                                >
                                                    <Trash2 aria-hidden="true" />
                                                </button>
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section className="portalCategoryCreateVariantCreate__L9m2Q4">
                        <h3 className="ui-card-heading">Create variant</h3>
                        <div className="portalCategoriesVariantCreateGrid__P5m2Q8">
                            <label className="portalCategoriesField__R8m2Q3">
                                <span>Name</span>
                                <input
                                    className="form__input__Z3n7q0"
                                    value={newVariantNameDraft}
                                    onChange={(event) => {
                                        setNewVariantNameDraft(event.target.value);
                                        if (newVariantError) setNewVariantError(null);
                                    }}
                                    placeholder="Variant name"
                                />
                            </label>

                            <label className="portalCategoriesField__R8m2Q3">
                                <span>Input type</span>
                                <select
                                    className="form__select__P9j2k0"
                                    value={newVariantTypeDraft}
                                    onChange={(event) => {
                                        const nextType = event.target.value as VariantInputType;
                                        setNewVariantTypeDraft(nextType);
                                        if (newVariantError) setNewVariantError(null);
                                        if (nextType !== "select") {
                                            setNewVariantValuesDraft([]);
                                            setNewVariantValueInput("");
                                        }
                                    }}
                                >
                                    <option value="select">Select</option>
                                    <option value="input">Input</option>
                                    <option value="textarea">Textarea</option>
                                    <option value="date">Date</option>
                                </select>
                            </label>

                            {newVariantTypeDraft === "select" ? (
                                <label className="portalCategoriesField__R8m2Q3 portalCategoryCreateFullWidth__V6m2Q8">
                                    <span>Select values</span>
                                    <div className="portalProductCreateTagInputWrap__K5m2Q4 portalCategoriesSelectValuesInputWrap__V7m2Q5">
                                        <div className="portalProductCreateTagList__L8m1Q2">
                                            {newVariantValuesDraft.map((value) => (
                                                <span key={value} className="portalProductCreateTagChip__R9m2Q6">
                                                    <span>{value}</span>
                                                    <button
                                                        type="button"
                                                        className="portalProductCreateTagChipRemove__W2m9Q1"
                                                        onClick={() => removeNewVariantValue(value)}
                                                        aria-label={`Remove ${value}`}
                                                    >
                                                        x
                                                    </button>
                                                </span>
                                            ))}
                                            <input
                                                className="portalProductCreateTagInput__Q3m8Q4"
                                                value={newVariantValueInput}
                                                onChange={(event) => setNewVariantValueInput(event.target.value)}
                                                onKeyDown={(event) => {
                                                    if (event.key === "Enter" || event.key === ",") {
                                                        event.preventDefault();
                                                        if (!newVariantValueInput.trim()) return;
                                                        addNewVariantValues(newVariantValueInput);
                                                        setNewVariantValueInput("");
                                                    }
                                                }}
                                                placeholder="Add value"
                                            />
                                        </div>
                                    </div>
                                </label>
                            ) : null}
                        </div>

                        {newVariantErrorMessage ? <p className="portalCategoriesError__C6m2Q8">{newVariantErrorMessage}</p> : null}
                        {variantManagerError ? <p className="portalCategoriesError__C6m2Q8">{variantManagerError}</p> : null}

                        <div className="portalCategoriesVariantCreateActions__G2m8Q6">
                            <Button type="button" kind="basic" size="xsmall" onClick={() => { void createVariant(); }}>
                                Add variant
                            </Button>
                        </div>
                    </section>
                </div>
            </PortalModal>

            <PortalModal
                open={manageVariantsModalOpen}
                title="Manage variants"
                closeLabel="Close manage variants pop-up"
                onClose={() => {
                    setManageVariantsModalOpen(false);
                    setVariantManagerError(null);
                }}
                bodyClassName="portalModalBodyTall__M2m8Q4"
                footer={(
                    <Button
                        type="button"
                        kind="primary"
                        size="xsmall"
                        onClick={() => {
                            setManageVariantsModalOpen(false);
                            setVariantManagerError(null);
                        }}
                    >
                        Done
                    </Button>
                )}
            >
                <div className="portalCategoryCreateModalSections__Y4m8Q1">
                    <section className="portalProductsColumnsSection__M5m2Q8 portalCategoriesVariantPickerSection__J5m8Q4">
                        <div className="portalCategoryCreateBrowseToolbar__N4m8Q9">
                            <label className="portalCategoryCreateSearchField__Q6m2Q8">
                                <Search aria-hidden="true" />
                                <input
                                    ref={variantModalSearchInputRef}
                                    className="form__input__Z3n7q0 portalCategoryCreateSearchInput__T6m2Q3"
                                    value={variantLibraryQuery}
                                    onChange={(event) => setVariantLibraryQuery(event.target.value)}
                                    placeholder="Search variants"
                                />
                            </label>
                            <label className="portalCategoryCreateSearchByField__U2m8Q4">
                                <span className="portalCategoryCreateSearchByPrefix__A8m2Q3">Search by{" "}</span>
                                <select
                                    className="form__select__P9j2k0 portalCategoryCreateSearchBySelect__V2m8Q4"
                                    value={variantLibrarySearchBy}
                                    onChange={(event) => setVariantLibrarySearchBy(event.target.value as VariantSearchBy)}
                                >
                                    <option value="LABEL">Variant name</option>
                                    <option value="TYPE">Input type</option>
                                    <option value="ID">Variant ID</option>
                                </select>
                            </label>
                        </div>

                        <div className="portalProductsColumnsSectionList__V3m8Q6 portalCategoriesVariantPickerList__A9m2Q5">
                            {filteredVariantLibrary.length === 0 ? (
                                <div className="portalCategoryCreatePickerEmpty__S2m8Q5">
                                    <Tags aria-hidden="true" />
                                    <p>No variants found.</p>
                                    <small>Try adjusting the filters or search term.</small>
                                </div>
                            ) : filteredVariantLibrary.map((definition) => (
                                <div key={definition.id} className="portalProductsColumnOptionItem__A4m2Q7">
                                    <div className="portalProductsColumnOptionRow__H4m8Q7">
                                        <span className="portalProductsColumnOption__V2m8Q6 portalPurchaseOrderVariantListLabel__H2m8Q5">
                                            <span className="portalProductsColumnOptionLabel__K7m2Q1">{definition.label}</span>
                                        </span>
                                        <span className="portalProductsColumnOrderControls__D3m8Q9 portalPurchaseOrderVariantActions__V3m8Q4">
                                            <button
                                                type="button"
                                                className="portalCategoryCreateInlineLink__W4m8Q2 portalPurchaseOrderVariantActionLink__A4m8Q2"
                                                onClick={() => openEditVariant(definition.id)}
                                            >
                                                <Pencil aria-hidden="true" />
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                className="portalCategoryCreateVariantRemove__K2m8Q4"
                                                aria-label={`Delete ${definition.label}`}
                                                onClick={() => {
                                                    openVariantDeleteConfirm(definition.id);
                                                }}
                                            >
                                                <Trash2 aria-hidden="true" />
                                            </button>
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="portalCategoryCreateVariantCreate__L9m2Q4">
                        <h3 className="ui-card-heading">Create variant</h3>
                        <div className="portalCategoriesVariantCreateGrid__P5m2Q8">
                            <label className="portalCategoriesField__R8m2Q3">
                                <span>Name</span>
                                <input
                                    className="form__input__Z3n7q0"
                                    value={newVariantNameDraft}
                                    onChange={(event) => {
                                        setNewVariantNameDraft(event.target.value);
                                        if (newVariantError) setNewVariantError(null);
                                    }}
                                    placeholder="Variant name"
                                />
                            </label>

                            <label className="portalCategoriesField__R8m2Q3">
                                <span>Input type</span>
                                <select
                                    className="form__select__P9j2k0"
                                    value={newVariantTypeDraft}
                                    onChange={(event) => {
                                        const nextType = event.target.value as VariantInputType;
                                        setNewVariantTypeDraft(nextType);
                                        if (newVariantError) setNewVariantError(null);
                                        if (nextType !== "select") {
                                            setNewVariantValuesDraft([]);
                                            setNewVariantValueInput("");
                                        }
                                    }}
                                >
                                    <option value="select">Select</option>
                                    <option value="input">Input</option>
                                    <option value="textarea">Textarea</option>
                                    <option value="date">Date</option>
                                </select>
                            </label>

                            {newVariantTypeDraft === "select" ? (
                                <label className="portalCategoriesField__R8m2Q3 portalCategoryCreateFullWidth__V6m2Q8">
                                    <span>Select values</span>
                                    <div className="portalProductCreateTagInputWrap__K5m2Q4 portalCategoriesSelectValuesInputWrap__V7m2Q5">
                                        <div className="portalProductCreateTagList__L8m1Q2">
                                            {newVariantValuesDraft.map((value) => (
                                                <span key={value} className="portalProductCreateTagChip__R9m2Q6">
                                                    <span>{value}</span>
                                                    <button
                                                        type="button"
                                                        className="portalProductCreateTagChipRemove__W2m9Q1"
                                                        onClick={() => removeNewVariantValue(value)}
                                                        aria-label={`Remove ${value}`}
                                                    >
                                                        x
                                                    </button>
                                                </span>
                                            ))}
                                            <input
                                                className="portalProductCreateTagInput__Q3m8Q4"
                                                value={newVariantValueInput}
                                                onChange={(event) => setNewVariantValueInput(event.target.value)}
                                                onKeyDown={(event) => {
                                                    if (event.key === "Enter" || event.key === ",") {
                                                        event.preventDefault();
                                                        if (!newVariantValueInput.trim()) return;
                                                        addNewVariantValues(newVariantValueInput);
                                                        setNewVariantValueInput("");
                                                    }
                                                }}
                                                placeholder="Add value"
                                            />
                                        </div>
                                    </div>
                                </label>
                            ) : null}
                        </div>
                        {newVariantErrorMessage ? <p className="portalCategoriesError__C6m2Q8">{newVariantErrorMessage}</p> : null}
                        {variantManagerError ? <p className="portalCategoriesError__C6m2Q8">{variantManagerError}</p> : null}
                        <div className="portalCategoriesVariantCreateActions__G2m8Q6">
                            <Button type="button" kind="basic" size="xsmall" onClick={() => { void createVariant(); }}>
                                Add variant
                            </Button>
                        </div>
                    </section>
                </div>
            </PortalModal>

            <PortalModal
                open={Boolean(pendingVariantDelete)}
                title="Delete variant"
                closeLabel="Close delete variant pop-up"
                onClose={closeVariantDeleteConfirm}
                footer={(
                    <>
                        <Button type="button" kind="secondary" size="xsmall" onClick={closeVariantDeleteConfirm} disabled={pendingVariantDeleteSubmitting}>
                            Cancel
                        </Button>
                        <Button type="button" kind="danger" size="xsmall" onClick={() => void confirmVariantDelete()} disabled={pendingVariantDeleteSubmitting}>
                            {pendingVariantDeleteSubmitting ? "Deleting..." : "Continue"}
                        </Button>
                    </>
                )}
            >
                {pendingVariantDelete ? (
                    <div className="portalProductsDeleteConfirmBody__J2m8Q5">
                        <p className="portalProductsDeleteConfirmText__A8m2Q6">You are about to delete a variant.</p>
                        <p className="portalProductsDeleteConfirmText__A8m2Q6">
                            <strong>{pendingVariantDelete.definition.label}</strong>{" "}
                            is attached to {pendingVariantDelete.usageCount} product{pendingVariantDelete.usageCount === 1 ? "" : "s"}.
                            {" "}This will be deleted from all products. Are you sure?
                        </p>
                        {pendingVariantDeleteError ? <p className="portalProductsDeleteConfirmError__Q3m8Q8">{pendingVariantDeleteError}</p> : null}
                    </div>
                ) : null}
            </PortalModal>

            <PortalModal
                open={Boolean(editingVariantId)}
                title="Edit variant"
                closeLabel="Close edit variant pop-up"
                onClose={closeEditVariant}
                footer={(
                    <>
                        <Button type="button" kind="secondary" size="xsmall" onClick={closeEditVariant}>
                            Cancel
                        </Button>
                        <Button type="button" kind="primary" size="xsmall" onClick={() => { void saveEditedVariant(); }}>
                            Save
                        </Button>
                    </>
                )}
            >
                {editingVariantId ? (
                    <div className="portalCategoryCreateModalSections__Y4m8Q1">
                        {(() => {
                            const current = variantDefinitions.find((definition) => definition.id === editingVariantId);
                            if (!current) {
                                return <p className="portalCategoriesError__C6m2Q8">Variant not found.</p>;
                            }
                            return (
                                <section className="portalCategoryCreateVariantCreate__L9m2Q4">
                                    <div className="portalCategoriesVariantCreateGrid__P5m2Q8">
                                        <label className="portalCategoriesField__R8m2Q3">
                                            <span>Name</span>
                                            <input
                                                className="form__input__Z3n7q0"
                                                value={editVariantNameDraft}
                                                onChange={(event) => {
                                                    setEditVariantNameDraft(event.target.value);
                                                    if (editVariantError) setEditVariantError(null);
                                                }}
                                                placeholder="Variant name"
                                            />
                                        </label>

                                        <label className="portalCategoriesField__R8m2Q3">
                                            <span>Input type</span>
                                            <select
                                                className="form__select__P9j2k0"
                                                value={current.inputType}
                                                disabled
                                            >
                                                <option value="select">Select</option>
                                                <option value="input">Input</option>
                                                <option value="textarea">Textarea</option>
                                                <option value="date">Date</option>
                                            </select>
                                        </label>

                                        {current.inputType === "select" ? (
                                            <label className="portalCategoriesField__R8m2Q3 portalCategoryCreateFullWidth__V6m2Q8">
                                                <span>Select values</span>
                                                <div className="portalProductCreateTagInputWrap__K5m2Q4 portalCategoriesSelectValuesInputWrap__V7m2Q5">
                                                    <div className="portalProductCreateTagList__L8m1Q2">
                                                        {editVariantValuesDraft.map((value) => (
                                                            <span key={value} className="portalProductCreateTagChip__R9m2Q6">
                                                                <span>{value}</span>
                                                                <button
                                                                    type="button"
                                                                    className="portalProductCreateTagChipRemove__W2m9Q1"
                                                                    onClick={() => removeEditVariantValue(value)}
                                                                    aria-label={`Remove ${value}`}
                                                                >
                                                                    x
                                                                </button>
                                                            </span>
                                                        ))}
                                                        <input
                                                            className="portalProductCreateTagInput__Q3m8Q4"
                                                            value={editVariantValueInput}
                                                            onChange={(event) => setEditVariantValueInput(event.target.value)}
                                                            onKeyDown={(event) => {
                                                                if (event.key === "Enter" || event.key === ",") {
                                                                    event.preventDefault();
                                                                    if (!editVariantValueInput.trim()) return;
                                                                    addEditVariantValues(editVariantValueInput);
                                                                    setEditVariantValueInput("");
                                                                }
                                                            }}
                                                            placeholder="Add value"
                                                        />
                                                    </div>
                                                </div>
                                            </label>
                                        ) : null}
                                    </div>
                                </section>
                            );
                        })()}
                        {editVariantErrorMessage ? <p className="portalCategoriesError__C6m2Q8">{editVariantErrorMessage}</p> : null}
                        {variantManagerError ? <p className="portalCategoriesError__C6m2Q8">{variantManagerError}</p> : null}
                    </div>
                ) : null}
            </PortalModal>

            <PortalModal
                open={Boolean(categoryVariantConflict)}
                title="Duplicate variant in category"
                closeLabel="Close conflict pop-up"
                onClose={cancelCategoryVariantConflict}
                footer={(
                    <>
                        <Button type="button" kind="secondary" size="xsmall" onClick={cancelCategoryVariantConflict}>
                            Cancel
                        </Button>
                        <Button type="button" kind="primary" size="xsmall" onClick={continueCategoryVariantConflict}>
                            Continue
                        </Button>
                    </>
                )}
            >
                {categoryVariantConflict ? (
                    <div className="portalCategoryCreateModalSections__Y4m8Q1">
                        <p className="portalProductCreateHint__A8m2Q1">
                            {`"${categoryVariantConflict.categoryTitle}" contains a variant you have already added to this product.`}
                        </p>
                        <p className="portalProductCreateHint__A8m2Q1">
                            Continue and the overlapping product variant will be removed so it does not appear in both places.
                        </p>
                        <ul className="ui-unordered-list">
                            {categoryVariantConflict.variantIds.map((variantId) => (
                                <li key={variantId}>
                                    {categoryVariantDefinitionById.get(variantId)?.label ?? variantId}
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}
            </PortalModal>

            {productVariantDragPreview ? (
                <div
                    className="portalProductsColumnDragPreview__H7m2Q4"
                    style={{ left: `${productVariantDragPreview.x}px`, top: `${productVariantDragPreview.y}px` }}
                    aria-hidden="true"
                >
                    <span className="portalProductsColumnDragPreviewLabel__D8m2Q6">{productVariantDragPreview.label}</span>
                </div>
            ) : null}
        </section>
    );
}
