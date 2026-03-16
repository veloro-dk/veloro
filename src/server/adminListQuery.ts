type ParseOk<T> = { ok: true; data: T };
type ParseErr = { ok: false; message: string };

export type ParsedAdminFeedbackQuery = {
    limit: number;
    offset: number;
    kind: "ALL" | "ISSUE" | "IDEA";
};

export type ParsedAdminLoginLogsQuery = {
    limit: number;
    offset: number;
    role: "ALL" | "ADMIN" | "MANAGER" | "EMPLOYEE";
    employeeId?: string;
};

export const ADMIN_LIST_DEFAULT_LIMIT = 50;
export const ADMIN_LIST_MAX_LIMIT = 100;
export const ADMIN_LIST_MAX_OFFSET = 5000;

const EMPLOYEE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

function parseBoundedInteger(
    rawValue: string | null,
    options: {
        label: string;
        defaultValue: number;
        min: number;
        max: number;
    }
): ParseOk<number> | ParseErr {
    if (rawValue === null || rawValue.trim() === "") {
        return { ok: true, data: options.defaultValue };
    }

    const normalized = rawValue.trim();
    if (!/^\d+$/.test(normalized)) {
        return { ok: false, message: `${options.label} must be an integer.` };
    }

    const value = Number.parseInt(normalized, 10);
    if (!Number.isFinite(value) || value < options.min || value > options.max) {
        return {
            ok: false,
            message: `${options.label} must be between ${options.min} and ${options.max}.`,
        };
    }

    return { ok: true, data: value };
}

function parseEnumParam<T extends string>(
    rawValue: string | null,
    options: {
        label: string;
        defaultValue: T;
        allowed: readonly T[];
    }
): ParseOk<T> | ParseErr {
    if (rawValue === null || rawValue.trim() === "") {
        return { ok: true, data: options.defaultValue };
    }

    const normalized = rawValue.trim().toUpperCase() as T;
    if (!options.allowed.includes(normalized)) {
        return {
            ok: false,
            message: `${options.label} must be one of: ${options.allowed.join(", ")}.`,
        };
    }

    return { ok: true, data: normalized };
}

function parseEmployeeIdFilter(rawValue: string | null): ParseOk<string | undefined> | ParseErr {
    if (rawValue === null || rawValue.trim() === "") {
        return { ok: true, data: undefined };
    }

    const normalized = rawValue.trim().toUpperCase();
    if (normalized.length > 64) {
        return { ok: false, message: "employeeId filter must be 64 characters or fewer." };
    }

    if (!EMPLOYEE_ID_PATTERN.test(normalized)) {
        return {
            ok: false,
            message: "employeeId filter may only include letters, numbers, underscore, and dash.",
        };
    }

    return { ok: true, data: normalized };
}

function parseCommonPaging(searchParams: URLSearchParams): ParseOk<{ limit: number; offset: number }> | ParseErr {
    const limit = parseBoundedInteger(searchParams.get("limit"), {
        label: "limit",
        defaultValue: ADMIN_LIST_DEFAULT_LIMIT,
        min: 1,
        max: ADMIN_LIST_MAX_LIMIT,
    });
    if (!limit.ok) return limit;

    const offset = parseBoundedInteger(searchParams.get("offset"), {
        label: "offset",
        defaultValue: 0,
        min: 0,
        max: ADMIN_LIST_MAX_OFFSET,
    });
    if (!offset.ok) return offset;

    return {
        ok: true,
        data: {
            limit: limit.data,
            offset: offset.data,
        },
    };
}

export function parseAdminFeedbackQuery(searchParams: URLSearchParams): ParseOk<ParsedAdminFeedbackQuery> | ParseErr {
    const paging = parseCommonPaging(searchParams);
    if (!paging.ok) return paging;

    const kind = parseEnumParam(searchParams.get("kind"), {
        label: "kind",
        defaultValue: "ALL",
        allowed: ["ALL", "ISSUE", "IDEA"] as const,
    });
    if (!kind.ok) return kind;

    return {
        ok: true,
        data: {
            limit: paging.data.limit,
            offset: paging.data.offset,
            kind: kind.data,
        },
    };
}

export function parseAdminLoginLogsQuery(searchParams: URLSearchParams): ParseOk<ParsedAdminLoginLogsQuery> | ParseErr {
    const paging = parseCommonPaging(searchParams);
    if (!paging.ok) return paging;

    const role = parseEnumParam(searchParams.get("role"), {
        label: "role",
        defaultValue: "ALL",
        allowed: ["ALL", "ADMIN", "MANAGER", "EMPLOYEE"] as const,
    });
    if (!role.ok) return role;

    const employeeId = parseEmployeeIdFilter(searchParams.get("employeeId"));
    if (!employeeId.ok) return employeeId;

    return {
        ok: true,
        data: {
            limit: paging.data.limit,
            offset: paging.data.offset,
            role: role.data,
            employeeId: employeeId.data,
        },
    };
}
