import fs from 'fs-extra'
import path from 'path'
import { STACK_PLAYBOOKS, STYLING_PLAYBOOKS, DEVOPS_PLAYBOOKS } from './constants.js'

/**
 * Resolve the list of playbook files for a given set of answers
 */
export function resolvePlaybooks(answers) {
  const list = [...(STACK_PLAYBOOKS[answers.stack] ?? [])]

  // Always add styling
  if (answers.styling && STYLING_PLAYBOOKS[answers.styling]) {
    list.push(STYLING_PLAYBOOKS[answers.styling])
  }

  // DevOps — conditional
  if (answers.docker) list.push(DEVOPS_PLAYBOOKS.docker)
  if (answers.makefile) list.push(DEVOPS_PLAYBOOKS.makefile)
  if (answers.githubActions) {
    list.push(DEVOPS_PLAYBOOKS.githubActions)
    list.push(DEVOPS_PLAYBOOKS.prTemplate)
  }

  return list
}

/**
 * Merge all playbook files into a single RULES.md string
 */
export async function mergePlaybooks(playbookFiles, playbooksDir) {
  const sections = []

  sections.push(`# RULES.md`)
  sections.push(``)
  sections.push(`**Stack:** ${playbookFiles[0]?.includes('combo') ? playbookFiles[0] : 'see combo below'}`)
  sections.push(``)
  sections.push(`> This file is auto-generated. Do not edit manually.`)
  sections.push(`> Each section below is sourced from a specific playbook.`)
  sections.push(`> Load the relevant playbook from /playbooks/ for full detail on any topic.`)
  sections.push(``)
  sections.push(`---`)
  sections.push(``)

  for (const file of playbookFiles) {
    const filePath = path.join(playbooksDir, file)

    if (!await fs.pathExists(filePath)) {
      sections.push(`<!-- MISSING: ${file} — add to playbooks/ directory -->`)
      sections.push(``)
      continue
    }

    const content = await fs.readFile(filePath, 'utf-8')
    sections.push(`<!-- Source: playbooks/${file} -->`)
    sections.push(content.trim())
    sections.push(``)
    sections.push(`---`)
    sections.push(``)
  }

  return sections.join('\n')
}
