#!/usr/bin/env node
import inquirer from 'inquirer'
import chalk from 'chalk'
import ora from 'ora'
import path from 'path'
import { fileURLToPath } from 'url'
import { generateProject } from './lib/generator.js'
import { loadCompatibility } from './lib/compatibility.js'
import { w1nBanner } from './lib/banner.js'
import {
  loadCatalog, resolveStack,
  frontendChoices, backendChoicesFor, stylingChoicesFor, supportsArchitecture,
} from './lib/catalog.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const profileArg = process.argv.slice(2).find((arg) => arg.startsWith('--profile='))?.split('=')[1]
const { profile } = await loadCompatibility(
  path.join(__dirname, 'compatibility/profiles.json'),
  profileArg,
)
const catalog = await loadCatalog(path.join(__dirname, 'playbooks'), profile)

// ─── Banner ──────────────────────────────────────────────────────────────────

console.log('')
console.log(w1nBanner())
console.log('')
console.log(chalk.gray('  Production-ready project scaffolding'))
console.log(chalk.gray(`  Compatibility profile: ${profile.id} (${profile.status})`))
console.log('')

// ─── Interview ───────────────────────────────────────────────────────────────

const answers = await inquirer.prompt([
  // ── Always-on ──────────────────────────────────────────────────────────
  {
    type: 'input',
    name: 'projectName',
    message: 'Project name?',
    default: 'my-project',
    validate: (v) => {
      if (!v.trim()) return 'Project name is required'
      if (!/^[a-z0-9-]+$/.test(v)) return 'Use lowercase letters, numbers, and hyphens only'
      return true
    },
  },
  {
    type: 'input',
    name: 'projectDescription',
    message: 'One-line description?',
    default: 'A new application',
  },

  // ── Stack selection (catalog-driven) ───────────────────────────────────
  {
    type: 'list',
    name: 'frontend',
    message: 'Pick your frontend:',
    choices: frontendChoices(catalog),
  },
  {
    type: 'list',
    name: 'backend',
    message: 'Pick your backend/database:',
    choices: (a) => backendChoicesFor(catalog, a.frontend),
  },

  // ── Styling: only shown when frontend has >1 option (catalog-driven) ───
  {
    type: 'list',
    name: 'styling',
    message: 'Styling approach?',
    choices: (a) => stylingChoicesFor(catalog, a.frontend),
    when: (a) => stylingChoicesFor(catalog, a.frontend).length > 1,
  },

  // ── Architecture: only shown when frontend supports it (manifest flag) ─
  {
    type: 'list',
    name: 'architecture',
    message: 'Architecture depth?',
    choices: [
      { name: 'Medium  — Service layer, no Repository  (recommended)', value: 'medium' },
      { name: 'Large   — Service + Repository layers',                  value: 'large' },
    ],
    default: 'medium',
    when: (a) => supportsArchitecture(catalog, a.frontend),
  },

  // ── Testing ────────────────────────────────────────────────────────────
  {
    type: 'list',
    name: 'testing',
    message: 'Testing setup?',
    choices: (a) => {
      const fe = catalog.byId[a.frontend]
      if (fe?.platform === 'mobile') {
        return [
          { name: 'Basic  (Jest + React Native Testing Library)', value: 'basic' },
          { name: 'None',                                          value: 'none' },
        ]
      }
      return [
        { name: 'Full   (Vitest + React Testing Library + Playwright)', value: 'full' },
        { name: 'Basic  (Vitest + React Testing Library)',               value: 'basic' },
        { name: 'None',                                                  value: 'none' },
      ]
    },
    default: (a) => {
      const fe = catalog.byId[a.frontend]
      return fe?.platform === 'mobile' ? 'basic' : 'full'
    },
  },

  // ── DevOps extras ──────────────────────────────────────────────────────
  {
    type: 'confirm',
    name: 'docker',
    message: 'Include Docker?',
    default: true,
    when: (a) => {
      const fe = catalog.byId[a.frontend]
      const be = catalog.byId[a.backend]
      return (be?.needsDocker ?? fe?.needsDocker ?? false)
    },
  },
  {
    type: 'confirm',
    name: 'makefile',
    message: 'Include Makefile?',
    default: true,
    when: (a) => {
      // Makefile is useful for web stacks; less relevant for bare mobile
      const fe = catalog.byId[a.frontend]
      return fe?.platform !== 'mobile'
    },
  },
  {
    type: 'confirm',
    name: 'githubActions',
    message: 'Include GitHub Actions CI?',
    default: true,
  },

  // ── Spring Boot specific ───────────────────────────────────────────────
  {
    type: 'input',
    name: 'packageName',
    message: 'Java package name? (e.g. com.yourname)',
    default: 'com.app',
    when: (a) => a.backend === 'springboot',
    validate: (v) => {
      if (!v.trim()) return 'Package name is required'
      if (!/^[a-z]+(\.[a-z]+)+$/.test(v)) return 'Use format: com.yourname'
      return true
    },
  },

  // ── Optional concerns (filtered to current stack) ──────────────────────
  {
    type: 'checkbox',
    name: 'expectedConcerns',
    message: 'Expected optional concerns? (advisory only — all stay available)',
    choices: (a) => {
      const stack = resolveStack({ ...a, styling: a.styling || catalog.byId[a.frontend]?.stylingOptions?.[0] }, catalog)
      const opts = new Set()
      for (const c of stack.concerns) if (!c.required) opts.add(c.id)
      return [...opts].map((id) => ({ name: id, value: id }))
    },
  },
])
answers.compatibilityProfile = profile.id

// ── Auto-resolve docker for stacks that need it ───────────────────────────────
if (resolveStack({ ...answers, styling: answers.styling || catalog.byId[answers.frontend]?.stylingOptions?.[0] || 'tailwind' }, catalog).needsDocker) {
  answers.docker = answers.docker ?? true
}

const stack = resolveStack({ ...answers, styling: answers.styling || catalog.byId[answers.frontend]?.stylingOptions?.[0] || 'tailwind' }, catalog)

// ─── Confirm ─────────────────────────────────────────────────────────────────

console.log('')
console.log(chalk.bold('  Summary'))
console.log(chalk.gray('  ───────────────────────────'))
console.log(`  ${chalk.cyan('Name:')}         ${answers.projectName}`)
console.log(`  ${chalk.cyan('Stack:')}        ${stack.label}`)
console.log(`  ${chalk.cyan('Platform:')}     ${stack.platform}`)
if (stack.styleId) {
  console.log(`  ${chalk.cyan('Styling:')}      ${catalog.byId[stack.styleId]?.label || stack.styleId}`)
}
if (stack.platform === 'web' && supportsArchitecture(catalog, answers.frontend)) {
  console.log(`  ${chalk.cyan('Architecture:')} ${stack.architecture === 'large' ? 'Large (Service + Repository)' : 'Medium (Service layer)'}`)
}
console.log(`  ${chalk.cyan('Testing:')}      ${answers.testing}`)
if (stack.platform !== 'mobile') {
  console.log(`  ${chalk.cyan('Docker:')}       ${answers.docker ? 'yes' : 'no'}`)
  console.log(`  ${chalk.cyan('Makefile:')}     ${answers.makefile ? 'yes' : 'no'}`)
}
console.log(`  ${chalk.cyan('CI/CD:')}        ${answers.githubActions ? 'yes' : 'no'}`)
if (answers.packageName) {
  console.log(`  ${chalk.cyan('Package:')}      ${answers.packageName}`)
}
if (stack.constraints.length) {
  console.log('')
  console.log(chalk.gray('  Key constraints:'))
  for (const rule of stack.constraints.slice(0, 3)) {
    console.log(chalk.gray(`  • ${rule}`))
  }
}
console.log('')

const { confirm } = await inquirer.prompt([
  { type: 'confirm', name: 'confirm', message: 'Generate project?', default: true },
])

if (!confirm) {
  console.log(chalk.yellow('\n  Cancelled.\n'))
  process.exit(0)
}

// ─── Generate ────────────────────────────────────────────────────────────────

console.log('')
const spinner = ora('Scaffolding project...').start()

try {
  await generateProject(answers, __dirname)
  spinner.succeed(chalk.green('Project created!'))
  console.log('')
  console.log(chalk.bold(`  Next steps:`))
  console.log(chalk.gray(`  cd ${answers.projectName}`))

  if (stack.frontendKey === 'react') {
    if (stack.backendKey === 'springboot') {
      console.log(chalk.gray(`  cp .env.example .env  # Docker/backend values`))
    }
    console.log(chalk.gray(`  cd frontend`))
    console.log(chalk.gray(`  cp .env.example .env`))
    console.log(chalk.gray(`  npm install`))
  } else {
    console.log(chalk.gray(`  cp .env.example ${stack.isMobile ? '.env' : '.env.local'}`))
    console.log(chalk.gray(`  npm install`))
  }

  if (stack.isMobile) {
    console.log(chalk.gray(`  npx expo start`))
  } else if (answers.makefile) {
    if (stack.frontendKey === 'react') {
      console.log(chalk.gray(`  cd ..`))
    }
    console.log(chalk.gray(`  make dev`))
  } else if (stack.backendKey === 'supabase') {
    console.log(chalk.gray(`  npx supabase start`))
    console.log(chalk.gray(`  npm run dev`))
  } else if (stack.frontendKey === 'react') {
    console.log(chalk.gray(`  npm run dev`))
  } else {
    console.log(chalk.gray(`  docker compose up -d db`))
    console.log(chalk.gray(`  npm run dev`))
  }

  console.log('')
  console.log(chalk.cyan(`  Read RULES.md before starting — it maps every playbook for this stack.`))
  console.log('')
} catch (err) {
  spinner.fail(chalk.red('Failed to generate project'))
  console.error(err)
  process.exit(1)
}
