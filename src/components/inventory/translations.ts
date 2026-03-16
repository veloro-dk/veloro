import type { LanguageCode } from "@/i18n/portal";
import type { SortKey } from "@/components/inventory/viewState";

export type InventoryTranslations = {
    actions: {
        addMaintenance: string;
        addStock: string;
        sellStock: string;
        cancel: string;
        save: string;
    };
    table: {
        selectAll: string;
        product: string;
        status: string;
        inventory: string;
        category: string;
        updated: string;
        noProductsFound: string;
        selectProduct: string;
    };
    sort: {
        label: string;
        options: Record<SortKey, string>;
    };
    filters: {
        searchProducts: string;
    };
    statusLabels: {
        active: string;
        draft: string;
        archived: string;
    };
    inventoryText: {
        outOfStock: string;
        oneInStock: string;
        manyInStock: string;
    };
    detail: {
        title: string;
        sku: string;
        category: string;
        status: string;
        tags: string;
        variants: string;
        noTags: string;
        noVariants: string;
        stockHistory: string;
        stockHistoryEmpty: string;
        salesHistory: string;
        salesHistoryEmpty: string;
        batchQuantity: string;
        batchCost: string;
        batchSale: string;
        batchVendor: string;
        batchNotes: string;
        remaining: string;
    };
    addStock: {
        title: string;
        purchaseDate: string;
        quantity: string;
        purchaseUnitPrice: string;
        saleUnitPrice: string;
        vendor: string;
        notes: string;
        save: string;
    };
    sellStock: {
        title: string;
        batch: string;
        soldAt: string;
        quantity: string;
        saleUnitPrice: string;
        notes: string;
        noStock: string;
        save: string;
    };
    maintenance: {
        title: string;
        product: string;
        description: string;
        price: string;
        save: string;
    };
    errors: {
        chooseProduct: string;
        noSellableStock: string;
        addStockInvalid: string;
        sellStockInvalid: string;
        maintenanceInvalid: string;
    };
};

export const INVENTORY_TRANSLATIONS: Record<LanguageCode, InventoryTranslations> = {
    en: {
        actions: { addMaintenance: "Add maintenance", addStock: "Add stock", sellStock: "Sell stock", cancel: "Cancel", save: "Save" },
        table: {
            selectAll: "Select all products",
            product: "Product",
            status: "Status",
            inventory: "Inventory",
            category: "Category",
            updated: "Updated",
            noProductsFound: "Table is empty.",
            selectProduct: "Select {name}",
        },
        sort: {
            label: "Sort",
            options: {
                "updated-desc": "Newest first",
                "updated-asc": "Oldest first",
                "name-asc": "Product name (A-Z)",
                "name-desc": "Product name (Z-A)",
                "inventory-desc": "Inventory high to low",
                "inventory-asc": "Inventory low to high",
            },
        },
        filters: { searchProducts: "Search active products" },
        statusLabels: { active: "Active", draft: "Draft", archived: "Archived" },
        inventoryText: { outOfStock: "Out of stock", oneInStock: "1 in stock", manyInStock: "{count} in stock" },
        detail: {
            title: "Product details",
            sku: "SKU",
            category: "Category",
            status: "Status",
            tags: "Tags",
            variants: "Variants",
            noTags: "No tags",
            noVariants: "No variants",
            stockHistory: "Stock purchases",
            stockHistoryEmpty: "No stock has been added for this product.",
            salesHistory: "Sales",
            salesHistoryEmpty: "No sales registered yet.",
            batchQuantity: "Quantity",
            batchCost: "Purchase/unit",
            batchSale: "Sale/unit",
            batchVendor: "Vendor",
            batchNotes: "Notes",
            remaining: "Remaining",
        },
        addStock: {
            title: "Add stock",
            purchaseDate: "Purchase date",
            quantity: "Quantity",
            purchaseUnitPrice: "Purchase price per unit",
            saleUnitPrice: "Sale price per unit",
            vendor: "Vendor",
            notes: "Notes",
            save: "Add stock",
        },
        sellStock: {
            title: "Sell stock",
            batch: "Purchase entry",
            soldAt: "Sold date",
            quantity: "Quantity",
            saleUnitPrice: "Sale price per unit",
            notes: "Notes",
            noStock: "No stock available for this product.",
            save: "Sell stock",
        },
        maintenance: {
            title: "Add maintenance",
            product: "Product",
            description: "Description",
            price: "Price",
            save: "Add maintenance",
        },
        errors: {
            chooseProduct: "Select a product first.",
            noSellableStock: "No stock available to sell.",
            addStockInvalid: "Purchase date, quantity, and prices are required.",
            sellStockInvalid: "Enter valid sale date, quantity, and pricing values.",
            maintenanceInvalid: "Select a product, add a description, and enter a valid price.",
        },
    },
    da: {
        actions: { addMaintenance: "Tilfoj vedligehold", addStock: "Tilfoj lager", sellStock: "Saelg lager", cancel: "Annuller", save: "Gem" },
        table: {
            selectAll: "Vaelg alle produkter",
            product: "Produkt",
            status: "Status",
            inventory: "Lager",
            category: "Kategori",
            updated: "Opdateret",
            noProductsFound: "Table is empty.",
            selectProduct: "Vaelg {name}",
        },
        sort: {
            label: "Sorter",
            options: {
                "updated-desc": "Nyeste forst",
                "updated-asc": "Aeldste forst",
                "name-asc": "Produktnavn (A-Z)",
                "name-desc": "Produktnavn (Z-A)",
                "inventory-desc": "Lager hoj til lav",
                "inventory-asc": "Lager lav til hoj",
            },
        },
        filters: { searchProducts: "Sog aktive produkter" },
        statusLabels: { active: "Aktiv", draft: "Kladde", archived: "Arkiveret" },
        inventoryText: { outOfStock: "Udsolgt", oneInStock: "1 pa lager", manyInStock: "{count} pa lager" },
        detail: {
            title: "Produktdetaljer",
            sku: "SKU",
            category: "Kategori",
            status: "Status",
            tags: "Tags",
            variants: "Varianter",
            noTags: "Ingen tags",
            noVariants: "Ingen varianter",
            stockHistory: "Lagerkob",
            stockHistoryEmpty: "Ingen lagerkob registreret.",
            salesHistory: "Salg",
            salesHistoryEmpty: "Ingen salg registreret endnu.",
            batchQuantity: "Antal",
            batchCost: "Koeb/stk",
            batchSale: "Salg/stk",
            batchVendor: "Leverandor",
            batchNotes: "Noter",
            remaining: "Tilbage",
        },
        addStock: {
            title: "Tilfoj lager",
            purchaseDate: "Koebsdato",
            quantity: "Antal",
            purchaseUnitPrice: "Koebspris pr. stk",
            saleUnitPrice: "Salgspris pr. stk",
            vendor: "Leverandor",
            notes: "Noter",
            save: "Tilfoj lager",
        },
        sellStock: {
            title: "Saelg lager",
            batch: "Koebspost",
            soldAt: "Salgsdato",
            quantity: "Antal",
            saleUnitPrice: "Salgspris pr. stk",
            notes: "Noter",
            noStock: "Intet lager tilgaengeligt for dette produkt.",
            save: "Saelg lager",
        },
        maintenance: {
            title: "Tilfoj vedligehold",
            product: "Produkt",
            description: "Beskrivelse",
            price: "Pris",
            save: "Tilfoj vedligehold",
        },
        errors: {
            chooseProduct: "Vaelg et produkt forst.",
            noSellableStock: "Der er intet lager at saelge.",
            addStockInvalid: "Koebsdato, antal og priser er paakraevet.",
            sellStockInvalid: "Angiv gyldig salgsdato, antal og pris.",
            maintenanceInvalid: "Vaelg et produkt, skriv en beskrivelse, og angiv en gyldig pris.",
        },
    },
    de: {
        actions: { addMaintenance: "Wartung hinzufugen", addStock: "Bestand hinzufugen", sellStock: "Bestand verkaufen", cancel: "Abbrechen", save: "Speichern" },
        table: {
            selectAll: "Alle Produkte auswahlen",
            product: "Produkt",
            status: "Status",
            inventory: "Bestand",
            category: "Kategorie",
            updated: "Aktualisiert",
            noProductsFound: "Table is empty.",
            selectProduct: "{name} auswahlen",
        },
        sort: {
            label: "Sortieren",
            options: {
                "updated-desc": "Neueste zuerst",
                "updated-asc": "Alteste zuerst",
                "name-asc": "Produktname (A-Z)",
                "name-desc": "Produktname (Z-A)",
                "inventory-desc": "Bestand hoch nach niedrig",
                "inventory-asc": "Bestand niedrig nach hoch",
            },
        },
        filters: { searchProducts: "Aktive Produkte suchen" },
        statusLabels: { active: "Aktiv", draft: "Entwurf", archived: "Archiviert" },
        inventoryText: { outOfStock: "Nicht auf Lager", oneInStock: "1 auf Lager", manyInStock: "{count} auf Lager" },
        detail: {
            title: "Produktdetails",
            sku: "SKU",
            category: "Kategorie",
            status: "Status",
            tags: "Tags",
            variants: "Varianten",
            noTags: "Keine Tags",
            noVariants: "Keine Varianten",
            stockHistory: "Bestandskaufe",
            stockHistoryEmpty: "Kein Bestand hinzugefugt.",
            salesHistory: "Verkaufe",
            salesHistoryEmpty: "Noch keine Verkaufe erfasst.",
            batchQuantity: "Menge",
            batchCost: "Einkauf/Stk",
            batchSale: "Verkauf/Stk",
            batchVendor: "Anbieter",
            batchNotes: "Notizen",
            remaining: "Verbleibend",
        },
        addStock: {
            title: "Bestand hinzufugen",
            purchaseDate: "Kaufdatum",
            quantity: "Menge",
            purchaseUnitPrice: "Einkaufspreis pro Stk",
            saleUnitPrice: "Verkaufspreis pro Stk",
            vendor: "Anbieter",
            notes: "Notizen",
            save: "Bestand hinzufugen",
        },
        sellStock: {
            title: "Bestand verkaufen",
            batch: "Kaufposten",
            soldAt: "Verkaufsdatum",
            quantity: "Menge",
            saleUnitPrice: "Verkaufspreis pro Stk",
            notes: "Notizen",
            noStock: "Kein Bestand fur dieses Produkt verfugbar.",
            save: "Bestand verkaufen",
        },
        maintenance: {
            title: "Wartung hinzufugen",
            product: "Produkt",
            description: "Beschreibung",
            price: "Preis",
            save: "Wartung speichern",
        },
        errors: {
            chooseProduct: "Zuerst ein Produkt auswahlen.",
            noSellableStock: "Kein Bestand zum Verkaufen verfugbar.",
            addStockInvalid: "Kaufdatum, Menge und Preise sind erforderlich.",
            sellStockInvalid: "Geben Sie ein gultiges Verkaufsdatum, Menge und Preise ein.",
            maintenanceInvalid: "Wahlen Sie ein Produkt, geben Sie Beschreibung und Preis ein.",
        },
    },
    fr: {
        actions: { addMaintenance: "Ajouter maintenance", addStock: "Ajouter du stock", sellStock: "Vendre du stock", cancel: "Annuler", save: "Enregistrer" },
        table: {
            selectAll: "Selectionner tous les produits",
            product: "Produit",
            status: "Statut",
            inventory: "Stock",
            category: "Categorie",
            updated: "Mis a jour",
            noProductsFound: "Table is empty.",
            selectProduct: "Selectionner {name}",
        },
        sort: {
            label: "Trier",
            options: {
                "updated-desc": "Plus recents d'abord",
                "updated-asc": "Plus anciens d'abord",
                "name-asc": "Nom du produit (A-Z)",
                "name-desc": "Nom du produit (Z-A)",
                "inventory-desc": "Stock eleve vers faible",
                "inventory-asc": "Stock faible vers eleve",
            },
        },
        filters: { searchProducts: "Rechercher des produits actifs" },
        statusLabels: { active: "Actif", draft: "Brouillon", archived: "Archive" },
        inventoryText: { outOfStock: "Rupture de stock", oneInStock: "1 en stock", manyInStock: "{count} en stock" },
        detail: {
            title: "Details du produit",
            sku: "SKU",
            category: "Categorie",
            status: "Statut",
            tags: "Tags",
            variants: "Variantes",
            noTags: "Aucun tag",
            noVariants: "Aucune variante",
            stockHistory: "Achats de stock",
            stockHistoryEmpty: "Aucun stock ajoute.",
            salesHistory: "Ventes",
            salesHistoryEmpty: "Aucune vente enregistree.",
            batchQuantity: "Quantite",
            batchCost: "Achat/unite",
            batchSale: "Vente/unite",
            batchVendor: "Vendeur",
            batchNotes: "Notes",
            remaining: "Restant",
        },
        addStock: {
            title: "Ajouter du stock",
            purchaseDate: "Date d'achat",
            quantity: "Quantite",
            purchaseUnitPrice: "Prix d'achat par unite",
            saleUnitPrice: "Prix de vente par unite",
            vendor: "Vendeur",
            notes: "Notes",
            save: "Ajouter du stock",
        },
        sellStock: {
            title: "Vendre du stock",
            batch: "Achat",
            soldAt: "Date de vente",
            quantity: "Quantite",
            saleUnitPrice: "Prix de vente par unite",
            notes: "Notes",
            noStock: "Aucun stock disponible pour ce produit.",
            save: "Vendre du stock",
        },
        maintenance: {
            title: "Ajouter maintenance",
            product: "Produit",
            description: "Description",
            price: "Prix",
            save: "Ajouter maintenance",
        },
        errors: {
            chooseProduct: "Selectionnez d'abord un produit.",
            noSellableStock: "Aucun stock disponible a vendre.",
            addStockInvalid: "La date d'achat, la quantite et les prix sont requis.",
            sellStockInvalid: "Saisissez une date, quantite et prix de vente valides.",
            maintenanceInvalid: "Selectionnez un produit, une description et un prix valide.",
        },
    },
    es: {
        actions: { addMaintenance: "Agregar mantenimiento", addStock: "Agregar stock", sellStock: "Vender stock", cancel: "Cancelar", save: "Guardar" },
        table: {
            selectAll: "Seleccionar todos los productos",
            product: "Producto",
            status: "Estado",
            inventory: "Inventario",
            category: "Categoria",
            updated: "Actualizado",
            noProductsFound: "Table is empty.",
            selectProduct: "Seleccionar {name}",
        },
        sort: {
            label: "Ordenar",
            options: {
                "updated-desc": "Mas recientes primero",
                "updated-asc": "Mas antiguos primero",
                "name-asc": "Nombre del producto (A-Z)",
                "name-desc": "Nombre del producto (Z-A)",
                "inventory-desc": "Inventario de mayor a menor",
                "inventory-asc": "Inventario de menor a mayor",
            },
        },
        filters: { searchProducts: "Buscar productos activos" },
        statusLabels: { active: "Activo", draft: "Borrador", archived: "Archivado" },
        inventoryText: { outOfStock: "Sin stock", oneInStock: "1 en stock", manyInStock: "{count} en stock" },
        detail: {
            title: "Detalles del producto",
            sku: "SKU",
            category: "Categoria",
            status: "Estado",
            tags: "Etiquetas",
            variants: "Variantes",
            noTags: "Sin etiquetas",
            noVariants: "Sin variantes",
            stockHistory: "Compras de stock",
            stockHistoryEmpty: "No se agrego stock para este producto.",
            salesHistory: "Ventas",
            salesHistoryEmpty: "Aun no hay ventas registradas.",
            batchQuantity: "Cantidad",
            batchCost: "Compra/unidad",
            batchSale: "Venta/unidad",
            batchVendor: "Proveedor",
            batchNotes: "Notas",
            remaining: "Restante",
        },
        addStock: {
            title: "Agregar stock",
            purchaseDate: "Fecha de compra",
            quantity: "Cantidad",
            purchaseUnitPrice: "Precio de compra por unidad",
            saleUnitPrice: "Precio de venta por unidad",
            vendor: "Proveedor",
            notes: "Notas",
            save: "Agregar stock",
        },
        sellStock: {
            title: "Vender stock",
            batch: "Compra",
            soldAt: "Fecha de venta",
            quantity: "Cantidad",
            saleUnitPrice: "Precio de venta por unidad",
            notes: "Notas",
            noStock: "No hay stock disponible para este producto.",
            save: "Vender stock",
        },
        maintenance: {
            title: "Agregar mantenimiento",
            product: "Producto",
            description: "Descripcion",
            price: "Precio",
            save: "Agregar mantenimiento",
        },
        errors: {
            chooseProduct: "Selecciona primero un producto.",
            noSellableStock: "No hay stock disponible para vender.",
            addStockInvalid: "Fecha de compra, cantidad y precios son obligatorios.",
            sellStockInvalid: "Introduce fecha, cantidad y precios de venta validos.",
            maintenanceInvalid: "Selecciona producto, descripcion y un precio valido.",
        },
    },
    zh: {
        actions: { addMaintenance: "添加维护", addStock: "添加库存", sellStock: "销售库存", cancel: "取消", save: "保存" },
        table: {
            selectAll: "选择所有产品",
            product: "产品",
            status: "状态",
            inventory: "库存",
            category: "分类",
            updated: "更新时间",
            noProductsFound: "Table is empty.",
            selectProduct: "选择 {name}",
        },
        sort: {
            label: "排序",
            options: {
                "updated-desc": "最新优先",
                "updated-asc": "最旧优先",
                "name-asc": "产品名称 (A-Z)",
                "name-desc": "产品名称 (Z-A)",
                "inventory-desc": "库存从高到低",
                "inventory-asc": "库存从低到高",
            },
        },
        filters: { searchProducts: "搜索启用产品" },
        statusLabels: { active: "启用", draft: "草稿", archived: "已归档" },
        inventoryText: { outOfStock: "缺货", oneInStock: "库存 1 件", manyInStock: "库存 {count} 件" },
        detail: {
            title: "产品详情",
            sku: "SKU",
            category: "分类",
            status: "状态",
            tags: "标签",
            variants: "变体",
            noTags: "无标签",
            noVariants: "无变体",
            stockHistory: "库存采购",
            stockHistoryEmpty: "该产品暂无入库记录。",
            salesHistory: "销售",
            salesHistoryEmpty: "暂无销售记录。",
            batchQuantity: "数量",
            batchCost: "采购/件",
            batchSale: "销售/件",
            batchVendor: "供应商",
            batchNotes: "备注",
            remaining: "剩余",
        },
        addStock: {
            title: "添加库存",
            purchaseDate: "采购日期",
            quantity: "数量",
            purchaseUnitPrice: "采购单价",
            saleUnitPrice: "销售单价",
            vendor: "供应商",
            notes: "备注",
            save: "添加库存",
        },
        sellStock: {
            title: "销售库存",
            batch: "采购批次",
            soldAt: "销售日期",
            quantity: "数量",
            saleUnitPrice: "销售单价",
            notes: "备注",
            noStock: "该产品暂无可售库存。",
            save: "销售库存",
        },
        maintenance: {
            title: "添加维护",
            product: "产品",
            description: "说明",
            price: "价格",
            save: "添加维护",
        },
        errors: {
            chooseProduct: "请先选择产品。",
            noSellableStock: "暂无可售库存。",
            addStockInvalid: "采购日期、数量和价格为必填。",
            sellStockInvalid: "请填写有效的销售日期、数量和价格。",
            maintenanceInvalid: "请选择产品，填写说明和有效价格。",
        },
    },
};
