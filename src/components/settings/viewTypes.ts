import type { SettingsItem } from "@/components/settings/settingsItems";
import type { CurrencyCode } from "@/i18n/portal";

export type UnitSystemCode = "METRIC" | "IMPERIAL";

export type SettingsSearchEntry = {
    id: string;
    targetId: string;
    title: string;
    pageTitle: string;
    icon: SettingsItem["icon"];
    searchableText: string;
};

export type FeedbackInboxItem = {
    id: string;
    kind: "ISSUE" | "IDEA";
    pagePath: string;
    message: string;
    createdAt: string;
    createdBy: {
        employeeId: string;
        name: string | null;
    };
};

export type LoginLogItem = {
    id: string;
    createdAt: string;
    user: {
        employeeId: string;
        name: string | null;
        role: "ADMIN" | "MANAGER" | "EMPLOYEE";
    };
};

export type ProfileStoreOption = {
    id: string;
    name: string;
    slug: string;
};

export type ManagedStore = {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    defaultCurrency: CurrencyCode;
    backupRegionCountry: string | null;
    unitSystem: "METRIC" | "IMPERIAL";
    timeZone: string;
    productCodePrefix: string | null;
    productCodeSuffix: string | null;
    businessCountry: string | null;
    businessType: string | null;
    legalFirstName: string | null;
    legalLastName: string | null;
    businessStreet: string | null;
    businessHouseNumber: string | null;
    businessAddressLine2: string | null;
    businessPostalCode: string | null;
    businessCity: string | null;
    businessEmail: string | null;
    businessPhone: string | null;
    createdAt: string;
    updatedAt: string;
};

export type TeamUserStore = {
    id: string;
    name: string;
    slug: string;
};

export type TeamManagedUser = {
    id: string;
    employeeId: string;
    name: string;
    firstName: string;
    lastName: string;
    role: "MANAGER" | "EMPLOYEE";
    status: "ACTIVE" | "DISABLED";
    activeStoreId: string | null;
    stores: TeamUserStore[];
};
