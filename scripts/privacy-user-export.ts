import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { validateRuntimeEnv } from "@/server/envValidation";

type ParsedArgs = {
    userId?: string;
    employeeId?: string;
    output?: string;
};

function parseArgs(argv: string[]): ParsedArgs {
    const args: ParsedArgs = {};

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

        if (arg === "--output") {
            const value = argv[index + 1];
            index += 1;
            if (!value) throw new Error("Missing value for --output.");
            args.output = value.trim();
            continue;
        }

        throw new Error(`Unknown argument: ${arg}`);
    }

    return args;
}

function sanitizeFilePart(value: string) {
    return value.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "user";
}

function getIdentifier(args: ParsedArgs) {
    const userId = args.userId || (process.env.PRIVACY_USER_ID || "").trim();
    const employeeId = args.employeeId || (process.env.PRIVACY_EMPLOYEE_ID || "").trim();
    if (!userId && !employeeId) {
        throw new Error("Missing identifier. Provide --user-id or --employee-id (or PRIVACY_USER_ID / PRIVACY_EMPLOYEE_ID).");
    }

    return { userId: userId || null, employeeId: employeeId || null };
}

function resolveOutputPath(args: ParsedArgs, fallbackKey: string) {
    const cliOrEnvOutput = args.output || (process.env.PRIVACY_EXPORT_OUTPUT_FILE || "").trim();
    if (cliOrEnvOutput) {
        return path.resolve(process.cwd(), cliOrEnvOutput);
    }

    const timestamp = new Date().toISOString().replace(/:/g, "").replace(/\..+$/, "Z").replace("T", "_");
    const fileName = `user_export_${sanitizeFilePart(fallbackKey)}_${timestamp}.json`;
    return path.resolve(process.cwd(), "exports/privacy", fileName);
}

async function main() {
    const runtimeEnv = validateRuntimeEnv(process.env);
    const args = parseArgs(process.argv.slice(2));
    const identifier = getIdentifier(args);
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
                requiresPasswordReset: true,
                name: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            throw new Error("User not found.");
        }

        const [settings, storeAccess, sessions, loginAttempts, auditLogs, feedbackMessages, purchases, sales] = await Promise.all([
            prisma.userSettings.findUnique({
                where: { userId: user.id },
            }),
            prisma.userStoreAccess.findMany({
                where: { userId: user.id },
                include: {
                    store: {
                        select: { id: true, name: true, slug: true },
                    },
                },
                orderBy: { createdAt: "asc" },
            }),
            prisma.session.findMany({
                where: { userId: user.id },
                select: {
                    id: true,
                    createdAt: true,
                    lastSeenAt: true,
                    rotatedAt: true,
                    expiresAt: true,
                },
                orderBy: { createdAt: "asc" },
            }),
            prisma.loginAttempt.findMany({
                where: { employeeId: user.employeeId },
                select: {
                    id: true,
                    createdAt: true,
                    ok: true,
                    ipHash: true,
                    employeeId: true,
                },
                orderBy: { createdAt: "asc" },
            }),
            prisma.auditLog.findMany({
                where: { actorId: user.id },
                select: {
                    id: true,
                    createdAt: true,
                    action: true,
                    entity: true,
                    entityId: true,
                    meta: true,
                },
                orderBy: { createdAt: "asc" },
            }),
            prisma.feedbackMessage.findMany({
                where: { createdById: user.id },
                select: {
                    id: true,
                    createdAt: true,
                    updatedAt: true,
                    kind: true,
                    pagePath: true,
                    message: true,
                },
                orderBy: { createdAt: "asc" },
            }),
            prisma.purchase.findMany({
                where: { createdById: user.id },
                select: {
                    id: true,
                    storeId: true,
                    purchaseDate: true,
                    currency: true,
                    supplierName: true,
                    notes: true,
                    createdAt: true,
                    updatedAt: true,
                },
                orderBy: { createdAt: "asc" },
            }),
            prisma.sale.findMany({
                where: { createdById: user.id },
                select: {
                    id: true,
                    storeId: true,
                    saleDate: true,
                    currency: true,
                    notes: true,
                    createdAt: true,
                    updatedAt: true,
                },
                orderBy: { createdAt: "asc" },
            }),
        ]);

        const exportPayload = {
            generatedAt: new Date().toISOString(),
            user,
            settings,
            storeAccess,
            sessions,
            loginAttempts,
            auditLogs,
            feedbackMessages,
            purchases,
            sales,
            summary: {
                sessions: sessions.length,
                loginAttempts: loginAttempts.length,
                auditLogs: auditLogs.length,
                feedbackMessages: feedbackMessages.length,
                purchases: purchases.length,
                sales: sales.length,
                storeAccess: storeAccess.length,
            },
        };

        const outputPath = resolveOutputPath(args, user.employeeId || user.id);
        await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.promises.writeFile(outputPath, `${JSON.stringify(exportPayload, null, 2)}\n`, "utf8");

        console.log(`Privacy export created: ${outputPath}`);
        console.log(
            `Summary: sessions=${sessions.length} loginAttempts=${loginAttempts.length} auditLogs=${auditLogs.length} feedback=${feedbackMessages.length}`
        );
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error: unknown) => {
    console.error("[privacy-user-export]", error);
    process.exit(1);
});
