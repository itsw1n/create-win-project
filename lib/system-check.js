import { spawnSync } from 'node:child_process'

function numericVersion(value) {
  const match = String(value || '').match(/\d+(?:\.\d+){0,2}/)
  return match ? match[0].split('.').map(Number) : null
}

export function versionAtLeast(found, required) {
  const actual = numericVersion(found)
  const minimum = numericVersion(required)
  if (!actual || !minimum) return false
  for (let index = 0; index < 3; index += 1) {
    const difference = (actual[index] || 0) - (minimum[index] || 0)
    if (difference !== 0) return difference > 0
  }
  return true
}

function probe(command, args = ['--version'], run = spawnSync) {
  const result = run(command, args, { encoding: 'utf8', shell: false })
  if (result.error || result.status !== 0) return null
  return `${result.stdout || result.stderr || ''}`.trim().split('\n')[0] || null
}

export function detectSystemVersions({ run = spawnSync, nodeVersion = process.versions.node } = {}) {
  return {
    node: nodeVersion,
    npm: probe(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['--version'], run),
    php: probe('php', ['--version'], run),
    composer: probe(process.platform === 'win32' ? 'composer.bat' : 'composer', ['--version'], run),
  }
}

export function needsNpmInstallation(stack) {
  return stack.frontendKey !== 'no-frontend' &&
    (stack.frontendKey !== 'laravel-ui' || stack.laravelUi === 'inertia-react')
}

export function installationIssues(stack, profile, versions) {
  const issues = []
  if (needsNpmInstallation(stack)) {
    const minimumNode = profile.runtimes.nodeMinimum
    const minimumNpm = profile.runtimes.npmMinimum
    if (!versionAtLeast(versions.node, minimumNode)) {
      issues.push({ tool: 'Node.js', found: versions.node, required: minimumNode })
    }
    if (!versionAtLeast(versions.npm, minimumNpm)) {
      issues.push({ tool: 'npm', found: versions.npm, required: minimumNpm })
    }
  }
  if (stack.backendKey === 'laravel') {
    if (!versionAtLeast(versions.php, profile.runtimes.php)) {
      issues.push({ tool: 'PHP', found: versions.php, required: profile.runtimes.php })
    }
    if (!versionAtLeast(versions.composer, profile.runtimes.composer)) {
      issues.push({ tool: 'Composer', found: versions.composer, required: profile.runtimes.composer })
    }
  }
  return issues
}

export async function decideInstallation({ requested, issues, interactive, choose }) {
  if (!requested) return { install: false, reason: 'not-requested' }
  if (issues.length === 0) return { install: true, reason: 'supported' }
  if (!interactive) return { install: false, reason: 'runtime-mismatch' }

  while (true) {
    const decision = await choose()
    if (decision === 'skip') return { install: false, reason: 'runtime-mismatch' }
    if (decision === 'cancel') return { install: false, reason: 'cancelled' }
    if (decision !== 'instructions') throw new Error(`Unknown runtime decision: ${decision}`)
    return { install: false, reason: 'show-instructions' }
  }
}

export function runtimeSetupInstructions(profile, issues = []) {
  const tools = new Set(issues.map((issue) => issue.tool))
  const instructions = []
  if (tools.has('Node.js') || tools.has('npm')) {
    instructions.push(
      `Mise: mise use node@${profile.runtimes.node}`,
      `NVM:  nvm install ${profile.runtimes.node} && nvm use ${profile.runtimes.node}`,
      'Verify: node --version && npm --version',
    )
  }
  if (tools.has('PHP') || tools.has('Composer')) {
    instructions.push(
      `Install PHP ${profile.runtimes.php} and Composer ${profile.runtimes.composer}, or use the generated Docker workflow.`,
      'Verify: php --version && composer --version',
    )
  }
  return instructions
}
