# PostgreSQL Migrations

Migrations are immutable after deployment. Review locks and table rewrites, prefer expand/contract
changes, separate long backfills, and keep application versions compatible during rollout. Production
execution needs a lock, backup/recovery plan, observability, and explicit approval for destructive SQL.
