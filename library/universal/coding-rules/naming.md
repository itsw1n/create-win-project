# Naming and structure

## Naming

Use names that describe domain intent. Avoid unexplained abbreviations, generic `data`/`utils` modules, and names that repeat their containing folder.

## Functions

Keep functions focused, make side effects visible, validate at boundaries, and return early for invalid states.

## Imports

Group platform, external, and local imports consistently. Respect architecture boundaries and remove unused imports.

## Constants

Name shared constants by meaning, keep feature-local values near their owner, and do not disguise mutable state as a constant.
