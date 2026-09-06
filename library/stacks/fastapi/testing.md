# FastAPI Testing

## Test Layers

| Risk | Test |
|---|---|
| Pure policy/value object | pytest unit test |
| Service orchestration/error code | Focused unit test with boundary fakes |
| Router validation/error/security | HTTPX async test without a database |
| Custom repository/Alembic/constraints | PostgreSQL integration test |
| Feature module | Module integration test |
| Large boundaries | Generated boundary test (no internal imports) |

Do not use SQLite as proof that PostgreSQL queries or migrations work. Standard CRUD
methods need no dedicated test, but custom queries, constraints, locking, and migrations do.

Test behavior and risk rather than every public function or mock call. Authentication tests
cover missing bearer tokens and invalid issuer, audience, signature, expiry, and required
claims. Authorization tests include resource ownership, not roles alone.

Every profile runs `ruff check`, `ruff format --check`, `mypy`, and `pytest`. Full testing
runs PostgreSQL integration tests; Large additionally fails on cycles and access to
module internals.
