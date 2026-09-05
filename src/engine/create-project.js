import fs from 'fs-extra'
import path from 'path'
import { loadCatalog, resolveStack } from './load-library.js'
import { loadCompatibility } from './tested-versions.js'
import { buildRulesIndex, copySelectedPlaybooks } from './project-guidance.js'
import { buildVars, render, readTemplate } from './render-templates.js'
import { buildRunnableFiles } from '../../lib/scaffold.js'
import { buildLaravelFiles } from '../../lib/laravel-scaffold.js'
import {
  contextMd, progressMd, docPlaceholder,
  editorconfig, prettierrc, prTemplate,
} from './project-files.js'
import {
  projectDestinations,
  writeFile as write,
  writeProjectAtomically,
} from './write-files.js'
import { writeRenderedFile as writeTemplate } from './render-templates.js'

function laravelCompose(answers, stack, vars) {
  const laravelDir = stack.frontendKey === 'laravel-ui' || stack.frontendKey === 'no-frontend' ? '.' : './backend'
  const frontend = stack.frontendKey === 'react'
    ? `  frontend:\n    build:\n      context: ./frontend\n      dockerfile: Dockerfile.dev\n    ports:\n      - "\${FRONTEND_HOST_PORT:-5173}:5173"\n    volumes:\n      - ./frontend:/app\n      - frontend-node-modules:/app/node_modules\n    environment:\n      VITE_API_URL: http://backend:8000\n    depends_on:\n      - backend\n\n`
    : stack.frontendKey === 'nextjs'
      ? `  frontend:\n    build:\n      context: .\n      dockerfile: Dockerfile.dev\n    ports:\n      - "\${FRONTEND_HOST_PORT:-3000}:3000"\n    volumes:\n      - .:/app\n      - /app/backend\n      - frontend-node-modules:/app/node_modules\n    environment:\n      NEXT_PUBLIC_API_URL: http://backend:8000\n    depends_on:\n      - backend\n\n`
      : ''
  const frontendVolume = frontend ? '  frontend-node-modules:\n' : ''
  return `services:\n${frontend}  backend:\n    build:\n      context: ${laravelDir}\n      dockerfile: Dockerfile.dev\n    ports:\n      - "\${BACKEND_HOST_PORT:-8000}:8000"\n    volumes:\n      - ${laravelDir}:/app\n      - laravel-vendor:/app/vendor\n    environment:\n      APP_ENV: local\n      APP_DEBUG: "true"\n      APP_KEY: \${APP_KEY:-}\n      DB_CONNECTION: pgsql\n      DB_HOST: db\n      DB_PORT: 5432\n      DB_DATABASE: \${POSTGRES_DB}\n      DB_USERNAME: \${POSTGRES_USER}\n      DB_PASSWORD: \${POSTGRES_PASSWORD}\n    depends_on:\n      db:\n        condition: service_healthy\n\n  db:\n    image: ${vars.POSTGRES_IMAGE}\n    ports:\n      - "\${POSTGRES_HOST_PORT:-5432}:5432"\n    environment:\n      POSTGRES_DB: \${POSTGRES_DB}\n      POSTGRES_USER: \${POSTGRES_USER}\n      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}\n    volumes:\n      - postgres-data:/var/lib/postgresql/data\n    healthcheck:\n      test: ["CMD-SHELL", "pg_isready -U \${POSTGRES_USER} -d \${POSTGRES_DB}"]\n      interval: 5s\n      timeout: 5s\n      retries: 10\n\nvolumes:\n${frontendVolume}  laravel-vendor:\n  postgres-data:\n`
}

/**
 * Main entry point — generates the full project
 */
export async function generateProject(answers, cliRoot) {
  validateAnswers(answers)
  const { finalDestination, stagingDestination } = await projectDestinations(process.cwd(), answers.projectName)
  const playbooksDir = path.join(cliRoot, 'library')
  const ciDir        = path.join(cliRoot, 'templates', 'ci')
  const { profile }  = await loadCompatibility(
    path.join(cliRoot, 'library/tested-versions.json'),
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
  await writeProjectAtomically({
    finalDestination,
    stagingDestination,
    generate: async (dest) => {
    // 2. Staging folder. It is moved into place only after every generation
    // step succeeds, so failures never leave a half-written project.
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
    },
  })
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
  if (stack.backendKey === 'springboot') await write(dest, 'backend/.java-version', `${stack.profile.runtimes.java}\n`)
  if (stack.backendKey === 'laravel') {
    const laravelRoot = stack.frontendKey === 'laravel-ui' || stack.frontendKey === 'no-frontend' ? '' : 'backend/'
    await write(dest, `${laravelRoot}.php-version`, `${stack.profile.runtimes.php}\n`)
  }

  // Makefile — template-driven (web only)
  if (answers.makefile && !stack.isMobile) {
    const tpl = await readTemplate(templatesDir, 'makefile', stack.makefileTemplate, '.mk')
    if (tpl) await writeTemplate(dest, 'Makefile', tpl, vars)
  }

  // Docker — template-driven
  // Mobile frontends run through Expo, but a separate Laravel backend still
  // needs its backend and PostgreSQL services. laravelCompose intentionally
  // omits a frontend service for React Native.
  if (answers.docker && (!stack.isMobile || stack.backendKey === 'laravel')) {
    // docker-compose.yml
    let composeTpl = null
    if (stack.backendKey === 'laravel') {
      composeTpl = laravelCompose(answers, stack, vars)
    } else if (stack.needsPackage) {
      composeTpl = await readTemplate(templatesDir, 'docker/compose', 'springboot', '.yml')
    } else if (stack.backendKey === 'supabase') {
      composeTpl = await readTemplate(templatesDir, 'docker/compose', 'supabase', '.yml')
    } else {
      composeTpl = await readTemplate(templatesDir, 'docker/compose', 'postgres', '.yml')
    }
    if (composeTpl) await writeTemplate(dest, 'docker-compose.yml', composeTpl, vars)

    if (stack.backendKey === 'laravel') {
      const laravelRoot = stack.frontendKey === 'laravel-ui' || stack.frontendKey === 'no-frontend' ? '' : 'backend/'
      const dockerfileName = stack.frontendKey === 'laravel-ui' && stack.laravelUi === 'inertia-react' ? 'laravel-inertia.dev' : 'laravel.dev'
      const laravelDev = await readTemplate(templatesDir, 'docker/dockerfile', dockerfileName, '.dockerfile')
      if (laravelDev) await writeTemplate(dest, `${laravelRoot}Dockerfile.dev`, laravelDev, vars)
      const laravelProd = await readTemplate(templatesDir, 'docker/dockerfile', 'laravel.prod', '.dockerfile')
      if (laravelProd) await writeTemplate(dest, `${laravelRoot}Dockerfile`, laravelProd, vars)
    }

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

function toolchainGuide(answers, stack) {
  const javascriptRoot = stack.frontendKey === 'react' ? 'frontend/' : ''
  const hasJavaScript = stack.frontendKey !== 'no-frontend' &&
    !(stack.frontendKey === 'laravel-ui' && stack.laravelUi !== 'inertia-react')
  const rows = []
  if (hasJavaScript) {
    rows.push(`| Node.js | ${stack.profile.runtimes.nodeMinimum}+ (tested ${stack.profile.runtimes.node}) | JavaScript application | \`${javascriptRoot}.node-version\`, \`${javascriptRoot}package.json\` |`)
    rows.push(`| npm | ${stack.profile.runtimes.npmMinimum}+ | Local package scripts | \`${javascriptRoot}package.json#packageManager\`, \`${javascriptRoot}.npmrc\` |`)
  }
  if (stack.backendKey === 'springboot') {
    rows.push(`| Java | ${stack.profile.runtimes.java} | Host-run backend | \`backend/.java-version\`, \`backend/pom.xml\` |`)
    rows.push(`| Maven | ${stack.profile.runtimes.maven} | Optional globally; prefer the generated wrapper | \`backend/mvnw\` or \`backend/mvnw.cmd\` |`)
  }
  if (stack.backendKey === 'laravel') {
    const root = stack.frontendKey === 'laravel-ui' || stack.frontendKey === 'no-frontend' ? '' : 'backend/'
    rows.push(`| PHP | ${stack.profile.runtimes.php} | Host-run Laravel backend | \`${root}.php-version\` |`)
    rows.push(`| Composer | ${stack.profile.runtimes.composer} | Host-run Laravel backend | \`${root}composer.json\` |`)
  }
  if (answers.docker || ['supabase', 'postgres'].includes(stack.backendKey)) {
    rows.push('| Docker with Compose | Current supported release | Generated containers and local managed services | `docker-compose.yml` when selected |')
  }
  return `# Toolchain Requirements\n\nInstall only the tools required by the chosen local workflow. ESLint, Prettier, Prisma, TypeScript, and framework CLIs are project dependencies; run them through npm scripts or \`npx\`, never as global installations.\n\n| Tool | Version | When needed | Version source |\n|---|---|---|---|\n${rows.join('\n')}\n\nDependency retries run inside the generated package directory, so npm reads this project's own \`package.json\`, lockfile, engines, and \`.npmrc\`. Different projects can retain different tested dependency versions without global conflicts.\n\n## Host ports\n\nBefore starting containers, check whether the default ports are already in use (for example, \`ss -ltn\` on Linux). Override conflicts when launching Compose with \`FRONTEND_HOST_PORT\`, \`BACKEND_HOST_PORT\`, or \`POSTGRES_HOST_PORT\`; container ports and service-to-service addresses remain unchanged.\n`
}

function developmentEnvironmentGuide(answers, stack) {
  const mobile = stack.isMobile
    ? '\n## Mobile boundary\n\nRun Expo, the iOS Simulator or Android Emulator, and physical-device tooling on the host. Containers may run a selected backend and database, but they do not replace the local device/emulator workflow.\n'
    : ''
  const docker = answers.docker
    ? `\n## Optional Docker workflow\n\nDocker Engine 27 or newer with Docker Compose v2.30 or newer is recommended. Allocate at least 4 GB of memory and 10 GB of free disk space for images, caches, and databases. Check occupied ports before startup with \`ss -ltn\` (Linux) or your platform's equivalent.\n\n\`\`\`bash\ndocker compose config\ndocker compose build\ndocker compose up -d\n\`\`\`\n\nOverride host collisions with \`FRONTEND_HOST_PORT\`, \`BACKEND_HOST_PORT\`, and \`POSTGRES_HOST_PORT\`. Backend runtimes and databases stay inside containers, reducing the host tools you need.\n`
    : '\n## Adding Docker later\n\nDocker files were not selected. Re-run the generator for a fresh project with Docker enabled if you want isolated backend runtimes and databases; the normal host workflow remains fully supported.\n'
  return `# Development Environments\n\n## Default local workflow\n\nRun the generator directly on the host, then use the commands in \`setup.md\`. Docker is optional and is never required to run create-win-project itself. Local files and package-manager metadata remain the source of truth.\n${docker}${mobile}\n## Dev Containers\n\nA generic Dev Container is intentionally not generated: JavaScript, Java, PHP, and mobile stacks need different host/device boundaries. VS Code and Codespaces users can open the generated repository normally and add a stack-specific Dev Container later without changing the supported local or Compose workflows.\n`
}

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
  let setupGuide = (await fs.readFile(setupPath, 'utf8'))
    .replace('Node.js 20 or newer', `Node.js ${stack.profile.runtimes.nodeMinimum} or newer with npm ${stack.profile.runtimes.npmMinimum} or newer (tested on Node.js ${stack.profile.runtimes.node})`)
    .replace('Java 21 and Maven 3.9, or Docker', `Java ${stack.profile.runtimes.java}; Maven ${stack.profile.runtimes.maven} or Docker is used through the generated launcher`)
    .replace('PostgreSQL 16, or Docker', `PostgreSQL ${stack.profile.runtimes.postgres}, or Docker`)
    .replace('mvn spring-boot:run', './mvnw spring-boot:run  # use mvnw.cmd on Windows')
  if (stack.backendKey === 'springboot' && !answers.docker) {
    setupGuide = setupGuide.replace('docker compose up -d db', '# Start PostgreSQL on the host, then configure DATABASE_URL')
  }
  if (stack.backendKey === 'laravel') {
    const laravelDir = stack.frontendKey === 'laravel-ui' || stack.frontendKey === 'no-frontend' ? '' : 'backend/'
    const frontendSetup = stack.frontendKey === 'react'
      ? '\nIn another terminal:\n\n```bash\ncd frontend\nnpm install\nnpm run dev\n```\n'
      : stack.frontendKey === 'nextjs'
        ? '\nIn another terminal from the repository root:\n\n```bash\nnpm install\nnpm run dev\n```\n'
        : stack.frontendKey === 'laravel-ui' && stack.laravelUi === 'inertia-react'
          ? '\nIn another terminal from the repository root:\n\n```bash\nnpm install\nnpm run dev\n```\n'
          : ''
    setupGuide = `# Local Setup Guide\n\n## Default local setup\n\nUse PHP ${stack.profile.runtimes.php}, Composer ${stack.profile.runtimes.composer}, and PostgreSQL ${stack.profile.runtimes.postgres}.\n\n\`\`\`bash\ncd ${laravelDir || '.'}\ncomposer install\ncp .env.example .env\nphp artisan key:generate\nphp artisan migrate\nphp artisan serve\n\`\`\`\n${frontendSetup}${answers.docker ? `\n## Optional Docker setup\n\nFrom the repository root:\n\n\`\`\`bash\ndocker compose build\ndocker compose up -d\ndocker compose exec backend php artisan key:generate\ndocker compose exec backend php artisan migrate\n\`\`\`\n\nLater runs use \`docker compose up -d\`; rebuilding remains explicit.\n` : ''}\n## Validate\n\n\`\`\`bash\n${laravelDir ? `cd ${laravelDir}\n` : ''}composer check\n\`\`\`\n\nCommit \`composer.lock\`${stack.frontendKey === 'laravel-ui' && stack.laravelUi === 'inertia-react' ? ' and `package-lock.json`' : ''}.\n`
  }
  await fs.writeFile(setupPath, setupGuide, 'utf8')
  await write(dest, 'docs/guides/toolchain.md', toolchainGuide(answers, stack))
  await write(dest, 'docs/guides/development-environments.md', developmentEnvironmentGuide(answers, stack))

  const envLocation = stack.frontendKey === 'react' ? '`frontend/.env` for client values' : stack.isMobile ? '`.env`' : '`.env.local`'
  await write(dest, 'docs/guides/env-variables.md', `# Environment Variables\n\nCopy the generated example before starting. Client environment location: ${envLocation}.\n\n| Variable | Visibility | Required | Purpose |\n|---|---|---:|---|\n${stack.env.map((name) => `| \`${name}\` | ${name.startsWith(stack.envPrefix) ? 'client/public' : 'server only'} | yes | ${environmentPurpose(name)} |`).join('\n')}\n\nValues with \`${stack.envPrefix}\` are bundled into client code and must never contain secrets. Keep real environment files out of version control.\n`)

  await write(dest, 'docs/architecture/overview.md', `# Architecture Overview\n\n## Runtime shape\n\n- Frontend: ${stack.frontendLabel}\n- Backend/data: ${stack.backendLabel}\n- Platform: ${stack.platform}\n- Architecture profile: ${stack.architecture}\n- Authentication: ${stack.authentication}\n\nThe generated application is intentionally a small vertical slice. Add domain features only after recording product goals and boundaries in \`CONTEXT.md\`. Keep entry points thin, validate at trust boundaries, and enforce authorization beside protected data or side effects.\n\n## Verification boundary\n\nThe starter is considered healthy when its lint/typecheck/tests/build commands pass. Documentation explains those executable patterns; it does not override working code and tests.\n`)

  await write(dest, 'docs/architecture/auth-flow.md', authDocumentation(stack))

  const health = stack.backendKey === 'springboot'
    ? 'GET http://localhost:8080/api/health'
    : stack.backendKey === 'laravel'
      ? 'GET http://localhost:8000/api/health'
      : stack.frontendKey === 'nextjs' ? 'GET /api/health' : '(No custom HTTP API is generated for this client-only starter.)'
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
  if (name === 'AUTH0_DOMAIN') return 'Trusted Auth0 tenant domain used for access-token signature and issuer validation.'
  if (name === 'AUTH0_AUDIENCE') return 'Exact API audience required in accepted Auth0 access tokens.'
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
  if (stack.authentication === 'laravel-oidc') return `# Authentication Flow\n\nAuth0 owns login, access/refresh-token issuance, rotation, revocation, and recovery. Clients use Authorization Code with PKCE. Laravel uses the pinned Auth0 resource-server adapter to accept access tokens only and validate signature, issuer, audience, and time claims. Refresh tokens never go to this API. Configure \`AUTH0_DOMAIN\` and \`AUTH0_AUDIENCE\`; resource ownership and permission checks remain application responsibilities.\n`
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
  if (stack.backendKey === 'laravel') {
    const beTpl = path.join(ciDir, 'laravel.yml')
    if (await fs.pathExists(beTpl)) {
      let content = await fs.readFile(beTpl, 'utf-8')
      if (answers.testing === 'none') content = content.replace('      - run: composer check\n', '      - run: composer format:check\n      - run: composer analyse\n')
      if (stack.frontendKey === 'laravel-ui' && stack.laravelUi === 'inertia-react') {
        content += `      - uses: actions/setup-node@v4\n        with:\n          node-version: "${stack.profile.runtimes.node}"\n          cache: npm\n          cache-dependency-path: package-lock.json\n      - run: npm ci\n      - run: npm run build\n`
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
