import fs from 'fs-extra'
import path from 'path'

/**
 * Extract section headings from a playbook markdown file.
 * Skips fenced code blocks so `#` inside code fences never pollute the index.
 */
export function extractSections(content) {
  const sections = []
  let inFence = false
  let lineNo  = 0

  for (const line of content.split('\n')) {
    lineNo++
    if (/^\s*```/.test(line)) { inFence = !inFence; continue }
    if (inFence) continue

    const h1 = /^# (?!#)(.+)$/.exec(line)
    const h2 = /^## (?!#)(.+)$/.exec(line)
    if (!h1 && !h2) continue

    const title   = (h1 ? h1[1] : h2[1]).trim()
    const numbered = /^(\d+)\.\s+(.+)$/.exec(title)
    const ref     = numbered ? `§ ${numbered[1]} ${numbered[2]}` : title
    sections.push({ level: h1 ? 1 : 2, title, ref, line: lineNo })
  }

  return sections
}

/**
 * Resolve a playbook relative path to an absolute path.
 * Handles nested stack facets and concern playbooks transparently.
 */
export async function resolvePlaybook(playbooksDir, file) {
  return path.join(playbooksDir, file)
}

/**
 * Collect all unique playbook files referenced by this stack's concerns —
 * including concern files (concerns/*.md) and stack files (stack/*.md).
 */
export function collectPlaybookFiles(stack) {
  const files = new Set(stack.playbooks)
  for (const c of stack.concerns) {
    const pb = c.playbook || c._playbook
    if (pb) files.add(pb)
  }
  return [...files]
}

// Build the § ref rows for a single concern entry
async function concernRows(concern, playbooksDir) {
  const playbookFile = concern.playbook || concern._playbook
  if (!playbookFile) {
    return [`| \`${concern.id}\` | <!-- MISSING playbook --> | — |`]
  }

  const fullPath = await resolvePlaybook(playbooksDir, playbookFile)
  let content
  try {
    content = await fs.readFile(fullPath, 'utf-8')
  } catch {
    return [`| \`${concern.id}\` | <!-- MISSING ${playbookFile} --> | — |`]
  }

  const sections = extractSections(content)
  const wanted   = concern.sections || []

  if (!wanted.length) {
    // No sections declared — just link the playbook
    return [`| \`${concern.id}\` | \`playbooks/${playbookFile}\` | — |`]
  }

  const normalize = (title) => title
    .replace(/^\d+\.\s+/, '')
    .trim()
    .toLocaleLowerCase('en')
  const matched = sections.filter((section) => {
    const actual = normalize(section.title)
    return wanted.some((title) => {
      const requested = normalize(title)
      return actual === requested || actual.startsWith(`${requested} —`) || actual.startsWith(`${requested} (`)
    })
  })
  if (!matched.length) {
    return [`| \`${concern.id}\` | \`playbooks/${playbookFile}\` | (section not found) |`]
  }

  return matched.map((s) => `| \`${concern.id}\` | \`playbooks/${playbookFile}\` | ${s.ref} |`)
}

/**
 * Build RULES.md — the lazy index that maps every concern to its playbook §.
 * Agents read only the § they need, never the whole playbook.
 */
export async function buildRulesIndex(stack, catalog, playbooksDir) {
  const lines = []

  lines.push('# RULES.md')
  lines.push('')
  lines.push(`**Stack:** ${stack.label}`)
  lines.push(`**Platform:** ${stack.platform}`)
  lines.push('')
  lines.push('> This file is a **lazy index** — `concern → playbook §`.')
  lines.push('> Read only the § you need. Never load all playbooks eagerly.')
  lines.push('> Detail lives in `playbooks/`. Concern files live in `playbooks/concerns/`.')
  lines.push('')
  lines.push('---')
  lines.push('')

  // Deduplicate concerns by id — required wins over optional
  const seen     = new Map()
  for (const c of stack.concerns) {
    if (!seen.has(c.id) || c.required) seen.set(c.id, c)
  }
  const concerns = [...seen.values()]

  const required = concerns.filter((c) =>  c.required)
  const optional = concerns.filter((c) => !c.required)

  // ── Always-on Invariants ───────────────────────────────────────────────
  lines.push('## Always-on Invariants')
  lines.push('')
  lines.push('| Concern | Playbook | Section |')
  lines.push('|---------|----------|---------|')
  for (const c of required) {
    for (const row of await concernRows(c, playbooksDir)) lines.push(row)
  }
  lines.push('')
  lines.push('---')
  lines.push('')

  // ── Optional Concerns ─────────────────────────────────────────────────
  lines.push('## Optional Concerns')
  lines.push('')
  lines.push('| Concern | Playbook | Section | When |')
  lines.push('|---------|----------|---------|------|')
  for (const c of optional) {
    const rows = await concernRows(c, playbooksDir)
    for (const row of rows) {
      lines.push(row.replace(/ \|$/, ` | ${c.when || '—'} |`))
    }
  }
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('**How to use this file:**')
  lines.push('1. Identify which concern your task touches.')
  lines.push('2. Open only the listed playbook at the listed §.')
  lines.push('3. Stop reading when the § ends.')
  lines.push('4. Never read all playbooks eagerly — your context window is finite.')
  lines.push('')

  return `${lines.join('\n')}\n`
}

/**
 * Copy all stack playbooks AND concern playbooks into the generated project.
 * Preserves the relative path so RULES.md refs stay valid.
 */
export async function copySelectedPlaybooks(playbooksDir, dest, stack) {
  const allFiles = collectPlaybookFiles(stack)
  for (const file of allFiles) {
    const src = path.join(playbooksDir, file)
    if (await fs.pathExists(src)) {
      const dst = path.join(dest, 'playbooks', file)
      await fs.ensureDir(path.dirname(dst))
      await fs.copy(src, dst)
    }
  }
}
