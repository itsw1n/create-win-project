<div align="center">
  <img src="./public/logo.svg" alt="W1N Project logo" width="160">
  <h1>W1N PROJECT</h1>
  <p>Generate a stack-specific architecture scaffold or a runnable web, mobile, or backend project.</p>
</div>

> **Just answer what tech stack you want.** create-win-project turns your answers into a runnable, tested, agent-ready foundation.

## Start

```bash
npx create-win-project@latest
```

Choose an Architecture Scaffold for a Medium planning structure, or a Full Project for a runnable application. The interview asks only the questions that apply to the selected stack and mode. Existing non-empty destinations are never overwritten.

Read [Getting started](./docs/getting-started.md) for the interview flow and [Understanding a generated project](./docs/generated-project.md) for the resulting files.

## Supported stacks

| Application | Backends and data |
|---|---|
| Next.js | None, Supabase, PostgreSQL, Spring Boot, Laravel, FastAPI |
| React + Vite | None, Supabase, Spring Boot, Laravel, FastAPI |
| Expo / React Native | None, Supabase, Spring Boot, Laravel, FastAPI |
| Laravel UI | Blade, Livewire, or Inertia React with Laravel |
| API only | Spring Boot, Laravel, or FastAPI |

See [Stacks and capabilities](./docs/capabilities.md) for supported combinations and conditional features.

## Documentation

- [Documentation map](./docs/README.md)
- [Getting started](./docs/getting-started.md)
- [Understanding a generated project](./docs/generated-project.md)
- [Production contract](./docs/production-contract.md)
- [Compatibility and upgrades](./docs/compatibility.md)

## Development

```bash
git clone https://github.com/itsw1n/create-win-project
cd create-win-project
npm ci
npm test
```

See the [maintainer documentation](./docs/maintainers/contributing.md) before changing manifests, generated behavior, compatibility profiles, or CI.

## License

Licensed under the [MIT License](./LICENSE). Copyright © 2026 itsw1n.
