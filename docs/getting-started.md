# Getting started

Run the generator with Node.js 24 LTS or Docker. Generated projects list their own runtime requirements in `docs/guides/setup.md`.

```bash
npx create-win-project@latest
```

The interview first asks what you want to create:

- **Architecture scaffold** creates the selected stack's Medium planning folders, `.gitkeep` files, and a concise `ARCHITECTURE.md`. It does not create application code, package files, dependencies, CI, Docker, or agent playbooks.
- **Full project** creates the runnable application and then adds the selected tests, tools, documentation, and guidance.

Both modes ask for the application shape and stack because each technology has different folder boundaries. Only Full project asks about architecture depth, testing, Docker, Makefile, GitHub Actions, agent guidance, and dependency installation.

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
