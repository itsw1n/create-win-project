import { html, json } from '../../shared/javascript-package.js'
import { addTestingFiles } from '../../shared/testing-files.js'
import { packageFile } from './dependencies.js'

export function buildReactViteFiles(answers, stack, shared) {
  const root = 'frontend'
  const files = {}
  files[`${root}/package.json`] = packageFile(answers, stack)
  files[`${root}/.node-version`] = `${stack.profile.runtimes.node}\n`
  files[`${root}/.npmrc`] = 'engine-strict=true\n'
  files[`${root}/tsconfig.json`] = json({ compilerOptions: { target: 'ES2022', useDefineForClassFields: true, lib: ['ES2022', 'DOM', 'DOM.Iterable'], allowJs: false, skipLibCheck: true, esModuleInterop: true, allowSyntheticDefaultImports: true, strict: true, forceConsistentCasingInFileNames: true, module: 'ESNext', moduleResolution: 'Bundler', resolveJsonModule: true, isolatedModules: true, noEmit: true, jsx: 'react-jsx', paths: { '@/*': ['./src/*'] } }, include: ['src', 'vite.config.ts', 'vitest.config.ts'] })
  files[`${root}/index.html`] = `<!doctype html>\n<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><meta name="description" content="${html(answers.projectDescription)}" /><title>${html(answers.projectName)}</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n`
  files[`${root}/vite.config.ts`] = `import { fileURLToPath, URL } from 'node:url'\nimport { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\n${stack.styleId === 'tailwind' ? "import tailwindcss from '@tailwindcss/vite'\n" : ''}\nexport default defineConfig({\n  plugins: [react()${stack.styleId === 'tailwind' ? ', tailwindcss()' : ''}],\n  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },\n})\n`
  files[`${root}/eslint.config.js`] = `import js from '@eslint/js'\nimport tseslint from 'typescript-eslint'\n\nexport default tseslint.config(\n  { ignores: ['dist', 'coverage', 'playwright-report'] },\n  js.configs.recommended,\n  ...tseslint.configs.recommended,\n  { files: ['**/*.{ts,tsx}'], languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } },\n)\n`
  files[`${root}/src/vite-env.d.ts`] = "/// <reference types=\"vite/client\" />\n"
  files[`${root}/src/main.tsx`] = `import { StrictMode } from 'react'\nimport { createRoot } from 'react-dom/client'\nimport { App } from './App'\nimport './styles.css'\n\ncreateRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)\n`
  files[`${root}/src/App.tsx`] = stack.architecture === 'small'
    ? `export function App() {\n  return <main><p>create-win-project</p><h1>Your starter is running</h1><p>{${JSON.stringify(answers.projectDescription)}}</p><p>Read <code>AGENTS.md</code> before your first agent-assisted change.</p></main>\n}\n`
    : `${stack.architecture === 'large'
      ? "import { getStarterStatus, StarterStatus } from '@/features/status'"
      : "import { StarterStatus } from '@/features/status/components/StarterStatus'\nimport { getStarterStatus } from '@/features/status/services/getStarterStatus'"}\n\nexport function App() {\n  const status = getStarterStatus()\n  return <main><p>create-win-project</p><StarterStatus status={status} /><p>{${JSON.stringify(answers.projectDescription)}}</p><p>Read <code>AGENTS.md</code> before your first agent-assisted change.</p></main>\n}\n`
  files[`${root}/src/styles.css`] = `${stack.styleId === 'tailwind' ? '@import "tailwindcss";\n' : ''}:root { color-scheme: light dark; font-family: system-ui, sans-serif; }\n* { box-sizing: border-box; }\nbody { margin: 0; }\nmain { max-width: 48rem; margin: 0 auto; padding: 4rem 1.5rem; }\n`
  if ((answers.testing || 'basic') !== 'none') files[`${root}/src/App.test.tsx`] = `import { expect, test } from 'vitest'\nimport { render, screen } from '@testing-library/react'\nimport { App } from './App'\n\ntest('renders the starter heading', () => {\n  render(<App />)\n  expect(screen.getByRole('heading', { name: 'Your starter is running' })).toBeInTheDocument()\n})\n`
  addTestingFiles(files, root, stack, answers.testing || 'basic')
  Object.assign(files, shared.statusFeatureFiles(root, stack))
  return files
}
