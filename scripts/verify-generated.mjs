import fs from 'fs-extra'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { generateProject } from '../lib/generator.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, value = 'true'] = arg.replace(/^--/, '').split('=')
  return [key, value]
}))

const cases = {
  'nextjs-none': { frontend: 'nextjs', backend: 'none', styling: 'tailwind' },
  'nextjs-supabase': { frontend: 'nextjs', backend: 'supabase', styling: 'tailwind' },
  'nextjs-springboot': { frontend: 'nextjs', backend: 'springboot', styling: 'css-modules', packageName: 'com.example' },
  'nextjs-postgres': { frontend: 'nextjs', backend: 'postgres', styling: 'tailwind' },
  'nextjs-laravel': { frontend: 'nextjs', backend: 'laravel', styling: 'tailwind', applicationShape: 'separate' },
  'react-supabase': { frontend: 'react', backend: 'supabase', styling: 'tailwind' },
  'react-none': { frontend: 'react', backend: 'none', styling: 'css-modules' },
  'react-springboot': { frontend: 'react', backend: 'springboot', styling: 'css-modules', packageName: 'com.example' },
  'react-laravel': { frontend: 'react', backend: 'laravel', styling: 'tailwind', applicationShape: 'separate' },
  'react-native-supabase': { frontend: 'react-native', backend: 'supabase' },
  'react-native-springboot': { frontend: 'react-native', backend: 'springboot', packageName: 'com.example' },
  'react-native-none': { frontend: 'react-native', backend: 'none' },
  'react-native-laravel': { frontend: 'react-native', backend: 'laravel', applicationShape: 'mobile' },
  'laravel-api': { frontend: 'no-frontend', backend: 'laravel', applicationShape: 'api' },
  'laravel-blade': { frontend: 'laravel-ui', backend: 'laravel', applicationShape: 'fullstack', laravelUi: 'blade', styling: 'tailwind' },
  'laravel-livewire': { frontend: 'laravel-ui', backend: 'laravel', applicationShape: 'fullstack', laravelUi: 'livewire', styling: 'tailwind' },
  'laravel-inertia-react': { frontend: 'laravel-ui', backend: 'laravel', applicationShape: 'fullstack', laravelUi: 'inertia-react', styling: 'tailwind' },
}

if (!args.profile || !cases[args.case]) {
  throw new Error(`Usage: node scripts/verify-generated.mjs --profile=<id> --case=<${Object.keys(cases).join('|')}> [--architecture=small|medium|large] [--authentication=yes|not-yet|none] [--auth-audience=website|multi-client]`)
}

const architecture = args.architecture || 'medium'
const authentication = args.authentication || 'not-yet'
const authAudience = args['auth-audience'] || (cases[args.case].frontend === 'react-native' ? 'multi-client' : 'website')
if (!['small', 'medium', 'large'].includes(architecture)) throw new Error(`Invalid architecture: ${architecture}`)
if (!['yes', 'not-yet', 'none'].includes(authentication)) throw new Error(`Invalid authentication: ${authentication}`)
if (!['website', 'multi-client'].includes(authAudience)) throw new Error(`Invalid auth audience: ${authAudience}`)

function run(command, commandArgs, cwd, extraEnv = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd,
    env: { ...process.env, ...extraEnv },
    encoding: 'utf8',
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} ${commandArgs.join(' ')} failed with status ${result.status}`)
}

const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'create-win-compat-'))
const selected = cases[args.case]
const projectName = `${args.case.replaceAll('react-native', 'expo')}-${architecture}-${authentication.replaceAll('-', '')}-${authAudience}`

try {
  process.chdir(fixtureRoot)
  await generateProject({
    projectName,
    projectDescription: `Compatibility verification for ${args.case}`,
    compatibilityProfile: args.profile,
    architecture,
    authentication,
    authAudience,
    testing: selected.frontend === 'react-native' ? 'basic' : 'full',
    docker: selected.frontend !== 'react-native',
    makefile: false,
    githubActions: true,
    expectedConcerns: [],
    ...selected,
  }, root)

  const projectRoot = path.join(fixtureRoot, projectName)
  const metadata = await fs.readJson(path.join(projectRoot, 'create-win-project.profile.json'))
  if (metadata.compatibilityProfile.id !== args.profile || metadata.architectureProfile !== architecture ||
      metadata.authentication.intent !== authentication || metadata.authentication.audience !== authAudience) {
    throw new Error('Generated profile metadata does not match the requested matrix entry')
  }
  const packageRoot = selected.frontend === 'react' ? path.join(projectRoot, 'frontend') : projectRoot
  const publicEnv = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
    VITE_SUPABASE_URL: 'https://example.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
    EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
    NEXT_PUBLIC_API_URL: 'http://localhost:8080',
    VITE_API_URL: 'http://localhost:8080',
    EXPO_PUBLIC_API_URL: 'http://localhost:8080',
    POSTGRES_USER: 'postgres',
    POSTGRES_PASSWORD: 'compatibility-test',
    POSTGRES_DB: projectName.replaceAll('-', '_'),
    DATABASE_URL: `postgresql://postgres:compatibility-test@localhost:5432/${projectName.replaceAll('-', '_')}`,
    SPRING_PROFILES_ACTIVE: 'test',
    OIDC_ISSUER_URI: 'http://localhost:9090/realms/app',
    OIDC_AUDIENCE: 'api',
    AUTH0_DOMAIN: 'example.auth0.com',
    AUTH0_AUDIENCE: 'https://api.example.test',
    SPRING_SECURITY_USER_NAME: 'compat-user',
    SPRING_SECURITY_USER_PASSWORD: 'compat-password',
  }

  if (await fs.pathExists(path.join(packageRoot, 'package.json'))) {
    run('npm', ['install'], packageRoot)
    const packageJson = await fs.readJson(path.join(packageRoot, 'package.json'))
    if (packageJson.scripts.lint) run('npm', ['run', 'lint'], packageRoot, publicEnv)
    if (packageJson.scripts.typecheck) run('npm', ['run', 'typecheck'], packageRoot, publicEnv)
    if (packageJson.scripts.test) run('npm', ['test', '--', ...(selected.frontend === 'react-native' ? ['--runInBand'] : [])], packageRoot, publicEnv)

    if (selected.frontend === 'react-native') {
      run('npx', ['expo', 'install', '--check'], packageRoot, { ...publicEnv, CI: '1' })
      run('npm', ['run', 'build', '--', '--platform', 'web'], packageRoot, publicEnv)
    } else {
      run('npm', ['run', 'build'], packageRoot, publicEnv)
      if (packageJson.scripts['test:e2e']) {
        run('npx', ['playwright', 'install', ...(process.env.CI ? ['--with-deps'] : []), 'chromium'], packageRoot)
        run('npm', ['run', 'test:e2e'], packageRoot, publicEnv)
      }
    }
  }

  if (selected.backend === 'springboot') {
    const backendRoot = path.join(projectRoot, 'backend')
    run('./mvnw', ['--batch-mode', 'test'], backendRoot)
    run('./mvnw', ['--batch-mode', 'package', '-DskipTests'], backendRoot)
  }

  if (selected.backend === 'laravel') {
    const backendRoot = ['laravel-ui', 'no-frontend'].includes(selected.frontend) ? projectRoot : path.join(projectRoot, 'backend')
    run('composer', ['install', '--no-interaction', '--prefer-dist'], backendRoot)
    run('docker', ['compose', 'up', '-d', '--wait', 'db'], projectRoot, publicEnv)
    try {
      run('composer', ['check'], backendRoot, { ...publicEnv, DB_HOST: '127.0.0.1', DB_PORT: '5432', APP_KEY: 'base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' })
    } finally {
      run('docker', ['compose', 'down', '--volumes'], projectRoot, publicEnv)
    }
  }

  if (selected.frontend !== 'react-native') {
    run('docker', ['compose', 'config'], projectRoot, publicEnv)
    if (args.containers === 'true') {
      run('docker', ['compose', 'build'], projectRoot, publicEnv)
      if (selected.backend === 'postgres') run('docker', ['build', '-t', `${projectName}:compat`, '.'], projectRoot, publicEnv)
    }
  }
} finally {
  process.chdir(root)
  await fs.remove(fixtureRoot)
}
