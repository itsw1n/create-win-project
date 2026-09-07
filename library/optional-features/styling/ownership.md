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
