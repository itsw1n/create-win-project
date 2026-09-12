# Inertia React Structure

Use `resources/js/pages` for route pages, `features/<name>` for reusable feature UI/hooks/types,
`components/common` for domain-free controls, `components/layout` for structural composition, and
`lib` for adapters. Laravel-owned page data arrives as props; do not generate frontend
repositories, stores, services, or API clients by habit.

## Layout Composition

Compose pages as `main → Section → Container → feature content`. Section owns semantic regions,
vertical spacing, and optional tone; Container owns centered width and horizontal gutters.
Generate Header, Footer, Sidebar, or Topbar only for a product shape that uses them.
