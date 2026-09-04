# Spring Boot Testing

## Test Layers

| Risk | Test |
|---|---|
| Pure policy/value object | JUnit unit test |
| Service orchestration/error code | Focused unit test with boundary fakes |
| MVC validation/error/security | MVC slice test without a database |
| Custom repository/Flyway/constraints | PostgreSQL Testcontainers integration |
| Feature module | Module integration test |
| Large boundaries | Spring Modulith `ApplicationModules.verify()` |

Do not use H2 as proof that PostgreSQL queries or migrations work. Standard Spring Data
methods need no dedicated test, but custom queries, constraints, locking, and migrations do.

Test behavior and risk rather than every public method or mock call. Authentication tests
cover session expiry/logout/CSRF or invalid JWT issuer, audience, signature, and expiry as
applicable. Authorization tests include resource ownership, not roles alone.

Every profile runs Maven tests and package. Full testing runs PostgreSQL integration tests;
Large additionally fails on cycles and access to module internals.
