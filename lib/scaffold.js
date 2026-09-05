import path from 'node:path'
import { packageVersion } from './compatibility.js'
import { buildNextjsFiles } from '../src/stacks/frontends/nextjs/create-files.js'
import { buildReactViteFiles } from '../src/stacks/frontends/react-vite/create-files.js'
import { buildReactNativeFiles } from '../src/stacks/frontends/react-native/create-files.js'
import { buildSpringBootFiles } from '../src/stacks/backends/springboot/generate.js'
import { buildSharedTestFiles, buildSupabaseProjectFiles, buildSupabaseWebFiles } from '../src/stacks/backends/supabase/generate.js'
import { augmentSupabaseNativeFiles } from '../src/stacks/backends/supabase/native.js'
import { addPostgresScripts, buildPostgresFiles } from '../src/stacks/backends/postgres/generate.js'
import { buildEnvironmentFiles as nextjsEnvironment } from '../src/stacks/frontends/nextjs/environment.js'
import { buildEnvironmentFiles as reactEnvironment } from '../src/stacks/frontends/react-vite/environment.js'
import { buildEnvironmentFiles as nativeEnvironment } from '../src/stacks/frontends/react-native/environment.js'
import { renderEnvironment } from '../src/stacks/shared/environment.js'

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

function html(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function envFiles(answers, stack) {
  if (stack.frontendKey === 'no-frontend') {
    return { '.env.example': renderEnvironment(stack.env, answers) }
  }
  if (stack.frontendKey === 'react') return reactEnvironment(answers, stack)
  if (stack.isMobile) return nativeEnvironment(answers, stack)
  if (stack.frontendKey === 'nextjs') return nextjsEnvironment(answers, stack)
  return { '.env.example': renderEnvironment(stack.env, answers) }
}

function projectReadme(answers, stack) {
  if (stack.frontendKey === 'no-frontend') {
    return `# ${answers.projectName}\n\n> ${answers.projectDescription}\n\nGenerated backend-only ${stack.backendLabel} application.\n\n## Start\n\n\`\`\`bash\ncp .env.example .env\ncd backend\n./mvnw spring-boot:run  # use mvnw.cmd on Windows\n\`\`\`\n\n## Validate\n\n\`\`\`bash\ncd backend\n./mvnw --batch-mode test\n./mvnw --batch-mode package -DskipTests\n\`\`\`\n`
  }
  const root = stack.frontendKey === 'react' ? 'frontend/' : ''
  const quality = stack.isMobile
    ? `npm run typecheck\n${answers.testing === 'none' ? '' : 'npm test -- --runInBand\n'}npm run build -- --platform web`
    : `npm run lint\nnpm run typecheck\nnpm run test --if-present\nnpm run build`
  const backend = stack.backendKey === 'springboot'
    ? `\nThe backend lives in \`backend/\`:\n\n\`\`\`bash\ncd backend\nmvn spring-boot:run\n# verify: curl http://localhost:8080/api/health\n\`\`\`\n`
    : ''
  return `# ${answers.projectName}\n\n> ${answers.projectDescription}\n\nGenerated with create-win-project. This repository includes a runnable application, tests, CI guidance, and task-routed agent playbooks.\n\n## Start\n\n\`\`\`bash\n${root ? `cd ${root}\n` : ''}cp .env.example .env.local 2>/dev/null || cp .env.example .env\nnpm install\nnpm run dev\n\`\`\`\n${backend}\n## Validate\n\n\`\`\`bash\n${root ? `cd ${root}\n` : ''}${quality}\n\`\`\`\n\nCommit the generated lockfile before enabling CI; CI intentionally uses \`npm ci\`.\n\n## Agent-assisted work\n\n1. Put product goals and boundaries in \`CONTEXT.md\`.\n2. Read \`AGENTS.md\` for commands and authority boundaries.\n3. Use \`RULES.md\` to open only the relevant playbook section.\n4. Treat tests and application behavior as the source of truth when prose drifts.\n\n## Important files\n\n- \`AGENTS.md\`: small always-on operating contract.\n- \`RULES.md\`: concern-to-playbook router.\n- \`CONTEXT.md\`: project-specific intent and decisions.\n- \`docs/\`: architecture, API, setup, and deployment documentation.\n`
}

function testingPackage(stack, level) {
  const scripts = { ...stack.scripts, start: stack.frontendKey === 'nextjs' ? 'next start' : undefined }
  const devDeps = { ...stack.devDeps }

  if (level === 'none') delete scripts.test
  if (level !== 'none') {
    if (stack.isMobile) {
      Object.assign(devDeps, {
        jest: packageVersion(stack.profile, 'jest', 'react-native'),
        '@types/jest': packageVersion(stack.profile, '@types/jest', 'react-native'),
        'jest-expo': packageVersion(stack.profile, 'jest-expo', 'react-native'),
        '@testing-library/react-native': packageVersion(stack.profile, '@testing-library/react-native', 'react-native'),
      })
    } else {
      Object.assign(devDeps, {
        vitest: packageVersion(stack.profile, 'vitest', stack.frontendKey),
        jsdom: packageVersion(stack.profile, 'jsdom', stack.frontendKey),
        '@testing-library/react': packageVersion(stack.profile, '@testing-library/react', stack.frontendKey),
        '@testing-library/jest-dom': packageVersion(stack.profile, '@testing-library/jest-dom', stack.frontendKey),
      })
    }
  }
  if (level === 'full' && !stack.isMobile) {
    scripts['test:e2e'] = 'playwright test'
    devDeps['@playwright/test'] = packageVersion(stack.profile, '@playwright/test', stack.frontendKey)
  }

  scripts.typecheck = 'tsc --noEmit'
  scripts.format = 'prettier --write .'
  scripts['format:check'] = 'prettier --check .'
  if (!stack.isMobile) scripts.lint = 'eslint .'
  if (stack.architecture === 'large') scripts['check:boundaries'] = 'node scripts/check-boundaries.mjs'
  if (stack.backendKey === 'supabase') {
    const workdir = stack.frontendKey === 'react' ? ' --workdir ..' : ''
    scripts['supabase:start'] = `supabase${workdir} start`
    scripts['supabase:stop'] = `supabase${workdir} stop`
    scripts['supabase:status'] = `supabase${workdir} status`
    scripts['supabase:reset'] = `supabase${workdir} db reset`
    scripts['supabase:test'] = `supabase${workdir} test db`
    const typePath = stack.frontendKey === 'react' ? 'src/types/database.types.ts' : stack.isMobile ? 'types/database.types.ts' : 'src/types/database.types.ts'
    scripts['supabase:types'] = `supabase${workdir} gen types typescript --local > ${typePath}`
  }
  const boundaryCheck = stack.architecture === 'large' ? ' && npm run check:boundaries' : ''
  scripts.check = stack.isMobile
    ? `npm run format:check && npm run typecheck${level === 'none' ? '' : ' && npm test -- --runInBand'}${boundaryCheck}`
    : `npm run format:check && npm run lint && npm run typecheck${level === 'none' ? '' : ' && npm test'}${boundaryCheck}`
  Object.keys(scripts).forEach((key) => scripts[key] === undefined && delete scripts[key])
  return { scripts, devDeps }
}

function packageFile(answers, stack) {
  const { scripts, devDeps } = testingPackage(stack, answers.testing || 'basic')
  if (stack.backendKey === 'postgres') {
    addPostgresScripts(scripts)
  }
  if (stack.styleId === 'tailwind') {
    devDeps.tailwindcss = packageVersion(stack.profile, 'tailwindcss', stack.frontendKey)
    if (stack.frontendKey === 'nextjs') devDeps['@tailwindcss/postcss'] = packageVersion(stack.profile, '@tailwindcss/postcss', 'nextjs')
    if (stack.frontendKey === 'react') devDeps['@tailwindcss/vite'] = packageVersion(stack.profile, '@tailwindcss/vite', 'react')
  }
  const dependencies = { ...stack.deps }
  if (stack.frontendKey !== 'nextjs') delete dependencies['@supabase/ssr']
  if (stack.isMobile && stack.authentication === 'supabase') {
    dependencies['expo-secure-store'] = packageVersion(stack.profile, 'expo-secure-store', 'react-native')
  }
  const packageJson = {
    name: answers.projectName,
    version: '0.1.0',
    private: true,
    type: 'module',
    packageManager: `npm@${stack.profile.runtimes.npmMinimum}`,
    engines: {
      node: `>=${stack.profile.runtimes.nodeMinimum}`,
      npm: `>=${stack.profile.runtimes.npmMinimum}`,
    },
    main: stack.isMobile ? 'expo-router/entry' : undefined,
    scripts,
    dependencies,
    devDependencies: devDeps,
  }
  if (!packageJson.main) delete packageJson.main
  return json(packageJson)
}

function boundaryScript(sourceRoot) {
  return `/* eslint-disable no-undef -- node script runs outside linted frontend bundle */
import fs from 'node:fs'\nimport path from 'node:path'\n\nconst root = path.resolve(${JSON.stringify(sourceRoot)}, 'features')\nconst violations = []\nif (fs.existsSync(root)) {\n  for (const feature of fs.readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name)) {\n    const featureRoot = path.join(root, feature)\n    const visit = (directory) => {\n      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {\n        const file = path.join(directory, entry.name)\n        if (entry.isDirectory()) visit(file)\n        else if (/\\.[cm]?[jt]sx?$/.test(entry.name)) {\n          const content = fs.readFileSync(file, 'utf8')\n          for (const match of content.matchAll(/from\\s+['\"]@\\/features\\/([^/'\"]+)(\\/[^'\"]+)?['\"]/g)) {\n            if (match[1] !== feature && match[2]) violations.push(\`${'${file}'} deep-imports feature ${'${match[1]}'}; import its public API instead\`)\n          }\n        }\n      }\n    }\n    visit(featureRoot)\n  }\n}\nif (violations.length) { console.error(violations.join('\\n')); process.exit(1) }\nconsole.log('Feature boundaries are valid.')\n`
}

function statusFeatureFiles(root, stack) {
  if (stack.architecture === 'small') return {}
  const prefix = root ? `${root}/` : ''
  const files = {
    [`${prefix}src/features/status/types.ts`]: "export interface StarterStatus { heading: string; profile: 'medium' | 'large' }\n",
    [`${prefix}src/features/status/services/getStarterStatus.ts`]: `import type { StarterStatus } from '../types'\n\nexport function getStarterStatus(): StarterStatus {\n  return { heading: 'Your starter is running', profile: '${stack.architecture}' }\n}\n`,
    [`${prefix}src/features/status/components/StarterStatus.tsx`]: "import type { StarterStatus as Status } from '../types'\n\nexport function StarterStatus({ status }: { status: Status }) {\n  return <><h1>{status.heading}</h1><p>Architecture: {status.profile}</p></>\n}\n",
  }
  if (stack.backendKey === 'springboot') {
    const baseUrl = stack.frontendKey === 'nextjs' ? 'process.env.NEXT_PUBLIC_API_URL' : 'import.meta.env.VITE_API_URL'
    files[`${prefix}src/features/status/api/getBackendStatus.ts`] = `export interface BackendStatus { status: string }\n\nexport async function getBackendStatus(signal?: AbortSignal): Promise<BackendStatus> {\n  const response = await fetch(\`${'${' + baseUrl + '}'}/api/health\`, { signal })\n  if (!response.ok) throw new Error(\`Backend health request failed (${'${response.status}'})\`)\n  return response.json() as Promise<BackendStatus>\n}\n`
  }
  if (stack.architecture === 'large') {
    files[`${prefix}src/features/status/index.ts`] = "export { StarterStatus } from './components/StarterStatus'\nexport { getStarterStatus } from './services/getStarterStatus'\nexport type { StarterStatus as StarterStatusModel } from './types'\n"
    files[`${prefix}scripts/check-boundaries.mjs`] = boundaryScript(prefix ? 'src' : 'src')
  }
  return files
}

function nativeStatusFeatureFiles(stack) {
  if (stack.architecture === 'small') return {}
  const files = {
    'features/status/types.ts': "export interface StarterStatus { heading: string; profile: 'medium' | 'large' }\n",
    'features/status/services/getStarterStatus.ts': `import type { StarterStatus } from '../types'\n\nexport function getStarterStatus(): StarterStatus {\n  return { heading: 'Your starter is running', profile: '${stack.architecture}' }\n}\n`,
    'features/status/components/StarterStatus.tsx': "import { Text } from 'react-native'\nimport type { StarterStatus as Status } from '../types'\n\nexport function StarterStatus({ status }: { status: Status }) {\n  return <><Text accessibilityRole=\"header\">{status.heading}</Text><Text>Architecture: {status.profile}</Text></>\n}\n",
  }
  if (stack.backendKey === 'springboot') {
    files['features/status/api/getBackendStatus.ts'] = "export interface BackendStatus { status: string }\n\nexport async function getBackendStatus(signal?: AbortSignal): Promise<BackendStatus> {\n  const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/health`, { signal })\n  if (!response.ok) throw new Error(`Backend health request failed (${response.status})`)\n  return response.json() as Promise<BackendStatus>\n}\n"
  }
  if (stack.architecture === 'large') {
    files['features/status/index.ts'] = "export { StarterStatus } from './components/StarterStatus'\nexport { getStarterStatus } from './services/getStarterStatus'\nexport type { StarterStatus as StarterStatusModel } from './types'\n"
    files['scripts/check-boundaries.mjs'] = boundaryScript('.')
  }
  return files
}

function supabaseProjectFiles(stack) {
  return buildSupabaseProjectFiles(stack)
}

function supabaseWebFiles(isNext, withAuth = false) {
  return buildSupabaseWebFiles(isNext, withAuth)
}

const testFiles = buildSharedTestFiles

function nextFiles(answers, stack) {
  return buildNextjsFiles(answers, stack, {
    json, packageFile, testFiles, statusFeatureFiles, supabaseWebFiles, prismaFiles,
  })
}

function prismaFiles() {
  return buildPostgresFiles()
}

function viteFiles(answers, stack) {
  const root = 'frontend'
  const files = buildReactViteFiles(answers, stack, { html, json, packageFile, testFiles, statusFeatureFiles })
  if (stack.backendKey === 'supabase') {
    for (const [name, value] of Object.entries(supabaseWebFiles(false, stack.authentication === 'supabase'))) files[`${root}/${name}`] = value
    if (stack.authentication === 'supabase') {
      files[`${root}/src/features/auth/services/auth.ts`] = `import { supabase } from '@/lib/supabase'\n\nexport async function signIn(email: string, password: string) {\n  const { error } = await supabase.auth.signInWithPassword({ email, password })\n  if (error) throw new Error('Unable to sign in with those credentials.')\n}\n\nexport async function signOut() {\n  const { error } = await supabase.auth.signOut()\n  if (error) throw new Error('Unable to sign out.')\n}\n`
      files[`${root}/src/features/auth/components/AuthPanel.tsx`] = `import { useState, type FormEvent } from 'react'\nimport { signIn } from '../services/auth'\n\nexport function AuthPanel() {\n  const [error, setError] = useState('')\n  const [pending, setPending] = useState(false)\n  async function submit(event: FormEvent<HTMLFormElement>) {\n    event.preventDefault()\n    setPending(true)\n    setError('')\n    const data = new FormData(event.currentTarget)\n    try { await signIn(String(data.get('email') || ''), String(data.get('password') || '')) }\n    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to sign in.') }\n    finally { setPending(false) }\n  }\n  return <section aria-labelledby="login-heading"><h2 id="login-heading">Sign in</h2>{error ? <p role="alert">{error}</p> : null}<form onSubmit={submit}><label>Email <input name="email" type="email" autoComplete="email" required /></label><label>Password <input name="password" type="password" autoComplete="current-password" required /></label><button disabled={pending} type="submit">{pending ? 'Signing in…' : 'Sign in'}</button></form></section>\n}\n`
      files[`${root}/src/App.tsx`] = `import { AuthPanel } from '@/features/auth/components/AuthPanel'\n${files[`${root}/src/App.tsx`].replace('<p>Read <code>AGENTS.md</code> before your first agent-assisted change.</p>', '<p>Read <code>AGENTS.md</code> before your first agent-assisted change.</p><AuthPanel />')}`
    }
  }
  return files
}

function nativeFiles(answers, stack) {
  const files = buildReactNativeFiles(answers, stack, { json, packageFile, testFiles, nativeStatusFeatureFiles })
  augmentSupabaseNativeFiles(files, answers, stack)
  return files
}

function springFiles(answers, vars, stack) {
  return buildSpringBootFiles(answers, vars, stack)
}

export function buildRunnableFiles(answers, stack, vars) {
  let files
  if (stack.frontendKey === 'no-frontend' || stack.frontendKey === 'laravel-ui') files = {}
  else if (stack.frontendKey === 'nextjs') files = nextFiles(answers, stack)
  else if (stack.frontendKey === 'react') files = viteFiles(answers, stack)
  else files = nativeFiles(answers, stack)
  if (stack.backendKey === 'springboot') Object.assign(files, springFiles(answers, vars, stack))
  Object.assign(files, supabaseProjectFiles(stack))
  Object.assign(files, envFiles(answers, stack))
  files['create-win-project.profile.json'] = json({
    schemaVersion: 3,
    applicationShape: stack.applicationShape,
    compatibilityProfile: {
      id: stack.profile.id,
      status: stack.profile.status,
      supportedUntil: stack.profile.supportedUntil,
    },
    architectureProfile: stack.architecture,
    authentication: {
      intent: stack.authenticationIntent,
      model: stack.authentication,
      audience: stack.authAudience,
    },
    stack: stack.key,
    runtimes: stack.profile.runtimes,
  })
  files['README.md'] = projectReadme(answers, stack)
  if (stack.backendKey === 'springboot') {
    files['README.md'] = files['README.md'].replace('mvn spring-boot:run', './mvnw spring-boot:run  # use mvnw.cmd on Windows')
  }
  return files
}
