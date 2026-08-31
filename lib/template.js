// ─── Template Variable Replacement ───────────────────────────────────────────

import fs from 'fs-extra'
import path from 'path'

export function render(content, vars) {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

export async function readTemplate(templatesDir, category, name, ext = '') {
  if (!name) return null
  const file = path.join(templatesDir, category, `${name}${ext}`)
  if (await fs.pathExists(file)) return fs.readFile(file, 'utf-8')
  return null
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
    FRONTEND_DIR:        stack.frontendDir || '.',
    FRONTEND_PORT:       stack.frontendPort || '3000',
    BACKEND_PORT:        stack.backendPort || '8080',
    ENV_PREFIX:          stack.envPrefix || '',
    SRC_DIR:             stack.frontendDir ? `${stack.frontendDir}/src` : 'src',
    CONSTRAINTS:         (stack.constraints || []).join('\n- ') ? `- ${(stack.constraints || []).join('\n- ')}` : '- (none beyond universal rules)',
    FRONTEND_DOCKERFILE: stack.frontendDir ? `${stack.frontendDir}/Dockerfile.dev` : 'Dockerfile.dev',
    FRONTEND_DOCKERFILE_PROD: stack.frontendDir ? `${stack.frontendDir}/Dockerfile` : 'Dockerfile',
    FRONTEND_PROD_PORT:  stack.frontendDir ? '80:80' : `${stack.frontendPort || '3000'}:${stack.frontendPort || '3000'}`,
  }
}
