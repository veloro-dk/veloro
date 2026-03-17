import assert from "node:assert/strict";
import test from "node:test";
import { isTransientDatabaseError, withDatabaseRetry } from "@/server/dbRetry";

test("isTransientDatabaseError recognizes Prisma-style transient codes", () => {
    assert.equal(isTransientDatabaseError({ code: "P1001" }), true);
    assert.equal(isTransientDatabaseError({ code: "P1017" }), true);
    assert.equal(isTransientDatabaseError({ code: "P2024" }), true);
    assert.equal(isTransientDatabaseError({ code: "P2002" }), false);
});

test("withDatabaseRetry retries transient failures before succeeding", async () => {
    let attempts = 0;

    const result = await withDatabaseRetry(
        async () => {
            attempts += 1;

            if (attempts < 3) {
                const error = new Error("Can't reach database server at example");
                (error as Error & { code?: string }).code = "P1001";
                throw error;
            }

            return "ok";
        },
        {
            maxAttempts: 3,
            sleep: async () => undefined,
        }
    );

    assert.equal(result, "ok");
    assert.equal(attempts, 3);
});

test("withDatabaseRetry does not retry non-transient failures", async () => {
    let attempts = 0;

    await assert.rejects(
        withDatabaseRetry(
            async () => {
                attempts += 1;
                throw new Error("Validation failed");
            },
            {
                maxAttempts: 3,
                sleep: async () => undefined,
            }
        ),
        /Validation failed/
    );

    assert.equal(attempts, 1);
});
