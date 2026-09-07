function tailwindFiles(answers, stack) {
  const files = {
    'src/app/globals.css': `@import "tailwindcss";

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
    'src/lib/cn.ts': `import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
`,
    'src/components/layout/Container.tsx': `import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export function Container({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-ui="container" className={cn('mx-auto w-full max-w-5xl px-6 lg:px-8', className)} {...props} />
}
`,
    'src/components/layout/Section.tsx': `import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type SectionProps = HTMLAttributes<HTMLElement> & { ui?: string }

export function Section({ className, ui = 'section', ...props }: SectionProps) {
  return <section data-ui={ui} className={cn('py-16 sm:py-24', className)} {...props} />
}
`,
    'src/components/common/Button.tsx': `import type { ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-control font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-muted text-foreground hover:bg-muted/70',
      },
      size: {
        medium: 'h-10 px-4 text-sm',
        large: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'medium' },
  },
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
`,
  }

  if (stack.architecture !== 'small') {
    files['src/features/status/components/StarterStatus.tsx'] = `import type { StarterStatus as Status } from '../types'

export function StarterStatus({ status }: { status: Status }) {
  return <div data-ui="starter-status" className="space-y-3"><h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{status.heading}</h1><p className="text-sm font-medium text-primary">Architecture: {status.profile}</p></div>
}
`
  }

  if ((answers.testing || 'basic') !== 'none') {
    files['src/components/common/Button.test.tsx'] = `import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Button } from './Button'

test('renders an accessible disabled button', () => {
  render(<Button disabled>Save</Button>)
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
})
`
  }

  files['src/app/page.tsx'] = pageFile(answers, stack, 'tailwind')
  return files
}

function cssModuleFiles(answers, stack) {
  const files = {
    'src/styles/tokens.css': `:root {
  --color-background: #f8fafc;
  --color-foreground: #0f172a;
  --color-surface: #ffffff;
  --color-muted: #e2e8f0;
  --color-primary: #2563eb;
  --color-primary-foreground: #ffffff;
  --radius-control: 0.5rem;
}
`,
    'src/styles/reset.css': `*, *::before, *::after { box-sizing: border-box; }
body, h1, h2, p { margin: 0; }
button, input, textarea, select { font: inherit; }
`,
    'src/styles/base.css': `body {
  min-height: 100vh;
  background: var(--color-background);
  color: var(--color-foreground);
  font-family: Arial, Helvetica, sans-serif;
}
a { color: inherit; }
`,
    'src/app/globals.css': `@import '../styles/tokens.css';
@import '../styles/reset.css';
@import '../styles/base.css';
`,
    'src/components/layout/Container/Container.tsx': `import type { HTMLAttributes } from 'react'
import styles from './Container.module.css'

export function Container({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const classes = [styles.container, className].filter(Boolean).join(' ')
  return <div className={classes} {...props} />
}
`,
    'src/components/layout/Container/Container.module.css': `.container {
  width: min(100% - 3rem, 64rem);
  margin-inline: auto;
}

@media (min-width: 64rem) {
  .container { width: min(100% - 4rem, 64rem); }
}
`,
    'src/components/layout/Section/Section.tsx': `import type { HTMLAttributes } from 'react'
import styles from './Section.module.css'

type SectionProps = HTMLAttributes<HTMLElement> & { tone?: 'default' | 'muted' }

export function Section({ className, tone = 'default', ...props }: SectionProps) {
  const classes = [styles.section, tone === 'muted' && styles.muted, className].filter(Boolean).join(' ')
  return <section className={classes} {...props} />
}
`,
    'src/components/layout/Section/Section.module.css': `.section { padding-block: 4rem; }
.muted { background: var(--color-muted); }

@media (min-width: 40rem) {
  .section { padding-block: 6rem; }
}
`,
    'src/components/common/Button/Button.tsx': `import type { ButtonHTMLAttributes } from 'react'
import styles from './Button.module.css'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary'
  size?: 'medium' | 'large'
}

export function Button({ className, variant = 'primary', size = 'medium', type = 'button', ...props }: ButtonProps) {
  const classes = [styles.button, styles[variant], styles[size], className].filter(Boolean).join(' ')
  return <button type={type} className={classes} {...props} />
}
`,
    'src/components/common/Button/Button.module.css': `.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-control);
  font-weight: 600;
  cursor: pointer;
  transition: background-color 150ms ease;
}
.button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.button:disabled { pointer-events: none; opacity: 0.5; }
.primary { background: var(--color-primary); color: var(--color-primary-foreground); }
.secondary { background: var(--color-muted); color: var(--color-foreground); }
.medium { min-height: 2.5rem; padding-inline: 1rem; font-size: 0.875rem; }
.large { min-height: 3rem; padding-inline: 1.5rem; font-size: 1rem; }
`,
    'src/app/page.module.css': `.hero { min-height: 100vh; }
.content { display: grid; gap: 1rem; }
.eyebrow { color: var(--color-primary); font-size: 0.875rem; font-weight: 600; }
.heading { font-size: clamp(2.25rem, 7vw, 3rem); line-height: 1.05; letter-spacing: -0.025em; }
.description { max-width: 42rem; line-height: 1.7; }
`,
  }

  if (stack.architecture !== 'small') {
    files['src/features/status/components/StarterStatus/StarterStatus.tsx'] = `import type { StarterStatus as Status } from '../../types'
import styles from './StarterStatus.module.css'

export function StarterStatus({ status }: { status: Status }) {
  return <div className={styles.status}><h1 className={styles.heading}>{status.heading}</h1><p className={styles.profile}>Architecture: {status.profile}</p></div>
}
`
    files['src/features/status/components/StarterStatus/StarterStatus.module.css'] = `.status { display: grid; gap: 0.75rem; }
.heading { font-size: clamp(2.25rem, 7vw, 3rem); line-height: 1.05; letter-spacing: -0.025em; }
.profile { color: var(--color-primary); font-size: 0.875rem; font-weight: 600; }
`
    if (stack.architecture === 'large') {
      files['src/features/status/index.ts'] = "export { StarterStatus } from './components/StarterStatus/StarterStatus'\nexport { getStarterStatus } from './services/getStarterStatus'\nexport type { StarterStatus as StarterStatusModel } from './types'\n"
    }
  }

  if ((answers.testing || 'basic') !== 'none') {
    files['src/components/common/Button/Button.test.tsx'] = `import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Button } from './Button'

test('renders an accessible disabled button', () => {
  render(<Button disabled>Save</Button>)
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
})
`
  }

  files['src/app/page.tsx'] = pageFile(answers, stack, 'css-modules')
  return files
}

function pageFile(answers, stack, mode) {
  const layoutImports = mode === 'tailwind'
    ? "import { Container } from '@/components/layout/Container'\nimport { Section } from '@/components/layout/Section'"
    : "import { Container } from '@/components/layout/Container/Container'\nimport { Section } from '@/components/layout/Section/Section'\nimport styles from './page.module.css'"
  const statusImports = stack.architecture === 'small'
    ? ''
    : stack.architecture === 'large'
      ? "\nimport { getStarterStatus, StarterStatus } from '@/features/status'"
      : mode === 'tailwind'
        ? "\nimport { StarterStatus } from '@/features/status/components/StarterStatus'\nimport { getStarterStatus } from '@/features/status/services/getStarterStatus'"
        : "\nimport { StarterStatus } from '@/features/status/components/StarterStatus/StarterStatus'\nimport { getStarterStatus } from '@/features/status/services/getStarterStatus'"
  const statusSetup = stack.architecture === 'small' ? '' : '  const status = getStarterStatus()\n'
  const heading = stack.architecture === 'small'
    ? mode === 'tailwind'
      ? '<h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Your starter is running</h1>'
      : '<h1 className={styles.heading}>Your starter is running</h1>'
    : '<StarterStatus status={status} />'
  const sectionProps = mode === 'tailwind'
    ? 'ui="hero" className="min-h-screen"'
    : 'className={styles.hero}'
  const contentProps = mode === 'tailwind' ? 'className="space-y-4"' : 'className={styles.content}'
  const eyebrow = mode === 'tailwind'
    ? '<p className="text-sm font-semibold text-primary">create-win-project</p>'
    : '<p className={styles.eyebrow}>create-win-project</p>'
  const description = mode === 'tailwind'
    ? `<p className="max-w-2xl leading-7">{${JSON.stringify(answers.projectDescription)}}</p>`
    : `<p className={styles.description}>{${JSON.stringify(answers.projectDescription)}}</p>`

  return `${layoutImports}${statusImports}\n\nexport default function HomePage() {\n${statusSetup}  return (\n    <main>\n      <Section ${sectionProps}>\n        <Container ${contentProps}>\n          ${eyebrow}\n          ${heading}\n          ${description}\n          <p>Read <code>AGENTS.md</code> before your first agent-assisted change.</p>\n        </Container>\n      </Section>\n    </main>\n  )\n}\n`
}

export function addNextjsStylingFiles(files, answers, stack) {
  if (stack.styleId === 'css-modules' && stack.architecture !== 'small') {
    delete files['src/features/status/components/StarterStatus.tsx']
  }
  Object.assign(files, stack.styleId === 'tailwind' ? tailwindFiles(answers, stack) : cssModuleFiles(answers, stack))
}
