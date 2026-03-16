# Data Privacy Review (P2.10)

Date: 2026-03-17 (UTC)  
Scope: Veloro application data privacy baseline for production operations.

## Objectives

1. define PII handling boundaries
2. define retention policy by data type
3. define repeatable export/delete process for user-related data

## Personal Data Inventory

Primary PII in schema:

1. `User`: `employeeId`, `name`, `firstName`, `lastName`, `email`, `phone`
2. `LoginAttempt`: `employeeId` (optional), `ipHash` (pseudonymous)
3. `FeedbackMessage`: free-text message that may include personal details
4. `Store` business profile fields: legal names, business email/phone, address
5. `AuditLog.meta`: may contain user/action metadata, including employee identifiers depending on event

Supporting identity/session data:

1. `Session`: token hash + session timestamps (no raw token storage)
2. `UserSettings`: locale/time/currency preferences and active store
3. `UserStoreAccess`: user-to-store authorization links

## Retention Baseline

1. `Session`: remove expired sessions continuously (`expiresAt` cleanup during auth and privacy retention job)
2. `AuditLog`: retained by `AUDIT_LOG_RETENTION_DAYS` (default `90`) via `job:audit-log-retention`
3. `LoginAttempt`: retained by `PRIVACY_LOGIN_ATTEMPT_RETENTION_DAYS` (default `90`) via `job:privacy-retention`
4. `FeedbackMessage`: retained by `PRIVACY_FEEDBACK_RETENTION_DAYS` (default `365`) via `job:privacy-retention`
5. business/transaction records (`Purchase`, `Sale`, inventory history): retained unless explicit legal/business policy says otherwise

## Export and Deletion Process

Use operational DSAR scripts:

1. export user-related data snapshot: `npm run privacy:user:export -- --employee-id <EMPLOYEE_ID>`
2. anonymize user profile and revoke access: `npm run privacy:user:anonymize -- --employee-id <EMPLOYEE_ID> --confirm`

Notes:

1. anonymization removes direct profile identifiers and disables the account
2. historical audit/security rows are retained for operational and security records
3. destructive anonymization in production requires explicit confirmation flags

## PII Handling Controls

1. password material is stored as Argon2 hashes (`passwordHash`), never plaintext
2. session cookie is `HttpOnly` and `SameSite=Lax`; raw token is not stored in DB
3. login attempt source is stored as hashed IP (`ipHash`) rather than raw address
4. same-origin and JSON request validation is enforced on sensitive write endpoints
5. periodic retention jobs reduce stale operational/security PII footprint

## Operational Checklist

1. schedule `job:audit-log-retention` (already included)
2. schedule `job:privacy-retention` (added in `.github/workflows/privacy-retention.yml`)
3. document DSAR request handling with exported artifact storage controls
4. ensure exported privacy files are stored in encrypted, access-controlled storage
