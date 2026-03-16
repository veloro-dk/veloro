"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/Button";
import { VeloroLogo } from "@/components/VeloroLogo";

type HealthCheck = {
    path: string;
    status: number | null;
    ok: boolean;
    durationMs: number | null;
};

type StorageHotspot = {
    table: string;
    bytes: number;
};

type StorageInfo = {
    usedBytes: number | null;
    limitBytes: number | null;
    freeBytes: number | null;
    usedPercent: number | null;
    limitSource: "configured" | "estimated-free-plan";
    hotspots: StorageHotspot[];
};

type HealthReport = {
    ok: boolean;
    dbOk: boolean;
    pagesOk: boolean;
    checkedAt: string;
    durationMs: number;
    checks: HealthCheck[];
    storage: StorageInfo;
    slo: {
        windowHours: number;
        errorRate: {
            currentCheckPercent: number | null;
            failedChecks: number;
            totalChecks: number;
            authFailurePercent24h: number | null;
            failedLoginAttempts24h: number | null;
            loginAttempts24h: number | null;
        };
        latency: {
            p50Ms: number | null;
            p95Ms: number | null;
            avgMs: number | null;
            maxMs: number | null;
        };
        dbGrowth: {
            estimatedBytes24h: number | null;
            estimatedPercentOfLimit24h: number | null;
            projectedDaysToLimit: number | null;
            drivers: Array<{
                table: string;
                bytes: number | null;
                totalRows: number | null;
                newRows24h: number | null;
                avgRowBytes: number | null;
                estimatedGrowthBytes24h: number | null;
            }>;
        };
        sessionChurn: {
            activeSessionsNow: number | null;
            sessionsCreated24h: number | null;
            sessionsExpiring24h: number | null;
            authLogins24h: number | null;
            authLogouts24h: number | null;
            netAuthLogins24h: number | null;
            churnPercent24h: number | null;
        };
    };
};

type Props = {
    labels: {
        systemsOperational: string;
        systemError: string;
        systemLoading: string;
    };
    canRunMaintenance: boolean;
};

type MaintenanceAction = "cleanup_recommended" | "cleanup_expired_sessions" | "cleanup_login_attempts" | "cleanup_audit_logs";

type MaintenanceResponse = {
    ok: boolean;
    deleted: {
        expiredSessions: number;
        loginAttempts: number;
        auditLogs: number;
    };
    report: HealthReport;
};

type StatusRow = {
    id: string;
    label: string;
    ok: boolean | null;
    passed: number;
    total: number;
    uptime: number | null;
    details: StatusDetail[];
};

type StatusDetail = {
    id: string;
    label: string;
    endpoint: string;
    ok: boolean | null;
    uptime: number | null;
    response: string;
    period: string;
    checkedDay: string;
};

type StatusGroupDefinition = {
    id: string;
    label: string;
    paths: readonly string[];
    includeDatabase?: boolean;
};

const PATH_LABELS: Record<string, string> = {
    "/portal/login": "Authentication",
    "/portal": "Portal home",
    "/portal/products": "Products",
    "/portal/products/categories": "Product categories",
    "/portal/products/inventory": "Inventory",
    "/portal/products/purchase-orders": "Purchase orders",
    "/portal/finance": "Finance",
    "/portal/settings": "Settings",
    "/portal/system-status": "System status page",
    "/portal/analytics": "Analytics overview",
    "/portal/analytics/reports": "Reports",
    "/portal/analytics/live-view": "Live view",
};

const STATUS_GROUPS: StatusGroupDefinition[] = [
    {
        id: "control-plane",
        label: "Control Plane",
        includeDatabase: true,
        paths: ["/portal/login", "/portal", "/portal/settings", "/portal/system-status"],
    },
    {
        id: "management",
        label: "Management",
        paths: ["/portal/products", "/portal/products/categories", "/portal/products/inventory", "/portal/products/purchase-orders", "/portal/finance"],
    },
    {
        id: "analytics",
        label: "Analytics",
        paths: ["/portal/analytics", "/portal/analytics/reports", "/portal/analytics/live-view"],
    },
];

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function formatCheckedDay(iso: string) {
    const checked = new Date(iso);
    const today = new Date();
    return checked.toDateString() === today.toDateString() ? "Today" : checked.toLocaleDateString();
}

function detailState(ok: boolean | null, loadingLabel: string) {
    if (ok === true) return "Operational";
    if (ok === false) return "Issue detected";
    return loadingLabel;
}

function createUptime(passed: number, total: number) {
    return total === 0 ? null : Math.round((passed / total) * 1000) / 10;
}

function formatBytes(bytes: number | null) {
    if (bytes === null || !Number.isFinite(bytes)) return "...";

    const units = ["B", "KB", "MB", "GB", "TB"];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }
    const formatted = value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1);
    return `${formatted} ${units[unitIndex]}`;
}

function formatCount(value: number | null) {
    if (value === null || !Number.isFinite(value)) return "...";
    return value.toLocaleString();
}

function formatPercent(value: number | null, suffix = "%") {
    if (value === null || !Number.isFinite(value)) return "...";
    return `${value.toFixed(1)}${suffix}`;
}

function formatDuration(value: number | null) {
    if (value === null || !Number.isFinite(value)) return "...";
    return `${value.toFixed(1)} ms`;
}

export function PortalSystemStatusView({ labels, canRunMaintenance }: Props) {
    const [report, setReport] = useState<HealthReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
    const [maintenanceLoading, setMaintenanceLoading] = useState<MaintenanceAction | null>(null);
    const [maintenanceMessage, setMaintenanceMessage] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setFetchError(false);

        try {
            const res = await fetch("/api/system/health", { method: "GET", cache: "no-store" });
            if (!res.ok) throw new Error("Health endpoint failed");

            const data = (await res.json().catch(() => null)) as HealthReport | null;
            if (!data) throw new Error("Invalid health response");
            setReport(data);
        } catch {
            setFetchError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    const runMaintenance = useCallback(async (action: MaintenanceAction) => {
        if (maintenanceLoading) return;

        setMaintenanceLoading(action);
        setMaintenanceMessage(null);

        try {
            const res = await fetch("/api/system/maintenance", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ action }),
            });

            if (!res.ok) {
                const body = (await res.json().catch(() => null)) as { message?: string } | null;
                throw new Error(body?.message || "Maintenance action failed");
            }

            const data = (await res.json().catch(() => null)) as MaintenanceResponse | null;
            if (!data?.report) throw new Error("Maintenance response invalid");

            setReport(data.report);
            const deleted = data.deleted;
            const totalDeleted = deleted.expiredSessions + deleted.loginAttempts + deleted.auditLogs;
            setMaintenanceMessage(
                totalDeleted > 0
                    ? `Cleanup completed. Removed ${totalDeleted} records (${deleted.expiredSessions} sessions, ${deleted.loginAttempts} login attempts, ${deleted.auditLogs} audit logs).`
                    : "Cleanup completed. Nothing needed to be removed."
            );
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Maintenance action failed";
            setMaintenanceMessage(message);
        } finally {
            setMaintenanceLoading(null);
        }
    }, [maintenanceLoading]);

    useEffect(() => {
        void refresh();

        const id = window.setInterval(() => {
            void refresh();
        }, 120000);

        return () => window.clearInterval(id);
    }, [refresh]);

    const failingChecks = useMemo(() => report?.checks.filter((check) => !check.ok) ?? [], [report]);
    const isInitialLoading = loading && !report && !fetchError;
    const hasError = fetchError || (!!report && !report.ok);
    const lastChecked = report ? new Date(report.checkedAt).toLocaleString() : labels.systemLoading;
    const storage = report?.storage ?? null;
    const slo = report?.slo ?? null;
    const growthDrivers = slo?.dbGrowth.drivers ?? [];
    const storageUsed = storage ? formatBytes(storage.usedBytes) : "...";
    const storageLimit = storage ? formatBytes(storage.limitBytes) : "...";
    const storageFree = storage ? formatBytes(storage.freeBytes) : "...";

    const rows = useMemo<StatusRow[]>(() => {
        if (!report) {
            return STATUS_GROUPS.map((group) => ({
                id: group.id,
                label: group.label,
                ok: null,
                passed: 0,
                total: 0,
                uptime: null,
                details: [],
            }));
        }

        const checksByPath = new Map(report.checks.map((check) => [check.path, check] as const));
        const checkedDay = formatCheckedDay(report.checkedAt);

        return STATUS_GROUPS.map((group) => {
            const details: StatusDetail[] = [];

            if (group.includeDatabase) {
                details.push({
                    id: "database",
                    label: "Primary database",
                    endpoint: "prisma:$queryRaw SELECT 1",
                    ok: report.dbOk,
                    uptime: report.dbOk ? 100 : 0,
                    response: report.dbOk ? "Query succeeded" : "Query failed",
                    period: "Current snapshot",
                    checkedDay,
                });
            }

            for (const path of group.paths) {
                const check = checksByPath.get(path);
                if (!check) continue;

                details.push({
                    id: path,
                    label: PATH_LABELS[path] ?? path,
                    endpoint: path,
                    ok: check.ok,
                    uptime: check.ok ? 100 : 0,
                    response: check.status === null ? "NO_RESPONSE" : `HTTP ${check.status}`,
                    period: "Current snapshot",
                    checkedDay,
                });
            }

            const total = details.length;
            const passed = details.filter((detail) => detail.ok).length;
            const uptime = createUptime(passed, total);

            return {
                id: group.id,
                label: group.label,
                ok: total > 0 && passed === total,
                passed,
                total,
                uptime,
                details,
            };
        });
    }, [report]);

    const summary = useMemo(() => {
        if (!report) {
            return {
                totalChecks: 0,
                passedChecks: 0,
                failedChecks: 0,
                uptime: null as number | null,
            };
        }

        const routeTotal = report.checks.length;
        const routePassed = report.checks.filter((check) => check.ok).length;
        const totalChecks = routeTotal + 1;
        const passedChecks = routePassed + (report.dbOk ? 1 : 0);
        const failedChecks = totalChecks - passedChecks;
        const uptime = totalChecks === 0 ? null : Math.round((passedChecks / totalChecks) * 100);

        return { totalChecks, passedChecks, failedChecks, uptime };
    }, [report]);

    return (
        <main className="portalStatusStandalone__P3k7M2">
            <div className="portalStatusTop__J9d1R5">
                <div className="portalStatusLogo__S4n8V6" aria-label="Veloro">
                    <VeloroLogo width={210} height={70} />
                </div>
            </div>

            <section
                className={cn(
                    "portalStatusHero__V5h2K8",
                    isInitialLoading
                        ? "portalStatusHeroLoading__U4k9M1"
                        : hasError
                          ? "portalStatusHeroError__C2m9Q4"
                          : "portalStatusHeroOk__A6p4D7"
                )}
            >
                <div className="portalStatusHeroMain__J1d7T6">
                    <h1 className="typography__heading4__Z7p4s0 portalStatusHeroTitle__P3q8R4">
                        {isInitialLoading ? labels.systemLoading : hasError ? labels.systemError : labels.systemsOperational}
                    </h1>

                    <p className="portalStatusHeroMeta__L4s9D2">
                        {report ? `Last checked ${lastChecked} · ${report.durationMs} ms` : "Checking system health..."}
                    </p>
                </div>

                <div className="portalStatusHeroActions__M6t9Q2">
                    <Button
                        type="button"
                        kind="secondary"
                        size="small"
                        className="portalStatusRefreshButton__W2f9K4"
                        onClick={() => void refresh()}
                        disabled={loading}
                    >
                        <span className="portalStatusRefreshContent__H7m1R2">
                            <RefreshCw
                                className={loading ? "portalStatusRefreshIconSpinning__W4m2Q8" : undefined}
                                aria-hidden="true"
                            />
                            <span>{loading ? "Checking" : "Check again"}</span>
                        </span>
                    </Button>
                </div>
            </section>

            <section className="portalStatusSummaryGrid__V1k3N8">
                <article className="portalStatusSummaryCard__A2r7D5 ui-surface-card">
                    <div className="portalStatusSummaryLabel__M4p8Q1">Total checks</div>
                    <div className="portalStatusSummaryValue__R6n2T3">{report ? summary.totalChecks : "..."}</div>
                </article>
                <article className="portalStatusSummaryCard__A2r7D5 ui-surface-card">
                    <div className="portalStatusSummaryLabel__M4p8Q1">Passed</div>
                    <div className="portalStatusSummaryValue__R6n2T3">{report ? summary.passedChecks : "..."}</div>
                </article>
                <article className="portalStatusSummaryCard__A2r7D5 ui-surface-card">
                    <div className="portalStatusSummaryLabel__M4p8Q1">Failed</div>
                    <div className="portalStatusSummaryValue__R6n2T3">{report ? summary.failedChecks : "..."}</div>
                </article>
                <article className="portalStatusSummaryCard__A2r7D5 ui-surface-card">
                    <div className="portalStatusSummaryLabel__M4p8Q1">Overall uptime</div>
                    <div className="portalStatusSummaryValue__R6n2T3">
                        {report ? `${summary.uptime ?? 0}%` : labels.systemLoading}
                    </div>
                </article>
            </section>

            <section className="portalStatusSloGrid__D8m2Q4">
                <article className="portalStatusInfoCard__Q7m3V9 ui-surface-card">
                    <h2 className="portalStatusInfoTitle__C1r4P6">Error rate (24h)</h2>
                    <ul className="portalStatusInfoList__A8t2K5">
                        <li>
                            <span>Current check error rate</span>
                            <strong>{slo ? formatPercent(slo.errorRate.currentCheckPercent) : "..."}</strong>
                        </li>
                        <li>
                            <span>Auth failure rate</span>
                            <strong>{slo ? formatPercent(slo.errorRate.authFailurePercent24h) : "..."}</strong>
                        </li>
                        <li>
                            <span>Failed checks</span>
                            <strong>{slo ? `${slo.errorRate.failedChecks}/${slo.errorRate.totalChecks}` : "..."}</strong>
                        </li>
                        <li>
                            <span>Failed logins</span>
                            <strong>
                                {slo
                                    ? `${formatCount(slo.errorRate.failedLoginAttempts24h)}/${formatCount(slo.errorRate.loginAttempts24h)}`
                                    : "..."}
                            </strong>
                        </li>
                    </ul>
                </article>

                <article className="portalStatusInfoCard__Q7m3V9 ui-surface-card">
                    <h2 className="portalStatusInfoTitle__C1r4P6">Latency (probe snapshot)</h2>
                    <ul className="portalStatusInfoList__A8t2K5">
                        <li>
                            <span>P50</span>
                            <strong>{slo ? formatDuration(slo.latency.p50Ms) : "..."}</strong>
                        </li>
                        <li>
                            <span>P95</span>
                            <strong>{slo ? formatDuration(slo.latency.p95Ms) : "..."}</strong>
                        </li>
                        <li>
                            <span>Average</span>
                            <strong>{slo ? formatDuration(slo.latency.avgMs) : "..."}</strong>
                        </li>
                        <li>
                            <span>Max</span>
                            <strong>{slo ? formatDuration(slo.latency.maxMs) : "..."}</strong>
                        </li>
                    </ul>
                </article>

                <article className="portalStatusInfoCard__Q7m3V9 ui-surface-card">
                    <h2 className="portalStatusInfoTitle__C1r4P6">DB size growth (24h estimate)</h2>
                    <ul className="portalStatusInfoList__A8t2K5">
                        <li>
                            <span>Estimated growth</span>
                            <strong>{slo ? formatBytes(slo.dbGrowth.estimatedBytes24h) : "..."}</strong>
                        </li>
                        <li>
                            <span>Percent of DB limit</span>
                            <strong>{slo ? formatPercent(slo.dbGrowth.estimatedPercentOfLimit24h) : "..."}</strong>
                        </li>
                        <li>
                            <span>Projected days to full</span>
                            <strong>{slo ? formatCount(slo.dbGrowth.projectedDaysToLimit) : "..."}</strong>
                        </li>
                    </ul>
                    {growthDrivers.length > 0 ? (
                        <ul className="portalStatusSloDrivers__S5m2Q9">
                            {growthDrivers.map((driver) => (
                                <li key={driver.table}>
                                    <span>{driver.table}</span>
                                    <strong>{formatBytes(driver.estimatedGrowthBytes24h)}</strong>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </article>

                <article className="portalStatusInfoCard__Q7m3V9 ui-surface-card">
                    <h2 className="portalStatusInfoTitle__C1r4P6">Session churn ({slo?.windowHours ?? 24}h)</h2>
                    <ul className="portalStatusInfoList__A8t2K5">
                        <li>
                            <span>Active sessions now</span>
                            <strong>{slo ? formatCount(slo.sessionChurn.activeSessionsNow) : "..."}</strong>
                        </li>
                        <li>
                            <span>Sessions created</span>
                            <strong>{slo ? formatCount(slo.sessionChurn.sessionsCreated24h) : "..."}</strong>
                        </li>
                        <li>
                            <span>Sessions expiring</span>
                            <strong>{slo ? formatCount(slo.sessionChurn.sessionsExpiring24h) : "..."}</strong>
                        </li>
                        <li>
                            <span>Net auth logins</span>
                            <strong>{slo ? formatCount(slo.sessionChurn.netAuthLogins24h) : "..."}</strong>
                        </li>
                        <li>
                            <span>Churn rate</span>
                            <strong>{slo ? formatPercent(slo.sessionChurn.churnPercent24h) : "..."}</strong>
                        </li>
                    </ul>
                </article>
            </section>

            <section className="portalStatusInfoGrid__L5d8N2">
                <article className="portalStatusInfoCard__Q7m3V9 ui-surface-card">
                    <h2 className="portalStatusInfoTitle__C1r4P6">Monitoring coverage</h2>
                    <ul className="portalStatusInfoList__A8t2K5">
                        {rows.map((row) => (
                            <li key={`${row.id}-coverage`}>
                                <span>{row.label}</span>
                                <strong>{row.total === 0 ? labels.systemLoading : `${row.total} checks`}</strong>
                            </li>
                        ))}
                    </ul>
                </article>

                <article className="portalStatusInfoCard__Q7m3V9 ui-surface-card">
                    <h2 className="portalStatusInfoTitle__C1r4P6">Current cycle</h2>
                    <ul className="portalStatusInfoList__A8t2K5">
                        <li>
                            <span>Last run</span>
                            <strong>{report ? new Date(report.checkedAt).toLocaleTimeString() : labels.systemLoading}</strong>
                        </li>
                        <li>
                            <span>Duration</span>
                            <strong>{report ? `${report.durationMs} ms` : labels.systemLoading}</strong>
                        </li>
                        <li>
                            <span>Failed checks</span>
                            <strong>{report ? summary.failedChecks : "..."}</strong>
                        </li>
                        <li>
                            <span>Refresh interval</span>
                            <strong>2 min</strong>
                        </li>
                    </ul>
                </article>
            </section>

            <section className="portalStatusBars__Q6t1S5">
                {rows.map((row) => (
                    <details
                        key={row.id}
                        className="portalStatusGroup__P2t6M1"
                        open={openGroups[row.id] ?? (row.ok === false)}
                        onToggle={(event) => {
                            const details = event.currentTarget;
                            setOpenGroups((prev) => ({ ...prev, [row.id]: details.open }));
                        }}
                    >
                        <summary
                            className={cn(
                                "portalStatusBar__H3p9V2",
                                "portalStatusBarSummary__D4m8Q2",
                                row.ok === true
                                    ? "portalStatusBarOk__D5n7K4"
                                    : row.ok === false
                                      ? "portalStatusBarError__R8m2T1"
                                      : "portalStatusBarLoading__U9n1K3"
                            )}
                        >
                            <span
                                className={cn(
                                    "portalSystemStatusDot__N7r1M5",
                                    row.ok === true
                                        ? "portalSystemStatusDotOperational__B3d9L2"
                                        : row.ok === false
                                          ? "portalSystemStatusDotError__C8f2T7"
                                          : "portalSystemStatusDotLoading__S4r8N2"
                                )}
                                aria-hidden="true"
                            />
                            <div className="portalStatusBarLabelBlock__S9v3N2">
                                <div className="portalStatusBarLabel__A2k6D9">{row.label}</div>
                                <div className="portalStatusBarState__L1f7R5">{detailState(row.ok, labels.systemLoading)}</div>
                            </div>
                            <div className="portalStatusBarStats__B7v3P6">
                                <strong>{row.uptime === null ? labels.systemLoading : `${row.uptime.toFixed(1)}%`}</strong>
                                <span>{row.total === 0 ? labels.systemLoading : `${row.passed}/${row.total} checks`}</span>
                            </div>
                            <span className="portalStatusBarChevron__Q9n1L4" aria-hidden="true">
                                <ChevronRight />
                            </span>
                        </summary>

                        <div className="portalStatusDetails__F5m2K8">
                            {row.details.length === 0 ? (
                                <div className="portalStatusDetailEmpty__B2t6P1">{labels.systemLoading}</div>
                            ) : (
                                row.details.map((detail) => (
                                    <article
                                        key={detail.id}
                                        className={cn(
                                            "portalStatusDetailBar__T3k7V1",
                                            detail.ok === true
                                                ? "portalStatusDetailBarOk__A8n5R2"
                                                : detail.ok === false
                                                  ? "portalStatusDetailBarError__Q3v7M6"
                                                  : "portalStatusDetailBarLoading__R9p1C4"
                                        )}
                                    >
                                        <div className="portalStatusDetailTop__Y5m1Q4">
                                            <div className="portalStatusDetailTitle__X2p8C6">
                                                <span
                                                    className={cn(
                                                        "portalSystemStatusDot__N7r1M5",
                                                        detail.ok === true
                                                            ? "portalSystemStatusDotOperational__B3d9L2"
                                                            : detail.ok === false
                                                              ? "portalSystemStatusDotError__C8f2T7"
                                                              : "portalSystemStatusDotLoading__S4r8N2"
                                                    )}
                                                    aria-hidden="true"
                                                />
                                                <span className="portalStatusDetailLabel__N6f2D8">{detail.label}</span>
                                            </div>
                                            <span
                                                className={cn(
                                                    "portalStatusDetailState__K4t8P7",
                                                    detail.ok === true
                                                        ? "portalStatusDetailStateOk__D1m5R3"
                                                        : detail.ok === false
                                                          ? "portalStatusDetailStateError__H9q2V6"
                                                          : "portalStatusDetailStateLoading__W3k7L1"
                                                )}
                                            >
                                                {detailState(detail.ok, labels.systemLoading)}
                                            </span>
                                        </div>

                                        <div className="portalStatusDetailMeta__H8v3L6">
                                            <span>{detail.period}</span>
                                            <strong>{detail.uptime === null ? labels.systemLoading : `${detail.uptime.toFixed(1)}% uptime`}</strong>
                                            <span>{detail.checkedDay}</span>
                                        </div>

                                        <div className="portalStatusDetailFoot__E6q1K9">
                                            <code>{detail.endpoint}</code>
                                            <span>{detail.response}</span>
                                        </div>
                                    </article>
                                ))
                            )}
                        </div>
                    </details>
                ))}
            </section>

            {canRunMaintenance ? (
                <section className="portalStatusAdminGrid__N8q2V4">
                    <article className="portalStatusInfoCard__Q7m3V9 ui-surface-card">
                        <h2 className="portalStatusInfoTitle__C1r4P6">Database storage</h2>
                        <ul className="portalStatusInfoList__A8t2K5">
                            <li>
                                <span>Used</span>
                                <strong>{storageUsed}</strong>
                            </li>
                            <li>
                                <span>Free</span>
                                <strong>{storageFree}</strong>
                            </li>
                            <li>
                                <span>Limit</span>
                                <strong>{storageLimit}</strong>
                            </li>
                            <li>
                                <span>Usage</span>
                                <strong>{storage?.usedPercent === null || storage?.usedPercent === undefined ? "..." : `${storage.usedPercent}%`}</strong>
                            </li>
                        </ul>
                        {storage?.hotspots?.length ? (
                            <ul className="portalStatusStorageHotspots__R7f3Q2">
                                {storage.hotspots.map((spot) => (
                                    <li key={spot.table}>
                                        <span>{spot.table}</span>
                                        <strong>{formatBytes(spot.bytes)}</strong>
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </article>

                    <article className="portalStatusInfoCard__Q7m3V9 ui-surface-card">
                        <h2 className="portalStatusInfoTitle__C1r4P6">Free up space</h2>
                        <p className="portalStatusMaintenanceText__M5p2T8">
                            Remove expired sessions and old logs. Recommended cleanup keeps recent security/activity history.
                        </p>
                        <div className="portalStatusMaintenanceActions__N4k8V1">
                            <Button
                                type="button"
                                kind="secondary"
                                size="small"
                                onClick={() => void runMaintenance("cleanup_recommended")}
                                disabled={maintenanceLoading !== null}
                            >
                                {maintenanceLoading === "cleanup_recommended" ? "Running..." : "Run recommended cleanup"}
                            </Button>
                            <Button
                                type="button"
                                kind="ghost"
                                size="small"
                                onClick={() => void runMaintenance("cleanup_expired_sessions")}
                                disabled={maintenanceLoading !== null}
                            >
                                {maintenanceLoading === "cleanup_expired_sessions" ? "Running..." : "Clear expired sessions"}
                            </Button>
                            <Button
                                type="button"
                                kind="ghost"
                                size="small"
                                onClick={() => void runMaintenance("cleanup_login_attempts")}
                                disabled={maintenanceLoading !== null}
                            >
                                {maintenanceLoading === "cleanup_login_attempts" ? "Running..." : "Clear old login attempts"}
                            </Button>
                            <Button
                                type="button"
                                kind="ghost"
                                size="small"
                                onClick={() => void runMaintenance("cleanup_audit_logs")}
                                disabled={maintenanceLoading !== null}
                            >
                                {maintenanceLoading === "cleanup_audit_logs" ? "Running..." : "Clear old audit logs"}
                            </Button>
                        </div>
                        {maintenanceMessage ? <div className="portalStatusMaintenanceNote__C8q4L1">{maintenanceMessage}</div> : null}
                    </article>
                </section>
            ) : null}

            {failingChecks.length > 0 ? (
                <section className="portalStatusFailures__E4r8M3 ui-surface-card">
                    <h2 className="portalStatusFailuresTitle__K7n1Q5">Failing checks</h2>
                    <ul className="portalStatusFailuresList__V2p9T8">
                        {failingChecks.map((check) => (
                            <li key={check.path}>
                                <span>{check.path}</span>
                                <code>{check.status ?? "NO_RESPONSE"}</code>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}

            <footer className="portalStatusFooter__L3d8Q6">
                <div className="portalStatusFooterHelp__K8m2P4">
                    <a
                        className="typography__link__B7s3m0"
                        href="/api/system/health"
                        target="_blank"
                        rel="noreferrer noopener"
                    >
                        View raw health report
                    </a>
                </div>
                <div className="portalStatusFooterMeta__V6t1R3">
                    Checks run every 2 minutes. Last synced: {lastChecked}
                </div>
            </footer>
        </main>
    );
}
