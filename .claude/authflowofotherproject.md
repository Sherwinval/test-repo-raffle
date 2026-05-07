# Authentication Flow — SE Raffle Project

A token-based, OTP-gated auth system with role separation (`ADMIN` / `OPERATOR`), Gmail-only emails, and short-lived purpose-scoped JWTs for multi-step ceremonies.

## 🛠 Stack
* **Server:** Express, Prisma + PostgreSQL, `jsonwebtoken`, `bcryptjs` (cost 12), SHA-256-hashed OTPs
* **Client:** React + Vite, Zustand (persist) auth store, Axios, `react-hook-form` + Zod
* **Mail:** `mail.service.js` (`sendOtp`, `sendSecurityAlert`)

---

## 🔑 Token Types
*(All signed with `JWT_SECRET`)*

| Token | Purpose Claim | Lifetime | Issued After | Allowed Routes |
| :--- | :--- | :--- | :--- | :--- |
| **pendingToken** | `OTP_PENDING` | 10 min | Successful password (non-first-login) | `/verify-otp`, `/resend-otp` |
| **tempToken** | `FIRST_LOGIN` | 10 min | Successful password (first-login) | `/change-password` |
| **resetToken** | `PASSWORD_RESET` | 10 min | Forgot-password OTP verified | `/forgot-password/reset` |
| **Session token**| *(none — has role)* | `JWT_EXPIRES_IN` or `1d` | Login OTP verified | All `requireToken()` routes |

> **Note:** `requireToken(purpose?)` (`auth.middleware.js:8`) verifies the Bearer token and, if a purpose is given, requires an exact match. `requireRole('ADMIN'|'OPERATOR')` runs after.

---

## 🔄 Authentication Flows

### Flow 1 — Standard Login (Returning User)
1. **Client `LoginPage` (`LoginPage.jsx`)**: Zod validates identifier (Gmail regex or `EMP-\d+`) and password against `PASSWORD_REGEX` before calling `POST /api/auth/login` with `{ identifier, password }`.
2. **Server `login()` (`auth.service.js:23`)**:
   * Normalize, classify as email vs. employeeId, re-validate format → `400 INVALID_IDENTIFIER_FORMAT` / `INVALID_PASSWORD_FORMAT`.
   * Look up user by email or employeeId (case-insensitive).
   * **Status checks** (each writes to `LoginLog`):
     * `status = LOCKED` → `403 ACCOUNT_LOCKED`
     * `lockedUntil > now` → `429 TEMP_LOCKED:<seconds>`
     * `status = DEACTIVATED` → `403 ACCOUNT_DEACTIVATED`
   * **Password Check (`bcrypt.compare`)**:
     * *Fail:* Increment `failedLoginCount`; at count ≥ 8 set `lockedUntil = now + 15 min` (`auth.service.js:14`); at counts 6–7 fire `sendSecurityAlert` (fire-and-forget). Return `401 { failedCount }`.
     * *Success:* Reset counters/lock fields, log success.
   * **Branch on `isFirstLogin`**:
     * `true` → Issue `tempToken` (`FIRST_LOGIN`, 10 min) and respond `{ firstLogin: true, tempToken }` → *Proceed to Flow 2*.
     * `false` → `createOtp(LOGIN)` + `sendOtp(email)`; on mailer throw return `500 OTP_SEND_FAILED`; otherwise issue `pendingToken` (`OTP_PENDING`, 10 min) and respond `{ otpPending: true, pendingToken }`.
3. **Client Cooldown UX**: On `401`, persists a per-attempt cooldown to `localStorage[login_cooldown_until]` — counts 4–5 → 15 s, 6–7 → 30 s; on `429` the server's `lockedSeconds` drives the timer (`LoginPage.jsx:106-114`).
4. **Client `VerifyOtpPage` (`VerifyOtpPage.jsx`)**: 90 s countdown; submits `POST /api/auth/verify-otp` with `Authorization: Bearer <pendingToken>`.
5. **Server `verifyLoginOtp()` (`auth.service.js:112`)**: Calls `verifyOtp(userId, 'LOGIN', otp)` (`otp.service.js:61`), then signs the session token with `{ userId, role }` and returns `{ token, role }`. Client stores both, clears `pendingToken`, navigates to `/dashboard`.
6. **Resend**: `POST /api/auth/resend-otp` (`requireToken('OTP_PENDING')`) calls `createOtp` again; subject to cooldown / daily limit.

### Flow 2 — First-Login Password Change
1. After Step 2 in standard login, client routes to `/change-password` with `tempToken` in the Zustand store.
2. **`ChangePasswordPage` (`ChangePasswordPage.jsx`)** validates against `PASSWORD_REGEX` + confirm-match, then `POST /api/auth/change-password` with `Authorization: Bearer <tempToken>`.
3. **Server `changeFirstLoginPassword()` (`auth.service.js:135`)**: Re-validates, `bcrypt.hash(_, 12)`, sets `passwordHash`, `isFirstLogin: false`, `status: 'ACTIVE'`.
4. Client clears `tempToken`, redirects to `/login`. *No session is granted — user must log in fresh (which then triggers Flow 1's OTP).*

### Flow 3 — Forgot Password
1. **`ForgotPasswordPage`** → `POST /api/auth/forgot-password/request` with `{ email }`. Server always returns `200` "If this email exists…" (silent on unknown email — see `auth.service.js:144-154`) to prevent enumeration. If the email exists, `createOtp(FORGOT_PASSWORD)` + send.
2. **`ForgotPasswordVerifyPage`** → `POST /api/auth/forgot-password/verify-otp` with `{ email, otp }` (no token needed; the email itself is the lookup key). On success server returns `{ resetToken }` (`PASSWORD_RESET`, 10 min).
3. **`ForgotPasswordResetPage`** → `POST /api/auth/forgot-password/reset` (`requireToken('PASSWORD_RESET')`) with `{ newPassword }`. `resetPassword()` (`auth.service.js:169`) hashes, sets `status: ACTIVE`, clears `failedLoginCount`/`lockedUntil`, then redirects to `/login`.

### Flow 4 — Authenticated Profile Fetch
* **Profile Request**: `GET /api/auth/me` (`requireToken()`, no purpose) → `getCurrentUserProfile(req.user.userId)` returns `{ id, email, role, firstName, lastName }`. Used by client to hydrate user details post-login.

---

## 🔐 OTP Service (`otp.service.js`)
* **Format**: 6-char hex uppercase, generated from `crypto.randomBytes(4)`.
* **Storage**: SHA-256 hash only (`tokenHash`); compared with `crypto.timingSafeEqual`.
* **Lifetime**: 90 s (`OTP_EXPIRY_SECONDS`).
* **Resend Cooldown**: 30 s — enforced by checking for an existing OTP whose remaining life > 60 s → `429 OTP_RESEND_TOO_SOON`.
* **Daily Limit**: `OTP_MAX_DAILY` (default 5) per user → `429 OTP_DAILY_LIMIT_REACHED` (message: "The person in charge has been notified…").
* **Per-OTP Attempts**: 3 max → `OTP_MAX_ATTEMPTS`; after 3 wrong tries the token is invalidated.
* **Issuance Side-effect**: Any prior un-invalidated OTP for the same `(userId, purpose)` is invalidated before insert — only the latest is valid.

---

## 🚫 Account Lockout
* **Tracking**: Tracked on `users` table via `failedLoginCount`, `lastFailedAt`, `lockedUntil`, `status`.
* **Server-Side**: At 8 consecutive failures → 15-min `lockedUntil`; admin-applied `LOCKED` / `DEACTIVATED` are permanent until reset. Successful login or password reset clears the counters.
* **Client-Side Cooldowns**: (15 s / 30 s) at counts 4–5 / 6–7 are UX nudges only — they don't replace the server lock.
* **Email Alert**: At 6–7 failures, `sendSecurityAlert(user.email)` fires (best-effort).

---

## ✅ Validation Rules
*(The same regexes are mirrored client-side under `client/src/utils/validators.js`)*
* **Email** (`validators.js:2`): `^[a-zA-Z0-9_.]{3,30}@gmail\.com$` — Gmail-only.
* **Password** (`validators.js:6`): 8–64 chars, must contain uppercase, lowercase, digit, and one of `! @ ? _ -`; no other characters allowed.
* **Employee ID**: `^EMP-\d+$` (case-insensitive).

---

## 💻 Client State (`authStore.js`)
* **Zustand Persist**: Uses key `raffle-auth`.
* **Partialize**: Only persists `token`, `role`, `email`, `firstName`, `lastName`. 
* **Memory Only**: The three short-lived ceremony tokens (`tempToken`, `pendingToken`, `resetToken`) live in memory only and are lost on refresh, which by design forces the user back to `/login` mid-ceremony.

---

## 📜 Audit Trail
* **LoginLog**: Every login attempt (success/failure, with reason and IP) is recorded.
* **AuditLog**: Exists in the schema for admin actions but isn't written by the auth service itself.

---

## 🗺 Route Map

```http
POST /api/auth/login                       (public)
POST /api/auth/verify-otp                  Bearer pendingToken (OTP_PENDING)
POST /api/auth/resend-otp                  Bearer pendingToken (OTP_PENDING)
POST /api/auth/change-password             Bearer tempToken    (FIRST_LOGIN)
GET  /api/auth/me                          Bearer session token (any purpose-less)
POST /api/auth/forgot-password/request     (public)
POST /api/auth/forgot-password/verify-otp  (public, email+otp)
POST /api/auth/forgot-password/reset       Bearer resetToken   (PASSWORD_RESET)