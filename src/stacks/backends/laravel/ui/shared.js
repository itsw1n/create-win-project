import { usesLaravelSession } from '../auth/session.js'
import { packageVersion } from '../../../shared/javascript-package.js'

const json = (value) => `${JSON.stringify(value, null, 2)}\n`

export function buildLaravelTailwindAssets(stack, react = false) {
  const npm = (name) => packageVersion(stack.profile, name, 'laravel-ui')
  const scripts = { dev: 'vite', build: 'vite build' }
  const dependencies = react
    ? {
        '@inertiajs/react': npm('@inertiajs/react'),
        'class-variance-authority': npm('class-variance-authority'),
        clsx: npm('clsx'),
        react: npm('react'),
        'react-dom': npm('react-dom'),
        'tailwind-merge': npm('tailwind-merge'),
      }
    : {}
  const devDependencies = {
    '@tailwindcss/vite': npm('@tailwindcss/vite'),
    'laravel-vite-plugin': npm('laravel-vite-plugin'),
    tailwindcss: npm('tailwindcss'),
    vite: npm('vite'),
  }
  if (react) {
    scripts.test = 'vitest run'
    Object.assign(devDependencies, {
      '@testing-library/jest-dom': npm('@testing-library/jest-dom'),
      '@testing-library/react': npm('@testing-library/react'),
      '@vitejs/plugin-react': npm('@vitejs/plugin-react'),
      jsdom: npm('jsdom'),
      vitest: npm('vitest'),
    })
  }
  const input = react ? "['resources/css/app.css', 'resources/js/app.jsx']" : "'resources/css/app.css'"
  const reactPlugin = react ? "import react from '@vitejs/plugin-react'\n" : ''
  const plugins = react ? ', react()' : ''
  const files = {
    'package.json': json({
      private: true,
      type: 'module',
      packageManager: `npm@${stack.profile.runtimes.npmMinimum}`,
      engines: { node: `>=${stack.profile.runtimes.nodeMinimum}`, npm: `>=${stack.profile.runtimes.npmMinimum}` },
      scripts,
      dependencies,
      devDependencies,
    }),
    '.node-version': `${stack.profile.runtimes.node}\n`,
    '.npmrc': 'engine-strict=true\n',
    'vite.config.js': `import { defineConfig } from 'vite'\nimport laravel from 'laravel-vite-plugin'\nimport tailwindcss from '@tailwindcss/vite'\n${reactPlugin}\nexport default defineConfig({ plugins: [laravel({ input: ${input}, refresh: true }), tailwindcss()${plugins}] })\n`,
    'resources/css/app.css': `@import "tailwindcss";
@source "../views/**/*.blade.php";
@source "../js/**/*.jsx";

@theme {
  --color-background: #f8fafc;
  --color-foreground: #0f172a;
  --color-surface: #ffffff;
  --color-muted: #e2e8f0;
  --color-primary: #2563eb;
  --color-primary-foreground: #ffffff;
  --radius-control: 0.5rem;
}

@layer base {
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; background: var(--color-background); color: var(--color-foreground); font-family: Arial, Helvetica, sans-serif; }
  a { color: inherit; }
}
`,
  }
  if (react) {
    files['vitest.config.js'] = `import { defineConfig } from 'vitest/config'\nimport react from '@vitejs/plugin-react'\n\nexport default defineConfig({ plugins: [react()], test: { environment: 'jsdom', setupFiles: './resources/js/test/setup.js' } })\n`
    files['resources/js/test/setup.js'] = "import '@testing-library/jest-dom/vitest'\n"
  }
  return files
}

export function buildBladeUiComponents() {
  return {
    'resources/views/components/layout/container.blade.php': '<div data-ui="container" {{ $attributes->class([\'mx-auto w-full max-w-5xl px-6 lg:px-8\']) }}>{{ $slot }}</div>\n',
    'resources/views/components/layout/section.blade.php': "@props(['ui' => 'section'])\n<section data-ui=\"{{ $ui }}\" {{ $attributes->class(['py-16 sm:py-24']) }}>{{ $slot }}</section>\n",
    'resources/views/components/common/button.blade.php': "@props(['type' => 'button', 'variant' => 'primary'])\n@php($classes = $variant === 'secondary' ? 'bg-muted text-foreground hover:bg-muted/70' : 'bg-primary text-primary-foreground hover:bg-primary/90')\n<button data-ui=\"button\" type=\"{{ $type }}\" {{ $attributes->class(['inline-flex min-h-10 items-center justify-center rounded-control px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50', $classes]) }}>{{ $slot }}</button>\n",
    'tests/Feature/UiComponentsTest.php': `<?php

use Illuminate\Support\Facades\Blade;

it('renders the shared button component', function () {
    expect(Blade::render('<x-common.button>Save</x-common.button>'))
        ->toContain('data-ui="button"')
        ->toContain('Save');
});
`,
  }
}

export function buildLaravelAuthView(authentication) {
  if (!usesLaravelSession(authentication)) return {}
  return {
    'resources/views/auth/login.blade.php': '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Log in</title>@vite(\'resources/css/app.css\')</head><body><main><x-layout.section ui="login"><x-layout.container><h1 class="text-4xl font-bold">Log in</h1><form class="mt-8 grid max-w-md gap-4" method="POST" action="/login">@csrf<label class="grid gap-2">Email <input class="rounded-control border border-muted bg-surface px-3 py-2" name="email" type="email" autocomplete="email" required></label><label class="grid gap-2">Password <input class="rounded-control border border-muted bg-surface px-3 py-2" name="password" type="password" autocomplete="current-password" required></label><x-common.button type="submit">Log in</x-common.button></form></x-layout.container></x-layout.section></main></body></html>\n',
  }
}

export function laravelLoginNavigation(authentication) {
  return usesLaravelSession(authentication)
    ? '<nav data-ui="account-navigation" class="mx-auto flex max-w-5xl justify-end px-6 py-4">@auth <form method="POST" action="/logout">@csrf<x-common.button variant="secondary" type="submit">Log out</x-common.button></form> @else <a class="font-medium text-primary" href="/login">Log in</a> @endauth</nav>'
    : ''
}
