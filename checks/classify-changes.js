import { pathToFileURL } from 'node:url'
import impact from '../library/compatibility-impact.json' with { type: 'json' }

const DOCUMENTATION = /^(?:README\.md|LICENSE|docs\/|\.github\/ISSUE_TEMPLATE\/|\.github\/PULL_REQUEST_TEMPLATE)/
const STACK_PATHS = Object.entries(impact.stacks)

export function classifyChanges(files) {
  const changed = [...new Set(files.map((file) => file.trim()).filter(Boolean))]
  if (!changed.length || changed.every((file) => DOCUMENTATION.test(file))) return { scope: 'none' }
  if (changed.some((file) => impact.shared.some((prefix) => file.startsWith(prefix)))) return { scope: 'full' }

  const stacks = new Set()
  let hasOrdinaryChange = false
  for (const file of changed) {
    const matches = STACK_PATHS.filter(([, prefixes]) => prefixes.some((prefix) => file.startsWith(prefix))).map(([stack]) => stack)
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
