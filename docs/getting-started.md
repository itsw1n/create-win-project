# Getting started

Run the generator with Node.js 24 LTS or Docker. Generated projects list their own runtime requirements in `docs/guides/setup.md`.

```bash
npx create-win-project@latest
```

The interview asks for application shape, framework, backend/data boundary, architecture, authentication, and applicable capabilities. It can install dependencies and create lockfiles immediately.

For development from a clone:

```bash
npm ci
npm run doctor
npm start
```

For a containerized generator:

```bash
docker compose build
docker compose run --rm app
```

After generation, enter the new directory and follow its README. The CLI stages files before moving them into place and refuses to overwrite a non-empty destination.
