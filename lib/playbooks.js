import fs from 'fs-extra'
import path from 'path'

/**
 * Extract section headings from a playbook markdown file.
 * Skips fenced code blocks and comment lines so `# ...` inside code fences
 * (env examples, yaml, ascii diagrams) never pollute the index.
 * @param {string} content
 * @returns {Array<{level: number, title: string, ref: string}>}
 */
export function extractSections(content) {
  const sections = []
  let inFence = false
  let lineNo = 0

  for (const line of content.split('\n')) {
    lineNo++
    if (/^\s*```/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue

    const h1 = /^# (?!#)(.+)$/.exec(line)
    const h2 = /^## (?!#)(.+)$/.exec(line)
    if (!h1 && !h2) continue

    const title = (h1 ? h1[1] : h2[1]).trim()
    const numbered = /^(\d+)\.\s+(.+)$/.exec(title)
    const ref = numbered ? `§ ${numbered[1]} ${numbered[2]}` : title
    sections.push({ level: h1 ? 1 : 2, title, ref, line: lineNo })
  }

  return sections
}

/**
 * Resolve the playbook file to use for a given playbook key.
 * Prefers the compact copy (playbooks-compact/) when it exists — ships fewer
 * tokens into the project while keeping every section heading 1:1. Falls back
 * to the full playbook otherwise.
 * @param {string} playbooksDir   e.g. <cliRoot>/playbooks
 * @param {string} compactDir     e.g. <cliRoot>/playbooks-compact
 * @param {string} file           relative path, e.g. stack/nextjs.md
 * @returns {Promise<string>}     absolute path to the file to ship
 */
export async function resolvePlaybook(playbooksDir, compactDir, file) {
  const compactPath = path.join(compactDir, file)
  if (await fs.pathExists(compactPath)) return compactPath
  return path.join(playbooksDir, file)
}

// Resolve a concern's playbook file + § refs using its declared sections.
async function concernRows(concern, catalog, playbooksDir, compactDir) {
  const playbookFile = concern.playbook || concern._playbook
  if (!playbookFile) return [`| ${concern.id} | <!-- MISSING playbook --> |`]
  const fullPath = await resolvePlaybook(playbooksDir, compactDir, playbookFile)
  let content
  try { content = await fs.readFile(fullPath, 'utf-8') } catch { return [`| ${concern.id} | <!-- MISSING ${playbookFile} --> |`] }
  const sections = extractSections(content)
  const wanted = concern.sections || []
  const matched = sections.filter((s) => wanted.includes(s.title))
  if (!matched.length) return [`| ${concern.id} | ${playbookFile} (no matching section) |`]
  return matched.map((s) => `| ${concern.id} | \`${playbookFile}\` | ${s.ref} |`)
}

export async function buildRulesIndex(stack, catalog, playbooksDir, compactDir = '') {
  const lines = []
  lines.push('# RULES.md')
  lines.push('')
  lines.push(`**Stack:** ${stack.label}`)
  lines.push('')
  lines.push('> This file is a **lazy index** — `concern → playbook §`. Detail lives in `playbooks/`.')
  lines.push('> Read only the § you need via `Read` (with offset). Never read all playbooks eagerly.')
  lines.push('')
  lines.push('---')
  lines.push('')

  const required = stack.concerns.filter((c) => c.required)
  const optional = stack.concerns.filter((c) => !c.required)

  lines.push('## Always-on Invariants')
  lines.push('')
  lines.push('| Concern | Playbook | Section |')
  lines.push('|---------|----------|---------|')
  for (const c of required) {
    for (const r of await concernRows(c, catalog, playbooksDir, compactDir)) lines.push(r)
  }
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## Optional Concerns')
  lines.push('')
  lines.push('| Concern | Playbook | Section | When to read |')
  lines.push('|---------|----------|---------|--------------|')
  for (const c of optional) {
    for (const r of await concernRows(c, catalog, playbooksDir, compactDir)) {
      lines.push(r.replace(/ \|$/, ` | ${c.when || ''} |`))
    }
  }
  lines.push('')
  lines.push('**How to use:** Task touches a concern? → `Read playbooks/<file>.md` at the listed § only. Never read all playbooks eagerly.')
  lines.push('')
  return `${lines.join('\n')}\n`
}

/**
 * Copy only the selected playbooks into the project, preserving paths.
 * Uses compact copies when available, full playbooks as fallback.
 */
export async function copySelectedPlaybooks(playbooksDir, compactDir, dest, stack) {
  for (const file of stack.playbooks) {
    const src = await resolvePlaybook(playbooksDir, compactDir, file)
    if (await fs.pathExists(src)) {
      await fs.copy(src, path.join(dest, 'playbooks', file))
    }
  }
}