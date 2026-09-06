# Make commands

## Core Rules

- Targets wrap documented project commands; they do not hide different behavior.
- Declare non-file targets with `.PHONY`.
- Use tabs for recipes and `$(VARIABLE)` for configurable values.
- Keep the default target safe and read-only; `help` or `check` is preferred.
- Fail on command errors and preserve the underlying exit status.

Use small targets such as `install`, `dev`, `lint`, `test`, `build`, and `check`. Compose them instead of duplicating recipes.
