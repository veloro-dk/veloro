# Migration Rollback Playbook

This playbook defines how to recover safely when a deployment with database migrations fails.

## Scope

Use this only for production incidents where migration-related behavior causes data or availability risk.

## Inputs Required

Before starting, identify:

1. target rollback application revision (last known-good commit/tag)
2. pre-deploy backup artifact pair (`.dump` + `.dump.json`)
3. incident owner and approver

## Decision Flow

### Path A: Application rollback only

Use when:

- migration was not applied to production, or
- migration was applied but is fully backward-compatible and app-only rollback restores service

Actions:

1. Redeploy last known-good application revision.
2. Run smoke checks:
   - `/portal/login`
   - `/portal`
   - `/portal/products`
   - `/portal/settings`
   - `/api/system/ping`
3. If checks pass, keep migration as-is and open follow-up task for forward-fix.

### Path B: Database restore rollback

Use when:

- migration changed schema/data incompatibly, and
- app rollback alone does not restore service, or data integrity is at risk

Actions:

1. Stop write traffic (maintenance mode or equivalent).
2. Confirm correct backup artifact from immediately before failed deploy.
3. Verify backup metadata (`sha256`, `sizeBytes`, `createdAt`) from `.dump.json`.
4. Restore database from backup:

```bash
DB_RESTORE_CONFIRM=YES ALLOW_PRODUCTION_DB_RESTORE=YES npm run db:restore -- backups/<backup-file>.dump
```

5. Redeploy the matching application revision for that backup window.
6. Run smoke checks and business-critical flows.
7. Resume write traffic only after validation passes.

## Validation Checklist (Required)

After Path A or Path B, confirm:

1. `npm run db:migration:guard` passes against production database.
2. `/api/system/ping` returns healthy response.
3. authentication works for admin and standard user.
4. products, categories, inventory, and settings pages show expected data.
5. no new critical errors in server logs for 15 minutes.

## Incident Record

Capture in incident notes:

- chosen path (A or B) and reason
- backup file restored (if Path B)
- start/end UTC timestamps
- approver and operator
- customer impact window
- follow-up actions and owner
