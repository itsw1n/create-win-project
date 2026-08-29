import fs from 'fs-extra'
import path from 'path'
import { loadCatalog, resolveStack } from './catalog.js'
import { buildRulesIndex, copySelectedPlaybooks, resolvePlaybook } from './playbooks.js'
import { buildVars, render } from './template.js'
import {
  contextMd, agentsMd, progressMd, readmeMd,
  gitignore, editorconfig, prettierrc, docPlaceholder,
  makefile, dockerCompose, dockerComposeProd,
  frontendDockerfiles, backendDockerfiles,
} from './files.js'

/**
 * Main entry point — generates the full project
 */
export async function generateProject(answers, cliRoot) {
  const dest = path.join(process.cwd(), answers.projectName)
  const playbooksDir = path.join(cliRoot, 'playbooks')
  const compactDir = path.join(cliRoot, 'playbooks-compact')
  const vars = buildVars(answers)
  const catalog = await loadCatalog(playbooksDir)
  const stack = resolveStack(answers, catalog)

  // ── 1. Create root folder ─────────────────────────────────────────────────
  await fs.ensureDir(dest)

  // ── 2. Scaffold folder structure ──────────────────────────────────────────
  await scaffoldFolders(dest, stack)

  // ── 3. Generate root files ────────────────────────────────────────────────
  await generateRootFiles(dest, answers, vars, stack)

  // ── 4. Generate doc placeholders ──────────────────────────────────────────
  await generateDocs(dest)

  // ── 5. Generate GitHub Actions CI ─────────────────────────────────────────
  if (answers.githubActions) {
    await generateCI(dest, stack)
  }

  // ── 6. Copy only the selected playbooks into the project ──────────────────
  await copySelectedPlaybooks(playbooksDir, compactDir, dest, stack)

  // ── 6b. Extract snippet files from playbook manifests ─────────────────────
  await copySnippets(cliRoot, dest, stack)

  // ── 7. Generate index-style RULES.md ──────────────────────────────────────
  const rulesContent = await buildRulesIndex(stack, catalog, playbooksDir, compactDir)
  await write(dest, 'RULES.md', rulesContent)
}

// ─── Folder scaffolding ───────────────────────────────────────────────────────

async function scaffoldFolders(dest, stack) {
  for (const folder of stack.folders) {
    const fullPath = path.join(dest, folder)
    await fs.ensureDir(fullPath)
    await fs.writeFile(path.join(fullPath, '.gitkeep'), '')
  }
}

// ─── Root file generation ─────────────────────────────────────────────────────

async function generateRootFiles(dest, answers, vars, stack) {
  // Core project files
  await writeTemplate(dest, 'CONTEXT.md', contextMd(vars, answers.expectedConcerns), vars)
  await writeTemplate(dest, 'AGENTS.md', agentsMd(vars, stack), vars)
  await write(dest, 'PROGRESS.md', progressMd())
  await writeTemplate(dest, 'README.md', readmeMd(vars, stack, answers), vars)
  await write(dest, '.gitignore', gitignore(stack))
  await write(dest, '.editorconfig', editorconfig())
  await write(dest, '.prettierrc', prettierrc())

  // package.json from manifest deps (Phase 2)
  if (Object.keys(stack.deps).length || Object.keys(stack.devDeps).length) {
    await write(dest, 'package.json', JSON.stringify({
      name: answers.projectName,
      version: '0.1.0',
      private: true,
      type: 'module',
      scripts: { dev: stack.isNextjs ? 'next dev' : stack.isReact ? 'vite' : 'echo dev', build: stack.isNextjs ? 'next build' : stack.isReact ? 'vite build' : 'echo build', test: 'vitest run' },
      dependencies: stack.deps,
      devDependencies: stack.devDeps,
    }, null, 2) + '\n')
  }

  // .env.example from manifest env
  if (stack.env.length) {
    const envOut = ['# Generated from playbook manifests — fill values, never commit', '']
      .concat(stack.env.map((e) => `${e}=`)).join('\n') + '\n'
    await write(dest, '.env.example', envOut)
  }

  // Makefile
  if (answers.makefile) {
    await writeTemplate(dest, 'Makefile', makefile(stack), vars)
  }

  // Docker compose + Dockerfiles
  if (answers.docker) {
    await writeTemplate(dest, 'docker-compose.yml', dockerCompose(stack), vars)
    if (stack.isSpringBoot) {
      await writeTemplate(dest, 'docker-compose.prod.yml', dockerComposeProd(stack), vars)
      for (const [filePath, content] of backendDockerfiles(stack)) {
        await write(dest, filePath, content)
      }
    }
    for (const [filePath, content] of frontendDockerfiles(stack)) {
      await write(dest, filePath, content)
    }
  }

  // PR template
  if (answers.githubActions) {
    await write(
      dest,
      '.github/PULL_REQUEST_TEMPLATE.md',
      prTemplate()
    )
  }
}

// ─── Doc placeholders ─────────────────────────────────────────────────────────

async function generateDocs(dest) {
  const docs = [
    ['docs/api/overview.md', 'API Overview', 'Base URL, authentication method, and response format.'],
    ['docs/api/endpoints.md', 'API Endpoints', 'All endpoint documentation goes here.'],
    ['docs/api/errors.md', 'Error Code Registry', 'All error codes with status, category, and description.'],
    ['docs/architecture/overview.md', 'Architecture Overview', 'System design and how the pieces connect.'],
    ['docs/architecture/database-schema.md', 'Database Schema', 'Tables, columns, relationships, and ERD.'],
    ['docs/architecture/auth-flow.md', 'Auth Flow', 'Step-by-step authentication flow.'],
    ['docs/guides/setup.md', 'Local Setup Guide', 'Prerequisites and step-by-step local setup.'],
    ['docs/guides/deployment.md', 'Deployment Guide', 'How to deploy to production.'],
    ['docs/guides/env-variables.md', 'Environment Variables', 'Every variable: name, required, description, example.'],
  ]

  for (const [filePath, title, description] of docs) {
    // Remove .gitkeep from these dirs since we're adding real files
    const dir = path.dirname(path.join(dest, filePath))
    const gitkeep = path.join(dir, '.gitkeep')
    if (await fs.pathExists(gitkeep)) await fs.remove(gitkeep)

    await write(dest, filePath, docPlaceholder(title, description))
  }
}

// ─── CI generation ────────────────────────────────────────────────────────────

async function generateCI(dest, stack) {
  const frontendCI = stack.isNextjs ? nextjsCI() : reactCI(stack.frontendDir)
  await write(dest, `.github/workflows/ci-frontend.yml`, frontendCI)

  if (stack.isSpringBoot) {
    await write(dest, `.github/workflows/ci-backend.yml`, springBootCI())
  }
}

// ─── CI file content ──────────────────────────────────────────────────────────

function nextjsCI() {
  return `name: CI — Next.js

on:
  push:
    branches: [dev, main]
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
          NEXT_PUBLIC_SUPABASE_URL: \${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: \${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
`
}

function reactCI(frontendDir) {
  const workingDir = frontendDir ? `\n    defaults:\n      run:\n        working-directory: ${frontendDir}\n` : ''
  const paths = frontendDir ? `\n    paths:\n      - ${frontendDir}/**` : ''

  return `name: CI — Frontend

on:
  push:
    branches: [dev, main]${paths}
  pull_request:
    branches: [dev, main]${paths}

jobs:
  ci-frontend:
    name: Lint, Test, Build
    runs-on: ubuntu-latest
${workingDir}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          ${frontendDir ? `cache-dependency-path: ${frontendDir}/package-lock.json` : ''}

      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
        env:
          VITE_API_URL: http://localhost:8080
`
}

function springBootCI() {
  return `name: CI — Backend

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
      - uses: actions/checkout@v4

      - uses: actions/setup-java@v4
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
`
}

function prTemplate() {
  return `## What does this PR do?

<!-- Describe the change clearly. What problem does it solve? -->

---

## Type of change
- [ ] \`feat\` — new feature
- [ ] \`fix\` — bug fix
- [ ] \`refactor\` — restructure without behavior change
- [ ] \`chore\` — deps, config, tooling
- [ ] \`docs\` — documentation only
- [ ] \`test\` — adding or updating tests

## Scope
- [ ] \`frontend\`
- [ ] \`backend\`
- [ ] \`docker\`
- [ ] \`ci\`
- [ ] \`docs\`
- [ ] \`deps\`

---

## How to test?
1.
2.
3.

---

## Checklist
- [ ] Branched off \`dev\`
- [ ] Commits follow \`type(scope): description\`
- [ ] No \`console.log\` or debug code
- [ ] No hardcoded secrets
- [ ] \`make lint\` passes
- [ ] \`make test\` passes
- [ ] Docs updated if endpoints or rules changed

Closes #
`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function write(dest, filePath, content) {
  const fullPath = path.join(dest, filePath)
  await fs.ensureDir(path.dirname(fullPath))
  await fs.writeFile(fullPath, content, 'utf-8')
}

async function writeTemplate(dest, filePath, content, vars) {
  await write(dest, filePath, render(content, vars))
}

// ─── Snippet extraction ────────────────────────────────────────────────────────

async function copySnippets(cliRoot, dest, stack) {
  const playbooksDir = path.join(cliRoot, 'playbooks')
  const compactDir = path.join(cliRoot, 'playbooks-compact')
  for (const [target, info] of Object.entries(stack.snippets || {})) {
    const full = await resolvePlaybook(playbooksDir, compactDir, info.playbook)
    if (!(await fs.pathExists(full))) continue
    const content = await fs.readFile(full, 'utf-8')
    const block = extractSnippet(content, info.tag)
    if (block) await write(dest, target, block)
  }
}

function extractSnippet(content, tag) {
  const marker = `<!-- ${tag} -->`
  const lines = content.split('\n')
  let start = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(marker)) { start = i; break }
  }
  if (start < 0) return null
  // find the next fenced code block after the marker
  let fence = -1
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) { fence = i; break }
  }
  if (fence < 0) return null
  const end = lines.slice(fence + 1).findIndex((l) => /^\s*```/.test(l))
  if (end < 0) return null
  return lines.slice(fence + 1, fence + 1 + end).join('\n') + '\n'
}