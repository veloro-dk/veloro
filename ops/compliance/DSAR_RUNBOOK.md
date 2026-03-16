# DSAR Runbook (Export / Erasure)

This runbook defines operator steps for data subject access requests (DSAR).

## Preconditions

1. confirm requester identity and authorization out-of-band
2. identify user via `employeeId` or internal `userId`
3. ensure database backup exists before destructive actions

## Data Export Procedure

Generate full user-related export JSON:

```bash
npm run privacy:user:export -- --employee-id <EMPLOYEE_ID>
```

Alternative:

```bash
npm run privacy:user:export -- --user-id <USER_ID>
```

Optional custom output path:

```bash
npm run privacy:user:export -- --employee-id <EMPLOYEE_ID> --output exports/privacy/<file>.json
```

## Anonymization (Erasure) Procedure

Anonymization disables account access and removes direct profile identifiers:

```bash
npm run privacy:user:anonymize -- --employee-id <EMPLOYEE_ID> --confirm
```

For production, explicit safety flags are required:

```bash
PRIVACY_DELETE_CONFIRM=YES ALLOW_PRODUCTION_PRIVACY_DELETE=YES npm run privacy:user:anonymize -- --employee-id <EMPLOYEE_ID>
```

Admin users are blocked by default. Override only with explicit approval:

```bash
npm run privacy:user:anonymize -- --employee-id <EMPLOYEE_ID> --confirm --allow-admin
```

## Post-Action Verification

1. user login should fail (account disabled)
2. user profile fields (`name`, `email`, `phone`) should be anonymized/null
3. active sessions for user should be removed
4. login attempts for previous employee id should be redacted (`employeeId = null`)

## Records and Evidence

For each DSAR:

1. request ticket id
2. operator + approver
3. command run + timestamp (UTC)
4. export file path (if applicable)
5. anonymization result JSON (if applicable)
6. verification notes
