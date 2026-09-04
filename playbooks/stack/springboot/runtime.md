# Spring Boot Runtime

## Transactions

Application services own transactions spanning multiple writes or read-modify-write
behavior. Use read-only transactions for coherent multi-query reads when beneficial.
Database unique/check/foreign-key constraints are the final concurrency boundary; map
expected constraint conflicts to stable application errors.

Publish noncritical work after commit. Use an outbox or durable queue when delivery must
survive process failure. Plain `@Async` is not a reliability guarantee.

## Errors and Observability

Services throw custom application exceptions with stable error codes and no HTTP types.
`@RestControllerAdvice` maps them to RFC 9457 `ProblemDetail`. Include a safe code and
trace ID; never expose stack traces, SQL, internal hosts, credentials, or sensitive fields.

Use structured PII-safe events. Do not log whole requests, passwords, tokens, cookies, or
email addresses by default. Health and readiness are different: readiness verifies
dependencies required to serve traffic.

Configuration comes from validated properties and environment-specific deployment values.
Keep Open Session in View disabled and schema changes owned by Flyway migrations.

Allowlist client-selected sort fields. Store uploads outside the application tree under
generated object keys; validate size and content and route untrusted files through the
product's scanning/quarantine process.
