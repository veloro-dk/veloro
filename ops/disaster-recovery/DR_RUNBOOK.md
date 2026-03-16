# Disaster Recovery Runbook

This runbook defines how Veloro performs and verifies PostgreSQL disaster recovery.

## Objective

- Restore service safely after a database incident.
- Validate restore readiness on a fixed cadence.
- Record evidence for each drill.

## Targets

- RTO target: 60 minutes (restore + app validation)
- RPO target: 15 minutes (maximum tolerated data loss)

## Cadence

- Perform one restore drill every 30 days.
- Record each drill in `ops/disaster-recovery/drill-log.md`.
- Keep `Next Drill Due (UTC)` updated after every drill.

## Drill Scope

Every drill must verify:

1. backup artifact exists (`.dump` + `.dump.json`)
2. checksum metadata is present and matches expected artifact
3. restore succeeds into an isolated target database
4. synthetic checks pass (`npm run uptime:check`)
5. recovery timing is measured and logged

## Preconditions

- PostgreSQL client tools installed (`pg_dump`, `pg_restore`)
- working backup source artifact
- isolated restore target database (never run drills directly on production)
- environment variables configured for target restore database

## Procedure

### 1. Select backup artifact

Pick the latest known-good backup pair:

- `backups/<file>.dump`
- `backups/<file>.dump.json`

### 2. Verify metadata

Confirm metadata contains:

- `createdAt`
- `sizeBytes`
- `sha256`
- `database`

### 3. Provision isolated restore target

Create a temporary database/server dedicated to the drill.

### 4. Restore backup into isolated target

Run restore against the isolated target only:

```bash
DB_RESTORE_CONFIRM=YES DATABASE_URL="<restore-target-url>" npm run db:restore -- backups/<file>.dump
```

If running in production mode by mistake, restore requires the extra safety flag:

```bash
DB_RESTORE_CONFIRM=YES ALLOW_PRODUCTION_DB_RESTORE=YES DATABASE_URL="<restore-target-url>" npm run db:restore -- backups/<file>.dump
```

### 5. Validate recovered app behavior

Run synthetic checks against the restored deployment/environment:

```bash
SYNTHETIC_BASE_URL="<restored-app-url>" npm run uptime:check
```

Required endpoints:

- `/portal/login`
- `/portal`
- `/portal/products`
- `/portal/settings`
- `/api/system/ping`

### 6. Record drill evidence

Capture:

- backup file used
- restore target
- measured RTO (minutes)
- measured RPO (minutes)
- PASS/FAIL result
- owner and notes
- next due date

Append the result to `ops/disaster-recovery/drill-log.md`.

### 7. Cleanup

- deprovision temporary restore resources
- archive command logs and synthetic check output

## Failure Handling

If drill fails:

1. classify failure reason (backup, restore, app startup, auth/data integrity, synthetic checks)
2. open a remediation task immediately
3. run a re-test within 7 days
4. do not defer next due date until a passing drill is recorded
