export { configurationDecisionChoices, lastEnabledIndex, promptWithBack, wrapText } from './navigation.js'
import chalk from 'chalk'
import {
  architectureChoicesFor,
  resolveStack,
  stylingChoicesFor,
} from '../engine/load-library.js'
import {
  APPLICATION_SHAPES,
  applicationShapeChoices,
  backendChoicesForShape,
  frontendChoicesForShape,
} from '../engine/project-shapes.js'
import { laravelUiPromptContribution } from '../stacks/backends/laravel/ui/index.js'

const CONCERN_LABELS = {
  validation: 'Runtime validation', query: 'Server-state caching', state: 'Shared UI state',
  env: 'Environment validation', 'url-state': 'URL state', 'safe-action': 'Type-safe server actions',
  'dark-mode': 'Dark mode', 'http-client': 'HTTP client',
}

function choice(title, value, { hint, recommended } = {}) {
  const suffix = [hint ? `(${hint})` : '', recommended ? chalk.green('Recommended') : '']
    .filter(Boolean).join('  ')
  return { name: suffix ? `${title}  ${suffix}` : title, short: title, value }
}

function footerMarker(text) {
  return { type: 'description-footer', text }
}

export function exampleForShape(shape) {
  const description = APPLICATION_SHAPES[shape]?.description
  const match = description?.match(/Example:\s*(.+?)\.?$/)
  return match ? match[1] : undefined
}

function describeExisting(entries, description, hintFor) {
  return [
    ...entries.map((entry) => choice(
      entry.short || entry.name.split('\n')[0].replace(' (Recommended)', ''),
      entry.value,
      { hint: hintFor?.(entry.value), recommended: entry.name.includes('(Recommended)') },
    )),
    footerMarker(description),
  ]
}

function validationError(problem, recovery) {
  return `${chalk.red(`Error: ${problem}`)} ${chalk.yellow(recovery)}`
}

export function buildQuestions({ args, catalog }) {
  return [
    {
      type: 'list', name: 'mode', message: 'What do you want to create?',
      choices: [
        choice('Architecture scaffold', 'architecture', { hint: 'Medium folders and ARCHITECTURE.md for planning' }),
        choice('Full project', 'full', { hint: 'Runnable application with selected tools' }),
        footerMarker('The scaffold asks for your stack so its folders match the intended technology.'),
      ],
      default: 'full', when: () => !args.mode,
    },
    {
      type: 'list', name: 'applicationShape', message: 'What kind of application are you building?',
      choices: describeExisting(
        applicationShapeChoices(),
        'Choose the runtime layout that matches how this application will be deployed.',
        (shape) => {
          const example = exampleForShape(shape)
          return example ? `e.g. ${example}` : undefined
        },
      ), default: 'fullstack', when: () => !args.shape,
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
      message: 'How much application structure should the runnable project use?',
      choices: (answers) => {
        const supported = architectureChoicesFor(catalog, answers.frontend, answers.backend)
        return [
          ...[
            choice('Medium', 'medium', { recommended: true }),
            choice('Small', 'small'),
            choice('Large', 'large'),
          ].filter((choice) => supported.includes(choice.value)),
          footerMarker('Clear feature boundaries for most long-term applications; fewer layers for prototypes; enforced boundaries for complex domains.'),
        ]
      },
      default: 'medium', when: (answers) => (answers.mode || args.mode) === 'full' && !args.architecture,
    },
    {
      type: 'list', name: 'authentication',
      message: (answers) => ['supabase', 'springboot', 'laravel', 'fastapi'].includes(answers.backend)
        ? 'Will users need to sign in?'
        : `Will users need to sign in? ${chalk.yellow(`(generation unavailable for ${answers.backend === 'none' ? 'a frontend-only project' : 'a PostgreSQL-only backend'})`)}`,
      choices: (answers) => {
        const choices = []
        if (['supabase', 'springboot', 'laravel', 'fastapi'].includes(answers.backend)) {
          choices.push(choice('Yes', 'yes'))
        }
        choices.push(
          choice('Not yet', 'not-yet', { recommended: true }),
          choice('No', 'none'),
          footerMarker('Generate working authentication for this stack, record guidance without pretending login exists, or stay intentionally public.'),
        )
        return choices
      },
      default: 'not-yet', when: () => !args.authentication,
    },
    {
      type: 'list', name: 'authAudience', message: 'Who will access the application?',
      choices: [
        { name: 'Website only — use a secure server-managed browser session', value: 'website' },
        { name: 'Website and mobile — use a trusted identity provider for every client', value: 'multi-client' },
      ],
      default: 'website',
      when: (answers) => ['springboot', 'laravel', 'fastapi'].includes(answers.backend) && answers.frontend !== 'laravel-ui' &&
        (args.authentication || answers.authentication) === 'yes' && !args.authAudience,
    },
    {
      type: 'list', name: 'uploads', message: 'Will users upload files?',
      choices: [{ name: 'None', value: 'none' }, { name: 'Private object storage', value: 'object-storage' }],
      default: 'none', when: () => !args.uploads,
    },
    {
      type: 'list', name: 'backgroundJobs', message: 'Does the project need background jobs?',
      choices: [{ name: 'None', value: 'none' }, { name: 'Durable queue', value: 'queue' }],
      default: 'none', when: (answers) => catalog.byId[answers.frontend]?.platform !== 'mobile' && !args.backgroundJobs,
    },
    {
      type: 'list', name: 'offline', message: 'Should the mobile app work offline?',
      choices: [{ name: 'None', value: 'none' }, { name: 'Local cache', value: 'cache' }, { name: 'Synchronization', value: 'sync' }],
      default: 'none', when: (answers) => catalog.byId[answers.frontend]?.platform === 'mobile' && !args.offline,
    },
    {
      type: 'list', name: 'testing', message: 'What level of testing should be included?',
      choices: [
        choice('No generated tests', 'none', { hint: 'Keep only framework validation commands' }),
        choice('Basic tests', 'basic', { hint: 'Unit or component tests for the starter' }),
        choice('Full tests', 'full', { hint: 'Basic tests plus browser tests where supported', recommended: true }),
      ],
      default: 'full', when: (answers) => (answers.mode || args.mode) === 'full',
    },
    {
      type: 'list', name: 'guidance', message: 'How much agent guidance should be included?',
      choices: [
        choice('No agent guidance', 'none', { hint: 'Keep README and normal project docs only' }),
        choice('Compact guidance', 'compact', { hint: 'Generate concise AGENTS.md and project context' }),
        choice('Full guidance', 'full', { hint: 'Include AGENTS.md, RULES.md, and selected playbooks', recommended: true }),
      ],
      default: 'full', when: (answers) => (answers.mode || args.mode) === 'full' && !args.guidance,
    },
    {
      type: 'confirm', name: 'docker', message: 'Include Docker development and deployment files?', default: false,
      when: (answers) => (answers.mode || args.mode) === 'full' && (Boolean(catalog.byId[answers.backend]?.needsDocker) || catalog.byId[answers.frontend]?.platform !== 'mobile'),
    },
    {
      type: 'confirm', name: 'makefile', message: 'Include Makefile?', default: true,
      when: (answers) => (answers.mode || args.mode) === 'full' && catalog.byId[answers.frontend]?.platform !== 'mobile',
    },
    { type: 'confirm', name: 'buildCi', message: 'Include build and test CI?', default: true, when: (answers) => (answers.mode || args.mode) === 'full' },
    { type: 'confirm', name: 'securityChecks', message: 'Include security checks?', default: true, when: (answers) => (answers.mode || args.mode) === 'full' },
    {
      type: 'confirm', name: 'installDependencies',
      message: 'Install project dependencies and create the lockfile now?', default: true,
      when: (answers) => (answers.mode || args.mode) === 'full' && !args.install && !args.noInstall,
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
      message: 'Which optional capabilities should the project plan for?',
      choices: (answers) => {
        const stack = resolveStack({
          ...answers,
          styling: answers.styling || catalog.byId[answers.frontend]?.stylingOptions?.[0],
        }, catalog)
        const notes = [...new Set(stack.concerns.filter((concern) => !concern.required).map((concern) => concern.id))]
          .map((id) => choice(CONCERN_LABELS[id] || id.replaceAll('-', ' '), id))
        return [...notes, footerMarker('Architecture scaffold records these in ARCHITECTURE.md; full projects also use them for generated capability guidance.')]
      },
    },
  ]
}
