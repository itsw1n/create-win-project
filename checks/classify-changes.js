import { pathToFileURL } from 'node:url'

const DOCUMENTATION = /^(?:README\.md|LICENSE|docs\/|\.github\/ISSUE_TEMPLATE\/|\.github\/PULL_REQUEST_TEMPLATE)/
const FULL_IMPACT = /^(?:library\/tested-versions\.json|lib\/(?:generator|scaffold|catalog|compatibility|template)\.js|src\/engine\/|src\/stacks\/shared\/|templates\/(?:docker|gitignore|makefile)\/|checks\/(?:check-compatibility|check-generated-project|classify-changes)\.js|\.github\/workflows\/(?:compatibility|publish)\.yml)/

const STACK_PATHS = [
  ['nextjs', /^(?:src\/stacks\/frontends\/nextjs\/|library\/stacks\/nextjs\/|templates\/(?:agents|ci)\/nextjs\.)/],
  ['react', /^(?:src\/stacks\/frontends\/react-vite\/|library\/stacks\/react-vite\/|templates\/(?:agents|ci)\/(?:react-vite|vite)\.)/],
  ['react-native', /^(?:src\/stacks\/frontends\/react-native\/|library\/stacks\/expo\/|templates\/(?:agents|ci)\/(?:react-native|expo)\.)/],
  ['springboot', /^(?:src\/stacks\/backends\/springboot\/|library\/(?:stacks\/springboot|features\/(?:flyway|postgresql))\/|templates\/ci\/springboot\.)/],
  ['laravel', /^(?:src\/stacks\/backends\/laravel\/|library\/(?:stacks\/laravel|platforms\/laravel-ui|features\/laravel)\/|templates\/ci\/laravel\.)/],
  ['supabase', /^(?:src\/stacks\/backends\/supabase\/|library\/features\/supabase\/)/],
  ['postgres', /^(?:src\/stacks\/backends\/postgres\/|library\/features\/(?:postgresql|prisma)\/)/],
  ['none', /^src\/stacks\/backends\/none\//],
]

export function classifyChanges(files) {
  const changed = [...new Set(files.map((file) => file.trim()).filter(Boolean))]
  if (!changed.length || changed.every((file) => DOCUMENTATION.test(file))) return { scope: 'none' }
  if (changed.some((file) => FULL_IMPACT.test(file))) return { scope: 'full' }

  const stacks = new Set()
  let hasOrdinaryChange = false
  for (const file of changed) {
    const matches = STACK_PATHS.filter(([, pattern]) => pattern.test(file)).map(([stack]) => stack)
    if (matches.length) matches.forEach((stack) => stacks.add(stack))
    else if (!DOCUMENTATION.test(file)) hasOrdinaryChange = true
  }
  if (!hasOrdinaryChange && stacks.size === 1) return { scope: 'stack', stack: [...stacks][0] }
  return { scope: 'smoke' }
}

async function main() {
  let input = ''
  for await (const chunk of process.stdin) input += chunk
  process.stdout.write(JSON.stringify(classifyChanges(input.split(/\r?\n/))))
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main()
