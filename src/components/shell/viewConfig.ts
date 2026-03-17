import type { LanguageCode, PortalNavKey, PortalPageKey } from "@/i18n/portal";

export type NavItem = {
    key: PortalNavKey;
    href: string;
    children?: Array<{ key: PortalNavKey; href: string }>;
};

export type ThemePreference = "system" | "light" | "dark";
export type SystemStatus = "operational" | "error";
export type SearchPageId = PortalNavKey | "system-status";
export type SearchItemType = "page" | "setting";
export type SearchSettingAction = "open-settings" | "theme-system" | "theme-light" | "theme-dark";
export type HeaderPopoverId = "notifications" | "feedback" | "profile" | null;
export type FeedbackKindValue = "ISSUE" | "IDEA";
export type FeedbackStep = "select" | "compose" | "success";

export type RouteLoadRequestState = {
    loaded: number;
    total: number | null;
    done: boolean;
};

export type SearchPageDefinition = {
    id: SearchPageId;
    href: string;
    icon: PortalPageKey;
    pageKey?: PortalPageKey;
    titleFallback?: string;
    description: string;
    keywords: string[];
};

export type SearchItem = {
    id: string;
    type: SearchItemType;
    title: string;
    description: string;
    icon: PortalPageKey;
    searchText: string;
    content: string;
    href?: string;
    action?: SearchSettingAction;
};

export type SidebarScenesPhase = "nav" | "nav-exit" | "widgets" | "widgets-exit";

export type SearchIndexCachePayload = {
    version: number;
    language: LanguageCode;
    createdAt: number;
    contentById: Record<string, string>;
};

export type SearchLocaleCopy = {
    inputPlaceholder: string;
    sections: {
        recent: string;
        suggested: string;
        results: string;
        actions: string;
    };
    noResults: string;
    emptyHistory: string;
    pageDescriptions: Record<SearchPageId, string>;
    settingOpenDescription: string;
    settingOpenContent: string;
    settingOpenKeywords: string;
    themeSystemCurrent: string;
    themeSystemDefault: string;
    themeLightCurrent: string;
    themeLightDefault: string;
    themeDarkCurrent: string;
    themeDarkDefault: string;
    themeSystemKeywords: string;
    themeLightKeywords: string;
    themeDarkKeywords: string;
};

export type AssistantConversation = {
    id: string;
    title: string;
    updatedAt: number;
};

export const THEME_STORAGE_KEY = "veloro_theme";
export const LAST_NON_SETTINGS_PATH_STORAGE_KEY = "veloro_last_non_settings_path";
export const SEARCH_RECENT_STORAGE_KEY = "veloro_recent_searches";
export const SEARCH_INDEX_CACHE_KEY_PREFIX = "veloro_search_index";
export const SEARCH_INDEX_CACHE_VERSION = 2;
export const SEARCH_INDEX_CACHE_TTL_MS = 1000 * 60 * 60 * 6;
export const ASSISTANT_PANEL_STATE_STORAGE_KEY = "veloro_assistant_panel_state";
export const ASSISTANT_MEMORY_STORAGE_KEY = "veloro_assistant_memory_enabled";
export const ASSISTANT_CONVERSATIONS_STORAGE_KEY = "veloro_assistant_conversations";
export const ASSISTANT_ACTIVE_CONVERSATION_STORAGE_KEY = "veloro_assistant_active_conversation";
export const ASSISTANT_CHAT_ENABLED = false;
export const ROUTE_LOAD_SHOW_DELAY_MS = 850;
export const MAX_RECENT_SEARCHES = 3;
export const SEARCH_CONTENT_SELECTOR = "h1,h2,h3,h4,h5,h6,p,span,li,label,button";
export const SEARCH_CONTENT_ROOT_SELECTORS = [".portalContent__D2s5F7", ".portalStatusStandalone__P3k7M2"] as const;
export const SEARCH_CONTENT_IGNORE_SELECTOR = "input,textarea,select,option";
export const SEARCH_FEATURED_IDS = new Set<SearchPageId>(["home", "products", "inventory", "analytics"]);
export const ROLE_LABELS: Record<"ADMIN" | "MANAGER" | "EMPLOYEE", string> = {
    ADMIN: "Admin",
    MANAGER: "Manager",
    EMPLOYEE: "Employee",
};

export const SEARCH_PAGE_DEFINITIONS: SearchPageDefinition[] = [
    {
        id: "home",
        href: "/",
        icon: "home",
        pageKey: "home",
        description: "Main portal overview and operational summary.",
        keywords: ["dashboard", "overview", "portal", "summary"],
    },
    {
        id: "products",
        href: "/products",
        icon: "products",
        pageKey: "products",
        description: "Product catalog overview and assortment management.",
        keywords: ["catalog", "assortment", "items"],
    },
    {
        id: "categories",
        href: "/products/categories",
        icon: "categories",
        pageKey: "categories",
        description: "Product taxonomy and category structure.",
        keywords: ["taxonomy", "grouping", "organization"],
    },
    {
        id: "inventory",
        href: "/products/inventory",
        icon: "inventory",
        pageKey: "inventory",
        description: "Stock levels, inventory flow, and availability.",
        keywords: ["stock", "warehouse", "availability"],
    },
    {
        id: "purchaseOrders",
        href: "/products/purchase-orders",
        icon: "purchaseOrders",
        pageKey: "purchaseOrders",
        description: "Purchase orders, suppliers, and inbound stock planning.",
        keywords: ["purchase orders", "suppliers", "inbound", "procurement", "po"],
    },
    {
        id: "variants",
        href: "/products/variants",
        icon: "variants",
        pageKey: "variants",
        description: "Variant definitions and option management.",
        keywords: ["variants", "options", "attributes", "product rules"],
    },
    {
        id: "finance",
        href: "/finance",
        icon: "finance",
        pageKey: "finance",
        description: "Financial performance and transaction overview.",
        keywords: ["billing", "revenue", "payments"],
    },
    {
        id: "analytics",
        href: "/analytics",
        icon: "analytics",
        pageKey: "analytics",
        description: "Performance metrics and trend analysis.",
        keywords: ["metrics", "insights", "performance"],
    },
    {
        id: "reports",
        href: "/analytics/reports",
        icon: "reports",
        pageKey: "reports",
        description: "Scheduled and on-demand analytics reports.",
        keywords: ["reporting", "exports", "summaries"],
    },
    {
        id: "liveView",
        href: "/analytics/live-view",
        icon: "liveView",
        pageKey: "liveView",
        description: "Real-time activity and live analytics stream.",
        keywords: ["live", "realtime", "stream"],
    },
    {
        id: "settings",
        href: "/settings",
        icon: "settings",
        pageKey: "settings",
        description: "Workspace configuration, users, and preferences.",
        keywords: ["preferences", "configuration", "team", "notifications", "language", "currency"],
    },
    {
        id: "system-status",
        href: "/system-status",
        icon: "settings",
        titleFallback: "System status",
        description: "Platform health checks, uptime, and operational details.",
        keywords: ["health", "uptime", "operational", "status", "errors"],
    },
];

export const SEARCH_COPY: Record<LanguageCode, SearchLocaleCopy> = {
    en: {
        inputPlaceholder: "Type command or search",
        sections: {
            recent: "Recent searches",
            suggested: "Suggested",
            results: "Results",
            actions: "Actions",
        },
        noResults: 'No results for "{query}"',
        emptyHistory: "Start searching to build quick-access history.",
        pageDescriptions: {
            home: "Main portal overview and operational summary.",
            products: "Product catalog overview and assortment management.",
            categories: "Product taxonomy and category structure.",
            inventory: "Stock levels, inventory flow, and availability.",
            purchaseOrders: "Purchase orders, suppliers, and inbound stock planning.",
            variants: "Variant definitions and option management.",
            content: "Content management overview and publishing workflow.",
            files: "Uploaded files and media asset management.",
            metaobjects: "Reusable metadata structures and schema objects.",
            blogPosts: "Blog writing, editing, and publishing.",
            finance: "Financial performance and transaction overview.",
            analytics: "Performance metrics and trend analysis.",
            reports: "Scheduled and on-demand analytics reports.",
            liveView: "Real-time activity and live analytics stream.",
            settings: "Workspace configuration, users, and preferences.",
            "system-status": "Platform health checks, uptime, and operational details.",
        },
        settingOpenDescription: "Open workspace settings and preference controls.",
        settingOpenContent: "Open settings page to manage language, currency, team, and notifications.",
        settingOpenKeywords: "settings preferences account workspace user team notifications language currency",
        themeSystemCurrent: "Current theme is {theme}. Follow your device preference.",
        themeSystemDefault: "Follow your operating system color scheme preference.",
        themeLightCurrent: "Current theme is light mode.",
        themeLightDefault: "Switch to light mode.",
        themeDarkCurrent: "Current theme is dark mode.",
        themeDarkDefault: "Switch to dark mode.",
        themeSystemKeywords: "theme system appearance color mode auto",
        themeLightKeywords: "theme light appearance color mode bright",
        themeDarkKeywords: "theme dark appearance color mode night",
    },
    da: {
        inputPlaceholder: "Skriv kommando eller sog",
        sections: {
            recent: "Seneste sogninger",
            suggested: "Forslag",
            results: "Resultater",
            actions: "Handlinger",
        },
        noResults: 'Ingen resultater for "{query}"',
        emptyHistory: "Begynd at soge for at opbygge hurtig adgang.",
        pageDescriptions: {
            home: "Portalens hovedoversigt og driftsstatus.",
            products: "Overblik over produktkatalog og sortimentsstyring.",
            categories: "Produkttaksonomi og kategoristruktur.",
            inventory: "Lagerbeholdning, flow og tilgaengelighed.",
            purchaseOrders: "Indkobsordrer, leverandorer og indgaende lagerplanlaegning.",
            variants: "Variantdefinitioner og administrationsmuligheder.",
            content: "Overblik over indholdsstyring og publiceringsflow.",
            files: "Uploadede filer og administration af medieaktiver.",
            metaobjects: "Genanvendelige metadata-strukturer og skemaobjekter.",
            blogPosts: "Skrivning, redigering og publicering af blogindlaeg.",
            finance: "Overblik over finansiel performance og transaktioner.",
            analytics: "Performance-malinger og trendanalyse.",
            reports: "Planlagte og on-demand analyserapporter.",
            liveView: "Live aktivitet og realtidsanalyse.",
            settings: "Arbejdsomradets konfiguration, brugere og praeferencer.",
            "system-status": "Platformens helbredstjek, oppetid og driftsdetaljer.",
        },
        settingOpenDescription: "Abn arbejdsomradets indstillinger og praeferencer.",
        settingOpenContent: "Abn indstillinger for at administrere sprog, valuta, team og notifikationer.",
        settingOpenKeywords: "indstillinger praeferencer konto arbejdsomrade bruger team notifikationer sprog valuta",
        themeSystemCurrent: "Aktuelt tema er {theme}. Folg enhedens praeference.",
        themeSystemDefault: "Folger operativsystemets farvetilstand.",
        themeLightCurrent: "Aktuelt tema er lyst.",
        themeLightDefault: "Skift til lyst tema.",
        themeDarkCurrent: "Aktuelt tema er morkt.",
        themeDarkDefault: "Skift til morkt tema.",
        themeSystemKeywords: "tema system udseende farvetilstand automatisk",
        themeLightKeywords: "tema lys udseende farvetilstand",
        themeDarkKeywords: "tema mork udseende farvetilstand nat",
    },
    de: {
        inputPlaceholder: "Befehl eingeben oder suchen",
        sections: {
            recent: "Letzte Suchen",
            suggested: "Vorschlage",
            results: "Ergebnisse",
            actions: "Aktionen",
        },
        noResults: 'Keine Ergebnisse fur "{query}"',
        emptyHistory: "Beginnen Sie mit der Suche, um einen Schnellzugriff aufzubauen.",
        pageDescriptions: {
            home: "Hauptubersicht des Portals und Betriebsstatus.",
            products: "Uberblick uber Produktkatalog und Sortimentsverwaltung.",
            categories: "Produkt-Taxonomie und Kategoriestruktur.",
            inventory: "Lagerbestande, Warenfluss und Verfugbarkeit.",
            purchaseOrders: "Bestellungen, Lieferanten und Planung eingehender Waren.",
            variants: "Varianten-Definitionen und Optionsverwaltung.",
            content: "Uberblick uber Content-Management und Publishing-Workflow.",
            files: "Hochgeladene Dateien und Verwaltung von Medienressourcen.",
            metaobjects: "Wiederverwendbare Metadatenstrukturen und Schemaobjekte.",
            blogPosts: "Blogbeitrage schreiben, bearbeiten und veroffentlichen.",
            finance: "Uberblick uber Finanzleistung und Transaktionen.",
            analytics: "Leistungskennzahlen und Trendanalyse.",
            reports: "Geplante und On-Demand-Analyseberichte.",
            liveView: "Echtzeitaktivitaten und Live-Analysestream.",
            settings: "Workspace-Konfiguration, Benutzer und Einstellungen.",
            "system-status": "Plattform-Health-Checks, Uptime und Betriebsdetails.",
        },
        settingOpenDescription: "Offnen Sie Workspace-Einstellungen und Praferenzen.",
        settingOpenContent: "Offnen Sie die Einstellungen fur Sprache, Wahrung, Team und Benachrichtigungen.",
        settingOpenKeywords: "einstellungen praeferenzen konto workspace benutzer team benachrichtigungen sprache waehrung",
        themeSystemCurrent: "Aktuelles Design ist {theme}. Folgen Sie der Geraeinstellung.",
        themeSystemDefault: "Folgen Sie der Farbschema-Einstellung Ihres Betriebssystems.",
        themeLightCurrent: "Aktuelles Design ist hell.",
        themeLightDefault: "Zum hellen Design wechseln.",
        themeDarkCurrent: "Aktuelles Design ist dunkel.",
        themeDarkDefault: "Zum dunklen Design wechseln.",
        themeSystemKeywords: "design system darstellung farbmodus automatisch",
        themeLightKeywords: "design hell darstellung farbmodus",
        themeDarkKeywords: "design dunkel darstellung farbmodus nacht",
    },
    fr: {
        inputPlaceholder: "Tapez une commande ou recherchez",
        sections: {
            recent: "Recherches recentes",
            suggested: "Suggestions",
            results: "Resultats",
            actions: "Actions",
        },
        noResults: 'Aucun resultat pour "{query}"',
        emptyHistory: "Commencez a rechercher pour creer un acces rapide.",
        pageDescriptions: {
            home: "Vue d'ensemble principale du portail et resume operationnel.",
            products: "Vue d'ensemble du catalogue produits et gestion de l'assortiment.",
            categories: "Taxonomie produit et structure des categories.",
            inventory: "Niveaux de stock, flux d'inventaire et disponibilite.",
            purchaseOrders: "Bons de commande, fournisseurs et planification des entrees de stock.",
            variants: "Definitions de variantes et gestion des options.",
            content: "Vue d'ensemble de la gestion de contenu et du workflow de publication.",
            files: "Fichiers televerses et gestion des ressources media.",
            metaobjects: "Structures de metadonnees reutilisables et objets de schema.",
            blogPosts: "Redaction, edition et publication des articles de blog.",
            finance: "Vue d'ensemble des performances financieres et des transactions.",
            analytics: "Indicateurs de performance et analyse des tendances.",
            reports: "Rapports analytiques planifies et a la demande.",
            liveView: "Activite en temps reel et flux analytique en direct.",
            settings: "Configuration de l'espace de travail, utilisateurs et preferences.",
            "system-status": "Controle de sante de la plateforme, disponibilite et details operationnels.",
        },
        settingOpenDescription: "Ouvrir les parametres de l'espace de travail et les preferences.",
        settingOpenContent: "Ouvrir les parametres pour gerer langue, devise, equipe et notifications.",
        settingOpenKeywords: "parametres preferences compte espace travail utilisateur equipe notifications langue devise",
        themeSystemCurrent: "Le theme actuel est {theme}. Suivez la preference de votre appareil.",
        themeSystemDefault: "Suivre la preference de schema de couleurs de votre systeme.",
        themeLightCurrent: "Le theme actuel est clair.",
        themeLightDefault: "Passer au theme clair.",
        themeDarkCurrent: "Le theme actuel est sombre.",
        themeDarkDefault: "Passer au theme sombre.",
        themeSystemKeywords: "theme systeme apparence mode couleur auto",
        themeLightKeywords: "theme clair apparence mode couleur",
        themeDarkKeywords: "theme sombre apparence mode couleur nuit",
    },
    es: {
        inputPlaceholder: "Escribe un comando o busca",
        sections: {
            recent: "Busquedas recientes",
            suggested: "Sugerencias",
            results: "Resultados",
            actions: "Acciones",
        },
        noResults: 'Sin resultados para "{query}"',
        emptyHistory: "Empieza a buscar para crear un historial de acceso rapido.",
        pageDescriptions: {
            home: "Resumen principal del portal y estado operativo.",
            products: "Resumen del catalogo de productos y gestion del surtido.",
            categories: "Taxonomia de productos y estructura de categorias.",
            inventory: "Niveles de stock, flujo de inventario y disponibilidad.",
            purchaseOrders: "Ordenes de compra, proveedores y planificacion de entrada de stock.",
            variants: "Definiciones de variantes y gestion de opciones.",
            content: "Resumen de gestion de contenido y flujo de publicacion.",
            files: "Archivos cargados y gestion de recursos multimedia.",
            metaobjects: "Estructuras de metadatos reutilizables y objetos de esquema.",
            blogPosts: "Redaccion, edicion y publicacion de entradas del blog.",
            finance: "Resumen de rendimiento financiero y transacciones.",
            analytics: "Metricas de rendimiento y analisis de tendencias.",
            reports: "Informes de analitica programados y bajo demanda.",
            liveView: "Actividad en tiempo real y flujo de analitica en vivo.",
            settings: "Configuracion del espacio de trabajo, usuarios y preferencias.",
            "system-status": "Comprobaciones de salud de la plataforma, tiempo activo y detalles operativos.",
        },
        settingOpenDescription: "Abrir configuracion del espacio de trabajo y preferencias.",
        settingOpenContent: "Abrir configuracion para gestionar idioma, moneda, equipo y notificaciones.",
        settingOpenKeywords: "configuracion preferencias cuenta espacio trabajo usuario equipo notificaciones idioma moneda",
        themeSystemCurrent: "El tema actual es {theme}. Sigue la preferencia de tu dispositivo.",
        themeSystemDefault: "Seguir la preferencia del esquema de color del sistema operativo.",
        themeLightCurrent: "El tema actual es claro.",
        themeLightDefault: "Cambiar a tema claro.",
        themeDarkCurrent: "El tema actual es oscuro.",
        themeDarkDefault: "Cambiar a tema oscuro.",
        themeSystemKeywords: "tema sistema apariencia modo color auto",
        themeLightKeywords: "tema claro apariencia modo color",
        themeDarkKeywords: "tema oscuro apariencia modo color noche",
    },
    zh: {
        inputPlaceholder: "输入命令或搜索",
        sections: {
            recent: "最近搜索",
            suggested: "建议",
            results: "结果",
            actions: "操作",
        },
        noResults: '没有与"{query}"相关的结果',
        emptyHistory: "开始搜索以建立快速访问历史记录。",
        pageDescriptions: {
            home: "门户主页概览与运行状态摘要。",
            products: "产品目录概览与商品组合管理。",
            categories: "产品分类体系与分类结构。",
            inventory: "库存水平、库存流转与可用性。",
            purchaseOrders: "采购订单、供应商与入库规划。",
            variants: "变体定义与选项管理。",
            content: "内容管理概览与发布流程。",
            files: "已上传文件与媒体资源管理。",
            metaobjects: "可复用元数据结构与模式对象。",
            blogPosts: "博客撰写、编辑与发布。",
            finance: "财务表现与交易概览。",
            analytics: "性能指标与趋势分析。",
            reports: "计划报表与按需分析报告。",
            liveView: "实时活动与实时分析流。",
            settings: "工作区配置、用户与偏好设置。",
            "system-status": "平台健康检查、运行时间与运维详情。",
        },
        settingOpenDescription: "打开工作区设置与偏好控制。",
        settingOpenContent: "打开设置页面以管理语言、货币、团队和通知。",
        settingOpenKeywords: "设置 偏好 账户 工作区 用户 团队 通知 语言 货币",
        themeSystemCurrent: "当前主题为{theme}。跟随设备偏好。",
        themeSystemDefault: "跟随操作系统的配色偏好。",
        themeLightCurrent: "当前主题为浅色模式。",
        themeLightDefault: "切换到浅色模式。",
        themeDarkCurrent: "当前主题为深色模式。",
        themeDarkDefault: "切换到深色模式。",
        themeSystemKeywords: "主题 系统 外观 颜色 模式 自动",
        themeLightKeywords: "主题 浅色 外观 颜色 模式",
        themeDarkKeywords: "主题 深色 外观 颜色 模式 夜间",
    },
};

export const UNSAVED_ACTION_COPY: Record<LanguageCode, { label: string; save: string; cancel: string; discard: string }> = {
    en: { label: "Unsaved changes", save: "Save", cancel: "Cancel", discard: "Discard" },
    da: { label: "Ikke-gemte aendringer", save: "Gem", cancel: "Annuller", discard: "Kasser" },
    de: { label: "Ungespeicherte Anderungen", save: "Speichern", cancel: "Abbrechen", discard: "Verwerfen" },
    fr: { label: "Modifications non enregistrees", save: "Enregistrer", cancel: "Annuler", discard: "Ignorer" },
    es: { label: "Cambios sin guardar", save: "Guardar", cancel: "Cancelar", discard: "Descartar" },
    zh: { label: "未保存更改", save: "保存", cancel: "取消", discard: "放弃" },
};

export const PRODUCT_CREATE_PENDING_COPY: Record<LanguageCode, { label: string; save: string; cancel: string }> = {
    en: { label: "New product", save: "Create product", cancel: "Cancel" },
    da: { label: "Nyt produkt", save: "Opret produkt", cancel: "Annuller" },
    de: { label: "Neues Produkt", save: "Produkt erstellen", cancel: "Abbrechen" },
    fr: { label: "Nouveau produit", save: "Creer le produit", cancel: "Annuler" },
    es: { label: "Producto nuevo", save: "Crear producto", cancel: "Cancelar" },
    zh: { label: "新产品", save: "创建产品", cancel: "取消" },
};

export const INVENTORY_CREATE_PENDING_COPY: Record<LanguageCode, { label: string; save: string; cancel: string }> = {
    en: { label: "New stock", save: "Add stock", cancel: "Cancel" },
    da: { label: "Ny lagerpost", save: "Tilfoj lager", cancel: "Annuller" },
    de: { label: "Neuer Bestand", save: "Bestand hinzufugen", cancel: "Abbrechen" },
    fr: { label: "Nouveau stock", save: "Ajouter du stock", cancel: "Annuler" },
    es: { label: "Nuevo stock", save: "Agregar stock", cancel: "Cancelar" },
    zh: { label: "新库存", save: "添加库存", cancel: "取消" },
};

export const CATEGORY_CREATE_PENDING_COPY: Record<LanguageCode, { label: string; save: string; cancel: string }> = {
    en: { label: "New category", save: "Create category", cancel: "Cancel" },
    da: { label: "Ny kategori", save: "Opret kategori", cancel: "Annuller" },
    de: { label: "Neue Kategorie", save: "Kategorie erstellen", cancel: "Abbrechen" },
    fr: { label: "Nouvelle categorie", save: "Creer la categorie", cancel: "Annuler" },
    es: { label: "Nueva categoria", save: "Crear categoria", cancel: "Cancelar" },
    zh: { label: "新分类", save: "创建分类", cancel: "取消" },
};

export const CATEGORY_EDIT_PENDING_COPY: Record<LanguageCode, { label: string; save: string; cancel: string }> = {
    en: { label: "Edit category", save: "Save category", cancel: "Cancel" },
    da: { label: "Rediger kategori", save: "Gem kategori", cancel: "Annuller" },
    de: { label: "Kategorie bearbeiten", save: "Kategorie speichern", cancel: "Abbrechen" },
    fr: { label: "Modifier la categorie", save: "Enregistrer la categorie", cancel: "Annuler" },
    es: { label: "Editar categoria", save: "Guardar categoria", cancel: "Cancelar" },
    zh: { label: "编辑分类", save: "保存分类", cancel: "取消" },
};

export const PRODUCT_EDIT_PENDING_COPY: Record<LanguageCode, { label: string; save: string; cancel: string }> = {
    en: { label: "Edit product", save: "Save product", cancel: "Cancel" },
    da: { label: "Rediger produkt", save: "Gem produkt", cancel: "Annuller" },
    de: { label: "Produkt bearbeiten", save: "Produkt speichern", cancel: "Abbrechen" },
    fr: { label: "Modifier le produit", save: "Enregistrer le produit", cancel: "Annuler" },
    es: { label: "Editar producto", save: "Guardar producto", cancel: "Cancelar" },
    zh: { label: "编辑产品", save: "保存产品", cancel: "取消" },
};

export const PURCHASE_ORDER_CREATE_PENDING_COPY: Record<LanguageCode, { label: string; save: string; cancel: string }> = {
    en: { label: "New purchase order", save: "Save", cancel: "Cancel" },
    da: { label: "Ny indkobsordre", save: "Gem", cancel: "Annuller" },
    de: { label: "Neue Bestellung", save: "Speichern", cancel: "Abbrechen" },
    fr: { label: "Nouveau bon de commande", save: "Enregistrer", cancel: "Annuler" },
    es: { label: "Nueva orden de compra", save: "Guardar", cancel: "Cancelar" },
    zh: { label: "新采购订单", save: "保存", cancel: "取消" },
};

export const PURCHASE_ORDER_EDIT_PENDING_COPY: Record<LanguageCode, { label: string; save: string; cancel: string }> = {
    en: { label: "Edit purchase order", save: "Save", cancel: "Cancel" },
    da: { label: "Rediger indkobsordre", save: "Gem", cancel: "Annuller" },
    de: { label: "Bestellung bearbeiten", save: "Speichern", cancel: "Abbrechen" },
    fr: { label: "Modifier le bon de commande", save: "Enregistrer", cancel: "Annuler" },
    es: { label: "Editar orden de compra", save: "Guardar", cancel: "Cancelar" },
    zh: { label: "编辑采购订单", save: "保存", cancel: "取消" },
};

export const SEARCH_ATTENTION_SHAKE_DURATION_MS = 360;
export const SEARCH_ATTENTION_SHAKE_COOLDOWN_MS = 1500;
export const SEARCH_ATTENTION_TINT_START_DELAY_MS = 120;
export const SEARCH_ATTENTION_TINT_VISIBLE_MS = 1200;
export const SIDEBAR_SCENE_SWAP_MS = 90;
export const PORTAL_INLINE_NOTIFICATION_HIDDEN_CLASS = "portalInlineMessageHidden__M2n8Q5";
export const PORTAL_INLINE_NOTIFICATION_SELECTORS = [
    ".form__error__L5j8p0",
    ".portalFeedbackError__R8k2V4",
    ".portalMenuError__W2n8D4",
    ".portalSettingsFeedbackError__X4v7P9",
    ".portalCategoriesError__C6m2Q8",
    ".portalVariantsError__A2m8Q4",
    ".portalInventoryError__X4m2Q6",
    ".portalProductCreateError__Q6m2P8",
    ".portalProductsDeleteConfirmError__N2m8Q7",
    ".portalProductsOnboardingHint__N4m2Q8",
    ".portalProductCreateSuccess__N2m8Q5",
] as const;
export const PORTAL_INLINE_NOTIFICATION_SELECTOR = PORTAL_INLINE_NOTIFICATION_SELECTORS.join(",");
