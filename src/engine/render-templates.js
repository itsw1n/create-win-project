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

export async function writeRenderedFile(destination, filePath, template, vars) {
  const content = render(template, vars)
  const { writeFile } = await import('./write-files.js')
  await writeFile(destination, filePath, content)
}

export * from './write-files.js'

export function buildVars(answers, stack) {
  const packagePath = (answers.packageName ?? 'com.app').replace(/\./g, '/')
  const profile = stack.profile

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
    // Dockerfile paths are resolved inside build.context, so they are always
    // relative to that context rather than to the repository root.
    FRONTEND_DOCKERFILE: 'Dockerfile.dev',
    FRONTEND_DOCKERFILE_PROD: 'Dockerfile',
    FRONTEND_PROD_PORT:  stack.frontendDir ? '80:80' : `${stack.frontendPort || '3000'}:${stack.frontendPort || '3000'}`,
    NODE_VERSION:        profile.runtimes.node,
    JAVA_VERSION:        profile.runtimes.java,
    MAVEN_VERSION:       profile.runtimes.maven,
    SPRING_BOOT_VERSION: profile.springBoot,
    SPRING_MODULITH_VERSION: profile.springModulith,
    PHP_VERSION:         profile.runtimes.php,
    COMPOSER_VERSION:    profile.runtimes.composer,
    LARAVEL_VERSION:     profile.composerPackages['laravel/framework'],
    LARAVEL_DIR:         ['laravel-ui', 'no-frontend'].includes(stack.frontendKey) ? '.' : 'backend',
    TESTCONTAINERS_VERSION: profile.packages["testcontainers-junit-jupiter"] || profile.packages["testcontainers-postgresql"] || "1.19.8",
    POSTGRES_VERSION:    profile.runtimes.postgres,
    NODE_IMAGE:          `${profile.images.node.repository}:${profile.images.node.tag}`,
    MAVEN_IMAGE:         `${profile.images.maven.repository}:${profile.images.maven.tag}`,
    JAVA_IMAGE:          `${profile.images.java.repository}:${profile.images.java.tag}`,
    POSTGRES_IMAGE:      `${profile.images.postgres.repository}:${profile.images.postgres.tag}`,
    NGINX_IMAGE:         `${profile.images.nginx.repository}:${profile.images.nginx.tag}`,
    PHP_IMAGE:           `${profile.images.php.repository}:${profile.images.php.tag}`,
    COMPOSER_IMAGE:      `${profile.images.composer.repository}:${profile.images.composer.tag}`,
    COMPATIBILITY_PROFILE: profile.id,
  }
}
