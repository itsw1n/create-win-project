// ─── Frontend Catalog ────────────────────────────────────────────────────────
// Each frontend declares its stack playbook, folder layout, port, and which
// backends/databases it can pair with.

export const FRONTENDS = {
  nextjs: {
    label: 'Next.js',
    frontendDir: '',
    frontendPort: 3000,
    stackPlaybook: 'stack/nextjs.md',
    allows: ['supabase', 'springboot', 'postgres'],
    folders: [
      'src/app',
      'src/features',
      'src/components/ui',
      'src/components/shared',
      'src/components/layout',
      'src/lib',
      'src/stores',
      'src/hooks',
      'src/types',
      'src/schemas',
      'src/constants',
      'e2e',
      'public',
    ],
  },
  react: {
    label: 'React + Vite',
    frontendDir: 'frontend',
    frontendPort: 5173,
    stackPlaybook: 'stack/react-vite.md',
    allows: ['supabase', 'springboot'],
    folders: [
      'frontend/src/app',
      'frontend/src/pages',
      'frontend/src/features',
      'frontend/src/components/ui',
      'frontend/src/components/shared',
      'frontend/src/components/layout',
      'frontend/src/components/forms',
      'frontend/src/stores',
      'frontend/src/lib',
      'frontend/src/hooks',
      'frontend/src/types',
      'frontend/src/constants',
      'frontend/e2e',
      'frontend/public',
    ],
  },
}

// ─── Backend / Database Catalog ──────────────────────────────────────────────
// Each backend declares which playbooks, folders, and docker settings apply.

export const BACKENDS = {
  supabase: {
    label: 'Supabase',
    needsDocker: false,
    backendPort: null,
    playbooks: ['database/supabase.md', 'migration/supabase-cli.md'],
    folders: ['supabase/migrations'],
  },
  postgres: {
    label: 'PostgreSQL (Prisma)',
    needsDocker: true,
    backendPort: null,
    playbooks: ['database/postgresql.md', 'migration/prisma.md'],
    folders: ['prisma/migrations'],
  },
  springboot: {
    label: 'Spring Boot',
    needsDocker: true,
    backendPort: 8080,
    playbooks: ['stack/springboot.md', 'database/postgresql.md', 'migration/flyway.md'],
    folders: [
      'backend/src/main/java/{{PACKAGE_PATH}}/auth/dto',
      'backend/src/main/java/{{PACKAGE_PATH}}/auth/entity',
      'backend/src/main/java/{{PACKAGE_PATH}}/config',
      'backend/src/main/java/{{PACKAGE_PATH}}/common/exception',
      'backend/src/main/java/{{PACKAGE_PATH}}/common/response',
      'backend/src/main/java/{{PACKAGE_PATH}}/common/jwt',
      'backend/src/main/java/{{PACKAGE_PATH}}/common/audit',
      'backend/src/main/resources/db/migration',
      'backend/src/main/resources/db/dev',
      'backend/src/test/java/{{PACKAGE_PATH}}',
    ],
  },
}

// ─── Combo Constraints ───────────────────────────────────────────────────────
// Combo-specific integration knowledge, expressed as data. These are the rules
// a bare merge would NOT produce on its own. Applied when `when` matches the
// frontend and/or backend keys.

export const CONSTRAINTS = [
  {
    when: { backend: 'springboot' },
    rules: [
      'Next.js/React is a PURE FRONTEND — never query the database from server actions, components, or the SPA',
      'All data flows over HTTP: fetch()/Axios → Spring Boot REST API',
      'Spring Boot owns ALL business logic, auth (JWT), and data access',
      'Auth tokens come from Spring Boot and are attached to every request',
    ],
  },
  {
    when: { frontend: 'nextjs', backend: 'supabase' },
    rules: [
      'Server Components and Server Actions talk to Supabase directly — no API route for initial data',
      'No Axios — the Supabase client replaces all HTTP calls',
      'RLS is the security boundary — never rely on the UI for authorization',
      'Never use the service role key from the browser; server-only access goes through admin/server clients',
      'Docker not required locally — use the Supabase CLI',
      'Migrations are SQL files in supabase/migrations',
    ],
  },
  {
    when: { frontend: 'react', backend: 'supabase' },
    rules: [
      'SPA exposes everything to the browser — NEVER use the service role key client-side',
      'RLS policies enforce authorization at the database level',
      'No Docker needed — Supabase CLI for local dev',
      'Browser client (anon key) handles authenticated calls',
    ],
  },
  {
    when: { frontend: 'nextjs', backend: 'postgres' },
    rules: [
      'Prisma is the ORM — not JPA, not Supabase client',
      'Server Components read via Prisma directly; client fetches go through API routes + TanStack Query',
      'Auth is custom JWT via API routes OR NextAuth.js',
      'Docker runs PostgreSQL only — Next.js runs locally',
      'Prisma Migrate manages schema',
      'Never return password/sensitive fields — always explicit select',
    ],
  },
  {
    when: { frontend: 'react', backend: 'springboot' },
    rules: [
      'Monorepo: frontend/ (React + Vite) + backend/ (Spring Boot)',
      'Client components use Axios → Spring Boot endpoint',
      'Custom JWT via Spring Boot; Flyway manages all migrations',
      'Full Docker: React + Spring Boot + PostgreSQL (3 services)',
    ],
  },
  {
    when: { frontend: 'nextjs', backend: 'springboot' },
    rules: [
      'Next.js is a pure frontend — no server actions hitting the DB, no Prisma, no Supabase',
      'Server Components fetch from Spring Boot via the shared server fetch helper (lib/fetch.ts)',
      'Client Components use TanStack Query + Axios → Spring Boot',
      'Full Docker: Next.js + Spring Boot + PostgreSQL (3 services)',
    ],
  },
]

// ─── Universal playbooks applied to every project ────────────────────────────

export const UNIVERSAL_PLAYBOOKS = [
  'universal/coding-rules.md',
  'universal/git-conventions.md',
  'universal/typescript.md',
  'universal/error-handling.md',
  'universal/testing.md',
  'universal/folder-structure.md',
]

// ─── Styling playbooks added based on choice ─────────────────────────────────

export const STYLING_PLAYBOOKS = {
  tailwind: 'styling/tailwind-extensions.md',
  'css-modules': 'styling/css-modules-extensions.md',
}

// ─── DevOps playbooks added based on answers ─────────────────────────────────

export const DEVOPS_PLAYBOOKS = {
  docker: 'devops/docker.md',
  makefile: 'devops/makefile.md',
  githubActions: 'devops/github-actions.md',
  prTemplate: 'devops/pr-template.md',
}

// ─── Folder structures shared across ALL stacks ──────────────────────────────

export const FOLDERS = {
  shared: [
    'docs/api',
    'docs/architecture',
    'docs/guides',
    'docs/decisions',
  ],
  github: [
    '.github/workflows',
  ],
}

// ─── Compose ─────────────────────────────────────────────────────────────────
// Build the full stack descriptor for a chosen (frontend, backend) pair.

export function composeStack(frontendKey, backendKey, answers = {}) {
  const frontend = FRONTENDS[frontendKey]
  const backend = BACKENDS[backendKey]

  if (!frontend) throw new Error(`Unknown frontend: ${frontendKey}`)
  if (!backend) throw new Error(`Unknown backend: ${backendKey}`)
  if (!frontend.allows.includes(backendKey)) {
    throw new Error(`${frontend.label} cannot pair with ${backend.label}`)
  }

  const styleMode = (answers.styling === 'tailwind' ? 'tailwind' : 'css-modules')

  const playbooks = [
    ...UNIVERSAL_PLAYBOOKS,
    frontend.stackPlaybook,
    ...backend.playbooks,
  ]
  if (styleMode && STYLING_PLAYBOOKS[styleMode]) playbooks.push(STYLING_PLAYBOOKS[styleMode])
  if (answers.docker) playbooks.push(DEVOPS_PLAYBOOKS.docker)
  if (answers.makefile) playbooks.push(DEVOPS_PLAYBOOKS.makefile)
  if (answers.githubActions) {
    playbooks.push(DEVOPS_PLAYBOOKS.githubActions)
    playbooks.push(DEVOPS_PLAYBOOKS.prTemplate)
  }

  const constraints = CONSTRAINTS
    .filter((c) => {
      const when = c.when
      if (when.frontend && when.frontend !== frontendKey) return false
      if (when.backend && when.backend !== backendKey) return false
      return true
    })
    .flatMap((c) => c.rules)

  const folders = [
    ...FOLDERS.shared,
    ...FOLDERS.github,
    ...frontend.folders,
    ...backend.folders,
  ].map((f) => f.replace(/\{\{PACKAGE_PATH\}\}/g, (answers.packageName ?? 'com.app').replace(/\./g, '/')))

  return {
    key: `${frontendKey}-${backendKey}`,
    frontendKey,
    backendKey,
    label: `${frontend.label} + ${backend.label}`,
    frontendLabel: frontend.label,
    backendLabel: backend.label,
    frontendDir: frontend.frontendDir,
    frontendPort: String(frontend.frontendPort),
    backendPort: backend.backendPort ? String(backend.backendPort) : '',
    needsDocker: backend.needsDocker,
    isNextjs: frontendKey === 'nextjs',
    isReact: frontendKey === 'react',
    isSpringBoot: backendKey === 'springboot',
    isSupabase: backendKey === 'supabase',
    isPrisma: backendKey === 'postgres',
    playbooks,
    folders,
    constraints,
  }
}