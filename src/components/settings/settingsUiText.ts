import type { LanguageCode, WeekStartDayCode } from "@/i18n/portal";

export type SettingsNavTitleId =
    | "profile"
    | "businessDetails"
    | "general"
    | "team"
    | "notifications"
    | "language"
    | "security"
    | "feedback"
    | "storeAccess"
    | "loginLogs";

export type SettingsUiText = {
    navTitles: Record<SettingsNavTitleId, string>;
    searchPlaceholder: string;
    searchNoResults: string;
    adminSectionTitle: string;
    managerSectionTitle: string;
    closeAriaLabel: string;
    save: string;
    saving: string;
    discard: string;
    selectCountryPlaceholder: string;
    requiredNamesError: string;
    profile: {
        identityTitle: string;
        identitySubtitle: string;
        firstName: string;
        lastName: string;
        contactTitle: string;
        contactSubtitle: string;
        emailOptional: string;
        phoneOptional: string;
        emailPlaceholder: string;
        phonePlaceholder: string;
        storesTitle: string;
        storesSubtitle: string;
        activeStore: string;
        preferredLanguageTitle: string;
        languageLabel: string;
        timeZoneTitle: string;
        timeZoneLabel: string;
    };
    business: {
        title: string;
        subtitle: string;
        businessName: string;
        country: string;
        businessType: string;
        legalFirstName: string;
        legalLastName: string;
        street: string;
        houseNumber: string;
        addressLine2: string;
        postalCode: string;
        city: string;
        email: string;
        phone: string;
    };
    general: {
        storeDefaultsTitle: string;
        storeDefaultsSubtitle: string;
        storeCurrency: string;
        backupRegionCountry: string;
        unitSystem: string;
        unitSystemMetric: string;
        unitSystemImperial: string;
        storeTimeZone: string;
        accountSettingsHint: string;
        orderIdFormatTitle: string;
        orderIdFormatSubtitle: string;
        productCodePrefix: string;
        productCodeSuffix: string;
        orderIdExample: string;
    };
    languagePanel: {
        title: string;
        preferredLanguage: string;
        preferredCurrency: string;
    };
    weekStartDayLabels: Record<WeekStartDayCode, string>;
    tiles: {
        overviewTitle: string;
        overviewBody: string;
        defaultsTitle: string;
        defaultsBody: string;
        accessTitle: string;
        accessBody: string;
        notesTitle: string;
    };
};

export const SETTINGS_UI_TEXT: Record<LanguageCode, SettingsUiText> = {
    en: {
        navTitles: {
            profile: "Account",
            businessDetails: "Business Details",
            general: "General",
            team: "Team",
            notifications: "Notifications",
            language: "Language",
            security: "Security",
            feedback: "Feedback inbox",
            storeAccess: "Stores",
            loginLogs: "Login logs",
        },
        searchPlaceholder: "Search settings",
        searchNoResults: "No results found",
        adminSectionTitle: "Admin settings",
        managerSectionTitle: "Manager settings",
        closeAriaLabel: "Close settings",
        save: "Save",
        saving: "Saving...",
        discard: "Discard",
        selectCountryPlaceholder: "Select your country",
        requiredNamesError: "First and last name are required.",
        profile: {
            identityTitle: "Identity",
            identitySubtitle: "Required account name fields used across profile and audit history.",
            firstName: "First name",
            lastName: "Last name",
            contactTitle: "Contact",
            contactSubtitle: "Optional contact channels for notifications and account communication.",
            emailOptional: "Email (optional)",
            phoneOptional: "Phone (optional)",
            emailPlaceholder: "name@example.com",
            phonePlaceholder: "12 34 56 78",
            storesTitle: "Stores",
            storesSubtitle: "Choose your active store. This list includes all stores associated with your account.",
            activeStore: "Active store",
            preferredLanguageTitle: "Preferred language",
            languageLabel: "Language",
            timeZoneTitle: "Time zone",
            timeZoneLabel: "Time zone",
        },
        business: {
            title: "Business details",
            subtitle: "Legal business identity and address for the active store.",
            businessName: "Business name",
            country: "Country",
            businessType: "Type of business",
            legalFirstName: "Legal first name",
            legalLastName: "Legal last name",
            street: "Street",
            houseNumber: "House and number",
            addressLine2: "Apartment, suite, etc.",
            postalCode: "Postal code",
            city: "City",
            email: "Business email",
            phone: "Business phone",
        },
        general: {
            storeDefaultsTitle: "Store defaults",
            storeDefaultsSubtitle: "Default operational settings for the active store.",
            storeCurrency: "Store currency",
            backupRegionCountry: "Backup region (country)",
            unitSystem: "Unit system",
            unitSystemMetric: "Metric",
            unitSystemImperial: "Imperial",
            storeTimeZone: "Store time zone",
            accountSettingsHint: "To change user-level language and time zone, visit account settings.",
            orderIdFormatTitle: "Order ID format",
            orderIdFormatSubtitle: "Configure prefix and suffix for product IDs. Saving applies changes to existing product codes.",
            productCodePrefix: "Product code prefix",
            productCodeSuffix: "Product code suffix",
            orderIdExample: "Example",
        },
        languagePanel: {
            title: "Language and currency",
            preferredLanguage: "Preferred language",
            preferredCurrency: "Preferred currency",
        },
        weekStartDayLabels: {
            MONDAY: "Monday",
            SUNDAY: "Sunday",
        },
        tiles: {
            overviewTitle: "Overview",
            overviewBody: "High-level controls for this settings group.",
            defaultsTitle: "Defaults",
            defaultsBody: "Define default behavior and inheritance strategy.",
            accessTitle: "Access",
            accessBody: "Control who can update values in this section.",
            notesTitle: "Notes",
        },
    },
    da: {
        navTitles: {
            profile: "Profil",
            businessDetails: "Virksomhedsoplysninger",
            general: "Generelt",
            team: "Team",
            notifications: "Notifikationer",
            language: "Sprog",
            security: "Sikkerhed",
            feedback: "Feedback indbakke",
            storeAccess: "Butikker",
            loginLogs: "Loginlog",
        },
        searchPlaceholder: "Sog i indstillinger",
        searchNoResults: "Ingen resultater fundet.",
        adminSectionTitle: "Admin-indstillinger",
        managerSectionTitle: "Lederindstillinger",
        closeAriaLabel: "Luk indstillinger",
        save: "Gem",
        saving: "Gemmer...",
        discard: "Kasser",
        selectCountryPlaceholder: "Vaelg dit land",
        requiredNamesError: "Fornavn og efternavn er paakraevet.",
        profile: {
            identityTitle: "Identitet",
            identitySubtitle: "Paakraevede navnefelter brugt i profil og historik.",
            firstName: "Fornavn",
            lastName: "Efternavn",
            contactTitle: "Kontakt",
            contactSubtitle: "Valgfrie kontaktfelter til notifikationer og kommunikation.",
            emailOptional: "Email (valgfri)",
            phoneOptional: "Telefon (valgfri)",
            emailPlaceholder: "navn@eksempel.com",
            phonePlaceholder: "12 34 56 78",
            storesTitle: "Butikker",
            storesSubtitle: "Vaelg aktiv butik. Listen viser alle butikker knyttet til kontoen.",
            activeStore: "Aktiv butik",
            preferredLanguageTitle: "Foretrukket sprog",
            languageLabel: "Sprog",
            timeZoneTitle: "Tidszone",
            timeZoneLabel: "Tidszone",
        },
        business: {
            title: "Virksomhedsoplysninger",
            subtitle: "Juridisk virksomhedsidentitet og adresse for den aktive butik.",
            businessName: "Virksomhedsnavn",
            country: "Land",
            businessType: "Virksomhedstype",
            legalFirstName: "Juridisk fornavn",
            legalLastName: "Juridisk efternavn",
            street: "Vej",
            houseNumber: "Husnummer",
            addressLine2: "Lejlighed, etage, suite mv.",
            postalCode: "Postnummer",
            city: "By",
            email: "Virksomheds-email",
            phone: "Virksomhedstelefon",
        },
        general: {
            storeDefaultsTitle: "Butiksstandarder",
            storeDefaultsSubtitle: "Standarddriftsindstillinger for den aktive butik.",
            storeCurrency: "Butiksvaluta",
            backupRegionCountry: "Backup-region (land)",
            unitSystem: "Enhedssystem",
            unitSystemMetric: "Metrisk",
            unitSystemImperial: "Imperial",
            storeTimeZone: "Butikkens tidszone",
            accountSettingsHint: "For at aendre brugerens sprog og tidszone, ga til kontoindstillinger.",
            orderIdFormatTitle: "Ordre-ID format",
            orderIdFormatSubtitle: "Konfigurer prefix og suffix for produktkoder. Ved gem opdateres eksisterende produktkoder.",
            productCodePrefix: "Produktkode prefix",
            productCodeSuffix: "Produktkode suffix",
            orderIdExample: "Eksempel",
        },
        languagePanel: {
            title: "Sprog og valuta",
            preferredLanguage: "Foretrukket sprog",
            preferredCurrency: "Foretrukken valuta",
        },
        weekStartDayLabels: {
            MONDAY: "Mandag",
            SUNDAY: "Sondag",
        },
        tiles: {
            overviewTitle: "Overblik",
            overviewBody: "Overordnede kontroller for denne indstillingsgruppe.",
            defaultsTitle: "Standarder",
            defaultsBody: "Definer standardadfaerd og nedarvning.",
            accessTitle: "Adgang",
            accessBody: "Styr hvem der kan opdatere vaerdier i sektionen.",
            notesTitle: "Noter",
        },
    },
    de: {
        navTitles: {
            profile: "Profil",
            businessDetails: "Unternehmensdaten",
            general: "Allgemein",
            team: "Team",
            notifications: "Benachrichtigungen",
            language: "Sprache",
            security: "Sicherheit",
            feedback: "Feedback-Postfach",
            storeAccess: "Filialen",
            loginLogs: "Login-Protokoll",
        },
        searchPlaceholder: "Einstellungen suchen",
        searchNoResults: "Keine Ergebnisse gefunden.",
        adminSectionTitle: "Admin-Einstellungen",
        managerSectionTitle: "Manager-Einstellungen",
        closeAriaLabel: "Einstellungen schliessen",
        save: "Speichern",
        saving: "Speichert...",
        discard: "Verwerfen",
        selectCountryPlaceholder: "Waehle dein Land",
        requiredNamesError: "Vorname und Nachname sind erforderlich.",
        profile: {
            identityTitle: "Identitat",
            identitySubtitle: "Pflicht-Namensfelder fur Profil und Historie.",
            firstName: "Vorname",
            lastName: "Nachname",
            contactTitle: "Kontakt",
            contactSubtitle: "Optionale Kontaktkanale fur Benachrichtigungen.",
            emailOptional: "E-Mail (optional)",
            phoneOptional: "Telefon (optional)",
            emailPlaceholder: "name@beispiel.com",
            phonePlaceholder: "12 34 56 78",
            storesTitle: "Filialen",
            storesSubtitle: "Wahle die aktive Filiale. Die Liste zeigt alle zugeordneten Filialen.",
            activeStore: "Aktive Filiale",
            preferredLanguageTitle: "Bevorzugte Sprache",
            languageLabel: "Sprache",
            timeZoneTitle: "Zeitzone",
            timeZoneLabel: "Zeitzone",
        },
        business: {
            title: "Unternehmensdaten",
            subtitle: "Rechtliche Unternehmensidentitat und Adresse fur die aktive Filiale.",
            businessName: "Unternehmensname",
            country: "Land",
            businessType: "Unternehmensform",
            legalFirstName: "Rechtlicher Vorname",
            legalLastName: "Rechtlicher Nachname",
            street: "Strasse",
            houseNumber: "Hausnummer",
            addressLine2: "Wohnung, Suite usw.",
            postalCode: "Postleitzahl",
            city: "Stadt",
            email: "Geschafts-E-Mail",
            phone: "Geschaftstelefon",
        },
        general: {
            storeDefaultsTitle: "Filial-Standards",
            storeDefaultsSubtitle: "Standardwerte fur die aktive Filiale.",
            storeCurrency: "Filial-Wahrung",
            backupRegionCountry: "Backup-Region (Land)",
            unitSystem: "Einheitensystem",
            unitSystemMetric: "Metrisch",
            unitSystemImperial: "Imperial",
            storeTimeZone: "Filial-Zeitzone",
            accountSettingsHint: "Um Sprache und Zeitzone auf Benutzerebene zu andern, gehe zu Kontoeinstellungen.",
            orderIdFormatTitle: "Order-ID Format",
            orderIdFormatSubtitle: "Prefix und Suffix fur Produktcodes festlegen. Beim Speichern werden bestehende Produktcodes aktualisiert.",
            productCodePrefix: "Produktcode-Prefix",
            productCodeSuffix: "Produktcode-Suffix",
            orderIdExample: "Beispiel",
        },
        languagePanel: {
            title: "Sprache und Wahrung",
            preferredLanguage: "Bevorzugte Sprache",
            preferredCurrency: "Bevorzugte Wahrung",
        },
        weekStartDayLabels: {
            MONDAY: "Montag",
            SUNDAY: "Sonntag",
        },
        tiles: {
            overviewTitle: "Ubersicht",
            overviewBody: "Kontrollen auf hoher Ebene fur diese Gruppe.",
            defaultsTitle: "Standards",
            defaultsBody: "Standardverhalten und Vererbung festlegen.",
            accessTitle: "Zugriff",
            accessBody: "Festlegen, wer Werte in diesem Bereich andern darf.",
            notesTitle: "Hinweise",
        },
    },
    fr: {
        navTitles: {
            profile: "Profil",
            businessDetails: "Informations d'entreprise",
            general: "General",
            team: "Equipe",
            notifications: "Notifications",
            language: "Langue",
            security: "Securite",
            feedback: "Boite feedback",
            storeAccess: "Boutiques",
            loginLogs: "Journaux de connexion",
        },
        searchPlaceholder: "Rechercher dans les parametres",
        searchNoResults: "Aucun resultat trouve.",
        adminSectionTitle: "Parametres admin",
        managerSectionTitle: "Parametres manager",
        closeAriaLabel: "Fermer les parametres",
        save: "Enregistrer",
        saving: "Enregistrement...",
        discard: "Annuler",
        selectCountryPlaceholder: "Selectionnez votre pays",
        requiredNamesError: "Le prenom et le nom sont obligatoires.",
        profile: {
            identityTitle: "Identite",
            identitySubtitle: "Champs nom obligatoires utilises dans le profil et l'historique.",
            firstName: "Prenom",
            lastName: "Nom",
            contactTitle: "Contact",
            contactSubtitle: "Canaux de contact optionnels pour les notifications.",
            emailOptional: "Email (optionnel)",
            phoneOptional: "Telephone (optionnel)",
            emailPlaceholder: "nom@exemple.com",
            phonePlaceholder: "12 34 56 78",
            storesTitle: "Boutiques",
            storesSubtitle: "Choisissez la boutique active. La liste montre toutes les boutiques associees.",
            activeStore: "Boutique active",
            preferredLanguageTitle: "Langue preferee",
            languageLabel: "Langue",
            timeZoneTitle: "Fuseau horaire",
            timeZoneLabel: "Fuseau horaire",
        },
        business: {
            title: "Informations d'entreprise",
            subtitle: "Identite legale et adresse de l'entreprise pour la boutique active.",
            businessName: "Nom de l'entreprise",
            country: "Pays",
            businessType: "Type d'entreprise",
            legalFirstName: "Prenom legal",
            legalLastName: "Nom legal",
            street: "Rue",
            houseNumber: "Numero de rue",
            addressLine2: "Appartement, suite, etc.",
            postalCode: "Code postal",
            city: "Ville",
            email: "Email de l'entreprise",
            phone: "Telephone de l'entreprise",
        },
        general: {
            storeDefaultsTitle: "Parametres boutique",
            storeDefaultsSubtitle: "Parametres operationnels par defaut pour la boutique active.",
            storeCurrency: "Devise de la boutique",
            backupRegionCountry: "Region de secours (pays)",
            unitSystem: "Systeme d'unites",
            unitSystemMetric: "Metrique",
            unitSystemImperial: "Imperial",
            storeTimeZone: "Fuseau horaire de la boutique",
            accountSettingsHint: "Pour changer la langue et le fuseau utilisateur, allez dans les parametres du compte.",
            orderIdFormatTitle: "Format d'ID de commande",
            orderIdFormatSubtitle: "Definissez prefixe et suffixe des codes produit. L'enregistrement met a jour les codes existants.",
            productCodePrefix: "Prefixe du code produit",
            productCodeSuffix: "Suffixe du code produit",
            orderIdExample: "Exemple",
        },
        languagePanel: {
            title: "Langue et devise",
            preferredLanguage: "Langue preferee",
            preferredCurrency: "Devise preferee",
        },
        weekStartDayLabels: {
            MONDAY: "Lundi",
            SUNDAY: "Dimanche",
        },
        tiles: {
            overviewTitle: "Apercu",
            overviewBody: "Controles principaux de ce groupe de parametres.",
            defaultsTitle: "Valeurs par defaut",
            defaultsBody: "Definir le comportement par defaut et l'heritage.",
            accessTitle: "Acces",
            accessBody: "Controler qui peut modifier cette section.",
            notesTitle: "Notes",
        },
    },
    es: {
        navTitles: {
            profile: "Perfil",
            businessDetails: "Datos del negocio",
            general: "General",
            team: "Equipo",
            notifications: "Notificaciones",
            language: "Idioma",
            security: "Seguridad",
            feedback: "Bandeja de feedback",
            storeAccess: "Tiendas",
            loginLogs: "Registros de acceso",
        },
        searchPlaceholder: "Buscar ajustes",
        searchNoResults: "No se han encontrado resultados.",
        adminSectionTitle: "Ajustes de admin",
        managerSectionTitle: "Ajustes de gerente",
        closeAriaLabel: "Cerrar ajustes",
        save: "Guardar",
        saving: "Guardando...",
        discard: "Descartar",
        selectCountryPlaceholder: "Selecciona tu pais",
        requiredNamesError: "El nombre y apellido son obligatorios.",
        profile: {
            identityTitle: "Identidad",
            identitySubtitle: "Campos de nombre obligatorios usados en perfil e historial.",
            firstName: "Nombre",
            lastName: "Apellido",
            contactTitle: "Contacto",
            contactSubtitle: "Canales opcionales para notificaciones y comunicacion.",
            emailOptional: "Correo (opcional)",
            phoneOptional: "Telefono (opcional)",
            emailPlaceholder: "nombre@ejemplo.com",
            phonePlaceholder: "12 34 56 78",
            storesTitle: "Tiendas",
            storesSubtitle: "Elige tienda activa. Esta lista muestra todas las tiendas asociadas.",
            activeStore: "Tienda activa",
            preferredLanguageTitle: "Idioma preferido",
            languageLabel: "Idioma",
            timeZoneTitle: "Zona horaria",
            timeZoneLabel: "Zona horaria",
        },
        business: {
            title: "Datos del negocio",
            subtitle: "Identidad legal y direccion del negocio para la tienda activa.",
            businessName: "Nombre del negocio",
            country: "Pais",
            businessType: "Tipo de negocio",
            legalFirstName: "Nombre legal",
            legalLastName: "Apellido legal",
            street: "Calle",
            houseNumber: "Numero",
            addressLine2: "Apartamento, suite, etc.",
            postalCode: "Codigo postal",
            city: "Ciudad",
            email: "Correo del negocio",
            phone: "Telefono del negocio",
        },
        general: {
            storeDefaultsTitle: "Valores de tienda",
            storeDefaultsSubtitle: "Configuracion operativa predeterminada para la tienda activa.",
            storeCurrency: "Moneda de la tienda",
            backupRegionCountry: "Region de respaldo (pais)",
            unitSystem: "Sistema de unidades",
            unitSystemMetric: "Metrico",
            unitSystemImperial: "Imperial",
            storeTimeZone: "Zona horaria de la tienda",
            accountSettingsHint: "Para cambiar idioma y zona horaria de usuario, ve a configuracion de cuenta.",
            orderIdFormatTitle: "Formato de ID de pedido",
            orderIdFormatSubtitle: "Configura prefijo y sufijo de codigos de producto. Guardar actualiza codigos existentes.",
            productCodePrefix: "Prefijo de codigo de producto",
            productCodeSuffix: "Sufijo de codigo de producto",
            orderIdExample: "Ejemplo",
        },
        languagePanel: {
            title: "Idioma y moneda",
            preferredLanguage: "Idioma preferido",
            preferredCurrency: "Moneda preferida",
        },
        weekStartDayLabels: {
            MONDAY: "Lunes",
            SUNDAY: "Domingo",
        },
        tiles: {
            overviewTitle: "Resumen",
            overviewBody: "Controles de alto nivel para este grupo.",
            defaultsTitle: "Valores por defecto",
            defaultsBody: "Define comportamiento por defecto y herencia.",
            accessTitle: "Acceso",
            accessBody: "Controla quien puede actualizar esta seccion.",
            notesTitle: "Notas",
        },
    },
    zh: {
        navTitles: {
            profile: "个人资料",
            businessDetails: "企业信息",
            general: "常规",
            team: "团队",
            notifications: "通知",
            language: "语言",
            security: "安全",
            feedback: "反馈收件箱",
            storeAccess: "门店",
            loginLogs: "登录日志",
        },
        searchPlaceholder: "搜索设置",
        searchNoResults: "未找到结果。",
        adminSectionTitle: "管理员设置",
        managerSectionTitle: "经理设置",
        closeAriaLabel: "关闭设置",
        save: "保存",
        saving: "保存中...",
        discard: "放弃",
        selectCountryPlaceholder: "选择你的国家",
        requiredNamesError: "名字和姓氏为必填项。",
        profile: {
            identityTitle: "身份信息",
            identitySubtitle: "用于资料和审计记录的必填姓名字段。",
            firstName: "名字",
            lastName: "姓氏",
            contactTitle: "联系方式",
            contactSubtitle: "用于通知和账号沟通的可选联系方式。",
            emailOptional: "邮箱（可选）",
            phoneOptional: "电话（可选）",
            emailPlaceholder: "name@example.com",
            phonePlaceholder: "12 34 56 78",
            storesTitle: "门店",
            storesSubtitle: "选择当前门店。该列表包含账号关联的所有门店。",
            activeStore: "当前门店",
            preferredLanguageTitle: "首选语言",
            languageLabel: "语言",
            timeZoneTitle: "时区",
            timeZoneLabel: "时区",
        },
        business: {
            title: "企业信息",
            subtitle: "当前门店的企业法定身份与地址信息。",
            businessName: "企业名称",
            country: "国家",
            businessType: "企业类型",
            legalFirstName: "法定名字",
            legalLastName: "法定姓氏",
            street: "街道",
            houseNumber: "门牌号",
            addressLine2: "公寓、套间等",
            postalCode: "邮政编码",
            city: "城市",
            email: "企业邮箱",
            phone: "企业电话",
        },
        general: {
            storeDefaultsTitle: "门店默认设置",
            storeDefaultsSubtitle: "当前门店的默认运营设置。",
            storeCurrency: "门店货币",
            backupRegionCountry: "备份区域（国家）",
            unitSystem: "单位制",
            unitSystemMetric: "公制",
            unitSystemImperial: "英制",
            storeTimeZone: "门店时区",
            accountSettingsHint: "如需修改用户级语言和时区，请前往账户设置。",
            orderIdFormatTitle: "订单 ID 格式",
            orderIdFormatSubtitle: "设置产品编码前缀和后缀。保存后会更新现有产品编码。",
            productCodePrefix: "产品编码前缀",
            productCodeSuffix: "产品编码后缀",
            orderIdExample: "示例",
        },
        languagePanel: {
            title: "语言与货币",
            preferredLanguage: "首选语言",
            preferredCurrency: "首选货币",
        },
        weekStartDayLabels: {
            MONDAY: "周一",
            SUNDAY: "周日",
        },
        tiles: {
            overviewTitle: "概览",
            overviewBody: "该设置分组的高级控制项。",
            defaultsTitle: "默认值",
            defaultsBody: "定义默认行为和继承策略。",
            accessTitle: "访问权限",
            accessBody: "控制谁可以更新该分组中的值。",
            notesTitle: "说明",
        },
    },
};
