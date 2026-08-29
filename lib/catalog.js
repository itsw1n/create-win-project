import fs from 'fs-extra'
import path from 'path'

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
        m._playbook = m.file ? m.file : path.relative(playbooksDir, full).replace(/\.manifest\.json$/, '.md')
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
    universal: byKind['universal'] || [],
    frontends: byKind['frontend'] || [],
    backends: byKind['backend'] || [],
  }
}

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

export function resolveStack(answers, catalog) {
  const fe = catalog.byId[answers.frontend]
  const be = catalog.byId[answers.backend]
  if (!fe) throw new Error(`Unknown frontend: ${answers.frontend}`)
  if (!be) throw new Error(`Unknown backend: ${answers.backend}`)
  const allowed = (fe.appliesTo?.backend || [])
  if (!allowed.includes(be.id)) {
    throw new Error(`${fe.label} cannot pair with ${be.label}`)
  }

  const styleMode = answers.styling === 'tailwind' ? 'tailwind' : 'css-modules'
  const architecture = (answers.frontend === 'nextjs' && answers.architecture === 'large') ? 'large' : 'medium'

  const selected = []
  const include = (m) => { if (m && !selected.find((s) => s.id === m.id)) selected.push(m) }

  for (const m of catalog.universal) include(m)
  include(fe); include(be)
  for (const m of (catalog.byKind['database'] || [])) {
    if ((m.appliesTo?.backend || []).includes(be.id)) include(m)
  }
  for (const m of (catalog.byKind['migration'] || [])) {
    if ((m.appliesTo?.backend || []).includes(be.id)) include(m)
  }
  include(catalog.byId[styleMode])
  if (answers.docker) include(catalog.byId['docker'])
  if (answers.makefile) include(catalog.byId['makefile'])
  if (answers.githubActions) { include(catalog.byId['github-actions']); include(catalog.byId['pr-template']) }

  const playbooks = [...new Set(selected.map((m) => m._playbook).filter(Boolean))]
  let folders = []
  const deps = {}, devDeps = {}, env = []
  const constraints = []
  const concerns = []
  const snippets = {}
  for (const m of selected) {
    folders = folders.concat(m.folders || [])
    Object.assign(deps, m.deps || {})
    Object.assign(devDeps, m.devDeps || {})
    if (m.env) env.push(...m.env)
    if (m.constraints) constraints.push(...m.constraints)
    if (m.concerns) concerns.push(...m.concerns)
    if (m.snippets) Object.assign(snippets, m.snippets)
  }
  const packagePath = (answers.packageName || 'com.app').replace(/\./g, '/')
  folders = [...new Set(folders)].map((f) => f.replace(/\{\{PACKAGE_PATH\}\}/g, packagePath))

  return {
    key: `${fe.id}-${be.id}`,
    frontendKey: fe.id, backendKey: be.id,
    label: `${fe.label} + ${be.label}`,
    frontendLabel: fe.label, backendLabel: be.label,
    frontendDir: fe.frontendDir ?? '',
    frontendPort: String(fe.port ?? ''),
    backendPort: be.port ? String(be.port) : '',
    needsDocker: be.needsDocker ?? fe.needsDocker ?? false,
    architecture,
    isNextjs: fe.id === 'nextjs', isReact: fe.id === 'react',
    isSpringBoot: be.id === 'springboot', isSupabase: be.id === 'supabase', isPrisma: be.id === 'postgres',
    playbooks, folders, constraints, concerns, deps, devDeps, env, snippets,
  }
}
