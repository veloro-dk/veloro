import assert from "node:assert/strict";
import test from "node:test";
import { parseLoginPayload } from "@/server/authPayload";

test("parseLoginPayload trims employee id and requires password", () => {
    const parsed = parseLoginPayload({ employeeId: "  EMP-42  ", password: "secret" });

    assert.equal(parsed.employeeId, "EMP-42");
    assert.equal(parsed.password, "secret");
    assert.equal(parsed.isValid, true);
});

test("parseLoginPayload rejects missing credentials", () => {
    assert.equal(parseLoginPayload({ employeeId: "EMP-42", password: "" }).isValid, false);
    assert.equal(parseLoginPayload({ employeeId: "", password: "secret" }).isValid, false);
    assert.equal(parseLoginPayload(null).isValid, false);
});
