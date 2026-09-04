import inquirer from 'inquirer'
import path from 'path'
import { fileURLToPath } from 'url'
import { generateProject } from '../engine/create-project.js'
import { runDependencySteps } from '../engine/install-dependencies.js'
import { loadCompatibility } from '../../lib/compatibility.js'
import { buildQuestions, configurationDecisionChoices, promptWithBack } from './questions.js'
import {
  printBanner,
  generationFailed,
  installFailed,
  installSucceeded,
  printInstallFailure,
  printInstallSkipped,
  printLocationNotice,
  printNextSteps,
  printCancelled,
  printRuntimeInstructions,
  printRuntimeMismatch,
  printRuntimeSkip,
  printSummary,
  projectSucceeded,
  projectLocationNotice,
  startInstallSpinner,
  startProjectSpinner,
} from './display.js'
import { parseArguments } from './arguments.js'
import {
  loadCatalog, resolveStack,
} from '../../lib/catalog.js'
import {
  decideInstallation,
  detectSystemVersions,
  installationIssues,
  runtimeSetupInstructions,
  printDoctor,
} from './system-check.js'

const cliDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(cliDirectory, '../..')

export async function runCli() {
const args = parseArguments(process.argv.slice(2))
const profileArg = args.profile
const shapeArg = args.shape
const frontendArg = args.frontend
const backendArg = args.backend
const architectureArg = args.architecture
const authenticationArg = args.authentication
const authAudienceArg = args.authAudience
const laravelUiArg = args.laravelUi
const wantsInstall = args.install
const skipsInstall = args.noInstall
const { profile } = await loadCompatibility(
  path.join(projectRoot, 'compatibility/profiles.json'),
  profileArg,
)
if (args.doctor) {
  printDoctor(profile)
  process.exit(0)
}
const catalog = await loadCatalog(path.join(projectRoot, 'playbooks'), profile)

// ─── Banner ──────────────────────────────────────────────────────────────────

printBanner(profile)

// ─── Interview ───────────────────────────────────────────────────────────────

const questions = buildQuestions({ args, catalog })
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
answers.laravelUi = laravelUiArg || answers.laravelUi || (answers.frontend === 'laravel-ui' ? 'blade' : undefined)
if (wantsInstall) answers.installDependencies = true
if (skipsInstall) answers.installDependencies = false

// ── Auto-resolve docker for stacks that need it ───────────────────────────────
if (resolveStack({ ...answers, styling: answers.styling || catalog.byId[answers.frontend]?.stylingOptions?.[0] || 'tailwind' }, catalog).needsDocker) {
  answers.docker = answers.docker ?? true
}

stack = resolveStack({ ...answers, styling: answers.styling || catalog.byId[answers.frontend]?.stylingOptions?.[0] || 'tailwind' }, catalog)

// ─── Confirm ─────────────────────────────────────────────────────────────────

printSummary({ answers, stack, catalog })

const { decision } = await inquirer.prompt([{
  type: 'list', name: 'decision', message: 'Ready?', choices: configurationDecisionChoices(),
}])

if (decision === 'back') {
  continue
}
if (decision === 'cancel') {
  printCancelled()
  process.exit(0)
}
break
}

const detectedVersions = detectSystemVersions()
const runtimeIssues = installationIssues(stack, profile, detectedVersions)
const installationDecision = await decideInstallation({
  requested: answers.installDependencies,
  issues: runtimeIssues,
  interactive: Boolean(process.stdin.isTTY && process.stdout.isTTY),
  choose: async () => {
    printRuntimeMismatch(runtimeIssues)
    const { runtimeDecision } = await inquirer.prompt([{
      type: 'list',
      name: 'runtimeDecision',
      message: 'How should create-win-project continue?',
      choices: [
        { name: 'Create files and skip dependency installation', value: 'skip' },
        { name: 'Show runtime setup instructions', value: 'instructions' },
        { name: 'Cancel', value: 'cancel' },
      ],
    }])
    return runtimeDecision
  },
})

if (installationDecision.reason === 'cancelled') {
  printCancelled({ explainNoFiles: true })
  process.exit(0)
}
if (installationDecision.reason === 'show-instructions') {
  printRuntimeInstructions(runtimeSetupInstructions(profile, runtimeIssues))
  process.exit(0)
}
if (answers.installDependencies && !installationDecision.install) {
  printRuntimeSkip(runtimeIssues)
}
answers.installDependencies = installationDecision.install

// ─── Generate ────────────────────────────────────────────────────────────────

const spinner = startProjectSpinner()

try {
  await generateProject(answers, projectRoot)
  projectSucceeded(spinner)
  const generatedProjectRoot = path.join(process.cwd(), answers.projectName)
  const steps = []
  if (stack.backendKey === 'laravel') {
    const laravelRoot = ['laravel-ui', 'no-frontend'].includes(stack.frontendKey) ? generatedProjectRoot : path.join(generatedProjectRoot, 'backend')
    steps.push({ command: process.platform === 'win32' ? 'composer.bat' : 'composer', args: ['install'], cwd: laravelRoot, retry: `cd ${path.relative(process.cwd(), laravelRoot)} && composer install` })
  }
  const needsNpm = stack.frontendKey !== 'no-frontend' && (stack.frontendKey !== 'laravel-ui' || answers.laravelUi === 'inertia-react')
  if (needsNpm) {
    const npmRoot = stack.frontendKey === 'react' ? path.join(generatedProjectRoot, 'frontend') : generatedProjectRoot
    steps.push({ command: process.platform === 'win32' ? 'npm.cmd' : 'npm', args: ['install'], cwd: npmRoot, retry: `cd ${path.relative(process.cwd(), npmRoot)} && npm install` })
  }
  const locationNotice = projectLocationNotice({ cwd: process.cwd(), cliRoot: projectRoot, projectName: answers.projectName })
  printLocationNotice(locationNotice)
  if (answers.installDependencies) {
    const installSpinner = startInstallSpinner()
    const { failed } = runDependencySteps(steps)
    if (failed) {
      installFailed(installSpinner)
      printInstallFailure(detectedVersions, failed.retry)
    } else {
      installSucceeded(installSpinner)
    }
  } else if (installationDecision.reason === 'runtime-mismatch') {
    printInstallSkipped(detectedVersions, steps)
  }
  printNextSteps(answers, stack)
} catch (err) {
  generationFailed(spinner, err)
  process.exit(1)
}
}
