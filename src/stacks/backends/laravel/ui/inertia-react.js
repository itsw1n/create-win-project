import { buildBladeUiComponents, buildLaravelAuthView, buildLaravelTailwindAssets } from './shared.js'

const php = (value) => `${value.trim()}\n`

export const inertiaReactUi = Object.freeze({
  id: 'inertia-react',
  label: 'Inertia + React',
  homeRoute: "Route::get('/', fn () => Inertia\\Inertia::render('Home'));",
  composerPackages: Object.freeze(['inertiajs/inertia-laravel']),
  middlewareImport: 'use App\\Http\\Middleware\\HandleInertiaRequests;',
  middleware: '        $middleware->web(append: [HandleInertiaRequests::class]);',
  files(answers, stack) {
    return {
      ...buildLaravelTailwindAssets(stack, true),
      ...buildBladeUiComponents(),
      ...buildLaravelAuthView(stack.authentication),
      'resources/js/app.jsx': `import { createInertiaApp } from '@inertiajs/react'\nimport { createRoot } from 'react-dom/client'\n\nconst pages = import.meta.glob('./Pages/**/*.jsx', { eager: true })\ncreateInertiaApp({ resolve: (name) => pages[\`./Pages/\${name}.jsx\`], setup({ el, App, props }) { createRoot(el).render(<App {...props} />) } })\n`,
      'resources/js/lib/cn.js': `import { clsx } from 'clsx'\nimport { twMerge } from 'tailwind-merge'\n\nexport function cn(...inputs) { return twMerge(clsx(inputs)) }\n`,
      'resources/js/components/layout/Container.jsx': `import { cn } from '../../lib/cn'\n\nexport function Container({ className, ...props }) { return <div data-ui="container" className={cn('mx-auto w-full max-w-5xl px-6 lg:px-8', className)} {...props} /> }\n`,
      'resources/js/components/layout/Section.jsx': `import { cn } from '../../lib/cn'\n\nexport function Section({ className, ui = 'section', ...props }) { return <section data-ui={ui} className={cn('py-16 sm:py-24', className)} {...props} /> }\n`,
      'resources/js/components/common/Button.jsx': `import { cva } from 'class-variance-authority'\nimport { cn } from '../../lib/cn'\n\nconst buttonVariants = cva('inline-flex items-center justify-center rounded-control font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50', { variants: { variant: { primary: 'bg-primary text-primary-foreground hover:bg-primary/90', secondary: 'bg-muted text-foreground hover:bg-muted/70' }, size: { medium: 'h-10 px-4 text-sm', large: 'h-12 px-6 text-base' } }, defaultVariants: { variant: 'primary', size: 'medium' } })\n\nexport function Button({ className, variant, size, type = 'button', ...props }) { return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} /> }\n`,
      'resources/js/components/common/Button.test.jsx': `import { render, screen } from '@testing-library/react'\nimport { expect, test } from 'vitest'\nimport { Button } from './Button'\n\ntest('renders an accessible disabled button', () => { render(<Button disabled>Save</Button>); expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled() })\n`,
      'resources/js/Pages/Home.jsx': `import { Container } from '../components/layout/Container'\nimport { Section } from '../components/layout/Section'\n\nexport default function Home() { return <main><Section ui="hero" className="min-h-screen"><Container className="space-y-4"><p className="text-sm font-semibold text-primary">create-win-project</p><h1 className="text-4xl font-bold tracking-tight sm:text-5xl">${answers.projectName}</h1><p className="max-w-2xl leading-7">Laravel + Inertia + React</p></Container></Section></main> }\n`,
      'resources/views/app.blade.php': '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">@viteReactRefresh @vite([\'resources/css/app.css\', \'resources/js/app.jsx\']) @inertiaHead</head><body>@inertia</body></html>\n',
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
