const SOURCE_ROOTS = Object.freeze([
  'alembic/',
  'app/',
  'backend/alembic/',
  'backend/app/',
  'backend/database/',
  'backend/resources/',
  'backend/routes/',
  'backend/src/',
  'backend/tests/',
  'config/',
  'database/',
  'features/',
  'frontend/src/',
  'lib/',
  'prisma/',
  'resources/',
  'routes/',
  'src/',
  'supabase/',
  'tests/',
])

function sourcePaths(filePaths) {
  return [...new Set(filePaths
    .map((filePath) => filePath.replaceAll('\\', '/').replace(/^\.\//, ''))
    .filter((filePath) => SOURCE_ROOTS.some((root) => filePath.startsWith(root))))]
    .sort((first, second) => first.localeCompare(second))
}

function addPath(root, filePath) {
  let node = root
  const segments = filePath.split('/')
  for (const [index, segment] of segments.entries()) {
    if (!node.children.has(segment)) {
      node.children.set(segment, { children: new Map(), file: false })
    }
    node = node.children.get(segment)
    if (index === segments.length - 1) node.file = true
  }
}

function sortedChildren(node) {
  return [...node.children.entries()].sort(([firstName, first], [secondName, second]) => {
    if (first.file !== second.file) return first.file ? 1 : -1
    return firstName.localeCompare(secondName)
  })
}

function collapseDirectory(name, node) {
  let label = name
  let current = node
  while (!current.file && current.children.size === 1) {
    const [[childName, child]] = current.children
    if (child.file) break
    label += `/${childName}`
    current = child
  }
  return { label, node: current }
}

function renderChildren(node, prefix = '') {
  const entries = sortedChildren(node)
  return entries.flatMap(([name, child], index) => {
    const last = index === entries.length - 1
    const connector = last ? '└── ' : '├── '
    if (child.file) return [`${prefix}${connector}${name}`]

    const collapsed = collapseDirectory(name, child)
    const line = `${prefix}${connector}${collapsed.label}/`
    const continuation = `${prefix}${last ? '    ' : '│   '}`
    return [line, ...renderChildren(collapsed.node, continuation)]
  })
}

export function buildSourceTree(filePaths, projectName = 'project') {
  const selected = sourcePaths(filePaths)
  if (selected.length === 0) return '(No application source files were generated.)'

  const root = { children: new Map(), file: false }
  for (const filePath of selected) addPath(root, filePath)
  return `${projectName}/\n${renderChildren(root).join('\n')}`
}

export function architectureOverview(stack, filePaths, projectName) {
  const structurePlaybooks = stack.playbooks
    .filter((playbook) => playbook.startsWith('stack/') && playbook.endsWith('/structure.md'))
    .map((playbook) => `- \`playbooks/${playbook}\``)
    .join('\n')

  return `# Architecture Overview

## Runtime shape

- Frontend: ${stack.frontendLabel}
- Backend/data: ${stack.backendLabel}
- Platform: ${stack.platform}
- Architecture profile: ${stack.architecture}
- Authentication: ${stack.authentication}

## Generated source map

This map is derived from the runnable source, routes, migrations, and tests generated for this
specific stack and architecture profile. Tooling, deployment, and guidance files are omitted.

\`\`\`text
${buildSourceTree(filePaths, projectName)}
\`\`\`

The generated application is intentionally a small vertical slice. Add domain features only after
recording product goals and boundaries in \`CONTEXT.md\`. Keep entry points thin, validate at trust
boundaries, and enforce authorization beside protected data or side effects.

## Detailed structure rules

${structurePlaybooks || '- See the selected stack playbooks under `playbooks/stack/`.'}

## Verification boundary

The starter is considered healthy when its lint/typecheck/tests/build commands pass.
Documentation explains those executable patterns; it does not override working code and tests.
`
}
