# Laravel Runtime

## Request Lifecycle

Validate untrusted input with Form Requests, authorize the resource and operation, invoke
application behavior, then return an intentional Resource, DTO, redirect, or view. Never
serialize a complete Eloquent model accidentally.

## Transactions and Side Effects

The application operation coordinating related writes owns the transaction. Dispatch
jobs and listeners after commit when they depend on committed state. Use idempotency and
an outbox when cross-system delivery must survive process failure.

## Queries

Load relationships intentionally, prevent N+1 behavior, validate pagination, and allowlist
filter and sorting fields. Database constraints remain authoritative under races.

## Configuration and Failures

Read server configuration through Laravel config, fail safely when required values are
missing, and never expose secrets to browser assets. Map expected failures to stable safe
responses; unexpected failures receive a trace identifier and server-side diagnostics.

Use Composer, Artisan, the generated npm scripts, and Pint. Never edit `vendor/`.

