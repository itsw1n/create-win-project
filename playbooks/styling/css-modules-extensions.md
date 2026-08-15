# Styling: CSS Modules — Extensions

Extends your existing CSS Modules playbook with missing patterns.

---

## Dark Mode with CSS Variables
```css
/* styles/tokens.css — single source of truth */
:root {
  /* Colors */
  --color-background: #ffffff;
  --color-foreground: #0a0a0a;
  --color-primary: #1a1a2e;
  --color-primary-foreground: #f0f0f0;
  --color-muted: #f5f5f5;
  --color-muted-foreground: #737373;
  --color-border: #e5e5e5;
  --color-error: #dc2626;
  --color-success: #16a34a;

  /* Typography */
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;

  /* Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;

  /* Transitions */
  --transition-fast: 100ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 500ms ease;
}

[data-theme="dark"] {
  --color-background: #0a0a0a;
  --color-foreground: #f0f0f0;
  --color-primary: #e0e0f0;
  --color-primary-foreground: #1a1a2e;
  --color-muted: #1a1a1a;
  --color-muted-foreground: #a3a3a3;
  --color-border: #262626;
}
```

```typescript
// app/providers.tsx — apply theme to root
import { useEffect, useState } from 'react'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return <>{children}</>
}
```

---

## Component Pattern with Tokens
```css
/* components/ui/Button/Button.module.css */
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-base);
  border-radius: var(--radius-md);
  transition: background-color var(--transition-base);
  cursor: pointer;
}

.primary {
  background-color: var(--color-primary);
  color: var(--color-primary-foreground);
}

.primary:hover {
  opacity: 0.9;
}

.ghost {
  background-color: transparent;
  color: var(--color-foreground);
  border: 1px solid var(--color-border);
}

.ghost:hover {
  background-color: var(--color-muted);
}

.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
```

---

## clsx for Class Composition
```typescript
// Install: npm install clsx
import clsx from 'clsx'
import styles from './Button.module.css'

export function Button({ variant = 'primary', disabled, className }: ButtonProps) {
  return (
    <button
      className={clsx(
        styles.button,
        styles[variant],
        disabled && styles.disabled,
        className   // allow external class override
      )}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
```

---

## Responsive in Module File
```css
/* UserCard.module.css */
.card {
  display: flex;
  flex-direction: column;
  padding: var(--space-4);
}

/* Responsive stays in the component's own module file */
@media (min-width: 768px) {
  .card {
    flex-direction: row;
    padding: var(--space-6);
  }
}

@media (min-width: 1024px) {
  .card {
    max-width: 800px;
  }
}
```

---

## Animation
```css
/* Define @keyframes in component module if component-specific */
/* Define in global.css if reused across components */

/* Component-specific */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.dropdown {
  animation: fadeIn var(--transition-base);
}

/* Reused animation → globals.css */
@keyframes spin {
  to { transform: rotate(360deg); }
}
```

---

## Never Mix Tailwind + CSS Modules on Same Element
```typescript
// ❌ mixing both on same element
<div className={clsx(styles.card, 'flex items-center')} />

// ✅ pick one strategy per project (defined at init)
// CSS Modules project → all styling via modules
<div className={styles.card} />

// Tailwind project → all styling via Tailwind
<div className="flex items-center gap-4 rounded-md" />
```

---

## Global Styles Structure
```
src/styles/
  tokens.css      → CSS variables (colors, space, type, radius)
  globals.css     → reset, base elements, @import tokens
  animations.css  → reusable @keyframes (optional)
```

```css
/* globals.css */
@import './tokens.css';

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background-color: var(--color-background);
  color: var(--color-foreground);
  font-size: var(--font-size-base);
  line-height: 1.5;
}

a {
  color: inherit;
  text-decoration: none;
}
```

---

## Agent Quick Reference (Extended)
```
Dark mode?
  → [data-theme="dark"] on html element
  → CSS variables in tokens.css, overrides in [data-theme="dark"]
  → Toggle via data-theme attribute, not class swap

Conditional classes?
  → clsx(styles.base, condition && styles.variant)
  → Never string template literals

Responsive?
  → @media queries in component's own .module.css
  → Mobile styles first (no query), then @media (min-width: ...)

Animation?
  → Component-specific: @keyframes in component module
  → Reused: @keyframes in globals.css or animations.css
  → Duration: always use --transition-* tokens

New token needed?
  → Add to tokens.css under correct section
  → Never hardcode values in component modules

External class override allowed?
  → Accept className prop, pass to clsx as last arg
  → Allows parent to extend without modifying component
```
