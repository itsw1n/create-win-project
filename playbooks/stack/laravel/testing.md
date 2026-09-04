# Laravel Testing

## Risk-Based Layers

| Risk | Test |
|---|---|
| Pure PHP/domain rule | Pest/PHPUnit unit test |
| Validation, middleware, Resource contract | HTTP feature test |
| Policy/resource ownership | unauthenticated, forbidden, allowed tests |
| Eloquent query or migration | target PostgreSQL integration test |
| Queue dispatch/retry | focused job test plus integrated boundary test |
| Browser behavior | component test or Playwright critical journey |
| Large module dependency | automated architecture check |

Use factories for intent and `RefreshDatabase` with an isolated test database. SQLite may
support fast framework-independent tests, but it is not evidence for PostgreSQL-specific
SQL, constraints, locking, or migrations.

Test safe failures, conflicts, transaction rollback, login/logout, session expiry, CSRF,
and resource authorization according to the selected authentication model. Do not mock
Eloquent merely to satisfy a unit-test percentage.

