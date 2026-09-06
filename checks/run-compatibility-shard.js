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
    `--native=${testCase.native !== false}`,
  ]
  if (testCase.native !== false && testCase.containers && process.env.VERIFY_CONTAINERS === 'true') args.push('--containers=true')
  console.log(`::group::${testCase.profile} ${testCase.case} ${testCase.architecture} ${testCase.authentication}`)
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' })
  console.log('::endgroup::')
  if (result.status !== 0) process.exit(result.status ?? 1)
}
