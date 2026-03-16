# Veloro Security Overview

This document describes the authentication and security mechanisms implemented in the Veloro portal.

The portal is built with Next.js, Prisma, and Supabase, and deployed on Vercel.

---

# Authentication Security

## Password Hashing

User passwords are hashed using **Argon2id** before storage.

Properties:

* Resistant to GPU attacks
* Memory-hard hashing algorithm
* Recommended by OWASP

Passwords are **never stored in plaintext**.

---

# Session Security

Authentication uses **secure session tokens stored in HTTP cookies**.

Properties of the session cookie:

* HttpOnly
* SameSite=Lax
* Secure (in production)
* Domain restricted to the portal subdomain
* 7-day absolute expiration

Session tokens stored in the database are **hashed using SHA-256** so they cannot be reused if the database leaks.

---

# Session Rotation

Session tokens automatically rotate every **6 hours**.

This reduces the risk of stolen cookies being used long-term.

---

# Idle Timeout

Sessions automatically expire if the user is inactive for **6 hours**.

---

# Session Cleanup

Expired sessions are automatically removed from the database:

* During login
* During session validation

This keeps the session table small and prevents accumulation of unused sessions.

---

# Brute Force Protection

Login attempts are rate limited server-side.

Limits:

* Maximum **10 failed login attempts per IP** within 10 minutes
* Maximum **10 failed login attempts per employee ID** within 10 minutes

Login attempts are recorded in the `LoginAttempt` database table.

This prevents brute force password attacks.

Login verification also uses a **dummy Argon2 check** when the employee ID is not found,
which reduces timing differences that can help account enumeration.

---

# Request Origin Protection

Authentication endpoints (`/api/auth/login` and `/api/auth/logout`) require same-origin
requests by validating `Origin`/`Referer` against the request URL origin.

This helps prevent cross-site request forgery and drive-by logout/login submissions.

---

# Auth Response Caching

Authentication API responses are sent with `Cache-Control: no-store`.

This reduces the risk of sensitive auth responses being cached by browsers or intermediaries.

---

# Audit Logging

Authentication actions are recorded in the `AuditLog` table.

Events logged:

* Successful login
* Logout

Each record contains:

* actorId
* action
* entity
* timestamp
* metadata

This provides traceability for security and administrative actions.

---

# Disabled Accounts

Users with `status = DISABLED` cannot log in.

If a user is disabled while logged in, their session becomes invalid and access is revoked.

---

# Security Headers

The application enforces browser security headers:

* X-Frame-Options: DENY
* X-Content-Type-Options: nosniff
* Referrer-Policy: no-referrer
* Content-Security-Policy

These headers protect against:

* clickjacking
* MIME sniffing
* several XSS vectors

---

# Infrastructure Security

Deployment stack:

* **Vercel** for hosting
* **Supabase Postgres** for database
* **Prisma ORM**

Security characteristics:

* Serverless execution
* TLS encryption in transit
* Environment variables stored in Vercel secrets
* Database credentials never stored in the repository

---

# Future Security Enhancements (Planned)

Possible future upgrades:

* Two-factor authentication (TOTP)
* IP-based anomaly detection
* Admin forced session revocation
* Security event alerting

---

# Last Updated

Authentication system hardened on:

March 2026
