# Livewire Structure

Choose one consistent supported component format. Route-level components own pages; interactive
components own focused reactive state; Blade components own static reusable markup. Extract Form
objects only for substantial form state, and align Large namespaces with module ownership.

## Layout Composition

Compose route-level Livewire views as
`<main> → <x-layout.section> → <x-layout.container> → feature content`. Section owns semantic
regions, vertical spacing, and optional tone; Container owns centered width and horizontal gutters.
Generate Header, Footer, Sidebar, or Topbar only for a product shape that uses them.
