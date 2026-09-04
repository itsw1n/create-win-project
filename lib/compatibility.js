import fs from 'fs-extra'

const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export async function loadCompatibility(file, requestedProfile) {
  const catalog = await fs.readJson(file)
  validateCompatibility(catalog)
  const profileId = requestedProfile || catalog.defaultProfile
  const profile = catalog.profiles[profileId]
  if (!profile) throw new Error(`Unknown compatibility profile: ${profileId}`)
  return { catalog, profile: { id: profileId, ...profile } }
}

export function validateCompatibility(catalog) {
  if (catalog?.schemaVersion !== 1) throw new Error('Unsupported compatibility catalog schema')
  if (!catalog.profiles || typeof catalog.profiles !== 'object') throw new Error('Compatibility profiles are required')
  if (!catalog.profiles[catalog.defaultProfile]) throw new Error('Default compatibility profile does not exist')

  const statuses = new Map()
  let packageNames
  for (const [id, profile] of Object.entries(catalog.profiles)) {
    if (!/^\d{4}\.\d{2}$/.test(id)) throw new Error(`Invalid compatibility profile id: ${id}`)
    if (!['current', 'previous'].includes(profile.status)) throw new Error(`Invalid status for profile ${id}`)
    if (!ISO_DATE.test(profile.supportedUntil || '') || Number.isNaN(Date.parse(`${profile.supportedUntil}T00:00:00Z`))) {
      throw new Error(`Profile ${id} needs a valid supportedUntil date`)
    }
    if (statuses.has(profile.status)) throw new Error(`Duplicate ${profile.status} compatibility profile`)
    statuses.set(profile.status, id)
    if (!EXACT_VERSION.test(profile.springBoot || '')) throw new Error(`Profile ${id} needs an exact Spring Boot version`)
    if (!EXACT_VERSION.test(profile.springModulith || '')) throw new Error(`Profile ${id} needs an exact Spring Modulith version`)
    for (const key of ['node', 'java', 'maven', 'postgres']) {
      if (!profile.runtimes?.[key]) throw new Error(`Profile ${id} is missing runtime ${key}`)
    }
    for (const key of ['node', 'maven', 'java', 'postgres', 'nginx']) {
      const image = profile.images?.[key]
      if (!image?.repository || !image?.tag || image.tag === 'latest') {
        throw new Error(`Profile ${id} has an invalid ${key} image`)
      }
    }
    if (profile.images.node.repository !== 'node' || !profile.images.node.tag.startsWith(`${profile.runtimes.node}-`)) {
      throw new Error(`Profile ${id} Node image must match runtime ${profile.runtimes.node}`)
    }
    if (profile.images.maven.repository !== 'maven' || !profile.images.maven.tag.startsWith(`${profile.runtimes.maven}-`)) {
      throw new Error(`Profile ${id} Maven image must match runtime ${profile.runtimes.maven}`)
    }
    if (profile.images.java.repository !== 'eclipse-temurin' || !profile.images.java.tag.startsWith(`${profile.runtimes.java}-`)) {
      throw new Error(`Profile ${id} Java image must match runtime ${profile.runtimes.java}`)
    }
    if (profile.images.postgres.repository !== 'postgres' || !profile.images.postgres.tag.startsWith(`${profile.runtimes.postgres}-`)) {
      throw new Error(`Profile ${id} PostgreSQL image must match runtime ${profile.runtimes.postgres}`)
    }
    const names = Object.keys(profile.packages || {}).sort()
    if (!names.length) throw new Error(`Profile ${id} has no package versions`)
    for (const [name, value] of Object.entries(profile.packages)) {
      const versions = typeof value === 'string'
        ? [value]
        : [value?.default, ...Object.values(value?.overrides || {})]
      if (!versions.length || versions.some((version) => !EXACT_VERSION.test(version || ''))) {
        throw new Error(`Profile ${id} package ${name} must use exact versions`)
      }
    }
    if (packageNames && JSON.stringify(names) !== JSON.stringify(packageNames)) {
      throw new Error(`Profile ${id} does not own the same package set as the current profile`)
    }
    packageNames = names
  }
  if (!statuses.has('current') || !statuses.has('previous')) {
    throw new Error('Exactly one current and one previous compatibility profile are required')
  }
  if (statuses.get('current') !== catalog.defaultProfile) {
    throw new Error('The default compatibility profile must have current status')
  }
  const previousId = statuses.get('previous')
  if (catalog.profiles[previousId].supersededBy !== catalog.defaultProfile) {
    throw new Error(`Previous profile ${previousId} must point to current profile ${catalog.defaultProfile}`)
  }
}

export function resolvePackages(names, profile, owner) {
  if (!Array.isArray(names)) throw new Error(`${owner} packages must be an array of package names`)
  return Object.fromEntries(names.map((name) => {
    const manifestId = owner.split('.')[0]
    return [name, packageVersion(profile, name, manifestId, owner)]
  }))
}

export function packageVersion(profile, name, capability, owner = capability) {
  const value = profile.packages[name]
  if (!value) throw new Error(`${owner} requires ${name}, missing from compatibility profile ${profile.id}`)
  const version = typeof value === 'string' ? value : (value.overrides?.[capability] || value.default)
  if (!version) throw new Error(`${owner} has no compatible version for ${name} in profile ${profile.id}`)
  return version
}
