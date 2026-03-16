export const SUPPORTED_LANGUAGES = ["en", "da", "de", "fr", "es", "zh"] as const;
export const SUPPORTED_CURRENCIES = ["EUR", "USD", "DKK", "GBP", "CAD", "AUD", "SEK", "NOK", "CHF", "JPY"] as const;
export const SUPPORTED_DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] as const;
export const SUPPORTED_WEEK_START_DAYS = ["MONDAY", "SUNDAY"] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];
export type SupportedCurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];
export type CurrencyCode = string;
export type DateFormatCode = (typeof SUPPORTED_DATE_FORMATS)[number];
export type WeekStartDayCode = (typeof SUPPORTED_WEEK_START_DAYS)[number];
export type ThemeLabelKey = "system" | "light" | "dark";

export type PortalNavKey =
    | "home"
    | "products"
    | "categories"
    | "inventory"
    | "purchaseOrders"
    | "variants"
    | "content"
    | "files"
    | "metaobjects"
    | "blogPosts"
    | "finance"
    | "analytics"
    | "reports"
    | "liveView"
    | "settings";

export type PortalPageKey = PortalNavKey;

export type PortalMessages = {
    nav: Record<PortalNavKey, string>;
    pages: Record<PortalPageKey, string>;
    searchPlaceholder: string;
    a11y: {
        navigation: string;
        expandSection: string;
        collapseSection: string;
    };
    menu: {
        accountSettings: string;
        theme: string;
        language: string;
        currency: string;
        systemStatus: string;
        systemsOperational: string;
        systemError: string;
        systemLoading: string;
        signOut: string;
        signingOut: string;
    };
    themeValues: Record<ThemeLabelKey, string>;
    languageValues: Record<LanguageCode, string>;
    currencyValues: Record<string, string>;
};

const MESSAGES: Record<LanguageCode, PortalMessages> = {
    en: {
        nav: {
            home: "Home",
            products: "Products",
            categories: "Categories",
            inventory: "Inventory",
            purchaseOrders: "Purchase orders",
            variants: "Variants",
            content: "Content",
            files: "Files",
            metaobjects: "Metaobjects",
            blogPosts: "Blog posts",
            finance: "Finance",
            analytics: "Analytics",
            reports: "Reports",
            liveView: "Live View",
            settings: "Settings",
        },
        pages: {
            home: "Home",
            products: "Products",
            categories: "Categories",
            inventory: "Inventory",
            purchaseOrders: "Purchase orders",
            variants: "Variants",
            content: "Content",
            files: "Files",
            metaobjects: "Metaobjects",
            blogPosts: "Blog posts",
            finance: "Finance",
            analytics: "Analytics",
            reports: "Reports",
            liveView: "Live View",
            settings: "Settings",
        },
        searchPlaceholder: "Search products, content, analytics...",
        a11y: {
            navigation: "Portal navigation",
            expandSection: "Expand",
            collapseSection: "Collapse",
        },
        menu: {
            accountSettings: "Account settings",
            theme: "Theme",
            language: "Language",
            currency: "Currency",
            systemStatus: "System status",
            systemsOperational: "All systems operational",
            systemError: "There is a system error",
            systemLoading: "Retrieving system status...",
            signOut: "Sign out",
            signingOut: "Signing out...",
        },
        themeValues: {
            system: "System",
            light: "Light",
            dark: "Dark",
        },
        languageValues: {
            en: "English",
            da: "Danish",
            de: "German",
            fr: "French",
            es: "Spanish",
            zh: "Chinese",
        },
        currencyValues: {
            EUR: "Euro (EUR)",
            USD: "US Dollar (USD)",
            DKK: "Danish Krone (DKK)",
            GBP: "British Pound (GBP)",
            CAD: "Canadian Dollar (CAD)",
            AUD: "Australian Dollar (AUD)",
            SEK: "Swedish Krona (SEK)",
            NOK: "Norwegian Krone (NOK)",
            CHF: "Swiss Franc (CHF)",
            JPY: "Japanese Yen (JPY)",
        },
    },
    da: {
        nav: {
            home: "Hjem",
            products: "Produkter",
            categories: "Kategorier",
            inventory: "Lager",
            purchaseOrders: "Indkøbsordrer",
            variants: "Varianter",
            content: "Indhold",
            files: "Filer",
            metaobjects: "Metaobjekter",
            blogPosts: "Blogindlæg",
            finance: "Økonomi",
            analytics: "Analyse",
            reports: "Rapporter",
            liveView: "Livevisning",
            settings: "Indstillinger",
        },
        pages: {
            home: "Hjem",
            products: "Produkter",
            categories: "Kategorier",
            inventory: "Lager",
            purchaseOrders: "Indkøbsordrer",
            variants: "Varianter",
            content: "Indhold",
            files: "Filer",
            metaobjects: "Metaobjekter",
            blogPosts: "Blogindlæg",
            finance: "Økonomi",
            analytics: "Analyse",
            reports: "Rapporter",
            liveView: "Livevisning",
            settings: "Indstillinger",
        },
        searchPlaceholder: "Søg i produkter, indhold, analyser...",
        a11y: {
            navigation: "Portalnavigation",
            expandSection: "Udvid",
            collapseSection: "Skjul",
        },
        menu: {
            accountSettings: "Kontoindstillinger",
            theme: "Tema",
            language: "Sprog",
            currency: "Valuta",
            systemStatus: "Systemstatus",
            systemsOperational: "Alle systemer er operationelle",
            systemError: "Der er en systemfejl",
            systemLoading: "Henter systemstatus...",
            signOut: "Log ud",
            signingOut: "Logger ud...",
        },
        themeValues: {
            system: "System",
            light: "Lys",
            dark: "Mørk",
        },
        languageValues: {
            en: "Engelsk",
            da: "Dansk",
            de: "Tysk",
            fr: "Fransk",
            es: "Spansk",
            zh: "Kinesisk",
        },
        currencyValues: {
            EUR: "Euro (EUR)",
            USD: "US-dollar (USD)",
            DKK: "Dansk krone (DKK)",
            GBP: "Britisk pund (GBP)",
            CAD: "Canadisk dollar (CAD)",
            AUD: "Australsk dollar (AUD)",
            SEK: "Svensk krone (SEK)",
            NOK: "Norsk krone (NOK)",
            CHF: "Schweizisk franc (CHF)",
            JPY: "Japansk yen (JPY)",
        },
    },
    de: {
        nav: {
            home: "Start",
            products: "Produkte",
            categories: "Kategorien",
            inventory: "Inventar",
            purchaseOrders: "Bestellungen",
            variants: "Varianten",
            content: "Inhalte",
            files: "Dateien",
            metaobjects: "Metaobjekte",
            blogPosts: "Blogbeiträge",
            finance: "Finanzen",
            analytics: "Analysen",
            reports: "Berichte",
            liveView: "Live-Ansicht",
            settings: "Einstellungen",
        },
        pages: {
            home: "Start",
            products: "Produkte",
            categories: "Kategorien",
            inventory: "Inventar",
            purchaseOrders: "Bestellungen",
            variants: "Varianten",
            content: "Inhalte",
            files: "Dateien",
            metaobjects: "Metaobjekte",
            blogPosts: "Blogbeiträge",
            finance: "Finanzen",
            analytics: "Analysen",
            reports: "Berichte",
            liveView: "Live-Ansicht",
            settings: "Einstellungen",
        },
        searchPlaceholder: "Produkte, Inhalte, Analysen suchen...",
        a11y: {
            navigation: "Portalnavigation",
            expandSection: "Erweitern",
            collapseSection: "Einklappen",
        },
        menu: {
            accountSettings: "Kontoeinstellungen",
            theme: "Design",
            language: "Sprache",
            currency: "Währung",
            systemStatus: "Systemstatus",
            systemsOperational: "Alle Systeme sind betriebsbereit",
            systemError: "Es gibt einen Systemfehler",
            systemLoading: "Systemstatus wird geladen...",
            signOut: "Abmelden",
            signingOut: "Wird abgemeldet...",
        },
        themeValues: {
            system: "System",
            light: "Hell",
            dark: "Dunkel",
        },
        languageValues: {
            en: "Englisch",
            da: "Dänisch",
            de: "Deutsch",
            fr: "Französisch",
            es: "Spanisch",
            zh: "Chinesisch",
        },
        currencyValues: {
            EUR: "Euro (EUR)",
            USD: "US-Dollar (USD)",
            DKK: "Dänische Krone (DKK)",
            GBP: "Britisches Pfund (GBP)",
            CAD: "Kanadischer Dollar (CAD)",
            AUD: "Australischer Dollar (AUD)",
            SEK: "Schwedische Krone (SEK)",
            NOK: "Norwegische Krone (NOK)",
            CHF: "Schweizer Franken (CHF)",
            JPY: "Japanischer Yen (JPY)",
        },
    },
    fr: {
        nav: {
            home: "Accueil",
            products: "Produits",
            categories: "Catégories",
            inventory: "Inventaire",
            purchaseOrders: "Bons de commande",
            variants: "Variantes",
            content: "Contenu",
            files: "Fichiers",
            metaobjects: "Metaobjets",
            blogPosts: "Articles de blog",
            finance: "Finance",
            analytics: "Analytique",
            reports: "Rapports",
            liveView: "Vue en direct",
            settings: "Paramètres",
        },
        pages: {
            home: "Accueil",
            products: "Produits",
            categories: "Catégories",
            inventory: "Inventaire",
            purchaseOrders: "Bons de commande",
            variants: "Variantes",
            content: "Contenu",
            files: "Fichiers",
            metaobjects: "Metaobjets",
            blogPosts: "Articles de blog",
            finance: "Finance",
            analytics: "Analytique",
            reports: "Rapports",
            liveView: "Vue en direct",
            settings: "Paramètres",
        },
        searchPlaceholder: "Rechercher des produits, du contenu, des analyses...",
        a11y: {
            navigation: "Navigation du portail",
            expandSection: "Developper",
            collapseSection: "Reduire",
        },
        menu: {
            accountSettings: "Paramètres du compte",
            theme: "Thème",
            language: "Langue",
            currency: "Devise",
            systemStatus: "État du système",
            systemsOperational: "Tous les systèmes sont opérationnels",
            systemError: "Il y a une erreur système",
            systemLoading: "Récupération de l'état du système...",
            signOut: "Se déconnecter",
            signingOut: "Déconnexion...",
        },
        themeValues: {
            system: "Système",
            light: "Clair",
            dark: "Sombre",
        },
        languageValues: {
            en: "Anglais",
            da: "Danois",
            de: "Allemand",
            fr: "Français",
            es: "Espagnol",
            zh: "Chinois",
        },
        currencyValues: {
            EUR: "Euro (EUR)",
            USD: "Dollar americain (USD)",
            DKK: "Couronne danoise (DKK)",
            GBP: "Livre sterling (GBP)",
            CAD: "Dollar canadien (CAD)",
            AUD: "Dollar australien (AUD)",
            SEK: "Couronne suedoise (SEK)",
            NOK: "Couronne norvegienne (NOK)",
            CHF: "Franc suisse (CHF)",
            JPY: "Yen japonais (JPY)",
        },
    },
    es: {
        nav: {
            home: "Inicio",
            products: "Productos",
            categories: "Categorías",
            inventory: "Inventario",
            purchaseOrders: "Pedidos de compra",
            variants: "Variantes",
            content: "Contenido",
            files: "Archivos",
            metaobjects: "Metaobjetos",
            blogPosts: "Entradas del blog",
            finance: "Finanzas",
            analytics: "Analítica",
            reports: "Informes",
            liveView: "Vista en vivo",
            settings: "Configuración",
        },
        pages: {
            home: "Inicio",
            products: "Productos",
            categories: "Categorías",
            inventory: "Inventario",
            purchaseOrders: "Pedidos de compra",
            variants: "Variantes",
            content: "Contenido",
            files: "Archivos",
            metaobjects: "Metaobjetos",
            blogPosts: "Entradas del blog",
            finance: "Finanzas",
            analytics: "Analítica",
            reports: "Informes",
            liveView: "Vista en vivo",
            settings: "Configuración",
        },
        searchPlaceholder: "Buscar productos, contenido y análisis...",
        a11y: {
            navigation: "Navegacion del portal",
            expandSection: "Expandir",
            collapseSection: "Contraer",
        },
        menu: {
            accountSettings: "Configuración de la cuenta",
            theme: "Tema",
            language: "Idioma",
            currency: "Moneda",
            systemStatus: "Estado del sistema",
            systemsOperational: "Todos los sistemas están operativos",
            systemError: "Hay un error del sistema",
            systemLoading: "Recuperando el estado del sistema...",
            signOut: "Cerrar sesión",
            signingOut: "Cerrando sesión...",
        },
        themeValues: {
            system: "Sistema",
            light: "Claro",
            dark: "Oscuro",
        },
        languageValues: {
            en: "Inglés",
            da: "Danés",
            de: "Alemán",
            fr: "Francés",
            es: "Español",
            zh: "Chino",
        },
        currencyValues: {
            EUR: "Euro (EUR)",
            USD: "Dolar estadounidense (USD)",
            DKK: "Corona danesa (DKK)",
            GBP: "Libra esterlina (GBP)",
            CAD: "Dolar canadiense (CAD)",
            AUD: "Dolar australiano (AUD)",
            SEK: "Corona sueca (SEK)",
            NOK: "Corona noruega (NOK)",
            CHF: "Franco suizo (CHF)",
            JPY: "Yen japones (JPY)",
        },
    },
    zh: {
        nav: {
            home: "主页",
            products: "产品",
            categories: "分类",
            inventory: "库存",
            purchaseOrders: "采购订单",
            variants: "变体",
            content: "内容",
            files: "文件",
            metaobjects: "元对象",
            blogPosts: "博客文章",
            finance: "财务",
            analytics: "分析",
            reports: "报表",
            liveView: "实时视图",
            settings: "设置",
        },
        pages: {
            home: "主页",
            products: "产品",
            categories: "分类",
            inventory: "库存",
            purchaseOrders: "采购订单",
            variants: "变体",
            content: "内容",
            files: "文件",
            metaobjects: "元对象",
            blogPosts: "博客文章",
            finance: "财务",
            analytics: "分析",
            reports: "报表",
            liveView: "实时视图",
            settings: "设置",
        },
        searchPlaceholder: "搜索产品、内容、分析...",
        a11y: {
            navigation: "门户导航",
            expandSection: "展开",
            collapseSection: "收起",
        },
        menu: {
            accountSettings: "账户设置",
            theme: "主题",
            language: "语言",
            currency: "货币",
            systemStatus: "系统状态",
            systemsOperational: "所有系统运行正常",
            systemError: "系统出现错误",
            systemLoading: "正在获取系统状态...",
            signOut: "退出登录",
            signingOut: "正在退出...",
        },
        themeValues: {
            system: "系统",
            light: "浅色",
            dark: "深色",
        },
        languageValues: {
            en: "英语",
            da: "丹麦语",
            de: "德语",
            fr: "法语",
            es: "西班牙语",
            zh: "中文",
        },
        currencyValues: {
            EUR: "欧元 (EUR)",
            USD: "美元 (USD)",
            DKK: "丹麦克朗 (DKK)",
            GBP: "英镑 (GBP)",
            CAD: "加元 (CAD)",
            AUD: "澳元 (AUD)",
            SEK: "瑞典克朗 (SEK)",
            NOK: "挪威克朗 (NOK)",
            CHF: "瑞士法郎 (CHF)",
            JPY: "日元 (JPY)",
        },
    },
};

export const PORTAL_MESSAGES = MESSAGES;

export const LANGUAGE_NATIVE_LABELS: Record<LanguageCode, string> = {
    en: "English",
    da: "Dansk",
    de: "Deutsch",
    fr: "Français",
    es: "Español",
    zh: "中文",
};

const LANGUAGE_ALIASES: Record<string, LanguageCode> = {
    en: "en",
    english: "en",
    da: "da",
    danish: "da",
    dansk: "da",
    de: "de",
    german: "de",
    deutsch: "de",
    fr: "fr",
    french: "fr",
    france: "fr",
    es: "es",
    spanish: "es",
    spain: "es",
    zh: "zh",
    chinese: "zh",
    china: "zh",
};

const CURRENCY_ALIASES: Record<string, CurrencyCode> = {
    eur: "EUR",
    euro: "EUR",
    usd: "USD",
    dollar: "USD",
    dkk: "DKK",
    krone: "DKK",
    kroner: "DKK",
    gbp: "GBP",
    pound: "GBP",
    cad: "CAD",
    aud: "AUD",
    sek: "SEK",
    nok: "NOK",
    chf: "CHF",
    jpy: "JPY",
    yen: "JPY",
};
const ISO_CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;
const SUPPORTED_CURRENCY_SET = new Set<string>(SUPPORTED_CURRENCIES);

const DATE_FORMAT_ALIASES: Record<string, DateFormatCode> = {
    "dd/mm/yyyy": "DD/MM/YYYY",
    "d/m/yyyy": "DD/MM/YYYY",
    "31/12/2026": "DD/MM/YYYY",
    "mm/dd/yyyy": "MM/DD/YYYY",
    "m/d/yyyy": "MM/DD/YYYY",
    "12/31/2026": "MM/DD/YYYY",
    "yyyy-mm-dd": "YYYY-MM-DD",
    "2026-12-31": "YYYY-MM-DD",
};

const WEEK_START_DAY_ALIASES: Record<string, WeekStartDayCode> = {
    monday: "MONDAY",
    mon: "MONDAY",
    sunday: "SUNDAY",
    sun: "SUNDAY",
};

export function parseLanguage(input: string | null | undefined): LanguageCode | null {
    if (!input) return null;

    const normalized = input.trim().toLowerCase();
    const base = normalized.split(/[-_]/)[0];

    return LANGUAGE_ALIASES[normalized] ?? LANGUAGE_ALIASES[base] ?? null;
}

export function normalizeLanguage(input: string | null | undefined): LanguageCode {
    return parseLanguage(input) ?? "en";
}

export function parseCurrency(input: string | null | undefined): CurrencyCode | null {
    if (!input) return null;

    const normalized = input.trim().toLowerCase();
    const alias = CURRENCY_ALIASES[normalized];
    if (alias) return alias;
    const upper = input.trim().toUpperCase();
    if (ISO_CURRENCY_CODE_PATTERN.test(upper)) {
        return upper;
    }
    return null;
}

export function parseSupportedCurrency(input: string | null | undefined): SupportedCurrencyCode | null {
    const parsed = parseCurrency(input);
    if (!parsed) return null;
    if (!SUPPORTED_CURRENCY_SET.has(parsed)) return null;
    return parsed as SupportedCurrencyCode;
}

export function normalizeCurrency(input: string | null | undefined): CurrencyCode {
    return parseCurrency(input) ?? "EUR";
}

export function parseDateFormat(input: string | null | undefined): DateFormatCode | null {
    if (!input) return null;

    const normalized = input.trim().toLowerCase();
    return DATE_FORMAT_ALIASES[normalized] ?? null;
}

export function normalizeDateFormat(input: string | null | undefined): DateFormatCode {
    return parseDateFormat(input) ?? "DD/MM/YYYY";
}

export function parseWeekStartDay(input: string | null | undefined): WeekStartDayCode | null {
    if (!input) return null;

    const normalized = input.trim().toLowerCase();
    return WEEK_START_DAY_ALIASES[normalized] ?? null;
}

export function normalizeWeekStartDay(input: string | null | undefined): WeekStartDayCode {
    return parseWeekStartDay(input) ?? "MONDAY";
}

export function nextLanguage(current: LanguageCode): LanguageCode {
    const idx = SUPPORTED_LANGUAGES.indexOf(current);
    if (idx === -1 || idx === SUPPORTED_LANGUAGES.length - 1) return SUPPORTED_LANGUAGES[0];
    return SUPPORTED_LANGUAGES[idx + 1];
}
