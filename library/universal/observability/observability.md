# Observability Baseline

## Structured Events

- Emit structured logs in deployed environments; use stable event names and fields.
- Attach a request/correlation ID at the entry point and propagate it through downstream calls.
- Record outcome, duration, route/operation, and safe identifiers. Never log secrets, tokens, cookies, passwords, or full sensitive request bodies.
- Log exceptions once at the boundary that owns the failure; avoid duplicate logs at every layer.

## Health and Readiness

- Liveness answers whether the process should be restarted.
- Readiness answers whether the instance can serve traffic and may include critical dependency checks.
- Keep health responses free of credentials, internal topology, and verbose exception details.
- A Docker healthcheck and deployment probe should call the application's real health endpoint.

## Errors and Traces

- Return a stable application error code and request ID to clients.
- Capture uncaught server and client errors in the selected monitoring service.
- Add distributed tracing when requests cross service boundaries; do not introduce it for a single-process starter without a concrete need.
- Define alerts from user impact and service objectives, not raw log volume.

## Verification

- Test the health endpoint and error response shape.
- Verify redaction with representative authentication and validation failures.
- Confirm graceful shutdown stops new work and lets in-flight requests complete within the deployment deadline.

