# Tailwind Tokens

## Tailwind v4 Tokens

Define utility-generating design tokens with Tailwind v4 `@theme` in the global stylesheet. Prefer
semantic utilities such as `bg-background`, `text-foreground`, and `border-border` over repeated raw
colors or arbitrary values. Use ordinary `:root` variables only when a value should not generate a
utility.

Do not create a `tailwind.config.ts` for normal v4 configuration. Repeated exceptional values should
be promoted to a named theme token; a genuinely unique measured value may remain arbitrary.

## Theme Boundary

The global stylesheet owns the Tailwind import, tokens, reset/base behavior, typography defaults,
and global accessibility behavior. It must not become a second component styling system.

When dark mode is required, centralize light and dark values and connect the selected theme owner to
one documented class or data-attribute strategy. Components consume semantic utilities instead of
hard-coding separate light and dark palettes.
