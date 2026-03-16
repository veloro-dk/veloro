import type { ComponentType } from "react";
import { Clock3, Inbox, SlidersHorizontal, Store, User, Users } from "lucide-react";

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: "true" | "false" }>;

export type SettingsItem = {
    id: string;
    title: string;
    subtitle: string;
    blurb: string;
    helper: string;
    icon: IconComponent;
};

export const SETTINGS_ITEMS: SettingsItem[] = [
    {
        id: "businessDetails",
        title: "Business Details",
        subtitle: "Store legal identity and contact details.",
        blurb: "Manage registered business information for the active store.",
        helper: "These fields are business details for the store, not personal user profile values.",
        icon: Store,
    },
    {
        id: "general",
        title: "General",
        subtitle: "Workspace defaults and company-wide behavior.",
        blurb: "Control timezone, date format, dashboard layout, and startup preferences.",
        helper: "Used as baseline values unless overridden at user level.",
        icon: SlidersHorizontal,
    },
];

export const ADMIN_TEAM_ITEM: SettingsItem = {
    id: "team",
    title: "Team",
    subtitle: "Team structure and role templates.",
    blurb: "Organize groups, invite team members, and prepare role mapping rules.",
    helper: "Role presets can be reused across departments.",
    icon: Users,
};

export const MANAGEMENT_STORES_ITEM: SettingsItem = {
    id: "storeAccess",
    title: "Stores",
    subtitle: "Create stores and review store-level information.",
    blurb: "Admins can create stores. Managers can review assigned stores.",
    helper: "Store details shown here are read-only. Update values from store settings pages.",
    icon: Store,
};

export const PROFILE_ITEM: SettingsItem = {
    id: "profile",
    title: "Account",
    subtitle: "Personal account details and preferences.",
    blurb: "Manage your account identity, communication fields, language, and timezone.",
    helper: "Profile settings are personal and apply only to your account.",
    icon: User,
};

export const ADMIN_FEEDBACK_ITEM: SettingsItem = {
    id: "feedback",
    title: "Feedback inbox",
    subtitle: "Messages submitted from page feedback popups.",
    blurb: "Review incoming ideas and issue reports from users across the portal.",
    helper: "Only visible to admin users.",
    icon: Inbox,
};

export const ADMIN_LOGIN_LOGS_ITEM: SettingsItem = {
    id: "loginLogs",
    title: "Login logs",
    subtitle: "Successful user sign-ins.",
    blurb: "Review when each user logged in.",
    helper: "Only visible to admin users.",
    icon: Clock3,
};

export const TEAM_ROLE_LABELS: Record<"MANAGER" | "EMPLOYEE", string> = {
    MANAGER: "Manager",
    EMPLOYEE: "Employee",
};

export const USER_ROLE_LABELS: Record<"ADMIN" | "MANAGER" | "EMPLOYEE", string> = {
    ADMIN: "Admin",
    MANAGER: "Manager",
    EMPLOYEE: "Employee",
};
