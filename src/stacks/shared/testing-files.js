import path from 'node:path'

export function addTestingFiles(files, root, stack, level) {
  if (level === 'none') return
  if (stack.isMobile) {
    files[path.join(root, 'jest.config.js')] = "export default { preset: 'jest-expo' }\n"
    files[path.join(root, 'app/index.test.tsx')] = `import { render } from '@testing-library/react-native'\nimport HomeScreen from './index'\n\ntest('renders the starter heading', async () => {\n  const view = await render(<HomeScreen />)\n  expect(view.getByText('Your starter is running')).toBeTruthy()\n})\n`
    return
  }
  files[path.join(root, 'vitest.config.ts')] = `import { fileURLToPath, URL } from 'node:url'\nimport { defineConfig } from 'vitest/config'\n\nexport default defineConfig({\n  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },\n  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', exclude: ['e2e/**', 'node_modules/**'] },\n})\n`
  files[path.join(root, 'src/test/setup.ts')] = "import '@testing-library/jest-dom/vitest'\n"
  if (level === 'full') {
    files[path.join(root, 'playwright.config.ts')] = `import { defineConfig, devices } from '@playwright/test'\n\nexport default defineConfig({\n  testDir: './e2e',\n  use: { baseURL: 'http://127.0.0.1:${stack.frontendPort}' },\n  webServer: { command: 'npm run dev -- ${stack.frontendKey === 'nextjs' ? '--hostname' : '--host'} 127.0.0.1 --port ${stack.frontendPort}', url: 'http://127.0.0.1:${stack.frontendPort}', reuseExistingServer: true, timeout: 120_000 },\n  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],\n})\n`
    files[path.join(root, 'e2e/home.spec.ts')] = `import { expect, test } from '@playwright/test'\n\ntest('loads the starter', async ({ page }) => {\n  await page.goto('/')\n  await expect(page.getByRole('heading', { name: 'Your starter is running' })).toBeVisible()\n})\n`
  }
}
