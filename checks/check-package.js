import { execFileSync } from 'node:child_process'

const [{ files = [] } = {}] = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json'], { encoding: 'utf8' }))
const names = new Set(files.map(({ path }) => path))
const required = ['index.js', 'package.json', 'README.md', 'LICENSE', 'src/cli/main.js', 'library/tested-versions.json']
const missing = required.filter((name) => !names.has(name))
const forbidden = [...names].filter((name) => name.startsWith('.github/') || name.startsWith('tests/') || name.includes('.env'))

if (missing.length || forbidden.length) {
  if (missing.length) console.error(`Missing package files: ${missing.join(', ')}`)
  if (forbidden.length) console.error(`Forbidden package files: ${forbidden.join(', ')}`)
  process.exitCode = 1
} else {
  console.log(`Package contents verified (${names.size} files).`)
}
