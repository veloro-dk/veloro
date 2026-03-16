import fs from "node:fs";
import path from "node:path";

const DEFAULT_LOG_PATH = "ops/disaster-recovery/drill-log.md";
const DUE_DATE_COLUMN_INDEX = 9;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type ParsedRow = {
    cells: string[];
    lineNumber: number;
};

function parseDateUtc(value: string) {
    if (!DATE_PATTERN.test(value)) return null;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDateOnlyUtc(value: Date) {
    return value.toISOString().slice(0, 10);
}

function readTableRows(content: string) {
    const rows: ParsedRow[] = [];
    const lines = content.split(/\r?\n/);

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index]?.trim();
        if (!line || !line.startsWith("|")) continue;

        const cells = line
            .split("|")
            .slice(1, -1)
            .map((cell) => cell.trim());

        if (cells.length === 0) continue;

        const isDivider = cells.every((cell) => /^:?-+:?$/.test(cell));
        if (isDivider) continue;

        const firstCell = (cells[0] || "").toLowerCase();
        if (firstCell.includes("drill date")) continue;

        rows.push({
            cells,
            lineNumber: index + 1,
        });
    }

    return rows;
}

function daysBetweenUtc(from: Date, to: Date) {
    const fromDay = parseDateUtc(toDateOnlyUtc(from));
    const toDay = parseDateUtc(toDateOnlyUtc(to));
    if (!fromDay || !toDay) return null;
    return Math.floor((toDay.getTime() - fromDay.getTime()) / MS_PER_DAY);
}

function main() {
    const resolvedLogPath = path.resolve(process.cwd(), DEFAULT_LOG_PATH);
    if (!fs.existsSync(resolvedLogPath)) {
        throw new Error(`Missing DR drill log file: ${resolvedLogPath}`);
    }

    const content = fs.readFileSync(resolvedLogPath, "utf8");
    const rows = readTableRows(content);
    if (rows.length === 0) {
        throw new Error(`No drill entries found in ${DEFAULT_LOG_PATH}. Add a row with Next Drill Due (UTC).`);
    }

    const latest = rows[rows.length - 1]!;
    const dueDateRaw = (latest.cells[DUE_DATE_COLUMN_INDEX] || "").trim();
    if (!dueDateRaw) {
        throw new Error(
            `Missing Next Drill Due (UTC) on line ${latest.lineNumber} in ${DEFAULT_LOG_PATH}.`
        );
    }

    const dueDate = parseDateUtc(dueDateRaw);
    if (!dueDate) {
        throw new Error(
            `Invalid Next Drill Due (UTC) value "${dueDateRaw}" on line ${latest.lineNumber}. Expected YYYY-MM-DD.`
        );
    }

    const today = new Date();
    const daysUntilDue = daysBetweenUtc(today, dueDate);
    if (daysUntilDue === null) {
        throw new Error("Unable to compare drill due date.");
    }

    if (daysUntilDue < 0) {
        throw new Error(
            `DR drill cadence is overdue by ${Math.abs(daysUntilDue)} day(s). Run a restore drill and update ${DEFAULT_LOG_PATH}.`
        );
    }

    const latestDate = latest.cells[0] || "unknown";
    const latestResult = latest.cells[6] || "unknown";

    console.log("DR drill cadence check passed.");
    console.log(`Latest entry date: ${latestDate}`);
    console.log(`Latest entry result: ${latestResult}`);
    console.log(`Next drill due (UTC): ${dueDateRaw}`);
    console.log(`Days until due: ${daysUntilDue}`);
}

main();
