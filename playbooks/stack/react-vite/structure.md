# React + Vite Structure

## Feature Ownership

```text
frontend/src/
├── app/                 providers and router composition
├── pages/               route-level composition
├── components/ui/       domain-free primitives
├── components/shared/   cross-feature UI
├── features/tasks/
│   ├── components/
│   ├── hooks/
│   ├── api.ts           REST/external protocol
│   ├── data.ts          Supabase queries when applicable
│   ├── schema.ts
│   └── types.ts
└── lib/                 shared transport and SDK construction
```

Create a directory only with its first real file. URLs, wire DTOs, Supabase queries, and
error normalization stay outside visual components. Cross-feature types become shared
only after genuine reuse. Large modules expose `index.ts`; consumers do not deep import.
