# DPNR — Agent Log

This project has **no human development team**. It is built entirely by Claude Code agents, one session at a time. Each session starts with zero memory of prior sessions except what's written here and in `docs/MVP_ARCHITECTURE.md`. Treat this file as load-bearing infrastructure, not a changelog.

## Prompt for next agent

*(Copy-paste this to start a new session. Overwrite it at the end of every session — same rule as "Next Agent — Start Here" below, which this points to for the full detail.)*

> You're picking up work on DPNR (`C:\Users\rekkawi\decision-room`), a personal-development product built entirely by Claude Code agents — no human dev team, real engineering discipline expected anyway. Before doing anything else, read `docs/AGENT_LOG.md` in full (protocol, guardrails, and the "Next Agent — Start Here" section), then `docs/MVP_ARCHITECTURE.md`, then `docs/adr/` — don't relitigate a settled ADR.
>
> Current state: Phase 0 platform scaffolding (`packages/shared-types` + `infra/cdk`'s three stacks) is built and verified locally (typecheck, `cdk synth`, and the actual synthesized CloudFormation was inspected, not just "it compiled"). **Nothing is deployed — no AWS account exists yet.** The user is setting AWS up on their own timeline, not this session — don't ask about AWS status or push toward `cdk bootstrap`/`deploy`; just do non-AWS-dependent work. `apps/web` is now fully lint-clean (0 errors, 0 warnings) as of Session 4 — keep it that way.
>
> Good next tasks, roughly in priority order (use judgment on which matters most, or ask the user if genuinely unsure):
> 1. Flesh out the remaining `/v1` API contracts in `packages/shared-types/src/api` (Companion, room creation, Library, Daily Card/Weekly Recap, Commitments) — see the TODO list in `src/api/index.ts`.
> 2. Migrate the 8 existing OpenAI prompts in `apps/web/src/lib/ai/prompts.ts` into versioned Prompt Registry records (schema in `MVP_ARCHITECTURE.md` §8.2) — ready to load once that table is deployed.
>
> Before ending your session: run lint/typecheck/build (never hand off a red build), update this file's "Next Agent — Start Here" and "Prompt for next agent" sections honestly — including anything left broken or stubbed — and write an ADR for any irreversible decision.

## Protocol — every session, in order

1. **Read this entire file before doing anything else.** Then check `docs/MVP_ARCHITECTURE.md` for the target architecture/build plan, and `docs/adr/` (if it exists) for decisions already made. Do not relitigate a settled ADR without writing a new one explaining why it changed.
2. Do the work for your session's scope. Prefer finishing one vertical slice cleanly over starting two.
3. Before ending your session:
   - Run lint / typecheck / build / tests. **Never hand off a red build.**
   - Overwrite **"Next Agent — Start Here"** below with a precise, actionable handoff — not "continue the work." Name the exact file, function, or decision the next session should start with.
   - Add a new entry at the top of **Session History** with the date, what you did, and what you decided and why.
   - If you made an irreversible or hard-to-reverse architectural call, write an ADR in `docs/adr/` (create the folder if needed) and link it from your session entry.
4. Only mark a phase from `MVP_ARCHITECTURE.md` §7 complete if its acceptance criteria (spec §12) actually pass. Narrate honestly, including what's stubbed, mocked, or broken — a future session will trust this file at face value.

## Standing engineering guardrails

*(Do not relax these without writing an ADR explaining why.)*

- TypeScript strict mode everywhere; no `any` without a comment explaining why it's necessary.
- No secrets, API keys, or credentials committed, ever. `.env.local` stays out of git.
- No plaintext personal content in DynamoDB once Phase 6 (encryption) lands — this is the product's core promise, not a nice-to-have.
- No raw payloads (chat content, decision narratives, prompts, model responses) in logs, at any phase, including local dev.
- Every Lambda/API handler that touches user data does an explicit ownership check — DynamoDB has no RLS safety net, unlike the Supabase setup it's replacing.
- Any change touching auth, encryption, payments, or webhook signature verification gets a `security-review` pass before being considered done.
- Small, working increments over large speculative ones. A half-built feature that leaves the app broken is worse than a missing one.
- Before deploying anything to real AWS infrastructure, re-read the "AWS deploy authorization" note in the latest handoff below — this touches real cost and real infrastructure and is not something to do by default.

---

## Next Agent — Start Here

*(This section is overwritten every session with the current, precise handoff. Do not append to it — replace it.)*

**Status:** Phase 0 code is substantially scaffolded and verified (typecheck + `cdk synth` + inspected the actual synthesized CloudFormation, not just "it compiled"). **Nothing is deployed** — no AWS account exists yet, and the user has said they'll set it up later on their own timeline. Don't ask about AWS status or nudge toward it — treat AWS-dependent work (`cdk bootstrap`/`deploy`, anything needing Bedrock model access) as blocked until the user brings it up, and default to the non-AWS-dependent backlog instead (see "Prompt for next agent" above).

**Session 4 (this session): `apps/web` lint cleanup, no infra/backend changes.** `npm run lint` in `apps/web` went from 57 errors + 14 warnings to **0 problems**, verified alongside `tsc --noEmit`, `next build` (same route list as before — no regressions), and root `typecheck:cdk` / `synth` (untouched, still green). Details:
- Most fixes were mechanical: `react/no-unescaped-entities` (raw `"`/`'` in JSX text → `&quot;`/`&apos;`, ~40 instances across 16 files) and dead code (7 unused vars/imports removed — including one real dead Supabase query in `apps/web/src/app/api/user/export/route.ts` that fetched `outcomes` and threw the result away; the nested `decisions.outcomes` relation already covers that data for the GDPR export endpoint).
- Three were **real, non-cosmetic errors**, not style noise — this repo is on Next 16.3.1 / `eslint-plugin-react-hooks` 7.1.1, whose new React-Compiler-powered rules (`react-hooks/immutability`, `react-hooks/set-state-in-effect`) flag patterns that used to be unremarkable, including React's own documented "fetch on mount" example. Fixed properly, not blanket-suppressed:
  - `Step07.tsx` — `fetchProjections` was referenced before its declaration inside a `useEffect` (real hoisting-order error, not just a warning). Moved the declaration above the effect and made it effect-local with an `ignore`-flag cleanup guard (closes a latent stale-response race as a side benefit, not just lint-satisfying).
  - `pricing/page.tsx` — `window.location.href = url` inside a `.map()`-rendered button's `onClick` tripped `react-hooks/immutability` (confirmed empirically: reproduced in isolation, and the trigger needs *both* the `.map()` render loop and the property-assignment form — a handler alone or a plain object elsewhere didn't trigger it). Fixed with `window.location.assign(url)` — identical navigation semantics, no property mutation for the rule to catch on. Verified in a browser: clicking "Upgrade to Core" logged-out correctly hits `/api/checkout`, gets a 401, and the error path renders with no console errors.
  - `ClarityToActionScreen.tsx`, `SessionSummaryScreen.tsx`, `SummaryInsightScreen.tsx` — each had a "fetch AI suggestion on mount" effect (`useEffect(() => { asyncFn() }, [])`) tripping `react-hooks/set-state-in-effect`. The fetch function was fully local to the effect in all three, so applied React's own documented `ignore`-flag cleanup pattern for real (not a suppression) — also closes the same latent stale-response race as above.
  - `decision/[id]/page.tsx` — same `set-state-in-effect` rule on `useEffect(() => { load() }, [load])`, but `load` is intentionally shared with a manual post-mutation refresh call site (`handleMarkOutcome`), so the ignore-flag pattern would mean duplicating fetch logic for one caller. **Suppressed** with `eslint-disable-next-line` + an inline comment explaining why, noting this whole page is replaced by the `/v1` API client in Phase 4 anyway (`MVP_ARCHITECTURE.md` §5.3) — not worth a deeper refactor of a page that's getting rewritten regardless.
- Did **not** touch `verifyGrowSignature()`'s actual stub logic in `apps/web/src/lib/grow.ts` (still the known pre-launch security blocker from ADR 0003 — accepts any signature). Only tidied its unused-param lint warning (suppressed with a comment referencing ADR 0003) and its TODO comment. Don't mistake that comment cleanup for the fix — the real HMAC verification is still unimplemented.
- No new ADR: nothing this session was an irreversible/architectural call. The `eslint-disable` suppressions are line-scoped, each carries an inline justification, and are trivially reversible.
- Added `C:\Users\rekkawi\.claude\launch.json` (outside this repo, user-level Claude Code config — not committed here) so the dev server could be started for a browser smoke-test of the changed pages (`/terms`, `/privacy`, `/login`, `/pricing`). If it's missing in a future session and you need to browser-test `apps/web`, recreate it pointing `npm run dev --workspace=apps/web` at this repo.

**What exists as of Session 3, all verified working from a clean build:**
- `packages/shared-types`: Zod schemas (source of truth) + inferred TS types for every DynamoDB item in `MVP_ARCHITECTURE.md` §3.1/§3.2 (account/credits, Digital Twin, sessions, Decision Room — ported from `apps/web/supabase/migrations/`, Mirror Room first-pass, continuity items, Prompt Registry, Session Tickets, Library/Plans catalogs) plus a `keys.ts` module that is the *only* place PK/SK string formats are built — never hand-roll a key in handler code. API-side: the shared room-command contract (`FlowId: DECISION | MIRROR`, used by both rooms — this is the highest-leverage reuse point per `MVP_ARCHITECTURE.md` §5.2), dashboard/twin/credits response shapes, health check. **Not yet typed:** most of §4's endpoint list (auth/account, Companion, room creation reads, Library, Daily Card/Weekly Recap, Commitments, payment webhook) — `src/api/index.ts` has the explicit backlog comment; add schemas as each endpoint is actually built, not speculatively.
- `infra/cdk`: three stacks, wired and synth-verified. `Dpnr-Data` (5 DynamoDB tables + 1 KMS key — confirmed in the synthesized template that Session Tickets is the only table with PITR off + TTL on, everything else has PITR on, matching the design intentionally). `Dpnr-Auth` (Cognito user pool, email/password only, post-confirmation + pre-token-generation Lambda triggers — confirmed wired in the synthesized template). `Dpnr-Api` (HTTP API, Cognito JWT authorizer construct built and exposed but not yet attached to any route, one real unauthenticated `GET /v1/health` route).
- Two real (not stub) Lambda handlers: `post-confirmation.ts` creates the `PROFILE` item idempotently; `pre-token-generation.ts` injects a `custom:consent` claim by reading DynamoDB directly.
- **ADR 0004 written this session:** consent state lives only in the DynamoDB `PROFILE` item, not a Cognito custom attribute — deviates slightly from the migration plan's literal wording to avoid a two-sources-of-truth problem. Read it before touching consent logic.
- Fixed a real, current issue `cdk synth` surfaced: `NODEJS_20_X` is already deprecated as of today's date — both Lambda runtimes are on `NODEJS_24_X` instead. If you add a new Lambda, use `NODEJS_24_X`, and re-check whether that's still current — Lambda runtime deprecation dates keep moving.
- Explicitly deferred, not forgotten: Google OAuth federation (needs external Google Cloud OAuth credentials — another account-setup dependency like AWS itself), the zero-egress VPC network isolation from the migration plan (deferred until a Lambda actually calls Bedrock or another external service — no point locking down egress before anything egresses), Bedrock access, EventBridge pipelines, Prompt Registry Lambda logic, and every product API route beyond health.
- One cosmetic, non-blocking `cdk synth` warning about cross-stack-reference strength that a context flag didn't silence — documented in `infra/cdk/README.md`, safe to ignore, don't burn a session chasing it further unless it starts actually blocking something.
- Root `package.json` now has `build:shared-types`, `typecheck:cdk`, and `synth` scripts that build `packages/shared-types` first — it compiles to `dist/` (gitignored, not committed) and both `apps/web` (eventually) and `infra/cdk` resolve it as a built package, not raw TS source. **If you add a new shared-types export and then typecheck/synth `infra/cdk` and get a stale-looking error, rebuild shared-types first** (`npm run build:shared-types` from repo root) — this bit me once already in this session before I wired the root scripts to do it automatically.

**Decisions from Session 2 (still binding, ADRs 0001–0003):** Grow stays as the payment provider; full zero-knowledge encryption ships eventually (not a lighter interim model) which makes the recovery-code UX a hard launch blocker; "enterprise-scale" means production-grade/scalable, not literal multi-tenancy; commits happen autonomously, pushes/force-pushes/history-rewrites need explicit ask.

**Immediate next step:** once the user confirms `aws sts get-caller-identity` works, ask explicitly before running `cdk bootstrap`, then `cdk deploy Dpnr-Data Dpnr-Auth Dpnr-Api` (ask explicitly again before the actual deploy) and manually verify `GET /v1/health` on the real endpoint. After that, Phase 0 continues with: Bedrock Converse client + IAM permissions, the actual Prompt Registry read/write logic, and starting to flesh out `packages/shared-types/src/api` for real endpoints as `MVP_ARCHITECTURE.md` §5.1's Companion or §5.3's Decision Room port work begins. Confirm the deploy region against **current** Bedrock model availability before locking it into `bin/dpnr.ts`'s env config — don't assume `eu-north-1` from the original migration plan still has Claude access without checking (`AWS_SETUP.md` step 3).

---

## Session History

### 2026-08-18 — Session 4 (apps/web lint cleanup)
- Took the first item off the Session 3 backlog: `apps/web` went from 57 lint errors + 14 warnings to 0 problems. Full breakdown, including the three real (non-cosmetic) errors found and how each was fixed vs. justifiably suppressed, is in "Next Agent — Start Here" above.
- Verified with more than "lint passes": `tsc --noEmit`, `next build` (compared route list to before — identical, no regressions), root `typecheck:cdk`/`synth` (untouched, still green), and a browser smoke-test of every changed user-facing page (`/terms`, `/privacy`, `/login`, `/pricing` — including actually clicking the pricing page's upgrade button to confirm the `window.location.href` → `window.location.assign` swap didn't break the checkout call).
- No ADR — no irreversible or architectural decision made this session, just lint fixes and a handful of small justified `eslint-disable` suppressions (each inline-commented, each trivially reversible) for effects that intentionally run once on mount or a stub parameter reserved for later use.
- Did not start the remaining Session 3 backlog items (API contracts, Prompt Registry migration) — see "Prompt for next agent" above for what's next.

### 2026-08-18 — Session 3 (Phase 0 scaffolding: shared-types + CDK app)
- Built `packages/shared-types` (Zod schemas + inferred types for the full DynamoDB item set from `MVP_ARCHITECTURE.md` §3, plus the room-command API contract and a few key response shapes) and `infra/cdk` (three real stacks: Data, Auth, Api — DynamoDB tables, Cognito with two working Lambda triggers, an HTTP API with one working health route and a JWT authorizer ready for the first real authenticated route).
- Verified with more than "it compiled": ran `cdk synth` and grepped the actual synthesized CloudFormation to confirm the Session Tickets table really has PITR off + TTL on while every other table has PITR on, and that both Cognito triggers are really wired into the user pool's `LambdaConfig`.
- Caught and fixed a real issue `cdk synth` surfaced (not hypothetical): `NODEJS_20_X` is already deprecated as of today's date — moved both Lambdas to `NODEJS_24_X`.
- Wrote ADR 0004 (consent claim reads from DynamoDB directly, not a duplicated Cognito custom attribute — avoids a two-sources-of-truth risk the migration plan's original wording would have introduced).
- Caught two of my own smells mid-session and fixed them before moving on: an unused import papered over with `void`, and a hand-written literal key (`'PROFILE'`) where the whole point of `keys.ts` is that nobody does that.
- Made two judgment calls, both logged rather than silently decided: left a moderate `esbuild` dev-server-only advisory unpatched (forcing the fix would jump a major version with real risk of breaking CDK's bundler integration, for a vulnerability class — dev-server request forwarding — this project's usage pattern never exercises), and left one cosmetic `cdk synth` warning about cross-stack-reference strength un-silenced after one honest attempt, rather than burning further time on something non-blocking.
- Deployed nothing — no AWS account exists yet (user is working `docs/AWS_SETUP.md` in parallel). All verification was local: `tsc --noEmit`, `cdk synth`, and inspecting the synthesized template.

### 2026-08-17 — Session 2 (five open decisions resolved, monorepo restructure)
- Got explicit answers to all five blocking questions from Session 1 (see ADRs `0001`–`0003` and "Next Agent — Start Here" above for the substance).
- Got standing authorization for autonomous local commits (no push/force-push/history-rewrite without asking) — recorded so future sessions don't need to re-ask.
- Executed the monorepo restructuring, verified the build is green post-move, opportunistically fixed 3 pre-existing high-severity `npm audit` findings via a safe patch-level `next` bump, and documented (but did not fix) 57 pre-existing lint errors as backlog.
- Wrote `docs/AWS_SETUP.md` (step-by-step AWS account runbook — the agent cannot create accounts or handle secrets, so this is written as user-executed steps with agent-verified checkpoints) and three ADRs.
- Did not start Phase 0 infra work — that's blocked on the user completing the AWS setup runbook, which is a real-world action outside this session's control.

### 2026-08-17 — Session 1 (planning, no code changes)
- Read and cross-referenced three source documents: `aws-migration-plan.html` (Decision-Room-specific AWS design), `digital_personality_presentation.pdf` (conceptual graph-DB reference), and `DPNR_MVP_Build_Specification_FINAL_CHAT_HUB_v2.docx` (actual product source of truth — DPNR as a whole, Decision Room is one component of it).
- **Repo state fix:** found the local `decision-room` checkout mid-merge-conflict and 53 commits behind `origin/decision-room`. Verified every file in the local branch's last commit (`251b76e`) already existed in origin, and origin's versions were pure expansions (no unique local work). Created `backup/pre-sync-2026-08-17` at the old HEAD as a safety net, aborted the merge, and reset to `origin/decision-room` (`f7937f0`). Untracked docs (`HANDOVER.md`, DS handover docx, `dev.log`) were preserved (untracked files are unaffected by `reset --hard`).
- Wrote `docs/MVP_ARCHITECTURE.md`: generalizes the migration plan's Decision-Room-only AWS architecture (Cognito, API Gateway+Lambda, DynamoDB single-table, Bedrock, Prompt Registry, client-side encryption with session tickets) across the whole product. Includes a single-table data model covering every component, a `/v1` API surface, an explicit reuse table (what ports from the current codebase vs. what's net-new), and a 7-phase build sequence.
- Established this file and its protocol, per instruction: this project is built solely by Claude Code agents across sessions with no human dev team, so cross-session continuity and self-imposed engineering discipline (since there's no human code review) have to be explicit and written down, not assumed.
- Did not start implementation — five blocking questions need answers first (see "Next Agent — Start Here").
