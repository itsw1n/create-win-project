import fs from 'fs-extra'
import path from 'path'
import { loadCompatibility, resolvePackages } from './compatibility.js'
import { inferApplicationShape, validateApplicationShape } from './application-shapes.js'

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function loadCatalog(playbooksDir, selectedProfile) {
  const manifests = []
  const walk = async (dir) => {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const e of entries) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) { await walk(full); continue }
      if (e.name.endsWith('.manifest.json')) {
        const m = await fs.readJson(full)
        m._file = full
        const defaultPlaybook = path.relative(playbooksDir, full).replace(/\.manifest\.json$/, '.md')
        m._playbooks = m.playbooks || [m.file || defaultPlaybook]
        const firstPlaybook = m._playbooks[0]
        m._playbook = typeof firstPlaybook === 'string' ? firstPlaybook : firstPlaybook?.file
        manifests.push(m)
      }
    }
  }
  await walk(playbooksDir)
  validateManifests(manifests)
  const profile = selectedProfile || (await loadCompatibility(
    path.join(path.dirname(playbooksDir), 'compatibility/profiles.json'),
  )).profile
  return { ...buildIndex(manifests), profile }
}

export function validateManifests(manifests) {
  const ids = new Set()
  const validKinds = new Set(['frontend', 'backend', 'database', 'migration', 'styling', 'devops', 'platform', 'universal'])
  for (const manifest of manifests) {
    if (!manifest.id || typeof manifest.id !== 'string') throw new Error('Every manifest needs a string id')
    if (ids.has(manifest.id)) throw new Error(`Duplicate manifest id: ${manifest.id}`)
    ids.add(manifest.id)
    if (!validKinds.has(manifest.kind)) throw new Error(`Invalid manifest kind for ${manifest.id}: ${manifest.kind}`)
    if (!manifest.label || typeof manifest.label !== 'string') throw new Error(`Manifest ${manifest.id} needs a label`)
    if (['frontend', 'backend'].includes(manifest.kind)) {
      const profiles = manifest.architectureProfiles
      if (!Array.isArray(profiles) || profiles.length !== 3 ||
          !['small', 'medium', 'large'].every((profile) => profiles.includes(profile))) {
        throw new Error(`Manifest ${manifest.id} must support small, medium, and large architecture profiles`)
      }
    }
    if (manifest.playbooks && (!Array.isArray(manifest.playbooks) || manifest.playbooks.some((entry) =>
      typeof entry !== 'string' && !(entry && typeof entry.file === 'string')))) {
      throw new Error(`Manifest ${manifest.id}.playbooks must contain paths or conditional file entries`)
    }
    for (const field of ['deps', 'devDeps']) {
      if (manifest[field] && (!Array.isArray(manifest[field]) || manifest[field].some((name) => typeof name !== 'string'))) {
        throw new Error(`Manifest ${manifest.id}.${field} must be an array of package names`)
      }
    }
    const env = new Set(manifest.env || [])
    for (const name of manifest.clientEnv || []) {
      if (!env.has(name)) throw new Error(`Manifest ${manifest.id} client env ${name} is missing from env`)
    }
    for (const concern of manifest.concerns || []) {
      if (!concern.id || typeof concern.required !== 'boolean') {
        throw new Error(`Manifest ${manifest.id} has an invalid concern`)
      }
      if (!concern.required && !concern.when) {
        throw new Error(`Optional concern ${manifest.id}/${concern.id} needs a when condition`)
      }
    }
  }
}

function buildIndex(manifests) {
  const byId = {}
  const byKind = {}
  for (const m of manifests) {
    byId[m.id] = m
    ;(byKind[m.kind] ||= []).push(m)
  }
  return {
    manifests, byId, byKind,
    universal:  byKind['universal']  || [],
    frontends:  byKind['frontend']   || [],
    backends:   byKind['backend']    || [],
  }
}

// ─── Interview helpers ────────────────────────────────────────────────────────

function displayLabel(label, language) {
  if (!language) return label
  if (label.includes('(') && label.endsWith(')')) {
    return label.replace(/\)$/, `, ${language})`)
  }
  return `${label} (${language})`
}

export function frontendChoices(catalog) {
  return catalog.frontends.map((f) => ({
    name: displayLabel(f.label, f.language),
    value: f.id,
  }))
}

export function backendChoicesFor(catalog, feId) {
  const fe = catalog.byId[feId]
  const allowed = fe?.appliesTo?.backend || []
  return allowed.map((b) => {
    const m = catalog.byId[b]
    const label = m ? m.label : b
    return { name: displayLabel(label, m?.language), value: b }
  })
}

/** Returns styling choices for a frontend, or [] if only one option (auto-select). */
export function stylingChoicesFor(catalog, feId) {
  const fe = catalog.byId[feId]
  const opts = fe?.stylingOptions || []
  if (opts.length <= 1) return []
  return opts.map((id) => {
    const m = catalog.byId[id]
    return { name: m ? m.label : id, value: id }
  })
}

/** Returns true if the selected frontend supports architecture depth choice. */
export function architectureChoicesFor(catalog, feId, beId) {
  const frontend = catalog.byId[feId]
  const backend = catalog.byId[beId]
  if (!frontend || !backend) return []
  const supported = new Set(frontend.architectureProfiles || [])
  return (backend.architectureProfiles || []).filter((profile) => supported.has(profile))
}

function matchesWhen(when, context) {
  if (!when) return true
  return Object.entries(when).every(([key, expected]) => {
    const values = Array.isArray(expected) ? expected : [expected]
    return values.includes(context[key])
  })
}

// ─── Stack resolver ───────────────────────────────────────────────────────────

export function resolveStack(answers, catalog) {
  const fe = catalog.byId[answers.frontend]
  const be = catalog.byId[answers.backend]
  if (!fe) throw new Error(`Unknown frontend: ${answers.frontend}`)
  if (!be) throw new Error(`Unknown backend: ${answers.backend}`)

  const allowed = fe.appliesTo?.backend || []
  if (!allowed.includes(be.id)) {
    throw new Error(`${fe.label} cannot pair with ${be.label}`)
  }
  const applicationShape = answers.applicationShape || answers.shape || inferApplicationShape({
    frontend: fe.id,
    backend: be.id,
  })
  validateApplicationShape(applicationShape, fe.id, be.id)

  // ── Auto-resolve styling ─────────────────────────────────────────────────
  // If only one option, auto-select it. Otherwise use the user's answer.
  const stylingOpts = fe.stylingOptions || []
  const styleId = stylingOpts.length === 0
    ? null
    : stylingOpts.length === 1
    ? stylingOpts[0]
    : (answers.styling || stylingOpts[0] || 'tailwind')

  // ── Architecture ─────────────────────────────────────────────────────────
  const supportedArchitectures = architectureChoicesFor(catalog, fe.id, be.id)
  const architecture = answers.architecture || 'medium'
  if (!supportedArchitectures.includes(architecture)) {
    throw new Error(`${architecture} architecture is not supported by ${fe.label} + ${be.label}`)
  }

  const authenticationIntent = answers.authentication || 'not-yet'
  if (!['yes', 'not-yet', 'none'].includes(authenticationIntent)) {
    throw new Error(`Unknown authentication choice: ${authenticationIntent}`)
  }
  const authAudience = answers.authAudience || (fe.platform === 'mobile' ? 'multi-client' : 'website')
  if (!['website', 'multi-client'].includes(authAudience)) {
    throw new Error(`Unknown authentication audience: ${authAudience}`)
  }
  let authentication = authenticationIntent === 'none' ? 'public' : 'undecided'
  if (authenticationIntent === 'yes') {
    if (be.id === 'supabase') authentication = 'supabase'
    else if (be.id === 'springboot') authentication = authAudience === 'multi-client' ? 'oidc' : 'session'
    else if (be.id === 'laravel') {
      if (fe.id === 'laravel-ui') authentication = 'laravel-session'
      else authentication = authAudience === 'website' && fe.platform === 'web' ? 'sanctum-spa' : 'laravel-oidc'
    }
    else throw new Error(`Authentication generation requires Supabase or Spring Boot for ${fe.label}`)
  }

  // ── Collect selected manifests ───────────────────────────────────────────
  const selected = []
  const include = (m) => { if (m && !selected.find((s) => s.id === m.id)) selected.push(m) }

  for (const m of catalog.universal) include(m)
  for (const m of (catalog.byKind['platform'] || [])) {
    if ((m.appliesTo?.platform || []).includes(fe.platform || 'web')) include(m)
  }
  include(fe)
  include(be)

  // database + migration manifests that apply to the chosen backend
  for (const m of (catalog.byKind['database'] || [])) {
    if ((m.appliesTo?.backend || []).includes(be.id)) include(m)
  }
  for (const m of (catalog.byKind['migration'] || [])) {
    if ((m.appliesTo?.backend || []).includes(be.id)) include(m)
  }

  // Styling manifests contribute their own folders, dependencies, and concerns.
  const styleManifest = catalog.byId[styleId]
  if (styleManifest) include(styleManifest)

  // devops extras
  if (answers.docker)        include(catalog.byId['docker'])
  if (answers.makefile)      include(catalog.byId['makefile'])
  if (answers.githubActions) {
    include(catalog.byId['github-actions'])
    include(catalog.byId['pr-template'])
  }

  // ── Merge manifest fields ────────────────────────────────────────────────
  const selectionContext = {
    frontend: fe.id,
    backend: be.id,
    platform: fe.platform || 'web',
    architecture,
    applicationShape,
    authentication,
    authenticationIntent,
    testing: answers.testing || 'basic',
    laravelUi: answers.laravelUi,
  }
  const playbooks = [...new Set(selected.flatMap((manifest) =>
    (manifest._playbooks || []).filter((entry) =>
      typeof entry === 'string' || matchesWhen(entry.appliesWhen, selectionContext)
    ).map((entry) => typeof entry === 'string' ? entry : entry.file)
  ).filter(Boolean))]
  let   folders     = []
  const deps        = {}
  const devDeps     = {}
  const dependencyKinds = new Map()
  const rawEnv      = []   // env var names without prefix
  const clientEnv   = new Set() // which vars get the fe prefix
  const constraints = []
  const concerns    = []

  for (const m of selected) {
    folders = folders.concat(m.folders || [])
    folders = folders.concat(m.foldersByArchitecture?.[architecture] || [])
    for (const [field, target, kind] of [['deps', deps, 'dependency'], ['devDeps', devDeps, 'devDependency']]) {
      const resolved = resolvePackages(m[field] || [], catalog.profile, `${m.id}.${field}`)
      for (const [name, version] of Object.entries(resolved)) {
        const existingKind = dependencyKinds.get(name)
        if (existingKind && existingKind !== kind) {
          throw new Error(`${name} is declared as both a dependency and devDependency`)
        }
        dependencyKinds.set(name, kind)
        target[name] = version
      }
    }
    if (m.env)         rawEnv.push(...m.env)
    if (m.clientEnv)   m.clientEnv.forEach((v) => clientEnv.add(v))
    if (m.constraints) constraints.push(...m.constraints)
    if (m.concerns) {
      for (const c of m.concerns) {
        if (matchesWhen(c.appliesWhen, selectionContext)) concerns.push({ ...c, _playbook: m._playbook })
      }
    }
  }

  // Apply env prefix: clientEnv vars get fe.envPrefix, others stay as-is
  const envPrefix = fe.envPrefix || ''
  if (authentication === 'session') rawEnv.push('SPRING_SECURITY_USER_NAME', 'SPRING_SECURITY_USER_PASSWORD')
  if (authentication === 'oidc') rawEnv.push('OIDC_ISSUER_URI', 'OIDC_AUDIENCE')
  if (authentication === 'laravel-session') rawEnv.push('SESSION_DOMAIN')
  if (authentication === 'sanctum-spa') rawEnv.push('SESSION_DOMAIN', 'SANCTUM_STATEFUL_DOMAINS', 'CORS_ALLOWED_ORIGINS')
  if (authentication === 'laravel-oidc') rawEnv.push('AUTH0_DOMAIN', 'AUTH0_AUDIENCE')
  const env = [...new Set(rawEnv)].map((v) =>
    clientEnv.has(v) ? `${envPrefix}${v}` : v
  )

  // Resolve folder template tokens
  const packagePath = (answers.packageName || 'com.app').replace(/\./g, '/')
  const resolvedFolders = [...new Set(folders)].map((f) =>
    f.replace(/\{\{PACKAGE_PATH\}\}/g, packagePath)
  )

  // ── Capability flags (read from manifest, not hardcoded) ─────────────────
  return {
    // Identity
    key:           `${fe.id}-${be.id}`,
    frontendKey:   fe.id,
    backendKey:    be.id,
    label:         `${fe.label} + ${be.label}`,
    frontendLabel: fe.label,
    backendLabel:  be.label,

    // Capabilities from manifest — no hardcoded isSomething checks
    platform:      fe.platform || 'web',          // 'web' | 'mobile' | 'api'
    ciTemplate:    fe.ciTemplate || 'generic',
    scripts:       fe.scripts || {},
    frontendDir:   fe.frontendDir ?? '',
    frontendPort:  String(fe.port ?? ''),
    backendPort:   be.port ? String(be.port) : '',
    envPrefix:     fe.envPrefix || '',
    needsDocker:   be.needsDocker ?? fe.needsDocker ?? false,
    profile:       catalog.profile,
    architecture,
    applicationShape,
    supportedArchitectures,
    authenticationIntent,
    authentication,
    authAudience,
    laravelUi: answers.laravelUi,
    styleId,

    // Template fields (per fix-template-identity spec)
    makefileTemplate:  fe.platform === 'mobile' ? null : (be.makefileTemplate || fe.makefileTemplate || null),
    dockerTemplate:    fe.dockerTemplate || null,
    agentsTemplate:    fe.agentsTemplate || null,
    gitignoreTemplate: fe.gitignoreTemplate || null,

    // Merged output
    playbooks: resolvedFolders.length ? playbooks : playbooks,
    folders:   resolvedFolders,
    constraints,
    concerns,
    deps,
    devDeps,
    env,

    // Convenience flags — derived, not hardcoded per stack
    isMobile:      (fe.platform === 'mobile'),
    needsPackage:  (be.id === 'springboot'),
  }
}
