# {{PROJECT_NAME}}

> {{PROJECT_DESCRIPTION}}

---

## Stack

| Layer       | Technology                |
|-------------|---------------------------|
| Frontend    | Next.js 14+ (App Router) + TypeScript |
| Styling     | {{STYLE_MODE}} |
| Platform    | {{PLATFORM}} |

---

## Quick Start

```bash
git clone <repo>
cd {{PROJECT_NAME}}
cp .env.example .env
# Fill in .env values
make dev       # starts Supabase + dev server
```

Or without Makefile:

```bash
npx supabase start
npx supabase db reset
npm run dev
```

---

## Documentation

| File                      | What it covers               |
|---------------------------|------------------------------|
| `RULES.md`              | All coding rules for this stack |
| `AGENTS.md`             | Folder map + agent instructions |
| `CONTEXT.md`            | Project goals and decisions  |
| `docs/guides/setup.md`  | Detailed setup guide         |
| `docs/api/endpoints.md` | API endpoint reference       |
| `docs/api/errors.md`    | Error code registry          |

---

## Project Structure

See `AGENTS.md` for the full folder map.
