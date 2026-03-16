import type { LanguageCode } from "@/i18n/portal";

export type WidgetSize = "sm" | "md" | "lg" | "xl";

export type DashboardWidgetSpan = {
    cols: number;
    rows: number;
    mobileRows: number;
};

export type DashboardWidgetDefinition = {
    id: string;
    title: string;
    subtitle: string;
    category: string;
    defaultSize: WidgetSize;
    allowedSizes: WidgetSize[];
    spans: Record<WidgetSize, DashboardWidgetSpan>;
};

export type DashboardWidgetLayout = {
    id: string;
    sectionId: string;
    visible: boolean;
    x: number;
    y: number;
    w: number;
    h: number;
    order: number;
};

export type DashboardSectionLayout = {
    id: string;
    name: string;
    collapsed: boolean;
    minRows: number;
    order: number;
};

export type DashboardLayoutState = {
    sections: DashboardSectionLayout[];
    widgets: DashboardWidgetLayout[];
    lastEditedAt: number | null;
};

export type DashboardMetrics = {
    inventoryCostValue: number;
    inventoryRetailValue: number;
    inventoryMarginPotential: number;
    unitsInStock: number;
    activeProducts: number;
    activeProductsInStock: number;
    lowStockCount: number;
    outOfStockCount: number;
    activeCoveragePercent: number;
    catalogCoveragePercent: number;
    salesLast30Revenue: number;
    salesLast30Units: number;
    salesLast30Orders: number;
    salesLast30Points: number[];
    marginLast30Amount: number;
    marginLast30Percent: number;
    categoryRows: Array<{ label: string; count: number; share: number }>;
    inventoryAgeAverageDays: number;
    inventoryAgeOldestDays: number;
    inventoryAgeNewestDays: number;
    stockRiskRows: Array<{ label: string; onHand: number }>;
    topStockRows: Array<{ name: string; units: number; value: number }>;
    movementRows: Array<{ id: string; label: string; quantity: number; amount: number; kind: "purchase" | "sale" }>;
    costOfGoodsSold: number;
    profitTotal: number;
    averageProfitPerOrder: number;
    averageProfitPerUnit: number;
    averageProfitPerProduct: number;
    averageMarginPercent: number;
    averageRoiPercent: number;
    averageMarginPerCategory: number;
    averageRoiPerCategory: number;
    averageMarginPerProduct: number;
    averageRoiPerProduct: number;
    soldProductsCount: number;
    categoryProfitRows: Array<{
        label: string;
        revenue: number;
        cost: number;
        profit: number;
        margin: number;
        roi: number;
        units: number;
    }>;
    cumulativeProfitPoints: number[];
    priceProfitPoints: Array<{ price: number; profitPerUnit: number }>;
    holdingProfitPoints: Array<{ holdingDays: number; profitPerUnit: number }>;
    variantPerformanceTitle: string;
    variantPerformanceRows: Array<{ label: string; profit: number; roi: number; orders: number }>;
};

export type DashboardDatePreset =
    | "none"
    | "yesterday"
    | "last-week"
    | "last-month"
    | "last-quarter"
    | "last-year";

export type DashboardDateRange = {
    preset: DashboardDatePreset;
    startDate: string | null;
    endDate: string | null;
};

export const DASHBOARD_LAYOUT_STORAGE_KEY = "veloro_dashboard_home_v1";
export const DASHBOARD_CURRENCY_SEARCH_PLACEHOLDER = "Search currencies";
export const DASHBOARD_CURRENCY_EMPTY_MESSAGE = "No currencies found";
export const DASHBOARD_DEFAULT_SECTION_ID = "control-panel";
export const DASHBOARD_DEFAULT_SECTION_NAME = "Control panel";
export const DASHBOARD_UNNAMED_SECTION_NAME = "Unnamed section";
export const DASHBOARD_SECTION_MIN_ROWS = 3;

export const LANGUAGE_TO_LOCALE: Record<LanguageCode, string> = {
    en: "en-US",
    da: "da-DK",
    de: "de-DE",
    fr: "fr-FR",
    es: "es-ES",
    zh: "zh-CN",
};

export const DASHBOARD_FALLBACK_USD_RATES: Record<string, number> = {
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

export type DashboardWidgetLocaleCopy = {
    widgetMeta: Record<string, { title: string; subtitle: string; category: string }>;
    labels: {
        costValue: string;
        marginPotential: string;
        activeProductsInStock: string;
        activeCoverage: string;
        catalogCoverage: string;
        zeroStock: string;
        lowStock: string;
        orders: string;
        unitsSold: string;
        estimatedMargin: string;
        revenue: string;
        average: string;
        oldest: string;
        newest: string;
        purchased: string;
        sold: string;
        unitsShort: string;
    };
};

export const DASHBOARD_WIDGET_COPY: Record<LanguageCode, DashboardWidgetLocaleCopy> = {
    en: {
        widgetMeta: {
            "inventory-value": { title: "Inventory value", subtitle: "On-hand cost and sale value", category: "Inventory" },
            "inventory-units": { title: "Inventory units", subtitle: "Units currently in stock", category: "Inventory" },
            "product-coverage": { title: "Product coverage", subtitle: "Products with available stock", category: "Catalog" },
            "stock-alerts": { title: "Stock alerts", subtitle: "Low-stock and zero-stock watch", category: "Inventory" },
            "sales-30d": { title: "Sales", subtitle: "Revenue, units, and order flow", category: "Sales" },
            "margin-30d": { title: "Margin", subtitle: "Estimated gross margin", category: "Sales" },
            "category-balance": { title: "Category balance", subtitle: "Product distribution by category", category: "Catalog" },
            "inventory-age": { title: "Inventory age", subtitle: "Average and oldest stock age", category: "Inventory" },
            "top-stock": { title: "Top stock positions", subtitle: "Products with most units on hand", category: "Inventory" },
            "recent-movements": { title: "Recent movements", subtitle: "Latest purchases and sales", category: "Inventory" },
        },
        labels: {
            costValue: "Cost value",
            marginPotential: "Margin potential",
            activeProductsInStock: "{count} active products currently have stock.",
            activeCoverage: "Active products in stock",
            catalogCoverage: "Total catalog in stock",
            zeroStock: "Zero stock",
            lowStock: "Low stock (1-3)",
            orders: "Orders",
            unitsSold: "Units sold",
            estimatedMargin: "Estimated margin",
            revenue: "Revenue",
            average: "Average",
            oldest: "Oldest",
            newest: "Newest",
            purchased: "Purchased",
            sold: "Sold",
            unitsShort: "units",
        },
    },
    da: {
        widgetMeta: {
            "inventory-value": { title: "Lagervaerdi", subtitle: "Kostpris og salgsvaerdi pa lager", category: "Lager" },
            "inventory-units": { title: "Lagerenheder", subtitle: "Enheder pa lager", category: "Lager" },
            "product-coverage": { title: "Produktdaekning", subtitle: "Produkter med lager", category: "Katalog" },
            "stock-alerts": { title: "Lagervarsler", subtitle: "Overblik over lavt og nul lager", category: "Lager" },
            "sales-30d": { title: "Salg", subtitle: "Omsaetning, enheder og ordreflow", category: "Salg" },
            "margin-30d": { title: "Margin", subtitle: "Estimeret bruttofortjeneste", category: "Salg" },
            "category-balance": { title: "Kategoribalance", subtitle: "Produktfordeling per kategori", category: "Katalog" },
            "inventory-age": { title: "Lageralder", subtitle: "Gennemsnitlig og aeldste lageralder", category: "Lager" },
            "top-stock": { title: "Stoerste lagerposter", subtitle: "Produkter med flest enheder", category: "Lager" },
            "recent-movements": { title: "Seneste bevagelser", subtitle: "Seneste indkob og salg", category: "Lager" },
        },
        labels: {
            costValue: "Kostvaerdi",
            marginPotential: "Fortjenestepotentiale",
            activeProductsInStock: "{count} aktive produkter har lager.",
            activeCoverage: "Aktive produkter pa lager",
            catalogCoverage: "Hele kataloget pa lager",
            zeroStock: "Nul lager",
            lowStock: "Lavt lager (1-3)",
            orders: "Ordrer",
            unitsSold: "Solgte enheder",
            estimatedMargin: "Estimeret margin",
            revenue: "Omsaetning",
            average: "Gennemsnit",
            oldest: "Aeldst",
            newest: "Nyest",
            purchased: "Indkobt",
            sold: "Solgt",
            unitsShort: "stk.",
        },
    },
    de: {
        widgetMeta: {
            "inventory-value": { title: "Bestandswert", subtitle: "Kosten- und Verkaufswert im Lager", category: "Lager" },
            "inventory-units": { title: "Lagereinheiten", subtitle: "Einheiten auf Lager", category: "Lager" },
            "product-coverage": { title: "Produktabdeckung", subtitle: "Produkte mit verfuegbarem Bestand", category: "Katalog" },
            "stock-alerts": { title: "Bestandswarnungen", subtitle: "Niedrig- und Nullbestand", category: "Lager" },
            "sales-30d": { title: "Umsatz", subtitle: "Umsatz, Einheiten und Auftragsfluss", category: "Vertrieb" },
            "margin-30d": { title: "Marge", subtitle: "Geschaetzte Bruttomarge", category: "Vertrieb" },
            "category-balance": { title: "Kategoriebalance", subtitle: "Produktverteilung nach Kategorie", category: "Katalog" },
            "inventory-age": { title: "Bestandsalter", subtitle: "Durchschnittliches und aeltestes Alter", category: "Lager" },
            "top-stock": { title: "Top-Lagerpositionen", subtitle: "Produkte mit den meisten Einheiten", category: "Lager" },
            "recent-movements": { title: "Letzte Bewegungen", subtitle: "Neueste Einkaeufe und Verkaeufe", category: "Lager" },
        },
        labels: {
            costValue: "Kostenwert",
            marginPotential: "Margenpotenzial",
            activeProductsInStock: "{count} aktive Produkte sind auf Lager.",
            activeCoverage: "Aktive Produkte auf Lager",
            catalogCoverage: "Gesamter Katalog auf Lager",
            zeroStock: "Kein Bestand",
            lowStock: "Niedriger Bestand (1-3)",
            orders: "Bestellungen",
            unitsSold: "Verkaufte Einheiten",
            estimatedMargin: "Geschaetzte Marge",
            revenue: "Umsatz",
            average: "Durchschnitt",
            oldest: "Aeltest",
            newest: "Neueste",
            purchased: "Eingekauft",
            sold: "Verkauft",
            unitsShort: "Stk.",
        },
    },
    fr: {
        widgetMeta: {
            "inventory-value": { title: "Valeur du stock", subtitle: "Valeur de cout et de vente en stock", category: "Stock" },
            "inventory-units": { title: "Unites en stock", subtitle: "Unites actuellement en stock", category: "Stock" },
            "product-coverage": { title: "Couverture produits", subtitle: "Produits disponibles en stock", category: "Catalogue" },
            "stock-alerts": { title: "Alertes stock", subtitle: "Surveillance du stock bas et nul", category: "Stock" },
            "sales-30d": { title: "Ventes", subtitle: "Revenus, unites et flux de commandes", category: "Ventes" },
            "margin-30d": { title: "Marge", subtitle: "Marge brute estimee", category: "Ventes" },
            "category-balance": { title: "Equilibre categories", subtitle: "Repartition des produits", category: "Catalogue" },
            "inventory-age": { title: "Age du stock", subtitle: "Age moyen et le plus ancien", category: "Stock" },
            "top-stock": { title: "Top positions stock", subtitle: "Produits avec le plus d'unites", category: "Stock" },
            "recent-movements": { title: "Mouvements recents", subtitle: "Derniers achats et ventes", category: "Stock" },
        },
        labels: {
            costValue: "Valeur de cout",
            marginPotential: "Potentiel de marge",
            activeProductsInStock: "{count} produits actifs ont du stock.",
            activeCoverage: "Produits actifs en stock",
            catalogCoverage: "Catalogue total en stock",
            zeroStock: "Stock zero",
            lowStock: "Stock bas (1-3)",
            orders: "Commandes",
            unitsSold: "Unites vendues",
            estimatedMargin: "Marge estimee",
            revenue: "Revenus",
            average: "Moyenne",
            oldest: "Plus ancien",
            newest: "Plus recent",
            purchased: "Achete",
            sold: "Vendu",
            unitsShort: "u.",
        },
    },
    es: {
        widgetMeta: {
            "inventory-value": { title: "Valor de inventario", subtitle: "Valor de costo y venta en stock", category: "Inventario" },
            "inventory-units": { title: "Unidades en inventario", subtitle: "Unidades actualmente en stock", category: "Inventario" },
            "product-coverage": { title: "Cobertura de productos", subtitle: "Productos con stock disponible", category: "Catalogo" },
            "stock-alerts": { title: "Alertas de stock", subtitle: "Vigilancia de stock bajo y cero", category: "Inventario" },
            "sales-30d": { title: "Ventas", subtitle: "Ingresos, unidades y flujo de pedidos", category: "Ventas" },
            "margin-30d": { title: "Margen", subtitle: "Margen bruto estimado", category: "Ventas" },
            "category-balance": { title: "Balance de categorias", subtitle: "Distribucion de productos por categoria", category: "Catalogo" },
            "inventory-age": { title: "Edad de inventario", subtitle: "Edad media y mas antigua", category: "Inventario" },
            "top-stock": { title: "Top posiciones de stock", subtitle: "Productos con mas unidades", category: "Inventario" },
            "recent-movements": { title: "Movimientos recientes", subtitle: "Ultimas compras y ventas", category: "Inventario" },
        },
        labels: {
            costValue: "Valor de costo",
            marginPotential: "Potencial de margen",
            activeProductsInStock: "{count} productos activos tienen stock.",
            activeCoverage: "Productos activos en stock",
            catalogCoverage: "Catalogo total en stock",
            zeroStock: "Sin stock",
            lowStock: "Stock bajo (1-3)",
            orders: "Pedidos",
            unitsSold: "Unidades vendidas",
            estimatedMargin: "Margen estimado",
            revenue: "Ingresos",
            average: "Promedio",
            oldest: "Mas antiguo",
            newest: "Mas reciente",
            purchased: "Comprado",
            sold: "Vendido",
            unitsShort: "uds.",
        },
    },
    zh: {
        widgetMeta: {
            "inventory-value": { title: "库存价值", subtitle: "在库成本与销售价值", category: "库存" },
            "inventory-units": { title: "库存数量", subtitle: "当前在库件数", category: "库存" },
            "product-coverage": { title: "产品覆盖率", subtitle: "有库存的产品", category: "目录" },
            "stock-alerts": { title: "库存预警", subtitle: "低库存与零库存监控", category: "库存" },
            "sales-30d": { title: "销售", subtitle: "营收、销量与订单流", category: "销售" },
            "margin-30d": { title: "毛利", subtitle: "预计毛利", category: "销售" },
            "category-balance": { title: "分类分布", subtitle: "按分类的产品分布", category: "目录" },
            "inventory-age": { title: "库存龄", subtitle: "平均与最老库存天数", category: "库存" },
            "top-stock": { title: "库存前排", subtitle: "库存数量最多的产品", category: "库存" },
            "recent-movements": { title: "最近变动", subtitle: "最新采购与销售", category: "库存" },
        },
        labels: {
            costValue: "成本价值",
            marginPotential: "潜在毛利",
            activeProductsInStock: "{count} 个在售产品当前有库存。",
            activeCoverage: "在售产品有库存",
            catalogCoverage: "全目录有库存",
            zeroStock: "零库存",
            lowStock: "低库存（1-3）",
            orders: "订单",
            unitsSold: "售出数量",
            estimatedMargin: "预计毛利",
            revenue: "营收",
            average: "平均",
            oldest: "最老",
            newest: "最新",
            purchased: "采购",
            sold: "销售",
            unitsShort: "件",
        },
    },
};

export const DASHBOARD_WIDGETS: DashboardWidgetDefinition[] = [
    {
        id: "inventory-value",
        title: "Inventory value",
        subtitle: "On-hand cost and sale value",
        category: "Inventory",
        defaultSize: "lg",
        allowedSizes: ["md", "lg", "xl"],
        spans: {
            sm: { cols: 2, rows: 2, mobileRows: 2 },
            md: { cols: 3, rows: 3, mobileRows: 3 },
            lg: { cols: 4, rows: 4, mobileRows: 4 },
            xl: { cols: 6, rows: 5, mobileRows: 5 },
        },
    },
    {
        id: "inventory-units",
        title: "Inventory units",
        subtitle: "Units currently in stock",
        category: "Inventory",
        defaultSize: "md",
        allowedSizes: ["sm", "md", "lg"],
        spans: {
            sm: { cols: 2, rows: 2, mobileRows: 2 },
            md: { cols: 3, rows: 3, mobileRows: 3 },
            lg: { cols: 4, rows: 3, mobileRows: 3 },
            xl: { cols: 5, rows: 4, mobileRows: 4 },
        },
    },
    {
        id: "product-coverage",
        title: "Product coverage",
        subtitle: "Products with available stock",
        category: "Catalog",
        defaultSize: "md",
        allowedSizes: ["sm", "md", "lg"],
        spans: {
            sm: { cols: 2, rows: 2, mobileRows: 2 },
            md: { cols: 3, rows: 3, mobileRows: 3 },
            lg: { cols: 4, rows: 3, mobileRows: 3 },
            xl: { cols: 5, rows: 4, mobileRows: 4 },
        },
    },
    {
        id: "stock-alerts",
        title: "Stock alerts",
        subtitle: "Low-stock and zero-stock watch",
        category: "Inventory",
        defaultSize: "lg",
        allowedSizes: ["md", "lg", "xl"],
        spans: {
            sm: { cols: 2, rows: 2, mobileRows: 2 },
            md: { cols: 3, rows: 3, mobileRows: 3 },
            lg: { cols: 4, rows: 4, mobileRows: 4 },
            xl: { cols: 6, rows: 8, mobileRows: 8 },
        },
    },
    {
        id: "sales-30d",
        title: "Sales",
        subtitle: "Revenue, units, and order flow",
        category: "Sales",
        defaultSize: "lg",
        allowedSizes: ["md", "lg", "xl"],
        spans: {
            sm: { cols: 3, rows: 2, mobileRows: 2 },
            md: { cols: 4, rows: 3, mobileRows: 3 },
            lg: { cols: 6, rows: 4, mobileRows: 4 },
            xl: { cols: 8, rows: 8, mobileRows: 8 },
        },
    },
    {
        id: "margin-30d",
        title: "Margin",
        subtitle: "Estimated gross margin",
        category: "Sales",
        defaultSize: "md",
        allowedSizes: ["sm", "md", "lg", "xl"],
        spans: {
            sm: { cols: 2, rows: 2, mobileRows: 2 },
            md: { cols: 3, rows: 3, mobileRows: 3 },
            lg: { cols: 4, rows: 4, mobileRows: 4 },
            xl: { cols: 6, rows: 4, mobileRows: 4 },
        },
    },
    {
        id: "category-balance",
        title: "Category balance",
        subtitle: "Product distribution by category",
        category: "Catalog",
        defaultSize: "lg",
        allowedSizes: ["md", "lg", "xl"],
        spans: {
            sm: { cols: 3, rows: 2, mobileRows: 2 },
            md: { cols: 4, rows: 3, mobileRows: 3 },
            lg: { cols: 6, rows: 4, mobileRows: 4 },
            xl: { cols: 8, rows: 5, mobileRows: 5 },
        },
    },
    {
        id: "inventory-age",
        title: "Inventory age",
        subtitle: "Average and oldest stock age",
        category: "Inventory",
        defaultSize: "md",
        allowedSizes: ["sm", "md", "lg"],
        spans: {
            sm: { cols: 2, rows: 2, mobileRows: 2 },
            md: { cols: 3, rows: 3, mobileRows: 3 },
            lg: { cols: 4, rows: 3, mobileRows: 3 },
            xl: { cols: 5, rows: 6, mobileRows: 6 },
        },
    },
    {
        id: "top-stock",
        title: "Top stock positions",
        subtitle: "Products with most units on hand",
        category: "Inventory",
        defaultSize: "lg",
        allowedSizes: ["md", "lg", "xl"],
        spans: {
            sm: { cols: 3, rows: 2, mobileRows: 2 },
            md: { cols: 4, rows: 3, mobileRows: 3 },
            lg: { cols: 6, rows: 4, mobileRows: 4 },
            xl: { cols: 8, rows: 5, mobileRows: 5 },
        },
    },
    {
        id: "recent-movements",
        title: "Recent movements",
        subtitle: "Latest purchases and sales",
        category: "Inventory",
        defaultSize: "lg",
        allowedSizes: ["md", "lg", "xl"],
        spans: {
            sm: { cols: 3, rows: 2, mobileRows: 2 },
            md: { cols: 4, rows: 3, mobileRows: 3 },
            lg: { cols: 6, rows: 5, mobileRows: 5 },
            xl: { cols: 8, rows: 6, mobileRows: 6 },
        },
    },
    {
        id: "total-units-sold",
        title: "Total units sold",
        subtitle: "Units sold in selected period",
        category: "Sales",
        defaultSize: "md",
        allowedSizes: ["sm", "md", "lg"],
        spans: {
            sm: { cols: 3, rows: 2, mobileRows: 2 },
            md: { cols: 3, rows: 3, mobileRows: 3 },
            lg: { cols: 4, rows: 3, mobileRows: 3 },
            xl: { cols: 6, rows: 4, mobileRows: 4 },
        },
    },
    {
        id: "cogs-total",
        title: "Total cost",
        subtitle: "Cost of goods sold",
        category: "Profitability",
        defaultSize: "md",
        allowedSizes: ["sm", "md", "lg"],
        spans: {
            sm: { cols: 3, rows: 2, mobileRows: 2 },
            md: { cols: 3, rows: 3, mobileRows: 3 },
            lg: { cols: 4, rows: 3, mobileRows: 3 },
            xl: { cols: 6, rows: 4, mobileRows: 4 },
        },
    },
    {
        id: "profit-total",
        title: "Total profit",
        subtitle: "Revenue minus cost",
        category: "Profitability",
        defaultSize: "lg",
        allowedSizes: ["sm", "md", "lg", "xl"],
        spans: {
            sm: { cols: 3, rows: 2, mobileRows: 2 },
            md: { cols: 4, rows: 3, mobileRows: 3 },
            lg: { cols: 6, rows: 4, mobileRows: 4 },
            xl: { cols: 8, rows: 5, mobileRows: 5 },
        },
    },
    {
        id: "avg-profit",
        title: "Average profit",
        subtitle: "Per order, unit, and product",
        category: "Profitability",
        defaultSize: "md",
        allowedSizes: ["sm", "md", "lg"],
        spans: {
            sm: { cols: 3, rows: 2, mobileRows: 2 },
            md: { cols: 3, rows: 3, mobileRows: 3 },
            lg: { cols: 4, rows: 4, mobileRows: 4 },
            xl: { cols: 6, rows: 4, mobileRows: 4 },
        },
    },
    {
        id: "avg-roi",
        title: "Average ROI",
        subtitle: "ROI and margin performance",
        category: "Profitability",
        defaultSize: "md",
        allowedSizes: ["sm", "md", "lg", "xl"],
        spans: {
            sm: { cols: 3, rows: 2, mobileRows: 2 },
            md: { cols: 4, rows: 3, mobileRows: 3 },
            lg: { cols: 5, rows: 4, mobileRows: 4 },
            xl: { cols: 6, rows: 5, mobileRows: 5 },
        },
    },
    {
        id: "category-profit",
        title: "Profit by category",
        subtitle: "Category-level revenue and profit",
        category: "Performance",
        defaultSize: "lg",
        allowedSizes: ["md", "lg", "xl"],
        spans: {
            sm: { cols: 3, rows: 2, mobileRows: 2 },
            md: { cols: 4, rows: 3, mobileRows: 3 },
            lg: { cols: 6, rows: 5, mobileRows: 5 },
            xl: { cols: 8, rows: 6, mobileRows: 6 },
        },
    },
    {
        id: "cumulative-profit",
        title: "Cumulative profit",
        subtitle: "Profit growth over time",
        category: "Performance",
        defaultSize: "lg",
        allowedSizes: ["md", "lg", "xl"],
        spans: {
            sm: { cols: 3, rows: 2, mobileRows: 2 },
            md: { cols: 4, rows: 3, mobileRows: 3 },
            lg: { cols: 6, rows: 4, mobileRows: 4 },
            xl: { cols: 8, rows: 6, mobileRows: 6 },
        },
    },
    {
        id: "price-profit-scatter",
        title: "Price vs profit",
        subtitle: "Per-sale unit price against unit profit",
        category: "Performance",
        defaultSize: "lg",
        allowedSizes: ["md", "lg", "xl"],
        spans: {
            sm: { cols: 3, rows: 2, mobileRows: 2 },
            md: { cols: 4, rows: 3, mobileRows: 3 },
            lg: { cols: 6, rows: 4, mobileRows: 4 },
            xl: { cols: 8, rows: 6, mobileRows: 6 },
        },
    },
    {
        id: "holding-profit-scatter",
        title: "Holding vs profit",
        subtitle: "Holding period against unit profit",
        category: "Performance",
        defaultSize: "lg",
        allowedSizes: ["md", "lg", "xl"],
        spans: {
            sm: { cols: 3, rows: 2, mobileRows: 2 },
            md: { cols: 4, rows: 3, mobileRows: 3 },
            lg: { cols: 6, rows: 4, mobileRows: 4 },
            xl: { cols: 8, rows: 6, mobileRows: 6 },
        },
    },
    {
        id: "variant-performance",
        title: "Variant performance",
        subtitle: "ROI and profit by variant value",
        category: "Performance",
        defaultSize: "lg",
        allowedSizes: ["md", "lg", "xl"],
        spans: {
            sm: { cols: 3, rows: 2, mobileRows: 2 },
            md: { cols: 4, rows: 3, mobileRows: 3 },
            lg: { cols: 6, rows: 5, mobileRows: 5 },
            xl: { cols: 8, rows: 6, mobileRows: 6 },
        },
    },
];

export const DASHBOARD_WIDGETS_BY_ID = new Map(DASHBOARD_WIDGETS.map((widget) => [widget.id, widget]));
export const DAY_MS = 24 * 60 * 60 * 1000;
export const DASHBOARD_GRID_COLUMNS = 12;
export const DASHBOARD_GRID_MIN_COLS = 3;
export const DASHBOARD_GRID_MIN_ROWS = 2;
export const DASHBOARD_GRID_ROW_SIZE = 45;
export const DASHBOARD_MOBILE_BREAKPOINT = 768;
export const DASHBOARD_MAX_SEARCH_ROWS = 5000;
export const DASHBOARD_TIME_SPECIFIC_WIDGETS = new Set([
    "sales-30d",
    "margin-30d",
    "recent-movements",
    "total-units-sold",
    "cogs-total",
    "profit-total",
    "avg-profit",
    "avg-roi",
    "category-profit",
    "cumulative-profit",
    "price-profit-scatter",
    "holding-profit-scatter",
    "variant-performance",
]);
export const DASHBOARD_DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const DASHBOARD_DATE_WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
export const DASHBOARD_DATE_ALL_LABEL = "All dates";
export const DASHBOARD_DATE_START_LABEL = "Start";
export const DASHBOARD_DATE_END_LABEL = "End";
export const DASHBOARD_DATE_APPLY_LABEL = "Apply";
export const DASHBOARD_DATE_DIALOG_LABEL = "Dashboard date range";
export const DASHBOARD_TIME_SPECIFIC_BADGE = "Time-specific";
export const DASHBOARD_DATE_PRESET_OPTIONS: Array<{ value: DashboardDatePreset; label: string }> = [
    { value: "yesterday", label: "Yesterday" },
    { value: "last-week", label: "Last week" },
    { value: "last-month", label: "Last month" },
    { value: "last-quarter", label: "Last quarter" },
    { value: "last-year", label: "Last year" },
];

export const DASHBOARD_DEFAULT_LAYOUT_PRESET: DashboardWidgetLayout[] = [
    { id: "inventory-value", sectionId: DASHBOARD_DEFAULT_SECTION_ID, visible: true, x: 0, y: 0, w: 3, h: 2, order: 0 },
    { id: "inventory-units", sectionId: DASHBOARD_DEFAULT_SECTION_ID, visible: true, x: 3, y: 0, w: 3, h: 2, order: 1 },
    { id: "product-coverage", sectionId: DASHBOARD_DEFAULT_SECTION_ID, visible: true, x: 6, y: 0, w: 3, h: 2, order: 2 },
    { id: "margin-30d", sectionId: DASHBOARD_DEFAULT_SECTION_ID, visible: true, x: 9, y: 0, w: 3, h: 2, order: 3 },
    { id: "sales-30d", sectionId: DASHBOARD_DEFAULT_SECTION_ID, visible: true, x: 0, y: 2, w: 8, h: 8, order: 4 },
    { id: "stock-alerts", sectionId: DASHBOARD_DEFAULT_SECTION_ID, visible: true, x: 8, y: 2, w: 4, h: 8, order: 5 },
    { id: "category-balance", sectionId: DASHBOARD_DEFAULT_SECTION_ID, visible: true, x: 0, y: 10, w: 6, h: 5, order: 6 },
    { id: "top-stock", sectionId: DASHBOARD_DEFAULT_SECTION_ID, visible: true, x: 6, y: 10, w: 6, h: 5, order: 7 },
    { id: "inventory-age", sectionId: DASHBOARD_DEFAULT_SECTION_ID, visible: true, x: 8, y: 15, w: 4, h: 6, order: 8 },
    { id: "recent-movements", sectionId: DASHBOARD_DEFAULT_SECTION_ID, visible: true, x: 0, y: 15, w: 8, h: 6, order: 9 },
    { id: "total-units-sold", sectionId: DASHBOARD_DEFAULT_SECTION_ID, visible: false, x: 0, y: 22, w: 3, h: 3, order: 10 },
    { id: "cogs-total", sectionId: DASHBOARD_DEFAULT_SECTION_ID, visible: false, x: 3, y: 22, w: 3, h: 3, order: 11 },
    { id: "profit-total", sectionId: DASHBOARD_DEFAULT_SECTION_ID, visible: false, x: 6, y: 22, w: 6, h: 4, order: 12 },
    { id: "avg-profit", sectionId: DASHBOARD_DEFAULT_SECTION_ID, visible: false, x: 0, y: 26, w: 3, h: 3, order: 13 },
    { id: "avg-roi", sectionId: DASHBOARD_DEFAULT_SECTION_ID, visible: false, x: 3, y: 26, w: 4, h: 3, order: 14 },
    { id: "category-profit", sectionId: DASHBOARD_DEFAULT_SECTION_ID, visible: false, x: 0, y: 29, w: 6, h: 5, order: 15 },
    { id: "cumulative-profit", sectionId: DASHBOARD_DEFAULT_SECTION_ID, visible: false, x: 6, y: 29, w: 6, h: 5, order: 16 },
    { id: "price-profit-scatter", sectionId: DASHBOARD_DEFAULT_SECTION_ID, visible: false, x: 0, y: 34, w: 6, h: 4, order: 17 },
    { id: "holding-profit-scatter", sectionId: DASHBOARD_DEFAULT_SECTION_ID, visible: false, x: 6, y: 34, w: 6, h: 4, order: 18 },
    { id: "variant-performance", sectionId: DASHBOARD_DEFAULT_SECTION_ID, visible: false, x: 0, y: 38, w: 6, h: 5, order: 19 },
];

