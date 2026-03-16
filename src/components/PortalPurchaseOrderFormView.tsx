"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, PackageSearch, Pencil, Search, Tags, Trash2 } from "lucide-react";
import { Button } from "@/components/Button";
import { PortalModal } from "@/components/PortalModal";
import { PortalPageTitle } from "@/components/PortalPageTitle";
import { notifyPortalAction } from "@/components/portalActionNotifications";
import { PurchaseOrderSectionHeader, SupplierPhoneField } from "@/components/purchaseOrders/formSections";
import {
    ADJUSTMENT_TYPES,
    SUPPLIER_REGION_CONTINENTS,
    type AdjustmentEditorState,
    type LineValidationError,
    type NewVariantErrorKey,
    type PortalPurchaseOrderFormViewProps,
    type VariantLibrarySearchBy,
} from "@/components/purchaseOrders/formConfig";
import { usePendingChangesHeader } from "@/components/usePendingChangesHeader";
import {
    COUNTRY_OPTIONS,
    DEFAULT_COUNTRY_CODE,
    composeStoredPhone,
} from "@/i18n/countries";
import { usePortalI18n } from "@/i18n/PortalI18nContext";
import { getCurrencyDisplayLabel, getLocalIsoCurrencyCodes, mergeCurrencyCodes } from "@/lib/currencies";
import {
    deleteCatalogEntriesFromApi,
    fetchCatalogStateFromApi,
    getCachedCatalogStateSnapshot,
    saveCatalogStateToApi,
} from "@/lib/catalogStateClient";
import { createUniqueVariantId, getProductCategoryTitles, type CatalogProduct, type ProductCategoryDefinition, type VariantDefinition, type VariantInputType } from "@/lib/productCatalog";
import {
    DEFAULT_PO_PAYMENT_TERMS,
    DEFAULT_SHIPMENT_CARRIERS,
    buildTrackingUrl,
    createPurchaseOrderAdjustmentId,
    createSupplierDirectoryId,
    createPurchaseOrderLineId,
    sanitizeSupplierDirectory,
    type PurchaseOrder,
    type PurchaseOrderAdjustment,
    type PurchaseOrderAdjustmentType,
    type PurchaseOrderLine,
    type SupplierDirectoryEntry,
} from "@/lib/purchaseOrders";
import { appendMultiValueInput, normalizeMultiValueList, removeMultiValue } from "@/lib/multiValueInput";
import { countVariantOptionUsage } from "@/lib/variantOptionUsage";
import {
    DUPLICATE_VALUE_MESSAGE,
    buildDefaultDraft,
    buildVariantOptionInUseMessage,
    cloneDraft,
    ensureLeadingCapital,
    formatCurrencyInputSuffix,
    formatDateInputValue,
    formatMoney,
    getCategoryById,
    getOrderSummary,
    getProductById,
    getProductCategoryRules,
    getProductDisplayLabel,
    getVariantDefinitionById,
    matchesProductPickerQuery,
    mergeVariantRules,
    normalizeAmountByAdjustmentType,
    normalizeString,
    serializeDraft,
    sortProductsForPicker,
    type ProductPickerSort,
    type ProductSearchBy,
} from "@/components/purchaseOrders/formHelpers";

export function PortalPurchaseOrderFormView({ stores, activeStoreId, storeCurrency, orderId }: PortalPurchaseOrderFormViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { language } = usePortalI18n();
    const cached = getCachedCatalogStateSnapshot();

    const [variantDefinitions, setVariantDefinitions] = useState<VariantDefinition[]>(() => cached?.variantDefinitions ?? []);
    const [categories, setCategories] = useState<ProductCategoryDefinition[]>(() => cached?.categoryDefinitions ?? []);
    const [products, setProducts] = useState<CatalogProduct[]>(() => cached?.products ?? []);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => cached?.purchaseOrders ?? []);
    const [suppliers, setSuppliers] = useState<SupplierDirectoryEntry[]>(() => cached?.suppliers ?? []);
    const [, setInventorySales] = useState(() => cached?.inventorySales ?? []);

    const [availableCurrencies, setAvailableCurrencies] = useState<string[]>(() => mergeCurrencyCodes(getLocalIsoCurrencyCodes(), [storeCurrency]));
    const [isLoaded, setIsLoaded] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [draft, setDraft] = useState<PurchaseOrder | null>(null);
    const [initialSnapshot, setInitialSnapshot] = useState<string | null>(null);

    const [lineErrors, setLineErrors] = useState<Record<string, LineValidationError>>({});
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [submitMessage, setSubmitMessage] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const [browseOpen, setBrowseOpen] = useState(false);
    const [browseQuery, setBrowseQuery] = useState("");
    const [browseSearchBy, setBrowseSearchBy] = useState<ProductSearchBy>("TITLE");
    const [productSort, setProductSort] = useState<ProductPickerSort>("TITLE_ASC");
    const [browseSelectedIds, setBrowseSelectedIds] = useState<Set<string>>(new Set());
    const [inlineProductQuery, setInlineProductQuery] = useState("");
    const [variantsManagerOpen, setVariantsManagerOpen] = useState(false);
    const [variantLibraryQuery, setVariantLibraryQuery] = useState("");
    const [variantLibrarySearchBy, setVariantLibrarySearchBy] = useState<VariantLibrarySearchBy>("LABEL");
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

    const [adjustmentsOpen, setAdjustmentsOpen] = useState(false);
    const [adjustmentEditor, setAdjustmentEditor] = useState<AdjustmentEditorState>({
        type: "DISCOUNT",
        label: "",
        amount: "",
        currency: storeCurrency,
    });
    const [adjustmentError, setAdjustmentError] = useState<string | null>(null);
    const [appliedPrefill, setAppliedPrefill] = useState(false);

    const [createSupplierOpen, setCreateSupplierOpen] = useState(false);
    const [createSupplierError, setCreateSupplierError] = useState<string | null>(null);
    const [newSupplierCompany, setNewSupplierCompany] = useState("");
    const [newSupplierRegion, setNewSupplierRegion] = useState("");
    const [newSupplierStreet, setNewSupplierStreet] = useState("");
    const [newSupplierHouseNumber, setNewSupplierHouseNumber] = useState("");
    const [newSupplierApartmentSuite, setNewSupplierApartmentSuite] = useState("");
    const [newSupplierPostalCode, setNewSupplierPostalCode] = useState("");
    const [newSupplierCity, setNewSupplierCity] = useState("");
    const [newSupplierContactName, setNewSupplierContactName] = useState("");
    const [newSupplierEmail, setNewSupplierEmail] = useState("");
    const [newSupplierPhoneCountryCode, setNewSupplierPhoneCountryCode] = useState(DEFAULT_COUNTRY_CODE);
    const [newSupplierPhoneNationalNumber, setNewSupplierPhoneNationalNumber] = useState("");

    const initialFocusRef = useRef<HTMLSelectElement | null>(null);
    const browseSearchRef = useRef<HTMLInputElement | null>(null);
    const variantLibrarySearchRef = useRef<HTMLInputElement | null>(null);
    const hasInitialFocusAppliedRef = useRef(false);

    const clearCreateSupplierDraft = useCallback(() => {
        setCreateSupplierError(null);
        setNewSupplierCompany("");
        setNewSupplierRegion("");
        setNewSupplierStreet("");
        setNewSupplierHouseNumber("");
        setNewSupplierApartmentSuite("");
        setNewSupplierPostalCode("");
        setNewSupplierCity("");
        setNewSupplierContactName("");
        setNewSupplierEmail("");
        setNewSupplierPhoneCountryCode(DEFAULT_COUNTRY_CODE);
        setNewSupplierPhoneNationalNumber("");
    }, []);

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
                setSuppliers(state.suppliers);
                setInventorySales(state.inventorySales);

                const currencies = mergeCurrencyCodes(getLocalIsoCurrencyCodes(), [storeCurrency, ...state.purchaseOrders.map((order) => order.supplierCurrency)]);
                setAvailableCurrencies(currencies.length > 0 ? currencies : [storeCurrency]);

                const existingOrder = orderId
                    ? state.purchaseOrders.find((order) => order.id === orderId) ?? null
                    : null;

                if (orderId && !existingOrder) {
                    setLoadError("Purchase order could not be found.");
                    setIsLoaded(true);
                    return;
                }

                const nextDraft = existingOrder
                    ? cloneDraft(existingOrder)
                    : buildDefaultDraft(activeStoreId, storeCurrency, state.purchaseOrders);
                setDraft(nextDraft);
                setInitialSnapshot(serializeDraft(nextDraft));
                setFieldErrors({});
                setLineErrors({});
                setLoadError(null);
                setIsLoaded(true);
            } catch {
                if (cancelled) return;
                const cachedState = getCachedCatalogStateSnapshot();
                const fallbackVariantDefinitions = cachedState?.variantDefinitions ?? [];
                const fallbackCategories = cachedState?.categoryDefinitions ?? [];
                const fallbackProducts = cachedState?.products ?? [];
                const fallbackPurchaseOrders = cachedState?.purchaseOrders ?? [];
                const fallbackSales = cachedState?.inventorySales ?? [];

                setVariantDefinitions(fallbackVariantDefinitions);
                setCategories(fallbackCategories);
                setProducts(fallbackProducts);
                setPurchaseOrders(fallbackPurchaseOrders);
                setSuppliers(cachedState?.suppliers ?? []);
                setInventorySales(fallbackSales);

                const currencies = mergeCurrencyCodes(getLocalIsoCurrencyCodes(), [storeCurrency, ...fallbackPurchaseOrders.map((order) => order.supplierCurrency)]);
                setAvailableCurrencies(currencies.length > 0 ? currencies : [storeCurrency]);

                const fallbackOrder = orderId
                    ? fallbackPurchaseOrders.find((order) => order.id === orderId) ?? null
                    : null;

                if (orderId && !fallbackOrder) {
                    setLoadError("Purchase order could not be found.");
                    setIsLoaded(true);
                    return;
                }

                const nextDraft = fallbackOrder
                    ? cloneDraft(fallbackOrder)
                    : buildDefaultDraft(activeStoreId, storeCurrency, fallbackPurchaseOrders);

                setDraft(nextDraft);
                setInitialSnapshot(serializeDraft(nextDraft));
                setFieldErrors({});
                setLineErrors({});
                setLoadError(null);
                setIsLoaded(true);
            }
        };

        void hydrate();

        return () => {
            cancelled = true;
        };
    }, [activeStoreId, orderId, storeCurrency]);

    const productById = useMemo(() => getProductById(products), [products]);
    const categoryById = useMemo(() => getCategoryById(categories), [categories]);
    const variantById = useMemo(() => getVariantDefinitionById(variantDefinitions), [variantDefinitions]);
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
            if (variantLibrarySearchBy === "ID") return definition.id.toLowerCase().includes(query);
            if (variantLibrarySearchBy === "TYPE") return definition.inputType.toLowerCase().includes(query);
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

    const supplierRegionOptions = useMemo(() => {
        const set = new Set<string>();
        SUPPLIER_REGION_CONTINENTS.forEach((name) => set.add(name));
        COUNTRY_OPTIONS.forEach((entry) => set.add(entry.name));
        return Array.from(set).sort((left, right) => left.localeCompare(right));
    }, []);

    const supplierOptions = useMemo(() => {
        const set = new Set<string>();
        suppliers.forEach((entry) => {
            const supplier = normalizeString(entry.company);
            if (supplier) set.add(supplier);
        });
        purchaseOrders.forEach((order) => {
            const supplier = order.supplierName.trim();
            if (supplier) set.add(supplier);
        });
        return Array.from(set).sort((left, right) => left.localeCompare(right));
    }, [purchaseOrders, suppliers]);

    const locale = useMemo(() => {
        if (typeof navigator !== "undefined" && navigator.language) return navigator.language;
        if (language) return language;
        return "en";
    }, [language]);

    const currencyDisplayLabels = useMemo(() => {
        const labels = new Map<string, string>();
        availableCurrencies.forEach((currency) => {
            labels.set(currency, ensureLeadingCapital(getCurrencyDisplayLabel(currency, locale), locale));
        });
        return labels;
    }, [availableCurrencies, locale]);

    const browseProducts = useMemo(() => {
        const sorted = sortProductsForPicker(products, productSort);
        return sorted.filter((product) => matchesProductPickerQuery(product, categories, browseQuery, browseSearchBy));
    }, [browseQuery, browseSearchBy, categories, productSort, products]);

    const trackingUrl = useMemo(
        () => draft ? buildTrackingUrl(draft.shippingCarrier, draft.trackingNumber) : null,
        [draft]
    );

    const summary = useMemo(
        () => (draft ? getOrderSummary(draft) : null),
        [draft]
    );

    const isDirty = useMemo(() => {
        if (!draft || !initialSnapshot) return false;
        return serializeDraft(draft) !== initialSnapshot;
    }, [draft, initialSnapshot]);

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

    const updateDraft = useCallback((updater: (current: PurchaseOrder) => PurchaseOrder) => {
        setDraft((current) => {
            if (!current) return current;
            const next = updater(current);
            if (next === current) return current;
            return {
                ...next,
                updatedAt: new Date().toISOString(),
            };
        });
    }, []);

    const updateField = useCallback(function updateField<K extends keyof PurchaseOrder>(key: K, value: PurchaseOrder[K]) {
        updateDraft((current) => ({
            ...current,
            [key]: value,
        }));
        setFieldErrors((current) => {
            const next = { ...current };
            delete next[String(key)];
            return next;
        });
    }, [updateDraft]);

    const addProductLine = useCallback((product: CatalogProduct) => {
        updateDraft((current) => ({
            ...current,
            lines: [
                ...current.lines,
                {
                    id: createPurchaseOrderLineId(),
                    productId: product.id,
                    sku: product.sku,
                    supplierName: current.supplierName,
                    quantity: 1,
                    unitCost: 0,
                    taxPercent: Math.max(0, Math.min(100, product.defaultTaxPercent ?? 0)),
                    variantValues: {},
                },
            ],
        }));
    }, [updateDraft]);

    const removeLine = (lineId: string) => {
        updateDraft((current) => ({
            ...current,
            lines: current.lines.filter((line) => line.id !== lineId),
        }));
        setLineErrors((current) => {
            const next = { ...current };
            delete next[lineId];
            return next;
        });
    };

    const updateLine = (lineId: string, updater: (line: PurchaseOrderLine) => PurchaseOrderLine) => {
        updateDraft((current) => ({
            ...current,
            lines: current.lines.map((line) => (line.id === lineId ? updater(line) : line)),
        }));
        setLineErrors((current) => {
            if (!current[lineId]) return current;
            const next = { ...current };
            delete next[lineId];
            return next;
        });
    };

    const addInlineProduct = () => {
        const query = inlineProductQuery.trim();
        if (!query) return;
        const match = sortProductsForPicker(products, productSort).find((product) => (
            matchesProductPickerQuery(product, categories, query, browseSearchBy)
        ));
        if (!match) return;
        addProductLine(match);
        setInlineProductQuery("");
    };

    const toggleBrowseSelection = (productId: string, checked: boolean) => {
        setBrowseSelectedIds((current) => {
            const next = new Set(current);
            if (checked) next.add(productId);
            else next.delete(productId);
            return next;
        });
    };

    const addSelectedBrowseProducts = () => {
        if (browseSelectedIds.size === 0) return;
        const selectedSet = new Set(browseSelectedIds);
        const selectedProducts = products.filter((product) => selectedSet.has(product.id));
        selectedProducts.forEach((product) => addProductLine(product));
        setBrowseSelectedIds(new Set());
        setBrowseOpen(false);
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
            const usageCount = countVariantOptionUsage(products, editingVariantId, valueToRemove, purchaseOrders);
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

    const openVariantEditor = (variantId: string) => {
        const existing = variantDefinitions.find((variant) => variant.id === variantId);
        if (!existing) return;
        setEditingVariantId(existing.id);
        setEditVariantNameDraft(existing.label);
        setEditVariantValuesDraft(normalizeMultiValueList(existing.values));
        setEditVariantValueInput("");
        setEditVariantError(null);
        setVariantManagerError(null);
    };

    const closeVariantEditor = () => {
        setEditingVariantId(null);
        setEditVariantNameDraft("");
        setEditVariantValuesDraft([]);
        setEditVariantValueInput("");
        setEditVariantError(null);
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

    const createVariant = async () => {
        setVariantManagerError(null);
        const label = normalizeString(newVariantNameDraft);
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

        const label = normalizeString(editVariantNameDraft);
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
            const blockedValue = removedValues.find((value) => (
                countVariantOptionUsage(products, editingVariantId, value, purchaseOrders) > 0
            ));
            if (blockedValue) {
                const usageCount = countVariantOptionUsage(products, editingVariantId, blockedValue, purchaseOrders);
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
        closeVariantEditor();
        try {
            await saveCatalogStateToApi({ variantDefinitions: nextDefinitions });
        } catch {
            setVariantManagerError("Unable to update variant right now.");
        }
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
            setPurchaseOrders(state.purchaseOrders);
            if (editingVariantId === variantId) closeVariantEditor();
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

    const createSupplier = useCallback(async () => {
        const company = normalizeString(newSupplierCompany);
        const region = normalizeString(newSupplierRegion);
        const email = normalizeString(newSupplierEmail);
        const phone = composeStoredPhone(newSupplierPhoneCountryCode, newSupplierPhoneNationalNumber);

        if (!company) {
            setCreateSupplierError("Company is required.");
            return;
        }
        if (!region) {
            setCreateSupplierError("Region is required.");
            return;
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setCreateSupplierError("Email address is invalid.");
            return;
        }

        const now = new Date().toISOString();
        const candidate: SupplierDirectoryEntry = {
            id: createSupplierDirectoryId(),
            company,
            region,
            street: normalizeString(newSupplierStreet) || undefined,
            houseNumber: normalizeString(newSupplierHouseNumber) || undefined,
            apartmentSuite: normalizeString(newSupplierApartmentSuite) || undefined,
            postalCode: normalizeString(newSupplierPostalCode) || undefined,
            city: normalizeString(newSupplierCity) || undefined,
            contactName: normalizeString(newSupplierContactName) || undefined,
            email: email || undefined,
            phone: phone || undefined,
            createdAt: now,
            updatedAt: now,
        };

        const nextSuppliers = sanitizeSupplierDirectory([candidate, ...suppliers], suppliers);

        try {
            await saveCatalogStateToApi({
                suppliers: nextSuppliers,
            });
            setSuppliers(nextSuppliers);
            updateField("supplierName", company);
            setCreateSupplierOpen(false);
            clearCreateSupplierDraft();
        } catch {
            setCreateSupplierError("Unable to create supplier.");
        }
    }, [
        clearCreateSupplierDraft,
        newSupplierApartmentSuite,
        newSupplierCity,
        newSupplierCompany,
        newSupplierContactName,
        newSupplierEmail,
        newSupplierHouseNumber,
        newSupplierPhoneCountryCode,
        newSupplierPhoneNationalNumber,
        newSupplierPostalCode,
        newSupplierRegion,
        newSupplierStreet,
        suppliers,
        updateField,
    ]);

    const addAdjustment = () => {
        if (!draft) return;
        const label = normalizeString(adjustmentEditor.label);
        const amountRaw = Number(adjustmentEditor.amount);
        const currency = adjustmentEditor.currency.trim().toUpperCase();
        if (!label) {
            setAdjustmentError("Label is required.");
            return;
        }
        if (!Number.isFinite(amountRaw)) {
            setAdjustmentError("Amount is required.");
            return;
        }
        if (!currency) {
            setAdjustmentError("Currency is required.");
            return;
        }

        const normalizedAmount = normalizeAmountByAdjustmentType(adjustmentEditor.type, amountRaw);
        const nextAdjustment: PurchaseOrderAdjustment = {
            id: createPurchaseOrderAdjustmentId(),
            type: adjustmentEditor.type,
            label,
            amount: normalizedAmount,
            currency,
        };

        updateDraft((current) => ({
            ...current,
            adjustments: [...current.adjustments, nextAdjustment],
        }));
        setAdjustmentEditor({
            type: "DISCOUNT",
            label: "",
            amount: "",
            currency: draft.supplierCurrency,
        });
        setAdjustmentError(null);
    };

    const removeAdjustment = (adjustmentId: string) => {
        updateDraft((current) => ({
            ...current,
            adjustments: current.adjustments.filter((adjustment) => adjustment.id !== adjustmentId),
        }));
    };

    const validateDraftForFinalSave = useCallback((current: PurchaseOrder) => {
        const nextFieldErrors: Record<string, string> = {};
        const nextLineErrors: Record<string, LineValidationError> = {};

        if (!normalizeString(current.supplierName)) {
            nextFieldErrors.supplierName = "Supplier is required.";
        }
        if (!normalizeString(current.destinationStoreId)) {
            nextFieldErrors.destinationStoreId = "Destination is required.";
        }
        if (!normalizeString(current.supplierCurrency)) {
            nextFieldErrors.supplierCurrency = "Supplier currency is required.";
        }
        if (!normalizeString(current.purchaseDate)) {
            nextFieldErrors.purchaseDate = "Purchase date is required.";
        }
        if (current.lines.length === 0) {
            nextFieldErrors.lines = "Add at least one product line.";
        }

        current.lines.forEach((line) => {
            const product = productById.get(line.productId);
            const lineError: LineValidationError = {};
            if (!product) {
                lineError.variantValues = "Product is invalid.";
                nextLineErrors[line.id] = lineError;
                return;
            }

            if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
                lineError.quantity = "Quantity must be greater than zero.";
            }
            if (!Number.isFinite(line.unitCost) || line.unitCost < 0) {
                lineError.unitCost = "Unit cost is required.";
            }
            if (!Number.isFinite(line.taxPercent) || line.taxPercent < 0 || line.taxPercent > 100) {
                lineError.taxPercent = "Tax must be between 0 and 100.";
            }

            const categoryRules = getProductCategoryRules(product, categoryById);
            const requiredCategoryRules = categoryRules.filter((rule) => rule.required);
            const requiredProductRules = product.productVariantRules.filter((rule) => rule.required);
            const requiredVariantIds = new Set([
                ...requiredCategoryRules.map((rule) => rule.variantId),
                ...requiredProductRules.map((rule) => rule.variantId),
            ]);

            for (const variantId of requiredVariantIds) {
                const fromProduct = product.variants[variantId] ?? "";
                const fromLine = line.variantValues[variantId] ?? "";
                if (normalizeString(fromProduct) || normalizeString(fromLine)) continue;
                lineError.variantValues = "Fill all required variant fields.";
                break;
            }

            if (Object.keys(lineError).length > 0) {
                nextLineErrors[line.id] = lineError;
            }
        });

        const canFinalize = Object.keys(nextFieldErrors).length === 0 && Object.keys(nextLineErrors).length === 0;
        return {
            canFinalize,
            nextFieldErrors,
            nextLineErrors,
        };
    }, [categoryById, productById]);

    const onSave = useCallback(async (): Promise<boolean> => {
        if (!draft) return false;

        const { canFinalize, nextFieldErrors, nextLineErrors } = validateDraftForFinalSave(draft);
        setFieldErrors(nextFieldErrors);
        setLineErrors(nextLineErrors);
        setSubmitError(null);
        setSubmitMessage(null);

        const normalizedSupplier = normalizeString(draft.supplierName);
        const nextStatus: PurchaseOrder["status"] = canFinalize
            ? (
                draft.status === "RECEIVED" || draft.status === "PARTIAL" || draft.status === "CANCELLED"
                    ? draft.status
                    : "ORDERED"
            )
            : "DRAFT";

        const payloadOrder: PurchaseOrder = {
            ...draft,
            supplierName: normalizedSupplier,
            destinationStoreId: normalizeString(draft.destinationStoreId) || activeStoreId,
            paymentTerms: normalizeString(draft.paymentTerms) || DEFAULT_PO_PAYMENT_TERMS[0],
            supplierCurrency: normalizeString(draft.supplierCurrency) || storeCurrency,
            purchaseDate: normalizeString(draft.purchaseDate) || formatDateInputValue(new Date()),
            shippingCarrier: normalizeString(draft.shippingCarrier),
            trackingNumber: normalizeString(draft.trackingNumber),
            expectedPackages: Math.max(0, Math.round(draft.expectedPackages)),
            receivedPackages: Math.max(0, Math.min(draft.expectedPackages, Math.round(draft.receivedPackages))),
            referenceNumber: normalizeString(draft.referenceNumber ?? ""),
            notesToSupplier: normalizeString(draft.notesToSupplier ?? ""),
            lines: draft.lines.map((line) => ({
                ...line,
                quantity: Math.max(0, Math.round(line.quantity)),
                unitCost: Math.max(0, line.unitCost),
                taxPercent: Math.max(0, Math.min(100, line.taxPercent)),
                supplierName: normalizeString(line.supplierName) || normalizedSupplier,
                variantValues: Object.fromEntries(
                    Object.entries(line.variantValues)
                        .map(([variantId, value]) => [variantId, normalizeString(value)])
                        .filter(([, value]) => value.length > 0)
                ),
            })),
            adjustments: draft.adjustments.map((adjustment) => ({
                ...adjustment,
                label: normalizeString(adjustment.label),
                currency: normalizeString(adjustment.currency),
                amount: normalizeAmountByAdjustmentType(adjustment.type, adjustment.amount),
            })),
            status: nextStatus,
            updatedAt: new Date().toISOString(),
        };

        try {
            const current = await fetchCatalogStateFromApi();
            const nextOrders = current.purchaseOrders.some((order) => order.id === payloadOrder.id)
                ? current.purchaseOrders.map((order) => (order.id === payloadOrder.id ? payloadOrder : order))
                : [payloadOrder, ...current.purchaseOrders];

            await saveCatalogStateToApi({
                purchaseOrders: nextOrders,
                inventorySales: current.inventorySales,
            });

            setSubmitMessage(canFinalize ? "Purchase order saved." : "Required fields are missing. Saved as draft.");
            router.push("/portal/products/purchase-orders");
            return true;
        } catch {
            setSubmitError("Unable to save purchase order.");
            return false;
        }
    }, [activeStoreId, draft, router, storeCurrency, validateDraftForFinalSave]);

    const onDiscard = useCallback(() => {
        router.push("/portal/products/purchase-orders");
    }, [router]);

    const pendingHeaderActive = !orderId || isDirty;
    const pendingHeaderSaveDisabled = !isLoaded || !draft || Boolean(loadError);

    usePendingChangesHeader({
        active: pendingHeaderActive,
        scope: "productCreate",
        onSave,
        onDiscard,
        discardLabelVariant: "cancel",
        saveDisabled: pendingHeaderSaveDisabled,
    });

    useEffect(() => {
        if (!isLoaded || !draft || hasInitialFocusAppliedRef.current) return;
        hasInitialFocusAppliedRef.current = true;
        queueMicrotask(() => {
            initialFocusRef.current?.focus();
        });
    }, [isLoaded, draft]);

    useEffect(() => {
        if (orderId) return;
        if (!isLoaded || !draft || appliedPrefill) return;

        const requestedProductIds = Array.from(new Set(searchParams.getAll("productId").map((value) => value.trim()).filter(Boolean)));
        if (requestedProductIds.length === 0) {
            setAppliedPrefill(true);
            return;
        }

        const matchingProducts = requestedProductIds
            .map((id) => productById.get(id))
            .filter((product): product is CatalogProduct => Boolean(product));
        if (matchingProducts.length === 0) {
            setAppliedPrefill(true);
            return;
        }

        updateDraft((current) => ({
            ...current,
            lines: [
                ...current.lines,
                ...matchingProducts.map((product) => ({
                    id: createPurchaseOrderLineId(),
                    productId: product.id,
                    sku: product.sku,
                    supplierName: current.supplierName,
                    quantity: 1,
                    unitCost: 0,
                    taxPercent: Math.max(0, Math.min(100, product.defaultTaxPercent ?? 0)),
                    variantValues: {},
                })),
            ],
        }));
        setAppliedPrefill(true);
    }, [appliedPrefill, draft, isLoaded, orderId, productById, searchParams, updateDraft]);

    useEffect(() => {
        if (!browseOpen) return;
        queueMicrotask(() => {
            browseSearchRef.current?.focus();
        });
    }, [browseOpen]);

    useEffect(() => {
        if (!variantsManagerOpen) return;
        queueMicrotask(() => {
            variantLibrarySearchRef.current?.focus();
        });
    }, [variantsManagerOpen]);

    if (!isLoaded) {
        return (
            <section className="portalProductCreatePage__A3m8Q1 portalProductCreateTarget768__R2m8Q6">
                <PortalPageTitle page="purchaseOrders" title={orderId ? "Edit purchase order" : "Create purchase order"} />
            </section>
        );
    }

    if (!draft) {
        return (
            <section className="portalProductCreatePage__A3m8Q1 portalProductCreateTarget768__R2m8Q6">
                <PortalPageTitle page="purchaseOrders" title={orderId ? "Edit purchase order" : "Create purchase order"} />
                <p className="portalProductCreateError__Q6m2P8">{loadError ?? "Purchase order data is unavailable."}</p>
            </section>
        );
    }

    return (
        <section className="portalProductCreatePage__A3m8Q1 portalProductCreateTarget768__R2m8Q6">
            <PortalPageTitle
                page="purchaseOrders"
                title={orderId ? "Edit purchase order" : "Create purchase order"}
                meta={orderId ? draft.poNumber : undefined}
                metaInline
            />

            <div className="portalProductCreateLayout__F7m2Q1 portalPurchaseOrderSingleColumnLayout__T8m2Q4">
                <div className="portalProductCreateMainColumn__R7m2Q9">
                    <section className="portalProductCreateMainCard__N4m8Q3 ui-surface-card">
                        <PurchaseOrderSectionHeader
                            title="Order details"
                            description="Set supplier, destination, payment terms, and supplier currency."
                        />

                        <div className="portalProductCreateGrid__W2m9Q4">
                            <label className="form__group__K7p2s0">
                                <span className="form__label__B9f4k0 portalPurchaseOrderLabelRow__N2m8Q8">
                                    <span>
                                        <span className="portalProductCreateRequiredStar__H4m2Q8" aria-hidden="true">*</span>
                                        Supplier
                                    </span>
                                    <button
                                        type="button"
                                        className="portalPurchaseOrderInlineLinkButton__X8m2Q6"
                                        onClick={() => {
                                            clearCreateSupplierDraft();
                                            setCreateSupplierOpen(true);
                                        }}
                                    >
                                        Create new supplier
                                    </button>
                                </span>
                                <select
                                    ref={initialFocusRef}
                                    className="form__select__P9j2k0"
                                    value={draft.supplierName}
                                    onChange={(event) => {
                                        const nextSupplier = event.target.value;
                                        updateDraft((current) => ({
                                            ...current,
                                            supplierName: nextSupplier,
                                            lines: current.lines.map((line) => ({ ...line, supplierName: nextSupplier })),
                                        }));
                                        setFieldErrors((current) => {
                                            const next = { ...current };
                                            delete next.supplierName;
                                            return next;
                                        });
                                    }}
                                >
                                    <option value="">
                                        {supplierOptions.length > 0 ? "Select supplier" : "No suppliers yet"}
                                    </option>
                                    {supplierOptions.map((supplier) => (
                                        <option key={supplier} value={supplier}>
                                            {supplier}
                                        </option>
                                    ))}
                                </select>
                                {fieldErrors.supplierName ? <p className="portalProductCreateError__Q6m2P8">{fieldErrors.supplierName}</p> : null}
                            </label>

                            <label className="form__group__K7p2s0">
                                <span className="form__label__B9f4k0">
                                    <span className="portalProductCreateRequiredStar__H4m2Q8" aria-hidden="true">*</span>
                                    Destination
                                </span>
                                <select
                                    className="form__select__P9j2k0"
                                    value={draft.destinationStoreId}
                                    onChange={(event) => updateField("destinationStoreId", event.target.value)}
                                >
                                    {stores.map((store) => (
                                        <option key={store.id} value={store.id}>
                                            {store.name}
                                        </option>
                                    ))}
                                </select>
                                {fieldErrors.destinationStoreId ? <p className="portalProductCreateError__Q6m2P8">{fieldErrors.destinationStoreId}</p> : null}
                            </label>

                            <label className="form__group__K7p2s0">
                                <span className="form__label__B9f4k0">
                                    <span className="portalProductCreateRequiredStar__H4m2Q8" aria-hidden="true">*</span>
                                    Payment terms
                                </span>
                                <select
                                    className="form__select__P9j2k0"
                                    value={draft.paymentTerms}
                                    onChange={(event) => updateField("paymentTerms", event.target.value)}
                                >
                                    {DEFAULT_PO_PAYMENT_TERMS.map((term) => (
                                        <option key={term} value={term}>
                                            {term}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="form__group__K7p2s0">
                                <span className="form__label__B9f4k0">
                                    <span className="portalProductCreateRequiredStar__H4m2Q8" aria-hidden="true">*</span>
                                    Supplier currency
                                </span>
                                <select
                                    className="form__select__P9j2k0"
                                    value={draft.supplierCurrency}
                                    onChange={(event) => {
                                        updateField("supplierCurrency", event.target.value.toUpperCase());
                                        setAdjustmentEditor((current) => ({ ...current, currency: event.target.value.toUpperCase() }));
                                    }}
                                >
                                    {availableCurrencies.map((currency) => (
                                        <option key={currency} value={currency}>
                                            {currencyDisplayLabels.get(currency) ?? currency}
                                        </option>
                                    ))}
                                </select>
                                {fieldErrors.supplierCurrency ? <p className="portalProductCreateError__Q6m2P8">{fieldErrors.supplierCurrency}</p> : null}
                            </label>
                        </div>

                    </section>

                    <section className="portalProductCreateMainCard__N4m8Q3 ui-surface-card">
                        <PurchaseOrderSectionHeader
                            title="Shipment details"
                            description="Track shipment with carrier and tracking number. Purchase date is required for final save."
                        />

                        <div className="portalPurchaseOrderShipmentGrid__A7m2Q9">
                            <label className="form__group__K7p2s0">
                                <span className="form__label__B9f4k0">
                                    <span className="portalProductCreateRequiredStar__H4m2Q8" aria-hidden="true">*</span>
                                    Purchase date
                                </span>
                                <input
                                    className="form__input__Z3n7q0"
                                    type="date"
                                    value={draft.purchaseDate}
                                    onChange={(event) => updateField("purchaseDate", event.target.value)}
                                />
                                {fieldErrors.purchaseDate ? <p className="portalProductCreateError__Q6m2P8">{fieldErrors.purchaseDate}</p> : null}
                            </label>

                            <label className="form__group__K7p2s0">
                                <span className="form__label__B9f4k0">Shipping carrier</span>
                                <select
                                    className="form__select__P9j2k0"
                                    value={draft.shippingCarrier}
                                    onChange={(event) => updateField("shippingCarrier", event.target.value)}
                                >
                                    <option value="">Select carrier</option>
                                    {DEFAULT_SHIPMENT_CARRIERS.map((carrier) => (
                                        <option key={carrier} value={carrier}>
                                            {carrier}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="form__group__K7p2s0">
                                <span className="form__label__B9f4k0">
                                    Tracking number{" "}
                                    {trackingUrl ? (
                                        <a href={trackingUrl} target="_blank" rel="noreferrer" className="portalPurchaseOrderInlineLink__J6m2Q8">
                                            Open tracking <ExternalLink aria-hidden="true" />
                                        </a>
                                    ) : null}
                                </span>
                                <input
                                    className="form__input__Z3n7q0"
                                    value={draft.trackingNumber}
                                    onChange={(event) => updateField("trackingNumber", event.target.value)}
                                    placeholder="Enter tracking number"
                                />
                            </label>
                        </div>
                    </section>

                    <section className="portalProductCreateMainCard__N4m8Q3 ui-surface-card">
                        <PurchaseOrderSectionHeader
                            title="Products"
                            description="Search, browse, and sort products before adding them to this purchase order."
                            action={(
                                <button
                                    type="button"
                                    className="portalCategoryCreateInlineLink__W4m8Q2"
                                    onClick={() => {
                                        setVariantManagerError(null);
                                        setVariantsManagerOpen(true);
                                    }}
                                >
                                    Manage variants
                                </button>
                            )}
                        />
                        <p className="portalPurchaseOrderRequiredHint__X2m8Q4">
                            <span className="portalProductCreateRequiredStar__H4m2Q8" aria-hidden="true">*</span>
                            At least one product is required.
                        </p>

                        <div className="portalCategoryCreatePickerToolbar__P6m8Q1 portalPurchaseOrderAddProductsRow__M2m8Q6">
                            <label className="portalCategoryCreateSearchField__Q6m2Q8 portalPurchaseOrderProductSearch__Q4m2Q1">
                                <Search aria-hidden="true" />
                                <input
                                    className="form__input__Z3n7q0 portalCategoryCreateSearchInput__T6m2Q3"
                                    value={inlineProductQuery}
                                    onChange={(event) => setInlineProductQuery(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key !== "Enter") return;
                                        event.preventDefault();
                                        addInlineProduct();
                                    }}
                                    placeholder="Search products"
                                />
                            </label>
                            <Button type="button" kind="basic" size="xsmall" onClick={() => setBrowseOpen(true)}>
                                Browse
                            </Button>
                            <label className="portalCategoryCreateSearchByField__U2m8Q4 portalCategoryCreateSortField__X2m8Q1">
                                <span className="portalCategoryCreateSearchByPrefix__A8m2Q3">Sort by{" "}</span>
                                <select
                                    className="form__select__P9j2k0 portalCategoryCreateSearchBySelect__V2m8Q4 portalCategoryCreateSortSelect__J4m8Q2"
                                    value={productSort}
                                    onChange={(event) => setProductSort(event.target.value as ProductPickerSort)}
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

                        {fieldErrors.lines ? <p className="portalProductCreateError__Q6m2P8">{fieldErrors.lines}</p> : null}

                        {draft.lines.length === 0 ? (
                            <div className="portalCategoryCreateEmptySupply__B3m2Q8 portalPurchaseOrderEmptyProducts__R4m2Q8">
                                <PackageSearch aria-hidden="true" />
                                <p>No products added yet.</p>
                                <small>Search or browse to add products.</small>
                            </div>
                        ) : (
                            <div className="portalPurchaseOrderLines__D8m2Q3">
                                {draft.lines.map((line) => {
                                    const product = productById.get(line.productId);
                                    if (!product) {
                                        return (
                                            <article key={line.id} className="portalPurchaseOrderLine__R8m2Q6">
                                                <p className="portalProductCreateError__Q6m2P8">Product was removed. Delete this line.</p>
                                                <Button type="button" kind="toggle" size="xsmall" onClick={() => removeLine(line.id)}>
                                                    Remove
                                                </Button>
                                            </article>
                                        );
                                    }

                                    const lineTotal = (line.quantity * line.unitCost) + ((line.quantity * line.unitCost) * (line.taxPercent / 100));
                                    const categoryRules = getProductCategoryRules(product, categoryById);
                                    const mergedRules = mergeVariantRules(categoryRules, product.productVariantRules);
                                    const error = lineErrors[line.id] ?? {};
                                    const costSuffix = formatCurrencyInputSuffix(draft.supplierCurrency, locale);

                                    return (
                                        <article key={line.id} className="portalPurchaseOrderLine__R8m2Q6">
                                            <div className="portalPurchaseOrderLineHeader__Q2m8Q6">
                                                <label className="form__group__K7p2s0 portalPurchaseOrderLineProductField__A5m8Q4">
                                                    <span className="form__label__B9f4k0">Product</span>
                                                    <button
                                                        type="button"
                                                        className="portalProductsNameButton__N6m2Q5"
                                                        onClick={() => router.push(`/portal/products/inventory/${encodeURIComponent(product.id)}`)}
                                                    >
                                                        {getProductDisplayLabel(product)}
                                                    </button>
                                                </label>
                                                <div className="portalPurchaseOrderLineActions__A2m8Q6">
                                                    <Button type="button" kind="toggle" size="xsmall" onClick={() => removeLine(line.id)}>
                                                        <Trash2 aria-hidden="true" />
                                                        Remove line
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="portalPurchaseOrderLineGrid__Y8m2Q2">
                                                <label className="form__group__K7p2s0">
                                                    <span className="form__label__B9f4k0">
                                                        <span className="portalProductCreateRequiredStar__H4m2Q8" aria-hidden="true">*</span>
                                                        Supplier SKU
                                                    </span>
                                                    <input
                                                        className="form__input__Z3n7q0"
                                                        value={line.sku}
                                                        onChange={(event) => updateLine(line.id, (current) => ({ ...current, sku: event.target.value }))}
                                                        placeholder="SKU"
                                                    />
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
                                                        value={line.quantity}
                                                        onChange={(event) => updateLine(line.id, (current) => ({ ...current, quantity: Number(event.target.value) }))}
                                                        placeholder="1"
                                                    />
                                                    {error.quantity ? <p className="portalProductCreateError__Q6m2P8">{error.quantity}</p> : null}
                                                </label>
                                            </div>

                                            <div className="portalPurchaseOrderLineMetaGrid__E3m8Q6">
                                                <label className="form__group__K7p2s0">
                                                    <span className="form__label__B9f4k0">
                                                        <span className="portalProductCreateRequiredStar__H4m2Q8" aria-hidden="true">*</span>
                                                        Cost
                                                    </span>
                                                    <div className="portalPurchaseOrderInputSuffixWrap__M2m8Q3">
                                                        <input
                                                            className="form__input__Z3n7q0 portalPurchaseOrderInputWithSuffix__N2m8Q4"
                                                            type="number"
                                                            min={0}
                                                            step="0.01"
                                                            value={line.unitCost}
                                                            onChange={(event) => updateLine(line.id, (current) => ({ ...current, unitCost: Number(event.target.value) }))}
                                                            placeholder="0.00"
                                                        />
                                                        <span className="portalPurchaseOrderInputSuffix__F8m2Q4" aria-hidden="true">{costSuffix}</span>
                                                    </div>
                                                    {error.unitCost ? <p className="portalProductCreateError__Q6m2P8">{error.unitCost}</p> : null}
                                                </label>

                                                <label className="form__group__K7p2s0">
                                                    <span className="form__label__B9f4k0">
                                                        <span className="portalProductCreateRequiredStar__H4m2Q8" aria-hidden="true">*</span>
                                                        Tax
                                                    </span>
                                                    <div className="portalPurchaseOrderInputSuffixWrap__M2m8Q3">
                                                        <input
                                                            className="form__input__Z3n7q0 portalPurchaseOrderInputWithSuffix__N2m8Q4"
                                                            type="number"
                                                            min={0}
                                                            max={100}
                                                            step="0.01"
                                                            value={line.taxPercent}
                                                            onChange={(event) => updateLine(line.id, (current) => ({ ...current, taxPercent: Number(event.target.value) }))}
                                                            placeholder="0"
                                                        />
                                                        <span className="portalPurchaseOrderInputSuffix__F8m2Q4" aria-hidden="true">%</span>
                                                    </div>
                                                    {error.taxPercent ? <p className="portalProductCreateError__Q6m2P8">{error.taxPercent}</p> : null}
                                                </label>

                                                <label className="form__group__K7p2s0">
                                                    <span className="form__label__B9f4k0">Total</span>
                                                    <p className="portalPurchaseOrderLineTotal__D7m2Q5">{formatMoney(lineTotal, draft.supplierCurrency)}</p>
                                                </label>
                                            </div>

                                            {mergedRules.length > 0 ? (
                                                <div className="portalPurchaseOrderVariantsGrid__V8m2Q7">
                                                    {mergedRules.map((rule) => {
                                                        const definition = variantById.get(rule.variantId);
                                                        if (!definition) return null;

                                                        const fromProduct = product.variants[rule.variantId] ?? "";
                                                        const allowLineEdit = rule.source === "product" || !normalizeString(fromProduct);
                                                        const value = allowLineEdit ? (line.variantValues[rule.variantId] ?? "") : fromProduct;

                                                        return (
                                                            <label key={`${line.id}:${rule.variantId}`} className="form__group__K7p2s0">
                                                                <span className="form__label__B9f4k0">
                                                                    {rule.required ? <span className="portalProductCreateRequiredStar__H4m2Q8" aria-hidden="true">*</span> : null}
                                                                    {definition.label}
                                                                </span>

                                                                {definition.inputType === "select" ? (
                                                                    <select
                                                                        className="form__select__P9j2k0"
                                                                        value={value}
                                                                        disabled={!allowLineEdit}
                                                                        onChange={(event) => {
                                                                            if (!allowLineEdit) return;
                                                                            updateLine(line.id, (current) => ({
                                                                                ...current,
                                                                                variantValues: {
                                                                                    ...current.variantValues,
                                                                                    [rule.variantId]: event.target.value,
                                                                                },
                                                                            }));
                                                                        }}
                                                                    >
                                                                        <option value="">Select value</option>
                                                                        {definition.values.map((option) => (
                                                                            <option key={option} value={option}>
                                                                                {option}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                ) : definition.inputType === "textarea" ? (
                                                                    <textarea
                                                                        className="form__textarea__Q6p3f0"
                                                                        disabled={!allowLineEdit}
                                                                        rows={3}
                                                                        value={value}
                                                                        onChange={(event) => {
                                                                            if (!allowLineEdit) return;
                                                                            updateLine(line.id, (current) => ({
                                                                                ...current,
                                                                                variantValues: {
                                                                                    ...current.variantValues,
                                                                                    [rule.variantId]: event.target.value,
                                                                                },
                                                                            }));
                                                                        }}
                                                                        placeholder={`Add ${definition.label.toLowerCase()}`}
                                                                    />
                                                                ) : definition.inputType === "date" ? (
                                                                    <input
                                                                        className="form__input__Z3n7q0"
                                                                        type="date"
                                                                        disabled={!allowLineEdit}
                                                                        value={value}
                                                                        onChange={(event) => {
                                                                            if (!allowLineEdit) return;
                                                                            updateLine(line.id, (current) => ({
                                                                                ...current,
                                                                                variantValues: {
                                                                                    ...current.variantValues,
                                                                                    [rule.variantId]: event.target.value,
                                                                                },
                                                                            }));
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <input
                                                                        className="form__input__Z3n7q0"
                                                                        disabled={!allowLineEdit}
                                                                        value={value}
                                                                        onChange={(event) => {
                                                                            if (!allowLineEdit) return;
                                                                            updateLine(line.id, (current) => ({
                                                                                ...current,
                                                                                variantValues: {
                                                                                    ...current.variantValues,
                                                                                    [rule.variantId]: event.target.value,
                                                                                },
                                                                            }));
                                                                        }}
                                                                        placeholder={`Enter ${definition.label.toLowerCase()}`}
                                                                    />
                                                                )}
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            ) : null}

                                            {error.variantValues ? <p className="portalProductCreateError__Q6m2P8">{error.variantValues}</p> : null}
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    <div className="portalPurchaseOrderFooterGrid__W6m2Q4">
                        <section className="portalProductCreateMainCard__N4m8Q3 ui-surface-card">
                            <PurchaseOrderSectionHeader
                                title="Additional details"
                                description="Optional references and note."
                                showTooltip={false}
                            />

                            <div className="portalProductCreateGrid__W2m9Q4">
                                <label className="form__group__K7p2s0 portalPurchaseOrderGridSpan2__Q8m2Q3">
                                    <span className="form__label__B9f4k0">Reference number</span>
                                    <input
                                        className="form__input__Z3n7q0"
                                        value={draft.referenceNumber ?? ""}
                                        onChange={(event) => updateField("referenceNumber", event.target.value)}
                                        placeholder="Reference number"
                                    />
                                </label>

                                <label className="form__group__K7p2s0 portalPurchaseOrderGridSpan2__Q8m2Q3">
                                    <span className="form__label__B9f4k0">Note</span>
                                    <textarea
                                        className="form__textarea__Q6p3f0"
                                        rows={4}
                                        value={draft.notesToSupplier ?? ""}
                                        onChange={(event) => updateField("notesToSupplier", event.target.value)}
                                        placeholder="Note"
                                    />
                                </label>
                            </div>
                        </section>

                        <section className="portalProductCreateMainCard__N4m8Q3 ui-surface-card">
                            <PurchaseOrderSectionHeader
                                title="Cost summary"
                                description="Overview of subtotal, tax, and order-level adjustments."
                            />

                            {summary ? (
                                <div className="portalPurchaseOrderSummary__S4m2Q7">
                                    <p><span>Items</span><strong>{summary.itemCount}</strong></p>
                                    <p><span>Subtotal</span><strong>{formatMoney(summary.subtotal, draft.supplierCurrency)}</strong></p>
                                    <p><span>Tax</span><strong>{formatMoney(summary.taxTotal, draft.supplierCurrency)}</strong></p>
                                    <p><span>Adjustments</span><strong>{formatMoney(summary.adjustmentTotal, draft.supplierCurrency)}</strong></p>
                                    <p className="portalPurchaseOrderSummaryTotal__Q3m8Q4"><span>Total</span><strong>{formatMoney(summary.total, draft.supplierCurrency)}</strong></p>
                                </div>
                            ) : null}

                        </section>
                    </div>

                    {loadError ? <p className="portalProductCreateError__Q6m2P8">{loadError}</p> : null}
                    {submitError ? <p className="portalProductCreateError__Q6m2P8">{submitError}</p> : null}
                    {submitMessage ? <p className="portalProductCreateSuccess__N2m8Q5">{submitMessage}</p> : null}
                </div>
            </div>

            <PortalModal
                open={browseOpen}
                title="Browse products"
                closeLabel="Close browse products pop-up"
                onClose={() => {
                    setBrowseOpen(false);
                    setBrowseSelectedIds(new Set());
                    setBrowseQuery("");
                }}
                footer={(
                    <>
                        <Button
                            type="button"
                            kind="secondary"
                            size="xsmall"
                            onClick={() => {
                                setBrowseOpen(false);
                                setBrowseSelectedIds(new Set());
                                setBrowseQuery("");
                            }}
                        >
                            Cancel
                        </Button>
                        <Button type="button" kind="primary" size="xsmall" onClick={addSelectedBrowseProducts} disabled={browseSelectedIds.size === 0}>
                            Add selected ({browseSelectedIds.size})
                        </Button>
                    </>
                )}
            >
                <div className="portalPurchaseOrderBrowseToolbar__Q2m8Q4">
                    <label className="portalCategoryCreateSearchField__Q6m2Q8">
                        <Search aria-hidden="true" />
                        <input
                            ref={browseSearchRef}
                            className="form__input__Z3n7q0 portalCategoryCreateSearchInput__T6m2Q3"
                            value={browseQuery}
                            onChange={(event) => setBrowseQuery(event.target.value)}
                            placeholder="Search products"
                        />
                    </label>
                    <label className="portalCategoryCreateSearchByField__U2m8Q4">
                        <span className="portalCategoryCreateSearchByPrefix__A8m2Q3">Search by{" "}</span>
                        <select
                            className="form__select__P9j2k0 portalCategoryCreateSearchBySelect__V2m8Q4"
                            value={browseSearchBy}
                            onChange={(event) => setBrowseSearchBy(event.target.value as ProductSearchBy)}
                        >
                            <option value="TITLE">Product title</option>
                            <option value="ID">Product ID</option>
                            <option value="SKU">SKU</option>
                        </select>
                    </label>
                </div>

                <div className="portalCategoryCreateSupplyList__Q5m2Q8 portalPurchaseOrderBrowseList__L6m2Q4">
                    {browseProducts.length === 0 ? (
                        <div className="portalCategoryCreatePickerEmpty__S2m8Q5">
                            <PackageSearch aria-hidden="true" />
                            <p>No products found.</p>
                            <small>Try adjusting the filters or search term.</small>
                        </div>
                    ) : (
                        browseProducts.map((product) => {
                            const checked = browseSelectedIds.has(product.id);
                            return (
                                <label key={product.id} className="portalCategoryCreateSupplyRow__A7m2Q6 portalPurchaseOrderBrowseItem__X3m2Q8">
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(event) => toggleBrowseSelection(product.id, event.target.checked)}
                                    />
                                    <span className="portalCategoryCreateSupplyName__L2m8Q4">{product.name}</span>
                                    <small className="portalCategoryCreateSupplyMeta__M2m8Q5">
                                        {`${product.sku} · ${getProductCategoryTitles(product, categories).join(", ") || "-"}`}
                                    </small>
                                </label>
                            );
                        })
                    )}
                </div>
            </PortalModal>

            <PortalModal
                open={variantsManagerOpen}
                title="Manage variants"
                closeLabel="Close manage variants pop-up"
                onClose={() => {
                    setVariantsManagerOpen(false);
                    setVariantManagerError(null);
                }}
                bodyClassName="portalModalBodyTall__M2m8Q4"
                footer={(
                    <Button
                        type="button"
                        kind="primary"
                        size="xsmall"
                        onClick={() => {
                            setVariantsManagerOpen(false);
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
                                    ref={variantLibrarySearchRef}
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
                                    onChange={(event) => setVariantLibrarySearchBy(event.target.value as VariantLibrarySearchBy)}
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
                            ) : filteredVariantLibrary.map((definition) => {
                                return (
                                    <div key={definition.id} className="portalProductsColumnOptionItem__A4m2Q7">
                                        <div className="portalProductsColumnOptionRow__H4m8Q7">
                                            <span className="portalProductsColumnOption__V2m8Q6 portalPurchaseOrderVariantListLabel__H2m8Q5">
                                                <span className="portalProductsColumnOptionLabel__K7m2Q1">{definition.label}</span>
                                            </span>
                                            <span className="portalProductsColumnOrderControls__D3m8Q9 portalPurchaseOrderVariantActions__V3m8Q4">
                                                <button
                                                    type="button"
                                                    className="portalCategoryCreateInlineLink__W4m8Q2 portalPurchaseOrderVariantActionLink__A4m8Q2"
                                                    onClick={() => openVariantEditor(definition.id)}
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
                onClose={closeVariantEditor}
                footer={(
                    <>
                        <Button type="button" kind="secondary" size="xsmall" onClick={closeVariantEditor}>
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
                            if (!current) return <p className="portalCategoriesError__C6m2Q8">Variant not found.</p>;
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
                                            <select className="form__select__P9j2k0" value={current.inputType} disabled>
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
                open={createSupplierOpen}
                title="Create new supplier"
                closeLabel="Close create supplier pop-up"
                onClose={() => {
                    setCreateSupplierOpen(false);
                    clearCreateSupplierDraft();
                }}
                footer={(
                    <>
                        <Button
                            type="button"
                            kind="secondary"
                            size="xsmall"
                            onClick={() => {
                                setCreateSupplierOpen(false);
                                clearCreateSupplierDraft();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button type="button" kind="primary" size="xsmall" onClick={createSupplier}>
                            Save supplier
                        </Button>
                    </>
                )}
            >
                <div className="portalPurchaseOrderCreateSupplierForm__F4m2Q8">
                    <label className="form__group__K7p2s0 portalPurchaseOrderCreateSupplierCompany__N2m8Q5">
                        <span className="form__label__B9f4k0">
                            <span className="portalProductCreateRequiredStar__H4m2Q8" aria-hidden="true">*</span>
                            Company
                        </span>
                        <input
                            className="form__input__Z3n7q0"
                            value={newSupplierCompany}
                            onChange={(event) => setNewSupplierCompany(event.target.value)}
                            placeholder="Company name"
                        />
                    </label>

                    <label className="form__group__K7p2s0">
                        <span className="form__label__B9f4k0">
                            <span className="portalProductCreateRequiredStar__H4m2Q8" aria-hidden="true">*</span>
                            Region
                        </span>
                        <select
                            className="form__select__P9j2k0"
                            value={newSupplierRegion}
                            onChange={(event) => setNewSupplierRegion(event.target.value)}
                        >
                            <option value="">Select region</option>
                            {supplierRegionOptions.map((region) => (
                                <option key={region} value={region}>
                                    {region}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="form__group__K7p2s0">
                        <span className="form__label__B9f4k0">Street</span>
                        <input
                            className="form__input__Z3n7q0"
                            value={newSupplierStreet}
                            onChange={(event) => setNewSupplierStreet(event.target.value)}
                            placeholder="Street name"
                        />
                    </label>

                    <label className="form__group__K7p2s0">
                        <span className="form__label__B9f4k0">House number</span>
                        <input
                            className="form__input__Z3n7q0"
                            value={newSupplierHouseNumber}
                            onChange={(event) => setNewSupplierHouseNumber(event.target.value)}
                            placeholder="12"
                        />
                    </label>

                    <label className="form__group__K7p2s0">
                        <span className="form__label__B9f4k0">Apartment or suite</span>
                        <input
                            className="form__input__Z3n7q0"
                            value={newSupplierApartmentSuite}
                            onChange={(event) => setNewSupplierApartmentSuite(event.target.value)}
                            placeholder="Suite 4B"
                        />
                    </label>

                    <label className="form__group__K7p2s0">
                        <span className="form__label__B9f4k0">Postal code</span>
                        <input
                            className="form__input__Z3n7q0"
                            value={newSupplierPostalCode}
                            onChange={(event) => setNewSupplierPostalCode(event.target.value)}
                            placeholder="2100"
                        />
                    </label>

                    <label className="form__group__K7p2s0">
                        <span className="form__label__B9f4k0">City</span>
                        <input
                            className="form__input__Z3n7q0"
                            value={newSupplierCity}
                            onChange={(event) => setNewSupplierCity(event.target.value)}
                            placeholder="Copenhagen"
                        />
                    </label>

                    <label className="form__group__K7p2s0">
                        <span className="form__label__B9f4k0">Contact name</span>
                        <input
                            className="form__input__Z3n7q0"
                            value={newSupplierContactName}
                            onChange={(event) => setNewSupplierContactName(event.target.value)}
                            placeholder="Alex Johnson"
                        />
                    </label>

                    <label className="form__group__K7p2s0">
                        <span className="form__label__B9f4k0">Email address</span>
                        <input
                            className="form__input__Z3n7q0"
                            type="email"
                            value={newSupplierEmail}
                            onChange={(event) => setNewSupplierEmail(event.target.value)}
                            placeholder="name@company.com"
                        />
                    </label>

                    <label className="form__group__K7p2s0 portalPurchaseOrderCreateSupplierPhone__H4m2Q6">
                        <span className="form__label__B9f4k0">Phone number</span>
                        <SupplierPhoneField
                            countryCode={newSupplierPhoneCountryCode}
                            number={newSupplierPhoneNationalNumber}
                            onCountryCodeChange={setNewSupplierPhoneCountryCode}
                            onNumberChange={setNewSupplierPhoneNationalNumber}
                        />
                    </label>
                </div>
                {createSupplierError ? <p className="portalProductCreateError__Q6m2P8">{createSupplierError}</p> : null}
            </PortalModal>

            <PortalModal
                open={adjustmentsOpen}
                title="Manage additional costs"
                closeLabel="Close adjustments pop-up"
                onClose={() => {
                    setAdjustmentsOpen(false);
                    setAdjustmentError(null);
                }}
                footer={(
                    <>
                        <Button type="button" kind="secondary" size="xsmall" onClick={() => setAdjustmentsOpen(false)}>
                            Close
                        </Button>
                    </>
                )}
            >
                <div className="portalPurchaseOrderAdjustments__N8m2Q4">
                    {draft.adjustments.length === 0 ? (
                        <p className="portalProductCreateHint__A8m2Q1">No additional costs yet.</p>
                    ) : (
                        draft.adjustments.map((adjustment) => (
                            <div key={adjustment.id} className="portalPurchaseOrderAdjustmentItem__P5m2Q8">
                                <div>
                                    <p>{adjustment.label}</p>
                                    <small>{adjustment.type}</small>
                                </div>
                                <div className="portalPurchaseOrderAdjustmentActions__B2m8Q5">
                                    <strong>{formatMoney(adjustment.amount, adjustment.currency)}</strong>
                                    <Button type="button" kind="ghost" size="xsmall" onClick={() => removeAdjustment(adjustment.id)}>
                                        <Trash2 aria-hidden="true" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}

                    <div className="portalPurchaseOrderAdjustmentEditor__U2m8Q5">
                        <label className="form__group__K7p2s0">
                            <span className="form__label__B9f4k0">Type</span>
                            <select
                                className="form__select__P9j2k0"
                                value={adjustmentEditor.type}
                                onChange={(event) => setAdjustmentEditor((current) => ({ ...current, type: event.target.value as PurchaseOrderAdjustmentType }))}
                            >
                                {ADJUSTMENT_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="form__group__K7p2s0">
                            <span className="form__label__B9f4k0">Label</span>
                            <input
                                className="form__input__Z3n7q0"
                                value={adjustmentEditor.label}
                                onChange={(event) => setAdjustmentEditor((current) => ({ ...current, label: event.target.value }))}
                                placeholder="Adjustment label"
                            />
                        </label>

                        <label className="form__group__K7p2s0">
                            <span className="form__label__B9f4k0">Amount</span>
                            <input
                                className="form__input__Z3n7q0"
                                type="number"
                                step="0.01"
                                value={adjustmentEditor.amount}
                                onChange={(event) => setAdjustmentEditor((current) => ({ ...current, amount: event.target.value }))}
                                placeholder="0.00"
                            />
                        </label>

                        <label className="form__group__K7p2s0">
                            <span className="form__label__B9f4k0">Currency</span>
                            <select
                                className="form__select__P9j2k0"
                                value={adjustmentEditor.currency}
                                onChange={(event) => setAdjustmentEditor((current) => ({ ...current, currency: event.target.value }))}
                            >
                                {availableCurrencies.map((currency) => (
                                    <option key={currency} value={currency}>
                                        {currency}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <div className="portalPurchaseOrderAdjustmentEditorActions__V2m8Q6">
                            <Button type="button" kind="basic" size="xsmall" onClick={addAdjustment}>
                                Add adjustment
                            </Button>
                        </div>
                        {adjustmentError ? <p className="portalProductCreateError__Q6m2P8">{adjustmentError}</p> : null}
                    </div>
                </div>
            </PortalModal>

            <input type="hidden" value={activeStoreId} readOnly />
            <input type="hidden" value={storeCurrency} readOnly />
        </section>
    );
}
