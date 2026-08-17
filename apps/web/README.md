# apps/web

The Next.js app. Today this is Decision Room only (pre-migration: Supabase + OpenAI). See the repo root [`README.md`](../../README.md) and [`docs/AGENT_LOG.md`](../../docs/AGENT_LOG.md) before making changes — this app is one workspace in a larger monorepo, not a standalone project.

```bash
# from the repo root, not this directory
npm run dev
npm run build
npm run lint
```

`HANDOVER.md` and `PRD.md` in the repo root document the current (pre-migration) data model and prompt set — useful references while porting Decision Room onto the new platform per `docs/MVP_ARCHITECTURE.md` §5.3.
