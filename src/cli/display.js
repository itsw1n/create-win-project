import chalk from 'chalk'
import ora from 'ora'
import { APPLICATION_SHAPES } from '../../lib/application-shapes.js'
export { w1nBanner } from '../../lib/banner.js'
export { projectLocationNotice } from '../../lib/project-location.js'
import { w1nBanner } from '../../lib/banner.js'

export function printBanner(profile, output = console.log) {
  output('')
  output(w1nBanner())
  output('')
  output(chalk.gray('  Production-ready project scaffolding'))
  output(chalk.gray(`  Compatibility profile: ${profile.id} (${profile.status})`))
  output('')
}

export function printCancelled({ explainNoFiles = false } = {}, output = console.log) {
  output(chalk.yellow(explainNoFiles ? '\n  Cancelled. No files were created.\n' : '\n  Cancelled.\n'))
}

export function startProjectSpinner() {
  return ora('Scaffolding project...').start()
}

export function projectSucceeded(spinner) {
  spinner.succeed(chalk.green('Project created!'))
}

export function startInstallSpinner() {
  return ora('Installing exact dependencies and creating lockfiles...').start()
}

export function installSucceeded(spinner) {
  spinner.succeed(chalk.green('Dependencies installed and lockfiles created.'))
}

export function installFailed(spinner) {
  spinner.warn(chalk.yellow('Project created, but dependency installation did not finish.'))
}

export function generationFailed(spinner, error, report = console.error) {
  spinner.fail(chalk.red('Failed to generate project'))
  report(error)
}

export function printSummary({ answers, stack, catalog }, output = console.log) {
  output('')
  output(chalk.bold('  Summary'))
  output(chalk.gray('  ───────────────────────────'))
  output(`  ${chalk.cyan('Name:')}         ${answers.projectName}`)
  output(`  ${chalk.cyan('Stack:')}        ${stack.label}`)
  output(`  ${chalk.cyan('Shape:')}        ${APPLICATION_SHAPES[stack.applicationShape].label}`)
  output(`  ${chalk.cyan('Platform:')}     ${stack.platform}`)
  if (stack.styleId) output(`  ${chalk.cyan('Styling:')}      ${catalog.byId[stack.styleId]?.label || stack.styleId}`)
  if (answers.laravelUi) output(`  ${chalk.cyan('Laravel UI:')}   ${answers.laravelUi}`)
  output(`  ${chalk.cyan('Architecture:')} ${stack.architecture[0].toUpperCase()}${stack.architecture.slice(1)}`)
  output(`  ${chalk.cyan('Authentication:')} ${stack.authentication}`)
  output(`  ${chalk.cyan('Testing:')}      ${answers.testing}`)
  if (stack.platform !== 'mobile') {
    output(`  ${chalk.cyan('Docker:')}       ${answers.docker ? 'yes' : 'no'}`)
    output(`  ${chalk.cyan('Makefile:')}     ${answers.makefile ? 'yes' : 'no'}`)
  }
  output(`  ${chalk.cyan('CI/CD:')}        ${answers.githubActions ? 'yes' : 'no'}`)
  output(`  ${chalk.cyan('Install deps:')} ${answers.installDependencies ? 'yes' : 'no'}`)
  if (answers.packageName) output(`  ${chalk.cyan('Package:')}      ${answers.packageName}`)
  if (stack.constraints.length) {
    output('')
    output(chalk.gray('  Key constraints:'))
    for (const rule of stack.constraints.slice(0, 3)) output(chalk.gray(`  • ${rule}`))
  }
  output('')
}

export function printRuntimeMismatch(issues, output = console.log) {
  output(chalk.yellow.bold('\n  Runtime mismatch\n'))
  for (const issue of issues) {
    output(chalk.yellow(`  ${issue.tool} ${issue.required} or newer is required.`))
    output(chalk.gray(`  Current terminal: ${issue.tool} ${issue.found || 'not found'}.`))
  }
  output(chalk.gray('\n  Your global tools will not be changed.\n'))
}

export function printRuntimeInstructions(lines, output = console.log) {
  output(chalk.cyan.bold('\n  Runtime setup\n'))
  for (const line of lines) output(chalk.gray(`  ${line}`))
  output(chalk.gray('\n  Run create-win-project again after switching runtimes.\n'))
}

export function printRuntimeSkip(issues, output = console.log) {
  output(chalk.yellow('\n  Dependency installation will be skipped because this terminal does not meet the selected project requirements.'))
  for (const issue of issues) output(chalk.gray(`  ${issue.tool}: ${issue.found || 'not found'} (requires ${issue.required} or newer)`))
  output(chalk.gray('  Project files will still be created. Use Mise/NVM, then run the retry command shown below.\n'))
}

export function printLocationNotice(notice, output = console.log) {
  if (!notice) return
  output('')
  output(chalk.yellow.bold('  Project location note'))
  output(chalk.yellow(`  ${notice.message}`))
  output(chalk.gray(`  Created at: ${notice.generatedPath}`))
  output(chalk.gray(`  Suggested destination: ${notice.suggestedPath}`))
  output(chalk.gray(`  Linux/macOS: mv "${notice.generatedPath}" "${notice.suggestedPath}"`))
  output(chalk.gray('  Windows: cut the generated folder in File Explorer and paste it into your projects folder.'))
}

function detectedLine(versions) {
  return `  Detected Node.js ${versions.node || 'not found'}, npm ${versions.npm || 'not found'}, PHP ${versions.php || 'not found'}, and Composer ${versions.composer || 'not found'}.`
}

export function printInstallFailure(versions, retry, output = console.log) {
  output(chalk.yellow(detectedLine(versions)))
  output(chalk.yellow(`  Retry with: ${retry}`))
}

export function printInstallSkipped(versions, steps, output = console.log) {
  output(chalk.yellow('  Project files were created without installing dependencies.'))
  output(chalk.gray(detectedLine(versions)))
  for (const step of steps) output(chalk.gray(`  Retry with: ${step.retry}`))
}

export function printNextSteps(answers, stack, output = console.log) {
  output('')
  output(chalk.bold('  Next steps:'))
  output(chalk.gray(`  cd ${answers.projectName}`))
  if (stack.backendKey === 'laravel') {
    const laravelDir = ['laravel-ui', 'no-frontend'].includes(stack.frontendKey) ? '' : 'backend/'
    output(chalk.gray(`  cp ${laravelDir}.env.example ${laravelDir}.env`))
    if (answers.makefile) {
      output(chalk.gray('  make setup  # first run only'))
      output(chalk.gray('  make run    # later runs; never rebuilds'))
    } else {
      output(chalk.gray('  docker compose build'))
      output(chalk.gray('  docker compose up -d'))
    }
  } else if (stack.frontendKey === 'react') {
    if (stack.backendKey === 'springboot') output(chalk.gray('  cp .env.example .env  # Docker/backend values'))
    output(chalk.gray('  cd frontend'))
    output(chalk.gray('  cp .env.example .env'))
    if (!answers.installDependencies) output(chalk.gray('  npm install'))
  } else {
    output(chalk.gray(`  cp .env.example ${stack.isMobile ? '.env' : '.env.local'}`))
    if (!answers.installDependencies) output(chalk.gray('  npm install'))
  }
  if (stack.backendKey !== 'laravel') {
    if (stack.isMobile) output(chalk.gray('  npx expo start'))
    else if (answers.makefile) {
      if (stack.frontendKey === 'react') output(chalk.gray('  cd ..'))
      output(chalk.gray('  make dev'))
    } else if (stack.backendKey === 'supabase') {
      output(chalk.gray('  npm run supabase:start'))
      output(chalk.gray('  npm run dev'))
    } else if (stack.frontendKey === 'react') output(chalk.gray('  npm run dev'))
    else {
      output(chalk.gray('  docker compose up -d db'))
      output(chalk.gray('  npm run dev'))
    }
  }
  output('')
  output(chalk.cyan('  Read RULES.md before starting — it maps every playbook for this stack.'))
  output('')
}
