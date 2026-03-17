import "server-only";
import crypto from "crypto";
import argon2 from "argon2";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { isTransientDatabaseError, runBestEffortDbWrite, withDatabaseRetry } from "@/server/dbRetry";
import { cookies, headers } from "next/headers";

const SESSION_COOKIE_NAME = "veloro_session";

const SESSION_LIFETIME_MS = 1000 * 60 * 60 * 24 * 7;
const SESSION_IDLE_MS = 1000 * 60 * 60 * 6;
const SESSION_ROTATE_MS = 1000 * 60 * 60 * 6;

function sha256(input: string) {
    return crypto.createHash("sha256").update(input).digest("hex");
}

function randomToken() {
    return crypto.randomBytes(32).toString("base64url");
}

function isUniqueConstraintError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function getCookieDomain() {
    const h = await headers();
    const host = h.get("host") || "";
    if (host.includes("localhost")) return undefined;
    if (host === "portal.veloro.dk") return "portal.veloro.dk";
    return undefined;
}

async function setSessionCookie(token: string, expiresAt: Date) {
    const c = await cookies();
    c.set({
        name: SESSION_COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        domain: await getCookieDomain(),
        expires: expiresAt,
    });
}

async function clearSessionCookie() {
    const c = await cookies();
    c.set({
        name: SESSION_COOKIE_NAME,
        value: "",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        domain: await getCookieDomain(),
        expires: new Date(0),
    });
}

type GetSessionUserOptions = {
    allowCookieMutation?: boolean;
};

export async function hashPassword(password: string) {
    return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string) {
    try {
        return await argon2.verify(hash, password);
    } catch {
        return false;
    }
}

export async function createSession(userId: string) {
    const now = Date.now();
    const expiresAt = new Date(now + SESSION_LIFETIME_MS);

    await runBestEffortDbWrite("session_cleanup", () => prisma.session.deleteMany({
        where: { expiresAt: { lt: new Date() } },
    }));

    for (let i = 0; i < 3; i++) {
        const token = randomToken();
        const tokenHash = sha256(token);

        try {
            await withDatabaseRetry(() => prisma.session.create({
                data: {
                    userId,
                    tokenHash,
                    expiresAt,
                    lastSeenAt: new Date(),
                    rotatedAt: new Date(),
                },
            }));

            await setSessionCookie(token, expiresAt);
            return;
        } catch (error: unknown) {
            if (!isUniqueConstraintError(error)) throw error;
        }
    }

    throw new Error("Failed to create session.");
}

export async function destroySession() {
    const c = await cookies();
    const token = c.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
        const tokenHash = sha256(token);
        await runBestEffortDbWrite("session_destroy", () => prisma.session.deleteMany({ where: { tokenHash } }));
    }

    await clearSessionCookie();
}

export async function getSessionUser(options: GetSessionUserOptions = {}) {
    const allowCookieMutation = options.allowCookieMutation === true;
    const c = await cookies();
    const token = c.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    await runBestEffortDbWrite("session_cleanup", () => prisma.session.deleteMany({
        where: { expiresAt: { lt: new Date() } },
    }));

    const tokenHash = sha256(token);
    const session = await withDatabaseRetry(() => prisma.session.findFirst({
        where: {
            tokenHash,
            expiresAt: { gt: new Date() },
        },
        include: { user: true },
    }));

    if (!session) {
        if (allowCookieMutation) await clearSessionCookie();
        return null;
    }

    if (session.user.status !== "ACTIVE") {
        await runBestEffortDbWrite("session_invalidate_inactive_user", () => prisma.session.deleteMany({
            where: { id: session.id },
        }));
        if (allowCookieMutation) await clearSessionCookie();
        return null;
    }

    const now = Date.now();
    const lastSeenMs = session.lastSeenAt.getTime();

    if (now - lastSeenMs > SESSION_IDLE_MS) {
        await runBestEffortDbWrite("session_invalidate_idle", () => prisma.session.deleteMany({
            where: { id: session.id },
        }));
        if (allowCookieMutation) await clearSessionCookie();
        return null;
    }

    const rotatedMs = session.rotatedAt.getTime();
    const shouldRotate = now - rotatedMs > SESSION_ROTATE_MS;

    if (shouldRotate && allowCookieMutation) {
        for (let i = 0; i < 3; i++) {
            const newToken = randomToken();
            const newHash = sha256(newToken);

            try {
                const updated = await withDatabaseRetry(() => prisma.session.update({
                    where: { id: session.id },
                    data: {
                        tokenHash: newHash,
                        rotatedAt: new Date(),
                        lastSeenAt: new Date(),
                    },
                }));

                await setSessionCookie(newToken, updated.expiresAt);
                return session.user;
            } catch (error: unknown) {
                if (isUniqueConstraintError(error)) continue;
                if (isTransientDatabaseError(error)) return session.user;
                throw error;
            }
        }

        await runBestEffortDbWrite("session_invalidate_rotation_failure", () => prisma.session.deleteMany({
            where: { id: session.id },
        }));
        await clearSessionCookie();
        return null;
    }

    await runBestEffortDbWrite("session_touch", () => prisma.session.update({
        where: { id: session.id },
        data: { lastSeenAt: new Date() },
    }));

    return session.user;
}

export async function getClientIp() {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    return h.get("x-real-ip") || "unknown";
}
