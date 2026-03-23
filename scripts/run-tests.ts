import { readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function collectTestFiles(dirPath: string, acc: string[]) {
    for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            collectTestFiles(fullPath, acc);
            continue;
        }
        if (entry.isFile() && entry.name.endsWith(".test.ts")) {
            acc.push(fullPath);
        }
    }
}

const srcDir = path.resolve(process.cwd(), "src");
const testFiles: string[] = [];
collectTestFiles(srcDir, testFiles);
testFiles.sort();

if (testFiles.length === 0) {
    console.error("No test files were found under src.");
    process.exit(1);
}

const result = spawnSync(
    process.execPath,
    ["--conditions=react-server", "--test", "--import", "tsx", ...testFiles],
    {
        stdio: "inherit",
        env: process.env,
    }
);

if (result.error) {
    throw result.error;
}

process.exit(result.status ?? 1);
