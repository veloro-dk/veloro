import "server-only";
import { validateRuntimeEnv } from "@/server/envValidation";

let cachedRuntimeEnv: RuntimeEnv | null = null;

export function getRuntimeEnv(): RuntimeEnv {
    if (cachedRuntimeEnv) return cachedRuntimeEnv;
    cachedRuntimeEnv = validateRuntimeEnv(process.env);
    return cachedRuntimeEnv;
}

export type RuntimeEnv = ReturnType<typeof validateRuntimeEnv>;
