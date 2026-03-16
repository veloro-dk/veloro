import type { LanguageCode } from "@/i18n/portal";
import type { ProductStatus, SortKey } from "@/components/products/viewState";

export type ProductTranslations = {
    actions: {
        export: string;
        import: string;
        addProduct: string;
        cancel: string;
        saveAs: string;
        clear: string;
        removeFilter: string;
        addFilter: string;
    };
    menus: {
        excelCsv: string;
        plainCsv: string;
        csvFile: string;
        csvForExcel: string;
    };
    views: {
        all: string;
        active: string;
        draft: string;
        archived: string;
        custom: string;
        createView: string;
        productViews: string;
    };
    sort: {
        button: string;
        sortProducts: string;
        options: Record<SortKey, string>;
    };
    filters: {
        status: string;
        category: string;
        tag: string;
        anyStatus: string;
        allCategories: string;
        allTags: string;
        allValues: string;
        searchProducts: string;
        filterBy: string;
        searchAndFilterShortcut: string;
        sortShortcut: string;
    };
    table: {
        selectAllProducts: string;
        product: string;
        status: string;
        inventory: string;
        category: string;
        updated: string;
        noProductsFound: string;
        selectProduct: string;
    };
    bulk: {
        selected: string;
        bulkEdit: string;
        setAsActive: string;
        deleteProducts: string;
        unlistProducts: string;
        addFeaturedTag: string;
        removeFeaturedTag: string;
    };
    modal: {
        createNewView: string;
        closeCreateView: string;
        name: string;
        createView: string;
        viewNamePlaceholder: string;
    };
    viewMenu: {
        rename: string;
        duplicate: string;
        delete: string;
        renameTitle: string;
        renameLabel: string;
        renamePlaceholder: string;
        renameSave: string;
    };
    statusLabels: Record<ProductStatus, string>;
    inventoryText: {
        outOfStock: string;
        oneInStock: string;
        manyInStock: string;
    };
};

export const PRODUCT_TRANSLATIONS: Record<LanguageCode, ProductTranslations> = {
    en: {
        actions: {
            export: "Export",
            import: "Import",
            addProduct: "Add product",
            cancel: "Cancel",
            saveAs: "Save as",
            clear: "Clear",
            removeFilter: "Remove filter",
            addFilter: "Add filter",
        },
        menus: {
            excelCsv: "Excel CSV",
            plainCsv: "Plain CSV",
            csvFile: "CSV file",
            csvForExcel: "CSV for Excel",
        },
        views: {
            all: "All",
            active: "Active",
            draft: "Draft",
            archived: "Archived",
            custom: "Custom",
            createView: "Create new view",
            productViews: "Product views",
        },
        sort: {
            button: "Sort",
            sortProducts: "Sort products",
            options: {
                "updated-desc": "Newest first",
                "updated-asc": "Oldest first",
                "name-asc": "Product name (A-Z)",
                "name-desc": "Product name (Z-A)",
                "inventory-desc": "Inventory high to low",
                "inventory-asc": "Inventory low to high",
                status: "Status",
            },
        },
        filters: {
            status: "Status",
            category: "Category",
            tag: "Tag",
            anyStatus: "Any status",
            allCategories: "All categories",
            allTags: "All tags",
            allValues: "All values",
            searchProducts: "Search products",
            filterBy: "Filter {label}",
            searchAndFilterShortcut: "Search and filter (F)",
            sortShortcut: "Sort (S)",
        },
        table: {
            selectAllProducts: "Select all products",
            product: "Product",
            status: "Status",
            inventory: "Inventory",
            category: "Category",
            updated: "Updated",
            noProductsFound: "Table is empty.",
            selectProduct: "Select {name}",
        },
        bulk: {
            selected: "selected",
            bulkEdit: "Bulk edit",
            setAsActive: "Set as active",
            deleteProducts: "Delete products",
            unlistProducts: "Unlist products",
            addFeaturedTag: "Add featured tag",
            removeFeaturedTag: "Remove featured tag",
        },
        modal: {
            createNewView: "Create new view",
            closeCreateView: "Close create view pop-up",
            name: "Name",
            createView: "Create view",
            viewNamePlaceholder: "e.g. In stock city bikes",
        },
        viewMenu: {
            rename: "Rename",
            duplicate: "Duplicate",
            delete: "Delete",
            renameTitle: "Rename view",
            renameLabel: "View name",
            renamePlaceholder: "Enter a new view name",
            renameSave: "Save name",
        },
        statusLabels: {
            ACTIVE: "Active",
            DRAFT: "Draft",
            ARCHIVED: "Archived",
        },
        inventoryText: {
            outOfStock: "Out of stock",
            oneInStock: "1 in stock",
            manyInStock: "{count} in stock",
        },
    },
    da: {
        actions: {
            export: "Eksporter",
            import: "Importer",
            addProduct: "Tilfoj produkt",
            cancel: "Annuller",
            saveAs: "Gem som",
            clear: "Ryd",
            removeFilter: "Fjern filter",
            addFilter: "Tilfoj filter",
        },
        menus: {
            excelCsv: "Excel CSV",
            plainCsv: "Ren CSV",
            csvFile: "CSV-fil",
            csvForExcel: "CSV til Excel",
        },
        views: {
            all: "Alle",
            active: "Aktive",
            draft: "Kladder",
            archived: "Arkiverede",
            custom: "Brugerdefineret",
            createView: "Opret ny visning",
            productViews: "Produktvisninger",
        },
        sort: {
            button: "Sorter",
            sortProducts: "Sorter produkter",
            options: {
                "updated-desc": "Nyeste forst",
                "updated-asc": "Aeldste forst",
                "name-asc": "Produktnavn (A-Z)",
                "name-desc": "Produktnavn (Z-A)",
                "inventory-desc": "Lager hoj til lav",
                "inventory-asc": "Lager lav til hoj",
                status: "Status",
            },
        },
        filters: {
            status: "Status",
            category: "Kategori",
            tag: "Tag",
            anyStatus: "Alle statuser",
            allCategories: "Alle kategorier",
            allTags: "Alle tags",
            allValues: "Alle vaerdier",
            searchProducts: "Sog produkter",
            filterBy: "Filtrer {label}",
            searchAndFilterShortcut: "Sog og filtrer (F)",
            sortShortcut: "Sorter (S)",
        },
        table: {
            selectAllProducts: "Vaelg alle produkter",
            product: "Produkt",
            status: "Status",
            inventory: "Lager",
            category: "Kategori",
            updated: "Opdateret",
            noProductsFound: "Table is empty.",
            selectProduct: "Vaelg {name}",
        },
        bulk: {
            selected: "valgt",
            bulkEdit: "Masseredigering",
            setAsActive: "Saet som aktiv",
            deleteProducts: "Slet produkter",
            unlistProducts: "Fjern produkter fra liste",
            addFeaturedTag: "Tilfoj fremhaevet tag",
            removeFeaturedTag: "Fjern fremhaevet tag",
        },
        modal: {
            createNewView: "Opret ny visning",
            closeCreateView: "Luk pop-op for ny visning",
            name: "Navn",
            createView: "Opret visning",
            viewNamePlaceholder: "fx Cykler pa lager",
        },
        viewMenu: {
            rename: "Omdob",
            duplicate: "Dupliker",
            delete: "Slet",
            renameTitle: "Omdob visning",
            renameLabel: "Visningsnavn",
            renamePlaceholder: "Indtast et nyt visningsnavn",
            renameSave: "Gem navn",
        },
        statusLabels: {
            ACTIVE: "Aktiv",
            DRAFT: "Kladde",
            ARCHIVED: "Arkiveret",
        },
        inventoryText: {
            outOfStock: "Udsolgt",
            oneInStock: "1 pa lager",
            manyInStock: "{count} pa lager",
        },
    },
    de: {
        actions: {
            export: "Exportieren",
            import: "Importieren",
            addProduct: "Produkt hinzufugen",
            cancel: "Abbrechen",
            saveAs: "Speichern als",
            clear: "Zurucksetzen",
            removeFilter: "Filter entfernen",
            addFilter: "Filter hinzufugen",
        },
        menus: {
            excelCsv: "Excel CSV",
            plainCsv: "CSV (einfach)",
            csvFile: "CSV-Datei",
            csvForExcel: "CSV fur Excel",
        },
        views: {
            all: "Alle",
            active: "Aktiv",
            draft: "Entwurf",
            archived: "Archiviert",
            custom: "Benutzerdefiniert",
            createView: "Neue Ansicht erstellen",
            productViews: "Produktansichten",
        },
        sort: {
            button: "Sortieren",
            sortProducts: "Produkte sortieren",
            options: {
                "updated-desc": "Neueste zuerst",
                "updated-asc": "Alteste zuerst",
                "name-asc": "Produktname (A-Z)",
                "name-desc": "Produktname (Z-A)",
                "inventory-desc": "Bestand hoch nach niedrig",
                "inventory-asc": "Bestand niedrig nach hoch",
                status: "Status",
            },
        },
        filters: {
            status: "Status",
            category: "Kategorie",
            tag: "Tag",
            anyStatus: "Jeder Status",
            allCategories: "Alle Kategorien",
            allTags: "Alle Tags",
            allValues: "Alle Werte",
            searchProducts: "Produkte suchen",
            filterBy: "{label} filtern",
            searchAndFilterShortcut: "Suchen und filtern (F)",
            sortShortcut: "Sortieren (S)",
        },
        table: {
            selectAllProducts: "Alle Produkte auswahlen",
            product: "Produkt",
            status: "Status",
            inventory: "Bestand",
            category: "Kategorie",
            updated: "Aktualisiert",
            noProductsFound: "Table is empty.",
            selectProduct: "{name} auswahlen",
        },
        bulk: {
            selected: "ausgewahlt",
            bulkEdit: "Massenbearbeitung",
            setAsActive: "Als aktiv markieren",
            deleteProducts: "Produkte loschen",
            unlistProducts: "Produkte auslisten",
            addFeaturedTag: "Featured-Tag hinzufugen",
            removeFeaturedTag: "Featured-Tag entfernen",
        },
        modal: {
            createNewView: "Neue Ansicht erstellen",
            closeCreateView: "Pop-up fur neue Ansicht schlieBen",
            name: "Name",
            createView: "Ansicht erstellen",
            viewNamePlaceholder: "z. B. Citybikes auf Lager",
        },
        viewMenu: {
            rename: "Umbenennen",
            duplicate: "Duplizieren",
            delete: "Loschen",
            renameTitle: "Ansicht umbenennen",
            renameLabel: "Ansichtsname",
            renamePlaceholder: "Neuen Ansichtsnamen eingeben",
            renameSave: "Namen speichern",
        },
        statusLabels: {
            ACTIVE: "Aktiv",
            DRAFT: "Entwurf",
            ARCHIVED: "Archiviert",
        },
        inventoryText: {
            outOfStock: "Nicht auf Lager",
            oneInStock: "1 auf Lager",
            manyInStock: "{count} auf Lager",
        },
    },
    fr: {
        actions: {
            export: "Exporter",
            import: "Importer",
            addProduct: "Ajouter un produit",
            cancel: "Annuler",
            saveAs: "Enregistrer sous",
            clear: "Effacer",
            removeFilter: "Supprimer le filtre",
            addFilter: "Ajouter un filtre",
        },
        menus: {
            excelCsv: "CSV Excel",
            plainCsv: "CSV simple",
            csvFile: "Fichier CSV",
            csvForExcel: "CSV pour Excel",
        },
        views: {
            all: "Tous",
            active: "Actifs",
            draft: "Brouillons",
            archived: "Archives",
            custom: "Personnalise",
            createView: "Creer une vue",
            productViews: "Vues produit",
        },
        sort: {
            button: "Trier",
            sortProducts: "Trier les produits",
            options: {
                "updated-desc": "Plus recents d'abord",
                "updated-asc": "Plus anciens d'abord",
                "name-asc": "Nom du produit (A-Z)",
                "name-desc": "Nom du produit (Z-A)",
                "inventory-desc": "Stock eleve vers faible",
                "inventory-asc": "Stock faible vers eleve",
                status: "Statut",
            },
        },
        filters: {
            status: "Statut",
            category: "Categorie",
            tag: "Tag",
            anyStatus: "Tous les statuts",
            allCategories: "Toutes les categories",
            allTags: "Tous les tags",
            allValues: "Toutes les valeurs",
            searchProducts: "Rechercher des produits",
            filterBy: "Filtrer {label}",
            searchAndFilterShortcut: "Recherche et filtres (F)",
            sortShortcut: "Trier (S)",
        },
        table: {
            selectAllProducts: "Selectionner tous les produits",
            product: "Produit",
            status: "Statut",
            inventory: "Stock",
            category: "Categorie",
            updated: "Mis a jour",
            noProductsFound: "Table is empty.",
            selectProduct: "Selectionner {name}",
        },
        bulk: {
            selected: "selectionnes",
            bulkEdit: "Modification en masse",
            setAsActive: "Definir comme actif",
            deleteProducts: "Supprimer des produits",
            unlistProducts: "Retirer des produits",
            addFeaturedTag: "Ajouter le tag vedette",
            removeFeaturedTag: "Retirer le tag vedette",
        },
        modal: {
            createNewView: "Creer une vue",
            closeCreateView: "Fermer la fenetre de creation de vue",
            name: "Nom",
            createView: "Creer la vue",
            viewNamePlaceholder: "ex. Velos de ville en stock",
        },
        viewMenu: {
            rename: "Renommer",
            duplicate: "Dupliquer",
            delete: "Supprimer",
            renameTitle: "Renommer la vue",
            renameLabel: "Nom de la vue",
            renamePlaceholder: "Saisir un nouveau nom de vue",
            renameSave: "Enregistrer le nom",
        },
        statusLabels: {
            ACTIVE: "Actif",
            DRAFT: "Brouillon",
            ARCHIVED: "Archive",
        },
        inventoryText: {
            outOfStock: "Rupture de stock",
            oneInStock: "1 en stock",
            manyInStock: "{count} en stock",
        },
    },
    es: {
        actions: {
            export: "Exportar",
            import: "Importar",
            addProduct: "Agregar producto",
            cancel: "Cancelar",
            saveAs: "Guardar como",
            clear: "Limpiar",
            removeFilter: "Quitar filtro",
            addFilter: "Agregar filtro",
        },
        menus: {
            excelCsv: "CSV de Excel",
            plainCsv: "CSV simple",
            csvFile: "Archivo CSV",
            csvForExcel: "CSV para Excel",
        },
        views: {
            all: "Todos",
            active: "Activos",
            draft: "Borradores",
            archived: "Archivados",
            custom: "Personalizado",
            createView: "Crear vista nueva",
            productViews: "Vistas de productos",
        },
        sort: {
            button: "Ordenar",
            sortProducts: "Ordenar productos",
            options: {
                "updated-desc": "Mas recientes primero",
                "updated-asc": "Mas antiguos primero",
                "name-asc": "Nombre del producto (A-Z)",
                "name-desc": "Nombre del producto (Z-A)",
                "inventory-desc": "Inventario de mayor a menor",
                "inventory-asc": "Inventario de menor a mayor",
                status: "Estado",
            },
        },
        filters: {
            status: "Estado",
            category: "Categoria",
            tag: "Etiqueta",
            anyStatus: "Cualquier estado",
            allCategories: "Todas las categorias",
            allTags: "Todas las etiquetas",
            allValues: "Todos los valores",
            searchProducts: "Buscar productos",
            filterBy: "Filtrar {label}",
            searchAndFilterShortcut: "Buscar y filtrar (F)",
            sortShortcut: "Ordenar (S)",
        },
        table: {
            selectAllProducts: "Seleccionar todos los productos",
            product: "Producto",
            status: "Estado",
            inventory: "Inventario",
            category: "Categoria",
            updated: "Actualizado",
            noProductsFound: "Table is empty.",
            selectProduct: "Seleccionar {name}",
        },
        bulk: {
            selected: "seleccionados",
            bulkEdit: "Edicion masiva",
            setAsActive: "Marcar como activo",
            deleteProducts: "Eliminar productos",
            unlistProducts: "Deslistar productos",
            addFeaturedTag: "Agregar etiqueta destacada",
            removeFeaturedTag: "Quitar etiqueta destacada",
        },
        modal: {
            createNewView: "Crear vista nueva",
            closeCreateView: "Cerrar ventana de crear vista",
            name: "Nombre",
            createView: "Crear vista",
            viewNamePlaceholder: "p. ej. Bicicletas urbanas con stock",
        },
        viewMenu: {
            rename: "Renombrar",
            duplicate: "Duplicar",
            delete: "Eliminar",
            renameTitle: "Renombrar vista",
            renameLabel: "Nombre de la vista",
            renamePlaceholder: "Ingresa un nuevo nombre de vista",
            renameSave: "Guardar nombre",
        },
        statusLabels: {
            ACTIVE: "Activo",
            DRAFT: "Borrador",
            ARCHIVED: "Archivado",
        },
        inventoryText: {
            outOfStock: "Sin stock",
            oneInStock: "1 en stock",
            manyInStock: "{count} en stock",
        },
    },
    zh: {
        actions: {
            export: "导出",
            import: "导入",
            addProduct: "添加产品",
            cancel: "取消",
            saveAs: "另存为",
            clear: "清除",
            removeFilter: "移除筛选",
            addFilter: "添加筛选",
        },
        menus: {
            excelCsv: "Excel CSV",
            plainCsv: "普通 CSV",
            csvFile: "CSV 文件",
            csvForExcel: "Excel 用 CSV",
        },
        views: {
            all: "全部",
            active: "启用",
            draft: "草稿",
            archived: "已归档",
            custom: "自定义",
            createView: "创建新视图",
            productViews: "产品视图",
        },
        sort: {
            button: "排序",
            sortProducts: "排序产品",
            options: {
                "updated-desc": "最新优先",
                "updated-asc": "最旧优先",
                "name-asc": "产品名称 (A-Z)",
                "name-desc": "产品名称 (Z-A)",
                "inventory-desc": "库存从高到低",
                "inventory-asc": "库存从低到高",
                status: "状态",
            },
        },
        filters: {
            status: "状态",
            category: "分类",
            tag: "标签",
            anyStatus: "任意状态",
            allCategories: "全部分类",
            allTags: "全部标签",
            allValues: "全部值",
            searchProducts: "搜索产品",
            filterBy: "筛选 {label}",
            searchAndFilterShortcut: "搜索和筛选 (F)",
            sortShortcut: "排序 (S)",
        },
        table: {
            selectAllProducts: "选择所有产品",
            product: "产品",
            status: "状态",
            inventory: "库存",
            category: "分类",
            updated: "更新时间",
            noProductsFound: "Table is empty.",
            selectProduct: "选择 {name}",
        },
        bulk: {
            selected: "已选择",
            bulkEdit: "批量编辑",
            setAsActive: "设为启用",
            deleteProducts: "删除产品",
            unlistProducts: "下架产品",
            addFeaturedTag: "添加精选标签",
            removeFeaturedTag: "移除精选标签",
        },
        modal: {
            createNewView: "创建新视图",
            closeCreateView: "关闭创建视图弹窗",
            name: "名称",
            createView: "创建视图",
            viewNamePlaceholder: "例如：有库存的城市自行车",
        },
        viewMenu: {
            rename: "重命名",
            duplicate: "复制",
            delete: "删除",
            renameTitle: "重命名视图",
            renameLabel: "视图名称",
            renamePlaceholder: "输入新的视图名称",
            renameSave: "保存名称",
        },
        statusLabels: {
            ACTIVE: "启用",
            DRAFT: "草稿",
            ARCHIVED: "已归档",
        },
        inventoryText: {
            outOfStock: "缺货",
            oneInStock: "库存 1 件",
            manyInStock: "库存 {count} 件",
        },
    },
};
