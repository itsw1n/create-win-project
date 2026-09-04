/**
 * Builds the files owned by the Next.js frontend. Shared package, testing,
 * feature, and backend integration builders are injected by the scaffold
 * composer so this stack does not depend on unrelated implementations.
 */
export function buildNextjsFiles(answers, stack, shared) {
  const files = {}
  files['package.json'] = shared.packageFile(answers, stack)
  files['tsconfig.json'] = shared.json({
    compilerOptions: {
      target: 'ES2017', lib: ['dom', 'dom.iterable', 'esnext'], allowJs: false,
      skipLibCheck: true, strict: true, noEmit: true, esModuleInterop: true,
      module: 'esnext', moduleResolution: 'bundler', resolveJsonModule: true,
      isolatedModules: true, jsx: 'react-jsx', incremental: true,
      plugins: [{ name: 'next' }], paths: { '@/*': ['./src/*'] },
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts', '.next/dev/types/**/*.ts'],
    exclude: ['node_modules'],
  })
  files['next-env.d.ts'] = "/// <reference types=\"next\" />\n/// <reference types=\"next/image-types/global\" />\n"
  files['eslint.config.mjs'] = "import { defineConfig, globalIgnores } from 'eslint/config'\nimport nextVitals from 'eslint-config-next/core-web-vitals'\nimport nextTs from 'eslint-config-next/typescript'\n\nexport default defineConfig([\n  ...nextVitals,\n  ...nextTs,\n  globalIgnores(['.next/**', 'out/**', 'next-env.d.ts']),\n])\n"
  files['next.config.ts'] = `import type { NextConfig } from 'next'\n\nconst securityHeaders = [\n  { key: 'X-Content-Type-Options', value: 'nosniff' },\n  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },\n  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },\n  { key: 'X-Frame-Options', value: 'DENY' },\n]\n\nconst nextConfig: NextConfig = {\n  reactStrictMode: true,\n  output: 'standalone',\n  async headers() { return [{ source: '/(.*)', headers: securityHeaders }] },\n}\n\nexport default nextConfig\n`
  files['postcss.config.mjs'] = stack.styleId === 'tailwind'
    ? "const config = { plugins: { '@tailwindcss/postcss': {} } }\nexport default config\n"
    : "const config = { plugins: {} }\nexport default config\n"
  files['src/app/globals.css'] = `${stack.styleId === 'tailwind' ? '@import "tailwindcss";\n\n' : ''}:root { color-scheme: light dark; font-family: system-ui, sans-serif; }\n* { box-sizing: border-box; }\nbody { margin: 0; min-height: 100vh; }\nmain { max-width: 48rem; margin: 0 auto; padding: 4rem 1.5rem; }\na { color: inherit; }\n`
  files['src/app/layout.tsx'] = `import type { Metadata } from 'next'\nimport type { ReactNode } from 'react'\nimport './globals.css'\n\nexport const metadata: Metadata = { title: ${JSON.stringify(answers.projectName)}, description: ${JSON.stringify(answers.projectDescription)} }\n\nexport default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {\n  return <html lang="en"><body>{children}</body></html>\n}\n`
  files['src/app/page.tsx'] = stack.architecture === 'small'
    ? `export default function HomePage() {\n  return (\n    <main>\n      <p>create-win-project</p>\n      <h1>Your starter is running</h1>\n      <p>{${JSON.stringify(answers.projectDescription)}}</p>\n      <p>Read <code>AGENTS.md</code> before your first agent-assisted change.</p>\n    </main>\n  )\n}\n`
    : `${stack.architecture === 'large'
      ? "import { getStarterStatus, StarterStatus } from '@/features/status'"
      : "import { StarterStatus } from '@/features/status/components/StarterStatus'\nimport { getStarterStatus } from '@/features/status/services/getStarterStatus'"}\n\nexport default function HomePage() {\n  const status = getStarterStatus()\n  return <main><p>create-win-project</p><StarterStatus status={status} /><p>{${JSON.stringify(answers.projectDescription)}}</p><p>Read <code>AGENTS.md</code> before your first agent-assisted change.</p></main>\n}\n`
  files['src/app/api/health/route.ts'] = "export function GET() {\n  return Response.json({ status: 'ok' })\n}\n"
  files['src/app/page.test.tsx'] = `import { expect, test } from 'vitest'\nimport { render, screen } from '@testing-library/react'\nimport HomePage from './page'\n\ntest('renders the starter heading', () => {\n  render(<HomePage />)\n  expect(screen.getByRole('heading', { name: 'Your starter is running' })).toBeInTheDocument()\n})\n`
  if ((answers.testing || 'basic') === 'none') delete files['src/app/page.test.tsx']
  shared.testFiles(files, '', stack, answers.testing || 'basic')
  Object.assign(files, shared.statusFeatureFiles('', stack))
  if (stack.backendKey === 'supabase') Object.assign(files, shared.supabaseWebFiles(true, stack.authentication === 'supabase'))
  if (stack.backendKey === 'postgres') Object.assign(files, shared.prismaFiles())
  return files
}
