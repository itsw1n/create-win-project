# React + Vite Testing

## Test Layers

- Unit-test schemas, normalization, and pure client policies.
- Test components by accessible behavior with React Testing Library.
- Contract-test feature API/data functions, including malformed and rejected responses.
- Use Playwright for critical navigation, login, authorization failures, and recovery.
- Large projects verify public feature imports automatically.

Every profile passes format check, lint, typecheck, unit tests, and production build.
Full testing adds Playwright; authentication adds logout/expiry and forbidden-state tests.
