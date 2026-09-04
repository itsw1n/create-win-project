# Next.js Testing

## Test Layers

| Risk | Test |
|---|---|
| Schema or pure policy | Vitest unit test |
| Component behavior/accessibility | React Testing Library |
| Service orchestration | Unit test with boundary fakes |
| Repository/API contract | Integration or contract test |
| Route Handler/Server Function security | Unauthenticated, forbidden, valid tests |
| Critical user journey | Playwright |

Test observable behavior rather than implementation call counts. Repository tests use the
real database engine when query behavior matters. Remote API clients use contract fixtures
that include malformed and failure responses.

Every profile must pass format check, lint, typecheck, tests, and production build. Full
testing adds Playwright. Large adds import-boundary and public-API checks. Authenticated
projects test expiry/logout and ensure authorization is enforced below the UI.
