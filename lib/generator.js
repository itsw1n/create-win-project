import fs from 'fs-extra'
import path from 'path'
import { randomUUID } from 'node:crypto'
import { loadCatalog, resolveStack } from './catalog.js'
import { loadCompatibility } from './compatibility.js'
import { buildRulesIndex, copySelectedPlaybooks } from './playbooks.js'
import { buildVars, render, readTemplate } from './template.js'
import { buildRunnableFiles } from './scaffold.js'
import { buildLaravelFiles } from './laravel-scaffold.js'
import {
  contextMd, progressMd, docPlaceholder,
  editorconfig, prettierrc, prTemplate,
} from './files.js'

/**
 * Main entry point — generates the full project
 */
export async function generateProject(answers, cliRoot) {
  validateAnswers(answers)
  const finalDest   = path.join(process.cwd(), answers.projectName)
  const dest        = path.join(process.cwd(), `.${answers.projectName}.tmp-${randomUUID()}`)
  const playbooksDir = path.join(cliRoot, 'playbooks')
  const ciDir        = path.join(cliRoot, 'ci')
  const { profile }  = await loadCompatibility(
    path.join(cliRoot, 'compatibility/profiles.json'),
    answers.compatibilityProfile,
  )
  const catalog      = await loadCatalog(playbooksDir, profile)

  // Ensure styling is resolved before passing to resolveStack
  const resolvedAnswers = {
    ...answers,
    styling: answers.styling || catalog.byId[answers.frontend]?.stylingOptions?.[0] || 'tailwind',
  }

  const stack = resolveStack(resolvedAnswers, catalog)
  const vars  = buildVars(resolvedAnswers, stack)
  const templatesDir = path.join(cliRoot, 'templates')

  // 1. Refuse to merge into an existing project. Generation must never silently
  // overwrite user work.
  if (await fs.pathExists(finalDest)) {
    throw new Error(`Destination already exists: ${finalDest}`)
  }

  try {
    // 2. Staging folder. It is moved into place only after every generation
    // step succeeds, so failures never leave a half-written project.
    await fs.ensureDir(dest)

    // 3. Root documentation and repository files. Directories are created only
    // when a real generated file needs them; empty architecture theatre is not
    // part of the scaffold contract.
    await generateRootFiles(dest, resolvedAnswers, vars, stack, templatesDir)

    // 4. Small, runnable framework foundations. These files are the executable
    // contract that the playbooks describe.
    await generateRunnableFiles(dest, resolvedAnswers, stack, vars)

    // 5. Product documentation
    await generateDocs(dest, resolvedAnswers, stack)

    // 6. GitHub Actions CI (template-driven)
    if (resolvedAnswers.githubActions) {
      await generateCI(dest, stack, ciDir, resolvedAnswers, vars)
    }

    // 7. Copy selected playbooks (including concern files)
    await copySelectedPlaybooks(playbooksDir, dest, stack)

    // 8. RULES.md
    const rulesContent = await buildRulesIndex(stack, catalog, playbooksDir)
    await write(dest, 'RULES.md', rulesContent)
    await fs.move(dest, finalDest)
  } catch (error) {
    await fs.remove(dest)
    throw error
  }
}

function validateAnswers(answers) {
  if (!answers || typeof answers !== 'object') throw new Error('Project answers are required')
  if (!/^[a-z0-9-]+$/.test(answers.projectName || '')) {
    throw new Error('Project name must use lowercase letters, numbers, and hyphens only')
  }
  if (typeof answers.projectDescription !== 'string' || !answers.projectDescription.trim()) {
    throw new Error('Project description is required')
  }
  if (answers.testing && !['none', 'basic', 'full'].includes(answers.testing)) {
    throw new Error(`Unknown testing setup: ${answers.testing}`)
  }
  if (answers.architecture && !['small', 'medium', 'large'].includes(answers.architecture)) {
    throw new Error(`Unknown architecture profile: ${answers.architecture}`)
  }
  if (answers.authentication && !['yes', 'not-yet', 'none'].includes(answers.authentication)) {
    throw new Error(`Unknown authentication choice: ${answers.authentication}`)
  }
  if (answers.backend === 'springboot' && !/^[a-z]+(\.[a-z][a-z0-9]*)+$/.test(answers.packageName || '')) {
    throw new Error('Java package name must look like com.example')
  }
}

// ─── Root files ───────────────────────────────────────────────────────────────

async function generateRootFiles(dest, answers, vars, stack, templatesDir) {
  await writeTemplate(dest, 'CONTEXT.md',    contextMd(vars, answers.expectedConcerns), vars)
  // AGENTS.md — template-driven
  {
    const tpl = await readTemplate(templatesDir, 'agents', stack.agentsTemplate, '.md')
    if (tpl) await writeTemplate(dest, 'AGENTS.md', tpl, vars)
    else await write(dest, 'AGENTS.md', `# AGENTS.md\nStack: ${stack.label}\n`)
  }
  await write(dest,         'PROGRESS.md',   progressMd())
  // README.md is generated with the runnable framework files. Keeping one
  // owner prevents a generic template from drifting away from real commands.
  // .gitignore — template-driven
  {
    const tpl = await readTemplate(templatesDir, 'gitignore', stack.gitignoreTemplate, '.gitignore')
    if (tpl) await writeTemplate(dest, '.gitignore', tpl, vars)
    else {
      const baseTpl = await readTemplate(templatesDir, 'gitignore', 'base', '.gitignore')
      if (baseTpl) await write(dest, '.gitignore', baseTpl)
    }
  }
  await write(dest,         '.editorconfig', editorconfig())
  await write(dest,         '.prettierrc',   prettierrc())

  // Makefile — template-driven (web only)
  if (answers.makefile && !stack.isMobile) {
    const tpl = await readTemplate(templatesDir, 'makefile', stack.makefileTemplate, '.mk')
    if (tpl) await writeTemplate(dest, 'Makefile', tpl, vars)
  }

  // Docker — template-driven
  if (answers.docker && !stack.isMobile) {
    // docker-compose.yml
    let composeTpl = null
    if (stack.needsPackage) {
      composeTpl = await readTemplate(templatesDir, 'docker/compose', 'springboot', '.yml')
    } else if (stack.backendKey === 'supabase') {
      composeTpl = await readTemplate(templatesDir, 'docker/compose', 'supabase', '.yml')
    } else {
      composeTpl = await readTemplate(templatesDir, 'docker/compose', 'postgres', '.yml')
    }
    if (composeTpl) await writeTemplate(dest, 'docker-compose.yml', composeTpl, vars)

    // docker-compose.prod.yml — only for springboot
    if (stack.needsPackage) {
      const prodTpl = await readTemplate(templatesDir, 'docker/compose-prod', 'springboot', '.yml')
      if (prodTpl) await writeTemplate(dest, 'docker-compose.prod.yml', prodTpl, vars)

      const beDev = await readTemplate(templatesDir, 'docker/dockerfile', 'springboot.dev', '.dockerfile')
      if (beDev) await writeTemplate(dest, 'backend/Dockerfile.dev', beDev, vars)
      const beProd = await readTemplate(templatesDir, 'docker/dockerfile', 'springboot.prod', '.dockerfile')
      if (beProd) await writeTemplate(dest, 'backend/Dockerfile', beProd, vars)
    }

    // frontend dockerfiles — vite vs nextjs
    if (stack.frontendKey === 'react') {
      const viteDev = await readTemplate(templatesDir, 'docker/dockerfile', 'vite.dev', '.dockerfile')
      if (viteDev) await writeTemplate(dest, 'frontend/Dockerfile.dev', viteDev, vars)
      const viteProd = await readTemplate(templatesDir, 'docker/dockerfile', 'vite.prod', '.dockerfile')
      if (viteProd) {
        await writeTemplate(dest, 'frontend/Dockerfile', viteProd, vars)
        const nginx = `server {\n  listen 80;\n  location / {\n    root /usr/share/nginx/html;\n    index index.html;\n    try_files $uri $uri/ /index.html;\n  }\n}\n`
        await write(dest, 'frontend/nginx.conf', nginx)
      }
    } else if (stack.frontendKey === 'nextjs') {
      const nextDev = await readTemplate(templatesDir, 'docker/dockerfile', 'nextjs.dev', '.dockerfile')
      if (nextDev) await writeTemplate(dest, 'Dockerfile.dev', nextDev, vars)
      const nextProd = await readTemplate(templatesDir, 'docker/dockerfile', 'nextjs.prod', '.dockerfile')
      if (nextProd) await writeTemplate(dest, 'Dockerfile', nextProd, vars)
    }
  }

  // PR template
  if (answers.githubActions) {
    await write(dest, '.github/PULL_REQUEST_TEMPLATE.md', prTemplate())
  }
}

// ─── Doc placeholders ─────────────────────────────────────────────────────────

async function generateDocs(dest, answers, stack) {
  const docs = [
    ['docs/api/overview.md',              'API Overview',           'Base URL, authentication method, and response format.'],
    ['docs/api/endpoints.md',             'API Endpoints',          'All endpoint documentation goes here.'],
    ['docs/api/errors.md',                'Error Code Registry',    'All error codes with status, category, and description.'],
    ['docs/architecture/overview.md',     'Architecture Overview',  'System design and how the pieces connect.'],
    ['docs/architecture/database-schema.md', 'Database Schema',     'Tables, columns, relationships, and ERD.'],
    ['docs/architecture/auth-flow.md',    'Auth Flow',              'Step-by-step authentication flow.'],
    ['docs/guides/setup.md',              'Local Setup Guide',      'Prerequisites and step-by-step local setup.'],
    ['docs/guides/deployment.md',         'Deployment Guide',       'How to deploy to production.'],
    ['docs/guides/env-variables.md',      'Environment Variables',  'Every variable: name, required, description, example.'],
  ]
  for (const [filePath, title, description] of docs) {
    await write(dest, filePath, docPlaceholder(title, description))
  }

  const frontendRoot = stack.frontendKey === 'react' ? 'frontend/' : ''
  const validation = stack.isMobile
    ? `npm run typecheck\n${answers.testing === 'none' ? '' : 'npm test -- --runInBand\n'}npm run build -- --platform web`
    : 'npm run lint\nnpm run typecheck\nnpm run test --if-present\nnpm run build'
  await write(dest, 'docs/guides/setup.md', `# Local Setup Guide\n\n## Prerequisites\n\n- Node.js 20 or newer\n- npm\n${stack.backendKey === 'springboot' ? '- Java 21 and Maven 3.9, or Docker\n- PostgreSQL 16, or Docker\n' : ''}${stack.backendKey === 'supabase' ? '- A running Docker-compatible runtime for the pinned local Supabase CLI\n' : ''}\n## Install and start\n\n\`\`\`bash\n${frontendRoot ? `cd ${frontendRoot}\n` : ''}cp .env.example ${stack.isMobile ? '.env' : '.env.local'}\nnpm install\nnpm run dev\n\`\`\`\n${stack.backendKey === 'springboot' ? `\nIn another terminal from the repository root:\n\n\`\`\`bash\n${stack.frontendKey === 'react' ? 'cp .env.example .env\n' : ''}docker compose up -d db\ncd backend\nmvn spring-boot:run\n\`\`\`\n` : ''}${stack.backendKey === 'supabase' ? `\nStart the local Supabase stack from the npm package directory:\n\n\`\`\`bash\n${frontendRoot ? `cd ${frontendRoot}\n` : ''}npm run supabase:start\n\`\`\`\n` : ''}\n## Validate\n\n\`\`\`bash\n${frontendRoot ? `cd ${frontendRoot}\n` : ''}${validation}\n\`\`\`\n\nCommit the generated \`package-lock.json\`; CI uses \`npm ci\`.\n`)

  const setupPath = path.join(dest, 'docs/guides/setup.md')
  const setupGuide = (await fs.readFile(setupPath, 'utf8'))
    .replace('Node.js 20 or newer', `Node.js ${stack.profile.runtimes.node}`)
    .replace('Java 21 and Maven 3.9, or Docker', `Java ${stack.profile.runtimes.java}; Maven ${stack.profile.runtimes.maven} or Docker is used through the generated launcher`)
    .replace('PostgreSQL 16, or Docker', `PostgreSQL ${stack.profile.runtimes.postgres}, or Docker`)
    .replace('mvn spring-boot:run', './mvnw spring-boot:run  # use mvnw.cmd on Windows')
  await fs.writeFile(setupPath, setupGuide, 'utf8')

  const envLocation = stack.frontendKey === 'react' ? '`frontend/.env` for client values' : stack.isMobile ? '`.env`' : '`.env.local`'
  await write(dest, 'docs/guides/env-variables.md', `# Environment Variables\n\nCopy the generated example before starting. Client environment location: ${envLocation}.\n\n| Variable | Visibility | Required | Purpose |\n|---|---|---:|---|\n${stack.env.map((name) => `| \`${name}\` | ${name.startsWith(stack.envPrefix) ? 'client/public' : 'server only'} | yes | ${environmentPurpose(name)} |`).join('\n')}\n\nValues with \`${stack.envPrefix}\` are bundled into client code and must never contain secrets. Keep real environment files out of version control.\n`)

  await write(dest, 'docs/architecture/overview.md', `# Architecture Overview\n\n## Runtime shape\n\n- Frontend: ${stack.frontendLabel}\n- Backend/data: ${stack.backendLabel}\n- Platform: ${stack.platform}\n- Architecture profile: ${stack.architecture}\n- Authentication: ${stack.authentication}\n\nThe generated application is intentionally a small vertical slice. Add domain features only after recording product goals and boundaries in \`CONTEXT.md\`. Keep entry points thin, validate at trust boundaries, and enforce authorization beside protected data or side effects.\n\n## Verification boundary\n\nThe starter is considered healthy when its lint/typecheck/tests/build commands pass. Documentation explains those executable patterns; it does not override working code and tests.\n`)

  await write(dest, 'docs/architecture/auth-flow.md', authDocumentation(stack))

  const health = stack.backendKey === 'springboot' ? 'GET http://localhost:8080/api/health' : stack.frontendKey === 'nextjs' ? 'GET /api/health' : '(No custom HTTP API is generated for this client-only starter.)'
  await write(dest, 'docs/api/overview.md', `# API Overview\n\n## Health\n\n\`${health}\`\n\nAuthentication and authorization behavior is documented in \`docs/architecture/auth-flow.md\`. Add endpoints to \`docs/api/endpoints.md\` in the same change that adds their implementation and tests.\n`)
}

function environmentPurpose(name) {
  if (name.endsWith('SUPABASE_URL')) return 'Supabase project URL.'
  if (name.endsWith('SUPABASE_PUBLISHABLE_KEY')) return 'Public Supabase key; RLS protects data.'
  if (name.endsWith('API_URL')) return 'Base URL of the application API.'
  if (name === 'DATABASE_URL') return 'Server-side PostgreSQL JDBC connection URL.'
  if (name === 'POSTGRES_USER') return 'Local/deployed database user.'
  if (name === 'POSTGRES_PASSWORD') return 'Database credential; replace the development example.'
  if (name === 'POSTGRES_DB') return 'Database name.'
  if (name === 'SPRING_PROFILES_ACTIVE') return 'Active Spring configuration profile.'
  if (name === 'SPRING_SECURITY_USER_NAME') return 'Development-only generated Spring login name; replace with the product identity store.'
  if (name === 'SPRING_SECURITY_USER_PASSWORD') return 'Development-only Spring login credential; never commit a real value.'
  if (name === 'OIDC_ISSUER_URI') return 'Trusted OpenID Connect issuer used to validate access tokens.'
  if (name === 'OIDC_AUDIENCE') return 'Required audience for tokens accepted by this API.'
  if (name === 'SESSION_DOMAIN') return 'Exact domain scope for the secure session cookie.'
  if (name === 'SANCTUM_STATEFUL_DOMAINS') return 'Comma-separated first-party browser hosts allowed to use Sanctum session authentication.'
  if (name === 'CORS_ALLOWED_ORIGINS') return 'Exact browser origins allowed to make credentialed API requests.'
  return 'Stack configuration.'
}

function authDocumentation(stack) {
  if (stack.authentication === 'public') return `# Authentication Flow\n\nThis project intentionally has no user accounts. No login, session, or refresh mechanism is generated. Application endpoints are public; add authentication and resource authorization before introducing protected data. Do not rerun the generator over this project to add auth—change the existing project deliberately with its stack security playbook and tests.\n`
  if (stack.authentication === 'undecided') return `# Authentication Flow\n\nAuthentication is intentionally undecided. No login or pretend role state is generated. ${stack.backendKey === 'springboot' ? 'Spring permits health endpoints and denies every other request.' : 'The client starts without a user session; any remote service remains responsible for access control.'}\n\nWhen auth is added, document login, storage, expiry, refresh ownership, logout, recovery, request-integrity boundaries, and resource authorization here. Do not rerun the generator over this project.\n`
  if (stack.authentication === 'supabase' && stack.frontendKey === 'nextjs') return `# Authentication Flow\n\n## Generated Supabase SSR flow\n\n1. Browser code uses \`src/lib/supabase/client.ts\` with the publishable key.\n2. Server code uses the cookie-aware client in \`src/lib/supabase/server.ts\`.\n3. \`src/proxy.ts\` refreshes/verifies with \`getClaims()\` and synchronizes request and response cookies.\n4. The PKCE callback exchanges an authorization code and redirects only to the application root.\n5. Every server operation authorizes again near data access; RLS is the final row boundary.\n\nProxy is not authorization. Never authorize from \`getSession()\` alone. See \`playbooks/capabilities/supabase/nextjs.md\`.\n`
  if (stack.authentication === 'supabase') return `# Authentication Flow\n\nSupabase Auth owns access-token and refresh-token rotation. The project uses only the publishable key and RLS remains the authorization boundary. ${stack.isMobile ? 'Expo stores the session in SecureStore and binds automatic refresh to application foreground/background lifecycle.' : 'The browser SDK owns persistence and refresh; do not build a second interceptor.'}\n\nRegister exact callback/deep-link URLs and test expiry, revocation, logout, recovery, and RLS allow/deny cases. See the selected Supabase capability playbook.\n`
  if (stack.authentication === 'session') return `# Authentication Flow\n\nSpring Security owns a server-side browser session. The browser receives an HttpOnly session cookie; Spring rotates the session identifier after authentication, keeps CSRF protection enabled, and invalidates the session on logout. The generated default login is development scaffolding—replace it with the product identity store before production. Authorization remains server-side and includes resource ownership. There is no browser refresh token.\n`
  if (stack.authentication === 'laravel-session') return `# Authentication Flow\n\nLaravel owns the website session. Login regenerates the session identifier, logout invalidates the session and rotates the CSRF token, and protected routes use server-side authorization. The browser receives an HttpOnly session cookie; there is no browser refresh token. Keep CSRF protection enabled for every cookie-authenticated mutation.\n`
  if (stack.authentication === 'sanctum-spa') return `# Authentication Flow\n\nLaravel Sanctum uses Laravel's secure session cookie for this first-party browser application. The SPA first requests \`/sanctum/csrf-cookie\`, then sends credentialed login and API requests. Sanctum does not give this browser a custom bearer/refresh-token system. Configure exact stateful domains and CORS origins, and enforce resource authorization in Laravel.\n`
  if (stack.authentication === 'laravel-oidc') return `# Authentication Flow\n\nAn external OpenID Connect provider owns login, access/refresh-token issuance, rotation, revocation, and recovery. Clients use Authorization Code with PKCE. Laravel accepts access tokens only and must validate signature, issuer, audience, time, and permissions through the selected provider adapter. Refresh tokens never go to this API. The generated API remains fail closed until that adapter's credentials and verification tests are configured.\n`
  return `# Authentication Flow\n\nAn external OpenID Connect provider owns login, access/refresh token issuance, rotation, revocation, and recovery. Clients use Authorization Code with PKCE. Spring is an OAuth2 Resource Server: it accepts bearer access tokens and validates signature, issuer, audience, time, and authorities. Refresh tokens never go to the Spring resource API. Configure \`OIDC_ISSUER_URI\` and \`OIDC_AUDIENCE\`, then test invalid and authorized tokens.\n`
}

// ─── CI — template-driven ─────────────────────────────────────────────────────

async function generateCI(dest, stack, ciDir, answers, vars) {
  // Frontend CI — read from ci/{ciTemplate}.yml
  const feTpl = path.join(ciDir, `${stack.ciTemplate}.yml`)
  if (await fs.pathExists(feTpl)) {
    let content = await fs.readFile(feTpl, 'utf-8')
    if (answers.testing === 'none') {
      content = content.replace(/^\s*- run: npm (?:run )?test.*\n/gm, '')
    }
    if (stack.frontendKey === 'nextjs' && stack.backendKey !== 'supabase') {
      content = content.replace(/\n\s+env:\n\s+NEXT_PUBLIC_SUPABASE_URL:.*\n\s+NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:.*\n/, '\n')
    }
    if (stack.frontendKey === 'react' && stack.backendKey === 'supabase') {
      content = content.replace(
        '          VITE_API_URL: http://localhost:8080',
        '          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}\n          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}',
      )
    }
    if (answers.testing === 'full' && !stack.isMobile) {
      content += '      - name: Install Playwright browser\n        run: npx playwright install --with-deps chromium\n'
      content += '      - name: Run end-to-end tests\n        run: npm run test:e2e\n'
      if (stack.frontendKey === 'nextjs' && stack.backendKey === 'supabase') {
        content += '        env:\n          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}\n          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }}\n'
      }
    }
    await write(dest, `.github/workflows/ci-frontend.yml`, render(content, vars))
  }

  // Backend CI — always springboot.yml if backend is Spring Boot
  if (stack.needsPackage) {
    const beTpl = path.join(ciDir, 'springboot.yml')
    if (await fs.pathExists(beTpl)) {
      let content = await fs.readFile(beTpl, 'utf-8')
      if (answers.testing === 'none') {
        content = content.replace('      - name: Run tests\n        run: ./mvnw --batch-mode test\n', '')
      }
      await write(dest, `.github/workflows/ci-backend.yml`, render(content, vars))
    }
  }
}

// ─── Runnable application files ─────────────────────────────────────────────────

async function generateRunnableFiles(dest, answers, stack, vars) {
  const files = { ...buildRunnableFiles(answers, stack, vars), ...buildLaravelFiles(answers, stack, vars) }
  for (const [filePath, content] of Object.entries(files)) await write(dest, filePath, content)
  if (stack.backendKey === 'springboot') await fs.chmod(path.join(dest, 'backend/mvnw'), 0o755)
  if (stack.backendKey === 'laravel') {
    const artisan = stack.frontendKey === 'laravel-ui' || stack.frontendKey === 'no-frontend' ? 'artisan' : 'backend/artisan'
    await fs.chmod(path.join(dest, artisan), 0o755)
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function write(dest, filePath, content) {
  const fullPath = path.join(dest, filePath)
  await fs.ensureDir(path.dirname(fullPath))
  await fs.writeFile(fullPath, content, 'utf-8')
}

async function writeTemplate(dest, filePath, content, vars) {
  await write(dest, filePath, render(content, vars))
}
