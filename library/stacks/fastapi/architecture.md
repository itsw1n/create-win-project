# FastAPI Architecture

## Profiles

### Small

Use a compact application package with configuration, database, security, and route
modules. Do not add service/repository layers that have only one caller or split a
simple operation into ceremonial layers.

```text
HTTP → Router → Service function → AsyncSession → PostgreSQL
```

### Medium (default)

Keep feature-oriented routers, services, repositories, schemas, and shared core
infrastructure explicit. Services own transaction boundaries and reusable operations.
Features communicate through clear service APIs rather than reaching into repositories.

### Large

Build bounded feature modules with explicit public module interfaces. A feature exposes
a small router/service API and keeps repository and schema implementation internal.
Verify no cycles, no access to internals, and only declared module dependencies with
the generated architecture-boundary tests. Large does not mean microservices.

## Dependency Direction

```text
web/API → application operation → domain policy → persistence/external adapter
```

- Routers translate HTTP and never touch the database session directly.
- Services do not return HTTP responses or depend on route details.
- Repositories contain persistence queries, not application policy.
- Cross-feature work calls a public operation or publishes a deliberate event.
- External side effects are not assumed successful merely because a transaction commits.

Start at the selected project baseline and let each feature create only the files it uses.
