# Prisma Runtime

Use the catalog-tested driver adapter, reuse the client, select only required data, paginate bounded
queries, avoid N+1 access, and allowlist sorting/filtering. Application operations own `$transaction`;
keep external network calls out of long database transactions.
