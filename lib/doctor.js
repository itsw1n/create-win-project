import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

function isOnPath(command) {
  const suffixes = process.platform === 'win32' ? ['', '.cmd', '.exe', '.bat'] : ['']
  return (process.env.PATH || '').split(path.delimiter).some((directory) =>
    suffixes.some((suffix) => existsSync(path.join(directory, `${command}${suffix}`)))
  )
}

function probe(command, args = ['--version']) {
  const result = spawnSync(command, args, { encoding: 'utf8', shell: false })
  const version = `${result.stdout || result.stderr || ''}`.trim().split('\n')[0]
  if (!version) return isOnPath(command) ? 'available (version unavailable)' : null
  if (result.status !== 0) return null
  return version
}

export function collectDiagnostics(profile) {
  const nodeVersion = process.versions.node
  const npmVersion = probe('npm')
  const dockerVersion = probe('docker')
  const composeVersion = dockerVersion ? probe('docker', ['compose', 'version']) : null
  const javaVersion = probe('java', ['-version'])
  return [
    { name: 'Node.js', found: nodeVersion, expected: profile.runtimes.node, required: false },
    { name: 'npm', found: npmVersion, required: false },
    { name: 'Docker', found: dockerVersion, required: false },
    { name: 'Docker Compose', found: composeVersion, required: false },
    { name: 'Java', found: javaVersion, expected: profile.runtimes.java, required: false },
  ]
}

export function printDoctor(profile, output = console.log) {
  output(`create-win-project doctor (profile ${profile.id})`)
  output('Use either the Node/npm lane or the Docker/Compose lane; Java is only needed for host-run Spring projects.')
  for (const item of collectDiagnostics(profile)) {
    const expectation = item.expected ? ` (tested: ${item.expected})` : ''
    output(`${item.found ? '✓' : '○'} ${item.name}: ${item.found || 'not found'}${expectation}`)
  }
  output('')
  output('Node lane:   npm ci && npm start')
  output('Docker lane: docker compose build && docker compose run --rm app')
}
