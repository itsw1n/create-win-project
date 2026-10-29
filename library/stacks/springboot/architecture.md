# Spring Boot Architecture

## Profiles

### Small

Use a conventional package per feature. Add a Controller for an HTTP entry point, a
Service for meaningful application operations, and a Repository and entity when this
feature owns persistence. Add request and response DTOs for useful transport contracts.
Do not split a simple operation into ceremonial layers.

```text
HTTP → Controller → Service → Repository → PostgreSQL
```

### Medium (default)

Keep package-by-feature and make API, application service, persistence, DTO, and entity
ownership explicit where those responsibilities exist. Services own transaction boundaries and reusable operations. Features
communicate through clear application APIs rather than reaching into repositories.

### Large

Build a modular monolith with Spring Modulith. A feature exposes a small API or named
interface and keeps application, domain, and persistence implementation internal. Verify
no cycles, no access to internals, and only declared module dependencies. Large does not
mean microservices.

## Dependency Direction

```text
web/API → application operation → domain policy → persistence/external adapter
```

- Controllers translate HTTP and never call repositories.
- Services do not return `ResponseEntity` or depend on route details.
- Repositories contain persistence queries, not application policy.
- Cross-feature work calls a public operation or publishes a deliberate event.
- External side effects are not assumed successful merely because a transaction commits.

Start at the selected project baseline and let each feature create only the files it uses.

## Escalation Decisions

| Add | When |
|---|---|
| Named subpackage | Several files make ownership clearer |
| Application Service | Policy, coordination, transaction, reuse, or independent testing exists |
| Modulith public/internal boundary | Large cross-feature dependencies need enforcement |

Do not create interfaces with one implementation solely for ceremony. Before removing or
reorganizing a user-created layer, explain the reason and recovery path and ask for approval.
