// ─── Generated File Contents ──────────────────────────────────────────────────
// Each function returns the content for a specific generated file.
// Static helpers only — no stack identity checks. Stack-specific files are
// now template-driven via templates/ and readTemplate().

export function contextMd(vars, expectedConcerns) {
  const concernsBlock = (expectedConcerns && expectedConcerns.length)
    ? expectedConcerns.map((c) => `- ${c}`).join('\n')
    : '- (none selected — all optional concerns remain available)'
  return `# CONTEXT.md

## Project
**Name:** {{PROJECT_NAME}}
**Description:** {{PROJECT_DESCRIPTION}}
**Stack:** {{STACK}}
**Styling:** {{STYLE_MODE}}
**Compatibility profile:** {{COMPATIBILITY_PROFILE}}
**Year:** {{YEAR}}

## Goals
<!-- What this project does and who it's for -->

## Key Decisions
<!-- Architecture and tech decisions made during the project -->

## Out of Scope
<!-- What this project explicitly does NOT do -->

## Notes
<!-- Anything else agents or contributors should know -->

## Expected Concerns (advisory)
${concernsBlock}
`
}

export function progressMd() {
  return `# PROGRESS.md

## Status
🟡 In Progress

---

## Completed
<!-- Move items here when done -->

## In Progress
<!-- Current work -->

## Up Next
<!-- Planned work -->

## Blocked
<!-- Anything blocking progress -->

## Decisions Made
<!-- Key decisions logged here -->
`
}

export function docPlaceholder(title, description) {
  return `# ${title}

> ${description}

<!-- Add content here -->
`
}

export function editorconfig() {
  return `root = true

[*]
end_of_line = lf
insert_final_newline = true
charset = utf-8
trim_trailing_whitespace = true

[*.{js,ts,jsx,tsx,json,css,md,yml,yaml}]
indent_style = space
indent_size = 2

[*.java]
indent_style = space
indent_size = 4

[Makefile]
indent_style = tab
`
}

export function prettierrc() {
  return `{
  "$schema": "https://json.schemastore.org/prettierrc",
  "semi": false,
  "singleQuote": true,
  "jsxSingleQuote": false,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
`
}

// ─── PR Template ─────────────────────────────────────────────────────────────

export function prTemplate() {
  return `## What does this PR do?

<!-- Describe the change clearly. What problem does it solve? -->

---

## Type of change
- [ ] \`feat\` — new feature
- [ ] \`fix\` — bug fix
- [ ] \`refactor\` — restructure without behavior change
- [ ] \`chore\` — deps, config, tooling
- [ ] \`docs\` — documentation only
- [ ] \`test\` — adding or updating tests

## Scope
- [ ] \`frontend\`
- [ ] \`backend\`
- [ ] \`mobile\`
- [ ] \`ci\`
- [ ] \`docs\`
- [ ] \`deps\`

---

## How to test?
1.
2.
3.

---

## Checklist
- [ ] Branched off \`dev\`
- [ ] Commits follow \`type(scope): description\`
- [ ] No \`console.log\` or debug code
- [ ] No hardcoded secrets
- [ ] Lint passes
- [ ] Tests pass
- [ ] Docs updated if endpoints or rules changed
- [ ] Compatibility matrix passes if a profile, dependency, runtime, or container changed
- [ ] Major upgrades include migration notes

Closes #
`
}
