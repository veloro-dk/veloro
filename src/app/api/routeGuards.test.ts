import assert from "node:assert/strict";
import test from "node:test";

type GuardedRoute = {
    name: string;
    path: string;
    load: () => Promise<{ POST: (req: Request) => Promise<Response> }>;
};

const APP_ORIGIN = "https://portal.veloro.dk";
const EVIL_ORIGIN = "https://evil.example";

process.env.DATABASE_URL ??= "postgresql://veloro:veloro@localhost:5432/veloro_test";

const GUARDED_ROUTES: GuardedRoute[] = [
    { name: "auth/login", path: "/api/auth/login", load: () => import("@/app/api/auth/login/route") },
    { name: "catalog/state", path: "/api/catalog/state", load: () => import("@/app/api/catalog/state/route") },
    { name: "catalog/delete", path: "/api/catalog/delete", load: () => import("@/app/api/catalog/delete/route") },
    { name: "team/users", path: "/api/team/users", load: () => import("@/app/api/team/users/route") },
    { name: "user/preferences/language", path: "/api/user/preferences/language", load: () => import("@/app/api/user/preferences/language/route") },
    { name: "user/stores/select", path: "/api/user/stores/select", load: () => import("@/app/api/user/stores/select/route") },
];

function createPostRequest(
    path: string,
    options: {
        origin?: string;
        contentType?: string;
        body?: unknown;
    } = {}
) {
    const headers = new Headers();
    if (options.origin) headers.set("origin", options.origin);
    if (options.contentType) headers.set("content-type", options.contentType);

    let body: string | undefined;
    if (options.body !== undefined) {
        if (typeof options.body === "string") {
            body = options.body;
        } else {
            body = JSON.stringify(options.body);
        }
    }

    return new Request(`${APP_ORIGIN}${path}`, {
        method: "POST",
        headers,
        body,
    });
}

for (const route of GUARDED_ROUTES) {
    test(`${route.name} rejects cross-origin requests`, async () => {
        const { POST } = await route.load();
        const req = createPostRequest(route.path, {
            origin: EVIL_ORIGIN,
            contentType: "application/json",
            body: {},
        });

        const response = await POST(req);
        const payload = await response.json();

        assert.equal(response.status, 403);
        assert.equal(payload.ok, false);
        assert.equal(payload.message, "Invalid request origin.");
    });

    test(`${route.name} rejects non-json content type`, async () => {
        const { POST } = await route.load();
        const req = createPostRequest(route.path, {
            origin: APP_ORIGIN,
            contentType: "text/plain",
            body: "not-json",
        });

        const response = await POST(req);
        const payload = await response.json();

        assert.equal(response.status, 415);
        assert.equal(payload.ok, false);
        assert.equal(payload.message, "Unsupported content type.");
    });
}

test("auth/login validates required payload fields", async () => {
    const { POST: authLoginPost } = await import("@/app/api/auth/login/route");
    const req = createPostRequest("/api/auth/login", {
        origin: APP_ORIGIN,
        contentType: "application/json",
        body: { employeeId: "", password: "" },
    });

    const response = await authLoginPost(req);
    const payload = await response.json();

    assert.equal(response.status, 400);
    assert.equal(payload.ok, false);
    assert.equal(payload.message, "Please enter your employee ID and password.");
});
