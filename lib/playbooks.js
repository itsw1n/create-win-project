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

  for (const line of content.split('\n')) {
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
    sections.push({ level: h1 ? 1 : 2, title, ref })
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

/**
 * Build the index-style RULES.md from the selected playbooks.
 * Returns a short map: per playbook, a list of its sections.
 */
export async function buildRulesIndex(stack, playbooksDir, compactDir = '') {
  const lines = []

  lines.push(`# RULES.md`)
  lines.push('')
  lines.push(`**Stack:** ${stack.label}`)
  lines.push('')
  lines.push('> This file is auto-generated. Do not edit manually.')
  lines.push('> It maps every concern to the playbook section that covers it.')
  lines.push('> Open the named playbook under /playbooks/ for full detail.')
  lines.push('')
  lines.push('---')
  lines.push('')

  // ── Constraints ─────────────────────────────────────────────────────────
  if (stack.constraints.length) {
    lines.push('## This Combo — Key Constraints')
    lines.push('')
    for (const rule of stack.constraints) {
      lines.push(`- ${rule}`)
    }
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  // ── Playbook map ────────────────────────────────────────────────────────
  lines.push('## Playbook Map')
  lines.push('')
  lines.push('| Concern | Section |')
  lines.push('|---------|---------|')

  for (const file of stack.playbooks) {
    const fullPath = await resolvePlaybook(playbooksDir, compactDir, file)
    let content
    try {
      content = await fs.readFile(fullPath, 'utf-8')
    } catch {
      lines.push(`| ${file} | <!-- MISSING playbook --> |`)
      continue
    }

    const sections = extractSections(content)
    const sourceLabel = file.replace('.md', '').replace(/\//g, '/')
    for (const s of sections) {
      lines.push(`| ${sourceLabel} | ${s.ref} |`)
    }
  }

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