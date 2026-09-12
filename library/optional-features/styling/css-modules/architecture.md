# CSS Modules Architecture

## Primary Mode

CSS Modules are the primary component styling system. Do not introduce Tailwind, CSS-in-JS, or
another primary system without an approved decision in `CONTEXT.md`.

## File Structure

```text
styles/{tokens,reset,base}.css
components/layout/Section/{Section.tsx,Section.module.css}
components/layout/Container/{Container.tsx,Container.module.css}
components/common/Button/{Button.tsx,Button.module.css}
features/<feature>/components/<Component>/{Component.tsx,Component.module.css}
```

Global files own only shared foundations. Component styles stay beside their owning component.

## Layout Composition

Compose page regions as `main → Section → Container → feature content`. `Section.module.css` owns
vertical spacing and optional tone; `Container.module.css` owns maximum width, centering, and
horizontal gutters. Page modules may describe a specific region such as `hero`, but must not
duplicate the shared container contract. Do not wrap every nested component.

## Browser Inspection

Use semantic local class names such as `section`, `container`, `content`, `media`, and `actions`.
The compiled CSS Module class identifies the component in browser tools, so do not add `data-ui` by
default. Avoid positional or visual names such as `leftSide`, `blueBox`, and `bigText` when a stable
semantic name exists.
