# TypeScript boundaries

## Strict Mode — Always On

Keep `strict` enabled. Model inputs at trust boundaries as `unknown`, validate them, then pass typed values inward. Do not weaken compiler options for one failing file.

## No any

Avoid `any`. Prefer `unknown`, generics, discriminated unions, or a narrow local type. If an external library forces an escape hatch, isolate and document it at the adapter boundary.

## Type vs Interface

Use interfaces for extendable object contracts and types for unions, intersections, mapped types, and aliases. Consistency within a feature matters more than stylistic conversion.
