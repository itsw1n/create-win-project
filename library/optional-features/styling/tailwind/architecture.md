# Tailwind Architecture

## Primary Mode

Tailwind is the primary styling system. Use utilities for ordinary layout and visual styling. Do
not introduce CSS Modules, CSS-in-JS, or another primary system without an approved decision in
`CONTEXT.md`.

## File Structure

```text
components/layout/                 Tailwind structural components
components/common/Button.tsx      shared primitive and colocated CVA variants
features/<feature>/components/     feature UI with utilities in JSX
lib/cn.ts                          conditional class composition
app/globals.css or styles.css     Tailwind import, theme tokens, global base rules
```

Keep route-only UI beside its route. Do not create global `variants`, `helpers`, or component-style
folders. shadcn is optional; if deliberately installed, configure its `ui` alias to
`components/common` and reconcile existing primitives instead of duplicating them.

## Layout Composition

Compose page regions as `main → Section → Container → feature content`. Section utilities own
vertical spacing and tone; Container utilities own maximum width, centering, and horizontal
gutters. Keep this responsibility in the generated layout components instead of repeating the
same width and gutter utilities across pages. Do not wrap every nested component.

## Browser Inspection

Tailwind utilities explain appearance, so meaningful web landmarks use `data-ui` to explain
identity. Prefer `section`, `container`, `hero`, or `billing-summary`, not `gray-box` or `left-div`.
Do not add `data-ui` to every leaf element, and do not use it instead of semantic HTML, accessible
names, or role-based tests.
