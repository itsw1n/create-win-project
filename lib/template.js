// ─── Template Variable Replacement ───────────────────────────────────────────

/**
 * Replace all {{VARIABLE}} tokens in a string
 * @param {string} content
 * @param {Record<string, string>} vars
 * @returns {string}
 */
export function render(content, vars) {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

/**
 * Build the variables map from CLI answers
 * @param {object} answers
 * @returns {Record<string, string>}
 */
export function buildVars(answers) {
  const packagePath = (answers.packageName ?? 'com.app').replace(/\./g, '/')

  return {
    PROJECT_NAME: answers.projectName,
    PROJECT_DESCRIPTION: answers.projectDescription,
    PACKAGE_NAME: answers.packageName ?? 'com.app',
    PACKAGE_PATH: packagePath,
    STYLE_MODE: answers.styling === 'tailwind' ? 'TAILWIND' : 'CSS_MODULES',
    STACK: answers.frontend + '-' + answers.backend,
    YEAR: new Date().getFullYear().toString(),
  }
}