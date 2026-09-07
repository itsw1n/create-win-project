# CSS Modules Tokens

## Global Foundation

`tokens.css` defines semantic custom properties for color, spacing, radius, typography, and layout.
`reset.css` normalizes browser defaults. `base.css` owns element defaults and global accessibility
behavior. The framework global entry imports them once.

Do not place feature or component selectors in these files. Components consume existing tokens
before introducing a literal value; add a token only when the value is genuinely shared.

## Theme Boundary

Centralize each supported theme's semantic variable values at the selected root class or data
attribute. Components consume variables and do not duplicate light/dark selectors. Respect system
preference by default, preserve an explicit user choice, and maintain accessible contrast.
