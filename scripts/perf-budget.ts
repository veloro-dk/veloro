import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import zlib from "node:zlib";

type RouteBudget = {
    jsRawBytes?: number;
    cssRawBytes?: number;
    jsGzipBytes?: number;
    cssGzipBytes?: number;
};

type RouteBudgetConfig = {
    route: string;
    manifestFile: string;
    manifestRouteKey: string;
    entryKey: string;
    budgets: RouteBudget;
};

type BudgetConfig = {
    routes: RouteBudgetConfig[];
};

type EntryCssAsset = {
    path: string;
    inlined?: boolean;
};

type RouteManifest = {
    entryJSFiles?: Record<string, string[]>;
    entryCSSFiles?: Record<string, EntryCssAsset[]>;
};

type RouteMetrics = {
    jsRawBytes: number;
    cssRawBytes: number;
    jsGzipBytes: number;
    cssGzipBytes: number;
    jsFiles: string[];
    cssFiles: string[];
};

type BudgetCheck = {
    metric: string;
    actual: number;
    limit: number;
    passed: boolean;
};

function formatBytes(bytes: number) {
    if (!Number.isFinite(bytes)) return "n/a";
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    return `${kb.toFixed(1)} KB`;
}

function normalizeAssetPath(assetPath: string) {
    const trimmed = assetPath.replace(/^\/+/, "");
    if (trimmed.startsWith("_next/")) return trimmed.slice("_next/".length);
    return trimmed;
}

function parseRouteManifest(manifestFilePath: string, manifestRouteKey: string) {
    const source = fs.readFileSync(manifestFilePath, "utf8");
    const sandbox: { globalThis: { __RSC_MANIFEST?: Record<string, RouteManifest> } } = {
        globalThis: {},
    };

    vm.runInNewContext(source, sandbox, {
        filename: manifestFilePath,
        timeout: 1000,
    });

    const manifest = sandbox.globalThis.__RSC_MANIFEST?.[manifestRouteKey];
    if (!manifest) {
        throw new Error(`Missing route manifest key "${manifestRouteKey}" in ${manifestFilePath}.`);
    }

    return manifest;
}

function sumAssetBytes(cwd: string, assetPaths: string[]) {
    return assetPaths.reduce((total, assetPath) => {
        const resolved = path.resolve(cwd, ".next", normalizeAssetPath(assetPath));
        return total + fs.readFileSync(resolved).length;
    }, 0);
}

function sumAssetGzipBytes(cwd: string, assetPaths: string[]) {
    return assetPaths.reduce((total, assetPath) => {
        const resolved = path.resolve(cwd, ".next", normalizeAssetPath(assetPath));
        const content = fs.readFileSync(resolved);
        return total + zlib.gzipSync(content, { level: 9 }).length;
    }, 0);
}

function collectMetrics(cwd: string, config: RouteBudgetConfig): RouteMetrics {
    const manifestPath = path.resolve(cwd, config.manifestFile);
    if (!fs.existsSync(manifestPath)) {
        throw new Error(`Missing manifest file: ${config.manifestFile}. Run "npm run build" first.`);
    }

    const manifest = parseRouteManifest(manifestPath, config.manifestRouteKey);
    const jsFiles = Array.from(new Set(manifest.entryJSFiles?.[config.entryKey] ?? []));
    const cssFiles = Array.from(
        new Set((manifest.entryCSSFiles?.[config.entryKey] ?? []).map((entry) => entry.path))
    );

    return {
        jsRawBytes: sumAssetBytes(cwd, jsFiles),
        cssRawBytes: sumAssetBytes(cwd, cssFiles),
        jsGzipBytes: sumAssetGzipBytes(cwd, jsFiles),
        cssGzipBytes: sumAssetGzipBytes(cwd, cssFiles),
        jsFiles,
        cssFiles,
    };
}

function evaluateBudgets(metrics: RouteMetrics, budget: RouteBudget): BudgetCheck[] {
    const checks: BudgetCheck[] = [];
    if (typeof budget.jsRawBytes === "number") {
        checks.push({
            metric: "js raw",
            actual: metrics.jsRawBytes,
            limit: budget.jsRawBytes,
            passed: metrics.jsRawBytes <= budget.jsRawBytes,
        });
    }
    if (typeof budget.cssRawBytes === "number") {
        checks.push({
            metric: "css raw",
            actual: metrics.cssRawBytes,
            limit: budget.cssRawBytes,
            passed: metrics.cssRawBytes <= budget.cssRawBytes,
        });
    }
    if (typeof budget.jsGzipBytes === "number") {
        checks.push({
            metric: "js gzip",
            actual: metrics.jsGzipBytes,
            limit: budget.jsGzipBytes,
            passed: metrics.jsGzipBytes <= budget.jsGzipBytes,
        });
    }
    if (typeof budget.cssGzipBytes === "number") {
        checks.push({
            metric: "css gzip",
            actual: metrics.cssGzipBytes,
            limit: budget.cssGzipBytes,
            passed: metrics.cssGzipBytes <= budget.cssGzipBytes,
        });
    }
    return checks;
}

function loadBudgetConfig(cwd: string): BudgetConfig {
    const configPath = path.resolve(cwd, "config/performance-budgets.json");
    if (!fs.existsSync(configPath)) {
        throw new Error(`Missing config file: ${configPath}`);
    }

    const parsed = JSON.parse(fs.readFileSync(configPath, "utf8")) as Partial<BudgetConfig>;
    if (!parsed || !Array.isArray(parsed.routes) || parsed.routes.length === 0) {
        throw new Error("config/performance-budgets.json must include at least one route.");
    }
    return parsed as BudgetConfig;
}

function printRouteReport(route: string, metrics: RouteMetrics, checks: BudgetCheck[]) {
    console.log(`\n${route}`);
    console.log(`  JS files: ${metrics.jsFiles.length}, CSS files: ${metrics.cssFiles.length}`);
    for (const check of checks) {
        const status = check.passed ? "PASS" : "FAIL";
        console.log(
            `  [${status}] ${check.metric.padEnd(8)} ${formatBytes(check.actual).padStart(10)} / ${formatBytes(check.limit).padEnd(10)}`
        );
    }
}

function main() {
    const cwd = process.cwd();
    const config = loadBudgetConfig(cwd);
    const failures: Array<{ route: string; check: BudgetCheck }> = [];

    for (const routeConfig of config.routes) {
        const metrics = collectMetrics(cwd, routeConfig);
        const checks = evaluateBudgets(metrics, routeConfig.budgets);
        printRouteReport(routeConfig.route, metrics, checks);

        for (const check of checks) {
            if (!check.passed) {
                failures.push({ route: routeConfig.route, check });
            }
        }
    }

    if (failures.length > 0) {
        console.error("\nPerformance budgets exceeded:");
        for (const failure of failures) {
            console.error(
                `- ${failure.route}: ${failure.check.metric} ${formatBytes(failure.check.actual)} > ${formatBytes(failure.check.limit)}`
            );
        }
        process.exit(1);
    }

    console.log("\nPerformance budgets passed for all configured routes.");
}

main();
