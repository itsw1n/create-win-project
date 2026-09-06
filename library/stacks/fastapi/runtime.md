# FastAPI Runtime

## Configuration and Lifecycle

Configuration comes from validated Pydantic Settings and environment-specific deployment
values. The application exposes public `GET /health` and dependency-aware `GET /ready`
readiness separately. Readiness verifies dependencies required to serve traffic.

Manage dependencies with uv and a frozen lockfile (`uv sync --frozen`). Run with
Uvicorn. Keep schema changes owned by Alembic migrations invoked explicitly via
`alembic upgrade head`; application startup must not automatically migrate production
databases.

## Errors and Observability

Services raise typed application exceptions with stable error codes and no HTTP types.
Exception handlers map them to RFC 9457 problem details. Include a safe code and
trace ID; never expose stack traces, SQL, internal hosts, credentials, or sensitive fields.

Use structured PII-safe events. Do not log whole requests, passwords, tokens, cookies, or
email addresses by default.

Configure exact-origin CORS from `CORS_ALLOWED_ORIGINS`. Store uploads outside the
application tree under generated object keys; validate size and content and route
untrusted files through the product's scanning/quarantine process.
