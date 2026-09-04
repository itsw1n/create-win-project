# Laravel Queues

Jobs are small, idempotent, timeout-bounded, retry-aware, and safe when delivered more
than once. Dispatch after commit when a job depends on written records. Record terminal
failure and operational ownership. Use an outbox/relay when a database change and an
external message must be delivered reliably; a plain event or queued listener is not an
atomic cross-system guarantee.

