import fs from 'fs-extra'
import path from 'path'

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function loadCatalog(playbooksDir) {
  const manifests = []
  const walk = async (dir) => {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const e of entries) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) { await walk(full); continue }
      if (e.name.endsWith('.manifest.json')) {
        const m = await fs.readJson(full)
        m._file = full
        m._playbook = m.file
          ? m.file
          : path.relative(playbooksDir, full).replace(/\.manifest\.json$/, '.md')
        manifests.push(m)
      }
    }
  }
  await walk(playbooksDir)
  return buildIndex(manifests)
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

export function frontendChoices(catalog) {
  return catalog.frontends.map((f) => ({ name: f.label, value: f.id }))
}

export function backendChoicesFor(catalog, feId) {
  const fe = catalog.byId[feId]
  const allowed = fe?.appliesTo?.backend || []
  return allowed.map((b) => {
    const m = catalog.byId[b]
    return { name: m ? m.label : b, value: b }
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
export function supportsArchitecture(catalog, feId) {
  return catalog.byId[feId]?.supportsArchitecture === true
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

  // ── Auto-resolve styling ─────────────────────────────────────────────────
  // If only one option, auto-select it. Otherwise use the user's answer.
  const stylingOpts = fe.stylingOptions || []
  const styleId = stylingOpts.length === 1
    ? stylingOpts[0]
    : (answers.styling || stylingOpts[0] || 'tailwind')

  // ── Architecture ─────────────────────────────────────────────────────────
  const architecture = (fe.supportsArchitecture && answers.architecture === 'large')
    ? 'large'
    : 'medium'

  // ── Collect selected manifests ───────────────────────────────────────────
  const selected = []
  const include = (m) => { if (m && !selected.find((s) => s.id === m.id)) selected.push(m) }

  for (const m of catalog.universal) include(m)
  include(fe)
  include(be)

  // database + migration manifests that apply to the chosen backend
  for (const m of (catalog.byKind['database'] || [])) {
    if ((m.appliesTo?.backend || []).includes(be.id)) include(m)
  }
  for (const m of (catalog.byKind['migration'] || [])) {
    if ((m.appliesTo?.backend || []).includes(be.id)) include(m)
  }

  // styling manifest (may not exist for mobile — nativewind is a concern, not a kind)
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
  const playbooks   = [...new Set(selected.map((m) => m._playbook).filter(Boolean))]
  let   folders     = []
  const deps        = {}
  const devDeps     = {}
  const rawEnv      = []   // env var names without prefix
  const clientEnv   = new Set() // which vars get the fe prefix
  const constraints = []
  const concerns    = []
  const snippets    = {}

  for (const m of selected) {
    folders = folders.concat(m.folders || [])
    Object.assign(deps,    m.deps    || {})
    Object.assign(devDeps, m.devDeps || {})
    if (m.env)         rawEnv.push(...m.env)
    if (m.clientEnv)   m.clientEnv.forEach((v) => clientEnv.add(v))
    if (m.constraints) constraints.push(...m.constraints)
    if (m.concerns)    for (const c of m.concerns) concerns.push({ ...c, _playbook: m._playbook })
    if (m.snippets)    for (const [target, tag] of Object.entries(m.snippets)) {
      snippets[target] = { tag, playbook: m._playbook }
    }
  }

  // Apply env prefix: clientEnv vars get fe.envPrefix, others stay as-is
  const envPrefix = fe.envPrefix || ''
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
    platform:      fe.platform || 'web',          // 'web' | 'mobile'
    ciTemplate:    fe.ciTemplate || 'generic',
    scripts:       fe.scripts || {},
    frontendDir:   fe.frontendDir ?? '',
    frontendPort:  String(fe.port ?? ''),
    backendPort:   be.port ? String(be.port) : '',
    envPrefix:     fe.envPrefix || '',
    needsDocker:   be.needsDocker ?? fe.needsDocker ?? false,
    architecture,
    styleId,

    // Template fields (per fix-template-identity spec)
    makefileTemplate:  be.makefileTemplate || fe.makefileTemplate || null,
    dockerTemplate:    fe.dockerTemplate || null,
    agentsTemplate:    fe.agentsTemplate || null,
    readmeTemplate:    fe.readmeTemplate || null,
    gitignoreTemplate: fe.gitignoreTemplate || null,

    // Merged output
    playbooks: resolvedFolders.length ? playbooks : playbooks,
    folders:   resolvedFolders,
    constraints,
    concerns,
    deps,
    devDeps,
    env,
    snippets,

    // Convenience flags — derived, not hardcoded per stack
    isMobile:      (fe.platform === 'mobile'),
    needsPackage:  (be.id === 'springboot'),
    isSupabase:    (be.id === 'supabase'),
  }
}
