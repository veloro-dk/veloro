import "server-only";

export type SchemaResult<T> =
    | { ok: true; data: T }
    | { ok: false; message: string };

export type SchemaFieldParser<T> = (value: unknown) => T | null;

export type SchemaField<T> = {
    parse: SchemaFieldParser<T>;
    required?: boolean;
};

export type SchemaDefinition<T extends Record<string, unknown>> = {
    [K in keyof T]: SchemaField<T[K]>;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parsePayloadWithSchema<T extends Record<string, unknown>>(
    payload: unknown,
    schema: SchemaDefinition<T>,
    options?: {
        invalidPayloadMessage?: string;
        invalidFieldMessages?: Partial<Record<Extract<keyof T, string>, string>>;
    }
): SchemaResult<T> {
    const invalidPayloadMessage = options?.invalidPayloadMessage ?? "Invalid payload.";
    const invalidFieldMessages: Partial<Record<Extract<keyof T, string>, string>> = options?.invalidFieldMessages ?? {};

    if (!isRecord(payload)) {
        return { ok: false, message: invalidPayloadMessage };
    }

    const parsed = {} as T;

    for (const key of Object.keys(schema) as Array<Extract<keyof T, string>>) {
        const field = schema[key];
        const rawValue = payload[key];

        if (rawValue === undefined) {
            if (field.required === false) {
                (parsed as Record<string, unknown>)[key] = undefined;
                continue;
            }

            return {
                ok: false,
                message: invalidFieldMessages[key] ?? invalidPayloadMessage,
            };
        }

        const value = field.parse(rawValue);
        if (value === null) {
            return {
                ok: false,
                message: invalidFieldMessages[key] ?? invalidPayloadMessage,
            };
        }

        (parsed as Record<string, unknown>)[key] = value;
    }

    return { ok: true, data: parsed };
}

export async function parseRequestJsonWithSchema<T extends Record<string, unknown>>(
    req: Request,
    schema: SchemaDefinition<T>,
    options?: {
        invalidPayloadMessage?: string;
        invalidFieldMessages?: Partial<Record<Extract<keyof T, string>, string>>;
    }
): Promise<SchemaResult<T>> {
    const payload = await req.json().catch(() => null);
    return parsePayloadWithSchema(payload, schema, options);
}

export function parseString(
    value: unknown,
    options?: {
        trim?: boolean;
        minLength?: number;
        maxLength?: number;
        allowEmpty?: boolean;
        lowerCase?: boolean;
        upperCase?: boolean;
    }
): string | null {
    if (typeof value !== "string") return null;

    const trim = options?.trim !== false;
    let next = trim ? value.trim() : value;

    if (options?.lowerCase) next = next.toLowerCase();
    if (options?.upperCase) next = next.toUpperCase();

    const allowEmpty = options?.allowEmpty === true;
    if (!allowEmpty && next.length === 0) return null;

    if (typeof options?.minLength === "number" && next.length < options.minLength) return null;
    if (typeof options?.maxLength === "number" && next.length > options.maxLength) return null;

    return next;
}

export function parseInteger(
    value: unknown,
    options?: {
        min?: number;
        max?: number;
    }
): number | null {
    if (typeof value !== "number" || !Number.isInteger(value)) return null;
    if (typeof options?.min === "number" && value < options.min) return null;
    if (typeof options?.max === "number" && value > options.max) return null;
    return value;
}

export function parseEnum<T extends string>(
    value: unknown,
    allowed: readonly T[],
    options?: { caseInsensitive?: boolean; trim?: boolean }
): T | null {
    if (typeof value !== "string") return null;
    const trim = options?.trim !== false;
    const caseInsensitive = options?.caseInsensitive === true;
    const candidate = trim ? value.trim() : value;
    if (!candidate) return null;

    if (!caseInsensitive) {
        return allowed.includes(candidate as T) ? (candidate as T) : null;
    }

    const upperCandidate = candidate.toUpperCase();
    for (const entry of allowed) {
        if (entry.toUpperCase() === upperCandidate) return entry;
    }

    return null;
}

export function parseStringArray(
    value: unknown,
    options?: {
        trim?: boolean;
        maxItems?: number;
        minItems?: number;
        maxItemLength?: number;
        lowerCase?: boolean;
        upperCase?: boolean;
        unique?: boolean;
    }
): string[] | null {
    if (!Array.isArray(value)) return null;

    const trim = options?.trim !== false;
    const lowerCase = options?.lowerCase === true;
    const upperCase = options?.upperCase === true;

    const items: string[] = [];
    for (const item of value) {
        if (typeof item !== "string") return null;
        let next = trim ? item.trim() : item;
        if (!next) return null;
        if (lowerCase) next = next.toLowerCase();
        if (upperCase) next = next.toUpperCase();
        if (typeof options?.maxItemLength === "number" && next.length > options.maxItemLength) return null;
        items.push(next);
    }

    const unique = options?.unique !== false;
    const normalized = unique ? Array.from(new Set(items)) : items;

    if (typeof options?.minItems === "number" && normalized.length < options.minItems) return null;
    if (typeof options?.maxItems === "number" && normalized.length > options.maxItems) return null;

    return normalized;
}
