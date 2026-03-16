import assert from "node:assert/strict";
import test from "node:test";
import { getDashboardMessages } from "@/i18n/dashboard";
import { SUPPORTED_LANGUAGES, type LanguageCode, PORTAL_MESSAGES } from "@/i18n/portal";
import { SETTINGS_UI_TEXT } from "@/components/settings/settingsUiText";

function collectStrings(value: unknown, results: string[] = []): string[] {
    if (typeof value === "string") {
        results.push(value);
        return results;
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            collectStrings(item, results);
        }
        return results;
    }

    if (value && typeof value === "object") {
        for (const nested of Object.values(value)) {
            collectStrings(nested, results);
        }
    }

    return results;
}

test("portal purchase order labels are localized per locale", () => {
    const expectedByLocale: Record<LanguageCode, string> = {
        en: "Purchase orders",
        da: "Indkøbsordrer",
        de: "Bestellungen",
        fr: "Bons de commande",
        es: "Pedidos de compra",
        zh: "采购订单",
    };

    for (const locale of SUPPORTED_LANGUAGES) {
        const expected = expectedByLocale[locale];
        assert.equal(PORTAL_MESSAGES[locale].nav.purchaseOrders, expected);
        assert.equal(PORTAL_MESSAGES[locale].pages.purchaseOrders, expected);
    }
});

test("dashboard growth snapshot copy matches each locale", () => {
    const expectedMarkerByLocale: Record<LanguageCode, string> = {
        en: "Month-over-month growth",
        da: "Maned-over-maned",
        de: "Monatliches Wachstum",
        fr: "Croissance mensuelle",
        es: "Crecimiento mensual",
        zh: "月度增长",
    };

    for (const locale of SUPPORTED_LANGUAGES) {
        const marker = expectedMarkerByLocale[locale];
        const text = getDashboardMessages(locale).widgetBody.growthSnapshotDetail;
        assert.ok(
            text.includes(marker),
            `Locale ${locale} has unexpected dashboard growth copy: "${text}"`
        );
    }
});

test("non-english settings hints avoid english account-settings copy", () => {
    const nonEnglishLocales: LanguageCode[] = ["da", "de", "fr", "es", "zh"];
    for (const locale of nonEnglishLocales) {
        const hint = SETTINGS_UI_TEXT[locale].general.accountSettingsHint.toLowerCase();
        assert.equal(
            hint.includes("account settings"),
            false,
            `Locale ${locale} should not include english phrase "account settings".`
        );
    }
});

test("translations do not include placeholder copy markers", () => {
    const placeholderPattern = /\b(todo|tbd|coming soon|lorem ipsum)\b/i;

    for (const locale of SUPPORTED_LANGUAGES) {
        const values = [
            ...collectStrings(PORTAL_MESSAGES[locale]),
            ...collectStrings(getDashboardMessages(locale)),
            ...collectStrings(SETTINGS_UI_TEXT[locale]),
        ];

        const invalid = values.find((entry) => placeholderPattern.test(entry));
        assert.equal(
            Boolean(invalid),
            false,
            `Locale ${locale} includes placeholder copy: ${invalid ?? "unknown"}`
        );
    }
});
