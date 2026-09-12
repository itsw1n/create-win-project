# Frontend Styling Ownership

## Component Ownership

Use the same ownership model in every architecture profile:

```text
components/layout/                 structural Section, Container, Screen, and Content
components/common/                 reusable non-feature primitives such as Button
features/<feature>/components/     feature-owned UI
routes/.../_components/            UI used by only one route
```

`layout` owns shells, regions, width, and gutters. It accepts feature content through props or
children and does not fetch feature data. `common` contains reusable components without business
rules. Do not promote feature UI merely because it is visually reusable inside one feature.

## Page Composition

Web routes and pages compose the generated layout primitives in this order:

```tsx
<main>
  <Section>
    <Container>{/* page or feature content */}</Container>
  </Section>
</main>
```

- `Section` owns the semantic page region, vertical spacing, and optional background or tone.
- `Container` owns centered maximum width and horizontal gutters.
- A page may contain several Sections, each with its own Container when the content needs the
  standard width. Do not add Section/Container wrappers to every nested component.
- Routes compose layout and feature UI. Feature components provide content and do not control
  page-wide width or outer spacing.

Expo uses the native equivalent:

```tsx
<Screen>
  <Content>{/* screen or feature content */}</Content>
</Screen>
```

`Screen` owns the screen-safe outer surface. `Content` owns readable width, gutters, and normal
screen spacing.

## Dependency Direction

```text
route/page/screen ─┬─→ layout ─→ common
                   └─→ feature ─→ common
```

`common` imports neither `layout` nor features. Features do not import layout. A route composes
layout and feature UI. Large projects expose cross-feature imports through each feature public API;
the placement rules themselves do not change between Small, Medium, and Large.

Generate folders only with real files. Every frontend includes working layout primitives and a
tested common Button; additional primitives appear only for an actual requirement.

Header, Footer, Sidebar, and Topbar belong in `components/layout` when the product shape requires
them. Input and Modal belong in `components/common` when a real interaction requires them. They
are documented destinations, not automatic starter files.
