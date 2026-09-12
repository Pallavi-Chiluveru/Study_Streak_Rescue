# Password change via registered email

## Configure and run

Install backend dependencies with `npm ci`. Set backend environment values from `.env.example`: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`, `CLIENT_URL`, and a strong random `JWT_SECRET`. Existing configured JWT secrets continue to work; there is no hardcoded signing fallback. Never prefix SMTP secrets with `VITE_`.

Use port 587 with `EMAIL_SECURE=false` for STARTTLS, or port 465 with `EMAIL_SECURE=true` for implicit TLS. A single reusable transporter is initialized at startup; development startup verifies SMTP and logs only readiness. Missing settings or temporary SMTP outages do not stop the app. Production `CLIENT_URL` must use HTTPS. Configure the sender with your SMTP provider. A success response means SMTP accepted the message, not a guarantee of inbox placement. Configure your frontend host to serve the SPA for `/reset-password` and redact query strings from access logs for that route. The page removes the token from its current history entry and uses a no-referrer policy. Reloading that page requires reopening the email link.

Mongoose creates the unique user/token indexes and TTL index for `PasswordResetToken`. Deployments that disable automatic indexes must provision them before enabling this feature. TTL cleanup does not replace explicit expiry checks.

The request endpoint applies separate limits of five requests per hour per IP and per authenticated account. Reset attempts are limited to 20 per 15 minutes per IP. Express-rate-limit currently uses its in-process store: use a shared store for multiple API instances or persistent limits across restarts. Configure Express trust proxy only to match your trusted deployment proxy; never trust arbitrary forwarded IP headers.

## Behavior and security

Settings / Security sends to the authenticated account's database email; body-supplied identities are ignored. New requests atomically replace the account's previous token. Only SHA-256 hashes of random 32-byte tokens are persisted, for 15 minutes. Failed SMTP sends delete only their own token.

Passwords require eight characters, matching confirmation, and at most 72 UTF-8 bytes to avoid bcrypt truncation. Uppercase, lowercase, and numbers are suggestions. Hashing uses the same bcryptjs cost (10) as registration.

Reset claims are atomic. A conditional user update prevents stale links from changing a newer password, without requiring MongoDB replica-set transactions. A database failure after claiming consumes the link; request another link. Cleanup failure after password update does not falsely report failure: the timestamp already invalidates other links and TTL eventually removes them.

JWTs contain the exact password-change timestamp as well as iat. Auth middleware checks it on every protected request, including same-second logins; legacy JWTs are accepted only before the recorded change. Successful reset clears browser authentication and returns to login. There is no refresh-token infrastructure to revoke.

## Verification

Run `npm test` in backend. Tests use an isolated MongoDB process and capture Nodemailer's outgoing messages in memory, without contacting real inboxes or modifying application data. They cover registration/login, registered-email targeting, hashing and expiry, password validation, malformed/reused/expired links, resend invalidation, concurrent submissions, safe email failures, rate limiting, and JWT invalidation including same-second issuance.

Run `npm run build` and `npm run lint` in frontend. For live acceptance testing, sign in, request a link in Settings, open the delivered email, submit matching passwords, verify redirect to login, and verify the old password fails and new password succeeds. Repeat with another signed-in browser to verify its next protected API request gets 401.

Real SMTP delivery requires deployment credentials; automated integration tests substitute only the SMTP transport.

Run `npm run test:email` in backend for a development-only SMTP verification and one safe delivery test to the configured sender account. It never prints addresses, credentials, message IDs, or tokens. SMTP acceptance must be followed by checking the recipient inbox/spam folder to confirm arrival.

`npm run test:password-change` verifies the configured SMTP transport, serves the configured reset route, and uses the real auth routes with a disposable MongoDB database. It sends one actual password-change email to the configured sender account, consumes the link, checks password/session invalidation and new login, and removes the temporary database. It never modifies the application database or prints tokens/passwords. The emailed test link is already used when the script completes. Inbox arrival still requires recipient confirmation.

## Latest verification

- Live Gmail SMTP authentication and test-message acceptance passed.
- Live password-change email acceptance, reset-route HTTP response, hashed token persistence, password update, token reuse rejection, old JWT/password rejection, and new login passed using a disposable database.
- All 18 backend regression tests passed.
- `npm run test:password-ui` in frontend passed render checks for both themes, the invalid-link state, password visibility controls, and the Settings action. These are server render checks, not browser interaction tests.
- Frontend production build and focused component lint passed.
- Real backend/frontend environment files remain ignored by Git. Source logging audit found no raw environment/error-object logging patterns.
- Inbox placement awaits recipient confirmation. Browser automation could not connect, so actual clicks, the timed resend countdown, and post-submit browser navigation are not yet browser-verified.
