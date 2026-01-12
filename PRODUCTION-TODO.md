# Production Backend Plan

This plan consolidates the "Production" intent comments across the codebase into a phased backend roadmap. Phases are ordered to reduce risk and unlock core auth flow first, then driver verification, then observability and hardening.

## Phase 1 - Auth and Core Accounts
- Replace in-memory user/session storage with database-backed models and queries; add indexes on email, userId, sessionToken. (lib/mockUsers.ts)
- Switch password hashing to bcrypt (hash + compare). (lib/mockUsers.ts, types/user.ts)
- Enforce campus domain validation against a pre-configured campuses table (no auto-create); add admin flow later if needed. (lib/mockUsers.ts, types/user.ts)
- Email verification:
  - Send verification email via provider (SendGrid/Resend/SES); never return token in API response.
  - Add token expiration (24-48h) and rate-limit verification attempts. (lib/mockUsers.ts, app/api/auth/register/route.ts, app/api/auth/verify-email/route.ts)
- Session strategy:
  - Use httpOnly, secure cookies; remove localStorage usage for session tokens.
  - Store sessions in Redis or database with TTL; consider JWT + refresh tokens if desired. (app/api/auth/signin/route.ts, app/api/auth/session/route.ts, lib/mockUsers.ts)
- Protect authenticated routes using Next.js middleware and server-side checks (replace client-only checks). (app/dashboard/page.tsx)
- Add auth security controls: rate limiting, account lockout after failed attempts, optional 2FA. (app/api/auth/signin/route.ts, lib/mockUsers.ts)

## Phase 2 - Driver Verification and License Management
- Collect manual license details; add optional document upload storage later if needed. (app/register/page.tsx, app/api/auth/register/route.ts, types/user.ts)
- Implement OCR extraction for:
  - Legal name verification (fuzzy match).
  - License number and expiration date. (lib/mockUsers.ts, lib/licenseExpiration.ts, types/user.ts)
- Enforce expiration behavior:
  - Disable driver availability on expiration day.
  - Allow license detail re-entry at any time; send reminders within 7 days of expiry.
  - Track alerts (1 week, 3 days, 1 day). (lib/licenseExpiration.ts, lib/mockUsers.ts)
- Add periodic review flow for first-time driver enable (re-entry remains always available). (app/api/auth/driver/enable/route.ts, app/api/auth/driver/toggle/route.ts)
- Add abuse controls: rate limiting on enable/toggle endpoints; audit logs for driver capability changes. (app/api/auth/driver/enable/route.ts, app/api/auth/driver/toggle/route.ts)

## Phase 3 - Observability, Abuse Prevention, and UX Hardening
- Add structured logging (Pino/Winston) and error monitoring (Sentry/Datadog) for all auth/driver routes. (app/api/auth/*)
- Add CAPTCHA and IP-based rate limiting for registration. (app/api/auth/register/route.ts)
- Add client UX improvements:
  - Password strength meter and stronger validation.
  - "Remember me" and "Forgot password" flows.
  - Accessibility improvements in auth forms. (app/register/page.tsx, app/signin/page.tsx)
- Add session caching for frequent checks and improved auth middleware performance. (app/api/auth/session/route.ts)


### Current state (MVP)
Registration and sign‑in use in‑memory storage in mockUsers.ts.

Sign‑in stores a sessionToken in localStorage and also sets a cookie in route.ts.

Dashboard access is guarded client‑side by checking localStorage and calling route.ts in page.tsx.

Session lookup in route.ts is in‑memory and accepts either cookie or Authorization header.

## Target flow with your requirements
**Register**
route.ts writes the user to the database (new User model). Ensure that driver details per user is set up

You still return a verification token in dev; in prod you email it.

app/verify-email hits route.ts, which flips emailVerified in the DB.

**Sign in**
route.ts authenticates against the DB (password hash).

On success, create a server‑side session record (new Session model).

Set an httpOnly, secure, sameSite cookie with the session token/id.

No response body token, no localStorage.

**Carpool requests**
Information for carpoolfeed should be stored in the DB and persist across sessions

Update carpoolchat logic to allow for real chats to be sent and received and to persist across sessions

**Authenticated requests**
All protected routes read session from cookies server‑side.

route.ts looks up the session in the DB; returns user info if valid.

**Route protection**
Add Next.js middleware to require a valid session cookie before allowing /dashboard, /request/*, /carpool/*, etc.

Move sensitive auth gating to server components or API routes (not client‑only checks).

page.tsx should become a server component (or at least fetch session server‑side).

**Notes**
With DB sessions + cookies, each browser/device has its own session record.
Multiple users can be logged in concurrently (different cookies, different sessions).

