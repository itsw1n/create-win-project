# Runtime validation with Zod

## Agent Quick Reference

Parse untrusted values once at their owning boundary, use the inferred type internally, and return safe structured errors.

## Schema First, Always

Define the runtime contract before consuming external data. Use strict schemas for requests, environment variables, persisted data, and provider responses. Apply coercion only when the transport contract explicitly permits it.

## Zod Schema Placement

Place a schema at the boundary that owns the contract. Feature schemas stay with the feature; shared protocol schemas live in a dependency-neutral contract module. Export inferred types rather than duplicating shapes.

## Web Form (React Hook Form)

Use the schema resolver at submission boundaries, show field errors accessibly, and validate again on the server. Client validation improves feedback but never establishes trust.

## React Native Form (React Hook Form + Controller)

Wrap controlled native inputs with `Controller`, preserve accessible labels and errors, and validate the same transport contract again at the trusted server boundary.
