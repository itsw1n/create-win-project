# DevOps: Pull Request Template

---

## Template
```markdown
## What does this PR do?

<!-- Describe the change clearly. What problem does it solve? What was added or fixed? -->

---

## Type of change

- [ ] `feat` — new feature
- [ ] `fix` — bug fix
- [ ] `refactor` — restructure without behavior change
- [ ] `chore` — deps, config, tooling
- [ ] `docs` — documentation only
- [ ] `test` — adding or updating tests

---

## Scope

- [ ] `frontend`
- [ ] `backend`
- [ ] `docker`
- [ ] `ci`
- [ ] `docs`
- [ ] `deps`

---

## How to test this?

1.
2.
3.

---

## Checklist

### General
- [ ] Branched off `dev`, not `main`
- [ ] Branch name follows convention (`feat/`, `fix/`, `refactor/`, `chore/`)
- [ ] Commits follow `type(scope): description` convention
- [ ] No `console.log` or debug code
- [ ] No hardcoded secrets or credentials

### Quality
- [ ] `make lint` passes
- [ ] `make test` passes
- [ ] `make build` passes

### Backend (if applicable)
- [ ] New endpoints documented in `docs/api/endpoints.md`
- [ ] DTOs used — no raw entity exposed in responses
- [ ] New Flyway migration created if schema changed
- [ ] Migration file follows naming: `V{n}__{description}.sql`
- [ ] Unit test added for each new service method
- [ ] Integration test added for each new controller endpoint

### Frontend (if applicable)
- [ ] New API calls live inside `features/[name]/api/`
- [ ] New hooks live inside `features/[name]/hooks/`
- [ ] No business logic inside `pages/` or page components
- [ ] Route added to router if new page

### Docs
- [ ] `docs/api/endpoints.md` updated if endpoints changed
- [ ] `docs/api/errors.md` updated if new error codes added
- [ ] `AGENTS.md` updated if new rules or conventions added
- [ ] `README.md` updated if setup steps changed

---

Closes #
```

---

## File Location
```
.github/PULL_REQUEST_TEMPLATE.md
```

GitHub automatically uses this template for all new PRs in the repo.

---

## Agent Rules
```
When told to open a PR?
  → Fill every section of this template
  → Description must explain what AND why
  → How to test must have actual numbered steps
  → Checklist must be fully checked before opening
  → Never open PR unless explicitly asked

When reviewing a PR?
  → Check AGENTS.md rules are followed
  → Check RULES.md patterns are followed
  → Check docs are updated if endpoints or rules changed
```
