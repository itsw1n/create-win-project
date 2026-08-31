# DevOps: GitHub Actions

---

## Core Rules
- Separate workflow per service — frontend and backend never in one file
- Path filtering — only trigger on relevant folder changes
- Use npm ci not npm install in CI
- Backend tests always use real PostgreSQL — never H2
- All secrets from GitHub Secrets — never hardcoded
- Always cache dependencies (npm cache, Maven cache)
- Branch targets: dev and main only

---

## Frontend CI
```yaml
# .github/workflows/ci-frontend.yml
name: CI — Frontend

on:
  push:
    branches: [dev, main]
    paths:
      - frontend/**
  pull_request:
    branches: [dev, main]
    paths:
      - frontend/**

jobs:
  ci-frontend:
    name: Lint, Test, Build
    runs-on: ubuntu-latest

    defaults:
      run:
        working-directory: frontend

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm run test

      - name: Build
        run: npm run build
        env:
          VITE_API_URL: http://localhost:8080
```

## Backend CI (Spring Boot)
```yaml
# .github/workflows/ci-backend.yml
name: CI — Backend

on:
  push:
    branches: [dev, main]
    paths:
      - backend/**
  pull_request:
    branches: [dev, main]
    paths:
      - backend/**

jobs:
  ci-backend:
    name: Test, Build
    runs-on: ubuntu-latest

    defaults:
      run:
        working-directory: backend

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Java 21
        uses: actions/setup-java@v4
        with:
          java-version: 21
          distribution: temurin
          cache: maven

      - name: Run tests
        run: ./mvnw test
        env:
          SPRING_PROFILES_ACTIVE: test
          DB_URL: jdbc:postgresql://localhost:5432/testdb
          DB_USERNAME: postgres
          DB_PASSWORD: postgres
          JWT_SECRET: test-secret-value-at-least-32-characters
          JWT_REFRESH_SECRET: test-refresh-secret-at-least-32-chars

      - name: Build JAR
        run: ./mvnw package -DskipTests
```

## Next.js CI
```yaml
# .github/workflows/ci-nextjs.yml
name: CI — Next.js

on:
  push:
    branches: [dev, main]
    paths:
      - src/**
      - public/**
      - package*.json
      - next.config.*
  pull_request:
    branches: [dev, main]

jobs:
  ci:
    name: Lint, Test, Build
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

## Branching & Release — `main` / `dev` with `release-please` + `sync-dev`

Branching model enforced by `.github/workflows`:

```
feature/*, fix/*, chore/*  →  PR → dev  →  when stable  →  PR dev→main  →  tag
      (CI must pass)            (CI must pass)             (auto-sync main→dev)
```

- `main` — stable/releaseable only. No direct push. Only merged from `dev` via promote PR (`--no-ff`).
- `dev` — integration branch. All `feature/`, `fix/`, `chore/` branches branch **off `dev`** (never off `main`) and merge back into `dev`.
- When `dev` is stable, open PR `dev → main`. That merge is the release.

CI gate (all must pass before merge — see Frontend/Backend/Next.js CI above):

- `typecheck` (`tsc --noEmit`) if project uses TypeScript
- `lint` (`npm run lint`) + `format:check` (`prettier --check .`)
- `build` (`npm run build`)
  - Expo: `expo export --platform android` with dummy `EXPO_PUBLIC_*` in CI (no secrets)
  - Next.js: `next build` with `NEXT_PUBLIC_*` from `secrets` if SSR needs Supabase

Release — `release-please` (`googleapis/release-please-action` on `push: main`):

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]
permissions:
  contents: write
  pull-requests: write
jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4
        with:
          token: ${{ secrets.RELEASE_PLEASE_TOKEN }}
          release-type: node
```

Conventional commits drive semver: `feat` → minor, `fix` → patch, `BREAKING CHANGE`/`!` → major. The action bumps `package.json`/`package-lock.json`, updates `CHANGELOG.md`, and tags `vX.Y.Z` — these are **commits on `main` only**, so `dev` falls behind.

Sync — `sync-dev` heals the divergence (`on: release.published`):

```yaml
# .github/workflows/sync-dev.yml
name: Sync dev with main
on:
  release:
    types: [published]
permissions:
  contents: write
  pull-requests: write
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0, token: ${{ secrets.RELEASE_PLEASE_TOKEN || github.token }} }
      - run: |
          behind=$(gh api repos/${{ github.repository }}/compare/dev...main --jq '.behind_by' 2>/dev/null || echo 0)
          echo "dev_behind=$behind" >> "$GITHUB_ENV"
        env:
          GH_TOKEN: ${{ secrets.RELEASE_PLEASE_TOKEN || github.token }}
      - if: env.dev_behind > 0
        run: |
          BRANCH="sync/dev-realign-${GITHUB_REF_NAME#v}"
          git checkout -b "$BRANCH" origin/main
          git merge origin/dev --no-edit -m "chore: realign dev with main"
          git push origin "$BRANCH"
          echo "sync_branch=$BRANCH" >> "$GITHUB_ENV"
      - if: env.dev_behind > 0
        run: |
          PR=$(gh pr create --base dev --head "${{ env.sync_branch }}" --title "sync: realign dev with main" --body "Auto after ${{ env.sync_branch }}" | sed -E 's#.*/pull/([0-9]+).*#\1#')
          gh pr merge --auto --merge "$PR"
        env:
          GH_TOKEN: ${{ secrets.RELEASE_PLEASE_TOKEN || github.token }}
```

- Creates branch `sync/dev-realign-<version>` from `main`, merges `dev`, opens + auto-merges PR into `dev` (`RELEASE_PLEASE_TOKEN`). Branch left for manual cleanup (unique per version, safe to re-run).
- Only needed if you use `release-please` (POS does). If release is dumb `PATCH+1` tag-only (old carwebsite), no sync needed.

Branch protection (apply in GitHub UI → Settings → Branches → Add rule for `main` and `dev`):

- Require a pull request before merging (1 approval, `dismiss stale`).
- Require status checks to pass before merging → select `Typecheck`, `Lint & format`, and `Build`.
- Do not allow bypass; restrict who can push.

When to add `sync-dev`:

- Smart tags (`release-please`) → add `ci.yml` + `release.yml` + `sync-dev.yml`.
- Dumb tags (`PATCH+1` only) → `ci.yml` + `release.yml` only, no `sync-dev`.

---

## Agent Rules
```
New workflow file?
  → Path-filter to relevant folder
  → Separate from other services
  → Cache dependencies
  → Secrets from GitHub Secrets, never hardcoded

Backend tests?
  → Always real PostgreSQL service container
  → SPRING_PROFILES_ACTIVE: test
  → NEVER H2 in-memory DB

Frontend build?
  → npm ci (not npm install)
  → Lint must pass before test
  → Test must pass before build
```
