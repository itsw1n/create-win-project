# Security Baseline

> Required minimum for generated projects. Architecture-specific playbooks may add controls, but must not weaken these defaults without a documented decision.

## Trust Boundaries

- Treat browser, mobile, URL, cookie, header, webhook, file, environment, and database values as untrusted at the boundary where they enter the system.
- Validate shape and business constraints on the server. Client validation exists for usability, not authorization.
- Authenticate who is calling, then separately authorize the requested operation and resource.
- Enforce authorization close to the protected data or side effect. Hidden UI and route redirects are not security boundaries.
- Return only the fields the caller needs. Never serialize credentials, password hashes, session tokens, or internal exception details.

## Browser Sessions and Cookies

- Prefer a maintained authentication library or provider over custom cryptography or token protocols.
- Prefer same-origin, server-managed sessions for browser applications when the architecture allows it.
- Session and refresh cookies must be server-set, `HttpOnly`, `Secure` in HTTPS environments, `SameSite=Lax` or stricter by default, and narrowly scoped.
- Use a `__Host-` cookie name in production when the cookie does not need to cross subdomains; it requires `Secure`, `Path=/`, and no `Domain` attribute.
- Rotate the session identifier after login, privilege changes, and other reauthentication events.
- Enforce idle and absolute expiry. Logout and password/security changes revoke server-side session state where the provider supports it.
- `SameSite` is defense in depth, not a universal replacement for CSRF protection.
- Do not store session IDs, access tokens, or refresh tokens in browser `localStorage` or `sessionStorage`.

## Access and Refresh Tokens

Use this only when the selected architecture genuinely needs bearer tokens.

- Keep access tokens short-lived and in memory where possible.
- Store browser refresh credentials in a secure `HttpOnly` cookie, not JavaScript-readable storage.
- Store only a hash of an opaque refresh token in the database.
- Rotate refresh tokens atomically. Mark the old token used before issuing its replacement.
- Track token families; reuse of a rotated token revokes the family and requires sign-in again.
- A client may retry an authenticated request once after refresh. It must exclude the refresh endpoint and use one shared in-flight refresh operation for concurrent failures.
- `401` means authentication is missing/invalid; `403` means an authenticated principal lacks permission. Do not refresh on ordinary `403` responses.

## CSRF, CORS, and Request Integrity

- Cookie-authenticated state-changing requests need CSRF protection appropriate to the framework and deployment.
- Do not disable CSRF merely because server-side sessions are described as stateless.
- CORS is an allowlist, not authentication. List exact trusted origins; do not combine wildcard origins with credentials.
- Validate `Content-Type`, body size, upload type, and redirect destinations.
- Rate-limit login, registration, recovery, verification, and other abuse-sensitive endpoints.

## Web Security Headers

- Start with `Content-Security-Policy`, preferably using nonces/hashes rather than broad `unsafe-inline` allowances.
- Send `X-Content-Type-Options: nosniff`, a restrictive `Referrer-Policy`, and an explicit `Permissions-Policy`.
- Prevent unwanted framing with CSP `frame-ancestors`; `X-Frame-Options` is a compatibility fallback.
- Enable HSTS only at an HTTPS boundary that is ready to commit the hostname to HTTPS.
- Keep development header policy separate where hot reload requires relaxed script behavior.

## Secrets, Logging, and Errors

- Public framework prefixes (`NEXT_PUBLIC_`, `VITE_`, `EXPO_PUBLIC_`) mean values are bundled into client code. They are never secrets.
- Fail startup when required server configuration is missing. Do not silently use a production credential fallback.
- Log event names, stable error codes, request IDs, and non-sensitive identifiers. Redact credentials, cookies, authorization headers, reset links, and personal data.
- User-facing errors are safe and actionable; server logs retain diagnostic context without leaking it to the response.
- Dependency and secret scanning belong in CI. Review updates; never apply breaking security upgrades blindly.

## Security Verification

For each protected operation, test:

1. unauthenticated request;
2. authenticated but unauthorized request;
3. authorized request;
4. access to another user's resource;
5. invalid and oversized input;
6. expired/revoked session where sessions apply.

Use OWASP ASVS as the verification catalog, not as a claim of compliance.

## Primary References

- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- OWASP Session Management: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- OWASP CSRF Prevention: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- Next.js Authentication: https://nextjs.org/docs/app/guides/authentication
- Spring Security CSRF: https://docs.spring.io/spring-security/reference/features/exploits/csrf.html

