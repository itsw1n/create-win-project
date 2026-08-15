// ─── Stack → Playbook Mapping ────────────────────────────────────────────────
// Defines which playbooks get merged into RULES.md per stack combo

export const STACK_PLAYBOOKS = {
  'nextjs-supabase': [
    'combo-rules/nextjs-supabase.md',
    'universal/coding-rules.md',
    'universal/git-conventions.md',
    'universal/typescript.md',
    'universal/error-handling.md',
    'universal/testing.md',
    'universal/folder-structure.md',
    'stack/nextjs.md',
    'database/supabase.md',
    'migration/supabase-cli.md',
  ],
  'nextjs-postgresql': [
    'combo-rules/nextjs-postgresql.md',
    'universal/coding-rules.md',
    'universal/git-conventions.md',
    'universal/typescript.md',
    'universal/error-handling.md',
    'universal/testing.md',
    'universal/folder-structure.md',
    'stack/nextjs.md',
    'database/postgresql.md',
    'migration/prisma.md',
  ],
  'nextjs-springboot': [
    'combo-rules/nextjs-springboot.md',
    'universal/coding-rules.md',
    'universal/git-conventions.md',
    'universal/typescript.md',
    'universal/error-handling.md',
    'universal/testing.md',
    'universal/folder-structure.md',
    'stack/nextjs.md',
    'stack/springboot.md',
    'database/postgresql.md',
    'migration/flyway.md',
  ],
  'react-springboot': [
    'combo-rules/react-springboot.md',
    'universal/coding-rules.md',
    'universal/git-conventions.md',
    'universal/typescript.md',
    'universal/error-handling.md',
    'universal/testing.md',
    'universal/folder-structure.md',
    'stack/react-vite.md',
    'stack/springboot.md',
    'database/postgresql.md',
    'migration/flyway.md',
  ],
  'react-supabase': [
    'combo-rules/react-supabase.md',
    'universal/coding-rules.md',
    'universal/git-conventions.md',
    'universal/typescript.md',
    'universal/error-handling.md',
    'universal/testing.md',
    'universal/folder-structure.md',
    'stack/react-vite.md',
    'database/supabase.md',
    'migration/supabase-cli.md',
  ],
}

// Styling playbooks added based on choice
export const STYLING_PLAYBOOKS = {
  tailwind: 'styling/tailwind-extensions.md',
  'css-modules': 'styling/css-modules-extensions.md',
}

// DevOps playbooks added based on answers
export const DEVOPS_PLAYBOOKS = {
  docker: 'devops/docker.md',
  makefile: 'devops/makefile.md',
  githubActions: 'devops/github-actions.md',
  prTemplate: 'devops/pr-template.md',
}

// ─── Folder Structures ────────────────────────────────────────────────────────

export const FOLDERS = {
  // Shared across ALL stacks
  shared: [
    'docs/api',
    'docs/architecture',
    'docs/guides',
    'docs/decisions',
  ],

  // Next.js frontend folders
  nextjs: [
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

  // React + Vite frontend folders
  'react-vite': [
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

  // Spring Boot backend folders
  springboot: [
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

  // Supabase migration folder
  supabase: [
    'supabase/migrations',
  ],

  // Prisma folder
  prisma: [
    'prisma/migrations',
  ],

  // GitHub Actions
  github: [
    '.github/workflows',
  ],
}

// ─── Stack metadata ───────────────────────────────────────────────────────────

export const STACK_META = {
  'nextjs-supabase': {
    label: 'Next.js + Supabase',
    frontend: 'nextjs',
    backend: null,
    database: 'supabase',
    migration: 'supabase-cli',
    needsDocker: false,
    frontendPort: 3000,
    backendPort: null,
  },
  'nextjs-postgresql': {
    label: 'Next.js + PostgreSQL (Prisma)',
    frontend: 'nextjs',
    backend: null,
    database: 'postgresql',
    migration: 'prisma',
    needsDocker: true,
    frontendPort: 3000,
    backendPort: null,
  },
  'nextjs-springboot': {
    label: 'Next.js + Spring Boot',
    frontend: 'nextjs',
    backend: 'springboot',
    database: 'postgresql',
    migration: 'flyway',
    needsDocker: true,
    frontendPort: 3000,
    backendPort: 8080,
  },
  'react-springboot': {
    label: 'React + Spring Boot',
    frontend: 'react-vite',
    backend: 'springboot',
    database: 'postgresql',
    migration: 'flyway',
    needsDocker: true,
    frontendPort: 5173,
    backendPort: 8080,
  },
  'react-supabase': {
    label: 'React + Supabase',
    frontend: 'react-vite',
    backend: null,
    database: 'supabase',
    migration: 'supabase-cli',
    needsDocker: false,
    frontendPort: 5173,
    backendPort: null,
  },
}
