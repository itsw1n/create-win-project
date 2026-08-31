# AGENTS.md

> **This file is always loaded.** Keep it lean. Rule detail lives in `playbooks/` (lazy `Read`).
> **Load order per task:** `AGENTS.md` (now) → only the one `playbooks/` § you need. Never read all playbooks eagerly.

## Stack Snapshot
{{PROJECT_NAME}} — {{PROJECT_DESCRIPTION}}
Stack: {{STACK}}
Full snapshot → `CONTEXT.md`.

> **Scaffold flexibility:** This structure is advisory — every folder/file (`src/stores`, `src/hooks`, `e2e/`, `supabase/`, etc.) is optional. Suggest adding a folder/file when its `when` condition applies, or removing it when unused for 2+ features. Don't treat empty `.gitkeep` folders as required.

## Key Constraints (always-on)
{{CONSTRAINTS}}

## What NOT To Do
- Never bypass RLS with service role key from client (Supabase)
- Never put business logic in pages/ or Controller
- Never merge or open PRs unless explicitly asked

## How to work
1. Check `RULES.md` for the concern → playbook § map.
2. `Read` only that one `playbooks/` § (use offset). Never read all playbooks eagerly.
3. Follow existing patterns; write tests alongside features.
4. Commit with: `type(scope): description`.
