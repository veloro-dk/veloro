import "dotenv/config";
import crypto from "node:crypto";
import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { validateRuntimeEnv } from "@/server/envValidation";

type ParsedArgs = {
    userId?: string;
    employeeId?: string;
    confirm: boolean;
    allowAdmin: boolean;
};

function parseArgs(argv: string[]) {
    const args: ParsedArgs = {
        confirm: false,
        allowAdmin: false,
    };

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === "--user-id") {
            const value = argv[index + 1];
            index += 1;
            if (!value) throw new Error("Missing value for --user-id.");
            args.userId = value.trim();
            continue;
        }

        if (arg === "--employee-id") {
            const value = argv[index + 1];
            index += 1;
            if (!value) throw new Error("Missing value for --employee-id.");
            args.employeeId = value.trim();
            continue;
        }

        if (arg === "--confirm") {
            args.confirm = true;
            continue;
        }

        if (arg === "--allow-admin") {
            args.allowAdmin = true;
            continue;
        }

        throw new Error(`Unknown argument: ${arg}`);
    }

    return args;
}

function readBooleanEnv(name: string) {
    const raw = (process.env[name] || "").trim().toLowerCase();
    return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function requireConfirmation(confirmFlag: boolean) {
    const envConfirm = (process.env.PRIVACY_DELETE_CONFIRM || "").trim().toUpperCase();
    if (!confirmFlag && envConfirm !== "YES") {
        throw new Error("Refusing anonymization. Pass --confirm or set PRIVACY_DELETE_CONFIRM=YES.");
    }
}

function ensureProductionGuardrail(nodeEnv: string) {
    if (nodeEnv !== "production") return;
    const allowed = (process.env.ALLOW_PRODUCTION_PRIVACY_DELETE || "").trim().toUpperCase();
    if (allowed !== "YES") {
        throw new Error("Refusing production anonymization. Set ALLOW_PRODUCTION_PRIVACY_DELETE=YES to proceed.");
    }
}

function resolveIdentifier(args: ParsedArgs) {
    const userId = args.userId || (process.env.PRIVACY_USER_ID || "").trim();
    const employeeId = args.employeeId || (process.env.PRIVACY_EMPLOYEE_ID || "").trim();
    if (!userId && !employeeId) {
        throw new Error("Missing identifier. Provide --user-id or --employee-id (or PRIVACY_USER_ID / PRIVACY_EMPLOYEE_ID).");
    }
    return { userId: userId || null, employeeId: employeeId || null };
}

async function hashRandomPassword() {
    const randomPassword = crypto.randomBytes(48).toString("base64url");
    return argon2.hash(randomPassword, { type: argon2.argon2id });
}

async function main() {
    const runtimeEnv = validateRuntimeEnv(process.env);
    const args = parseArgs(process.argv.slice(2));
    requireConfirmation(args.confirm);
    ensureProductionGuardrail(runtimeEnv.nodeEnv);

    const identifier = resolveIdentifier(args);
    const allowAdmin = args.allowAdmin || readBooleanEnv("PRIVACY_ALLOW_ADMIN_DELETE");

    const adapter = new PrismaPg({ connectionString: runtimeEnv.databaseUrl });
    const prisma = new PrismaClient({ adapter, log: ["error"] });

    try {
        const user = await prisma.user.findUnique({
            where: identifier.userId
                ? { id: identifier.userId }
                : { employeeId: identifier.employeeId! },
            select: {
                id: true,
                employeeId: true,
                role: true,
                status: true,
                email: true,
                phone: true,
            },
        });

        if (!user) {
            throw new Error("User not found.");
        }

        if (user.role === "ADMIN" && !allowAdmin) {
            throw new Error("Refusing to anonymize ADMIN user without --allow-admin (or PRIVACY_ALLOW_ADMIN_DELETE=true).");
        }

        const anonymizedEmployeeId = `deleted-${user.id}`;
        const anonymizedName = `Deleted User ${user.id.slice(0, 8)}`;
        const anonymizedPasswordHash = await hashRandomPassword();

        const result = await prisma.$transaction(async (tx) => {
            const sessionsDeleted = await tx.session.deleteMany({
                where: { userId: user.id },
            });

            const loginAttemptsRedacted = await tx.loginAttempt.updateMany({
                where: { employeeId: user.employeeId },
                data: { employeeId: null },
            });

            const feedbackMessagesDeleted = await tx.feedbackMessage.deleteMany({
                where: { createdById: user.id },
            });

            const storeAccessDeleted = await tx.userStoreAccess.deleteMany({
                where: { userId: user.id },
            });

            await tx.userSettings.updateMany({
                where: { userId: user.id },
                data: {
                    activeStoreId: null,
                    preferredLanguage: "en",
                    preferredCurrencyCode: null,
                    timeZone: "Europe/Copenhagen",
                    dateFormat: "DD/MM/YYYY",
                    weekStartDay: "MONDAY",
                    defaultTimeZone: "Europe/Copenhagen",
                },
            });

            await tx.user.update({
                where: { id: user.id },
                data: {
                    employeeId: anonymizedEmployeeId,
                    name: anonymizedName,
                    firstName: "Deleted",
                    lastName: "User",
                    email: null,
                    phone: null,
                    passwordHash: anonymizedPasswordHash,
                    status: "DISABLED",
                    requiresPasswordReset: true,
                },
            });

            return {
                sessionsDeleted: sessionsDeleted.count,
                loginAttemptsRedacted: loginAttemptsRedacted.count,
                feedbackMessagesDeleted: feedbackMessagesDeleted.count,
                storeAccessDeleted: storeAccessDeleted.count,
            };
        });

        console.log(
            JSON.stringify(
                {
                    ok: true,
                    userId: user.id,
                    previousEmployeeId: user.employeeId,
                    anonymizedEmployeeId,
                    result,
                    note: "Direct profile identifiers removed. Historical audit rows are retained for operational/security records.",
                },
                null,
                2
            )
        );
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error: unknown) => {
    console.error("[privacy-user-anonymize]", error);
    process.exit(1);
});
