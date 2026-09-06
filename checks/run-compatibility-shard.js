import { spawnSync } from 'node:child_process'

const cases = JSON.parse(process.env.COMPATIBILITY_CASES || '[]')
if (!Array.isArray(cases) || !cases.length) throw new Error('COMPATIBILITY_CASES must contain at least one case')

for (const testCase of cases) {
  const args = [
    'checks/check-generated-project.js',
    `--profile=${testCase.profile}`,
    `--case=${testCase.case}`,
    `--architecture=${testCase.architecture}`,
    `--authentication=${testCase.authentication}`,
    `--auth-audience=${testCase.audience}`,
  ]
  if (process.env.VERIFY_CONTAINERS === 'true' && testCase.profile === process.env.CURRENT_PROFILE) args.push('--containers=true')
  console.log(`::group::${testCase.profile} ${testCase.case} ${testCase.architecture} ${testCase.authentication}`)
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' })
  console.log('::endgroup::')
  if (result.status !== 0) process.exit(result.status ?? 1)
}
