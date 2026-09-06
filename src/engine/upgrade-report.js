import fs from 'fs-extra'
import path from 'node:path'
import { loadCompatibility } from './tested-versions.js'

export async function createUpgradeReport(projectPath, compatibilityFile) {
  const profilePath = path.join(path.resolve(projectPath), 'create-win-project.profile.json')
  const existing = await fs.readJson(profilePath).catch(() => { throw new Error(`No create-win-project profile found at ${profilePath}`) })
  const { profile: current } = await loadCompatibility(compatibilityFile)
  const previousId = existing.compatibilityProfile?.id
  const differences = []
  if (existing.schemaVersion !== 2) differences.push({ area: 'migration', current: existing.schemaVersion, supported: 2 })
  if (previousId !== current.id) differences.push({ area: 'compatibility-profile', current: previousId, supported: current.id })
  for (const [runtime, version] of Object.entries(current.runtimes)) {
    if (existing.runtimes?.[runtime] !== version) differences.push({ area: `runtime.${runtime}`, current: existing.runtimes?.[runtime], supported: version })
  }
  for (const contract of ['tests', 'continuousIntegration', 'securityRules', 'operationsDocumentation']) {
    if (existing.productionBaseline?.[contract] !== true) differences.push({ area: `security-contract.${contract}`, current: existing.productionBaseline?.[contract], supported: true })
  }
  return { readOnly: true, project: path.resolve(projectPath), stack: existing.stack, profile: previousId, supportedProfile: current.id, differences }
}
