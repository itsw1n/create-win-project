# Getting started

Run the generator with Node.js 24 LTS or Docker. Generated projects list their own runtime requirements in `docs/guides/setup.md`.

```bash
npx create-win-project@latest
```

The interview first asks what you want to create:

- **Planning folders only** creates the selected stack's Medium planning folders, `.gitkeep` files, and a concise `ARCHITECTURE.md`. It does not create application code, package files, dependencies, CI, Docker, or agent playbooks.
- **Runnable project** creates an application you can install and start, plus the selected tests, tools, documentation, and guidance. This is the default.

For Full Project, the CI choices are independent:

- **Build and test CI** adds frontend and backend build or test workflows where the stack supports them.
- **Security checks** adds `security.yml` with dependency review, secret scanning, dependency audits, and CodeQL where applicable.
- Selecting both also adds the generated pull request template. Selecting neither creates no GitHub workflow files.

Both modes ask for the application shape and stack because each technology has different folder boundaries. Only Full project asks about architecture depth, testing, Docker, Makefile, build/test CI, security checks, agent guidance, and dependency installation.

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

After generation, enter the new directory and follow `docs/guides/setup.md` for environment setup, required services, startup, and validation. Use the generated `README.md` for a short overview. The CLI stages files before moving them into place and refuses to overwrite a non-empty destination.
