import { spawnSync } from 'node:child_process'

export function runDependencySteps(steps, run = spawnSync) {
  for (const step of steps) {
    const result = run(step.command, step.args, {
      cwd: step.cwd,
      stdio: 'inherit',
      shell: false,
    })
    if (result.error || result.status !== 0) return { ok: false, failed: step, result }
  }
  return { ok: true, failed: null }
}
