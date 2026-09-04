# Flyway Testing

Run Flyway from empty PostgreSQL and supported previous baselines. Start the Spring context against
the migrated schema, verify constraints and important queries, and test risky expand/contract stages.
Checksum drift or out-of-order production history fails CI rather than being repaired automatically.
