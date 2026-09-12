# Forgot password

The public POST /api/auth/forgot-password route normalizes and validates email and limits requests to five per hour per IP and normalized email. Both recovery flows share passwordResetService, PasswordResetToken, the Nodemailer transporter, and /reset-password.

Responses are sent before lookup and SMTP to prevent account disclosure through status, content or delivery latency. SMTP failures are logged with a static diagnostic and remain generic publicly. Delivery runs in the existing long-running Express process; process termination can interrupt delivery. Multi-instance hosting requires a shared rate-limit store and durable delivery queue.

The UI provides inline email validation, a 60-second resend cooldown, light/dark mode, and links back to login. Expired/invalid reset links lead to /forgot-password.

Validation: npm test in backend; npm run build and npm run test:password-ui in frontend. Backend tests use disposable MongoDB and intercepted SMTP; they cover reset/login, session revocation, expiry, token replacement/reuse, enumeration resistance and throttling.

A prepared live check is node scripts/testPasswordChange.js --forgot. It sends one email to EMAIL_USER using a temporary account in disposable MongoDB, consumes the token, and tests login without changing existing accounts. It requires a frontend running at CLIENT_URL. SMTP acceptance is not proof of Gmail inbox receipt. This live check has not been run: automatic approval review blocked the email send pending recipient authorization.
