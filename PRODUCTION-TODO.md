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
- Store license uploads in cloud storage (S3/Cloudinary); persist URL only, no base64. (app/register/page.tsx, app/api/auth/register/route.ts, types/user.ts)
- Implement OCR extraction for:
  - Legal name verification (fuzzy match).
  - License number and expiration date. (lib/mockUsers.ts, lib/licenseExpiration.ts, types/user.ts)
- Enforce expiration behavior:
  - Disable driver availability on expiration day.
  - Allow re-upload within 7 days of expiry.
  - Track alerts (1 week, 3 days, 1 day). (lib/licenseExpiration.ts, lib/mockUsers.ts)
- Add periodic re-verification or manual review flow for first-time driver enable. (app/api/auth/driver/enable/route.ts, app/api/auth/driver/toggle/route.ts)
- Add abuse controls: rate limiting on enable/toggle endpoints; audit logs for driver capability changes. (app/api/auth/driver/enable/route.ts, app/api/auth/driver/toggle/route.ts)

## Phase 3 - Observability, Abuse Prevention, and UX Hardening
- Add structured logging (Pino/Winston) and error monitoring (Sentry/Datadog) for all auth/driver routes. (app/api/auth/*)
- Add CAPTCHA and IP-based rate limiting for registration. (app/api/auth/register/route.ts)
- Add client UX improvements:
  - Password strength meter and stronger validation.
  - "Remember me" and "Forgot password" flows.
  - Accessibility improvements in auth forms. (app/register/page.tsx, app/signin/page.tsx)
- Add session caching for frequent checks and improved auth middleware performance. (app/api/auth/session/route.ts)
