import "server-only";
import crypto from "crypto";
import { prisma } from "@/server/db";

function sha256Hex(input: string) {
    return crypto.createHash("sha256").update(input).digest("hex");
}

export function hashIp(ip: string) {
    return sha256Hex(ip).slice(0, 64);
}

export async function ensureLoginAllowed(params: { ip: string; employeeId?: string }) {
    const now = Date.now();
    const windowMs = 10 * 60 * 1000;
    const since = new Date(now - windowMs);

    const ipHash = hashIp(params.ip);
    const employeeId = params.employeeId?.trim() || undefined;

    const [ipFails, idFails] = await Promise.all([
        prisma.loginAttempt.count({
            where: { ipHash, ok: false, createdAt: { gt: since } },
        }),
        employeeId
            ? prisma.loginAttempt.count({
                where: { employeeId, ok: false, createdAt: { gt: since } },
            })
            : Promise.resolve(0),
    ]);

    if (ipFails >= 10 || idFails >= 10) {
        return { allowed: false as const, ipHash };
    }

    return { allowed: true as const, ipHash };
}

export async function recordLoginAttempt(params: { ipHash: string; employeeId?: string; ok: boolean }) {
    await prisma.loginAttempt.create({
        data: {
            ipHash: params.ipHash,
            employeeId: params.employeeId?.trim() || null,
            ok: params.ok,
        },
    });
}