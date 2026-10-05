import { stackRegistry } from './available-stacks.js'
import { collectContributions } from './shared/contributions.js'

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function capabilityAnchors(stack, answers) {
  const paths = []
  if (answers.authentication === 'yes') {
    if (stack.frontendKey === 'nextjs') paths.push('src/features/auth')
    if (stack.frontendKey === 'react') paths.push('frontend/src/features/auth')
    if (stack.frontendKey === 'react-native') paths.push('features/auth')
    if (stack.backendKey === 'laravel') paths.push(`${stack.frontendKey === 'no-frontend' || stack.frontendKey === 'laravel-ui' ? '' : 'backend/'}app/Http/Controllers/Auth`)
  }
  if (answers.backgroundJobs === 'queue' && stack.backendKey === 'laravel') {
    paths.push(`${stack.frontendKey === 'no-frontend' || stack.frontendKey === 'laravel-ui' ? '' : 'backend/'}app/Jobs`)
  }
  if (answers.offline && answers.offline !== 'none') paths.push('lib/offline')
  return paths
}

function rulesFor() {
  const rules = {
    'src/app': ['Own routes, layouts, metadata, loading/error UI, and route handlers.', 'Keep route files thin; call feature operations instead of putting business logic here.'],
    'src/components/common': ['Own reusable domain-free controls.', 'Do not put feature services, authentication, or database rules here.'],
    'src/components/layout': ['Own structural page composition and spacing.', 'Do not implement feature workflows or import feature internals.'],
    'src/features': ['Own product behavior by feature.', 'Add queries, actions, services, repositories, api, schemas, and types only when a real responsibility exists.'],
    'src/lib': ['Own shared technical adapters such as clients, logging, and configuration.', 'Do not use lib as a dumping ground for feature business logic.'],
    'frontend/src/features': ['Own browser product behavior by feature.', 'Keep API, data, schemas, and services separate from visual components when those responsibilities exist.'],
    'app': ['Own Expo Router screens and navigation layouts.', 'Do not move this project into src or put backend authorization in mobile code.'],
    'features': ['Own mobile product behavior by feature.', 'Use api for remote calls, data for SDK access, services for workflows, and hooks for lifecycle or interaction.'],
    'backend/app/core': ['Own shared backend configuration, security, database, and logging foundations.', 'Do not place business entities or feature workflows here.'],
    'app/core': ['Own shared backend configuration, security, database, and logging foundations.', 'Do not place business entities or feature workflows here.'],
    'app/features': ['Own backend behavior by feature.', 'Use router for HTTP translation, service for application operations, repository for persistence, and schemas for transport validation.'],
    'app/Http/Controllers': ['Translate HTTP requests into application operations.', 'Do not put persistence workflows or authorization policy decisions directly in controllers.'],
    'app/Http/Requests': ['Validate request boundaries.', 'Do not use request objects as a replacement for application services.'],
    'app/Models': ['Own Laravel persistence models.', 'Do not put multi-step business workflows in models.'],
    'app/Actions': ['Own one meaningful named use case when it improves clarity.', 'Do not create an Action for every trivial helper.'],
    'app/Services': ['Own reusable application capabilities shared by real workflows.', 'Do not create generic services with no clear owner.'],
  }
  return rules
}

function displayRules(paths, stack) {
  const rules = rulesFor()
  const sections = []
  for (const directory of paths) {
    const key = Object.keys(rules).find((candidate) => directory === candidate || directory.endsWith(`/${candidate}`))
    if (key === 'app' && stack.frontendKey !== 'react-native') continue
    if (key === 'features' && stack.frontendKey !== 'react-native') continue
    if (!key || sections.some((section) => section.key === key)) continue
    sections.push({ key, do: rules[key][0], dont: rules[key][1] })
  }
  sections.push({
    key: 'Feature internals',
    do: 'Create queries, actions, repositories, jobs, policies, and similar folders only when the first real feature needs that responsibility.',
    dont: 'Do not create placeholder implementation files or empty layers only to imitate a reference tree.',
  })
  if (stack.backendKey === 'springboot') sections.push({
    key: 'Spring Boot feature package',
    do: 'Add a named package below the Java root package when a real feature exists; use api, service, repository, and entity subpackages as needed.',
    dont: 'Do not create an empty global features package or force every layer into a new feature.',
  })
  if (stack.backendKey === 'laravel') sections.push({
    key: 'Laravel conventions',
    do: 'Use routes for entry points, Requests for validation, Policies for resource authorization, and Jobs for real background work.',
    dont: 'Do not create a forced app/Features tree or repository wrappers around Eloquent by default.',
  })
  return sections.map(({ key, do: yes, dont }) => `### \`${key}\`\n\n**Do:** ${yes}\n\n**Do not:** ${dont}\n`).join('\n')
}

export function architectureScaffoldPaths(stack, answers) {
  const adapters = [stack.frontendKey, stack.backendKey].map((id) => stackRegistry.get(id)).filter(Boolean)
  const anchors = collectContributions(adapters, 'architecture', { stack, answers })
  if (stack.frontendKey === 'laravel-ui') {
    anchors.push('resources/views', 'resources/css')
    if (stack.laravelUi === 'inertia-react') anchors.push('resources/js/Pages', 'resources/js/components/common', 'resources/js/components/layout', 'resources/js/features', 'resources/js/lib')
  }
  return unique([...anchors, ...capabilityAnchors(stack, answers)])
}

export function emptyScaffoldPaths(paths) {
  return paths.filter((directory) => !paths.some((other) => other.startsWith(`${directory}/`)))
}

export function architectureScaffoldReadme(answers, stack) {
  return `# ${answers.projectName}\n\n> ${answers.projectDescription}\n\nThis is an Architecture Scaffold for ${stack.label}. It uses the Medium planning baseline and contains folders for ownership boundaries, not runnable application code.\n\nRead [ARCHITECTURE.md](./ARCHITECTURE.md) before adding implementation files.\n`
}

export function architectureScaffoldDocument(answers, stack, paths) {
  const tree = paths.map((entry) => `- \`${entry}/\``).join('\n')
  const notes = answers.expectedConcerns?.length ? answers.expectedConcerns.map((item) => `- ${item}`).join('\n') : '- None selected'
  return `# Architecture\n\n## Selected baseline\n\n- Application shape: ${stack.applicationShape}\n- Frontend: ${stack.frontendLabel}\n- Backend/data: ${stack.backendLabel}\n- Architecture baseline: Medium\n- Styling: ${stack.styleId || 'none'}\n- Authentication intent: ${answers.authentication || 'not-yet'}\n- Planned uploads: ${answers.uploads || 'none'}\n- Planned background jobs: ${answers.backgroundJobs || 'none'}\n- Planned offline behavior: ${answers.offline || 'none'}\n\n## Planning anchors\n\n${tree}\n\nThese directories are ownership boundaries. Empty directories contain \`.gitkeep\` so Git preserves the planned structure. Delete \`.gitkeep\` when real files are added.\n\n## Directory rules\n\n${displayRules(paths, stack)}\n\n## Optional planning notes\n\n${notes}\n\n## Folder creation rule\n\nCreate a folder when a real responsibility needs it. Do not create placeholder implementation files. Feature-specific folders such as queries, actions, repositories, jobs, policies, and schemas belong beside the feature that owns them and should be added when their responsibility is real.\n`
}

export function architectureScaffoldMetadata(answers, stack) {
  return `${JSON.stringify({
    schemaVersion: 2,
    mode: 'architecture',
    compatibilityProfile: {
      id: stack.profile.id,
      status: stack.profile.status,
      supportedUntil: stack.profile.supportedUntil,
    },
    architectureProfile: 'medium',
    applicationShape: stack.applicationShape,
    stack: stack.key,
    frontend: stack.frontendKey,
    backend: stack.backendKey,
    styling: stack.styleId || 'none',
    authentication: answers.authentication || 'not-yet',
    capabilities: {
      uploads: answers.uploads || 'none',
      backgroundJobs: answers.backgroundJobs || 'none',
      offline: answers.offline || 'none',
    },
    runtimes: stack.profile.runtimes,
  }, null, 2)}\n`
}
