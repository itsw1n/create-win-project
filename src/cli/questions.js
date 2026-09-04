export { configurationDecisionChoices, promptWithBack } from './navigation.js'
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

export function buildQuestions({ args, catalog }) {
  return [
    {
      type: 'list', name: 'applicationShape', message: 'What kind of application are you building?',
      choices: applicationShapeChoices(), default: 'fullstack', when: () => !args.shape,
    },
    {
      type: 'input', name: 'projectName', message: 'Project name?', default: 'my-project',
      validate: (value) => {
        if (!value.trim()) return 'Project name is required'
        if (!/^[a-z0-9-]+$/.test(value)) return 'Use lowercase letters, numbers, and hyphens only'
        return true
      },
    },
    { type: 'input', name: 'projectDescription', message: 'One-line description?', default: 'A new application' },
    {
      type: 'list', name: 'frontend', message: 'Which application framework or frontend?',
      choices: (answers) => frontendChoicesForShape(args.shape || answers.applicationShape, catalog),
      when: () => !args.frontend,
    },
    {
      type: 'list', name: 'backend', message: 'Which backend or data service?',
      choices: (answers) => backendChoicesForShape(args.shape || answers.applicationShape, answers.frontend, catalog),
      when: () => !args.backend,
    },
    ...laravelUiPromptContribution(args.laravelUi).questions,
    {
      type: 'list', name: 'styling', message: 'Styling approach?',
      choices: (answers) => stylingChoicesFor(catalog, answers.frontend),
      when: (answers) => stylingChoicesFor(catalog, answers.frontend).length > 1,
    },
    {
      type: 'list', name: 'architecture',
      message: 'Architecture? (Medium is recommended for most long-term applications)',
      choices: (answers) => {
        const supported = architectureChoicesFor(catalog, answers.frontend, answers.backend)
        return [
          { name: 'Medium (Recommended) — clear feature, service, and data boundaries', value: 'medium' },
          { name: 'Small — fewer layers for prototypes and simple applications', value: 'small' },
          { name: 'Large — enforced boundaries for complex domains and larger teams', value: 'large' },
        ].filter((choice) => supported.includes(choice.value))
      },
      default: 'medium', when: () => !args.architecture,
    },
    {
      type: 'list', name: 'authentication', message: 'Does your application need user login?',
      choices: (answers) => {
        const choices = []
        if (['supabase', 'springboot', 'laravel'].includes(answers.backend)) {
          choices.push({ name: 'Yes — generate authentication appropriate for this stack', value: 'yes' })
        }
        choices.push(
          { name: 'Not yet (Recommended) — add guidance without pretending login exists', value: 'not-yet' },
          { name: 'No — this application is intentionally public and has no user accounts', value: 'none' },
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
      type: 'confirm', name: 'docker', message: 'Include Docker?', default: true,
      when: (answers) => catalog.byId[answers.backend]?.needsDocker ?? catalog.byId[answers.frontend]?.needsDocker ?? false,
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
      message: 'Expected optional concerns? (advisory only — all stay available)',
      choices: (answers) => {
        const stack = resolveStack({
          ...answers,
          styling: answers.styling || catalog.byId[answers.frontend]?.stylingOptions?.[0],
        }, catalog)
        return [...new Set(stack.concerns.filter((concern) => !concern.required).map((concern) => concern.id))]
          .map((id) => ({ name: id, value: id }))
      },
    },
  ]
}
