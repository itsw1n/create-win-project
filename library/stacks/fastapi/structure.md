# FastAPI Structure

## Package by Feature

Place the application entrypoint in the `app` package. Organize business code below it by
feature, never in one global router/service/repository layer.

```text
app/
├── main.py
├── core/               settings, database, security, logging (Medium/Large)
├── modules/status/     router, service, repository, schemas (Large)
├── features/status/    router, service, repository, schemas (Medium)
└── routes_health.py    public health/readiness (Small)
```

Small may keep the few feature modules directly under `app/`. Medium uses the named
`features/` packages when multiple files make ownership clearer. Large exposes types in
the module base/`__init__.py` public interface and places implementation in submodules
as required by the generated boundary tests.

Backend-only projects live at the repository root. Paired backends live under `backend/`.

- Use explicit imports; re-export only the public module interface from `__init__.py`.
- Prefer Pydantic v2 models for transport schemas; keep ORM models persistence-only.
- Do not invent users, products, or other business entities in the baseline.
- Use database-native identity types and constraints deliberately.
