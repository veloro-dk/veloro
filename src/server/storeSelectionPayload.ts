import { parsePayloadWithSchema, parseString } from "@/server/requestSchema";

export function parseStoreSelectionPayload(input: unknown) {
    const payload = parsePayloadWithSchema<{ storeId: string }>(
        input,
        {
            storeId: { parse: (value) => parseString(value) },
        },
        {
            invalidPayloadMessage: "Invalid payload.",
        }
    );
    const storeId = payload.ok ? payload.data.storeId : "";

    return {
        storeId,
        isValid: storeId.length > 0,
    };
}
