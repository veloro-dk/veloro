"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
    type PointerEvent as ReactPointerEvent,
} from "react";
import { usePortalNavigation } from "@/components/PortalNavigationContext";
import { FolderPlus, GripVertical, PackageSearch, Plus, Search, Tags, Trash2 } from "lucide-react";
import { Button } from "@/components/Button";
import { PortalModal } from "@/components/PortalModal";
import { PortalPageTitle } from "@/components/PortalPageTitle";
import { Tooltip } from "@/components/Tooltip";
import { notifyPortalAction } from "@/components/portalActionNotifications";
import { usePendingChangesHeader } from "@/components/usePendingChangesHeader";
import { usePortalI18n } from "@/i18n/PortalI18nContext";
import {
    CATEGORY_CONDITION_FIELD_OPTIONS,
    createEmptyCategoryCondition,
    getCategoryConditionOperatorOptions,
    getConditionFieldMeta,
    getDefaultOperatorForField,
} from "@/lib/categoryConditions";
import {
    createUniqueCategoryId,
    createUniqueVariantId,
    getDefaultProductCategoryDefinitions,
    getDefaultProducts,
    getProductCategoryTitles,
    getDefaultVariantDefinitions,
    reconcileCatalogProductsAndCategories,
    type CategoryCondition,
    type CategoryConditionMatchMode,
    type CategoryType,
    type CategoryVariantRule,
    type CatalogProduct,
    type ProductCategoryDefinition,
    type VariantDefinition,
    type VariantInputType,
} from "@/lib/productCatalog";
import type { PurchaseOrder } from "@/lib/purchaseOrders";
import { fetchCatalogStateFromApi, getCachedCatalogStateSnapshot, saveCatalogStateToApi } from "@/lib/catalogStateClient";
import { appendMultiValueInput, normalizeMultiValueList, removeMultiValue } from "@/lib/multiValueInput";

type PortalCategoryCreateViewProps = {
    stores: Array<{ id: string; name: string; slug: string }>;
    activeStoreId: string;
};

type CategoryCreateErrorKey =
    | "categoryNameRequired"
    | "variantNameRequired"
    | "variantConflict"
    | "selectValuesRequired"
    | "variantRuleRequired"
    | "storeRequired"
    | "conditionValueRequired"
    | "saveFailed";

type ProductSupplySort = "TITLE_ASC" | "TITLE_DESC" | "PRICE_HIGH" | "PRICE_LOW" | "NEWEST" | "OLDEST";
type ProductSearchBy = "TITLE" | "SKU" | "ID";
type VariantSupplySort = "CUSTOM" | "LABEL_ASC" | "LABEL_DESC" | "TYPE_ASC" | "TYPE_DESC";
type VariantSearchBy = "LABEL" | "TYPE" | "ID";

const COLUMN_DRAGGING_BODY_CLASS = "portalProductsGlobalDragActive__F4m2Q8";

const ERROR_MESSAGES: Record<CategoryCreateErrorKey, string> = {
    categoryNameRequired: "Category name is required.",
    variantNameRequired: "Variant name is required.",
    variantConflict: "A variant with this name already exists.",
    selectValuesRequired: "Select variants need at least one value.",
    variantRuleRequired: "Add at least one variant.",
    storeRequired: "Select at least one store.",
    conditionValueRequired: "Fill all condition values.",
    saveFailed: "Unable to save category. Please try again.",
};

const VARIANT_INPUT_TYPE_ORDER: Record<VariantInputType, number> = {
    select: 0,
    input: 1,
    textarea: 2,
    date: 3,
};
const DUPLICATE_VALUE_MESSAGE = "Duplicate value is not allowed.";

function reorderVariantRulesByInsertionIndex(rules: CategoryVariantRule[], sourceIndex: number, targetIndexRaw: number) {
    if (sourceIndex < 0 || sourceIndex >= rules.length) return rules;
    const targetIndex = Math.max(0, Math.min(targetIndexRaw, rules.length));
    const normalizedTarget = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex;
    if (normalizedTarget === sourceIndex) return rules;

    const next = [...rules];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(normalizedTarget, 0, moved);
    return next;
}

function normalizeString(value: string) {
    return value.trim();
}

function normalizeConditionValue(condition: CategoryCondition) {
    const fieldMeta = getConditionFieldMeta(condition.field);
    if (fieldMeta.valueInput === "number" || fieldMeta.valueInput === "currency") {
        const numeric = Number(condition.value);
        if (!Number.isFinite(numeric)) return "";
        return String(numeric);
    }
    return condition.value.trim();
}

function buildProductPriceMap(purchaseOrders: PurchaseOrder[]) {
    const byProduct = new Map<string, number>();
    purchaseOrders.forEach((order) => {
        if (order.status === "DRAFT" || order.status === "CANCELLED") return;
        order.lines.forEach((line) => {
            if (!line.productId) return;
            byProduct.set(line.productId, line.unitCost);
        });
    });
    return byProduct;
}

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

type CategorySectionHeaderProps = {
    title: string;
    description: string;
    action?: ReactNode;
    showTooltip?: boolean;
};

function CategorySectionHeader({ title, description, action, showTooltip = true }: CategorySectionHeaderProps) {
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

export function PortalCategoryCreateView({ stores, activeStoreId }: PortalCategoryCreateViewProps) {
    const { navigateTo } = usePortalNavigation();
    const { storeCurrency } = usePortalI18n();
    const cachedCatalogState = getCachedCatalogStateSnapshot();

    const [variantDefinitions, setVariantDefinitions] = useState<VariantDefinition[]>(() => (
        cachedCatalogState?.variantDefinitions ?? getDefaultVariantDefinitions()
    ));
    const [categories, setCategories] = useState<ProductCategoryDefinition[]>(() => (
        cachedCatalogState?.categoryDefinitions ?? getDefaultProductCategoryDefinitions()
    ));
    const [products, setProducts] = useState<CatalogProduct[]>(() => cachedCatalogState?.products ?? getDefaultProducts());
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => cachedCatalogState?.purchaseOrders ?? []);

    const [categoryNameDraft, setCategoryNameDraft] = useState("");
    const [categoryDescriptionDraft, setCategoryDescriptionDraft] = useState("");
    const [categoryTypeDraft, setCategoryTypeDraft] = useState<CategoryType>("MANUAL");
    const [categoryVariantRulesDraft, setCategoryVariantRulesDraft] = useState<CategoryVariantRule[]>([]);
    const [conditionModeDraft, setConditionModeDraft] = useState<CategoryConditionMatchMode>("ALL");
    const [conditionDrafts, setConditionDrafts] = useState<CategoryCondition[]>(() => [createEmptyCategoryCondition(0)]);

    const [variantSort, setVariantSort] = useState<VariantSupplySort>("CUSTOM");
    const [variantSearchBy, setVariantSearchBy] = useState<VariantSearchBy>("LABEL");
    const [variantPickerQuery, setVariantPickerQuery] = useState("");

    const [manualProductSearchBy, setManualProductSearchBy] = useState<ProductSearchBy>("TITLE");
    const [manualProductPickerQuery, setManualProductPickerQuery] = useState("");
    const [manualProductSort, setManualProductSort] = useState<ProductSupplySort>("TITLE_ASC");
    const [manualSelectedProductIds, setManualSelectedProductIds] = useState<Set<string>>(new Set());
    const [selectedStoreIds, setSelectedStoreIds] = useState<Set<string>>(new Set([activeStoreId]));
    const [createCategoryError, setCreateCategoryError] = useState<CategoryCreateErrorKey | null>(null);

    const [variantsModalOpen, setVariantsModalOpen] = useState(false);
    const [productsBrowseModalOpen, setProductsBrowseModalOpen] = useState(false);
    const [storeManageModalOpen, setStoreManageModalOpen] = useState(false);

    const [newVariantNameDraft, setNewVariantNameDraft] = useState("");
    const [newVariantTypeDraft, setNewVariantTypeDraft] = useState<VariantInputType>("select");
    const [newVariantValuesDraft, setNewVariantValuesDraft] = useState<string[]>([]);
    const [newVariantValueInput, setNewVariantValueInput] = useState("");

    const [variantRuleDragId, setVariantRuleDragId] = useState<string | null>(null);
    const [variantRuleDropIndex, setVariantRuleDropIndex] = useState<number | null>(null);
    const [variantRuleDragPreview, setVariantRuleDragPreview] = useState<{ label: string; x: number; y: number } | null>(null);
    const variantRuleDragIdRef = useRef<string | null>(null);
    const variantRuleDropIndexRef = useRef<number | null>(null);
    const variantRuleRowRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const variantPointerCleanupRef = useRef<(() => void) | null>(null);
    const variantModalSearchInputRef = useRef<HTMLInputElement | null>(null);
    const productModalSearchInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        let cancelled = false;

        const hydrate = async () => {
            try {
                const state = await fetchCatalogStateFromApi();
                if (cancelled) return;
                setVariantDefinitions(state.variantDefinitions);
                setCategories(state.categoryDefinitions);
                setProducts(state.products);
                setPurchaseOrders(state.purchaseOrders);
            } catch {
                if (cancelled) return;
                setVariantDefinitions(getDefaultVariantDefinitions());
                setCategories(getDefaultProductCategoryDefinitions());
                setProducts(getDefaultProducts());
                setPurchaseOrders([]);
            }
        };

        void hydrate();
        return () => {
            cancelled = true;
        };
    }, []);

    const variantDefinitionById = useMemo(() => {
        const map = new Map<string, VariantDefinition>();
        variantDefinitions.forEach((definition) => map.set(definition.id, definition));
        return map;
    }, [variantDefinitions]);

    const selectedVariantRuleIndexById = useMemo(() => {
        const map = new Map<string, number>();
        categoryVariantRulesDraft.forEach((rule, index) => map.set(rule.variantId, index));
        return map;
    }, [categoryVariantRulesDraft]);

    const sortedVariantDefinitions = useMemo(() => {
        const next = [...variantDefinitions];
        next.sort((left, right) => {
            switch (variantSort) {
                case "CUSTOM":
                    return 0;
                case "LABEL_ASC":
                    return left.label.localeCompare(right.label, undefined, { sensitivity: "base" });
                case "LABEL_DESC":
                    return right.label.localeCompare(left.label, undefined, { sensitivity: "base" });
                case "TYPE_ASC":
                    return (VARIANT_INPUT_TYPE_ORDER[left.inputType] ?? 99) - (VARIANT_INPUT_TYPE_ORDER[right.inputType] ?? 99)
                        || left.label.localeCompare(right.label, undefined, { sensitivity: "base" });
                case "TYPE_DESC":
                    return (VARIANT_INPUT_TYPE_ORDER[right.inputType] ?? 99) - (VARIANT_INPUT_TYPE_ORDER[left.inputType] ?? 99)
                        || left.label.localeCompare(right.label, undefined, { sensitivity: "base" });
                default:
                    return 0;
            }
        });
        return next;
    }, [variantDefinitions, variantSort]);

    const filteredVariantDefinitions = useMemo(() => {
        const query = variantPickerQuery.trim().toLowerCase();
        if (!query) return sortedVariantDefinitions;
        return sortedVariantDefinitions.filter((definition) => {
            const labelValue = definition.label.toLowerCase();
            const inputTypeValue = definition.inputType.toLowerCase();
            if (variantSearchBy === "LABEL") return labelValue.includes(query);
            if (variantSearchBy === "TYPE") return inputTypeValue.includes(query);
            return definition.id.toLowerCase().includes(query);
        });
    }, [sortedVariantDefinitions, variantPickerQuery, variantSearchBy]);

    const filteredCategoryVariantRules = useMemo(() => {
        const query = variantPickerQuery.trim().toLowerCase();
        const sortedRules = [...categoryVariantRulesDraft].sort((left, right) => {
            if (variantSort === "CUSTOM") return 0;
            const leftDefinition = variantDefinitionById.get(left.variantId);
            const rightDefinition = variantDefinitionById.get(right.variantId);
            if (!leftDefinition || !rightDefinition) return 0;
            if (variantSort === "LABEL_ASC") {
                return leftDefinition.label.localeCompare(rightDefinition.label, undefined, { sensitivity: "base" });
            }
            if (variantSort === "LABEL_DESC") {
                return rightDefinition.label.localeCompare(leftDefinition.label, undefined, { sensitivity: "base" });
            }
            if (variantSort === "TYPE_ASC") {
                return (VARIANT_INPUT_TYPE_ORDER[leftDefinition.inputType] ?? 99) - (VARIANT_INPUT_TYPE_ORDER[rightDefinition.inputType] ?? 99)
                    || leftDefinition.label.localeCompare(rightDefinition.label, undefined, { sensitivity: "base" });
            }
            return (VARIANT_INPUT_TYPE_ORDER[rightDefinition.inputType] ?? 99) - (VARIANT_INPUT_TYPE_ORDER[leftDefinition.inputType] ?? 99)
                || leftDefinition.label.localeCompare(rightDefinition.label, undefined, { sensitivity: "base" });
        });
        if (!query) return sortedRules;
        return sortedRules.filter((rule) => {
            const definition = variantDefinitionById.get(rule.variantId);
            if (!definition) return false;
            const labelValue = definition.label.toLowerCase();
            const inputTypeValue = definition.inputType.toLowerCase();
            if (variantSearchBy === "LABEL") return labelValue.includes(query);
            if (variantSearchBy === "TYPE") return inputTypeValue.includes(query);
            return definition.id.toLowerCase().includes(query);
        });
    }, [categoryVariantRulesDraft, variantDefinitionById, variantPickerQuery, variantSearchBy, variantSort]);

    const productPriceById = useMemo(
        () => buildProductPriceMap(purchaseOrders),
        [purchaseOrders]
    );

    const sortedProducts = useMemo(() => {
        const next = [...products];
        next.sort((left, right) => {
            const leftPrice = productPriceById.get(left.id) ?? 0;
            const rightPrice = productPriceById.get(right.id) ?? 0;
            switch (manualProductSort) {
                case "TITLE_ASC":
                    return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
                case "TITLE_DESC":
                    return right.name.localeCompare(left.name, undefined, { sensitivity: "base" });
                case "PRICE_HIGH":
                    return rightPrice - leftPrice;
                case "PRICE_LOW":
                    return leftPrice - rightPrice;
                case "NEWEST":
                    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
                case "OLDEST":
                    return new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime();
                default:
                    return 0;
            }
        });
        return next;
    }, [manualProductSort, productPriceById, products]);

    const selectedManualProducts = useMemo(
        () => sortedProducts.filter((product) => manualSelectedProductIds.has(product.id)),
        [sortedProducts, manualSelectedProductIds]
    );

    const filteredProductPickerResults = useMemo(() => {
        const query = manualProductPickerQuery.trim().toLowerCase();
        if (!query) return sortedProducts;
        return sortedProducts.filter((product) => {
            if (manualProductSearchBy === "TITLE") return product.name.toLowerCase().includes(query);
            if (manualProductSearchBy === "SKU") return product.sku.toLowerCase().includes(query);
            return product.id.toLowerCase().includes(query);
        });
    }, [manualProductPickerQuery, manualProductSearchBy, sortedProducts]);

    const selectedStoreCount = selectedStoreIds.size;
    const selectedVariantCount = categoryVariantRulesDraft.length;
    const requiredVariantCount = useMemo(
        () => categoryVariantRulesDraft.filter((rule) => rule.required).length,
        [categoryVariantRulesDraft]
    );
    const selectedProductsCount = manualSelectedProductIds.size;

    const categoryNameError = createCategoryError === "categoryNameRequired" ? ERROR_MESSAGES.categoryNameRequired : null;
    const variantRulesError = createCategoryError === "variantRuleRequired" ? ERROR_MESSAGES.variantRuleRequired : null;
    const storeSelectionError = createCategoryError === "storeRequired" ? ERROR_MESSAGES.storeRequired : null;
    const conditionValueError = createCategoryError === "conditionValueRequired" ? ERROR_MESSAGES.conditionValueRequired : null;
    const saveError = createCategoryError === "saveFailed" ? ERROR_MESSAGES.saveFailed : null;
    const createVariantNameError = createCategoryError === "variantNameRequired" || createCategoryError === "variantConflict"
        ? ERROR_MESSAGES[createCategoryError]
        : null;
    const createVariantValuesError = createCategoryError === "selectValuesRequired" ? ERROR_MESSAGES.selectValuesRequired : null;

    const toggleCategoryVariantRequired = (variantId: string, required: boolean) => {
        setCategoryVariantRulesDraft((current) => current.map((rule) => (
            rule.variantId === variantId ? { ...rule, required } : rule
        )));
    };

    const toggleCategoryVariantSelection = (variantId: string, checked: boolean) => {
        setCategoryVariantRulesDraft((current) => {
            if (checked) {
                if (current.some((rule) => rule.variantId === variantId)) return current;
                return [...current, { variantId, required: false }];
            }
            return current.filter((rule) => rule.variantId !== variantId);
        });
        if (checked && createCategoryError === "variantRuleRequired") {
            setCreateCategoryError(null);
        }
    };

    const updateVariantDropIndex = (nextDropIndex: number) => {
        variantRuleDropIndexRef.current = nextDropIndex;
        setVariantRuleDropIndex((current) => (current === nextDropIndex ? current : nextDropIndex));
    };

    const clearVariantReorderDragState = () => {
        if (typeof document !== "undefined") {
            document.body.classList.remove(COLUMN_DRAGGING_BODY_CLASS);
        }
        setVariantRuleDropIndex(null);
        setVariantRuleDragId(null);
        setVariantRuleDragPreview(null);
        variantRuleDragIdRef.current = null;
        variantRuleDropIndexRef.current = null;
    };

    const commitVariantReorder = (nextDropIndex: number) => {
        const activeDragId = variantRuleDragIdRef.current ?? variantRuleDragId;
        if (!activeDragId) return;
        setCategoryVariantRulesDraft((current) => {
            const sourceIndex = current.findIndex((entry) => entry.variantId === activeDragId);
            if (sourceIndex < 0) return current;
            return reorderVariantRulesByInsertionIndex(current, sourceIndex, nextDropIndex);
        });
        clearVariantReorderDragState();
    };

    const startVariantPointerDrag = (event: ReactPointerEvent<HTMLButtonElement>, variantId: string, sourceIndex: number) => {
        if (variantSort !== "CUSTOM") return;
        if (sourceIndex < 0 || sourceIndex >= categoryVariantRulesDraft.length) return;
        if (categoryVariantRulesDraft.length < 2) return;
        if (event.button !== 0) return;
        event.preventDefault();

        variantPointerCleanupRef.current?.();
        if (typeof document !== "undefined") {
            document.body.classList.add(COLUMN_DRAGGING_BODY_CLASS);
        }

        variantRuleDragIdRef.current = variantId;
        variantRuleDropIndexRef.current = sourceIndex;
        setVariantRuleDragId(variantId);
        setVariantRuleDropIndex(sourceIndex);
        setVariantRuleDragPreview({
            label: variantDefinitionById.get(variantId)?.label ?? variantId,
            x: event.clientX,
            y: event.clientY,
        });

        const pointerId = event.pointerId;
        event.currentTarget.setPointerCapture(pointerId);

        const updateDropIndexFromClientY = (clientY: number) => {
            let nextDropIndex = categoryVariantRulesDraft.length;
            for (let index = 0; index < categoryVariantRulesDraft.length; index += 1) {
                const row = variantRuleRowRefs.current[categoryVariantRulesDraft[index].variantId];
                if (!row) continue;
                const rect = row.getBoundingClientRect();
                if (clientY < rect.top + rect.height / 2) {
                    nextDropIndex = index;
                    break;
                }
            }
            updateVariantDropIndex(nextDropIndex);
        };

        const cleanup = () => {
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
            window.removeEventListener("pointercancel", onPointerCancel);
            variantPointerCleanupRef.current = null;
        };

        const finish = (applyReorder: boolean) => {
            cleanup();
            if (!applyReorder) {
                clearVariantReorderDragState();
                return;
            }
            commitVariantReorder(variantRuleDropIndexRef.current ?? sourceIndex);
        };

        const onPointerMove = (moveEvent: PointerEvent) => {
            if (moveEvent.pointerId !== pointerId) return;
            setVariantRuleDragPreview((current) => (
                current ? { ...current, x: moveEvent.clientX, y: moveEvent.clientY } : current
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
        variantPointerCleanupRef.current = cleanup;
    };

    useEffect(() => () => {
        variantPointerCleanupRef.current?.();
        if (typeof document !== "undefined") {
            document.body.classList.remove(COLUMN_DRAGGING_BODY_CLASS);
        }
    }, []);

    useEffect(() => {
        if (!variantsModalOpen) return;
        const frame = window.requestAnimationFrame(() => {
            variantModalSearchInputRef.current?.focus();
        });
        return () => window.cancelAnimationFrame(frame);
    }, [variantsModalOpen]);

    useEffect(() => {
        if (!productsBrowseModalOpen) return;
        const frame = window.requestAnimationFrame(() => {
            productModalSearchInputRef.current?.focus();
        });
        return () => window.cancelAnimationFrame(frame);
    }, [productsBrowseModalOpen]);

    const handleVariantToolbarSearchChange = (value: string) => {
        setVariantPickerQuery(value);
        if (value.trim().length > 0) {
            setVariantsModalOpen(true);
        }
    };

    const handleProductToolbarSearchChange = (value: string) => {
        setManualProductPickerQuery(value);
        if (value.trim().length > 0) {
            setProductsBrowseModalOpen(true);
        }
    };

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

    const createVariant = () => {
        const name = newVariantNameDraft.trim();
        if (!name) {
            setCreateCategoryError("variantNameRequired");
            return;
        }

        const hasConflict = variantDefinitions.some((definition) => definition.label.toLowerCase() === name.toLowerCase());
        if (hasConflict) {
            setCreateCategoryError("variantConflict");
            return;
        }

        const valuesResult = newVariantTypeDraft === "select"
            ? appendMultiValueInput(newVariantValuesDraft, newVariantValueInput)
            : null;
        const values = valuesResult?.nextValues ?? [];
        if (valuesResult && valuesResult.duplicateValues.length > 0) {
            notifyPortalAction({ message: DUPLICATE_VALUE_MESSAGE, tone: "warning" });
        }
        if (newVariantTypeDraft === "select" && values.length === 0) {
            setCreateCategoryError("selectValuesRequired");
            return;
        }

        const id = createUniqueVariantId(name, variantDefinitions);
        const nextVariantDefinitions: VariantDefinition[] = [
            ...variantDefinitions,
            {
                id,
                label: name,
                inputType: newVariantTypeDraft,
                values: normalizeMultiValueList(values),
            },
        ];
        setVariantDefinitions(nextVariantDefinitions);
        void saveCatalogStateToApi({ variantDefinitions: nextVariantDefinitions }).catch(() => undefined);

        setCategoryVariantRulesDraft((current) => (
            current.some((rule) => rule.variantId === id) ? current : [...current, { variantId: id, required: false }]
        ));
        setCreateCategoryError(null);
        setNewVariantNameDraft("");
        setNewVariantTypeDraft("select");
        setNewVariantValuesDraft([]);
        setNewVariantValueInput("");
        setVariantPickerQuery("");
    };

    const updateCondition = (conditionId: string, updater: (condition: CategoryCondition) => CategoryCondition) => {
        setConditionDrafts((current) => current.map((condition) => (
            condition.id === conditionId ? updater(condition) : condition
        )));
        if (createCategoryError === "conditionValueRequired") {
            setCreateCategoryError(null);
        }
    };

    const addCondition = () => {
        setConditionDrafts((current) => [...current, createEmptyCategoryCondition(current.length)]);
    };

    const removeCondition = (conditionId: string) => {
        setConditionDrafts((current) => {
            if (current.length <= 1) return current;
            return current.filter((condition) => condition.id !== conditionId);
        });
    };

    const toggleManualProduct = (productId: string, checked: boolean) => {
        setManualSelectedProductIds((current) => {
            const next = new Set(current);
            if (checked) next.add(productId);
            else next.delete(productId);
            return next;
        });
    };

    const toggleStoreSelection = (storeId: string, checked: boolean) => {
        setSelectedStoreIds((current) => {
            const next = new Set(current);
            if (checked) next.add(storeId);
            else next.delete(storeId);
            return next;
        });
        if (createCategoryError === "storeRequired") {
            setCreateCategoryError(null);
        }
    };

    const canCreateCategory = useMemo(() => {
        if (categoryNameDraft.trim().length === 0) return false;
        if (selectedStoreIds.size === 0) return false;
        return true;
    }, [categoryNameDraft, selectedStoreIds.size]);

    const createCategory = useCallback(async () => {
        const title = normalizeString(categoryNameDraft);
        if (!title) {
            setCreateCategoryError("categoryNameRequired");
            return false;
        }
        if (selectedStoreIds.size === 0) {
            setCreateCategoryError("storeRequired");
            return false;
        }

        const normalizedConditions = conditionDrafts
            .map((condition) => ({
                ...condition,
                value: normalizeConditionValue(condition),
                valueCurrency: condition.valueCurrency?.trim().toUpperCase() || undefined,
            }))
            .filter((condition) => condition.value.length > 0);

        const nextCategoryId = createUniqueCategoryId(title, categories);
        const nowIso = new Date().toISOString();
        const nextCategory: ProductCategoryDefinition = {
            id: nextCategoryId,
            title,
            description: normalizeString(categoryDescriptionDraft) || undefined,
            createdAt: nowIso,
            updatedAt: nowIso,
            updatedBy: "You",
            type: categoryTypeDraft,
            conditionMode: conditionModeDraft,
            conditions: categoryTypeDraft === "SMART" ? normalizedConditions : [],
            manualProductIds: categoryTypeDraft === "MANUAL" ? Array.from(manualSelectedProductIds) : [],
            storeIds: Array.from(selectedStoreIds),
            products: 0,
            productCondition: categoryTypeDraft === "SMART"
                ? `${conditionModeDraft === "ANY" ? "Any condition" : "All conditions"} (${normalizedConditions.length})`
                : "Manual category",
            variantRules: categoryVariantRulesDraft.map((rule) => ({
                variantId: rule.variantId,
                required: Boolean(rule.required),
            })),
        };

        const nextCategories = [nextCategory, ...categories];
        const manualSelectedIds = new Set(manualSelectedProductIds);
        const nextProductsRaw = products.map((product) => {
            if (categoryTypeDraft !== "MANUAL" || !manualSelectedIds.has(product.id)) return product;
            const nextCategoryIds = Array.from(new Set([...(product.categoryIds ?? []), nextCategoryId]));
            return {
                ...product,
                categoryIds: nextCategoryIds,
                category: product.category || title,
                updatedAt: new Date().toISOString(),
            };
        });

        const reconciled = reconcileCatalogProductsAndCategories({
            products: nextProductsRaw,
            categories: nextCategories,
            purchaseOrders,
        });

        setCategories(reconciled.categories);
        setProducts(reconciled.products);

        try {
            await saveCatalogStateToApi({
                variantDefinitions,
                categoryDefinitions: reconciled.categories,
                products: reconciled.products,
            });
        } catch {
            setCreateCategoryError("saveFailed");
            return false;
        }

        void navigateTo("/products/categories");
        return true;
    }, [
        categories,
        categoryDescriptionDraft,
        categoryNameDraft,
        categoryTypeDraft,
        categoryVariantRulesDraft,
        conditionDrafts,
        conditionModeDraft,
        manualSelectedProductIds,
        products,
        purchaseOrders,
        navigateTo,
        variantDefinitions,
        selectedStoreIds,
    ]);

    usePendingChangesHeader({
        active: true,
        scope: "productCreate",
        discardLabelVariant: "cancel",
        saveDisabled: !canCreateCategory,
        onSave: createCategory,
        onDiscard: () => void navigateTo("/products/categories"),
    });

    return (
        <section className="portalCategoryCreatePage__L6m2Q8 portalProductCreatePage__A3m8Q1">
            <PortalPageTitle
                page="categories"
                title="Add category"
                icon={<FolderPlus className="portalPageHeadingIcon__Q8m2D5" aria-hidden="true" />}
            />

            <div className="portalProductCreateLayout__F7m2Q1">
                <div className="portalProductCreateMainColumn__R7m2Q9">
                    <section className="portalProductCreateMainCard__N4m8Q3 ui-surface-card">
                        <CategorySectionHeader
                            title="Category details"
                            description="Set the title and optional description used for this category."
                            showTooltip={false}
                        />

                        <label className="form__group__K7p2s0">
                            <span className="form__label__B9f4k0">Title</span>
                            <input
                                className="form__input__Z3n7q0"
                                value={categoryNameDraft}
                                onChange={(event) => {
                                    setCategoryNameDraft(event.target.value);
                                    if (createCategoryError === "categoryNameRequired") {
                                        setCreateCategoryError(null);
                                    }
                                }}
                                maxLength={64}
                                placeholder="Category title"
                                aria-label="Category title"
                            />
                            {categoryNameError ? <p className="portalCategoriesError__C6m2Q8">{categoryNameError}</p> : null}
                        </label>

                        <label className="form__group__K7p2s0">
                            <span className="form__label__B9f4k0">Description</span>
                            <textarea
                                className="form__textarea__Q6p3f0"
                                value={categoryDescriptionDraft}
                                onChange={(event) => setCategoryDescriptionDraft(event.target.value)}
                                rows={4}
                                placeholder="Describe this category"
                            />
                        </label>
                    </section>

                    <section className="portalProductCreateMainCard__N4m8Q3 ui-surface-card">
                        <CategorySectionHeader
                            title="Variants"
                            description="Attach variants for this category and set their required status."
                        />

                        <div className="portalCategoryCreatePickerToolbar__P6m8Q1">
                            <label className="portalCategoryCreateSearchField__Q6m2Q8">
                                <Search aria-hidden="true" />
                                <input
                                    className="form__input__Z3n7q0 portalCategoryCreateSearchInput__T6m2Q3"
                                    value={variantPickerQuery}
                                    onChange={(event) => handleVariantToolbarSearchChange(event.target.value)}
                                    placeholder="Search variants"
                                />
                            </label>
                            <Button type="button" kind="basic" size="xsmall" onClick={() => setVariantsModalOpen(true)}>
                                Browse
                            </Button>
                            <label className="portalCategoryCreateSearchByField__U2m8Q4 portalCategoryCreateSortField__X2m8Q1">
                                <span className="portalCategoryCreateSearchByPrefix__A8m2Q3">Sort by{" "}</span>
                                <select
                                    className="form__select__P9j2k0 portalCategoryCreateSearchBySelect__V2m8Q4 portalCategoryCreateSortSelect__J4m8Q2"
                                    value={variantSort}
                                    onChange={(event) => setVariantSort(event.target.value as VariantSupplySort)}
                                >
                                    <option value="CUSTOM">Custom</option>
                                    <option value="LABEL_ASC">Name A-Z</option>
                                    <option value="LABEL_DESC">Name Z-A</option>
                                    <option value="TYPE_ASC">Input type sequence</option>
                                    <option value="TYPE_DESC">Input type reverse sequence</option>
                                </select>
                            </label>
                        </div>

                        {filteredCategoryVariantRules.length === 0 ? (
                            <div className="portalCategoryCreateEmptySupply__B3m2Q8">
                                <Tags aria-hidden="true" />
                                <p>There are no variants attached to this category.</p>
                                <small>Search or browse to add variants.</small>
                            </div>
                        ) : (
                            <div className="portalCategoryCreateOverviewList__N9m2Q5">
                                {filteredCategoryVariantRules.map((rule, visibleIndex) => {
                                    const definition = variantDefinitionById.get(rule.variantId);
                                    if (!definition) return null;
                                    const sourceIndex = categoryVariantRulesDraft.findIndex((entry) => entry.variantId === rule.variantId);
                                    const canDrag = variantSort === "CUSTOM" && variantPickerQuery.trim().length === 0 && categoryVariantRulesDraft.length > 1;
                                    const isDragging = variantRuleDragId === rule.variantId;
                                    if (isDragging) return null;

                                    const isDropBefore = canDrag
                                        && variantRuleDropIndex === sourceIndex
                                        && variantRuleDragId !== rule.variantId;
                                    const isDropAfter = canDrag
                                        && visibleIndex === filteredCategoryVariantRules.length - 1
                                        && variantRuleDropIndex === categoryVariantRulesDraft.length
                                        && variantRuleDragId !== rule.variantId;
                                    return (
                                        <div key={rule.variantId} className="portalCategoryCreateOverviewItem__F4m8Q2">
                                            {isDropBefore ? <div className="portalProductsColumnDropPlaceholder__Q2m8P6" aria-hidden="true" /> : null}
                                            <div
                                                ref={(node) => {
                                                    variantRuleRowRefs.current[rule.variantId] = node;
                                                }}
                                                className="portalCategoryCreateOverviewRow__Q7m2Q6"
                                            >
                                                {variantSort === "CUSTOM" ? (
                                                    <button
                                                        type="button"
                                                        className="portalProductsColumnDragHandle__W7m2Q6 portalCategoryCreateOverviewDragHandle__J3m8Q2"
                                                        aria-label={`Drag ${definition.label}`}
                                                        disabled={!canDrag}
                                                        onPointerDown={(pointerEvent) => startVariantPointerDrag(pointerEvent, rule.variantId, sourceIndex)}
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
                                                            onChange={(event) => toggleCategoryVariantRequired(rule.variantId, event.target.checked)}
                                                        />
                                                        Required
                                                    </label>
                                                    <button
                                                        type="button"
                                                        className="portalCategoryCreateVariantRemove__K2m8Q4"
                                                        aria-label={`Remove ${definition.label}`}
                                                        onClick={() => toggleCategoryVariantSelection(rule.variantId, false)}
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

                        {variantRulesError ? <p className="portalCategoriesError__C6m2Q8">{variantRulesError}</p> : null}
                    </section>

                    <section className="portalProductCreateMainCard__N4m8Q3 ui-surface-card">
                        <CategorySectionHeader
                            title="Category type"
                            description="Manual categories use selected products. Smart categories include matching products automatically."
                        />

                        <div className="portalCategoryCreateTypeOptions__R6m8Q2">
                            <div className="portalCategoryCreateTypeChoices__W2m8Q4" role="radiogroup" aria-label="Category type">
                                <div className="portalCategoryCreateTypeChoice__K6m2Q8">
                                    <button
                                        type="button"
                                        role="radio"
                                        aria-checked={categoryTypeDraft === "MANUAL"}
                                        className={cn("portalCategoryCreateRadioOption__W4m2Q7", categoryTypeDraft === "MANUAL" && "portalCategoryCreateRadioOptionActive__N2m8Q1")}
                                        onClick={() => setCategoryTypeDraft("MANUAL")}
                                    >
                                        Manual
                                    </button>
                                    <p className="portalCategoryCreateTypeChoiceDescription__M8m2Q5">
                                        Add products to this category one by one.
                                    </p>
                                </div>
                                <div className="portalCategoryCreateTypeChoice__K6m2Q8">
                                    <button
                                        type="button"
                                        role="radio"
                                        aria-checked={categoryTypeDraft === "SMART"}
                                        className={cn("portalCategoryCreateRadioOption__W4m2Q7", categoryTypeDraft === "SMART" && "portalCategoryCreateRadioOptionActive__N2m8Q1")}
                                        onClick={() => setCategoryTypeDraft("SMART")}
                                    >
                                        Smart
                                    </button>
                                    <p className="portalCategoryCreateTypeChoiceDescription__M8m2Q5">
                                        Include existing and future products automatically when they match your conditions.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {categoryTypeDraft === "SMART" ? (
                        <section className="portalProductCreateMainCard__N4m8Q3 ui-surface-card">
                            <CategorySectionHeader
                                title="Conditions"
                                description="Set the rules that products must satisfy to be included in this smart category."
                            />

                            <div className="portalCategoryCreateMatchMode__A8m2Q3">
                                <span className="portalCategoryCreateMatchLabel__C4m2Q8">Product must match</span>
                                <div className="portalCategoryCreateRadioGroup__E2m8Q3" role="radiogroup" aria-label="Condition match mode">
                                    <button
                                        type="button"
                                        role="radio"
                                        aria-checked={conditionModeDraft === "ALL"}
                                        className={cn("portalCategoryCreateRadioOption__W4m2Q7", conditionModeDraft === "ALL" && "portalCategoryCreateRadioOptionActive__N2m8Q1")}
                                        onClick={() => setConditionModeDraft("ALL")}
                                    >
                                        All conditions
                                    </button>
                                    <button
                                        type="button"
                                        role="radio"
                                        aria-checked={conditionModeDraft === "ANY"}
                                        className={cn("portalCategoryCreateRadioOption__W4m2Q7", conditionModeDraft === "ANY" && "portalCategoryCreateRadioOptionActive__N2m8Q1")}
                                        onClick={() => setConditionModeDraft("ANY")}
                                    >
                                        Any condition
                                    </button>
                                </div>
                            </div>

                            <div className="portalCategoryCreateConditionList__G6m8Q2">
                                {conditionDrafts.map((condition) => {
                                    const fieldMeta = getConditionFieldMeta(condition.field);
                                    const operatorOptions = getCategoryConditionOperatorOptions(condition.field);
                                    const hasDelete = conditionDrafts.length > 1;
                                    return (
                                        <div
                                            key={condition.id}
                                            className={cn(
                                                "portalCategoryCreateConditionRow__V4m8Q5",
                                                hasDelete && "portalCategoryCreateConditionRowWithDelete__M2m8Q5"
                                            )}
                                        >
                                            <select
                                                className="form__select__P9j2k0"
                                                value={condition.field}
                                                onChange={(event) => {
                                                    const nextField = event.target.value as CategoryCondition["field"];
                                                    updateCondition(condition.id, (current) => ({
                                                        ...current,
                                                        field: nextField,
                                                        operator: getDefaultOperatorForField(nextField),
                                                        valueCurrency: getConditionFieldMeta(nextField).valueInput === "currency"
                                                            ? (current.valueCurrency || storeCurrency)
                                                            : undefined,
                                                    }));
                                                }}
                                            >
                                                {CATEGORY_CONDITION_FIELD_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>

                                            <select
                                                className="form__select__P9j2k0"
                                                value={condition.operator}
                                                onChange={(event) => {
                                                    updateCondition(condition.id, (current) => ({
                                                        ...current,
                                                        operator: event.target.value as CategoryCondition["operator"],
                                                    }));
                                                }}
                                            >
                                                {operatorOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>

                                            {fieldMeta.valueInput === "currency" ? (
                                                <div className="portalProductCreateMoneyField__M4n2Q9">
                                                    <span className="portalProductCreateMoneyFieldCurrency__T6m2Q7">
                                                        <select
                                                            className="portalProductCreateMoneyFieldSelect__G2m8Q4"
                                                            value={condition.valueCurrency || storeCurrency}
                                                            onChange={(event) => {
                                                                updateCondition(condition.id, (current) => ({
                                                                    ...current,
                                                                    valueCurrency: event.target.value,
                                                                }));
                                                            }}
                                                        >
                                                            <option value={storeCurrency}>{storeCurrency}</option>
                                                        </select>
                                                        <span className="portalProductCreateMoneyFieldCode__M9k2P4">{condition.valueCurrency || storeCurrency}</span>
                                                    </span>
                                                    <input
                                                        className="portalProductCreateMoneyFieldAmount__W8m2Q5"
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={condition.value}
                                                        onChange={(event) => {
                                                            updateCondition(condition.id, (current) => ({
                                                                ...current,
                                                                value: event.target.value,
                                                            }));
                                                        }}
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            ) : (
                                                <input
                                                    className="form__input__Z3n7q0"
                                                    type={fieldMeta.valueInput === "number" ? "number" : "text"}
                                                    value={condition.value}
                                                    onChange={(event) => {
                                                        updateCondition(condition.id, (current) => ({
                                                            ...current,
                                                            value: event.target.value,
                                                        }));
                                                    }}
                                                    placeholder={fieldMeta.valueInput === "number" ? "0" : "Enter value"}
                                                />
                                            )}

                                            {hasDelete ? (
                                                <button
                                                    type="button"
                                                    className="portalCategoryCreateConditionDelete__H3m8Q2"
                                                    onClick={() => removeCondition(condition.id)}
                                                    aria-label="Remove condition"
                                                >
                                                    <Trash2 aria-hidden="true" />
                                                </button>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>

                            <Button type="button" kind="basic" size="xsmall" onClick={addCondition}>
                                <Plus aria-hidden="true" />
                                Add another condition
                            </Button>
                            {conditionValueError ? <p className="portalCategoriesError__C6m2Q8">{conditionValueError}</p> : null}
                        </section>
                    ) : (
                        <section className="portalProductCreateMainCard__N4m8Q3 ui-surface-card">
                            <CategorySectionHeader
                                title="Products"
                                description="Search, sort, and select products to include in this manual category."
                            />

                            <div className="portalCategoryCreatePickerToolbar__P6m8Q1">
                                <label className="portalCategoryCreateSearchField__Q6m2Q8">
                                    <Search aria-hidden="true" />
                                    <input
                                        className="form__input__Z3n7q0 portalCategoryCreateSearchInput__T6m2Q3"
                                        value={manualProductPickerQuery}
                                        onChange={(event) => handleProductToolbarSearchChange(event.target.value)}
                                        placeholder="Search products"
                                    />
                                </label>
                                <Button type="button" kind="basic" size="xsmall" onClick={() => setProductsBrowseModalOpen(true)}>
                                    Browse
                                </Button>
                                <label className="portalCategoryCreateSearchByField__U2m8Q4 portalCategoryCreateSortField__X2m8Q1">
                                    <span className="portalCategoryCreateSearchByPrefix__A8m2Q3">Sort by{" "}</span>
                                    <select
                                        className="form__select__P9j2k0 portalCategoryCreateSearchBySelect__V2m8Q4 portalCategoryCreateSortSelect__J4m8Q2"
                                        value={manualProductSort}
                                        onChange={(event) => setManualProductSort(event.target.value as ProductSupplySort)}
                                    >
                                        <option value="TITLE_ASC">Title A-Z</option>
                                        <option value="TITLE_DESC">Title Z-A</option>
                                        <option value="PRICE_HIGH">Highest price</option>
                                        <option value="PRICE_LOW">Lowest price</option>
                                        <option value="NEWEST">Newest</option>
                                        <option value="OLDEST">Oldest</option>
                                    </select>
                                </label>
                            </div>

                            {selectedManualProducts.length === 0 ? (
                                <div className="portalCategoryCreateEmptySupply__B3m2Q8">
                                    <PackageSearch aria-hidden="true" />
                                    <p>There are no products in this category.</p>
                                    <small>Search or browse to add products.</small>
                                </div>
                            ) : (
                                <div className="portalCategoryCreateSupplyList__Q5m2Q8">
                                    {selectedManualProducts.map((product) => (
                                        <label key={product.id} className="portalCategoryCreateSupplyRow__A7m2Q6">
                                            <input
                                                type="checkbox"
                                                checked={manualSelectedProductIds.has(product.id)}
                                                onChange={(event) => toggleManualProduct(product.id, event.target.checked)}
                                            />
                                            <span className="portalCategoryCreateSupplyName__L2m8Q4">{product.name}</span>
                                            <small className="portalCategoryCreateSupplyMeta__M2m8Q5">
                                                {`${product.sku} · ${getProductCategoryTitles(product, categories).join(", ") || "-"}`}
                                            </small>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {saveError ? <p className="portalCategoriesError__C6m2Q8">{saveError}</p> : null}
                </div>

                <aside className="portalProductCreateSidebar__N9m2Q6">
                    <section className="portalProductCreateSidebarCard__K2m8Q3 ui-surface-card">
                        <CategorySectionHeader
                            title="Publishing"
                            description="Choose which stores this category is synced to."
                            action={(
                                <button
                                    type="button"
                                    className="portalCategoryCreateInlineLink__W4m8Q2"
                                    onClick={() => setStoreManageModalOpen(true)}
                                >
                                    Manage
                                </button>
                            )}
                        />

                        <ul className="ui-unordered-list portalCategoryCreateStoreList__W9m2Q7">
                            {stores
                                .filter((store) => selectedStoreIds.has(store.id))
                                .map((store) => (
                                    <li key={store.id}>
                                        {store.name}
                                    </li>
                                ))}
                        </ul>
                        {storeSelectionError ? <p className="portalCategoriesError__C6m2Q8">{storeSelectionError}</p> : null}
                    </section>

                    <section className="portalProductCreateSidebarCard__K2m8Q3 ui-surface-card">
                        <CategorySectionHeader
                            title="Summary"
                            description="Overview of this category before saving."
                        />
                        <dl className="portalCategoryCreateSummaryList__M4m8Q2">
                            <div className="portalCategoryCreateSummaryRow__J8m2Q4">
                                <dt>Type</dt>
                                <dd>{categoryTypeDraft === "SMART" ? "Smart" : "Manual"}</dd>
                            </div>
                            <div className="portalCategoryCreateSummaryRow__J8m2Q4">
                                <dt>Variants</dt>
                                <dd>{selectedVariantCount}</dd>
                            </div>
                            <div className="portalCategoryCreateSummaryRow__J8m2Q4">
                                <dt>Required variants</dt>
                                <dd>{requiredVariantCount}</dd>
                            </div>
                            <div className="portalCategoryCreateSummaryRow__J8m2Q4">
                                <dt>Stores</dt>
                                <dd>{selectedStoreCount}</dd>
                            </div>
                            <div className="portalCategoryCreateSummaryRow__J8m2Q4">
                                <dt>{categoryTypeDraft === "SMART" ? "Conditions" : "Selected products"}</dt>
                                <dd>{categoryTypeDraft === "SMART" ? conditionDrafts.length : selectedProductsCount}</dd>
                            </div>
                        </dl>
                    </section>
                </aside>
            </div>

            <div className="portalCategoryCreateBottomActions__F2m8Q5">
                <Button type="button" kind="primary" size="xsmall" onClick={() => { void createCategory(); }} disabled={!canCreateCategory}>
                    Save
                </Button>
            </div>

            <PortalModal
                open={variantsModalOpen}
                title="Add variants"
                closeLabel="Close variants pop-up"
                onClose={() => setVariantsModalOpen(false)}
                bodyClassName="portalModalBodyTall__M2m8Q4"
                footer={(
                    <Button type="button" kind="primary" size="xsmall" onClick={() => setVariantsModalOpen(false)}>
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
                                const selectedIndex = selectedVariantRuleIndexById.get(definition.id);
                                const checked = typeof selectedIndex === "number";
                                const rule = checked && typeof selectedIndex === "number"
                                    ? categoryVariantRulesDraft[selectedIndex]
                                    : null;

                                return (
                                    <div key={definition.id} className="portalProductsColumnOptionItem__A4m2Q7">
                                        <div className="portalProductsColumnOptionRow__H4m8Q7">
                                            <label className="portalProductsColumnOption__V2m8Q6">
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={(event) => toggleCategoryVariantSelection(definition.id, event.target.checked)}
                                                />
                                                <span className="portalProductsColumnOptionLabel__K7m2Q1">{definition.label}</span>
                                            </label>

                                            <span className="portalProductsColumnOrderControls__D3m8Q9">
                                                {rule ? (
                                                    <label className="portalCategoriesVariantRuleRequiredInline__B7m2Q5">
                                                        <input
                                                            type="checkbox"
                                                            checked={rule.required}
                                                            onChange={(event) => toggleCategoryVariantRequired(rule.variantId, event.target.checked)}
                                                        />
                                                        Required
                                                    </label>
                                                ) : null}
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
                                        if (createCategoryError === "variantNameRequired" || createCategoryError === "variantConflict") {
                                            setCreateCategoryError(null);
                                        }
                                    }}
                                    placeholder="Variant name"
                                />
                                {createVariantNameError ? <p className="portalCategoriesError__C6m2Q8">{createVariantNameError}</p> : null}
                            </label>

                            <label className="portalCategoriesField__R8m2Q3">
                                <span>Input type</span>
                                <select
                                    className="form__select__P9j2k0"
                                    value={newVariantTypeDraft}
                                    onChange={(event) => {
                                        const nextType = event.target.value as VariantInputType;
                                        setNewVariantTypeDraft(nextType);
                                        if (createCategoryError === "selectValuesRequired") {
                                            setCreateCategoryError(null);
                                        }
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
                                                onChange={(event) => {
                                                    setNewVariantValueInput(event.target.value);
                                                    if (createCategoryError === "selectValuesRequired") {
                                                        setCreateCategoryError(null);
                                                    }
                                                }}
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
                                    {createVariantValuesError ? <p className="portalCategoriesError__C6m2Q8">{createVariantValuesError}</p> : null}
                                </label>
                            ) : null}
                        </div>

                        <div className="portalCategoriesVariantCreateActions__G2m8Q6">
                            <Button type="button" kind="basic" size="xsmall" onClick={createVariant}>
                                Add variant
                            </Button>
                        </div>
                    </section>
                </div>
            </PortalModal>

            <PortalModal
                open={productsBrowseModalOpen}
                title="Browse products"
                closeLabel="Close products pop-up"
                onClose={() => setProductsBrowseModalOpen(false)}
                bodyClassName="portalModalBodyTall__M2m8Q4"
                footer={(
                    <Button type="button" kind="primary" size="xsmall" onClick={() => setProductsBrowseModalOpen(false)}>
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
                                    ref={productModalSearchInputRef}
                                    className="form__input__Z3n7q0 portalCategoryCreateSearchInput__T6m2Q3"
                                    value={manualProductPickerQuery}
                                    onChange={(event) => setManualProductPickerQuery(event.target.value)}
                                    placeholder="Search products"
                                />
                            </label>
                            <label className="portalCategoryCreateSearchByField__U2m8Q4">
                                <span className="portalCategoryCreateSearchByPrefix__A8m2Q3">Search by{" "}</span>
                                <select
                                    className="form__select__P9j2k0 portalCategoryCreateSearchBySelect__V2m8Q4"
                                    value={manualProductSearchBy}
                                    onChange={(event) => setManualProductSearchBy(event.target.value as ProductSearchBy)}
                                >
                                    <option value="TITLE">Product title</option>
                                    <option value="ID">Product ID</option>
                                    <option value="SKU">SKU</option>
                                </select>
                            </label>
                        </div>
                        <div className="portalProductsColumnsSectionList__V3m8Q6 portalCategoriesVariantPickerList__A9m2Q5">
                            {filteredProductPickerResults.length === 0 ? (
                                <div className="portalCategoryCreatePickerEmpty__S2m8Q5">
                                    <PackageSearch aria-hidden="true" />
                                    <p>No products found.</p>
                                    <small>Try adjusting the filters or search term.</small>
                                </div>
                            ) : filteredProductPickerResults.map((product) => (
                                <label key={product.id} className="portalCategoryCreateSupplyRow__A7m2Q6">
                                    <input
                                        type="checkbox"
                                        checked={manualSelectedProductIds.has(product.id)}
                                        onChange={(event) => toggleManualProduct(product.id, event.target.checked)}
                                    />
                                    <span className="portalCategoryCreateSupplyName__L2m8Q4">{product.name}</span>
                                    <small className="portalCategoryCreateSupplyMeta__M2m8Q5">{product.sku}</small>
                                </label>
                            ))}
                        </div>
                    </section>
                </div>
            </PortalModal>

            <PortalModal
                open={storeManageModalOpen}
                title="Manage stores"
                closeLabel="Close store picker"
                onClose={() => setStoreManageModalOpen(false)}
                footer={(
                    <Button type="button" kind="primary" size="xsmall" onClick={() => setStoreManageModalOpen(false)}>
                        Done
                    </Button>
                )}
            >
                <div className="portalCategoryCreateStoreModalHeader__Q8m2Q6">
                    <button
                        type="button"
                        className="portalCategoryCreateInlineLink__W4m8Q2"
                        onClick={() => setSelectedStoreIds((current) => (
                            current.size === stores.length
                                ? new Set<string>()
                                : new Set(stores.map((store) => store.id))
                        ))}
                    >
                        {selectedStoreIds.size === stores.length ? "Deselect all" : "Select all"}
                    </button>
                    <span>{`${selectedStoreIds.size} / ${stores.length} selected`}</span>
                </div>

                <div className="portalCategoryCreateStoreModalList__F7m2Q2">
                    {stores.map((store) => (
                        <label key={store.id} className="portalCategoryCreateStoreModalRow__Y2m8Q3">
                            <input
                                type="checkbox"
                                checked={selectedStoreIds.has(store.id)}
                                onChange={(event) => toggleStoreSelection(store.id, event.target.checked)}
                            />
                            <span>{store.name}</span>
                        </label>
                    ))}
                </div>
            </PortalModal>

            {variantRuleDragPreview ? (
                <div
                    className="portalProductsColumnDragPreview__H7m2Q4"
                    style={{ left: `${variantRuleDragPreview.x}px`, top: `${variantRuleDragPreview.y}px` }}
                    aria-hidden="true"
                >
                    <span className="portalProductsColumnDragPreviewLabel__D8m2Q6">{variantRuleDragPreview.label}</span>
                </div>
            ) : null}
        </section>
    );
}
