"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Clock3, Cog, Lightbulb, RefreshCw, Search, Store, Trash2, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { usePortalNavigation } from "@/components/PortalNavigationContext";
import {
    ADMIN_FEEDBACK_ITEM,
    ADMIN_LOGIN_LOGS_ITEM,
    ADMIN_TEAM_ITEM,
    MANAGEMENT_STORES_ITEM,
    PROFILE_ITEM,
    SETTINGS_ITEMS,
    TEAM_ROLE_LABELS,
    USER_ROLE_LABELS,
    type SettingsItem,
} from "@/components/settings/settingsItems";
import { SETTINGS_UI_TEXT, type SettingsNavTitleId } from "@/components/settings/settingsUiText";
import {
    type FeedbackInboxItem,
    type LoginLogItem,
    type ManagedStore,
    type ProfileStoreOption,
    type SettingsSearchEntry,
    type TeamManagedUser,
    type TeamUserStore,
    type UnitSystemCode,
} from "@/components/settings/viewTypes";
import {
    COUNTRY_CODE_SET,
    DEFAULT_PRODUCT_CODE_PREFIX,
    FEEDBACK_INBOX_PAGE_SIZE,
    LANGUAGE_TO_LOCALE,
    LOGIN_LOGS_PAGE_SIZE,
    SEARCH_RESULTS_DELAY_MS,
    SETTINGS_CLOSE_ANIMATION_MS,
    UNIT_SYSTEM_CODES,
    SettingsErrorNotice,
    SettingsPhoneField,
    cn,
    formatOptionalValue,
    getProductCodePrefixInputValue,
    joinStreetAndHouseNumber,
    normalizeProductCodePrefixInput,
    normalizeSearchText,
    resolveCloseTarget,
    splitStreetAndHouseNumber,
} from "@/components/settings/viewHelpers";
import {
    PENDING_CHANGES_ATTENTION_EVENT,
} from "@/components/pendingChangesEvents";
import { Spinner } from "@/components/Spinner";
import { usePendingChangesHeader } from "@/components/usePendingChangesHeader";
import { usePortalI18n } from "@/i18n/PortalI18nContext";
import {
    BUSINESS_TYPE_CODES,
    BUSINESS_TYPE_LABELS,
    parseBusinessType,
    type BusinessTypeCode,
} from "@/i18n/businessTypes";
import {
    type CurrencyCode,
    type DateFormatCode,
    type LanguageCode,
    type WeekStartDayCode,
    LANGUAGE_NATIVE_LABELS,
    SUPPORTED_CURRENCIES,
    SUPPORTED_LANGUAGES,
} from "@/i18n/portal";
import { PORTAL_TIME_ZONE_OPTIONS, ensurePortalTimeZoneOption } from "@/i18n/portalTimeZones";
import { getCurrencyDisplayLabel, getLocalIsoCurrencyCodes, isIsoCurrencyCode, mergeCurrencyCodes } from "@/lib/currencies";
import {
    COUNTRY_OPTIONS,
    DEFAULT_COUNTRY_CODE,
    composeStoredPhone,
    getCountryLabel,
    resolveCountryCode,
    splitStoredPhone,
} from "@/i18n/countries";

export function PortalSettingsView({
    userRole,
    language,
    currency,
    profileName,
    employeeId,
    firstName,
    lastName,
    email,
    phone,
    timeZone,
    dateFormat,
    weekStartDay,
    defaultTimeZone,
    defaultCurrency,
    activeStoreId,
    stores,
    businessName,
    businessCountry,
    businessType,
    businessLegalFirstName,
    businessLegalLastName,
    businessStreet,
    businessHouseNumber,
    businessAddressLine2,
    businessPostalCode,
    businessCity,
    businessEmail,
    businessPhone,
    storeDefaultCurrency,
    storeBackupRegionCountry,
    storeUnitSystem,
    storeTimeZone,
    productCodePrefix,
    productCodeSuffix,
}: {
    userRole: "ADMIN" | "MANAGER" | "EMPLOYEE";
    language: LanguageCode;
    currency: CurrencyCode;
    profileName: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    timeZone: string;
    dateFormat: DateFormatCode;
    weekStartDay: WeekStartDayCode;
    defaultTimeZone: string;
    defaultCurrency: CurrencyCode;
    activeStoreId: string;
    stores: ProfileStoreOption[];
    businessName: string;
    businessCountry: string;
    businessType: string;
    businessLegalFirstName: string;
    businessLegalLastName: string;
    businessStreet: string;
    businessHouseNumber: string;
    businessAddressLine2: string;
    businessPostalCode: string;
    businessCity: string;
    businessEmail: string;
    businessPhone: string;
    storeDefaultCurrency: CurrencyCode;
    storeBackupRegionCountry: string;
    storeUnitSystem: string;
    storeTimeZone: string;
    productCodePrefix: string;
    productCodeSuffix: string;
}) {
    const router = useRouter();
    const { navigateTo } = usePortalNavigation();
    const { language: uiLanguage, messages, setLanguage: setUiLanguage } = usePortalI18n();
    const uiText = SETTINGS_UI_TEXT[uiLanguage] ?? SETTINGS_UI_TEXT.en;
    const isAdmin = userRole === "ADMIN";
    const isManager = userRole === "MANAGER";
    const canManageStores = isAdmin || isManager;
    const canManageTeam = userRole === "ADMIN" || userRole === "MANAGER";
    const managementSectionTitle = isAdmin ? uiText.adminSectionTitle : uiText.managerSectionTitle;
    const [query, setQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SettingsSearchEntry[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [activeId, setActiveId] = useState("general");
    const [isMobileSettingsLayout, setIsMobileSettingsLayout] = useState(false);
    const [mobileView, setMobileView] = useState<"categories" | "detail">("detail");
    const [closing, setClosing] = useState(false);
    const [feedbackItems, setFeedbackItems] = useState<FeedbackInboxItem[]>([]);
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const [feedbackLoadingMore, setFeedbackLoadingMore] = useState(false);
    const [feedbackHasMore, setFeedbackHasMore] = useState(false);
    const [feedbackError, setFeedbackError] = useState<string | null>(null);
    const [feedbackKindFilter, setFeedbackKindFilter] = useState<"ALL" | "ISSUE" | "IDEA">("ALL");
    const [deletingFeedbackId, setDeletingFeedbackId] = useState<string | null>(null);
    const [loginLogs, setLoginLogs] = useState<LoginLogItem[]>([]);
    const [loginLogsLoading, setLoginLogsLoading] = useState(false);
    const [loginLogsLoadingMore, setLoginLogsLoadingMore] = useState(false);
    const [loginLogsHasMore, setLoginLogsHasMore] = useState(false);
    const [loginLogsError, setLoginLogsError] = useState<string | null>(null);
    const loginLogsScrollerRef = useRef<HTMLDivElement | null>(null);
    const loginLogsSentinelRef = useRef<HTMLDivElement | null>(null);
    const feedbackScrollerRef = useRef<HTMLDivElement | null>(null);
    const feedbackSentinelRef = useRef<HTMLDivElement | null>(null);
    const [managedStores, setManagedStores] = useState<ManagedStore[]>([]);
    const [managedStoresLoading, setManagedStoresLoading] = useState(false);
    const [managedStoresError, setManagedStoresError] = useState<string | null>(null);
    const [managedStoresCanCreate, setManagedStoresCanCreate] = useState(isAdmin);
    const [selectedManagedStoreId, setSelectedManagedStoreId] = useState<string | null>(null);
    const [creatingStore, setCreatingStore] = useState(false);
    const [createStoreName, setCreateStoreName] = useState("");
    const [teamUsers, setTeamUsers] = useState<TeamManagedUser[]>([]);
    const [teamStores, setTeamStores] = useState<TeamUserStore[]>([]);
    const [teamCanManageManagers, setTeamCanManageManagers] = useState(isAdmin);
    const [teamLoading, setTeamLoading] = useState(false);
    const [teamCreating, setTeamCreating] = useState(false);
    const [teamDeletingUserId, setTeamDeletingUserId] = useState<string | null>(null);
    const [teamError, setTeamError] = useState<string | null>(null);
    const [teamFirstName, setTeamFirstName] = useState("");
    const [teamLastName, setTeamLastName] = useState("");
    const [teamEmployeeIdPreview, setTeamEmployeeIdPreview] = useState("EMP0001");
    const [teamPassword, setTeamPassword] = useState("");
    const [teamRole, setTeamRole] = useState<"MANAGER" | "EMPLOYEE">("EMPLOYEE");
    const [teamStoreId, setTeamStoreId] = useState("");
    const [preferredLanguage, setPreferredLanguage] = useState<LanguageCode>(language);
    const [preferredCurrency, setPreferredCurrency] = useState<CurrencyCode>(currency);
    const [availableCurrencies, setAvailableCurrencies] = useState<string[]>(() => [...SUPPORTED_CURRENCIES]);
    const [updatingLanguage, setUpdatingLanguage] = useState(false);
    const [updatingCurrency, setUpdatingCurrency] = useState(false);
    const [preferencesError, setPreferencesError] = useState<string | null>(null);
    const initialProfilePhoneParts = splitStoredPhone(phone);
    const initialBusinessPhoneParts = splitStoredPhone(businessPhone);
    const [profileFirstName, setProfileFirstName] = useState(firstName);
    const [profileLastName, setProfileLastName] = useState(lastName);
    const [profileEmail, setProfileEmail] = useState(email);
    const [profilePhoneCountryCode, setProfilePhoneCountryCode] = useState(
        COUNTRY_CODE_SET.has(initialProfilePhoneParts.countryCode) ? initialProfilePhoneParts.countryCode : DEFAULT_COUNTRY_CODE
    );
    const [profilePhoneNationalNumber, setProfilePhoneNationalNumber] = useState(initialProfilePhoneParts.nationalNumber);
    const [profileLanguage, setProfileLanguage] = useState<LanguageCode>(language);
    const [profileTimeZone, setProfileTimeZone] = useState(timeZone);
    const [profileActiveStoreId, setProfileActiveStoreId] = useState(activeStoreId);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [headerSaving, setHeaderSaving] = useState(false);
    const [generalDateFormat, setGeneralDateFormat] = useState<DateFormatCode>(dateFormat);
    const [generalSaving, setGeneralSaving] = useState(false);
    const [generalError, setGeneralError] = useState<string | null>(null);
    const [, setGeneralSaved] = useState(false);
    const [generalWeekStartDay, setGeneralWeekStartDay] = useState<WeekStartDayCode>(weekStartDay);
    const [generalWeekStartSaving, setGeneralWeekStartSaving] = useState(false);
    const [, setGeneralWeekStartError] = useState<string | null>(null);
    const [, setGeneralWeekStartSaved] = useState(false);
    const [generalDefaultTimeZone, setGeneralDefaultTimeZone] = useState(defaultTimeZone);
    const [generalDefaultTimeZoneSaving, setGeneralDefaultTimeZoneSaving] = useState(false);
    const [, setGeneralDefaultTimeZoneError] = useState<string | null>(null);
    const [, setGeneralDefaultTimeZoneSaved] = useState(false);
    const [generalDefaultCurrency, setGeneralDefaultCurrency] = useState<CurrencyCode>(defaultCurrency);
    const [generalDefaultCurrencySaving, setGeneralDefaultCurrencySaving] = useState(false);
    const [, setGeneralDefaultCurrencyError] = useState<string | null>(null);
    const [, setGeneralDefaultCurrencySaved] = useState(false);
    const [generalStoreCurrency, setGeneralStoreCurrency] = useState<CurrencyCode>(storeDefaultCurrency);
    const [generalBackupRegionCountry, setGeneralBackupRegionCountry] = useState(resolveCountryCode(storeBackupRegionCountry));
    const [generalUnitSystem, setGeneralUnitSystem] = useState<UnitSystemCode>(
        storeUnitSystem === "IMPERIAL" ? "IMPERIAL" : "METRIC"
    );
    const [generalStoreTimeZone, setGeneralStoreTimeZone] = useState(storeTimeZone);
    const [generalProductCodePrefix, setGeneralProductCodePrefix] = useState(getProductCodePrefixInputValue(productCodePrefix));
    const [generalProductCodeSuffix, setGeneralProductCodeSuffix] = useState(productCodeSuffix.toUpperCase());
    const [businessDetailsName, setBusinessDetailsName] = useState(businessName);
    const [businessDetailsCountry, setBusinessDetailsCountry] = useState(resolveCountryCode(businessCountry));
    const [businessDetailsType, setBusinessDetailsType] = useState<BusinessTypeCode>(parseBusinessType(businessType) ?? "INDIVIDUAL");
    const [businessDetailsLegalFirstName, setBusinessDetailsLegalFirstName] = useState(businessLegalFirstName);
    const [businessDetailsLegalLastName, setBusinessDetailsLegalLastName] = useState(businessLegalLastName);
    const [businessDetailsStreetAndHouseNumber, setBusinessDetailsStreetAndHouseNumber] = useState(
        joinStreetAndHouseNumber(businessStreet, businessHouseNumber)
    );
    const [businessDetailsAddressLine2, setBusinessDetailsAddressLine2] = useState(businessAddressLine2);
    const [businessDetailsPostalCode, setBusinessDetailsPostalCode] = useState(businessPostalCode);
    const [businessDetailsCity, setBusinessDetailsCity] = useState(businessCity);
    const [businessDetailsEmail, setBusinessDetailsEmail] = useState(businessEmail);
    const [businessDetailsPhoneCountryCode, setBusinessDetailsPhoneCountryCode] = useState(
        COUNTRY_CODE_SET.has(initialBusinessPhoneParts.countryCode) ? initialBusinessPhoneParts.countryCode : DEFAULT_COUNTRY_CODE
    );
    const [businessDetailsPhoneNationalNumber, setBusinessDetailsPhoneNationalNumber] = useState(initialBusinessPhoneParts.nationalNumber);
    const [businessDetailsSaving, setBusinessDetailsSaving] = useState(false);
    const [businessDetailsError, setBusinessDetailsError] = useState<string | null>(null);

    const profilePhone = useMemo(
        () => composeStoredPhone(profilePhoneCountryCode, profilePhoneNationalNumber),
        [profilePhoneCountryCode, profilePhoneNationalNumber]
    );
    const locale = useMemo(() => LANGUAGE_TO_LOCALE[uiLanguage] ?? "en-US", [uiLanguage]);
    const businessDetailsPhone = useMemo(
        () => composeStoredPhone(businessDetailsPhoneCountryCode, businessDetailsPhoneNationalNumber),
        [businessDetailsPhoneCountryCode, businessDetailsPhoneNationalNumber]
    );
    const preferredCurrencyOptions = useMemo(
        () => mergeCurrencyCodes(availableCurrencies, [preferredCurrency]),
        [availableCurrencies, preferredCurrency]
    );
    const preferredCurrencyLabelByCode = useMemo(() => {
        const labels = new Map<string, string>();
        preferredCurrencyOptions.forEach((code) => {
            labels.set(code, getCurrencyDisplayLabel(code, locale));
        });
        return labels;
    }, [locale, preferredCurrencyOptions]);
    const storeCurrencyOptions = useMemo(
        () => mergeCurrencyCodes(availableCurrencies, [generalStoreCurrency, storeDefaultCurrency]),
        [availableCurrencies, generalStoreCurrency, storeDefaultCurrency]
    );
    const storeCurrencyLabelByCode = useMemo(() => {
        const labels = new Map<string, string>();
        storeCurrencyOptions.forEach((code) => {
            labels.set(code, getCurrencyDisplayLabel(code, locale));
        });
        return labels;
    }, [locale, storeCurrencyOptions]);

    const settingsItems = useMemo(() => {
        const withLocalizedTitle = (item: SettingsItem): SettingsItem => {
            const localizedTitle = uiText.navTitles[item.id as SettingsNavTitleId];
            if (!localizedTitle) return item;
            return { ...item, title: localizedTitle };
        };

        const items = [PROFILE_ITEM, ...SETTINGS_ITEMS].map(withLocalizedTitle);
        if (isAdmin) {
            items.push(withLocalizedTitle(ADMIN_FEEDBACK_ITEM));
            items.push(withLocalizedTitle(MANAGEMENT_STORES_ITEM));
            items.push(withLocalizedTitle(ADMIN_TEAM_ITEM));
            items.push(withLocalizedTitle(ADMIN_LOGIN_LOGS_ITEM));
        } else if (canManageStores) {
            items.push(withLocalizedTitle(MANAGEMENT_STORES_ITEM));
            items.push(withLocalizedTitle(ADMIN_TEAM_ITEM));
        }
        return items;
    }, [canManageStores, isAdmin, uiText]);

    const profileTimeZoneOptions = useMemo(
        () => ensurePortalTimeZoneOption(profileTimeZone, PORTAL_TIME_ZONE_OPTIONS),
        [profileTimeZone]
    );

    const generalTimeZoneOptions = useMemo(
        () => ensurePortalTimeZoneOption(generalStoreTimeZone, PORTAL_TIME_ZONE_OPTIONS),
        [generalStoreTimeZone]
    );
    const businessTypeLabels = BUSINESS_TYPE_LABELS[uiLanguage] ?? BUSINESS_TYPE_LABELS.en;
    const generalOrderIdExample = useMemo(() => {
        const effectivePrefix = normalizeProductCodePrefixInput(generalProductCodePrefix);
        return `${effectivePrefix}73925184${generalProductCodeSuffix}`;
    }, [generalProductCodePrefix, generalProductCodeSuffix]);

    const navItems = useMemo(() => settingsItems.filter((item) => item.id !== "profile"), [settingsItems]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const mediaQuery = window.matchMedia("(max-width: 768px)");
        const syncMobileLayout = () => {
            const mobile = mediaQuery.matches;
            setIsMobileSettingsLayout(mobile);
            setMobileView(mobile ? "categories" : "detail");
        };

        syncMobileLayout();

        if (typeof mediaQuery.addEventListener === "function") {
            mediaQuery.addEventListener("change", syncMobileLayout);
            return () => mediaQuery.removeEventListener("change", syncMobileLayout);
        }

        mediaQuery.addListener(syncMobileLayout);
        return () => mediaQuery.removeListener(syncMobileLayout);
    }, []);

    useEffect(() => {
        setPreferredLanguage(language);
    }, [language]);

    useEffect(() => {
        setPreferredCurrency(currency);
    }, [currency]);

    useEffect(() => {
        const localCodes = getLocalIsoCurrencyCodes();
        if (localCodes.length > 0) {
            setAvailableCurrencies((current) => mergeCurrencyCodes(current, localCodes));
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        const hydrate = async () => {
            try {
                const res = await fetch("/api/currency/rates?base=USD", { method: "GET", cache: "no-store" });
                const payload = (await res.json().catch(() => null)) as
                    | { ok?: boolean; rates?: Record<string, number>; codes?: string[] }
                    | null;
                if (!res.ok || !payload?.ok || cancelled) return;

                const codes = (payload.codes ?? Object.keys(payload.rates ?? {}))
                    .map((code) => code.toUpperCase())
                    .filter((code): code is string => isIsoCurrencyCode(code));

                if (codes.length === 0) return;
                setAvailableCurrencies((current) => mergeCurrencyCodes(current, codes));
            } catch {
                // Keep local fallback currency options.
            }
        };

        void hydrate();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        setProfileFirstName(firstName);
    }, [firstName]);

    useEffect(() => {
        setProfileLastName(lastName);
    }, [lastName]);

    useEffect(() => {
        setProfileEmail(email);
    }, [email]);

    useEffect(() => {
        const parsed = splitStoredPhone(phone);
        setProfilePhoneCountryCode(COUNTRY_CODE_SET.has(parsed.countryCode) ? parsed.countryCode : DEFAULT_COUNTRY_CODE);
        setProfilePhoneNationalNumber(parsed.nationalNumber);
    }, [phone]);

    useEffect(() => {
        setProfileLanguage(language);
    }, [language]);

    useEffect(() => {
        setProfileTimeZone(timeZone);
    }, [timeZone]);

    useEffect(() => {
        setProfileActiveStoreId(activeStoreId);
    }, [activeStoreId]);

    useEffect(() => {
        setGeneralDateFormat(dateFormat);
    }, [dateFormat]);

    useEffect(() => {
        setGeneralWeekStartDay(weekStartDay);
    }, [weekStartDay]);

    useEffect(() => {
        setGeneralDefaultTimeZone(defaultTimeZone);
    }, [defaultTimeZone]);

    useEffect(() => {
        setGeneralDefaultCurrency(defaultCurrency);
    }, [defaultCurrency]);

    useEffect(() => {
        setGeneralStoreCurrency(storeDefaultCurrency);
    }, [storeDefaultCurrency]);

    useEffect(() => {
        setGeneralBackupRegionCountry(resolveCountryCode(storeBackupRegionCountry));
    }, [storeBackupRegionCountry]);

    useEffect(() => {
        setGeneralUnitSystem(storeUnitSystem === "IMPERIAL" ? "IMPERIAL" : "METRIC");
    }, [storeUnitSystem]);

    useEffect(() => {
        setGeneralStoreTimeZone(storeTimeZone);
    }, [storeTimeZone]);

    useEffect(() => {
        setGeneralProductCodePrefix(getProductCodePrefixInputValue(productCodePrefix));
    }, [productCodePrefix]);

    useEffect(() => {
        setGeneralProductCodeSuffix(productCodeSuffix.toUpperCase());
    }, [productCodeSuffix]);

    useEffect(() => {
        setBusinessDetailsName(businessName);
    }, [businessName]);

    useEffect(() => {
        setBusinessDetailsCountry(resolveCountryCode(businessCountry));
    }, [businessCountry]);

    useEffect(() => {
        setBusinessDetailsType(parseBusinessType(businessType) ?? "INDIVIDUAL");
    }, [businessType]);

    useEffect(() => {
        setBusinessDetailsLegalFirstName(businessLegalFirstName);
    }, [businessLegalFirstName]);

    useEffect(() => {
        setBusinessDetailsLegalLastName(businessLegalLastName);
    }, [businessLegalLastName]);

    useEffect(() => {
        setBusinessDetailsStreetAndHouseNumber(joinStreetAndHouseNumber(businessStreet, businessHouseNumber));
    }, [businessHouseNumber, businessStreet]);

    useEffect(() => {
        setBusinessDetailsAddressLine2(businessAddressLine2);
    }, [businessAddressLine2]);

    useEffect(() => {
        setBusinessDetailsPostalCode(businessPostalCode);
    }, [businessPostalCode]);

    useEffect(() => {
        setBusinessDetailsCity(businessCity);
    }, [businessCity]);

    useEffect(() => {
        setBusinessDetailsEmail(businessEmail);
    }, [businessEmail]);

    useEffect(() => {
        const parsed = splitStoredPhone(businessPhone);
        setBusinessDetailsPhoneCountryCode(COUNTRY_CODE_SET.has(parsed.countryCode) ? parsed.countryCode : DEFAULT_COUNTRY_CODE);
        setBusinessDetailsPhoneNationalNumber(parsed.nationalNumber);
    }, [businessPhone]);

    const primaryNavItems = useMemo(
        () => navItems.filter(
            (item) => item.id !== "storeAccess" && item.id !== "team" && item.id !== "feedback" && item.id !== "loginLogs"
        ),
        [navItems]
    );

    const adminNavItems = useMemo(() => {
        if (!canManageTeam) return [];
        return navItems.filter((item) => (
            item.id === "storeAccess" || item.id === "team" || (isAdmin && (item.id === "feedback" || item.id === "loginLogs"))
        ));
    }, [canManageTeam, isAdmin, navItems]);

    const settingsSearchEntries = useMemo(() => {
        const byId = new Map(settingsItems.map((item) => [item.id, item] as const));
        const profileItem = byId.get("profile") ?? PROFILE_ITEM;
        const businessItem = byId.get("businessDetails") ?? SETTINGS_ITEMS[0];
        const generalItem = byId.get("general") ?? SETTINGS_ITEMS[1];
        const storesItem = byId.get("storeAccess") ?? MANAGEMENT_STORES_ITEM;
        const teamItem = byId.get("team") ?? ADMIN_TEAM_ITEM;
        const feedbackItem = byId.get("feedback") ?? ADMIN_FEEDBACK_ITEM;
        const loginLogsItem = byId.get("loginLogs") ?? ADMIN_LOGIN_LOGS_ITEM;
        const entries: SettingsSearchEntry[] = [];

        const addEntry = ({
            id,
            targetId,
            title,
            pageTitle,
            icon,
            keywords,
        }: {
            id: string;
            targetId: string;
            title: string;
            pageTitle: string;
            icon: SettingsItem["icon"];
            keywords: string[];
        }) => {
            const searchableText = normalizeSearchText([title, pageTitle, ...keywords].join(" "));
            entries.push({ id, targetId, title, pageTitle, icon, searchableText });
        };

        addEntry({
            id: "profile-identity",
            targetId: "profile",
            title: uiText.profile.identityTitle,
            pageTitle: profileItem.title,
            icon: profileItem.icon,
            keywords: [
                uiText.profile.identitySubtitle,
                uiText.profile.firstName,
                uiText.profile.lastName,
                profileFirstName,
                profileLastName,
                "account name required",
            ],
        });
        addEntry({
            id: "profile-contact",
            targetId: "profile",
            title: uiText.profile.contactTitle,
            pageTitle: profileItem.title,
            icon: profileItem.icon,
            keywords: [
                uiText.profile.contactSubtitle,
                uiText.profile.emailOptional,
                uiText.profile.phoneOptional,
                profileEmail,
                profilePhone,
                "email phone contact",
            ],
        });
        addEntry({
            id: "profile-stores",
            targetId: "profile",
            title: uiText.profile.storesTitle,
            pageTitle: profileItem.title,
            icon: Store,
            keywords: [
                uiText.profile.storesSubtitle,
                uiText.profile.activeStore,
                ...stores.map((store) => `${store.name} ${store.slug}`),
                "store active store",
            ],
        });
        addEntry({
            id: "profile-language",
            targetId: "profile",
            title: uiText.profile.preferredLanguageTitle,
            pageTitle: profileItem.title,
            icon: profileItem.icon,
            keywords: [
                uiText.profile.languageLabel,
                ...SUPPORTED_LANGUAGES.map((code) => LANGUAGE_NATIVE_LABELS[code]),
                "language locale",
            ],
        });
        addEntry({
            id: "profile-timezone",
            targetId: "profile",
            title: uiText.profile.timeZoneTitle,
            pageTitle: profileItem.title,
            icon: Clock3,
            keywords: [
                uiText.profile.timeZoneLabel,
                profileTimeZone,
                ...profileTimeZoneOptions.map((option) => option.label),
                "timezone time zone",
            ],
        });

        addEntry({
            id: "business-details",
            targetId: "businessDetails",
            title: uiText.business.title,
            pageTitle: businessItem.title,
            icon: businessItem.icon,
            keywords: [
                uiText.business.subtitle,
                uiText.business.businessName,
                uiText.business.country,
                uiText.business.businessType,
                uiText.business.legalFirstName,
                uiText.business.legalLastName,
                uiText.business.street,
                uiText.business.houseNumber,
                uiText.business.addressLine2,
                uiText.business.postalCode,
                uiText.business.city,
                uiText.business.email,
                uiText.business.phone,
                businessDetailsName,
                getCountryLabel(businessDetailsCountry, ""),
                businessDetailsLegalFirstName,
                businessDetailsLegalLastName,
                businessDetailsStreetAndHouseNumber,
                businessDetailsAddressLine2,
                businessDetailsPostalCode,
                businessDetailsCity,
                businessDetailsEmail,
                businessDetailsPhone,
                ...BUSINESS_TYPE_CODES.map((code) => businessTypeLabels[code]),
                "individual incorporated partnership corporation nonprofit",
            ],
        });

        addEntry({
            id: "general-store-defaults",
            targetId: "general",
            title: uiText.general.storeDefaultsTitle,
            pageTitle: generalItem.title,
            icon: generalItem.icon,
            keywords: [
                uiText.general.storeDefaultsSubtitle,
                uiText.general.storeCurrency,
                uiText.general.backupRegionCountry,
                uiText.general.unitSystem,
                uiText.general.unitSystemMetric,
                uiText.general.unitSystemImperial,
                uiText.general.storeTimeZone,
                uiText.general.accountSettingsHint,
                generalStoreCurrency,
                getCountryLabel(generalBackupRegionCountry, ""),
                generalUnitSystem,
                generalStoreTimeZone,
                ...storeCurrencyOptions.map((code) => storeCurrencyLabelByCode.get(code) ?? messages.currencyValues[code] ?? code),
                ...generalTimeZoneOptions.map((option) => option.label),
                "defaults currency country unit system",
            ],
        });
        addEntry({
            id: "profile-currency",
            targetId: "profile",
            title: uiText.languagePanel.preferredCurrency,
            pageTitle: profileItem.title,
            icon: profileItem.icon,
            keywords: [
                uiText.languagePanel.preferredCurrency,
                preferredCurrency,
                ...preferredCurrencyOptions.map((code) => preferredCurrencyLabelByCode.get(code) ?? messages.currencyValues[code] ?? code),
                "personal currency dashboard currency",
            ],
        });
        addEntry({
            id: "general-order-id-format",
            targetId: "general",
            title: uiText.general.orderIdFormatTitle,
            pageTitle: generalItem.title,
            icon: generalItem.icon,
            keywords: [
                uiText.general.orderIdFormatSubtitle,
                uiText.general.productCodePrefix,
                uiText.general.productCodeSuffix,
                uiText.general.orderIdExample,
                generalProductCodePrefix,
                generalProductCodeSuffix,
                generalOrderIdExample,
                "product code id prefix suffix",
            ],
        });

        if (canManageStores) {
            addEntry({
                id: "stores-overview",
                targetId: "storeAccess",
                title: storesItem.title,
                pageTitle: storesItem.title,
                icon: storesItem.icon,
                keywords: [
                    storesItem.subtitle,
                    storesItem.blurb,
                    "stores store details store information",
                    ...(isAdmin ? ["create store new store"] : ["assigned stores manager stores"]),
                    ...managedStores.flatMap((store) => [
                        store.name,
                        store.slug,
                        getCountryLabel(store.businessCountry, ""),
                        formatOptionalValue(store.businessCity, ""),
                        formatOptionalValue(store.businessEmail, ""),
                    ]),
                ],
            });
        }

        if (canManageTeam) {
            addEntry({
                id: "team-add-user",
                targetId: "team",
                title: "Add user",
                pageTitle: teamItem.title,
                icon: teamItem.icon,
                keywords: [
                    "first name",
                    "last name",
                    "employee id",
                    "password",
                    "store",
                    "role",
                    "create employee",
                    "create manager",
                    "team user",
                ],
            });
            addEntry({
                id: "team-user-list",
                targetId: "team",
                title: isAdmin ? "Managers and employees" : "Employees",
                pageTitle: teamItem.title,
                icon: teamItem.icon,
                keywords: [
                    "team list",
                    "delete user",
                    "connected store",
                    "users",
                    "employees",
                    "managers",
                ],
            });
        }

        if (isAdmin) {
            addEntry({
                id: "feedback-inbox",
                targetId: "feedback",
                title: "Admin feedback inbox",
                pageTitle: feedbackItem.title,
                icon: feedbackItem.icon,
                keywords: ["feedback", "issue", "idea", "inbox", "report", "message"],
            });
            addEntry({
                id: "login-logs",
                targetId: "loginLogs",
                title: "User login logs",
                pageTitle: loginLogsItem.title,
                icon: loginLogsItem.icon,
                keywords: ["login", "sign in", "audit", "logs", "auth login"],
            });
        }

        return entries;
    }, [
        businessDetailsAddressLine2,
        businessDetailsCity,
        businessDetailsCountry,
        businessDetailsEmail,
        businessDetailsLegalFirstName,
        businessDetailsLegalLastName,
        businessDetailsName,
        businessDetailsPhone,
        businessDetailsPostalCode,
        businessDetailsStreetAndHouseNumber,
        businessTypeLabels,
        canManageStores,
        canManageTeam,
        generalBackupRegionCountry,
        generalOrderIdExample,
        generalProductCodePrefix,
        generalProductCodeSuffix,
        generalStoreCurrency,
        generalStoreTimeZone,
        generalTimeZoneOptions,
        generalUnitSystem,
        isAdmin,
        managedStores,
        messages.currencyValues,
        preferredCurrency,
        preferredCurrencyLabelByCode,
        preferredCurrencyOptions,
        profileEmail,
        profileFirstName,
        profileLastName,
        profilePhone,
        profileTimeZone,
        profileTimeZoneOptions,
        settingsItems,
        storeCurrencyLabelByCode,
        storeCurrencyOptions,
        stores,
        uiText,
    ]);

    const normalizedQuery = useMemo(() => normalizeSearchText(query), [query]);
    const hasSearchQuery = normalizedQuery.length > 0;

    useEffect(() => {
        if (!hasSearchQuery) {
            setSearchLoading(false);
            setSearchResults([]);
            return;
        }

        setSearchLoading(true);

        const timeout = window.setTimeout(() => {
            const tokens = normalizedQuery.split(" ").filter(Boolean);
            const results = settingsSearchEntries.filter((entry) => tokens.every((token) => entry.searchableText.includes(token)));
            setSearchResults(results);
            setSearchLoading(false);
        }, SEARCH_RESULTS_DELAY_MS);

        return () => window.clearTimeout(timeout);
    }, [hasSearchQuery, normalizedQuery, settingsSearchEntries]);

    const resolvedActiveId = useMemo(() => {
        return settingsItems.some((item) => item.id === activeId) ? activeId : settingsItems[0].id;
    }, [activeId, settingsItems]);

    const activeItem = useMemo(
        () => settingsItems.find((item) => item.id === resolvedActiveId) ?? settingsItems[0],
        [resolvedActiveId, settingsItems]
    );
    const isMobileCategoriesView = isMobileSettingsLayout && mobileView === "categories";
    const isMobileDetailView = isMobileSettingsLayout && mobileView === "detail";

    const profileInitials = useMemo(() => {
        const source = profileName.replace(/[^a-zA-Z0-9 ]/g, " ").trim();
        const words = source.split(/\s+/).filter(Boolean);
        if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
        const raw = source.replace(/\s+/g, "");
        if (!raw) return "U";
        return raw.slice(0, 2).toUpperCase();
    }, [profileName]);

    const profileDirty = useMemo(() => {
        const initialProfilePhone = composeStoredPhone(
            splitStoredPhone(phone).countryCode,
            splitStoredPhone(phone).nationalNumber
        );
        return (
            profileFirstName.trim() !== firstName.trim()
            || profileLastName.trim() !== lastName.trim()
            || profileEmail.trim() !== email.trim()
            || profilePhone.trim() !== initialProfilePhone.trim()
            || profileLanguage !== language
            || profileTimeZone !== timeZone
            || profileActiveStoreId !== activeStoreId
            || preferredCurrency !== currency
        );
    }, [activeStoreId, currency, email, firstName, language, lastName, phone, preferredCurrency, profileActiveStoreId, profileEmail, profileFirstName, profileLanguage, profileLastName, profilePhone, profileTimeZone, timeZone]);

    const preferredCurrencyDirty = useMemo(() => (
        preferredCurrency !== currency
    ), [currency, preferredCurrency]);

    const generalStoreDefaultsDirty = useMemo(() => {
        return (
            generalStoreCurrency !== storeDefaultCurrency
            || generalBackupRegionCountry !== resolveCountryCode(storeBackupRegionCountry)
            || generalUnitSystem !== (storeUnitSystem === "IMPERIAL" ? "IMPERIAL" : "METRIC")
            || generalStoreTimeZone !== storeTimeZone
            || normalizeProductCodePrefixInput(generalProductCodePrefix) !== normalizeProductCodePrefixInput(productCodePrefix)
            || generalProductCodeSuffix.trim() !== productCodeSuffix.trim().toUpperCase()
        );
    }, [
        generalBackupRegionCountry,
        generalProductCodePrefix,
        generalProductCodeSuffix,
        generalStoreCurrency,
        generalStoreTimeZone,
        generalUnitSystem,
        productCodePrefix,
        productCodeSuffix,
        storeDefaultCurrency,
        storeBackupRegionCountry,
        storeTimeZone,
        storeUnitSystem,
    ]);

    const generalDateFormatDirty = useMemo(() => generalDateFormat !== dateFormat, [dateFormat, generalDateFormat]);
    const generalWeekStartDayDirty = useMemo(() => generalWeekStartDay !== weekStartDay, [generalWeekStartDay, weekStartDay]);
    const generalDefaultTimeZoneDirty = useMemo(
        () => generalDefaultTimeZone.trim() !== defaultTimeZone.trim(),
        [defaultTimeZone, generalDefaultTimeZone]
    );
    const generalDefaultCurrencyDirty = useMemo(() => generalDefaultCurrency !== defaultCurrency, [defaultCurrency, generalDefaultCurrency]);

    const generalDirty = useMemo(() => {
        return (
            generalStoreDefaultsDirty
            || generalDateFormatDirty
            || generalWeekStartDayDirty
            || generalDefaultTimeZoneDirty
            || generalDefaultCurrencyDirty
        );
    }, [
        generalDateFormatDirty,
        generalDefaultCurrencyDirty,
        generalDefaultTimeZoneDirty,
        generalStoreDefaultsDirty,
        generalWeekStartDayDirty,
    ]);

    const businessDetailsDirty = useMemo(() => {
        const initialBusinessPhone = composeStoredPhone(
            splitStoredPhone(businessPhone).countryCode,
            splitStoredPhone(businessPhone).nationalNumber
        );
        return (
            businessDetailsName.trim() !== businessName.trim()
            || businessDetailsCountry !== resolveCountryCode(businessCountry)
            || businessDetailsType !== (parseBusinessType(businessType) ?? "INDIVIDUAL")
            || businessDetailsLegalFirstName.trim() !== businessLegalFirstName.trim()
            || businessDetailsLegalLastName.trim() !== businessLegalLastName.trim()
            || businessDetailsStreetAndHouseNumber.trim() !== joinStreetAndHouseNumber(businessStreet, businessHouseNumber)
            || businessDetailsAddressLine2.trim() !== businessAddressLine2.trim()
            || businessDetailsPostalCode.trim() !== businessPostalCode.trim()
            || businessDetailsCity.trim() !== businessCity.trim()
            || businessDetailsEmail.trim() !== businessEmail.trim()
            || businessDetailsPhone.trim() !== initialBusinessPhone.trim()
        );
    }, [
        businessDetailsName,
        businessCountry,
        businessDetailsAddressLine2,
        businessDetailsCity,
        businessDetailsCountry,
        businessDetailsEmail,
        businessDetailsLegalFirstName,
        businessDetailsLegalLastName,
        businessDetailsPhone,
        businessDetailsPostalCode,
        businessDetailsStreetAndHouseNumber,
        businessDetailsType,
        businessAddressLine2,
        businessName,
        businessCity,
        businessEmail,
        businessHouseNumber,
        businessLegalFirstName,
        businessLegalLastName,
        businessPhone,
        businessPostalCode,
        businessStreet,
        businessType,
    ]);

    const showHeaderActions = (
        (activeItem.id === "profile" && profileDirty)
        || (activeItem.id === "businessDetails" && businessDetailsDirty)
        || (activeItem.id === "general" && generalDirty)
    );
    const hasPendingChanges = showHeaderActions || headerSaving || businessDetailsSaving;
    const profileCombinedError = profileError ?? preferencesError;
    const generalCombinedError = generalError;

    const triggerPendingAttention = useCallback(() => {
        if (typeof window === "undefined") return;
        window.dispatchEvent(new Event(PENDING_CHANGES_ATTENTION_EVENT));
    }, []);

    useEffect(() => {
        if (!hasPendingChanges) return;

        const onSearchHotkeyCapture = (event: KeyboardEvent) => {
            const pressedK = event.key.toLowerCase() === "k";
            if ((event.metaKey || event.ctrlKey) && pressedK) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                triggerPendingAttention();
            }
        };

        document.addEventListener("keydown", onSearchHotkeyCapture, true);
        return () => document.removeEventListener("keydown", onSearchHotkeyCapture, true);
    }, [hasPendingChanges, triggerPendingAttention]);

    const tryChangeActiveId = useCallback(
        (nextId: string) => {
            if (nextId === activeItem.id) return true;
            if (hasPendingChanges) {
                triggerPendingAttention();
                return false;
            }
            setActiveId(nextId);
            return true;
        },
        [activeItem.id, hasPendingChanges, triggerPendingAttention]
    );

    const openSettingsItem = useCallback((nextId: string) => {
        const opened = tryChangeActiveId(nextId);
        if (!opened) return;
        if (isMobileSettingsLayout) setMobileView("detail");
    }, [isMobileSettingsLayout, tryChangeActiveId]);

    const goBackToSettingsCategories = useCallback(() => {
        if (!isMobileSettingsLayout) return;
        if (hasPendingChanges) {
            triggerPendingAttention();
            return;
        }
        setMobileView("categories");
    }, [hasPendingChanges, isMobileSettingsLayout, triggerPendingAttention]);

    useEffect(() => {
        setTeamCanManageManagers(isAdmin);
        setManagedStoresCanCreate(isAdmin);
        if (!isAdmin) setTeamRole("EMPLOYEE");
    }, [isAdmin]);

    const loadTeamUsers = useCallback(async () => {
        if (!canManageTeam) return;
        setTeamLoading(true);
        setTeamError(null);

        try {
            const res = await fetch("/api/team/users", {
                method: "GET",
                cache: "no-store",
            });
            const payload = (await res.json().catch(() => null)) as
                | {
                    ok?: boolean;
                    message?: string;
                    users?: TeamManagedUser[];
                    stores?: TeamUserStore[];
                    canManageManagers?: boolean;
                    nextEmployeeId?: string;
                }
                | null;

            if (!res.ok || !payload?.ok) {
                throw new Error(payload?.message || "Unable to load team users.");
            }

            const stores = payload.stores ?? [];
            setTeamUsers(payload.users ?? []);
            setTeamStores(stores);
            setTeamCanManageManagers(!!payload.canManageManagers);
            setTeamEmployeeIdPreview(
                typeof payload?.nextEmployeeId === "string" && payload.nextEmployeeId.trim()
                    ? payload.nextEmployeeId.trim().toUpperCase()
                    : "EMP0001"
            );
            setTeamStoreId((current) => {
                if (current && stores.some((store) => store.id === current)) return current;
                return stores[0]?.id ?? "";
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unable to load team users.";
            setTeamError(message);
        } finally {
            setTeamLoading(false);
        }
    }, [canManageTeam]);

    useEffect(() => {
        if (!canManageTeam || activeItem.id !== "team") return;
        void loadTeamUsers();
    }, [activeItem.id, canManageTeam, loadTeamUsers]);

    async function onCreateTeamUser() {
        if (!canManageTeam || teamCreating) return;

        const nextFirstName = teamFirstName.trim();
        const nextLastName = teamLastName.trim();
        const nextPassword = teamPassword;
        const nextRole: "MANAGER" | "EMPLOYEE" = isAdmin && teamRole === "MANAGER" ? "MANAGER" : "EMPLOYEE";

        if (!nextFirstName || !nextLastName) {
            setTeamError("First name and last name are required.");
            return;
        }

        if (nextPassword.length < 8) {
            setTeamError("Password must be at least 8 characters.");
            return;
        }

        if (!teamStoreId) {
            setTeamError("Please select a store.");
            return;
        }

        setTeamCreating(true);
        setTeamError(null);

        try {
            const res = await fetch("/api/team/users", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    firstName: nextFirstName,
                    lastName: nextLastName,
                    password: nextPassword,
                    role: nextRole,
                    storeId: teamStoreId,
                }),
            });
            const payload = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
            if (!res.ok || !payload?.ok) {
                throw new Error(payload?.message || "Unable to create user.");
            }

            setTeamFirstName("");
            setTeamLastName("");
            setTeamPassword("");
            if (!isAdmin) setTeamRole("EMPLOYEE");
            await loadTeamUsers();
        } catch (error: unknown) {
            setTeamError(error instanceof Error ? error.message : "Unable to create user.");
        } finally {
            setTeamCreating(false);
        }
    }

    async function onDeleteTeamUser(userId: string) {
        if (!canManageTeam || teamDeletingUserId || teamCreating) return;
        const target = teamUsers.find((entry) => entry.id === userId);
        const label = target ? `${target.firstName} ${target.lastName}`.trim() || target.employeeId : "this user";
        if (!window.confirm(`Delete ${label}?`)) return;

        setTeamDeletingUserId(userId);
        setTeamError(null);

        try {
            const res = await fetch("/api/team/users", {
                method: "DELETE",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            const payload = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
            if (!res.ok || !payload?.ok) {
                throw new Error(payload?.message || "Unable to delete user.");
            }

            setTeamUsers((current) => current.filter((entry) => entry.id !== userId));
        } catch (error: unknown) {
            setTeamError(error instanceof Error ? error.message : "Unable to delete user.");
        } finally {
            setTeamDeletingUserId(null);
        }
    }

    const fetchLoginLogsPage = useCallback(async (offset: number) => {
        const params = new URLSearchParams({
            offset: `${offset}`,
            limit: `${LOGIN_LOGS_PAGE_SIZE}`,
        });
        const res = await fetch(`/api/admin/login-logs?${params.toString()}`, {
            method: "GET",
            cache: "no-store",
        });
        const payload = (await res.json().catch(() => null)) as
            | { ok?: boolean; message?: string; items?: LoginLogItem[]; hasMore?: boolean }
            | null;

        if (!res.ok || !payload?.ok) {
            throw new Error(payload?.message || "Unable to load login logs.");
        }

        return {
            items: payload.items ?? [],
            hasMore: !!payload.hasMore,
        };
    }, []);

    const loadLoginLogs = useCallback(async () => {
        if (!isAdmin) return;
        setLoginLogsLoading(true);
        setLoginLogsLoadingMore(false);
        setLoginLogsError(null);

        try {
            const page = await fetchLoginLogsPage(0);
            setLoginLogs(page.items);
            setLoginLogsHasMore(page.hasMore);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unable to load login logs.";
            setLoginLogsError(message);
            setLoginLogsHasMore(false);
        } finally {
            setLoginLogsLoading(false);
        }
    }, [fetchLoginLogsPage, isAdmin]);

    const loadMoreLoginLogs = useCallback(async () => {
        if (!isAdmin || loginLogsLoading || loginLogsLoadingMore || !loginLogsHasMore) return;
        setLoginLogsLoadingMore(true);
        setLoginLogsError(null);

        try {
            const page = await fetchLoginLogsPage(loginLogs.length);
            setLoginLogs((current) => {
                const existingIds = new Set(current.map((entry) => entry.id));
                const append = page.items.filter((entry) => !existingIds.has(entry.id));
                return append.length > 0 ? [...current, ...append] : current;
            });
            setLoginLogsHasMore(page.hasMore);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unable to load login logs.";
            setLoginLogsError(message);
        } finally {
            setLoginLogsLoadingMore(false);
        }
    }, [fetchLoginLogsPage, isAdmin, loginLogs.length, loginLogsHasMore, loginLogsLoading, loginLogsLoadingMore]);

    useEffect(() => {
        if (!isAdmin || activeItem.id !== "loginLogs") return;
        void loadLoginLogs();
    }, [activeItem.id, isAdmin, loadLoginLogs]);

    useEffect(() => {
        if (!isAdmin || activeItem.id !== "loginLogs" || !loginLogsHasMore) return;
        const root = loginLogsScrollerRef.current;
        const sentinel = loginLogsSentinelRef.current;
        if (!root || !sentinel) return;

        const observer = new IntersectionObserver((entries) => {
            const visible = entries.some((entry) => entry.isIntersecting);
            if (visible) void loadMoreLoginLogs();
        }, {
            root,
            rootMargin: "120px 0px",
            threshold: 0,
        });

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [activeItem.id, isAdmin, loginLogsHasMore, loadMoreLoginLogs]);

    const fetchFeedbackInboxPage = useCallback(async (offset: number, kind: "ALL" | "ISSUE" | "IDEA") => {
        const params = new URLSearchParams({
            offset: `${offset}`,
            limit: `${FEEDBACK_INBOX_PAGE_SIZE}`,
        });
        if (kind !== "ALL") {
            params.set("kind", kind);
        }

        const res = await fetch(`/api/admin/feedback?${params.toString()}`, {
            method: "GET",
            cache: "no-store",
        });
        const payload = (await res.json().catch(() => null)) as
            | { ok?: boolean; message?: string; items?: FeedbackInboxItem[]; hasMore?: boolean }
            | null;

        if (!res.ok || !payload?.ok) {
            throw new Error(payload?.message || "Unable to load feedback inbox.");
        }

        return {
            items: payload.items ?? [],
            hasMore: !!payload.hasMore,
        };
    }, []);

    const loadFeedbackInbox = useCallback(async () => {
        if (!isAdmin) return;
        setFeedbackLoading(true);
        setFeedbackLoadingMore(false);
        setFeedbackError(null);

        try {
            const page = await fetchFeedbackInboxPage(0, feedbackKindFilter);
            setFeedbackItems(page.items);
            setFeedbackHasMore(page.hasMore);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unable to load feedback inbox.";
            setFeedbackError(message);
            setFeedbackHasMore(false);
        } finally {
            setFeedbackLoading(false);
        }
    }, [feedbackKindFilter, fetchFeedbackInboxPage, isAdmin]);

    const loadMoreFeedbackInbox = useCallback(async () => {
        if (!isAdmin || feedbackLoading || feedbackLoadingMore || !feedbackHasMore) return;
        setFeedbackLoadingMore(true);
        setFeedbackError(null);

        try {
            const page = await fetchFeedbackInboxPage(feedbackItems.length, feedbackKindFilter);
            setFeedbackItems((current) => {
                const existingIds = new Set(current.map((entry) => entry.id));
                const append = page.items.filter((entry) => !existingIds.has(entry.id));
                return append.length > 0 ? [...current, ...append] : current;
            });
            setFeedbackHasMore(page.hasMore);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unable to load feedback inbox.";
            setFeedbackError(message);
        } finally {
            setFeedbackLoadingMore(false);
        }
    }, [
        feedbackHasMore,
        feedbackItems.length,
        feedbackKindFilter,
        feedbackLoading,
        feedbackLoadingMore,
        fetchFeedbackInboxPage,
        isAdmin,
    ]);

    useEffect(() => {
        if (!isAdmin || activeItem.id !== "feedback") return;
        void loadFeedbackInbox();
    }, [activeItem.id, isAdmin, loadFeedbackInbox]);

    useEffect(() => {
        if (!isAdmin || activeItem.id !== "feedback" || !feedbackHasMore) return;
        const root = feedbackScrollerRef.current;
        const sentinel = feedbackSentinelRef.current;
        if (!root || !sentinel) return;

        const observer = new IntersectionObserver((entries) => {
            const visible = entries.some((entry) => entry.isIntersecting);
            if (visible) void loadMoreFeedbackInbox();
        }, {
            root,
            rootMargin: "120px 0px",
            threshold: 0,
        });

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [activeItem.id, feedbackHasMore, isAdmin, loadMoreFeedbackInbox]);

    const loadManagedStores = useCallback(async (preferredStoreId?: string) => {
        if (!canManageStores) return;
        setManagedStoresLoading(true);
        setManagedStoresError(null);

        try {
            const res = await fetch("/api/stores/manage", {
                method: "GET",
                cache: "no-store",
            });
            const payload = (await res.json().catch(() => null)) as
                | { ok?: boolean; message?: string; stores?: ManagedStore[]; canCreate?: boolean }
                | null;

            if (!res.ok || !payload?.ok) {
                throw new Error(payload?.message || "Unable to load stores.");
            }

            const stores = Array.isArray(payload.stores) ? payload.stores : [];
            setManagedStores(stores);
            setManagedStoresCanCreate(Boolean(payload.canCreate));
            setSelectedManagedStoreId((current) => {
                if (preferredStoreId && stores.some((store) => store.id === preferredStoreId)) return preferredStoreId;
                if (current && stores.some((store) => store.id === current)) return current;
                return stores[0]?.id ?? null;
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unable to load stores.";
            setManagedStoresError(message);
        } finally {
            setManagedStoresLoading(false);
        }
    }, [canManageStores]);

    useEffect(() => {
        if (!canManageStores || activeItem.id !== "storeAccess") return;
        void loadManagedStores();
    }, [activeItem.id, canManageStores, loadManagedStores]);

    const selectedManagedStore = useMemo(() => {
        if (!selectedManagedStoreId) return null;
        return managedStores.find((store) => store.id === selectedManagedStoreId) ?? null;
    }, [managedStores, selectedManagedStoreId]);

    async function onDeleteFeedback(id: string) {
        if (!isAdmin || deletingFeedbackId) return;
        setDeletingFeedbackId(id);
        setFeedbackError(null);

        try {
            const res = await fetch("/api/admin/feedback", {
                method: "DELETE",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ id }),
            });
            const payload = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
            if (!res.ok || !payload?.ok) {
                throw new Error(payload?.message || "Unable to delete feedback message.");
            }

            await loadFeedbackInbox();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unable to delete feedback message.";
            setFeedbackError(message);
        } finally {
            setDeletingFeedbackId(null);
        }
    }

    async function onCreateStore() {
        if (!managedStoresCanCreate || creatingStore) return;

        const nextName = createStoreName.trim();
        if (!nextName) {
            setManagedStoresError("Store name is required.");
            return;
        }

        setCreatingStore(true);
        setManagedStoresError(null);

        try {
            const res = await fetch("/api/stores/manage", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ name: nextName }),
            });
            const payload = (await res.json().catch(() => null)) as
                | { ok?: boolean; message?: string; store?: { id?: string } }
                | null;

            if (!res.ok || !payload?.ok) {
                throw new Error(payload?.message || "Unable to create store.");
            }

            const createdId = typeof payload?.store?.id === "string" ? payload.store.id : undefined;
            setCreateStoreName("");
            await loadManagedStores(createdId);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unable to create store.";
            setManagedStoresError(message);
        } finally {
            setCreatingStore(false);
        }
    }

    const onSaveGeneralDateFormat = useCallback(async (options?: { refresh?: boolean }) => {
        const refresh = options?.refresh ?? true;
        if (generalSaving) return;

        setGeneralSaving(true);
        setGeneralSaved(false);
        setGeneralError(null);

        try {
            const res = await fetch("/api/user/preferences/date-format", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ dateFormat: generalDateFormat }),
            });

            const payload = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
            if (!res.ok || !payload?.ok) {
                throw new Error(payload?.message || "Unable to update date format.");
            }

            setGeneralSaved(true);
            if (refresh) router.refresh();
            return true;
        } catch (error: unknown) {
            setGeneralError(error instanceof Error ? error.message : "Unable to update date format.");
            return false;
        } finally {
            setGeneralSaving(false);
        }
    }, [generalDateFormat, generalSaving, router]);

    const onSaveGeneralWeekStartDay = useCallback(async (options?: { refresh?: boolean }) => {
        const refresh = options?.refresh ?? true;
        if (generalWeekStartSaving) return;

        setGeneralWeekStartSaving(true);
        setGeneralWeekStartSaved(false);
        setGeneralWeekStartError(null);

        try {
            const res = await fetch("/api/user/preferences/week-start-day", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ weekStartDay: generalWeekStartDay }),
            });

            const payload = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
            if (!res.ok || !payload?.ok) {
                throw new Error(payload?.message || "Unable to update week start day.");
            }

            setGeneralWeekStartSaved(true);
            if (refresh) router.refresh();
            return true;
        } catch (error: unknown) {
            setGeneralWeekStartError(error instanceof Error ? error.message : "Unable to update week start day.");
            return false;
        } finally {
            setGeneralWeekStartSaving(false);
        }
    }, [generalWeekStartDay, generalWeekStartSaving, router]);

    const onSaveGeneralDefaultTimeZone = useCallback(async (options?: { refresh?: boolean }) => {
        const refresh = options?.refresh ?? true;
        if (generalDefaultTimeZoneSaving) return;

        setGeneralDefaultTimeZoneSaving(true);
        setGeneralDefaultTimeZoneSaved(false);
        setGeneralDefaultTimeZoneError(null);

        try {
            const res = await fetch("/api/user/preferences/default-time-zone", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ defaultTimeZone: generalDefaultTimeZone }),
            });

            const payload = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
            if (!res.ok || !payload?.ok) {
                throw new Error(payload?.message || "Unable to update default time zone.");
            }

            setGeneralDefaultTimeZoneSaved(true);
            if (refresh) router.refresh();
            return true;
        } catch (error: unknown) {
            setGeneralDefaultTimeZoneError(error instanceof Error ? error.message : "Unable to update default time zone.");
            return false;
        } finally {
            setGeneralDefaultTimeZoneSaving(false);
        }
    }, [generalDefaultTimeZone, generalDefaultTimeZoneSaving, router]);

    const onSaveGeneralDefaultCurrency = useCallback(async (options?: { refresh?: boolean }) => {
        const refresh = options?.refresh ?? true;
        if (generalDefaultCurrencySaving) return;

        setGeneralDefaultCurrencySaving(true);
        setGeneralDefaultCurrencySaved(false);
        setGeneralDefaultCurrencyError(null);

        try {
            const res = await fetch("/api/user/preferences/default-currency", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ defaultCurrency: generalDefaultCurrency }),
            });

            const payload = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
            if (!res.ok || !payload?.ok) {
                throw new Error(payload?.message || "Unable to update default currency.");
            }

            setGeneralDefaultCurrencySaved(true);
            if (refresh) router.refresh();
            return true;
        } catch (error: unknown) {
            setGeneralDefaultCurrencyError(error instanceof Error ? error.message : "Unable to update default currency.");
            return false;
        } finally {
            setGeneralDefaultCurrencySaving(false);
        }
    }, [generalDefaultCurrency, generalDefaultCurrencySaving, router]);

    const onSaveGeneralStoreDefaults = useCallback(async (options?: { refresh?: boolean }) => {
        const refresh = options?.refresh ?? true;
        if (generalSaving) return;

        setGeneralSaving(true);
        setGeneralError(null);

        try {
            const res = await fetch("/api/user/stores/general-settings", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    defaultCurrency: generalStoreCurrency,
                    backupRegionCountry: generalBackupRegionCountry,
                    unitSystem: generalUnitSystem,
                    timeZone: generalStoreTimeZone,
                    productCodePrefix: generalProductCodePrefix.trim().toUpperCase(),
                    productCodeSuffix: generalProductCodeSuffix,
                }),
            });

            const payload = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
            if (!res.ok || !payload?.ok) {
                throw new Error(payload?.message || "Unable to update store defaults.");
            }

            if (refresh) router.refresh();
            return true;
        } catch (error: unknown) {
            setGeneralError(error instanceof Error ? error.message : "Unable to update store defaults.");
            return false;
        } finally {
            setGeneralSaving(false);
        }
    }, [
        generalBackupRegionCountry,
        generalProductCodePrefix,
        generalProductCodeSuffix,
        generalStoreCurrency,
        generalSaving,
        generalStoreTimeZone,
        generalUnitSystem,
        router,
    ]);

    const onSaveBusinessDetails = useCallback(async (options?: { refresh?: boolean }) => {
        const refresh = options?.refresh ?? true;
        if (businessDetailsSaving) return;
        const nextBusinessName = businessDetailsName.trim();
        if (!nextBusinessName) {
            setBusinessDetailsError("Business name is required.");
            return false;
        }

        setBusinessDetailsSaving(true);
        setBusinessDetailsError(null);
        const splitAddress = splitStreetAndHouseNumber(businessDetailsStreetAndHouseNumber);

        try {
            const res = await fetch("/api/user/stores/business-details", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    name: nextBusinessName,
                    country: businessDetailsCountry,
                    businessType: businessDetailsType,
                    legalFirstName: businessDetailsLegalFirstName,
                    legalLastName: businessDetailsLegalLastName,
                    street: splitAddress.street,
                    houseNumber: splitAddress.houseNumber,
                    addressLine2: businessDetailsAddressLine2,
                    postalCode: businessDetailsPostalCode,
                    city: businessDetailsCity,
                    email: businessDetailsEmail,
                    phone: businessDetailsPhone,
                }),
            });

            const payload = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
            if (!res.ok || !payload?.ok) {
                throw new Error(payload?.message || "Unable to update business details.");
            }

            if (refresh) router.refresh();
            return true;
        } catch (error: unknown) {
            setBusinessDetailsError(error instanceof Error ? error.message : "Unable to update business details.");
            return false;
        } finally {
            setBusinessDetailsSaving(false);
        }
    }, [
        businessDetailsAddressLine2,
        businessDetailsCity,
        businessDetailsCountry,
        businessDetailsEmail,
        businessDetailsLegalFirstName,
        businessDetailsLegalLastName,
        businessDetailsName,
        businessDetailsPhone,
        businessDetailsPostalCode,
        businessDetailsSaving,
        businessDetailsStreetAndHouseNumber,
        businessDetailsType,
        router,
    ]);

    async function onUpdateLanguage(next: LanguageCode) {
        if (updatingLanguage || next === preferredLanguage) return;

        const previous = preferredLanguage;
        setPreferredLanguage(next);
        setUiLanguage(next);
        setUpdatingLanguage(true);
        setPreferencesError(null);

        try {
            const res = await fetch("/api/user/preferences/language", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ language: next }),
            });

            const payload = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
            if (!res.ok || !payload?.ok) {
                throw new Error(payload?.message || "Unable to update language.");
            }

            router.refresh();
        } catch (error: unknown) {
            setPreferredLanguage(previous);
            setUiLanguage(previous);
            setPreferencesError(error instanceof Error ? error.message : "Unable to update language.");
        } finally {
            setUpdatingLanguage(false);
        }
    }

    const onSavePreferredCurrency = useCallback(async (options?: { refresh?: boolean }) => {
        const refresh = options?.refresh ?? true;
        if (updatingCurrency) return false;
        if (preferredCurrency === currency) return true;

        setUpdatingCurrency(true);
        setPreferencesError(null);

        try {
            const res = await fetch("/api/user/preferences/currency", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ currency: preferredCurrency }),
            });

            const payload = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
            if (!res.ok || !payload?.ok) {
                throw new Error(payload?.message || "Unable to update currency.");
            }

            if (refresh) router.refresh();
            return true;
        } catch (error: unknown) {
            setPreferencesError(error instanceof Error ? error.message : "Unable to update currency.");
            return false;
        } finally {
            setUpdatingCurrency(false);
        }
    }, [currency, preferredCurrency, router, updatingCurrency]);

    const onSaveProfile = useCallback(async (options?: { refresh?: boolean }) => {
        const refresh = options?.refresh ?? true;
        if (profileSaving) return;

        const nextFirstName = profileFirstName.trim();
        const nextLastName = profileLastName.trim();

        if (!nextFirstName || !nextLastName) {
            setProfileError(uiText.requiredNamesError);
            return;
        }

        setProfileSaving(true);
        setProfileError(null);
        setPreferencesError(null);

        try {
            const res = await fetch("/api/user/profile", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    firstName: nextFirstName,
                    lastName: nextLastName,
                    email: profileEmail,
                    phone: profilePhone,
                    preferredLanguage: profileLanguage,
                    timeZone: profileTimeZone,
                }),
            });

            const payload = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
            if (!res.ok || !payload?.ok) {
                throw new Error(payload?.message || "Unable to update profile.");
            }

            if (profileActiveStoreId !== activeStoreId) {
                const storeRes = await fetch("/api/user/stores/select", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ storeId: profileActiveStoreId }),
                });
                const storePayload = (await storeRes.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
                if (!storeRes.ok || !storePayload?.ok) {
                    throw new Error(storePayload?.message || "Unable to update active store.");
                }
            }

            if (preferredCurrencyDirty) {
                const currencySaved = await onSavePreferredCurrency({ refresh: false });
                if (!currencySaved) {
                    return false;
                }
            }

            setPreferredLanguage(profileLanguage);
            if (refresh) router.refresh();
            return true;
        } catch (error: unknown) {
            setProfileError(error instanceof Error ? error.message : "Unable to update profile.");
            return false;
        } finally {
            setProfileSaving(false);
        }
    }, [
        activeStoreId,
        onSavePreferredCurrency,
        profileActiveStoreId,
        preferredCurrencyDirty,
        profileEmail,
        profileFirstName,
        profileLanguage,
        profileLastName,
        profilePhone,
        profileSaving,
        profileTimeZone,
        router,
        uiText.requiredNamesError,
    ]);

    const onSaveActiveChanges = useCallback(async () => {
        if (headerSaving) return;

        setHeaderSaving(true);

        try {
            if (activeItem.id === "profile") {
                const ok = await onSaveProfile({ refresh: false });
                if (ok) router.refresh();
                return;
            }

            if (activeItem.id === "businessDetails") {
                const ok = await onSaveBusinessDetails({ refresh: false });
                if (ok) router.refresh();
                return;
            }

            if (activeItem.id === "general") {
                let ok = true;

                if (generalDateFormatDirty) {
                    ok = (await onSaveGeneralDateFormat({ refresh: false })) === true && ok;
                }
                if (generalWeekStartDayDirty) {
                    ok = (await onSaveGeneralWeekStartDay({ refresh: false })) === true && ok;
                }
                if (generalDefaultTimeZoneDirty) {
                    ok = (await onSaveGeneralDefaultTimeZone({ refresh: false })) === true && ok;
                }
                if (generalDefaultCurrencyDirty) {
                    ok = (await onSaveGeneralDefaultCurrency({ refresh: false })) === true && ok;
                }
                if (generalStoreDefaultsDirty) {
                    ok = (await onSaveGeneralStoreDefaults({ refresh: false })) === true && ok;
                }

                if (ok) router.refresh();
            }
        } finally {
            setHeaderSaving(false);
        }
    }, [
        activeItem.id,
        generalDateFormatDirty,
        generalDefaultCurrencyDirty,
        generalDefaultTimeZoneDirty,
        generalStoreDefaultsDirty,
        generalWeekStartDayDirty,
        headerSaving,
        onSaveBusinessDetails,
        onSaveGeneralDateFormat,
        onSaveGeneralDefaultCurrency,
        onSaveGeneralDefaultTimeZone,
        onSaveGeneralStoreDefaults,
        onSaveGeneralWeekStartDay,
        onSaveProfile,
        router,
    ]);

    const onCancelActiveChanges = useCallback(() => {
        if (activeItem.id === "profile") {
            setProfileFirstName(firstName);
            setProfileLastName(lastName);
            setProfileEmail(email);
            {
                const parsed = splitStoredPhone(phone);
                setProfilePhoneCountryCode(COUNTRY_CODE_SET.has(parsed.countryCode) ? parsed.countryCode : DEFAULT_COUNTRY_CODE);
                setProfilePhoneNationalNumber(parsed.nationalNumber);
            }
            setProfileLanguage(language);
            setUiLanguage(language);
            setPreferredCurrency(currency);
            setProfileTimeZone(timeZone);
            setProfileActiveStoreId(activeStoreId);
            setProfileError(null);
            setPreferencesError(null);
            return;
        }

        if (activeItem.id === "businessDetails") {
            setBusinessDetailsName(businessName);
            setBusinessDetailsCountry(resolveCountryCode(businessCountry));
            setBusinessDetailsType(parseBusinessType(businessType) ?? "INDIVIDUAL");
            setBusinessDetailsLegalFirstName(businessLegalFirstName);
            setBusinessDetailsLegalLastName(businessLegalLastName);
            setBusinessDetailsStreetAndHouseNumber(joinStreetAndHouseNumber(businessStreet, businessHouseNumber));
            setBusinessDetailsAddressLine2(businessAddressLine2);
            setBusinessDetailsPostalCode(businessPostalCode);
            setBusinessDetailsCity(businessCity);
            setBusinessDetailsEmail(businessEmail);
            {
                const parsed = splitStoredPhone(businessPhone);
                setBusinessDetailsPhoneCountryCode(COUNTRY_CODE_SET.has(parsed.countryCode) ? parsed.countryCode : DEFAULT_COUNTRY_CODE);
                setBusinessDetailsPhoneNationalNumber(parsed.nationalNumber);
            }
            setBusinessDetailsError(null);
            return;
        }

        if (activeItem.id === "general") {
            setGeneralStoreCurrency(storeDefaultCurrency);
            setGeneralDateFormat(dateFormat);
            setGeneralWeekStartDay(weekStartDay);
            setGeneralDefaultTimeZone(defaultTimeZone);
            setGeneralDefaultCurrency(defaultCurrency);
            setGeneralBackupRegionCountry(resolveCountryCode(storeBackupRegionCountry));
            setGeneralUnitSystem(storeUnitSystem === "IMPERIAL" ? "IMPERIAL" : "METRIC");
            setGeneralStoreTimeZone(storeTimeZone);
            setGeneralProductCodePrefix(getProductCodePrefixInputValue(productCodePrefix));
            setGeneralProductCodeSuffix(productCodeSuffix.toUpperCase());
            setGeneralError(null);
            setPreferencesError(null);
            setGeneralWeekStartError(null);
            setGeneralDefaultTimeZoneError(null);
            setGeneralDefaultCurrencyError(null);
        }
    }, [
        activeItem.id,
        activeStoreId,
        businessAddressLine2,
        businessCity,
        businessCountry,
        businessEmail,
        businessHouseNumber,
        businessLegalFirstName,
        businessLegalLastName,
        businessName,
        businessPhone,
        businessPostalCode,
        businessStreet,
        businessType,
        email,
        firstName,
        language,
        lastName,
        phone,
        currency,
        dateFormat,
        defaultCurrency,
        defaultTimeZone,
        productCodePrefix,
        productCodeSuffix,
        setUiLanguage,
        storeDefaultCurrency,
        storeBackupRegionCountry,
        storeTimeZone,
        storeUnitSystem,
        timeZone,
        weekStartDay,
    ]);

    usePendingChangesHeader({
        active: hasPendingChanges,
        scope: "settings",
        onSave: onSaveActiveChanges,
        onDiscard: onCancelActiveChanges,
    });

    function handleClose() {
        if (closing) return;
        if (hasPendingChanges) {
            triggerPendingAttention();
            return;
        }

        setClosing(true);
        const target = resolveCloseTarget();
        window.setTimeout(() => {
            void navigateTo(target);
        }, SETTINGS_CLOSE_ANIMATION_MS);
    }

    return (
        <section className={cn("portalSettingsScene__D5n2M7", closing && "portalSettingsSceneClosing__Q1v8R4")}>
            <div className="portalSettingsFrame__A8k3P6">
                <div className={cn("portalSettingsMobileTopBar__E4n7Q2", isMobileSettingsLayout && "portalSettingsMobileTopBarVisible__K1m3V8")}>
                    <div className="portalSettingsMobileTopBarLeft__R7q2D5">
                        {isMobileDetailView ? (
                            <button
                                type="button"
                                className="portalSettingsMobileBackButton__W3m8P1"
                                onClick={goBackToSettingsCategories}
                            >
                                <ArrowLeft aria-hidden="true" />
                                <span>Back</span>
                            </button>
                        ) : (
                            <span className="portalSettingsMobileHeading__C9n4D1">
                                <Cog aria-hidden="true" />
                                <span>Settings</span>
                            </span>
                        )}
                    </div>
                    <Button
                        type="button"
                        kind="ghost"
                        size="small"
                        className={cn("portalSettingsCloseButton__D4m7P1", "portalSettingsMobileCloseButton__H6q1T9")}
                        onClick={handleClose}
                        aria-label={uiText.closeAriaLabel}
                    >
                        <X aria-hidden="true" />
                    </Button>
                </div>

                <div className={cn("portalSettingsBody__R8p1H6", isMobileCategoriesView && "portalSettingsBodyMobileCategories__V2m6Q9")}>
                    <aside className={cn("portalSettingsNav__S2m5V9", isMobileDetailView && "portalSettingsNavMobileHidden__J8n2R4")}>
                        <button
                            type="button"
                            className={cn("portalSettingsProfileButton__M2n8V4", activeItem.id === "profile" && "portalSettingsProfileButtonActive__R6k1T7")}
                            onClick={() => openSettingsItem("profile")}
                        >
                            <span className="portalSettingsProfileAvatar__Q4d9L2" aria-hidden="true">
                                {profileInitials}
                            </span>
                            <span className="portalSettingsProfileMeta__W7m3P1">
                                <span className="portalSettingsProfileName__E8t2K6">{profileName}</span>
                                <span className="portalSettingsProfileEmployee__L5p9D3">{employeeId}</span>
                            </span>
                        </button>

                        <label className="portalSettingsSearch__B7k4D3">
                            {searchLoading ? (
                                <Spinner size={14} className="portalSettingsSearchSpinner__J4m8R1" />
                            ) : (
                                <Search className="portalSettingsSearchIcon__L6n2P8" aria-hidden="true" />
                            )}
                            <input
                                className="portalSettingsSearchInput__J3q9T1"
                                type="text"
                                value={query}
                                onChange={(event) => {
                                    if (hasPendingChanges) {
                                        triggerPendingAttention();
                                        return;
                                    }
                                    setQuery(event.target.value);
                                }}
                                onMouseDown={(event) => {
                                    if (!hasPendingChanges) return;
                                    event.preventDefault();
                                    triggerPendingAttention();
                                }}
                                onFocus={(event) => {
                                    if (!hasPendingChanges) return;
                                    event.preventDefault();
                                    event.currentTarget.blur();
                                    triggerPendingAttention();
                                }}
                                placeholder={uiText.searchPlaceholder}
                                autoComplete="off"
                                aria-disabled={hasPendingChanges}
                                aria-busy={searchLoading}
                            />
                        </label>

                        {hasSearchQuery ? (
                            <div className="portalSettingsSearchResults__A5n2Q7" role="list">
                                {!searchLoading && searchResults.length === 0 ? (
                                    <div className="portalSettingsSearchEmpty__D3m8R2">{uiText.searchNoResults}</div>
                                ) : null}
                                {searchResults.map((entry) => {
                                    const Icon = entry.icon;

                                    return (
                                        <button
                                            key={entry.id}
                                            type="button"
                                            className={cn("portalSettingsNavItem__X5n1K7", "portalSettingsSearchResultItem__N7v3P4")}
                                            onClick={() => {
                                                if (hasPendingChanges) {
                                                    triggerPendingAttention();
                                                    return;
                                                }
                                                setQuery("");
                                                openSettingsItem(entry.targetId);
                                            }}
                                        >
                                            <Icon className="portalSettingsNavIcon__P8t3C5" aria-hidden="true" />
                                            <span className="portalSettingsSearchResultText__W2m7Q6">
                                                <span className="portalSettingsSearchResultTitle__R9n1D5">{entry.title}</span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <>
                                <div className="portalSettingsNavList__V4f8R2" role="list">
                                    {primaryNavItems.map((item) => {
                                        const Icon = item.icon;
                                        const active = item.id === activeItem.id;

                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                className={cn("portalSettingsNavItem__X5n1K7", active && "portalSettingsNavItemActive__U9r2D6")}
                                                onClick={() => openSettingsItem(item.id)}
                                            >
                                                <Icon className="portalSettingsNavIcon__P8t3C5" aria-hidden="true" />
                                                <span>{item.title}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {canManageTeam && adminNavItems.length > 0 ? (
                                    <div className="portalSettingsNavSection__A7m1D4">
                                        <p className="portalSettingsNavSectionLabel__Q4n8V1">{managementSectionTitle}</p>
                                        <div className="portalSettingsNavList__V4f8R2" role="list">
                                            {adminNavItems.map((item) => {
                                                const Icon = item.icon;
                                                const active = item.id === activeItem.id;

                                                return (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        className={cn("portalSettingsNavItem__X5n1K7", active && "portalSettingsNavItemActive__U9r2D6")}
                                                        onClick={() => openSettingsItem(item.id)}
                                                    >
                                                        <Icon className="portalSettingsNavIcon__P8t3C5" aria-hidden="true" />
                                                        <span>{item.title}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : null}
                            </>
                        )}
                    </aside>

                    <section className={cn("portalSettingsContent__G1k7M3", isMobileCategoriesView && "portalSettingsContentMobileHidden__B4m9Q7")}>
                        <div className="portalSettingsPageHeader__P6m2V7">
                            <div className="portalSettingsPageTitleWrap__A4n9D3">
                                {activeItem.id !== "general" ? (
                                    <activeItem.icon className="portalSettingsPageTitleIcon__K7r3M1" aria-hidden="true" />
                                ) : null}
                                <h2 className="typography__heading5__J8d3k0 portalSettingsPageTitle__R3d8Q6">{activeItem.title}</h2>
                            </div>
                            <div className="portalSettingsPageActions__J4m8P2">
                                <Button type="button" kind="ghost" size="small" className="portalSettingsCloseButton__D4m7P1 portalSettingsPageCloseButton__F2n8P6" onClick={handleClose} aria-label={uiText.closeAriaLabel}>
                                    <X aria-hidden="true" />
                                </Button>
                            </div>
                        </div>

                        {activeItem.id === "profile" ? (
                            <section className="portalSettingsProfile__L7v2D9">
                                {profileCombinedError ? <SettingsErrorNotice message={profileCombinedError} /> : null}

                                <article className="portalSettingsProfileCard__A2m8Q4 ui-surface-card">
                                    <header className="portalSettingsSectionHeader__F6m2Q1">
                                        <h3 className="portalSettingsTileTitle__S9m2Q4">{uiText.profile.identityTitle}</h3>
                                        <p className="portalSettingsSectionSubtitle__W2m9Q6">{uiText.profile.identitySubtitle}</p>
                                    </header>
                                    <div className="portalSettingsFieldRow__R8m4P2">
                                        <label className="portalSettingsField__D2n7V1">
                                            <span className="form__label__B9f4k0">{uiText.profile.firstName}</span>
                                            <input
                                                className="form__input__Z3n7q0"
                                                value={profileFirstName}
                                                onChange={(event) => setProfileFirstName(event.target.value)}
                                                required
                                            />
                                        </label>
                                        <label className="portalSettingsField__D2n7V1">
                                            <span className="form__label__B9f4k0">{uiText.profile.lastName}</span>
                                            <input
                                                className="form__input__Z3n7q0"
                                                value={profileLastName}
                                                onChange={(event) => setProfileLastName(event.target.value)}
                                                required
                                            />
                                        </label>
                                    </div>
                                </article>

                                <article className="portalSettingsProfileCard__A2m8Q4 ui-surface-card">
                                    <header className="portalSettingsSectionHeader__F6m2Q1">
                                        <h3 className="portalSettingsTileTitle__S9m2Q4">{uiText.profile.contactTitle}</h3>
                                        <p className="portalSettingsSectionSubtitle__W2m9Q6">{uiText.profile.contactSubtitle}</p>
                                    </header>
                                    <div className="portalSettingsFieldRow__R8m4P2">
                                        <label className="portalSettingsField__D2n7V1">
                                            <span className="form__label__B9f4k0">{uiText.profile.emailOptional}</span>
                                            <input
                                                className="form__input__Z3n7q0"
                                                type="email"
                                                value={profileEmail}
                                                onChange={(event) => setProfileEmail(event.target.value)}
                                                placeholder={uiText.profile.emailPlaceholder}
                                            />
                                        </label>
                                        <SettingsPhoneField
                                            label={uiText.profile.phoneOptional}
                                            countryCode={profilePhoneCountryCode}
                                            number={profilePhoneNationalNumber}
                                            onCountryCodeChange={(next) => {
                                                setProfilePhoneCountryCode(COUNTRY_CODE_SET.has(next) ? next : DEFAULT_COUNTRY_CODE);
                                            }}
                                            onNumberChange={setProfilePhoneNationalNumber}
                                            numberPlaceholder={uiText.profile.phonePlaceholder}
                                        />
                                    </div>
                                </article>

                                <article className="portalSettingsProfileCard__A2m8Q4 ui-surface-card">
                                    <header className="portalSettingsSectionHeader__F6m2Q1">
                                        <h3 className="portalSettingsTileTitle__S9m2Q4">{uiText.profile.storesTitle}</h3>
                                        <p className="portalSettingsSectionSubtitle__W2m9Q6">{uiText.profile.storesSubtitle}</p>
                                    </header>
                                    <div className="portalSettingsFieldRow__R8m4P2 portalSettingsFieldRowSingle__S5m8N1">
                                        <label className="portalSettingsField__D2n7V1">
                                            <span className="form__label__B9f4k0">{uiText.profile.activeStore}</span>
                                            <select
                                                className="form__select__P9j2k0 portalSettingsPreferenceSelect__V4n8Q2"
                                                value={profileActiveStoreId}
                                                onChange={(event) => setProfileActiveStoreId(event.target.value)}
                                            >
                                                {stores.map((storeOption) => (
                                                    <option key={storeOption.id} value={storeOption.id}>
                                                        {storeOption.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>
                                </article>

                                <article className="portalSettingsProfileCard__A2m8Q4 ui-surface-card">
                                    <header className="portalSettingsSectionHeader__F6m2Q1">
                                        <h3 className="portalSettingsTileTitle__S9m2Q4">{uiText.profile.preferredLanguageTitle}</h3>
                                    </header>
                                    <div className="portalSettingsFieldRow__R8m4P2 portalSettingsFieldRowSingle__S5m8N1">
                                        <label className="portalSettingsField__D2n7V1">
                                            <span className="form__label__B9f4k0">{uiText.profile.languageLabel}</span>
                                            <select
                                                className="form__select__P9j2k0 portalSettingsPreferenceSelect__V4n8Q2"
                                                value={profileLanguage}
                                                onChange={(event) => {
                                                    const next = event.target.value as LanguageCode;
                                                    if (!SUPPORTED_LANGUAGES.includes(next)) return;
                                                    setProfileLanguage(next);
                                                    setUiLanguage(next);
                                                }}
                                            >
                                                {SUPPORTED_LANGUAGES.map((code) => (
                                                    <option key={code} value={code}>
                                                        {LANGUAGE_NATIVE_LABELS[code]}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>
                                </article>

                                <article className="portalSettingsProfileCard__A2m8Q4 ui-surface-card">
                                    <header className="portalSettingsSectionHeader__F6m2Q1">
                                        <h3 className="portalSettingsTileTitle__S9m2Q4">{uiText.languagePanel.preferredCurrency}</h3>
                                    </header>
                                    <div className="portalSettingsFieldRow__R8m4P2 portalSettingsFieldRowSingle__S5m8N1">
                                        <label className="portalSettingsField__D2n7V1">
                                            <span className="form__label__B9f4k0">{uiText.languagePanel.preferredCurrency}</span>
                                            <select
                                                className="form__select__P9j2k0 portalSettingsPreferenceSelect__V4n8Q2"
                                                value={preferredCurrency}
                                                disabled={updatingCurrency}
                                                aria-busy={updatingCurrency}
                                                onChange={(event) => {
                                                    const next = event.target.value.trim().toUpperCase();
                                                    if (!isIsoCurrencyCode(next)) return;
                                                    setPreferredCurrency(next);
                                                }}
                                            >
                                                {preferredCurrencyOptions.map((code) => (
                                                    <option key={code} value={code}>
                                                        {preferredCurrencyLabelByCode.get(code) ?? messages.currencyValues[code] ?? code}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>
                                </article>

                                <article className="portalSettingsProfileCard__A2m8Q4 ui-surface-card">
                                    <header className="portalSettingsSectionHeader__F6m2Q1">
                                        <h3 className="portalSettingsTileTitle__S9m2Q4">{uiText.profile.timeZoneTitle}</h3>
                                    </header>
                                    <div className="portalSettingsFieldRow__R8m4P2 portalSettingsFieldRowSingle__S5m8N1">
                                        <label className="portalSettingsField__D2n7V1">
                                            <span className="form__label__B9f4k0">{uiText.profile.timeZoneLabel}</span>
                                            <select
                                                className="form__select__P9j2k0 portalSettingsPreferenceSelect__V4n8Q2"
                                                value={profileTimeZone}
                                                onChange={(event) => setProfileTimeZone(event.target.value)}
                                            >
                                                {profileTimeZoneOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>
                                </article>
                            </section>
                        ) : activeItem.id === "businessDetails" ? (
                            <section className="portalSettingsGeneral__V8m2P4">
                                {businessDetailsError ? <SettingsErrorNotice message={businessDetailsError} /> : null}

                                <article className="portalSettingsProfileCard__A2m8Q4 ui-surface-card">
                                    <header className="portalSettingsSectionHeader__F6m2Q1">
                                        <h3 className="portalSettingsTileTitle__S9m2Q4">{uiText.business.title}</h3>
                                        <p className="portalSettingsSectionSubtitle__W2m9Q6">{uiText.business.subtitle}</p>
                                    </header>
                                    <div className="portalSettingsFieldRow__R8m4P2">
                                        <label className="portalSettingsField__D2n7V1 portalSettingsFieldSpanFull__C9m4R2">
                                            <span className="form__label__B9f4k0">{uiText.business.businessName}</span>
                                            <input
                                                className="form__input__Z3n7q0"
                                                value={businessDetailsName}
                                                onChange={(event) => setBusinessDetailsName(event.target.value)}
                                            />
                                        </label>
                                        <label className="portalSettingsField__D2n7V1">
                                            <span className="form__label__B9f4k0">{uiText.business.country}</span>
                                            <select
                                                className={cn(
                                                    "form__select__P9j2k0",
                                                    "portalSettingsPreferenceSelect__V4n8Q2",
                                                    !businessDetailsCountry && "is-placeholder"
                                                )}
                                                value={businessDetailsCountry}
                                                onChange={(event) => setBusinessDetailsCountry(event.target.value)}
                                            >
                                                <option value="" disabled>
                                                    {uiText.selectCountryPlaceholder}
                                                </option>
                                                {COUNTRY_OPTIONS.map((option) => (
                                                    <option key={option.code} value={option.code}>
                                                        {option.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                        <label className="portalSettingsField__D2n7V1">
                                            <span className="form__label__B9f4k0">{uiText.business.businessType}</span>
                                            <select
                                                className="form__select__P9j2k0 portalSettingsPreferenceSelect__V4n8Q2"
                                                value={businessDetailsType}
                                                onChange={(event) => {
                                                    const next = parseBusinessType(event.target.value);
                                                    if (next) setBusinessDetailsType(next);
                                                }}
                                            >
                                                {BUSINESS_TYPE_CODES.map((value) => (
                                                    <option key={value} value={value}>
                                                        {businessTypeLabels[value]}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>

                                        <label className="portalSettingsField__D2n7V1">
                                            <span className="form__label__B9f4k0">{uiText.business.legalFirstName}</span>
                                            <input
                                                className="form__input__Z3n7q0"
                                                value={businessDetailsLegalFirstName}
                                                onChange={(event) => setBusinessDetailsLegalFirstName(event.target.value)}
                                            />
                                        </label>
                                        <label className="portalSettingsField__D2n7V1">
                                            <span className="form__label__B9f4k0">{uiText.business.legalLastName}</span>
                                            <input
                                                className="form__input__Z3n7q0"
                                                value={businessDetailsLegalLastName}
                                                onChange={(event) => setBusinessDetailsLegalLastName(event.target.value)}
                                            />
                                        </label>

                                        <label className="portalSettingsField__D2n7V1 portalSettingsFieldSpanFull__C9m4R2">
                                            <span className="form__label__B9f4k0">{uiText.business.street} &amp; {uiText.business.houseNumber}</span>
                                            <input
                                                className="form__input__Z3n7q0"
                                                value={businessDetailsStreetAndHouseNumber}
                                                onChange={(event) => setBusinessDetailsStreetAndHouseNumber(event.target.value)}
                                            />
                                        </label>

                                        <label className="portalSettingsField__D2n7V1 portalSettingsFieldSpanFull__C9m4R2">
                                            <span className="form__label__B9f4k0">{uiText.business.addressLine2}</span>
                                            <input
                                                className="form__input__Z3n7q0"
                                                value={businessDetailsAddressLine2}
                                                onChange={(event) => setBusinessDetailsAddressLine2(event.target.value)}
                                            />
                                        </label>
                                        <label className="portalSettingsField__D2n7V1">
                                            <span className="form__label__B9f4k0">{uiText.business.postalCode}</span>
                                            <input
                                                className="form__input__Z3n7q0"
                                                value={businessDetailsPostalCode}
                                                onChange={(event) => setBusinessDetailsPostalCode(event.target.value)}
                                            />
                                        </label>

                                        <label className="portalSettingsField__D2n7V1">
                                            <span className="form__label__B9f4k0">{uiText.business.city}</span>
                                            <input
                                                className="form__input__Z3n7q0"
                                                value={businessDetailsCity}
                                                onChange={(event) => setBusinessDetailsCity(event.target.value)}
                                            />
                                        </label>
                                        <label className="portalSettingsField__D2n7V1 portalSettingsFieldSpanFull__C9m4R2">
                                            <span className="form__label__B9f4k0">{uiText.business.email}</span>
                                            <input
                                                className="form__input__Z3n7q0"
                                                type="email"
                                                value={businessDetailsEmail}
                                                onChange={(event) => setBusinessDetailsEmail(event.target.value)}
                                            />
                                        </label>

                                        <SettingsPhoneField
                                            className="portalSettingsFieldSpanFull__C9m4R2"
                                            label={uiText.business.phone}
                                            countryCode={businessDetailsPhoneCountryCode}
                                            number={businessDetailsPhoneNationalNumber}
                                            onCountryCodeChange={(next) => {
                                                setBusinessDetailsPhoneCountryCode(COUNTRY_CODE_SET.has(next) ? next : DEFAULT_COUNTRY_CODE);
                                            }}
                                            onNumberChange={setBusinessDetailsPhoneNationalNumber}
                                            numberPlaceholder={uiText.profile.phonePlaceholder}
                                        />
                                    </div>
                                </article>
                            </section>
                        ) : activeItem.id === "general" ? (
                            <section className="portalSettingsGeneral__V8m2P4">
                                {generalCombinedError ? <SettingsErrorNotice message={generalCombinedError} /> : null}

                                <article className="portalSettingsProfileCard__A2m8Q4 ui-surface-card">
                                    <header className="portalSettingsSectionHeader__F6m2Q1">
                                        <h3 className="portalSettingsTileTitle__S9m2Q4">{uiText.general.storeDefaultsTitle}</h3>
                                        <p className="portalSettingsSectionSubtitle__W2m9Q6">{uiText.general.storeDefaultsSubtitle}</p>
                                    </header>
                                    <div className="portalSettingsFieldRow__R8m4P2">
                                        <label className="portalSettingsField__D2n7V1">
                                            <span className="form__label__B9f4k0">{uiText.general.storeCurrency}</span>
                                            <select
                                                className="form__select__P9j2k0 portalSettingsPreferenceSelect__V4n8Q2"
                                                value={generalStoreCurrency}
                                                onChange={(event) => {
                                                    const next = event.target.value.trim().toUpperCase();
                                                    if (!isIsoCurrencyCode(next)) return;
                                                    setGeneralStoreCurrency(next);
                                                }}
                                            >
                                                {storeCurrencyOptions.map((code) => (
                                                    <option key={code} value={code}>
                                                        {storeCurrencyLabelByCode.get(code) ?? messages.currencyValues[code] ?? code}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                        <label className="portalSettingsField__D2n7V1">
                                            <span className="form__label__B9f4k0">{uiText.general.backupRegionCountry}</span>
                                            <select
                                                className={cn(
                                                    "form__select__P9j2k0",
                                                    "portalSettingsPreferenceSelect__V4n8Q2",
                                                    !generalBackupRegionCountry && "is-placeholder"
                                                )}
                                                value={generalBackupRegionCountry}
                                                onChange={(event) => setGeneralBackupRegionCountry(event.target.value)}
                                            >
                                                <option value="" disabled>
                                                    {uiText.selectCountryPlaceholder}
                                                </option>
                                                {COUNTRY_OPTIONS.map((option) => (
                                                    <option key={option.code} value={option.code}>
                                                        {option.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                        <label className="portalSettingsField__D2n7V1">
                                            <span className="form__label__B9f4k0">{uiText.general.unitSystem}</span>
                                            <select
                                                className="form__select__P9j2k0 portalSettingsPreferenceSelect__V4n8Q2"
                                                value={generalUnitSystem}
                                                onChange={(event) => {
                                                    const next = event.target.value as UnitSystemCode;
                                                    if (UNIT_SYSTEM_CODES.includes(next)) setGeneralUnitSystem(next);
                                                }}
                                            >
                                                <option value="METRIC">{uiText.general.unitSystemMetric}</option>
                                                <option value="IMPERIAL">{uiText.general.unitSystemImperial}</option>
                                            </select>
                                        </label>
                                        <label className="portalSettingsField__D2n7V1">
                                            <span className="form__label__B9f4k0">{uiText.general.storeTimeZone}</span>
                                            <select
                                                className="form__select__P9j2k0 portalSettingsPreferenceSelect__V4n8Q2"
                                                value={generalStoreTimeZone}
                                                onChange={(event) => setGeneralStoreTimeZone(event.target.value)}
                                            >
                                                {generalTimeZoneOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>
                                    <p className="portalSettingsGeneralHint__L2m8Q1">{uiText.general.accountSettingsHint}</p>
                                </article>

                                <article className="portalSettingsProfileCard__A2m8Q4 ui-surface-card">
                                    <header className="portalSettingsSectionHeader__F6m2Q1">
                                        <h3 className="portalSettingsTileTitle__S9m2Q4">{uiText.general.orderIdFormatTitle}</h3>
                                        <p className="portalSettingsSectionSubtitle__W2m9Q6">{uiText.general.orderIdFormatSubtitle}</p>
                                    </header>
                                    <div className="portalSettingsFieldRow__R8m4P2">
                                        <label className="portalSettingsField__D2n7V1">
                                            <span className="form__label__B9f4k0">{uiText.general.productCodePrefix}</span>
                                            <input
                                                className="form__input__Z3n7q0"
                                                value={generalProductCodePrefix}
                                                onChange={(event) => setGeneralProductCodePrefix(event.target.value.toUpperCase())}
                                                placeholder={DEFAULT_PRODUCT_CODE_PREFIX}
                                            />
                                        </label>
                                        <label className="portalSettingsField__D2n7V1">
                                            <span className="form__label__B9f4k0">{uiText.general.productCodeSuffix}</span>
                                            <input
                                                className="form__input__Z3n7q0"
                                                value={generalProductCodeSuffix}
                                                onChange={(event) => setGeneralProductCodeSuffix(event.target.value.toUpperCase())}
                                            />
                                        </label>
                                    </div>
                                    <p className="portalSettingsGeneralHint__L2m8Q1">
                                        {uiText.general.orderIdExample}: <strong>{generalOrderIdExample}</strong>
                                    </p>
                                </article>
                            </section>
                        ) : activeItem.id === "team" && canManageTeam ? (
                            <section className="portalSettingsGeneral__V8m2P4">
                                {teamError ? <SettingsErrorNotice message={teamError} /> : null}

                                <article className="portalSettingsProfileCard__A2m8Q4 ui-surface-card portalSettingsTeamCard__N4m7R2">
                                    <header className="portalSettingsSectionHeader__F6m2Q1">
                                        <h3 className="portalSettingsTileTitle__S9m2Q4">Add user</h3>
                                        <p className="portalSettingsSectionSubtitle__W2m9Q6">
                                            {teamCanManageManagers
                                                ? "Create employee or manager accounts with a temporary password and attach them to a store."
                                                : "Create employee accounts with a temporary password for stores you manage."}
                                        </p>
                                    </header>
                                    <div className="portalSettingsFieldRow__R8m4P2">
                                        <label className="portalSettingsField__D2n7V1">
                                            <span className="form__label__B9f4k0">First name</span>
                                            <input
                                                className="form__input__Z3n7q0"
                                                value={teamFirstName}
                                                onChange={(event) => setTeamFirstName(event.target.value)}
                                            />
                                        </label>
                                        <label className="portalSettingsField__D2n7V1">
                                            <span className="form__label__B9f4k0">Last name</span>
                                            <input
                                                className="form__input__Z3n7q0"
                                                value={teamLastName}
                                                onChange={(event) => setTeamLastName(event.target.value)}
                                            />
                                        </label>
                                        <label className="portalSettingsField__D2n7V1">
                                            <span className="form__label__B9f4k0">Employee ID</span>
                                            <input
                                                className="form__input__Z3n7q0"
                                                value={teamEmployeeIdPreview}
                                                readOnly
                                                aria-readonly="true"
                                            />
                                        </label>
                                        <label className="portalSettingsField__D2n7V1">
                                            <span className="form__label__B9f4k0">Temporary password</span>
                                            <input
                                                type="password"
                                                className="form__input__Z3n7q0"
                                                value={teamPassword}
                                                onChange={(event) => setTeamPassword(event.target.value)}
                                            />
                                        </label>
                                        {teamCanManageManagers ? (
                                            <label className="portalSettingsField__D2n7V1">
                                                <span className="form__label__B9f4k0">Role</span>
                                                <select
                                                    className="form__select__P9j2k0 portalSettingsPreferenceSelect__V4n8Q2"
                                                    value={teamRole}
                                                    onChange={(event) => {
                                                        const next = event.target.value === "MANAGER" ? "MANAGER" : "EMPLOYEE";
                                                        setTeamRole(next);
                                                    }}
                                                >
                                                    <option value="EMPLOYEE">Employee</option>
                                                    <option value="MANAGER">Manager</option>
                                                </select>
                                            </label>
                                        ) : null}
                                        <label className={cn("portalSettingsField__D2n7V1", !teamCanManageManagers && "portalSettingsFieldSpanFull__C9m4R2")}>
                                            <span className="form__label__B9f4k0">Store</span>
                                            <select
                                                className="form__select__P9j2k0 portalSettingsPreferenceSelect__V4n8Q2"
                                                value={teamStoreId}
                                                onChange={(event) => setTeamStoreId(event.target.value)}
                                            >
                                                {teamStores.map((store) => (
                                                    <option key={store.id} value={store.id}>
                                                        {store.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>
                                    <div className="portalSettingsStoreActions__J2m7C6">
                                        <Button
                                            type="button"
                                            kind="primary"
                                            size="small"
                                            onClick={() => void onCreateTeamUser()}
                                            disabled={teamCreating || teamLoading || teamStores.length === 0}
                                        >
                                            {teamCreating ? <Spinner size={14} /> : null}
                                            <span>{teamCreating ? "Creating..." : "Create user"}</span>
                                        </Button>
                                    </div>
                                </article>

                                <article className="portalSettingsProfileCard__A2m8Q4 ui-surface-card portalSettingsTeamCard__N4m7R2">
                                    <header className="portalSettingsFeedbackHeader__C6m2P4">
                                        <div className="portalSettingsFeedbackHeading__M5k9V2">
                                            <h3 className="portalSettingsTileTitle__S9m2Q4">
                                                {teamCanManageManagers ? "Managers and employees" : "Employees"}
                                            </h3>
                                            <p className="portalSettingsSectionSubtitle__W2m9Q6">
                                                {teamCanManageManagers
                                                    ? "Includes all manager and employee users."
                                                    : "Only employee users are visible to managers."}
                                            </p>
                                        </div>
                                        <Button type="button" kind="ghost" size="small" onClick={() => void loadTeamUsers()} disabled={teamLoading}>
                                            <RefreshCw
                                                className={cn(
                                                    "portalSettingsRefreshIcon__P4m8R2",
                                                    teamLoading && "portalSettingsRefreshIconSpinning__N7q1D6"
                                                )}
                                                aria-hidden="true"
                                            />
                                            <span>Refresh</span>
                                        </Button>
                                    </header>

                                    {teamLoading ? (
                                        <div className="portalSettingsFeedbackLoading__W8p3D6">
                                            <Spinner size={16} />
                                            <span>Loading users...</span>
                                        </div>
                                    ) : null}

                                    {!teamLoading && teamUsers.length === 0 ? (
                                        <div className="portalSettingsFeedbackEmpty__T9k2Q7">No users found.</div>
                                    ) : null}

                                    {!teamLoading && teamUsers.length > 0 ? (
                                        <ul className="portalSettingsTeamList__P6m1Q9">
                                            {teamUsers.map((entry) => {
                                                const canDelete = teamCanManageManagers || entry.role === "EMPLOYEE";
                                                const storeNames = entry.stores.map((store) => store.name).join(", ") || "No store access";
                                                return (
                                                    <li key={entry.id} className="portalSettingsTeamItem__A1m8D7">
                                                        <div className="portalSettingsTeamItemMain__W2k9P4">
                                                            <span className="portalSettingsTeamName__L3v1M8">{entry.firstName} {entry.lastName}</span>
                                                            <span className="portalSettingsTeamMeta__D7n2Q6">
                                                                {entry.employeeId} · {TEAM_ROLE_LABELS[entry.role]}
                                                            </span>
                                                            <span className="portalSettingsTeamMeta__D7n2Q6">{storeNames}</span>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            kind="ghost"
                                                            size="small"
                                                            onClick={() => void onDeleteTeamUser(entry.id)}
                                                            disabled={!canDelete || teamDeletingUserId === entry.id}
                                                        >
                                                            {teamDeletingUserId === entry.id ? <Spinner size={14} /> : <Trash2 aria-hidden="true" />}
                                                            <span>{teamDeletingUserId === entry.id ? "Deleting..." : "Delete"}</span>
                                                        </Button>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    ) : null}
                                </article>
                            </section>
                        ) : activeItem.id === "language" ? (
                            <section className="portalSettingsPreferences__K5m2V8 ui-surface-card">
                                {preferencesError ? <SettingsErrorNotice message={preferencesError} /> : null}
                                <h3 className="portalSettingsTileTitle__S9m2Q4">{uiText.languagePanel.title}</h3>
                                <div className="portalSettingsPreferenceField__L8n4D1">
                                    <label className="portalSettingsPreferenceLabel__W2m9P5" htmlFor="portal-settings-language">
                                        {uiText.languagePanel.preferredLanguage}
                                    </label>
                                    <div className="portalSettingsPreferenceControl__R6k1T3">
                                        <select
                                            id="portal-settings-language"
                                            className="form__select__P9j2k0 portalSettingsPreferenceSelect__V4n8Q2"
                                            value={preferredLanguage}
                                            disabled={updatingLanguage}
                                            aria-busy={updatingLanguage}
                                            onChange={(event) => {
                                                const next = event.target.value as LanguageCode;
                                                if (SUPPORTED_LANGUAGES.includes(next)) void onUpdateLanguage(next);
                                            }}
                                        >
                                            {SUPPORTED_LANGUAGES.map((code) => (
                                                <option key={code} value={code}>
                                                    {LANGUAGE_NATIVE_LABELS[code]}
                                                </option>
                                            ))}
                                        </select>
                                        {updatingLanguage ? <Spinner size={14} className="portalSettingsPreferenceSpinner__D3m7R1" /> : null}
                                    </div>
                                </div>

                                <div className="portalSettingsPreferenceField__L8n4D1">
                                    <label className="portalSettingsPreferenceLabel__W2m9P5" htmlFor="portal-settings-currency">
                                        {uiText.languagePanel.preferredCurrency}
                                    </label>
                                    <div className="portalSettingsPreferenceControl__R6k1T3">
                                        <select
                                            id="portal-settings-currency"
                                            className="form__select__P9j2k0 portalSettingsPreferenceSelect__V4n8Q2"
                                            value={preferredCurrency}
                                            disabled={updatingCurrency}
                                            aria-busy={updatingCurrency}
                                            onChange={(event) => {
                                                const next = event.target.value.trim().toUpperCase();
                                                if (!isIsoCurrencyCode(next)) return;
                                                setPreferredCurrency(next);
                                            }}
                                        >
                                            {preferredCurrencyOptions.map((code) => (
                                                <option key={code} value={code}>
                                                    {preferredCurrencyLabelByCode.get(code) ?? messages.currencyValues[code] ?? code}
                                                </option>
                                            ))}
                                        </select>
                                        {updatingCurrency ? <Spinner size={14} className="portalSettingsPreferenceSpinner__D3m7R1" /> : null}
                                    </div>
                                </div>
                            </section>
                        ) : activeItem.id === "storeAccess" && canManageStores ? (
                            <section className="portalSettingsGeneral__V8m2P4">
                                {managedStoresError ? <SettingsErrorNotice message={managedStoresError} /> : null}

                                {managedStoresCanCreate ? (
                                    <article className="portalSettingsProfileCard__A2m8Q4 ui-surface-card">
                                        <header className="portalSettingsSectionHeader__F6m2Q1">
                                            <h3 className="portalSettingsTileTitle__S9m2Q4">Create store</h3>
                                            <p className="portalSettingsSectionSubtitle__W2m9Q6">Create a new store workspace. Admin access is granted automatically.</p>
                                        </header>
                                        <div className="portalSettingsFieldRow__R8m4P2 portalSettingsFieldRowSingle__S5m8N1">
                                            <label className="portalSettingsField__D2n7V1">
                                                <span className="form__label__B9f4k0">Store name</span>
                                                <input
                                                    className="form__input__Z3n7q0"
                                                    value={createStoreName}
                                                    onChange={(event) => setCreateStoreName(event.target.value)}
                                                    placeholder="North branch"
                                                />
                                            </label>
                                        </div>
                                        <div className="portalSettingsStoreActions__J2m7C6">
                                            <Button type="button" kind="primary" size="small" onClick={() => void onCreateStore()} disabled={creatingStore}>
                                                {creatingStore ? <Spinner size={14} /> : null}
                                                <span>{creatingStore ? "Creating..." : "Create store"}</span>
                                            </Button>
                                        </div>
                                    </article>
                                ) : null}

                                <article className="portalSettingsProfileCard__A2m8Q4 ui-surface-card portalSettingsStoreAccess__Q9m2D4">
                                    <header className="portalSettingsSectionHeader__F6m2Q1">
                                        <div className="portalSettingsFeedbackHeader__C6m2P4">
                                            <div className="portalSettingsFeedbackHeading__M5k9V2">
                                                <h3 className="portalSettingsTileTitle__S9m2Q4">Stores</h3>
                                                <p className="portalSettingsSectionSubtitle__W2m9Q6">
                                                    {isAdmin
                                                        ? "View all stores and inspect their details."
                                                        : "View details for stores assigned to this manager account."}
                                                </p>
                                            </div>
                                            <Button type="button" kind="ghost" size="small" onClick={() => void loadManagedStores()} disabled={managedStoresLoading}>
                                                <RefreshCw
                                                    className={cn(
                                                        "portalSettingsRefreshIcon__P4m8R2",
                                                        managedStoresLoading && "portalSettingsRefreshIconSpinning__N7q1D6"
                                                    )}
                                                    aria-hidden="true"
                                                />
                                                <span>Refresh</span>
                                            </Button>
                                        </div>
                                    </header>

                                    {managedStoresLoading ? (
                                        <div className="portalSettingsFeedbackLoading__W8p3D6">
                                            <Spinner size={16} />
                                            <span>Loading stores...</span>
                                        </div>
                                    ) : null}

                                    {!managedStoresLoading && managedStores.length === 0 ? (
                                        <div className="portalSettingsFeedbackEmpty__T9k2Q7">
                                            {isAdmin ? "No stores yet. Create your first store." : "No stores are assigned to this manager account yet."}
                                        </div>
                                    ) : null}

                                    {!managedStoresLoading && managedStores.length > 0 ? (
                                        <div className="portalSettingsStoreAccessGrid__S7n1P5">
                                            <div className="portalSettingsStoreUsers__T4m8Q2">
                                                {managedStores.map((entry) => {
                                                    const active = entry.id === selectedManagedStoreId;
                                                    return (
                                                        <button
                                                            key={entry.id}
                                                            type="button"
                                                            className={cn("portalSettingsStoreUserItem__L5d2R8", active && "portalSettingsStoreUserItemActive__P1t8V6")}
                                                            onClick={() => setSelectedManagedStoreId(entry.id)}
                                                        >
                                                            <span className="portalSettingsStoreUserName__W2k6M9">{entry.name}</span>
                                                            <span className="portalSettingsStoreUserMeta__N6q3D1">{entry.slug}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            <div className="portalSettingsStoreEditor__K8r3V1">
                                                {selectedManagedStore ? (
                                                    <>
                                                        <div className="portalSettingsStoreEditorTitle__A4n7P2">
                                                            <span>{selectedManagedStore.name}</span>
                                                            <span className="portalSettingsStoreEditorSlug__M7p2Q5">{selectedManagedStore.slug}</span>
                                                        </div>
                                                        <div className="portalSettingsStoreDetailGrid__B3n8R2">
                                                            <div className="portalSettingsStoreDetailItem__H6m1Q7">
                                                                <span className="portalSettingsStoreDetailLabel__D9k4V2">Status</span>
                                                                <span className="portalSettingsStoreDetailValue__R2m7P4">
                                                                    {selectedManagedStore.isActive ? "Active" : "Inactive"}
                                                                </span>
                                                            </div>
                                                            <div className="portalSettingsStoreDetailItem__H6m1Q7">
                                                                <span className="portalSettingsStoreDetailLabel__D9k4V2">Store currency</span>
                                                                <span className="portalSettingsStoreDetailValue__R2m7P4">
                                                                    {messages.currencyValues[selectedManagedStore.defaultCurrency] ?? selectedManagedStore.defaultCurrency}
                                                                </span>
                                                            </div>
                                                            <div className="portalSettingsStoreDetailItem__H6m1Q7">
                                                                <span className="portalSettingsStoreDetailLabel__D9k4V2">Time zone</span>
                                                                <span className="portalSettingsStoreDetailValue__R2m7P4">{selectedManagedStore.timeZone}</span>
                                                            </div>
                                                            <div className="portalSettingsStoreDetailItem__H6m1Q7">
                                                                <span className="portalSettingsStoreDetailLabel__D9k4V2">Unit system</span>
                                                                <span className="portalSettingsStoreDetailValue__R2m7P4">
                                                                    {selectedManagedStore.unitSystem === "IMPERIAL" ? uiText.general.unitSystemImperial : uiText.general.unitSystemMetric}
                                                                </span>
                                                            </div>
                                                            <div className="portalSettingsStoreDetailItem__H6m1Q7">
                                                                <span className="portalSettingsStoreDetailLabel__D9k4V2">Backup region</span>
                                                                <span className="portalSettingsStoreDetailValue__R2m7P4">
                                                                    {getCountryLabel(selectedManagedStore.backupRegionCountry)}
                                                                </span>
                                                            </div>
                                                            <div className="portalSettingsStoreDetailItem__H6m1Q7">
                                                                <span className="portalSettingsStoreDetailLabel__D9k4V2">Business country</span>
                                                                <span className="portalSettingsStoreDetailValue__R2m7P4">
                                                                    {getCountryLabel(selectedManagedStore.businessCountry)}
                                                                </span>
                                                            </div>
                                                            <div className="portalSettingsStoreDetailItem__H6m1Q7">
                                                                <span className="portalSettingsStoreDetailLabel__D9k4V2">Business type</span>
                                                                <span className="portalSettingsStoreDetailValue__R2m7P4">
                                                                    {(() => {
                                                                        const parsed = parseBusinessType(selectedManagedStore.businessType ?? "");
                                                                        return parsed ? businessTypeLabels[parsed] : "Not set";
                                                                    })()}
                                                                </span>
                                                            </div>
                                                            <div className="portalSettingsStoreDetailItem__H6m1Q7">
                                                                <span className="portalSettingsStoreDetailLabel__D9k4V2">Legal name</span>
                                                                <span className="portalSettingsStoreDetailValue__R2m7P4">
                                                                    {formatOptionalValue(
                                                                        `${selectedManagedStore.legalFirstName ?? ""} ${selectedManagedStore.legalLastName ?? ""}`.trim()
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <div className="portalSettingsStoreDetailItem__H6m1Q7 portalSettingsStoreDetailItemFull__P5m2V8">
                                                                <span className="portalSettingsStoreDetailLabel__D9k4V2">Address</span>
                                                                <span className="portalSettingsStoreDetailValue__R2m7P4">
                                                                    {formatOptionalValue(
                                                                        [
                                                                            formatOptionalValue(selectedManagedStore.businessStreet, ""),
                                                                            formatOptionalValue(selectedManagedStore.businessHouseNumber, ""),
                                                                            formatOptionalValue(selectedManagedStore.businessAddressLine2, ""),
                                                                            formatOptionalValue(selectedManagedStore.businessPostalCode, ""),
                                                                            formatOptionalValue(selectedManagedStore.businessCity, ""),
                                                                        ].filter(Boolean).join(", ")
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <div className="portalSettingsStoreDetailItem__H6m1Q7">
                                                                <span className="portalSettingsStoreDetailLabel__D9k4V2">Business email</span>
                                                                <span className="portalSettingsStoreDetailValue__R2m7P4">
                                                                    {formatOptionalValue(selectedManagedStore.businessEmail)}
                                                                </span>
                                                            </div>
                                                            <div className="portalSettingsStoreDetailItem__H6m1Q7">
                                                                <span className="portalSettingsStoreDetailLabel__D9k4V2">Business phone</span>
                                                                <span className="portalSettingsStoreDetailValue__R2m7P4">
                                                                    {formatOptionalValue(selectedManagedStore.businessPhone)}
                                                                </span>
                                                            </div>
                                                            <div className="portalSettingsStoreDetailItem__H6m1Q7">
                                                                <span className="portalSettingsStoreDetailLabel__D9k4V2">Product code prefix</span>
                                                                <span className="portalSettingsStoreDetailValue__R2m7P4">
                                                                    {formatOptionalValue(selectedManagedStore.productCodePrefix)}
                                                                </span>
                                                            </div>
                                                            <div className="portalSettingsStoreDetailItem__H6m1Q7">
                                                                <span className="portalSettingsStoreDetailLabel__D9k4V2">Product code suffix</span>
                                                                <span className="portalSettingsStoreDetailValue__R2m7P4">
                                                                    {formatOptionalValue(selectedManagedStore.productCodeSuffix)}
                                                                </span>
                                                            </div>
                                                            <div className="portalSettingsStoreDetailItem__H6m1Q7">
                                                                <span className="portalSettingsStoreDetailLabel__D9k4V2">Created</span>
                                                                <span className="portalSettingsStoreDetailValue__R2m7P4">
                                                                    {new Date(selectedManagedStore.createdAt).toLocaleString()}
                                                                </span>
                                                            </div>
                                                            <div className="portalSettingsStoreDetailItem__H6m1Q7">
                                                                <span className="portalSettingsStoreDetailLabel__D9k4V2">Updated</span>
                                                                <span className="portalSettingsStoreDetailValue__R2m7P4">
                                                                    {new Date(selectedManagedStore.updatedAt).toLocaleString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="portalSettingsFeedbackEmpty__T9k2Q7">Select a store to view details.</div>
                                                )}
                                            </div>
                                        </div>
                                    ) : null}
                                </article>
                            </section>
                        ) : activeItem.id === "loginLogs" && isAdmin ? (
                            <section className="portalSettingsGeneral__V8m2P4">
                                {loginLogsError ? <SettingsErrorNotice message={loginLogsError} /> : null}

                                <article className="portalSettingsProfileCard__A2m8Q4 ui-surface-card portalSettingsFeedback__R2n8K5">
                                    <header className="portalSettingsSectionHeader__F6m2Q1">
                                        <div className="portalSettingsFeedbackHeader__C6m2P4">
                                            <div className="portalSettingsFeedbackHeading__M5k9V2">
                                                <h3 className="portalSettingsTileTitle__S9m2Q4">User login logs</h3>
                                                <p className="portalSettingsSectionSubtitle__W2m9Q6">Successful sign-ins across all users.</p>
                                            </div>
                                            <Button
                                                type="button"
                                                kind="ghost"
                                                size="small"
                                                onClick={() => void loadLoginLogs()}
                                                disabled={loginLogsLoading || loginLogsLoadingMore}
                                            >
                                                <RefreshCw
                                                    className={cn(
                                                        "portalSettingsRefreshIcon__P4m8R2",
                                                        (loginLogsLoading || loginLogsLoadingMore) && "portalSettingsRefreshIconSpinning__N7q1D6"
                                                    )}
                                                    aria-hidden="true"
                                                />
                                                <span>Refresh</span>
                                            </Button>
                                        </div>
                                    </header>

                                    {loginLogsLoading ? (
                                        <div className="portalSettingsFeedbackLoading__W8p3D6">
                                            <Spinner size={16} />
                                            <span>Loading login logs...</span>
                                        </div>
                                    ) : null}

                                    {!loginLogsLoading && loginLogs.length === 0 ? (
                                        <div className="portalSettingsFeedbackEmpty__T9k2Q7">No login logs yet.</div>
                                    ) : null}

                                    {!loginLogsLoading && loginLogs.length > 0 ? (
                                        <div ref={loginLogsScrollerRef} className="portalSettingsLoginLogsScroller__C8m2V5">
                                            <ul className="portalSettingsLoginLogsList__J1m9Q4">
                                                {loginLogs.map((entry) => (
                                                    <li key={entry.id} className="portalSettingsLoginLogItem__N6p2R8">
                                                        <span className="portalSettingsLoginLogName__S4n8D3">
                                                            {entry.user.name || entry.user.employeeId}
                                                        </span>
                                                        <span className="portalSettingsLoginLogMeta__P2v7M1">
                                                            {entry.user.employeeId}
                                                        </span>
                                                        <span className="portalSettingsLoginLogMeta__P2v7M1">
                                                            {USER_ROLE_LABELS[entry.user.role]}
                                                        </span>
                                                        <time className="portalSettingsLoginLogTime__H7m3Q9" dateTime={entry.createdAt}>
                                                            {new Date(entry.createdAt).toLocaleString()}
                                                        </time>
                                                    </li>
                                                ))}
                                            </ul>
                                            {loginLogsHasMore ? <div ref={loginLogsSentinelRef} className="portalSettingsLoginLogsSentinel__T4m7P2" /> : null}
                                            {loginLogsLoadingMore ? (
                                                <div className="portalSettingsLoginLogsLoadMore__Q8n3V1">
                                                    <Spinner size={14} />
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </article>
                            </section>
                        ) : activeItem.id === "feedback" && isAdmin ? (
                            <section className="portalSettingsGeneral__V8m2P4">
                                {feedbackError ? <SettingsErrorNotice message={feedbackError} /> : null}

                                <article className="portalSettingsProfileCard__A2m8Q4 ui-surface-card portalSettingsFeedback__R2n8K5">
                                    <header className="portalSettingsSectionHeader__F6m2Q1">
                                        <div className="portalSettingsFeedbackHeader__C6m2P4">
                                            <div className="portalSettingsFeedbackHeading__M5k9V2">
                                                <h3 className="portalSettingsTileTitle__S9m2Q4">Admin feedback inbox</h3>
                                                <p className="portalSettingsSectionSubtitle__W2m9Q6">Admin-only inbox for portal feedback submissions.</p>
                                            </div>
                                            <div className="portalSettingsFeedbackHeaderActions__B6d2P9">
                                                <label className="portalSettingsFeedbackFilter__Q3m8N1">
                                                    <span>Type</span>
                                                    <select
                                                        value={feedbackKindFilter}
                                                        onChange={(event) => setFeedbackKindFilter(
                                                            event.target.value === "ISSUE" || event.target.value === "IDEA"
                                                                ? event.target.value
                                                                : "ALL"
                                                        )}
                                                        disabled={feedbackLoading || feedbackLoadingMore}
                                                    >
                                                        <option value="ALL">All</option>
                                                        <option value="ISSUE">Issues</option>
                                                        <option value="IDEA">Ideas</option>
                                                    </select>
                                                </label>
                                                <Button
                                                    type="button"
                                                    kind="ghost"
                                                    size="small"
                                                    onClick={() => void loadFeedbackInbox()}
                                                    disabled={feedbackLoading || feedbackLoadingMore}
                                                >
                                                    <RefreshCw
                                                        className={cn(
                                                            "portalSettingsRefreshIcon__P4m8R2",
                                                            (feedbackLoading || feedbackLoadingMore) && "portalSettingsRefreshIconSpinning__N7q1D6"
                                                        )}
                                                        aria-hidden="true"
                                                    />
                                                    <span>Refresh</span>
                                                </Button>
                                            </div>
                                        </div>
                                    </header>

                                    {feedbackLoading ? (
                                        <div className="portalSettingsFeedbackLoading__W8p3D6">
                                            <Spinner size={16} />
                                            <span>Loading feedback...</span>
                                        </div>
                                    ) : null}

                                    {!feedbackLoading && feedbackItems.length === 0 ? (
                                        <div className="portalSettingsFeedbackEmpty__T9k2Q7">No feedback messages yet.</div>
                                    ) : null}

                                    {!feedbackLoading && feedbackItems.length > 0 ? (
                                        <div ref={feedbackScrollerRef} className="portalSettingsFeedbackScroller__N7m3Q2">
                                            <ul className="portalSettingsFeedbackList__H3m8N2">
                                                {feedbackItems.map((item) => (
                                                    <li key={item.id} className="portalSettingsFeedbackItem__A6d4V1">
                                                        <div className="portalSettingsFeedbackTop__P7r2M9">
                                                            <span className="portalSettingsFeedbackKind__B5n1Q3">
                                                                {item.kind === "ISSUE" ? <TriangleAlert aria-hidden="true" /> : <Lightbulb aria-hidden="true" />}
                                                                <span>{item.kind === "ISSUE" ? "Issue" : "Idea"}</span>
                                                            </span>
                                                            <button
                                                                type="button"
                                                                className="portalSettingsFeedbackDelete__D1p6S8"
                                                                onClick={() => void onDeleteFeedback(item.id)}
                                                                disabled={deletingFeedbackId === item.id}
                                                            >
                                                                <Trash2 aria-hidden="true" />
                                                                <span>{deletingFeedbackId === item.id ? "Deleting..." : "Delete"}</span>
                                                            </button>
                                                        </div>
                                                        <p className="portalSettingsFeedbackMessage__L2k9T4">{item.message}</p>
                                                        <div className="portalSettingsFeedbackMeta__N8d3Q6">
                                                            <span>Page: {item.pagePath}</span>
                                                            <span>{item.createdBy.name || item.createdBy.employeeId}</span>
                                                            <span>{new Date(item.createdAt).toLocaleString()}</span>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                            {feedbackHasMore ? <div ref={feedbackSentinelRef} className="portalSettingsFeedbackSentinel__A9m2D7" /> : null}
                                            {feedbackLoadingMore ? (
                                                <div className="portalSettingsFeedbackLoadMore__P7m1Q8">
                                                    <Spinner size={14} />
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </article>
                            </section>
                        ) : (
                            <div className="portalSettingsTiles__E4h8P1">
                                <article className="portalSettingsTile__A1d6V7 ui-surface-card">
                                    <h3 className="portalSettingsTileTitle__S9m2Q4">{uiText.tiles.overviewTitle}</h3>
                                    <p>{uiText.tiles.overviewBody}</p>
                                </article>
                                <article className="portalSettingsTile__A1d6V7 ui-surface-card">
                                    <h3 className="portalSettingsTileTitle__S9m2Q4">{uiText.tiles.defaultsTitle}</h3>
                                    <p>{uiText.tiles.defaultsBody}</p>
                                </article>
                                <article className="portalSettingsTile__A1d6V7 ui-surface-card">
                                    <h3 className="portalSettingsTileTitle__S9m2Q4">{uiText.tiles.accessTitle}</h3>
                                    <p>{uiText.tiles.accessBody}</p>
                                </article>
                                <article className="portalSettingsTile__A1d6V7 ui-surface-card">
                                    <h3 className="portalSettingsTileTitle__S9m2Q4">{uiText.tiles.notesTitle}</h3>
                                    <p>{activeItem.helper}</p>
                                </article>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </section>
    );
}
