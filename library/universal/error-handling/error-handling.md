# Error Handling

## Error Contract

Failures crossing a process boundary use the protocol’s standard error mechanism plus a stable application code. HTTP APIs should use RFC 9457 `ProblemDetail` unless a selected external service defines its own contract. Successful responses are ordinary DTOs; do not wrap every success in a universal envelope.

Keep status mapping in the transport/web layer. Application services raise application errors without importing HTTP concepts. Record public error codes in `docs/api/errors.md` with meaning, status, retry behavior, and safe client handling.

## Boundary Handling

- Validate requests before side effects and report field errors without echoing secrets.
- Convert expected domain/application failures once at the outer boundary.
- Let cancellation remain cancellation; do not display it as a user-visible failure.
- Retry only transient, idempotent operations with a bound and jitter. Authentication refresh follows its selected auth adapter, not a generic error interceptor.
- Preserve the original cause in internal diagnostics while returning a safe public detail and correlation identifier.

## Security Rules for Errors

Never expose stack traces, SQL, filesystem paths, internal hostnames, credentials, tokens, session data, or raw third-party responses. Log PII-safe structured context, and do not route client behavior by mutable human-readable messages.

Test stable codes/statuses, validation failures, not-found and conflict races, authorization denial, dependency timeouts, and unexpected-error redaction at the boundary that emits the response.
