import { packageVersion } from '../../../../engine/tested-versions.js'
import { buildLaravelAuthView } from './shared.js'

const php = (value) => `${value.trim()}\n`
const json = (value) => `${JSON.stringify(value, null, 2)}\n`

export const inertiaReactUi = Object.freeze({
  id: 'inertia-react',
  label: 'Inertia + React',
  homeRoute: "Route::get('/', fn () => Inertia\\Inertia::render('Home'));",
  composerPackages: Object.freeze(['inertiajs/inertia-laravel']),
  middlewareImport: 'use App\\Http\\Middleware\\HandleInertiaRequests;',
  middleware: '        $middleware->web(append: [HandleInertiaRequests::class]);',
  files(answers, stack) {
    const npm = (name) => packageVersion(stack.profile, name, 'laravel-ui', 'Laravel Inertia scaffold')
    return {
      ...buildLaravelAuthView(stack.authentication),
      'package.json': json({ private: true, type: 'module', packageManager: `npm@${stack.profile.runtimes.npmMinimum}`, engines: { node: `>=${stack.profile.runtimes.nodeMinimum}`, npm: `>=${stack.profile.runtimes.npmMinimum}` }, scripts: { dev: 'vite', build: 'vite build' }, dependencies: { '@inertiajs/react': npm('@inertiajs/react'), react: npm('react'), 'react-dom': npm('react-dom') }, devDependencies: { '@vitejs/plugin-react': npm('@vitejs/plugin-react'), 'laravel-vite-plugin': npm('laravel-vite-plugin'), vite: npm('vite') } }),
      '.node-version': `${stack.profile.runtimes.node}\n`,
      '.npmrc': 'engine-strict=true\n',
      'vite.config.js': `import { defineConfig } from 'vite'\nimport laravel from 'laravel-vite-plugin'\nimport react from '@vitejs/plugin-react'\n\nexport default defineConfig({ plugins: [laravel({ input: 'resources/js/app.jsx', refresh: true }), react()] })\n`,
      'resources/js/app.jsx': `import { createInertiaApp } from '@inertiajs/react'\nimport { createRoot } from 'react-dom/client'\n\nconst pages = import.meta.glob('./Pages/**/*.jsx', { eager: true })\ncreateInertiaApp({ resolve: (name) => pages[\`./Pages/\${name}.jsx\`], setup({ el, App, props }) { createRoot(el).render(<App {...props} />) } })\n`,
      'resources/js/Pages/Home.jsx': `export default function Home() { return <main><h1>${answers.projectName}</h1><p>Laravel + Inertia + React</p></main> }\n`,
      'resources/views/app.blade.php': '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">@viteReactRefresh @vite(\'resources/js/app.jsx\') @inertiaHead</head><body>@inertia</body></html>\n',
      'app/Http/Middleware/HandleInertiaRequests.php': php(`<?php

namespace App\\Http\\Middleware;

use Inertia\\Middleware;

final class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';
}`),
    }
  },
})
