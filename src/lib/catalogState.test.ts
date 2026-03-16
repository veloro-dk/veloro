import assert from "node:assert/strict";
import test from "node:test";
import {
    buildDefaultCatalogState,
    normalizeCatalogState,
    parseCatalogExpectedVersion,
} from "@/lib/catalogState";

test("buildDefaultCatalogState returns stable default arrays", () => {
    const state = buildDefaultCatalogState();

    assert.ok(Array.isArray(state.variantDefinitions));
    assert.ok(Array.isArray(state.categoryDefinitions));
    assert.ok(Array.isArray(state.products));
    assert.deepEqual(state.inventoryBatches, []);
    assert.deepEqual(state.inventorySales, []);
    assert.deepEqual(state.purchaseOrders, []);
    assert.deepEqual(state.suppliers, []);
});

test("normalizeCatalogState tolerates malformed payloads", () => {
    const state = normalizeCatalogState({
        variantDefinitions: "invalid",
        categoryDefinitions: 42,
        products: null,
        inventoryBatches: "bad",
        inventorySales: {},
        purchaseOrders: false,
        suppliers: { bad: true },
    });

    assert.ok(Array.isArray(state.variantDefinitions));
    assert.ok(Array.isArray(state.categoryDefinitions));
    assert.ok(Array.isArray(state.products));
    assert.ok(Array.isArray(state.inventoryBatches));
    assert.ok(Array.isArray(state.inventorySales));
    assert.ok(Array.isArray(state.purchaseOrders));
    assert.ok(Array.isArray(state.suppliers));
});

test("parseCatalogExpectedVersion accepts only positive integers", () => {
    assert.equal(parseCatalogExpectedVersion(1), 1);
    assert.equal(parseCatalogExpectedVersion(99), 99);
    assert.equal(parseCatalogExpectedVersion(0), null);
    assert.equal(parseCatalogExpectedVersion(-1), null);
    assert.equal(parseCatalogExpectedVersion(2.5), null);
    assert.equal(parseCatalogExpectedVersion("1"), null);
    assert.equal(parseCatalogExpectedVersion(undefined), null);
});
