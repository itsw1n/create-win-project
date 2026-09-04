# Laravel Database

PostgreSQL is the generated default. Eloquent owns ordinary persistence; query objects or
repositories are escalation tools, not model-by-model ceremony. Use foreign keys, unique
constraints, checks, appropriate nullability, indexes derived from real query paths, and
race-safe handling of constraint violations. Prevent N+1 queries and allowlist client
sorting/filtering. Factories own test data; seeders own deliberate local/demo baseline data.

