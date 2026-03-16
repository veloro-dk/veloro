import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const WRITE_OPERATION_PATTERN = /(?:prisma|tx)\.[A-Za-z0-9_]+\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\(/;
const WRITE_ENDPOINT_PATTERN = /export const (POST|PUT|PATCH|DELETE)\s*=/;
const AUDIT_LOG_CREATE_PATTERN = /(?:prisma|tx)\.auditLog\.create\(/;

function listRouteFiles(rootDir: string): string[] {
    const results: string[] = [];

    function walk(currentDir: string) {
        for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
                continue;
            }
            if (entry.isFile() && entry.name === "route.ts") {
                results.push(fullPath);
            }
        }
    }

    walk(rootDir);
    return results.sort();
}

test("all write API routes include an audit log create event", () => {
    const apiRoot = path.resolve(process.cwd(), "src/app/api");
    const missingAuditLogRoutes: string[] = [];

    for (const routeFile of listRouteFiles(apiRoot)) {
        const source = fs.readFileSync(routeFile, "utf8");
        const hasWriteEndpoint = WRITE_ENDPOINT_PATTERN.test(source);
        const hasWriteOperation = WRITE_OPERATION_PATTERN.test(source);
        if (!hasWriteEndpoint || !hasWriteOperation) {
            continue;
        }

        if (!AUDIT_LOG_CREATE_PATTERN.test(source)) {
            missingAuditLogRoutes.push(path.relative(process.cwd(), routeFile));
        }
    }

    assert.deepEqual(
        missingAuditLogRoutes,
        [],
        `Missing audit log writes in: ${missingAuditLogRoutes.join(", ")}`
    );
});
