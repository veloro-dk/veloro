import assert from "node:assert/strict";
import test from "node:test";
import { parseStoreSelectionPayload } from "@/server/storeSelectionPayload";

test("parseStoreSelectionPayload trims incoming store id", () => {
    const parsed = parseStoreSelectionPayload({ storeId: "  store-123  " });

    assert.equal(parsed.storeId, "store-123");
    assert.equal(parsed.isValid, true);
});

test("parseStoreSelectionPayload rejects missing store id", () => {
    assert.equal(parseStoreSelectionPayload({ storeId: "" }).isValid, false);
    assert.equal(parseStoreSelectionPayload({}).isValid, false);
    assert.equal(parseStoreSelectionPayload(null).isValid, false);
});
