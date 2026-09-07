# CSS Modules Components

## Component Ownership

Each component normally owns one colocated module. Import it directly and use semantic camelCase
local names. Do not move one component's selectors into global CSS or couple unrelated components
through descendant selectors.

Combine explicit variant classes using the project's existing class convention. Keep pseudo-elements,
keyframes, complicated selectors, and component-specific responsive behavior in the owning module.

## Common Button

The generated Button and `Button.module.css` form the baseline primitive. They own visual variants,
sizes, focus-visible treatment, and disabled behavior but no product rules. Feature-specific actions
wrap the common Button rather than duplicating it.

Inspect existing common components and tokens before creating a new primitive or value.
