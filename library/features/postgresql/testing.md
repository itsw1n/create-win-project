# PostgreSQL Testing

Test migrations from empty and supported prior schemas against the target PostgreSQL major. Cover
constraints, conflicts, transaction rollback, locking/concurrency risks, query plans for critical
paths, and backup restoration. SQLite/H2 cannot prove PostgreSQL-specific behavior.
