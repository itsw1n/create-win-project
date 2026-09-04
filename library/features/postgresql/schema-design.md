# PostgreSQL Schema Design

## Core Rules

Use explicit primary/foreign keys, nullability, unique/check constraints, and timestamps with time
zone. Choose types for domain meaning, not convenience. Index foreign keys and measured filter/sort
paths; avoid speculative indexes. Define deletion behavior and tenant/resource ownership explicitly.
