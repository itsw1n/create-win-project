# Make validation

## Validation Targets

`check` should compose the same lint, typecheck, test, and build commands used by CI. Keep focused targets independently runnable, and avoid suppressing failures with leading `-`, `|| true`, or unconditional success messages.
