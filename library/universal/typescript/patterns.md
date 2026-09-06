# TypeScript patterns

## Zod for Runtime Validation

Static types do not validate runtime data. Parse environment variables, requests, storage, and third-party responses at entry points. Export the inferred type from the schema instead of maintaining a duplicate interface.

Prefer small pure functions, explicit return types on public APIs, `satisfies` for configuration, and immutable inputs where mutation is not part of the contract.
