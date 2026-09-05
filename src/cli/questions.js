export { configurationDecisionChoices, promptWithBack } from './navigation.js'
import chalk from 'chalk'
import {
  architectureChoicesFor,
  resolveStack,
  stylingChoicesFor,
} from '../../lib/catalog.js'
import {
  applicationShapeChoices,
  backendChoicesForShape,
  frontendChoicesForShape,
} from '../../lib/application-shapes.js'
import { laravelUiPromptContribution } from '../../lib/stacks/laravel/ui/index.js'

const CONCERN_LABELS = {
  validation: 'Runtime validation', query: 'Server-state caching', state: 'Shared UI state',
  env: 'Environment validation', 'url-state': 'URL state', 'safe-action': 'Type-safe server actions',
  'dark-mode': 'Dark mode', 'http-client': 'HTTP client',
}

export function wrapText(text, width = Math.max(28, Math.min(72, (process.stdout.columns || 80) - 8))) {
  const lines = []
  for (const word of text.split(/\s+/)) {
    const last = lines.at(-1)
    if (!last || `${last} ${word}`.length > width) lines.push(word)
    else lines[lines.length - 1] = `${last} ${word}`
  }
  return lines.join('\n  ')
}

function choice(title, value, description, recommended = false) {
  const badge = recommended ? `  ${chalk.green('Recommended')}` : ''
  return { name: `${title}${badge}\n  ${chalk.dim(wrapText(description))}\n`, short: title, value }
}

function describeExisting(entries, description) {
  return entries.map((entry) => choice(entry.short || entry.name.split('\n')[0].replace(' (Recommended)', ''), entry.value, description, entry.name.includes('(Recommended)')))
}

function validationError(problem, recovery) {
  return `${chalk.red(`Error: ${problem}`)} ${chalk.yellow(recovery)}`
}

export function buildQuestions({ args, catalog }) {
  return [
    {
      type: 'list', name: 'applicationShape', message: 'Application shape',
      choices: describeExisting(applicationShapeChoices(), 'Choose the runtime layout that matches how this application will be deployed.'), default: 'fullstack', when: () => !args.shape,
    },
    {
      type: 'input', name: 'projectName', message: 'Project name', default: 'my-project',
      validate: (value) => {
        if (!value.trim()) return validationError('Project name is required.', 'Enter a lowercase name such as my-project.')
        if (!/^[a-z0-9-]+$/.test(value)) return validationError('The name contains unsupported characters.', 'Use lowercase letters, numbers, and hyphens only.')
        return true
      },
    },
    { type: 'input', name: 'projectDescription', message: 'One-line description', default: 'A new application' },
    {
      type: 'list', name: 'frontend', message: 'Application framework',
      choices: (answers) => describeExisting(frontendChoicesForShape(args.shape || answers.applicationShape, catalog), 'The primary user-facing application framework.'),
      when: () => !args.frontend,
    },
    {
      type: 'list', name: 'backend', message: 'Backend or data service',
      choices: (answers) => describeExisting(backendChoicesForShape(args.shape || answers.applicationShape, answers.frontend, catalog), 'The server or managed data boundary used by this application.'),
      when: () => !args.backend,
    },
    ...laravelUiPromptContribution(args.laravelUi).questions,
    {
      type: 'list', name: 'styling', message: 'Styling approach',
      choices: (answers) => describeExisting(stylingChoicesFor(catalog, answers.frontend), 'The default styling system for generated UI.'),
      when: (answers) => stylingChoicesFor(catalog, answers.frontend).length > 1,
    },
    {
      type: 'list', name: 'architecture',
      message: 'Architecture depth',
      choices: (answers) => {
        const supported = architectureChoicesFor(catalog, answers.frontend, answers.backend)
        return [
          choice('Medium', 'medium', 'Clear feature, service, and data boundaries for most long-term applications.', true),
          choice('Small', 'small', 'Fewer layers for prototypes and simple applications.'),
          choice('Large', 'large', 'Enforced boundaries for complex domains and larger teams.'),
        ].filter((choice) => supported.includes(choice.value))
      },
      default: 'medium', when: () => !args.architecture,
    },
    {
      type: 'list', name: 'authentication',
      message: (answers) => ['supabase', 'springboot', 'laravel'].includes(answers.backend)
        ? 'User authentication'
        : `User authentication ${chalk.yellow(`(generation unavailable for ${answers.backend === 'none' ? 'a frontend-only project' : 'a PostgreSQL-only backend'})`)}`,
      choices: (answers) => {
        const choices = []
        if (['supabase', 'springboot', 'laravel'].includes(answers.backend)) {
          choices.push(choice('Yes', 'yes', 'Generate working authentication appropriate for this stack.'))
        }
        choices.push(
          choice('Not yet', 'not-yet', 'Record authentication guidance without pretending login exists.', true),
          choice('No', 'none', 'This application is intentionally public and has no user accounts.'),
        )
        return choices
      },
      default: 'not-yet', when: () => !args.authentication,
    },
    {
      type: 'list', name: 'authAudience', message: 'Where will users access the application?',
      choices: [
        { name: 'Website only — use a secure server-managed browser session', value: 'website' },
        { name: 'Website and mobile — use a trusted identity provider for every client', value: 'multi-client' },
      ],
      default: 'website',
      when: (answers) => ['springboot', 'laravel'].includes(answers.backend) && answers.frontend !== 'laravel-ui' &&
        (args.authentication || answers.authentication) === 'yes' && !args.authAudience,
    },
    {
      type: 'list', name: 'testing', message: 'Testing setup?',
      choices: (answers) => catalog.byId[answers.frontend]?.platform === 'mobile'
        ? [
            { name: 'Basic  (Jest + React Native Testing Library)', value: 'basic' },
            { name: 'None', value: 'none' },
          ]
        : [
            { name: 'Full   (Vitest + React Testing Library + Playwright)', value: 'full' },
            { name: 'Basic  (Vitest + React Testing Library)', value: 'basic' },
            { name: 'None', value: 'none' },
          ],
      default: (answers) => catalog.byId[answers.frontend]?.platform === 'mobile' ? 'basic' : 'full',
    },
    {
      type: 'confirm', name: 'docker', message: 'Add optional Docker development files', default: false,
      when: (answers) => Boolean(catalog.byId[answers.backend]?.needsDocker) || catalog.byId[answers.frontend]?.platform !== 'mobile',
    },
    {
      type: 'confirm', name: 'makefile', message: 'Include Makefile?', default: true,
      when: (answers) => catalog.byId[answers.frontend]?.platform !== 'mobile',
    },
    { type: 'confirm', name: 'githubActions', message: 'Include GitHub Actions CI?', default: true },
    {
      type: 'confirm', name: 'installDependencies',
      message: 'Install project dependencies and create the lockfile now?', default: true,
      when: () => !args.install && !args.noInstall,
    },
    {
      type: 'input', name: 'packageName', message: 'Java package name? (e.g. com.yourname)', default: 'com.app',
      when: (answers) => answers.backend === 'springboot',
      validate: (value) => {
        if (!value.trim()) return 'Package name is required'
        if (!/^[a-z]+(\.[a-z]+)+$/.test(value)) return 'Use format: com.yourname'
        return true
      },
    },
    {
      type: 'checkbox', name: 'expectedConcerns',
      message: 'Planning notes for optional features (advisory only; no libraries or feature code are generated)',
      choices: (answers) => {
        const stack = resolveStack({
          ...answers,
          styling: answers.styling || catalog.byId[answers.frontend]?.stylingOptions?.[0],
        }, catalog)
        return [...new Set(stack.concerns.filter((concern) => !concern.required).map((concern) => concern.id))]
          .map((id) => choice(CONCERN_LABELS[id] || id.replaceAll('-', ' '), id, 'Write this concern to CONTEXT.md as a planning note.'))
      },
    },
  ]
}
