import { parsePayloadWithSchema, parseString } from "@/server/requestSchema";

const DEFAULT_TIME_ZONE = "Europe/Copenhagen";

export type ParsedProfilePayload = {
    firstName: string;
    lastName: string;
    emailRaw: string;
    phoneRaw: string;
    preferredLanguage: string;
    timeZone: string;
};

export function normalizeTimeZone(input: string) {
    const trimmed = input.trim();
    if (!trimmed) return DEFAULT_TIME_ZONE;

    try {
        const maybeSupportedValuesOf = (Intl as unknown as { supportedValuesOf?: (key: "timeZone") => string[] }).supportedValuesOf;
        if (typeof maybeSupportedValuesOf === "function") {
            const all = maybeSupportedValuesOf("timeZone");
            if (all.includes(trimmed)) return trimmed;
            return DEFAULT_TIME_ZONE;
        }
    } catch {
        return DEFAULT_TIME_ZONE;
    }

    return trimmed;
}

export function parseProfilePayload(input: unknown): ParsedProfilePayload {
    const payload = parsePayloadWithSchema<{
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
        preferredLanguage?: string;
        timeZone?: string;
    }>(
        input,
        {
            firstName: { parse: (value) => parseString(value, { allowEmpty: true }) ?? "", required: false },
            lastName: { parse: (value) => parseString(value, { allowEmpty: true }) ?? "", required: false },
            email: { parse: (value) => parseString(value, { allowEmpty: true }) ?? "", required: false },
            phone: { parse: (value) => parseString(value, { allowEmpty: true }) ?? "", required: false },
            preferredLanguage: { parse: (value) => parseString(value, { allowEmpty: true }) ?? "", required: false },
            timeZone: { parse: (value) => parseString(value, { allowEmpty: true }) ?? "", required: false },
        },
        {
            invalidPayloadMessage: "Invalid payload.",
        }
    );
    if (!payload.ok) {
        return {
            firstName: "",
            lastName: "",
            emailRaw: "",
            phoneRaw: "",
            preferredLanguage: "",
            timeZone: DEFAULT_TIME_ZONE,
        };
    }

    return {
        firstName: (payload.data.firstName ?? "").trim(),
        lastName: (payload.data.lastName ?? "").trim(),
        emailRaw: (payload.data.email ?? "").trim(),
        phoneRaw: (payload.data.phone ?? "").trim(),
        preferredLanguage: (payload.data.preferredLanguage ?? "").trim().toLowerCase(),
        timeZone: normalizeTimeZone(payload.data.timeZone ?? ""),
    };
}
