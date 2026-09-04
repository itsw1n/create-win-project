# Git Conventions (Universal)

Applies to every project regardless of stack.

---

## Branch Structure
| Branch       | Purpose                                       |
|--------------|-----------------------------------------------|
| `main`       | Production — always stable, always deployable |
| `dev`        | Integration — all features merge here first   |
| `feature/*`  | New capability                                |
| `fix/*`      | Bug fix                                       |
| `refactor/*` | Restructure without behavior change           |
| `chore/*`    | Dependencies, config, tooling                 |
| `docs/*`     | Documentation only                            |
| `test/*`     | Adding or updating tests only                 |

## Branch Rules
- NEVER commit directly to `main` or `dev`
- ALWAYS branch off `dev` — never off `main`
- NEVER merge or create PRs unless explicitly asked
- NEVER push to remote unless explicitly asked
- One logical change per branch — keep branches small and focused

## Starting a Branch
```bash
git checkout dev
git pull origin dev
git checkout -b <type>/<short-description>
```

### Examples
```bash
git checkout -b feature/user-profile-page
git checkout -b fix/token-expiry-race
git checkout -b refactor/auth-feature-module
git checkout -b chore/update-dependencies
git checkout -b docs/update-api-endpoints
```

---

## Commit Convention

### Format
```
type(scope): short description
```

### Rules
- Lowercase only — no uppercase anywhere
- No period at the end
- Present tense — "add" not "added", "fix" not "fixed"
- Under 72 characters
- One logical change per commit

### Types
| Type       | When to use                                       |
|------------|---------------------------------------------------|
| `feat`     | New feature or capability                         |
| `fix`      | Bug fix                                           |
| `refactor` | Restructure without behavior change               |
| `chore`    | Deps, config, tooling — no production code change |
| `docs`     | Documentation only                                |
| `test`     | Adding or updating tests                          |
| `ci`       | GitHub Actions or CI/CD workflow changes          |
| `style`    | Formatting, whitespace — no logic change          |

### Scopes (React + Spring Boot)
| Scope      | When to use                        |
|------------|------------------------------------|
| `frontend` | Anything inside /frontend          |
| `backend`  | Anything inside /backend           |
| `docker`   | Dockerfile or docker-compose       |
| `ci`       | GitHub Actions workflows           |
| `docs`     | Anything inside /docs              |
| `deps`     | Dependency updates (either side)   |

### Scopes (Next.js projects)
| Scope      | When to use                        |
|------------|------------------------------------|
| `app`      | Next.js app router, pages, layouts |
| `api`      | API routes or server actions       |
| `db`       | Database schema, migrations        |
| `auth`     | Authentication logic               |
| `ci`       | GitHub Actions workflows           |
| `docs`     | Anything inside /docs              |
| `deps`     | Dependency updates                 |

### Examples
```bash
feat(frontend): add user profile page
feat(backend): add paper download endpoint
fix(backend): resolve token expiry race condition
fix(frontend): correct redirect after logout
refactor(backend): move auth logic into feature module
refactor(frontend): restructure features folder
chore(deps): update spring boot to 3.5.1
chore(docker): add maven cache volume
docs(api): update error contract with traceId field
test(backend): add unit tests for auth service
test(frontend): add vitest tests for useAuth hook
ci(backend): add postgresql service to ci workflow
```

---

## Daily Workflow
```bash
# 1. Always start from updated dev
git checkout dev
git pull origin dev

# 2. Create your branch
git checkout -b <type>/<description>

# 3. Work in small, logical commits
git add .
git commit -m "type(scope): description"

# 4. Push your branch
git push origin <branch-name>

# 5. Open PR → dev (only when explicitly asked)
# 6. Merge dev → main (only when explicitly asked)
```

---

## .gitignore — Always Include
```
# Environment
.env
.env.local
.env.production

# Dependencies
node_modules/
.mvn/

# Build outputs
dist/
build/
target/
.next/

# IDE
.idea/
.vscode/
*.iml

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Docker volumes (if local)
postgres-data/
```

---

## Agent Rules
```
Never:
  → commit directly to main or dev
  → branch off main
  → push or create PRs unless explicitly asked
  → put multiple logical changes in one commit
  → use vague commit messages ("fix stuff", "update code")

Always:
  → branch off dev
  → one logical change per commit
  → follow type(scope): description format
  → present tense in commit messages

When asked to commit:
  → Stage only files relevant to the current task
  → Write a precise commit message following the convention
  → Do not push unless explicitly asked
```
