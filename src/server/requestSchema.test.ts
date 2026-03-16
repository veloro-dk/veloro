import assert from "node:assert/strict";
import test from "node:test";
import {
    parseEnum,
    parsePayloadWithSchema,
    parseRequestJsonWithSchema,
    parseString,
    parseStringArray,
} from "@/server/requestSchema";

test("parsePayloadWithSchema parses required and optional fields", () => {
    const result = parsePayloadWithSchema(
        { name: "  Veloro  ", tags: ["a", "b"], note: "  " },
        {
            name: { parse: (value) => parseString(value) },
            tags: { parse: (value) => parseStringArray(value, { minItems: 1 }) },
            note: { parse: (value) => parseString(value, { allowEmpty: true }), required: false },
        },
        {
            invalidPayloadMessage: "Invalid payload.",
        }
    );

    assert.equal(result.ok, true);
    if (result.ok) {
        assert.equal(result.data.name, "Veloro");
        assert.deepEqual(result.data.tags, ["a", "b"]);
        assert.equal(result.data.note, "");
    }
});

test("parsePayloadWithSchema returns field-level errors", () => {
    const result = parsePayloadWithSchema(
        { role: "owner" },
        {
            role: { parse: (value) => parseEnum(value, ["ADMIN", "MANAGER"] as const, { caseInsensitive: true }) },
        },
        {
            invalidPayloadMessage: "Invalid payload.",
            invalidFieldMessages: {
                role: "Invalid role.",
            },
        }
    );

    assert.equal(result.ok, false);
    if (!result.ok) {
        assert.equal(result.message, "Invalid role.");
    }
});

test("parseRequestJsonWithSchema handles malformed JSON", async () => {
    const req = new Request("https://portal.example.com/api/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{ bad-json",
    });

    const result = await parseRequestJsonWithSchema(
        req,
        {
            id: { parse: (value) => parseString(value) },
        },
        {
            invalidPayloadMessage: "Invalid payload.",
        }
    );

    assert.equal(result.ok, false);
    if (!result.ok) {
        assert.equal(result.message, "Invalid payload.");
    }
});
