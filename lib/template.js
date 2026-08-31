// ─── Template Variable Replacement ───────────────────────────────────────────

export function render(content, vars) {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

export function buildVars(answers, stack) {
  const packagePath = (answers.packageName ?? 'com.app').replace(/\./g, '/')

  return {
    PROJECT_NAME:        answers.projectName,
    PROJECT_DESCRIPTION: answers.projectDescription,
    PACKAGE_NAME:        answers.packageName ?? 'com.app',
    PACKAGE_PATH:        packagePath,
    STYLE_MODE:          stack.styleId?.toUpperCase().replace(/-/g, '_') ?? 'TAILWIND',
    STACK:               stack.key,
    PLATFORM:            stack.platform,
    ARCHITECTURE:        stack.architecture?.toUpperCase() ?? 'MEDIUM',
    YEAR:                new Date().getFullYear().toString(),
  }
}
