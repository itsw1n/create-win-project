#!/usr/bin/env node
import inquirer from 'inquirer'
import chalk from 'chalk'
import ora from 'ora'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'node:child_process'
import { generateProject } from './lib/generator.js'
import { loadCompatibility } from './lib/compatibility.js'
import { printDoctor } from './lib/doctor.js'
import { configurationDecisionChoices, promptWithBack } from './lib/interview.js'
import { w1nBanner } from './lib/banner.js'
import {
  loadCatalog, resolveStack,
  stylingChoicesFor, architectureChoicesFor,
} from './lib/catalog.js'
import {
  APPLICATION_SHAPES,
  applicationShapeChoices,
  backendChoicesForShape,
  frontendChoicesForShape,
} from './lib/application-shapes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cliArgs = process.argv.slice(2)
const profileArg = cliArgs.find((arg) => arg.startsWith('--profile='))?.split('=')[1]
const shapeArg = cliArgs.find((arg) => arg.startsWith('--shape='))?.split('=')[1]
const frontendValue = cliArgs.find((arg) => arg.startsWith('--frontend='))?.split('=')[1]
const backendArg = cliArgs.find((arg) => arg.startsWith('--backend='))?.split('=')[1]
const frontendAliases = { vite: 'react', expo: 'react-native', none: 'no-frontend' }
const frontendArg = frontendAliases[frontendValue] || frontendValue
const architectureArg = cliArgs.find((arg) => arg.startsWith('--architecture='))?.split('=')[1]
const authenticationArg = cliArgs.find((arg) => arg.startsWith('--authentication='))?.split('=')[1]
const authAudienceArg = cliArgs.find((arg) => arg.startsWith('--auth-audience='))?.split('=')[1]
if (shapeArg && !APPLICATION_SHAPES[shapeArg]) {
  throw new Error('--shape must be fullstack, separate, api, mobile, or frontend')
}
if (architectureArg && !['small', 'medium', 'large'].includes(architectureArg)) {
  throw new Error('--architecture must be small, medium, or large')
}
if (authenticationArg && !['yes', 'not-yet', 'none'].includes(authenticationArg)) {
  throw new Error('--authentication must be yes, not-yet, or none')
}
if (authAudienceArg && !['website', 'multi-client'].includes(authAudienceArg)) {
  throw new Error('--auth-audience must be website or multi-client')
}
const wantsInstall = cliArgs.includes('--install')
const skipsInstall = cliArgs.includes('--no-install')
if (wantsInstall && skipsInstall) throw new Error('Use either --install or --no-install, not both')
const { profile } = await loadCompatibility(
  path.join(__dirname, 'compatibility/profiles.json'),
  profileArg,
)
if (cliArgs[0] === 'doctor' || cliArgs.includes('--doctor')) {
  printDoctor(profile)
  process.exit(0)
}
const catalog = await loadCatalog(path.join(__dirname, 'playbooks'), profile)

// ─── Banner ──────────────────────────────────────────────────────────────────

console.log('')
console.log(w1nBanner())
console.log('')
console.log(chalk.gray('  Production-ready project scaffolding'))
console.log(chalk.gray(`  Compatibility profile: ${profile.id} (${profile.status})`))
console.log('')

// ─── Interview ───────────────────────────────────────────────────────────────

const questions = [
  {
    type: 'list',
    name: 'applicationShape',
    message: 'What kind of application are you building?',
    choices: applicationShapeChoices(),
    default: 'fullstack',
    when: () => !shapeArg,
  },
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
    message: 'Which application framework or frontend?',
    choices: (a) => frontendChoicesForShape(shapeArg || a.applicationShape, catalog),
    when: () => !frontendArg,
  },
  {
    type: 'list',
    name: 'backend',
    message: 'Which backend or data service?',
    choices: (a) => backendChoicesForShape(shapeArg || a.applicationShape, a.frontend, catalog),
    when: () => !backendArg,
  },

  // ── Styling: only shown when frontend has >1 option (catalog-driven) ───
  {
    type: 'list',
    name: 'styling',
    message: 'Styling approach?',
    choices: (a) => stylingChoicesFor(catalog, a.frontend),
    when: (a) => stylingChoicesFor(catalog, a.frontend).length > 1,
  },

  // ── One architecture profile, interpreted natively by every stack ──────
  {
    type: 'list',
    name: 'architecture',
    message: 'Architecture? (Medium is recommended for most long-term applications)',
    choices: (a) => {
      const supported = architectureChoicesFor(catalog, a.frontend, a.backend)
      return [
        { name: 'Medium (Recommended) — clear feature, service, and data boundaries', value: 'medium' },
        { name: 'Small — fewer layers for prototypes and simple applications', value: 'small' },
        { name: 'Large — enforced boundaries for complex domains and larger teams', value: 'large' },
      ].filter((choice) => supported.includes(choice.value))
    },
    default: 'medium',
    when: () => !architectureArg,
  },

  // ── Authentication intent, expressed without protocol jargon ───────────
  {
    type: 'list',
    name: 'authentication',
    message: 'Does your application need user login?',
    choices: (a) => {
      const choices = []
      if (a.backend === 'supabase' || a.backend === 'springboot') {
        choices.push({ name: 'Yes — generate authentication appropriate for this stack', value: 'yes' })
      }
      choices.push(
        { name: 'Not yet (Recommended) — add guidance without pretending login exists', value: 'not-yet' },
        { name: 'No — this application is intentionally public and has no user accounts', value: 'none' },
      )
      return choices
    },
    default: 'not-yet',
    when: () => !authenticationArg,
  },
  {
    type: 'list',
    name: 'authAudience',
    message: 'Where will users access the application?',
    choices: [
      { name: 'Website only — use a secure server-managed browser session', value: 'website' },
      { name: 'Website and mobile — use a trusted identity provider for every client', value: 'multi-client' },
    ],
    default: 'website',
    when: (a) => a.backend === 'springboot' && (authenticationArg || a.authentication) === 'yes' && !authAudienceArg,
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
  {
    type: 'confirm',
    name: 'installDependencies',
    message: 'Install project dependencies and create the lockfile now?',
    default: true,
    when: () => !wantsInstall && !skipsInstall,
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
]
let answers = {
  applicationShape: shapeArg,
  frontend: frontendArg,
  backend: backendArg,
}
let stack
while (true) {
answers = await promptWithBack(inquirer, questions, answers)
answers.compatibilityProfile = profile.id
answers.applicationShape = shapeArg || answers.applicationShape
answers.architecture = architectureArg || answers.architecture || 'medium'
answers.authentication = authenticationArg || answers.authentication || 'not-yet'
answers.authAudience = authAudienceArg || answers.authAudience || (catalog.byId[answers.frontend]?.platform === 'mobile' ? 'multi-client' : 'website')
if (wantsInstall) answers.installDependencies = true
if (skipsInstall) answers.installDependencies = false

// ── Auto-resolve docker for stacks that need it ───────────────────────────────
if (resolveStack({ ...answers, styling: answers.styling || catalog.byId[answers.frontend]?.stylingOptions?.[0] || 'tailwind' }, catalog).needsDocker) {
  answers.docker = answers.docker ?? true
}

stack = resolveStack({ ...answers, styling: answers.styling || catalog.byId[answers.frontend]?.stylingOptions?.[0] || 'tailwind' }, catalog)

// ─── Confirm ─────────────────────────────────────────────────────────────────

console.log('')
console.log(chalk.bold('  Summary'))
console.log(chalk.gray('  ───────────────────────────'))
console.log(`  ${chalk.cyan('Name:')}         ${answers.projectName}`)
console.log(`  ${chalk.cyan('Stack:')}        ${stack.label}`)
console.log(`  ${chalk.cyan('Shape:')}        ${APPLICATION_SHAPES[stack.applicationShape].label}`)
console.log(`  ${chalk.cyan('Platform:')}     ${stack.platform}`)
if (stack.styleId) {
  console.log(`  ${chalk.cyan('Styling:')}      ${catalog.byId[stack.styleId]?.label || stack.styleId}`)
}
console.log(`  ${chalk.cyan('Architecture:')} ${stack.architecture[0].toUpperCase()}${stack.architecture.slice(1)}`)
console.log(`  ${chalk.cyan('Authentication:')} ${stack.authentication}`)
console.log(`  ${chalk.cyan('Testing:')}      ${answers.testing}`)
if (stack.platform !== 'mobile') {
  console.log(`  ${chalk.cyan('Docker:')}       ${answers.docker ? 'yes' : 'no'}`)
  console.log(`  ${chalk.cyan('Makefile:')}     ${answers.makefile ? 'yes' : 'no'}`)
}
console.log(`  ${chalk.cyan('CI/CD:')}        ${answers.githubActions ? 'yes' : 'no'}`)
console.log(`  ${chalk.cyan('Install deps:')} ${answers.installDependencies ? 'yes' : 'no'}`)
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

const { decision } = await inquirer.prompt([{
  type: 'list', name: 'decision', message: 'Ready?', choices: configurationDecisionChoices(),
}])

if (decision === 'back') {
  continue
}
if (decision === 'cancel') {
  console.log(chalk.yellow('\n  Cancelled.\n'))
  process.exit(0)
}
break
}

// ─── Generate ────────────────────────────────────────────────────────────────

console.log('')
const spinner = ora('Scaffolding project...').start()

try {
  await generateProject(answers, __dirname)
  spinner.succeed(chalk.green('Project created!'))
  if (answers.installDependencies) {
    const installRoot = stack.frontendKey === 'react'
      ? path.join(process.cwd(), answers.projectName, 'frontend')
      : path.join(process.cwd(), answers.projectName)
    const installSpinner = ora('Installing exact dependencies and creating package-lock.json...').start()
    const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
    const result = spawnSync(npmCommand, ['install'], { cwd: installRoot, stdio: 'inherit', shell: false })
    if (result.status !== 0) {
      installSpinner.warn(chalk.yellow('Project created, but dependency installation did not finish.'))
      console.log(chalk.yellow(`  Retry with: cd ${path.relative(process.cwd(), installRoot)} && npm install`))
    } else {
      installSpinner.succeed(chalk.green('Dependencies installed and lockfile created.'))
    }
  }
  console.log('')
  console.log(chalk.bold(`  Next steps:`))
  console.log(chalk.gray(`  cd ${answers.projectName}`))

  if (stack.frontendKey === 'react') {
    if (stack.backendKey === 'springboot') {
      console.log(chalk.gray(`  cp .env.example .env  # Docker/backend values`))
    }
    console.log(chalk.gray(`  cd frontend`))
    console.log(chalk.gray(`  cp .env.example .env`))
    if (!answers.installDependencies) console.log(chalk.gray(`  npm install`))
  } else {
    console.log(chalk.gray(`  cp .env.example ${stack.isMobile ? '.env' : '.env.local'}`))
    if (!answers.installDependencies) console.log(chalk.gray(`  npm install`))
  }

  if (stack.isMobile) {
    console.log(chalk.gray(`  npx expo start`))
  } else if (answers.makefile) {
    if (stack.frontendKey === 'react') {
      console.log(chalk.gray(`  cd ..`))
    }
    console.log(chalk.gray(`  make dev`))
  } else if (stack.backendKey === 'supabase') {
    console.log(chalk.gray(`  npm run supabase:start`))
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
