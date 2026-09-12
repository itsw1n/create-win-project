# Blade Structure

Put route views in `resources/views/<feature>`, structural composition in `components/layout`, and
domain-free reusable controls in `components/common`. Keep feature-specific
components close to their feature and create directories only with real files.

## Layout Composition

Compose page regions as `<main> → <x-layout.section> → <x-layout.container> → feature content`.
Section owns semantic regions, vertical spacing, and optional tone; Container owns centered width
and horizontal gutters. Generate Header, Footer, Sidebar, or Topbar only for a product shape that
uses them.
