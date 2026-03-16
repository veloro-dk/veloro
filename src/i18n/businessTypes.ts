import type { LanguageCode } from "@/i18n/portal";

export const BUSINESS_TYPE_CODES = [
    "INDIVIDUAL",
    "INCORPORATED",
    "PARTNERSHIP",
    "UNINCORPORATED_PARTNERSHIP",
    "PRIVATE_CORPORATION",
    "INCORPORATED_NONPROFIT",
    "UNINCORPORATED_NONPROFIT",
] as const;

export type BusinessTypeCode = (typeof BUSINESS_TYPE_CODES)[number];

export const BUSINESS_TYPE_LABELS: Record<LanguageCode, Record<BusinessTypeCode, string>> = {
    en: {
        INDIVIDUAL: "Individual",
        INCORPORATED: "Incorporated",
        PARTNERSHIP: "Partnership",
        UNINCORPORATED_PARTNERSHIP: "Unincorporated partnership",
        PRIVATE_CORPORATION: "Private corporation",
        INCORPORATED_NONPROFIT: "Incorporated nonprofit",
        UNINCORPORATED_NONPROFIT: "Unincorporated nonprofit",
    },
    da: {
        INDIVIDUAL: "Enkeltmandsvirksomhed",
        INCORPORATED: "Aktieselskab (A/S)",
        PARTNERSHIP: "Interessentskab (I/S)",
        UNINCORPORATED_PARTNERSHIP: "Kommanditselskab (K/S)",
        PRIVATE_CORPORATION: "Anpartsselskab (ApS)",
        INCORPORATED_NONPROFIT: "Registreret nonprofitforening",
        UNINCORPORATED_NONPROFIT: "Uregistreret nonprofitforening",
    },
    de: {
        INDIVIDUAL: "Einzelunternehmen",
        INCORPORATED: "Eingetragene Kapitalgesellschaft",
        PARTNERSHIP: "Personengesellschaft",
        UNINCORPORATED_PARTNERSHIP: "Nicht eingetragene Personengesellschaft",
        PRIVATE_CORPORATION: "Private Kapitalgesellschaft",
        INCORPORATED_NONPROFIT: "Eingetragene gemeinnutzige Organisation",
        UNINCORPORATED_NONPROFIT: "Nicht eingetragene gemeinnutzige Organisation",
    },
    fr: {
        INDIVIDUAL: "Entreprise individuelle",
        INCORPORATED: "Societe constituee",
        PARTNERSHIP: "Societe de personnes",
        UNINCORPORATED_PARTNERSHIP: "Societe de personnes non constituee",
        PRIVATE_CORPORATION: "Societe privee",
        INCORPORATED_NONPROFIT: "Organisme sans but lucratif constitue",
        UNINCORPORATED_NONPROFIT: "Organisme sans but lucratif non constitue",
    },
    es: {
        INDIVIDUAL: "Empresario individual",
        INCORPORATED: "Sociedad incorporada",
        PARTNERSHIP: "Sociedad de personas",
        UNINCORPORATED_PARTNERSHIP: "Sociedad de personas no incorporada",
        PRIVATE_CORPORATION: "Sociedad privada",
        INCORPORATED_NONPROFIT: "Organizacion sin fines de lucro incorporada",
        UNINCORPORATED_NONPROFIT: "Organizacion sin fines de lucro no incorporada",
    },
    zh: {
        INDIVIDUAL: "个体经营者",
        INCORPORATED: "法人公司",
        PARTNERSHIP: "合伙企业",
        UNINCORPORATED_PARTNERSHIP: "非法人合伙组织",
        PRIVATE_CORPORATION: "私营公司",
        INCORPORATED_NONPROFIT: "非营利法人",
        UNINCORPORATED_NONPROFIT: "非法人公益组织",
    },
};

export function parseBusinessType(input: unknown): BusinessTypeCode | null {
    if (typeof input !== "string") return null;
    const normalized = input.trim().toUpperCase();
    if (!normalized) return null;
    return BUSINESS_TYPE_CODES.includes(normalized as BusinessTypeCode) ? (normalized as BusinessTypeCode) : null;
}
