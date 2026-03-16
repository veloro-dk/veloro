import assert from "node:assert/strict";
import test from "node:test";
import {
    deleteCatalogEntriesFromApi,
    fetchCatalogStateFromApi,
    getCachedCatalogStateSnapshot,
    getCachedCatalogStateVersion,
    resetCatalogStateClientCache,
    saveCatalogStateToApi,
    type CatalogStateSnapshot,
} from "@/lib/catalogStateClient";

function createEmptyState(): CatalogStateSnapshot {
    return {
        variantDefinitions: [],
        categoryDefinitions: [],
        products: [],
        inventoryBatches: [],
        inventorySales: [],
        purchaseOrders: [],
        suppliers: [],
    };
}

function createJsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
    });
}

test("saveCatalogStateToApi sends expectedVersion from cached snapshot", async () => {
    resetCatalogStateClientCache();

    const initialState = createEmptyState();
    const nextState = createEmptyState();
    const requests: Array<{ url: string; body: unknown }> = [];
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        const rawBody = typeof init?.body === "string" ? init.body : "";
        const body = rawBody ? JSON.parse(rawBody) : null;
        requests.push({ url, body });

        if (requests.length === 1) {
            return createJsonResponse({ ok: true, state: initialState, version: 3 });
        }

        return createJsonResponse({ ok: true, state: nextState, version: 4 });
    }) as typeof fetch;

    try {
        await fetchCatalogStateFromApi();
        const state = await saveCatalogStateToApi({ products: [] });

        assert.deepEqual(state, nextState);
        assert.equal(requests.length, 2);
        assert.equal(requests[0]?.url, "/api/catalog/state");
        assert.equal(requests[1]?.url, "/api/catalog/state");
        assert.equal((requests[1]?.body as { expectedVersion?: number }).expectedVersion, 3);
        assert.equal(getCachedCatalogStateVersion(), 4);
    } finally {
        globalThis.fetch = originalFetch;
        resetCatalogStateClientCache();
    }
});

test("saveCatalogStateToApi updates cache from conflict responses", async () => {
    resetCatalogStateClientCache();

    const initialState = createEmptyState();
    const conflictState = createEmptyState();
    let callCount = 0;
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () => {
        callCount += 1;
        if (callCount === 1) {
            return createJsonResponse({ ok: true, state: initialState, version: 10 });
        }

        return createJsonResponse(
            {
                ok: false,
                message: "Catalog data changed in another session. Reload and try again.",
                state: conflictState,
                version: 11,
            },
            409
        );
    }) as typeof fetch;

    try {
        await fetchCatalogStateFromApi();
        await assert.rejects(
            saveCatalogStateToApi({ products: [] }),
            /Catalog data changed in another session/,
        );

        assert.equal(getCachedCatalogStateVersion(), 11);
        assert.deepEqual(getCachedCatalogStateSnapshot(), conflictState);
    } finally {
        globalThis.fetch = originalFetch;
        resetCatalogStateClientCache();
    }
});

test("deleteCatalogEntriesFromApi sends expectedVersion and refreshes cache", async () => {
    resetCatalogStateClientCache();

    const initialState = createEmptyState();
    const nextState = createEmptyState();
    const requests: Array<{ url: string; body: unknown }> = [];
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        const rawBody = typeof init?.body === "string" ? init.body : "";
        const body = rawBody ? JSON.parse(rawBody) : null;
        requests.push({ url, body });

        if (requests.length === 1) {
            return createJsonResponse({ ok: true, state: initialState, version: 20 });
        }

        return createJsonResponse({ ok: true, state: nextState, version: 21, deletedCount: 1 });
    }) as typeof fetch;

    try {
        await fetchCatalogStateFromApi();
        const response = await deleteCatalogEntriesFromApi({
            entity: "variables",
            keys: ["color"],
        });

        assert.equal(response.deletedCount, 1);
        assert.equal((requests[1]?.body as { expectedVersion?: number }).expectedVersion, 20);
        assert.equal(getCachedCatalogStateVersion(), 21);
        assert.deepEqual(getCachedCatalogStateSnapshot(), nextState);
    } finally {
        globalThis.fetch = originalFetch;
        resetCatalogStateClientCache();
    }
});
