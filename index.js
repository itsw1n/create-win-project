#!/usr/bin/env node
import inquirer from 'inquirer'
import chalk from 'chalk'
import ora from 'ora'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import { generateProject } from './lib/generator.js'


const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Banner ──────────────────────────────────────────────────────────────────

console.log('')
console.log(chalk.bold.cyan('  create-win-project'))
console.log(chalk.gray('  Production-ready project scaffolding'))
console.log('')

// ─── Interview ───────────────────────────────────────────────────────────────

const answers = await inquirer.prompt([
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
    default: 'A web application',
  },
  {
    type: 'list',
    name: 'stack',
    message: 'Pick your stack:',
    choices: [
      { name: 'Next.js + Supabase           (fullstack, no separate backend)', value: 'nextjs-supabase' },
      { name: 'Next.js + PostgreSQL (Prisma) (fullstack, no separate backend)', value: 'nextjs-postgresql' },
      { name: 'Next.js + Spring Boot         (Next.js frontend + Java backend)', value: 'nextjs-springboot' },
      { name: 'React + Spring Boot           (SPA frontend + Java backend)', value: 'react-springboot' },
      { name: 'React + Supabase              (SPA, no separate backend)', value: 'react-supabase' },
    ],
  },
  {
    type: 'list',
    name: 'styling',
    message: 'Styling approach?',
    choices: [
      { name: 'Tailwind CSS + shadcn/ui  (recommended)', value: 'tailwind' },
      { name: 'CSS Modules', value: 'css-modules' },
    ],
    default: 'tailwind',
  },
  {
    type: 'list',
    name: 'testing',
    message: 'Testing setup?',
    choices: [
      { name: 'Full    (Vitest + React Testing Library + Playwright)', value: 'full' },
      { name: 'Basic   (Vitest + React Testing Library)', value: 'basic' },
      { name: 'None', value: 'none' },
    ],
    default: 'full',
  },
  {
    type: 'confirm',
    name: 'docker',
    message: 'Include Docker?',
    default: true,
    when: (a) => ['react-springboot', 'nextjs-springboot', 'nextjs-postgresql'].includes(a.stack),
  },
  {
    type: 'confirm',
    name: 'makefile',
    message: 'Include Makefile?',
    default: true,
  },
  {
    type: 'confirm',
    name: 'githubActions',
    message: 'Include GitHub Actions CI?',
    default: true,
  },
  {
    type: 'input',
    name: 'packageName',
    message: 'Java package name? (e.g. com.yourname)',
    default: 'com.app',
    when: (a) => ['react-springboot', 'nextjs-springboot'].includes(a.stack),
    validate: (v) => {
      if (!v.trim()) return 'Package name is required'
      if (!/^[a-z]+(\.[a-z]+)+$/.test(v)) return 'Use format: com.yourname'
      return true
    },
  },
])

// auto-enable docker for Spring Boot combos
if (['react-springboot', 'nextjs-springboot'].includes(answers.stack)) {
  answers.docker = answers.docker ?? true
}

// ─── Confirm ─────────────────────────────────────────────────────────────────

console.log('')
console.log(chalk.bold('  Summary'))
console.log(chalk.gray('  ───────────────────────────'))
console.log(`  ${chalk.cyan('Name:')}        ${answers.projectName}`)
console.log(`  ${chalk.cyan('Stack:')}       ${answers.stack}`)
console.log(`  ${chalk.cyan('Styling:')}     ${answers.styling}`)
console.log(`  ${chalk.cyan('Testing:')}     ${answers.testing}`)
console.log(`  ${chalk.cyan('Docker:')}      ${answers.docker ? 'yes' : 'no'}`)
console.log(`  ${chalk.cyan('Makefile:')}    ${answers.makefile ? 'yes' : 'no'}`)
console.log(`  ${chalk.cyan('CI/CD:')}       ${answers.githubActions ? 'yes' : 'no'}`)
if (answers.packageName) {
  console.log(`  ${chalk.cyan('Package:')}     ${answers.packageName}`)
}
console.log('')

const { confirm } = await inquirer.prompt([
  {
    type: 'confirm',
    name: 'confirm',
    message: 'Generate project?',
    default: true,
  },
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
  console.log(chalk.gray(`  cp .env.example .env`))
  console.log(chalk.gray(`  # Fill in your .env values`))

  if (['react-springboot', 'nextjs-springboot', 'nextjs-postgresql'].includes(answers.stack) && answers.docker) {
    console.log(chalk.gray(`  make dev`))
  } else if (['nextjs-supabase', 'react-supabase'].includes(answers.stack)) {
    console.log(chalk.gray(`  npx supabase start`))
    console.log(chalk.gray(`  npm run dev`))
  } else {
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
