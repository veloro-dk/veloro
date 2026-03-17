# Veloro Platform

Production-ready setup and deployment guide for the Veloro portal.

## Stack

- Next.js 16 (App Router)
- React 19
- Prisma 7 + PostgreSQL adapter
- TypeScript + ESLint

## Requirements

- Node.js 20+
- npm 10+
- PostgreSQL database

## Environment Variables

Create `.env.local` (or environment secrets in deployment) with:

| Variable | Required | Used For |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Runtime DB access (`src/server/db.ts`) |
| `APP_URL` | Yes (recommended) | Same-origin security checks |
| `DIRECT_URL` | Optional | Prisma admin scripts (`seed`, reset scripts) |
| `ADMIN_EMPLOYEE_ID` | Required for `npm run seed` / reset scripts | Admin bootstrap account |
| `ADMIN_PASSWORD` | Required for `npm run seed` / reset scripts | Admin bootstrap password |
| `SUPABASE_DB_LIMIT_MB` | Optional | System health DB capacity reporting |
| `AUDIT_LOG_RETENTION_DAYS` | Optional | Retention period for automated audit log cleanup (default: `90`) |
| `ALERT_WEBHOOK_URL` | Optional | Webhook target for anomaly alerts (auth failures, admin actions, maintenance ops) |
| `DB_BACKUP_DIR` | Optional | Backup output directory for `npm run db:backup` (default: `backups`) |
| `DB_RESTORE_CONFIRM` | Required when restoring | Must be `YES` to allow `npm run db:restore` |
| `ALLOW_PRODUCTION_DB_RESTORE` | Optional safety override | Must be `YES` with `NODE_ENV=production` to allow restore |
| `MIGRATION_GUARD_ALLOW_PENDING` | Optional | Allow local migrations to be pending vs target DB (default: `false`) |
| `MIGRATION_GUARD_OUTPUT_FILE` | Optional | Write migration guardrail JSON report to file path |
| `FF_PORTAL_FINANCE_ENABLED` | Optional | Toggle `/finance` visibility (default: `true`) |
| `FF_PORTAL_ANALYTICS_ENABLED` | Optional | Toggle `/analytics` visibility (default: `true`) |
| `FF_PORTAL_ANALYTICS_REPORTS_ENABLED` | Optional | Toggle `/analytics/reports` visibility (default: `true`) |
| `FF_PORTAL_ANALYTICS_LIVE_VIEW_ENABLED` | Optional | Toggle `/analytics/live-view` visibility (default: `true`) |
| `FF_PORTAL_ASSISTANT_ENABLED` | Optional | Toggle AI assistant UI visibility in portal shell (default: `true`) |
| `FF_PORTAL_NOTIFICATIONS_ENABLED` | Optional | Toggle notifications UI visibility in portal shell (default: `true`) |
| `SMOKE_BASE_URL` | Optional (CI smoke checks) | Base URL for release smoke e2e checks |
| `SMOKE_EMPLOYEE_ID` | Optional (CI smoke checks) | Employee ID used by smoke e2e login |
| `SMOKE_PASSWORD` | Optional (CI smoke checks) | Password used by smoke e2e login |
| `SMOKE_TIMEOUT_MS` | Optional (CI smoke checks) | Request timeout for smoke e2e checks (default: `20000`) |
| `SMOKE_OUTPUT_FILE` | Optional (CI smoke checks) | Write smoke e2e JSON report to file path |
| `PRIVACY_LOGIN_ATTEMPT_RETENTION_DAYS` | Optional | Retention for `LoginAttempt` cleanup job (default: `90`) |
| `PRIVACY_FEEDBACK_RETENTION_DAYS` | Optional | Retention for `FeedbackMessage` cleanup job (default: `365`) |
| `PRIVACY_RETENTION_DRY_RUN` | Optional | Dry-run mode for privacy retention script (`true`/`false`) |
| `PRIVACY_USER_ID` | Optional (DSAR scripts) | User id for export/anonymization scripts |
| `PRIVACY_EMPLOYEE_ID` | Optional (DSAR scripts) | Employee id for export/anonymization scripts |
| `PRIVACY_EXPORT_OUTPUT_FILE` | Optional (DSAR export) | Override output file path for privacy export script |
| `PRIVACY_DELETE_CONFIRM` | Required for anonymization unless `--confirm` | Must be `YES` to allow anonymization |
| `ALLOW_PRODUCTION_PRIVACY_DELETE` | Required in production for anonymization | Must be `YES` with `NODE_ENV=production` |
| `PRIVACY_ALLOW_ADMIN_DELETE` | Optional safety override | Allow anonymization of ADMIN users (`true`/`false`) |

Beginner-friendly helpers:

- `.env.production.example`
- `ops/LAUNCH_CHECKLIST.md`
- `npm run launch:check`

## Local Setup

```bash
npm ci
npm run prisma:generate
```

Run development server:

```bash
npm run dev
```

## Anomaly Webhook Alerts

When `ALERT_WEBHOOK_URL` is configured, Veloro sends JSON alerts for:

1. repeated or rate-limited login failures
2. admin write actions
3. system maintenance operations

Payload includes:

- `text` / `content` (human-readable summary)
- `category`, `severity`, `routeId`, `timestamp`
- `environment`, `appOrigin`, optional `actorId`
- `details` (event-specific metadata)

## Feature Flags

Use portal feature flags to decouple deployment from release for unfinished sections.

Example (hide unfinished sections in production):

```bash
FF_PORTAL_FINANCE_ENABLED=false
FF_PORTAL_ANALYTICS_ENABLED=false
FF_PORTAL_ANALYTICS_REPORTS_ENABLED=false
FF_PORTAL_ANALYTICS_LIVE_VIEW_ENABLED=false
FF_PORTAL_ASSISTANT_ENABLED=false
FF_PORTAL_NOTIFICATIONS_ENABLED=false
```

## Quality Gates

Run before every merge/deploy:

```bash
npm run lint
npm test
npm run build
npm run perf:budgets
```

## Database Migrations

Apply migrations in target environment:

```bash
npx prisma migrate deploy
```

Check migration status:

```bash
npx prisma migrate status
```

Run migration guardrails against target environment:

```bash
npm run db:migration:guard
```

This check fails when:

1. `_prisma_migrations` contains failed/incomplete rows
2. database has applied migrations that are missing from repository
3. repository has pending migrations not applied to the target database (unless `MIGRATION_GUARD_ALLOW_PENDING=true`)

## Backup and Restore (Release Gate)

Take a database backup before every production deploy:

```bash
npm run db:backup
```

This creates:

1. A Postgres custom-format backup file (`.dump`) under `backups/` (or `DB_BACKUP_DIR`).
2. A sidecar metadata file (`.dump.json`) with timestamp, size, and SHA-256 checksum.

Restore from a backup:

```bash
DB_RESTORE_CONFIRM=YES npm run db:restore -- backups/<backup-file>.dump
```

For production restores, both confirmations are required:

```bash
DB_RESTORE_CONFIRM=YES ALLOW_PRODUCTION_DB_RESTORE=YES npm run db:restore -- backups/<backup-file>.dump
```

Disaster recovery runbook and drill log:

- `ops/disaster-recovery/DR_RUNBOOK.md`
- `ops/disaster-recovery/drill-log.md`
- `ops/disaster-recovery/MIGRATION_ROLLBACK_PLAYBOOK.md`

## Seed and Maintenance Scripts

Seed initial store/admin user:

```bash
npm run seed
```

Reset admin password/status:

```bash
npx tsx prisma/reset-admin.ts
```

Reset catalog/inventory data:

```bash
npx tsx prisma/reset-catalog-data.ts
```

Run audit-log retention worker manually:

```bash
npm run job:audit-log-retention
```

Dry-run (report candidate rows without deleting):

```bash
npm run job:audit-log-retention -- --dry-run
```

Run privacy retention cleanup (expired sessions, stale login attempts, stale feedback):

```bash
npm run job:privacy-retention
```

Dry-run privacy retention:

```bash
npm run job:privacy-retention -- --dry-run
```

## Audit Log Retention Automation

Automated cleanup is configured with:

- `AUDIT_LOG_RETENTION_DAYS` (default `90`, allowed range `7..3650`)
- Worker command: `npm run job:audit-log-retention`

Recommended schedule: run daily from cron or scheduler.

Example crontab entry:

```bash
17 2 * * * cd /path/to/veloro && npm run job:audit-log-retention >> /var/log/veloro-audit-retention.log 2>&1
```

Optional GitHub scheduled workflow is included at:

- `.github/workflows/audit-log-retention.yml`

## Privacy Compliance (DSAR + Retention)

Compliance documents:

- `ops/compliance/DATA_PRIVACY_REVIEW.md`
- `ops/compliance/DSAR_RUNBOOK.md`

Export user-related data:

```bash
npm run privacy:user:export -- --employee-id <EMPLOYEE_ID>
```

Anonymize user profile data and disable account:

```bash
npm run privacy:user:anonymize -- --employee-id <EMPLOYEE_ID> --confirm
```

In production, add:

```bash
PRIVACY_DELETE_CONFIRM=YES ALLOW_PRODUCTION_PRIVACY_DELETE=YES npm run privacy:user:anonymize -- --employee-id <EMPLOYEE_ID>
```

Scheduled privacy retention workflow:

- `.github/workflows/privacy-retention.yml`

## Synthetic Uptime Checks

Built-in synthetic checks validate:

1. `/login`
2. `/`
3. `/products`
4. `/settings`
5. `/api/system/ping`

Run manually:

```bash
SYNTHETIC_BASE_URL=https://portal.veloro.dk npm run uptime:check
```

Optional environment variables:

- `SYNTHETIC_TIMEOUT_MS` (default `15000`)
- `SYNTHETIC_OUTPUT_FILE` (write JSON report to file path)

Scheduled workflow:

- `.github/workflows/synthetic-uptime.yml`
- Set GitHub secret `SYNTHETIC_BASE_URL` to enable scheduled checks.

## Staging Parity Checks

Run parity checks before production deploy:

```bash
STAGING_BASE_URL=https://staging.portal.veloro.dk PRODUCTION_BASE_URL=https://portal.veloro.dk npm run staging:parity
```

The check compares staging vs production for:

1. `/login`
2. `/`
3. `/products`
4. `/settings`
5. `/api/system/ping`

It validates:

- response status parity
- API ping JSON health payload parity
- security header parity on login page (optional strict baseline enforcement)

Optional environment variables:

- `PARITY_TIMEOUT_MS` (default `20000`)
- `PARITY_OUTPUT_FILE` (write JSON report to file path)
- `PARITY_REQUIRE_SECURITY_BASELINE` (`true` to enforce exact security baseline in addition to parity)

Scheduled/triggerable workflow:

- `.github/workflows/staging-parity.yml`
- Requires GitHub secrets:
  - `STAGING_BASE_URL`
  - `PRODUCTION_BASE_URL`

## Release Smoke E2E

Run production-like smoke checks against a deployed environment:

```bash
SMOKE_BASE_URL=https://portal.veloro.dk SMOKE_EMPLOYEE_ID=<id> SMOKE_PASSWORD=<password> npm run smoke:e2e
```

Checks include:

1. public login page and API ping
2. login flow + session cookie issuance
3. authenticated portal pages (`/`, `/products`, `/settings`)
4. authenticated APIs (`/api/catalog/state`, `/api/search/index`, `/api/system/health`)
5. logout flow + post-logout access guard

Release-triggered workflow:

- `.github/workflows/smoke-e2e.yml`
- Triggered on GitHub `release.published` and manual dispatch
- Requires GitHub secrets:
  - `SMOKE_BASE_URL`
  - `SMOKE_EMPLOYEE_ID`
  - `SMOKE_PASSWORD`

## Disaster-Recovery Drill Cadence

Cadence enforcement command:

```bash
npm run dr:cadence:check
```

The command validates `Next Drill Due (UTC)` in:

- `ops/disaster-recovery/drill-log.md`

Scheduled cadence workflow:

- `.github/workflows/dr-cadence.yml` (weekly check)

## Deployment Procedure

1. Pull latest code on deployment target.
2. Install dependencies with `npm ci`.
3. Run `npm run db:backup` and store the created `.dump` + `.dump.json` files in secure backup storage.
4. Run `npx prisma migrate deploy`.
5. Run `npm run db:migration:guard`.
6. Run quality gates:
   `npm run lint && npm test && npm run build && npm run perf:budgets`
7. Start app with `npm start` (or platform equivalent).
8. For first-time environment bootstrap, run `npm run seed` once.
9. Ensure a daily schedule is configured for `npm run job:audit-log-retention`.

## Rollback Procedure

Use the dedicated migration rollback playbook:

- `ops/disaster-recovery/MIGRATION_ROLLBACK_PLAYBOOK.md`

Quick actions:

1. App-only rollback: redeploy previous known-good commit/artifact.
2. DB rollback (when required):  
   `DB_RESTORE_CONFIRM=YES ALLOW_PRODUCTION_DB_RESTORE=YES npm run db:restore -- backups/<backup-file>.dump`
3. Validate with `npm run db:migration:guard` and smoke checks before resuming writes.

### Emergency admin access

If admin access is locked:

1. Set `ADMIN_EMPLOYEE_ID` and `ADMIN_PASSWORD`.
2. Run `npx tsx prisma/reset-admin.ts`.

## CI

PR checks are defined in:

- `.github/workflows/ci.yml`
- `.github/workflows/audit-log-retention.yml` (scheduled maintenance job)
- `.github/workflows/synthetic-uptime.yml` (scheduled uptime monitoring)
- `.github/workflows/staging-parity.yml` (scheduled + manual staging/production parity checks)
- `.github/workflows/dr-cadence.yml` (scheduled DR drill cadence check)
- `.github/workflows/migration-guardrails.yml` (scheduled + manual migration-state guardrails)
- `.github/workflows/smoke-e2e.yml` (release-triggered smoke checks on production-like deployment)
- `.github/workflows/privacy-retention.yml` (scheduled privacy retention cleanup)

They run:

1. `npm ci`
2. `npm run lint`
3. `npm test`
4. `npm run build`
5. `npm run perf:budgets`
