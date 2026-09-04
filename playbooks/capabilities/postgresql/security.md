# PostgreSQL Security

Use least-privilege roles, TLS outside trusted local networks, rotated secrets, and separate migration
credentials. Parameterize values; allowlist identifiers. Never expose PostgreSQL directly to browsers
or mobile clients. Log operational context without statements/parameters containing secrets or PII.
