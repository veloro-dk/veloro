import type { LanguageCode } from "@/i18n/portal";
import type { VariantInputType } from "@/lib/productCatalog";

export type CategoryFilters = {
    query: string;
    condition: string;
};

export type CategoryView = {
    id: string;
    label: string;
    builtIn: boolean;
    builtInId?: "all";
    filters: CategoryFilters;
};

export const DEFAULT_FILTERS: CategoryFilters = {
    query: "",
    condition: "ALL",
};

export const BUILT_IN_VIEWS: CategoryView[] = [
    { id: "all", builtInId: "all", label: "all", builtIn: true, filters: { ...DEFAULT_FILTERS } },
];
export const BUILT_IN_VIEW_IDS = new Set(BUILT_IN_VIEWS.map((view) => view.id));
export const CATEGORY_CUSTOM_VIEWS_STORAGE_KEY = "veloro_categories_custom_views_v1";
export const CATEGORY_VISIBLE_COLUMNS_STORAGE_KEY = "veloro_categories_visible_columns_v1";
export const CATEGORY_SORT_STORAGE_KEY = "veloro_categories_sort_v1";
export const COLUMN_DRAGGING_BODY_CLASS = "portalProductsGlobalDragActive__F4m2Q8";

export const SORT_KEYS = ["title-asc", "title-desc", "products-desc", "products-asc"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export type CategoryTableColumnId = "title" | "products" | "productConditions" | `variant:${string}`;

export type CategoryTableColumn = {
    id: CategoryTableColumnId;
    label: string;
    variantId?: string;
    locked?: boolean;
};

export type ColumnSection = "standard" | "variant";

export const CATEGORY_DEFAULT_VISIBLE_COLUMNS: CategoryTableColumnId[] = ["title", "products", "productConditions"];

export type CategoryColumnDropTarget = { columnId: CategoryTableColumnId; position: "before" | "after" };
export type CategoryColumnDragPreview = { label: string; x: number; y: number };

export type CategoryErrorKey =
    | "variableNameRequired"
    | "variableConflict"
    | "selectValuesRequired"
    | "categoryNameRequired"
    | "variantRuleRequired";

export type CategoriesTranslations = {
    actions: {
        addCategory: string;
        cancel: string;
        saveAs: string;
        createCategory: string;
        createView: string;
        addVariable: string;
        addFilter: string;
        bulkEdit: string;
        deleteCategories: string;
        up: string;
        down: string;
        remove: string;
    };
    views: {
        all: string;
        custom: string;
        createView: string;
        categoryViews: string;
    };
    sort: {
        button: string;
        sortCategories: string;
        options: Record<SortKey, string>;
    };
    filters: {
        condition: string;
        allConditions: string;
        searchCategories: string;
        searchAndFilterShortcut: string;
        sortShortcut: string;
    };
    table: {
        selectAllCategories: string;
        title: string;
        products: string;
        productConditions: string;
        noCategoriesFound: string;
        selectCategory: string;
    };
    bulk: {
        selected: string;
    };
    modal: {
        createCategory: string;
        closeCreateCategory: string;
        createNewView: string;
        closeCreateView: string;
        defaultCondition: string;
        name: string;
        productCondition: string;
        variableOrderAndRequirement: string;
        variableOrderHelp: string;
        noVariantsSelected: string;
        addVariable: string;
        allVariablesAdded: string;
        createVariableForCategory: string;
        inputType: string;
        selectValues: string;
        required: string;
        requiredInCategory: string;
        addVariableButton: string;
        viewNamePlaceholder: string;
        categoryNamePlaceholder: string;
        categoryConditionPlaceholder: string;
        variableNamePlaceholder: string;
        variableValuesPlaceholder: string;
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
    inputTypeLabels: Record<VariantInputType, string>;
    errors: Record<CategoryErrorKey, string>;
};

export const CATEGORIES_TRANSLATIONS: Record<LanguageCode, CategoriesTranslations> = {
    en: {
        actions: {
            addCategory: "Add category",
            cancel: "Cancel",
            saveAs: "Save as",
            createCategory: "Create category",
            createView: "Create view",
            addVariable: "Add variable",
            addFilter: "Add filter",
            bulkEdit: "Bulk edit",
            deleteCategories: "Delete categories",
            up: "Up",
            down: "Down",
            remove: "Remove",
        },
        views: {
            all: "All",
            custom: "Custom",
            createView: "Create new view",
            categoryViews: "Category views",
        },
        sort: {
            button: "Sort",
            sortCategories: "Sort categories",
            options: {
                "title-asc": "Title (A-Z)",
                "title-desc": "Title (Z-A)",
                "products-desc": "Products high to low",
                "products-asc": "Products low to high",
            },
        },
        filters: {
            condition: "Product conditions",
            allConditions: "All conditions",
            searchCategories: "Search categories",
            searchAndFilterShortcut: "Search and filter (F)",
            sortShortcut: "Sort (S)",
        },
        table: {
            selectAllCategories: "Select all categories",
            title: "Title",
            products: "Products",
            productConditions: "Product conditions",
            noCategoriesFound: "Table is empty.",
            selectCategory: "Select {name}",
        },
        bulk: {
            selected: "selected",
        },
        modal: {
            createCategory: "Create category",
            closeCreateCategory: "Close create category pop-up",
            createNewView: "Create new view",
            closeCreateView: "Close create view pop-up",
            defaultCondition: "Manual collection",
            name: "Name",
            productCondition: "Product condition",
            variableOrderAndRequirement: "Variable order and requirement",
            variableOrderHelp: "Top to bottom defines fill order in product creation.",
            noVariantsSelected: "No variants selected yet.",
            addVariable: "Add variable",
            allVariablesAdded: "All variables are already added.",
            createVariableForCategory: "Create variable for this category",
            inputType: "Input type",
            selectValues: "Select values",
            required: "Required",
            requiredInCategory: "Required in this category",
            addVariableButton: "Add variable",
            viewNamePlaceholder: "e.g. Categories with high volume",
            categoryNamePlaceholder: "e.g. Cargo bikes",
            categoryConditionPlaceholder: "e.g. Tag includes: cargo",
            variableNamePlaceholder: "e.g. Purchase date",
            variableValuesPlaceholder: "e.g. Veloro, Astra, Nordic",
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
        inputTypeLabels: {
            select: "Select",
            input: "Input",
            textarea: "Textarea",
            date: "Date",
        },
        errors: {
            variableNameRequired: "Variable name is required.",
            variableConflict: "A variable with this name already exists. Use Add variable instead.",
            selectValuesRequired: "Select variables need at least one value.",
            categoryNameRequired: "Category name is required.",
            variantRuleRequired: "Add at least one variant rule.",
        },
    },
    da: {
        actions: {
            addCategory: "Tilfoj kategori",
            cancel: "Annuller",
            saveAs: "Gem som",
            createCategory: "Opret kategori",
            createView: "Opret visning",
            addVariable: "Tilfoj variabel",
            addFilter: "Tilfoj filter",
            bulkEdit: "Masseredigering",
            deleteCategories: "Slet kategorier",
            up: "Op",
            down: "Ned",
            remove: "Fjern",
        },
        views: {
            all: "Alle",
            custom: "Brugerdefineret",
            createView: "Opret ny visning",
            categoryViews: "Kategorivisninger",
        },
        sort: {
            button: "Sorter",
            sortCategories: "Sorter kategorier",
            options: {
                "title-asc": "Titel (A-Z)",
                "title-desc": "Titel (Z-A)",
                "products-desc": "Produkter hoj til lav",
                "products-asc": "Produkter lav til hoj",
            },
        },
        filters: {
            condition: "Produktbetingelser",
            allConditions: "Alle betingelser",
            searchCategories: "Sog kategorier",
            searchAndFilterShortcut: "Sog og filtrer (F)",
            sortShortcut: "Sorter (S)",
        },
        table: {
            selectAllCategories: "Vaelg alle kategorier",
            title: "Titel",
            products: "Produkter",
            productConditions: "Produktbetingelser",
            noCategoriesFound: "Table is empty.",
            selectCategory: "Vaelg {name}",
        },
        bulk: {
            selected: "valgt",
        },
        modal: {
            createCategory: "Opret kategori",
            closeCreateCategory: "Luk pop-op for opret kategori",
            createNewView: "Opret ny visning",
            closeCreateView: "Luk pop-op for opret visning",
            defaultCondition: "Manuel samling",
            name: "Navn",
            productCondition: "Produktbetingelse",
            variableOrderAndRequirement: "Variabelraekkefolge og krav",
            variableOrderHelp: "Top til bund angiver udfyldningsraekkefolge ved oprettelse af produkt.",
            noVariantsSelected: "Ingen varianter valgt endnu.",
            addVariable: "Tilfoj variabel",
            allVariablesAdded: "Alle variabler er allerede tilfojet.",
            createVariableForCategory: "Opret variabel til denne kategori",
            inputType: "Inputtype",
            selectValues: "Valgvaerdier",
            required: "Paakraevet",
            requiredInCategory: "Paakraevet i denne kategori",
            addVariableButton: "Tilfoj variabel",
            viewNamePlaceholder: "fx Kategorier med hoj volumen",
            categoryNamePlaceholder: "fx Ladcykler",
            categoryConditionPlaceholder: "fx Tag indeholder: cargo",
            variableNamePlaceholder: "fx Koebsdato",
            variableValuesPlaceholder: "fx Veloro, Astra, Nordic",
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
        inputTypeLabels: {
            select: "Valg",
            input: "Input",
            textarea: "Tekstfelt",
            date: "Dato",
        },
        errors: {
            variableNameRequired: "Variabelnavn er paakraevet.",
            variableConflict: "En variabel med dette navn findes allerede. Brug Tilfoj variabel i stedet.",
            selectValuesRequired: "Valgvariabler skal have mindst en vaerdi.",
            categoryNameRequired: "Kategorinavn er paakraevet.",
            variantRuleRequired: "Tilfoj mindst en variabelregel.",
        },
    },
    de: {
        actions: {
            addCategory: "Kategorie hinzufugen",
            cancel: "Abbrechen",
            saveAs: "Speichern als",
            createCategory: "Kategorie erstellen",
            createView: "Ansicht erstellen",
            addVariable: "Variable hinzufugen",
            addFilter: "Filter hinzufugen",
            bulkEdit: "Massenbearbeitung",
            deleteCategories: "Kategorien loschen",
            up: "Nach oben",
            down: "Nach unten",
            remove: "Entfernen",
        },
        views: {
            all: "Alle",
            custom: "Benutzerdefiniert",
            createView: "Neue Ansicht erstellen",
            categoryViews: "Kategorieansichten",
        },
        sort: {
            button: "Sortieren",
            sortCategories: "Kategorien sortieren",
            options: {
                "title-asc": "Titel (A-Z)",
                "title-desc": "Titel (Z-A)",
                "products-desc": "Produkte hoch nach niedrig",
                "products-asc": "Produkte niedrig nach hoch",
            },
        },
        filters: {
            condition: "Produktbedingungen",
            allConditions: "Alle Bedingungen",
            searchCategories: "Kategorien suchen",
            searchAndFilterShortcut: "Suchen und filtern (F)",
            sortShortcut: "Sortieren (S)",
        },
        table: {
            selectAllCategories: "Alle Kategorien auswahlen",
            title: "Titel",
            products: "Produkte",
            productConditions: "Produktbedingungen",
            noCategoriesFound: "Table is empty.",
            selectCategory: "{name} auswahlen",
        },
        bulk: {
            selected: "ausgewahlt",
        },
        modal: {
            createCategory: "Kategorie erstellen",
            closeCreateCategory: "Fenster fur Kategorieerstellung schlieBen",
            createNewView: "Neue Ansicht erstellen",
            closeCreateView: "Fenster fur Ansichtserstellung schlieBen",
            defaultCondition: "Manuelle Sammlung",
            name: "Name",
            productCondition: "Produktbedingung",
            variableOrderAndRequirement: "Variablenreihenfolge und Pflicht",
            variableOrderHelp: "Von oben nach unten wird die Eingabereihenfolge bei der Produkterstellung festgelegt.",
            noVariantsSelected: "Noch keine Varianten ausgewahlt.",
            addVariable: "Variable hinzufugen",
            allVariablesAdded: "Alle Variablen sind bereits hinzugefugt.",
            createVariableForCategory: "Variable fur diese Kategorie erstellen",
            inputType: "Eingabetyp",
            selectValues: "Auswahlwerte",
            required: "Pflicht",
            requiredInCategory: "In dieser Kategorie erforderlich",
            addVariableButton: "Variable hinzufugen",
            viewNamePlaceholder: "z. B. Kategorien mit hohem Volumen",
            categoryNamePlaceholder: "z. B. Lastenrader",
            categoryConditionPlaceholder: "z. B. Tag enthalt: cargo",
            variableNamePlaceholder: "z. B. Kaufdatum",
            variableValuesPlaceholder: "z. B. Veloro, Astra, Nordic",
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
        inputTypeLabels: {
            select: "Auswahl",
            input: "Eingabe",
            textarea: "Textbereich",
            date: "Datum",
        },
        errors: {
            variableNameRequired: "Variablenname ist erforderlich.",
            variableConflict: "Eine Variable mit diesem Namen existiert bereits. Verwende stattdessen Variable hinzufugen.",
            selectValuesRequired: "Auswahlvariablen brauchen mindestens einen Wert.",
            categoryNameRequired: "Kategoriename ist erforderlich.",
            variantRuleRequired: "Mindestens eine Variablenregel hinzufugen.",
        },
    },
    fr: {
        actions: {
            addCategory: "Ajouter une categorie",
            cancel: "Annuler",
            saveAs: "Enregistrer sous",
            createCategory: "Creer une categorie",
            createView: "Creer la vue",
            addVariable: "Ajouter une variable",
            addFilter: "Ajouter un filtre",
            bulkEdit: "Modification en masse",
            deleteCategories: "Supprimer des categories",
            up: "Haut",
            down: "Bas",
            remove: "Retirer",
        },
        views: {
            all: "Tous",
            custom: "Personnalise",
            createView: "Creer une vue",
            categoryViews: "Vues categorie",
        },
        sort: {
            button: "Trier",
            sortCategories: "Trier les categories",
            options: {
                "title-asc": "Titre (A-Z)",
                "title-desc": "Titre (Z-A)",
                "products-desc": "Produits du plus eleve au plus faible",
                "products-asc": "Produits du plus faible au plus eleve",
            },
        },
        filters: {
            condition: "Conditions produit",
            allConditions: "Toutes les conditions",
            searchCategories: "Rechercher des categories",
            searchAndFilterShortcut: "Recherche et filtres (F)",
            sortShortcut: "Trier (S)",
        },
        table: {
            selectAllCategories: "Selectionner toutes les categories",
            title: "Titre",
            products: "Produits",
            productConditions: "Conditions produit",
            noCategoriesFound: "Table is empty.",
            selectCategory: "Selectionner {name}",
        },
        bulk: {
            selected: "selectionnes",
        },
        modal: {
            createCategory: "Creer une categorie",
            closeCreateCategory: "Fermer la fenetre de creation de categorie",
            createNewView: "Creer une vue",
            closeCreateView: "Fermer la fenetre de creation de vue",
            defaultCondition: "Collection manuelle",
            name: "Nom",
            productCondition: "Condition produit",
            variableOrderAndRequirement: "Ordre des variables et obligation",
            variableOrderHelp: "De haut en bas definit l'ordre de saisie lors de la creation d'un produit.",
            noVariantsSelected: "Aucune variante selectionnee.",
            addVariable: "Ajouter une variable",
            allVariablesAdded: "Toutes les variables sont deja ajoutees.",
            createVariableForCategory: "Creer une variable pour cette categorie",
            inputType: "Type d'entree",
            selectValues: "Valeurs de selection",
            required: "Obligatoire",
            requiredInCategory: "Obligatoire dans cette categorie",
            addVariableButton: "Ajouter une variable",
            viewNamePlaceholder: "ex. Categories a fort volume",
            categoryNamePlaceholder: "ex. Velos cargo",
            categoryConditionPlaceholder: "ex. Tag contient : cargo",
            variableNamePlaceholder: "ex. Date d'achat",
            variableValuesPlaceholder: "ex. Veloro, Astra, Nordic",
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
        inputTypeLabels: {
            select: "Selection",
            input: "Saisie",
            textarea: "Zone de texte",
            date: "Date",
        },
        errors: {
            variableNameRequired: "Le nom de la variable est obligatoire.",
            variableConflict: "Une variable avec ce nom existe deja. Utilisez Ajouter une variable a la place.",
            selectValuesRequired: "Les variables de type selection doivent avoir au moins une valeur.",
            categoryNameRequired: "Le nom de la categorie est obligatoire.",
            variantRuleRequired: "Ajoutez au moins une regle de variable.",
        },
    },
    es: {
        actions: {
            addCategory: "Agregar categoria",
            cancel: "Cancelar",
            saveAs: "Guardar como",
            createCategory: "Crear categoria",
            createView: "Crear vista",
            addVariable: "Agregar variable",
            addFilter: "Agregar filtro",
            bulkEdit: "Edicion masiva",
            deleteCategories: "Eliminar categorias",
            up: "Arriba",
            down: "Abajo",
            remove: "Quitar",
        },
        views: {
            all: "Todos",
            custom: "Personalizado",
            createView: "Crear vista nueva",
            categoryViews: "Vistas de categorias",
        },
        sort: {
            button: "Ordenar",
            sortCategories: "Ordenar categorias",
            options: {
                "title-asc": "Titulo (A-Z)",
                "title-desc": "Titulo (Z-A)",
                "products-desc": "Productos de mayor a menor",
                "products-asc": "Productos de menor a mayor",
            },
        },
        filters: {
            condition: "Condiciones del producto",
            allConditions: "Todas las condiciones",
            searchCategories: "Buscar categorias",
            searchAndFilterShortcut: "Buscar y filtrar (F)",
            sortShortcut: "Ordenar (S)",
        },
        table: {
            selectAllCategories: "Seleccionar todas las categorias",
            title: "Titulo",
            products: "Productos",
            productConditions: "Condiciones del producto",
            noCategoriesFound: "Table is empty.",
            selectCategory: "Seleccionar {name}",
        },
        bulk: {
            selected: "seleccionados",
        },
        modal: {
            createCategory: "Crear categoria",
            closeCreateCategory: "Cerrar ventana de crear categoria",
            createNewView: "Crear vista nueva",
            closeCreateView: "Cerrar ventana de crear vista",
            defaultCondition: "Coleccion manual",
            name: "Nombre",
            productCondition: "Condicion del producto",
            variableOrderAndRequirement: "Orden y obligatoriedad de variables",
            variableOrderHelp: "De arriba hacia abajo define el orden de llenado en la creacion del producto.",
            noVariantsSelected: "Aun no hay variantes seleccionadas.",
            addVariable: "Agregar variable",
            allVariablesAdded: "Todas las variables ya estan agregadas.",
            createVariableForCategory: "Crear variable para esta categoria",
            inputType: "Tipo de entrada",
            selectValues: "Valores de seleccion",
            required: "Obligatorio",
            requiredInCategory: "Obligatorio en esta categoria",
            addVariableButton: "Agregar variable",
            viewNamePlaceholder: "p. ej. Categorias con alto volumen",
            categoryNamePlaceholder: "p. ej. Bicicletas de carga",
            categoryConditionPlaceholder: "p. ej. La etiqueta incluye: cargo",
            variableNamePlaceholder: "p. ej. Fecha de compra",
            variableValuesPlaceholder: "p. ej. Veloro, Astra, Nordic",
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
        inputTypeLabels: {
            select: "Seleccion",
            input: "Entrada",
            textarea: "Area de texto",
            date: "Fecha",
        },
        errors: {
            variableNameRequired: "El nombre de la variable es obligatorio.",
            variableConflict: "Ya existe una variable con este nombre. Usa Agregar variable en su lugar.",
            selectValuesRequired: "Las variables de seleccion necesitan al menos un valor.",
            categoryNameRequired: "El nombre de la categoria es obligatorio.",
            variantRuleRequired: "Agrega al menos una regla de variable.",
        },
    },
    zh: {
        actions: {
            addCategory: "添加分类",
            cancel: "取消",
            saveAs: "另存为",
            createCategory: "创建分类",
            createView: "创建视图",
            addVariable: "添加变量",
            addFilter: "添加筛选",
            bulkEdit: "批量编辑",
            deleteCategories: "删除分类",
            up: "上移",
            down: "下移",
            remove: "移除",
        },
        views: {
            all: "全部",
            custom: "自定义",
            createView: "创建新视图",
            categoryViews: "分类视图",
        },
        sort: {
            button: "排序",
            sortCategories: "分类排序",
            options: {
                "title-asc": "标题 (A-Z)",
                "title-desc": "标题 (Z-A)",
                "products-desc": "产品数量从高到低",
                "products-asc": "产品数量从低到高",
            },
        },
        filters: {
            condition: "产品条件",
            allConditions: "全部条件",
            searchCategories: "搜索分类",
            searchAndFilterShortcut: "搜索和筛选 (F)",
            sortShortcut: "排序 (S)",
        },
        table: {
            selectAllCategories: "选择所有分类",
            title: "标题",
            products: "产品数",
            productConditions: "产品条件",
            noCategoriesFound: "Table is empty.",
            selectCategory: "选择 {name}",
        },
        bulk: {
            selected: "已选择",
        },
        modal: {
            createCategory: "创建分类",
            closeCreateCategory: "关闭创建分类弹窗",
            createNewView: "创建新视图",
            closeCreateView: "关闭创建视图弹窗",
            defaultCondition: "手动集合",
            name: "名称",
            productCondition: "产品条件",
            variableOrderAndRequirement: "变量顺序和必填项",
            variableOrderHelp: "从上到下定义创建产品时的填写顺序。",
            noVariantsSelected: "尚未选择任何变体。",
            addVariable: "添加变量",
            allVariablesAdded: "所有变量都已添加。",
            createVariableForCategory: "为此分类创建变量",
            inputType: "输入类型",
            selectValues: "下拉选项值",
            required: "必填",
            requiredInCategory: "此分类中必填",
            addVariableButton: "添加变量",
            viewNamePlaceholder: "例如：高销量分类",
            categoryNamePlaceholder: "例如：货运自行车",
            categoryConditionPlaceholder: "例如：标签包含：cargo",
            variableNamePlaceholder: "例如：采购日期",
            variableValuesPlaceholder: "例如：Veloro, Astra, Nordic",
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
        inputTypeLabels: {
            select: "下拉选择",
            input: "输入框",
            textarea: "文本域",
            date: "日期",
        },
        errors: {
            variableNameRequired: "变量名称为必填项。",
            variableConflict: "已存在同名变量。请使用“添加变量”。",
            selectValuesRequired: "选择类型变量至少需要一个值。",
            categoryNameRequired: "分类名称为必填项。",
            variantRuleRequired: "请至少添加一条变量规则。",
        },
    },
};
