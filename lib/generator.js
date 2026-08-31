import fs from 'fs-extra'
import path from 'path'
import { loadCatalog, resolveStack } from './catalog.js'
import { buildRulesIndex, copySelectedPlaybooks, resolvePlaybook } from './playbooks.js'
import { buildVars, render, readTemplate } from './template.js'
import {
  contextMd, progressMd, docPlaceholder,
  editorconfig, prettierrc, prTemplate,
} from './files.js'

/**
 * Main entry point — generates the full project
 */
export async function generateProject(answers, cliRoot) {
  const dest        = path.join(process.cwd(), answers.projectName)
  const playbooksDir = path.join(cliRoot, 'playbooks')
  const ciDir        = path.join(cliRoot, 'ci')
  const catalog      = await loadCatalog(playbooksDir)

  // Ensure styling is resolved before passing to resolveStack
  const resolvedAnswers = {
    ...answers,
    styling: answers.styling || catalog.byId[answers.frontend]?.stylingOptions?.[0] || 'tailwind',
  }

  const stack = resolveStack(resolvedAnswers, catalog)
  const vars  = buildVars(resolvedAnswers, stack)
  const templatesDir = path.join(cliRoot, 'templates')

  // 1. Root folder
  await fs.ensureDir(dest)

  // 2. Folder structure
  await scaffoldFolders(dest, stack)

  // 3. Root files
  await generateRootFiles(dest, resolvedAnswers, vars, stack, templatesDir)

  // 4. Doc placeholders
  await generateDocs(dest)

  // 5. GitHub Actions CI (template-driven)
  if (resolvedAnswers.githubActions) {
    await generateCI(dest, stack, ciDir)
  }

  // 6. Copy selected playbooks (including concern files)
  await copySelectedPlaybooks(playbooksDir, dest, stack)

  // 7. Copy concern playbooks referenced by this stack
  await copyConcernPlaybooks(playbooksDir, dest, stack)

  // 8. Extract snippet files
  await copySnippets(cliRoot, dest, stack)

  // 9. RULES.md
  const rulesContent = await buildRulesIndex(stack, catalog, playbooksDir)
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

// ─── Root files ───────────────────────────────────────────────────────────────

async function generateRootFiles(dest, answers, vars, stack, templatesDir) {
  await writeTemplate(dest, 'CONTEXT.md',    contextMd(vars, answers.expectedConcerns), vars)
  // AGENTS.md — template-driven
  {
    const tpl = await readTemplate(templatesDir, 'agents', stack.agentsTemplate, '.md')
    if (tpl) await writeTemplate(dest, 'AGENTS.md', tpl, vars)
    else await write(dest, 'AGENTS.md', `# AGENTS.md\nStack: ${stack.label}\n`)
  }
  await write(dest,         'PROGRESS.md',   progressMd())
  // README.md — template-driven
  {
    const tpl = await readTemplate(templatesDir, 'readme', stack.readmeTemplate, '.md')
    if (tpl) await writeTemplate(dest, 'README.md', tpl, vars)
  }
  // .gitignore — template-driven
  {
    const tpl = await readTemplate(templatesDir, 'gitignore', stack.gitignoreTemplate, '.gitignore')
    if (tpl) await writeTemplate(dest, '.gitignore', tpl, vars)
    else {
      const baseTpl = await readTemplate(templatesDir, 'gitignore', 'base', '.gitignore')
      if (baseTpl) await write(dest, '.gitignore', baseTpl)
    }
  }
  await write(dest,         '.editorconfig', editorconfig())
  await write(dest,         '.prettierrc',   prettierrc())

  // package.json — scripts come from manifest
  if (Object.keys(stack.deps).length || Object.keys(stack.devDeps).length) {
    const scripts = {
      ...stack.scripts,
      lint: 'eslint . --ext .ts,.tsx',
    }
    await write(dest, 'package.json', JSON.stringify({
      name:            answers.projectName,
      version:         '0.1.0',
      private:         true,
      type:            'module',
      scripts,
      dependencies:    stack.deps,
      devDependencies: stack.devDeps,
    }, null, 2) + '\n')
  }

  // .env.example — env vars already have correct prefix from resolver
  if (stack.env.length) {
    const envOut = [
      '# Generated from playbook manifests — fill values, never commit',
      '',
      ...stack.env.map((e) => `${e}=`),
    ].join('\n') + '\n'
    await write(dest, '.env.example', envOut)
  }

  // Makefile — template-driven (web only)
  if (answers.makefile && !stack.isMobile) {
    const tpl = await readTemplate(templatesDir, 'makefile', stack.makefileTemplate, '.mk')
    if (tpl) await writeTemplate(dest, 'Makefile', tpl, vars)
  }

  // Docker — template-driven
  if (answers.docker && !stack.isMobile) {
    // docker-compose.yml
    let composeTpl = null
    if (stack.needsPackage) {
      composeTpl = await readTemplate(templatesDir, 'docker/compose', 'springboot', '.yml')
    } else if (stack.backendKey === 'supabase') {
      composeTpl = await readTemplate(templatesDir, 'docker/compose', 'supabase', '.yml')
    } else {
      composeTpl = await readTemplate(templatesDir, 'docker/compose', 'postgres', '.yml')
    }
    if (composeTpl) await writeTemplate(dest, 'docker-compose.yml', composeTpl, vars)

    // docker-compose.prod.yml — only for springboot
    if (stack.needsPackage) {
      const prodTpl = await readTemplate(templatesDir, 'docker/compose-prod', 'springboot', '.yml')
      if (prodTpl) await writeTemplate(dest, 'docker-compose.prod.yml', prodTpl, vars)

      const beDev = await readTemplate(templatesDir, 'docker/dockerfile', 'springboot.dev', '.dockerfile')
      if (beDev) await write(dest, 'backend/Dockerfile.dev', beDev)
      const beProd = await readTemplate(templatesDir, 'docker/dockerfile', 'springboot.prod', '.dockerfile')
      if (beProd) await write(dest, 'backend/Dockerfile', beProd)
    }

    // frontend dockerfiles — vite vs nextjs
    if (stack.frontendKey === 'react') {
      const viteDev = await readTemplate(templatesDir, 'docker/dockerfile', 'vite.dev', '.dockerfile')
      if (viteDev) await write(dest, 'frontend/Dockerfile.dev', viteDev)
      const viteProd = await readTemplate(templatesDir, 'docker/dockerfile', 'vite.prod', '.dockerfile')
      if (viteProd) {
        await write(dest, 'frontend/Dockerfile', viteProd)
        const nginx = `server {\n  listen 80;\n  location / {\n    root /usr/share/nginx/html;\n    index index.html;\n    try_files $uri $uri/ /index.html;\n  }\n}\n`
        await write(dest, 'frontend/nginx.conf', nginx)
      }
    } else if (stack.frontendKey === 'nextjs') {
      const nextDev = await readTemplate(templatesDir, 'docker/dockerfile', 'nextjs.dev', '.dockerfile')
      if (nextDev) await write(dest, 'Dockerfile.dev', nextDev)
      const nextProd = await readTemplate(templatesDir, 'docker/dockerfile', 'nextjs.prod', '.dockerfile')
      if (nextProd) await write(dest, 'Dockerfile', nextProd)
    }
  }

  // PR template
  if (answers.githubActions) {
    await write(dest, '.github/PULL_REQUEST_TEMPLATE.md', prTemplate())
  }
}

// ─── Doc placeholders ─────────────────────────────────────────────────────────

async function generateDocs(dest) {
  const docs = [
    ['docs/api/overview.md',              'API Overview',           'Base URL, authentication method, and response format.'],
    ['docs/api/endpoints.md',             'API Endpoints',          'All endpoint documentation goes here.'],
    ['docs/api/errors.md',                'Error Code Registry',    'All error codes with status, category, and description.'],
    ['docs/architecture/overview.md',     'Architecture Overview',  'System design and how the pieces connect.'],
    ['docs/architecture/database-schema.md', 'Database Schema',     'Tables, columns, relationships, and ERD.'],
    ['docs/architecture/auth-flow.md',    'Auth Flow',              'Step-by-step authentication flow.'],
    ['docs/guides/setup.md',              'Local Setup Guide',      'Prerequisites and step-by-step local setup.'],
    ['docs/guides/deployment.md',         'Deployment Guide',       'How to deploy to production.'],
    ['docs/guides/env-variables.md',      'Environment Variables',  'Every variable: name, required, description, example.'],
  ]
  for (const [filePath, title, description] of docs) {
    const dir     = path.dirname(path.join(dest, filePath))
    const gitkeep = path.join(dir, '.gitkeep')
    if (await fs.pathExists(gitkeep)) await fs.remove(gitkeep)
    await write(dest, filePath, docPlaceholder(title, description))
  }
}

// ─── CI — template-driven ─────────────────────────────────────────────────────

async function generateCI(dest, stack, ciDir) {
  // Frontend CI — read from ci/{ciTemplate}.yml
  const feTpl = path.join(ciDir, `${stack.ciTemplate}.yml`)
  if (await fs.pathExists(feTpl)) {
    const content = await fs.readFile(feTpl, 'utf-8')
    await write(dest, `.github/workflows/ci-frontend.yml`, content)
  }

  // Backend CI — always springboot.yml if backend is Spring Boot
  if (stack.needsPackage) {
    const beTpl = path.join(ciDir, 'springboot.yml')
    if (await fs.pathExists(beTpl)) {
      const content = await fs.readFile(beTpl, 'utf-8')
      await write(dest, `.github/workflows/ci-backend.yml`, content)
    }
  }
}

// ─── Concern playbooks ────────────────────────────────────────────────────────

async function copyConcernPlaybooks(playbooksDir, dest, stack) {
  const concernFiles = new Set()
  for (const c of stack.concerns) {
    const pb = c.playbook || c._playbook
    if (pb && pb.startsWith('concerns/')) concernFiles.add(pb)
  }
  for (const file of concernFiles) {
    const src = path.join(playbooksDir, file)
    if (await fs.pathExists(src)) {
      await fs.copy(src, path.join(dest, 'playbooks', file))
    }
  }
}

// ─── Snippet extraction ────────────────────────────────────────────────────────

async function copySnippets(cliRoot, dest, stack) {
  const playbooksDir = path.join(cliRoot, 'playbooks')
  for (const [target, info] of Object.entries(stack.snippets || {})) {
    const full = await resolvePlaybook(playbooksDir, info.playbook)
    if (!(await fs.pathExists(full))) continue
    const content = await fs.readFile(full, 'utf-8')
    const block   = extractSnippet(content, info.tag)
    if (block) await write(dest, target, block)
  }
}

function extractSnippet(content, tag) {
  const marker = `<!-- ${tag} -->`
  const lines  = content.split('\n')
  let start    = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(marker)) { start = i; break }
  }
  if (start < 0) return null
  let fence = -1
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) { fence = i; break }
  }
  if (fence < 0) return null
  const end = lines.slice(fence + 1).findIndex((l) => /^\s*```/.test(l))
  if (end < 0) return null
  return lines.slice(fence + 1, fence + 1 + end).join('\n') + '\n'
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
