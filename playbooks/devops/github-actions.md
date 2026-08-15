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
