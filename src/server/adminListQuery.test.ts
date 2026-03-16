import assert from "node:assert/strict";
import test from "node:test";
import {
    ADMIN_LIST_MAX_LIMIT,
    ADMIN_LIST_MAX_OFFSET,
    parseAdminFeedbackQuery,
    parseAdminLoginLogsQuery,
} from "@/server/adminListQuery";

function createSearchParams(values: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) {
        if (typeof value === "string") {
            params.set(key, value);
        }
    }
    return params;
}

test("parseAdminFeedbackQuery applies defaults", () => {
    const parsed = parseAdminFeedbackQuery(new URLSearchParams());
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
        assert.equal(parsed.data.limit, 50);
        assert.equal(parsed.data.offset, 0);
        assert.equal(parsed.data.kind, "ALL");
    }
});

test("parseAdminFeedbackQuery enforces pagination bounds and kind values", () => {
    const tooLargeLimit = parseAdminFeedbackQuery(createSearchParams({
        limit: `${ADMIN_LIST_MAX_LIMIT + 1}`,
    }));
    assert.equal(tooLargeLimit.ok, false);

    const tooLargeOffset = parseAdminFeedbackQuery(createSearchParams({
        offset: `${ADMIN_LIST_MAX_OFFSET + 1}`,
    }));
    assert.equal(tooLargeOffset.ok, false);

    const invalidKind = parseAdminFeedbackQuery(createSearchParams({
        kind: "BUG",
    }));
    assert.equal(invalidKind.ok, false);
});

test("parseAdminLoginLogsQuery validates role and employeeId filters", () => {
    const parsed = parseAdminLoginLogsQuery(createSearchParams({
        limit: "25",
        offset: "75",
        role: "manager",
        employeeId: " emp-0042 ",
    }));
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
        assert.equal(parsed.data.limit, 25);
        assert.equal(parsed.data.offset, 75);
        assert.equal(parsed.data.role, "MANAGER");
        assert.equal(parsed.data.employeeId, "EMP-0042");
    }

    const invalidRole = parseAdminLoginLogsQuery(createSearchParams({ role: "owner" }));
    assert.equal(invalidRole.ok, false);

    const invalidEmployeeId = parseAdminLoginLogsQuery(createSearchParams({ employeeId: "id with spaces" }));
    assert.equal(invalidEmployeeId.ok, false);
});

test("admin list query parsers stay bounded under repeated high-volume pagination input", () => {
    for (let i = 0; i < 300; i += 1) {
        const feedback = parseAdminFeedbackQuery(createSearchParams({
            limit: `${ADMIN_LIST_MAX_LIMIT}`,
            offset: `${i % ADMIN_LIST_MAX_OFFSET}`,
            kind: i % 2 === 0 ? "ISSUE" : "IDEA",
        }));
        assert.equal(feedback.ok, true);

        const loginLogs = parseAdminLoginLogsQuery(createSearchParams({
            limit: `${ADMIN_LIST_MAX_LIMIT}`,
            offset: `${i % ADMIN_LIST_MAX_OFFSET}`,
            role: i % 3 === 0 ? "ADMIN" : i % 3 === 1 ? "MANAGER" : "EMPLOYEE",
            employeeId: `EMP${String(i).padStart(4, "0")}`,
        }));
        assert.equal(loginLogs.ok, true);
    }
});
