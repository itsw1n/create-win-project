# Security Baseline

Security, validation, accessibility, and secret handling never weaken in Small projects. Stack and capability playbooks decide how these invariants are implemented.

## Trust Boundaries

- Treat browser, device, network, URL, header, cookie, webhook, file, environment, and database input as untrusted where it enters a trusted component.
- Validate shape and business constraints at the trusted boundary. Client validation improves usability; it is not authorization.
- Authenticate identity and separately authorize the requested action and resource beside protected data or side effects.
- Default to denial. Make public entry points explicit and return only fields the caller needs.

## Secrets and Data

- Public client configuration is never secret. Keep credentials and privileged keys out of source, logs, generated examples, and client bundles.
- Use environment or platform secret storage, fail startup when required server configuration is missing, and rotate exposed credentials.
- Minimize personal data. Structured logs use event names, stable codes, request IDs, and non-sensitive identifiers; redact credentials, tokens, cookies, reset links, and PII.
- File uploads require size limits, verified content type, generated storage names, isolated storage, and malware/content processing appropriate to risk.

## Authentication and Authorization

Use a maintained framework or identity provider; do not invent password hashing, sessions, JWT issuance, token rotation, or cryptographic protocols. The selected stack/capability playbook owns session storage, refresh, CSRF/CORS, callback allowlists, expiry, logout, and revocation behavior.

For every protected operation, test anonymous access, authenticated-but-unauthorized access, allowed access, another user’s resource, invalid input, and expired/revoked identity where applicable.

## Failure Safety

- User-facing errors are stable, safe, and actionable. Never return stack traces, SQL details, credentials, or internal exception messages.
- Apply least privilege to databases, cloud identities, CI tokens, and system operations.
- Rate-limit abuse-sensitive operations and make retries idempotent where duplicate execution can cause harm.
- Review dependency and secret scanning results; automated updates are proposals until the generated compatibility matrix passes.
