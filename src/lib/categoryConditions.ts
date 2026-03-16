import type { CategoryCondition, CategoryConditionField, CategoryConditionOperator } from "@/lib/productCatalog";

type ConditionOperatorOption = {
    value: CategoryConditionOperator;
    label: string;
};

export type CategoryConditionFieldOption = {
    value: CategoryConditionField;
    label: string;
    valueInput: "text" | "number" | "currency";
};

const CATEGORY_CONDITION_OPERATOR_LABEL: Record<CategoryConditionOperator, string> = {
    EQ: "Is equal to",
    NEQ: "Is not equal to",
    STARTS_WITH: "Starts with",
    ENDS_WITH: "Ends with",
    CONTAINS: "Contains",
    NOT_CONTAINS: "Does not contain",
    GT: "Is greater than",
    LT: "Is less than",
};

const TEXT_CONDITION_OPERATORS: CategoryConditionOperator[] = [
    "EQ",
    "NEQ",
    "STARTS_WITH",
    "ENDS_WITH",
    "CONTAINS",
    "NOT_CONTAINS",
];

const NUMERIC_CONDITION_OPERATORS: CategoryConditionOperator[] = ["EQ", "NEQ", "GT", "LT"];

export const CATEGORY_CONDITION_FIELD_OPTIONS: CategoryConditionFieldOption[] = [
    { value: "TITLE", label: "Title", valueInput: "text" },
    { value: "SKU", label: "SKU", valueInput: "text" },
    { value: "TAG", label: "Tag", valueInput: "text" },
    { value: "STATUS", label: "Status", valueInput: "text" },
    { value: "INVENTORY", label: "Inventory stock", valueInput: "number" },
    { value: "LATEST_PURCHASE_ORDER_UNIT_COST", label: "Latest purchase order unit cost", valueInput: "currency" },
    { value: "AVERAGE_PURCHASE_ORDER_UNIT_COST", label: "Average purchase order unit cost", valueInput: "currency" },
    { value: "LISTED_SALE_PRICE", label: "Listed sale price", valueInput: "currency" },
];

function getOperatorOptions(operatorValues: CategoryConditionOperator[]): ConditionOperatorOption[] {
    return operatorValues.map((value) => ({ value, label: CATEGORY_CONDITION_OPERATOR_LABEL[value] }));
}

export function getCategoryConditionOperatorOptions(field: CategoryConditionField) {
    const fieldMeta = CATEGORY_CONDITION_FIELD_OPTIONS.find((entry) => entry.value === field);
    if (!fieldMeta) return getOperatorOptions(TEXT_CONDITION_OPERATORS);
    if (fieldMeta.valueInput === "text") return getOperatorOptions(TEXT_CONDITION_OPERATORS);
    return getOperatorOptions(NUMERIC_CONDITION_OPERATORS);
}

export function getDefaultOperatorForField(field: CategoryConditionField): CategoryConditionOperator {
    return getCategoryConditionOperatorOptions(field)[0]?.value ?? "CONTAINS";
}

export function getConditionFieldMeta(field: CategoryConditionField) {
    return CATEGORY_CONDITION_FIELD_OPTIONS.find((entry) => entry.value === field)
        ?? CATEGORY_CONDITION_FIELD_OPTIONS[0];
}

export function createEmptyCategoryCondition(index = 0): CategoryCondition {
    return {
        id: `condition_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 7)}`,
        field: "TITLE",
        operator: "CONTAINS",
        value: "",
        valueCurrency: undefined,
    };
}
