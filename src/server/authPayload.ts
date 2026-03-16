import { parsePayloadWithSchema, parseString } from "@/server/requestSchema";

export type ParsedLoginPayload = {
    employeeId: string;
    password: string;
    isValid: boolean;
};

export function parseLoginPayload(input: unknown): ParsedLoginPayload {
    const payload = parsePayloadWithSchema<{ employeeId: string; password: string }>(
        input,
        {
            employeeId: { parse: (value) => parseString(value) },
            password: { parse: (value) => parseString(value, { trim: false, allowEmpty: true }) },
        },
        {
            invalidPayloadMessage: "Invalid payload.",
        }
    );
    if (!payload.ok) {
        return {
            employeeId: "",
            password: "",
            isValid: false,
        };
    }

    const employeeId = payload.data.employeeId;
    const password = payload.data.password;

    return {
        employeeId,
        password,
        isValid: employeeId.length > 0 && password.length > 0,
    };
}
