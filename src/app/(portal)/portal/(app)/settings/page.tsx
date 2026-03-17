import "@/styles/pages/portal/settings.css";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { PortalSettingsView } from "@/components/PortalSettingsView";
import { getSessionUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { getUserStoreContext } from "@/server/stores";
import { findUserSettingsSafe, PREFERRED_CURRENCY_COOKIE_NAME } from "@/server/userSettings";
import { normalizeCurrency, normalizeDateFormat, normalizeLanguage, normalizeWeekStartDay } from "@/i18n/portal";

export default async function SettingsPage() {
    const user = await getSessionUser();
    if (!user) redirect("/login");

    let firstName = user.firstName?.trim() ?? "";
    let lastName = user.lastName?.trim() ?? "";
    let profileName = user.name?.trim() ?? "";
    const roleFallbackName = user.role === "ADMIN" ? "Lucas Thompson" : user.role === "MANAGER" ? "Manager" : "Employee";
    const roleFallbackFirstName = user.role === "ADMIN" ? "Lucas" : user.role === "MANAGER" ? "Manager" : "Employee";
    const roleFallbackLastName = user.role === "ADMIN" ? "Thompson" : user.employeeId;

    if (!firstName || !lastName) {
        const sourceName = profileName || `${roleFallbackName} ${user.employeeId}`;
        const [first, ...rest] = sourceName.split(/\s+/).filter(Boolean);
        firstName = first || roleFallbackFirstName;
        lastName = rest.join(" ").trim() || roleFallbackLastName;
    }

    profileName = `${firstName} ${lastName}`.trim();

    const settings = await findUserSettingsSafe(prisma, user.id);
    const storeContext = await getUserStoreContext(user.id);
    const activeStore = await prisma.store.findUnique({
        where: { id: storeContext.activeStoreId },
        select: {
            name: true,
            defaultCurrency: true,
            backupRegionCountry: true,
            unitSystem: true,
            timeZone: true,
            productCodePrefix: true,
            productCodeSuffix: true,
            businessCountry: true,
            businessType: true,
            legalFirstName: true,
            legalLastName: true,
            businessStreet: true,
            businessHouseNumber: true,
            businessAddressLine2: true,
            businessPostalCode: true,
            businessCity: true,
            businessEmail: true,
            businessPhone: true,
        },
    });
    const cookieStore = await cookies();
    const currencyCookie = cookieStore.get(PREFERRED_CURRENCY_COOKIE_NAME)?.value ?? null;

    const language = normalizeLanguage(settings?.preferredLanguage);
    const currency = normalizeCurrency(currencyCookie ?? settings?.preferredCurrency);
    const timeZone = settings?.timeZone?.trim() || "Europe/Copenhagen";
    const dateFormat = normalizeDateFormat(settings?.dateFormat);
    const weekStartDay = normalizeWeekStartDay(settings?.weekStartDay);
    const defaultTimeZone = settings?.defaultTimeZone?.trim() || timeZone;
    const defaultCurrency = normalizeCurrency(settings?.defaultCurrency);

    return (
        <PortalSettingsView
            userRole={user.role}
            language={language}
            currency={currency}
            profileName={profileName}
            employeeId={user.employeeId}
            firstName={firstName}
            lastName={lastName}
            email={user.email ?? ""}
            phone={user.phone ?? ""}
            timeZone={timeZone}
            dateFormat={dateFormat}
            weekStartDay={weekStartDay}
            defaultTimeZone={defaultTimeZone}
            defaultCurrency={defaultCurrency}
            activeStoreId={storeContext.activeStoreId}
            stores={storeContext.stores}
            businessName={activeStore?.name ?? ""}
            businessCountry={activeStore?.businessCountry ?? ""}
            businessType={activeStore?.businessType ?? ""}
            businessLegalFirstName={activeStore?.legalFirstName ?? ""}
            businessLegalLastName={activeStore?.legalLastName ?? ""}
            businessStreet={activeStore?.businessStreet ?? ""}
            businessHouseNumber={activeStore?.businessHouseNumber ?? ""}
            businessAddressLine2={activeStore?.businessAddressLine2 ?? ""}
            businessPostalCode={activeStore?.businessPostalCode ?? ""}
            businessCity={activeStore?.businessCity ?? ""}
            businessEmail={activeStore?.businessEmail ?? ""}
            businessPhone={activeStore?.businessPhone ?? ""}
            storeDefaultCurrency={activeStore?.defaultCurrency ?? currency}
            storeBackupRegionCountry={activeStore?.backupRegionCountry ?? ""}
            storeUnitSystem={activeStore?.unitSystem ?? "METRIC"}
            storeTimeZone={activeStore?.timeZone ?? timeZone}
            productCodePrefix={activeStore?.productCodePrefix ?? "VLR"}
            productCodeSuffix={activeStore?.productCodeSuffix ?? ""}
        />
    );
}
