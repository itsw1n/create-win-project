# FastAPI Structure

## Canonical Reference Tree

Place the application entrypoint in the `app` package. Organize business code below it by
feature, never in one global router/service/repository layer.

```text
app/
├── main.py
├── core/                         settings, database, security, logging
└── modules/users/                Large bounded module
    ├── router.py                 incoming HTTP adapter
    ├── service.py                application operations and transactions
    ├── repository.py             persistence queries
    ├── schemas.py                transport validation
    ├── models.py                 persistence models, when needed
    └── __init__.py               explicit public interface
```

The complete tree is a reference, not a requirement to create every file.

## Profile Differences

| Profile | Shape |
|---|---|
| Small | A few route or operation modules directly under `app/` |
| Medium | `app/features/<feature>/` with only the router, Service, Repository, and schemas it uses |
| Large | `app/modules/<module>/` with an explicit public interface and enforced module boundaries |

Large `modules` communicates a stronger boundary; it is not an arbitrary folder rename.

## File Placement

| Responsibility | Location |
|---|---|
| Application startup and router composition | `app/main.py` |
| Shared configuration, security, database, logging | `app/core/` |
| Incoming HTTP translation | Feature/module `router.py` |
| Application operation and transaction | `service.py` |
| Persistence query | `repository.py` |
| HTTP input/output validation | `schemas.py` |
| ORM persistence shape | `models.py` |

Backend-only projects live at the repository root. Paired backends live under `backend/`.

- Use explicit imports; re-export only the public module interface from `__init__.py`.
- Prefer Pydantic v2 models for transport schemas; keep ORM models persistence-only.
- Do not invent users, products, or other business entities in the baseline.
- Use database-native identity types and constraints deliberately.

## Architecture Cleanup

Do not retain empty files or directories to imitate the reference tree. Before removing or
reorganizing user-created structure, explain what changes, where the responsibility belongs now
and later, and how to restore the documented pattern; then ask for approval.
