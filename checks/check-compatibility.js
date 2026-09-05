import fs from 'fs-extra'

const catalog = await fs.readJson(new URL('../library/tested-versions.json', import.meta.url))
const scope = process.argv.find((arg) => arg.startsWith('--scope='))?.split('=')[1] || 'smoke'
const selectedStack = process.argv.find((arg) => arg.startsWith('--stack='))?.split('=')[1]
if (!['none', 'smoke', 'stack', 'full'].includes(scope)) throw new Error('--scope must be none, smoke, stack, or full')
if (scope === 'stack' && !selectedStack) throw new Error('--stack is required for stack scope')

const cases = [
  'nextjs-none', 'nextjs-supabase', 'nextjs-springboot', 'nextjs-postgres', 'nextjs-laravel',
  'react-none', 'react-supabase', 'react-springboot', 'react-laravel',
  'react-native-none', 'react-native-supabase', 'react-native-springboot', 'react-native-laravel',
  'laravel-api', 'laravel-blade', 'laravel-livewire', 'laravel-inertia-react',
]

function authChoices(caseName) {
  const mobile = caseName.startsWith('react-native')
  const nonBrowser = mobile || caseName === 'laravel-api'
  const base = ['not-yet', 'none'].map((authentication) => ({ authentication, audience: nonBrowser ? 'multi-client' : 'website' }))
  if (caseName.includes('supabase')) base.push({ authentication: 'yes', audience: mobile ? 'multi-client' : 'website' })
  if (caseName.includes('springboot') || caseName.includes('laravel')) {
    if (caseName.startsWith('laravel-') && caseName !== 'laravel-api') base.push({ authentication: 'yes', audience: 'website' })
    else if (mobile || caseName === 'laravel-api') base.push({ authentication: 'yes', audience: 'multi-client' })
    else base.push({ authentication: 'yes', audience: 'website' }, { authentication: 'yes', audience: 'multi-client' })
  }
  return base
}

const current = catalog.defaultProfile
const full = Object.entries(catalog.profiles).filter(([profile]) => profile === current).flatMap(([profile, versions]) =>
  cases.flatMap((caseName) => ['small', 'medium', 'large'].flatMap((architecture) =>
    authChoices(caseName).map((auth) => ({ profile, case: caseName, architecture, ...auth, node: versions.runtimes.node, java: versions.runtimes.java, php: versions.runtimes.php })))),
)

const smokeSelections = [
  ['nextjs-none', 'small', 'not-yet', 'website'],
  ['nextjs-supabase', 'medium', 'yes', 'website'],
  ['react-springboot', 'large', 'yes', 'website'],
  ['react-native-supabase', 'medium', 'yes', 'multi-client'],
  ['react-native-springboot', 'small', 'yes', 'multi-client'],
  ['laravel-api', 'medium', 'not-yet', 'multi-client'],
  ['laravel-blade', 'small', 'yes', 'website'],
  ['laravel-livewire', 'medium', 'none', 'website'],
  ['laravel-inertia-react', 'large', 'yes', 'website'],
  ['react-laravel', 'medium', 'yes', 'website'],
]
const smoke = full.filter((entry) => entry.profile === current && smokeSelections.some(([caseName, architecture, authentication, audience]) =>
  entry.case === caseName && entry.architecture === architecture && entry.authentication === authentication && entry.audience === audience))

function belongsToStack(caseName, stackName) {
  if (stackName === 'none') return caseName.endsWith('-none')
  if (stackName === 'react') return caseName.startsWith('react-')
  if (stackName === 'react-native') return caseName.startsWith('react-native-')
  if (['nextjs'].includes(stackName)) return caseName.startsWith(`${stackName}-`)
  return caseName.includes(stackName)
}

const stackCases = full.filter((entry) => belongsToStack(entry.case, selectedStack))
const stack = [...new Map([...stackCases, ...smoke].map((entry) => [JSON.stringify(entry), entry])).values()]
const selected = scope === 'full' ? full : scope === 'stack' ? stack : smoke
process.stdout.write(JSON.stringify(selected.map((entry, index) => ({ ...entry, shard: `${index % 4 + 1}/4` }))))
