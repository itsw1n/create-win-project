# Tailwind Components

## Class Strategy

```text
static styling       → className
conditional classes  → cn()
reusable variants    → CVA beside the owning component
runtime CSS value    → intentional inline style only when utilities cannot represent it
```

Use the generated `cn()` helper for conditions and caller overrides. Use CVA only when a reusable
component has real variants or sizes; do not wrap one-off utility strings in CVA or `@apply`.
Split components when their rendering, state, or class list becomes difficult to understand.

## Common Button

The generated Button is the baseline primitive. Its CVA definition stays in `Button.tsx`; it owns
visual variants, sizes, focus-visible treatment, and disabled behavior but no product rules.
Feature-specific submit or action components wrap it instead of creating competing buttons.

Prefer semantic elements and minimal DOM nesting. Existing common primitives must be inspected
before creating Button, Input, Dialog, Dropdown, Card, or similar replacements.
