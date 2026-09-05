# next-themes — Dark Mode (Next.js)

> **When to use:** Next.js projects that need system-aware or user-toggled dark mode
> with Tailwind CSS.

---

# 1. Provider Setup

```tsx
// src/app/providers.tsx
'use client'
import { ThemeProvider } from 'next-themes'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  )
}
```

```tsx
// src/app/layout.tsx
import { Providers } from './providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

---

# 2. Toggle Component

```tsx
// src/components/ui/ThemeToggle.tsx
'use client'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  )
}
```

---

# 3. Tailwind Config

```ts
// tailwind.config.ts
export default {
  darkMode: 'class', // controlled by next-themes
}
```

---

# 4. Rules

- Always add `suppressHydrationWarning` to `<html>` — prevents hydration mismatch on theme read.
- Use Tailwind `dark:` variants for all dark mode styles — not inline style checks.
- `defaultTheme: 'system'` is the right default — respects user OS preference.

---

# 5. Agent Quick Reference

```text
Add dark mode?              → ThemeProvider in app/providers.tsx
                            → tailwind.config.ts darkMode: 'class'
Toggle theme?               → useTheme() from next-themes
Apply dark style?           → Tailwind dark: variant (dark:bg-gray-900)
Hydration mismatch?         → add suppressHydrationWarning to <html>
```
