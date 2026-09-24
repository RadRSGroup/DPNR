# Response to the 2026-09-14 Enterprise Security Review

**Reviewed report:** `DPNR_Enterprise_Security_Review_2026-09-14.md` (external, read-only review of commit `4f23148e2`, branch `mvp`)
**This response's baseline:** commit `d94a1b87` (2026-09-18) — 44 commits ahead of the reviewed commit. All 44 are feature work (Hebrew localization, Main Chat UX, First-Time Onboarding); none touch anything the report flagged. **Every finding below was independently re-checked against current `HEAD`, not just carried over from the report.**

## 1. Verdict

**Concur with the report's verdict: NO-GO for production or external beta.** The architecture and controls the report calls out as real (per-user partitioning, JWT authorizer coverage, AES-GCM at rest, consent-gated writes, scoped IAM) are genuinely there — this is not a low-quality codebase. But the specific blocking findings are real, current, unfixed, and mostly cheap to fix. Nothing in the 44 commits since the review addressed any of them; they weren't yet visible to whoever was steering those sessions because this report didn't exist until it landed today. Treat this document as this project's own equivalent of an ADR/PHASE_AUDIT entry — log it into `AGENT_LOG.md`'s "Next Agent" pointer so the remediation slices below survive session boundaries the way every other feature slice does.

## 2. Independent verification (spot-checked against `HEAD`, not the reviewed commit)

| ID | Re-checked at HEAD | Result |
|---|---|---|
| DPNR-01 | `apps/web/package.json:20` | Still `"next": "^16.3.1"` — unchanged, still in the vulnerable range. |
| DPNR-03 | `login/page.tsx:16,33`, `consent/page.tsx:34`, **`profile-setup/page.tsx:26,35`** | Confirmed, **and one more instance than the report lists** — see §3. |
| DPNR-04 / DPNR-14 | `apps/web/src/app/api/ai/route.ts` exists; `apps/web/render.yaml` | Route still present; `render.yaml` still declares Supabase/OpenAI/Grow vars and still omits `NEXT_PUBLIC_COGNITO_*`/`NEXT_PUBLIC_DPNR_API_URL`. |
| DPNR-05 | `infra/cdk/lambda/companion/message.ts:156-219` | Confirmed — safety classification (156) and interaction-mode classification (205) both run, then `consumeCredits` only at line 218, after both model calls. |
| DPNR-06 | `infra/cdk/lambda/lib/safety.ts:87-138` | Fail-open to `normal` confirmed — see §3 for an important nuance the report doesn't draw out. |
| DPNR-07 | `infra/cdk/lambda/lib/session-crypto.ts:55` | Confirmed — query is hardcoded to `':purpose': 'active_session'`, `post_session` tickets are never read anywhere in the codebase. |
| DPNR-08 | `infra/cdk/lambda/rooms/command.ts:88` vs `:189` | Confirmed exactly — the version check at line 88 is pure application-code comparison; the write at line 189 is an unconditional `PutCommand` with no `ConditionExpression`. The check protects nothing under real concurrency. |
| DPNR-10 | `apps/web/next.config.ts` | Confirmed — no headers/CSP config at all, file is essentially a bare next-intl wrapper. |

I did not re-derive every one of the 15 findings byte-for-byte (DPNR-02, -09, -11 through -13, -15 are large or infra-only surfaces), but every claim I did check was accurate down to the cited line, and nothing I found contradicts the unchecked ones. I'd treat the whole report as reliable, not just the sampled rows.

## 3. Where my read adds to or refines the report

**DPNR-03 is under-scoped by one file.** `profile-setup/page.tsx:26,35` has the exact same unvalidated `next` → `router.push(next)` pattern as login and consent, and it sits on the same protected-route redirect chain (`proxy.ts`'s profile-setup gate). Any fix needs to cover three pages, not two, plus `proxy.ts`'s own `next` assignment sites as a defense-in-depth measure even though the middleware itself only ever writes a same-origin pathname.

**DPNR-06 is not really one bug — it's a deliberate decision plus three separate operational gaps, and conflating them will lead to fixing the wrong thing.** The fail-open-to-`normal` behavior at `safety.ts:73-79` is explicitly justified in a doc comment as implementing the intelligence spec's own §32 failure-state table ("AI extraction failure: keep session usable... do not create fake signals"), i.e. this was a considered clinical/product call, not an oversight. I'd leave that default alone rather than "fixing" it into a hard fail-closed, which the report's own suggested remediation (return a fixed neutral message on failure rather than routing into normal reflection) already correctly avoids reversing. What actually needs fixing are the three things that make the fail-open path *unsafe* rather than merely conservative: no confirmed SNS subscriber on the immediate-danger topic, the native guardrail attached only to the safety-classification call and not to ordinary response generation, and room-side extraction silently skipping any string under 20 characters (which is exactly where a terse crisis statement lives). Scope the fix to those three; get the fail-open default itself explicitly signed off as an ADR (it may already deserve one, given it's cited as spec-mandated) rather than silently re-deciding it.

**DPNR-01, DPNR-04, and DPNR-14 are one root cause wearing three hats.** All three trace back to the Next.js app never having been fully cut over from Supabase/OpenAI to Cognito/Bedrock — the dependency bump, the dead route, and the incomplete `render.yaml` are symptoms of the same unfinished migration. Doing them as one slice (delete the legacy plane, rewrite `render.yaml` from scratch against what the live app actually needs, bump Next/Sharp, realign `eslint-config-next`) is cheaper and lower-risk than three separate passes that each have to re-check the same file.

## 4. Prioritized remediation plan, sequenced for this project's session-by-session convention

Each row is sized to be one `AGENT_LOG.md` slice (matching this repo's own convention: build, verify against a real throwaway account or `cdk synth`/typecheck, log, hand off).

| Slice | Closes | Work |
|---|---|---|
| **S1** | DPNR-01, DPNR-04, DPNR-14 | Delete `/api/ai`, `/auth/callback`, Supabase client/types/migrations, Supabase/OpenAI deps. Rewrite `render.yaml` with only the vars the live Cognito/Bedrock app needs, `npm ci` not `npm install`, pinned Node patch. Bump `next`→≥16.3.3, `sharp`→≥0.35.4, align `eslint-config-next`. Clean `npm audit`, `next build`, `npm run lint` as the exit bar. |
| **S2** | DPNR-03 | One shared `resolveSafeNext()` helper (relative-path-only, no scheme/backslash/protocol-relative, allowlist of real routes, default `/companion`). Apply to `login`, `consent`, **and `profile-setup`**. Add the `javascript:`/`data:`/`//host`/encoded/backslash test cases the report names. |
| **S3** | DPNR-02 | This is a product decision, not a patch — needs your explicit call on server-decryptable-with-honest-copy vs. true E2EE (the latter conflicts with the scheduled Daily Card/Weekly Recap jobs, which need server-side decrypt on a timer with no user present). Recommend keeping the current architecture and rewriting consent/privacy copy accurately, since real-time server-side model processing and the continuity jobs both structurally require server DEK access. Record as an ADR either way; route the copy through counsel before any external user sees it. |
| **S4** | DPNR-05 | Move `consumeCredits`/a free-tier abuse quota ahead of both the safety and interaction-mode model calls in `message.ts` and ahead of the REFINE check in `rooms/command.ts`. Add a `.max()` to `CompanionMessageRequestSchema.text`, bound room command payload size, add per-user/IP throttling at API Gateway. |
| **S5** | remainder of DPNR-06 | Confirm/add a real SNS subscriber on the immediate-danger topic, attach the guardrail to generation calls too, fix the room extractor's 20-char skip, write down the fail-open default as an ADR rather than changing it. |
| **S6** | DPNR-07 | Require an explicit `purpose` argument on every `getSessionCrypto()` call site; interactive handlers pass `active_session`, `compose-daily-card.ts`/`compose-weekly-recap.ts` pass `post_session`. Add expiry/multi-login/sign-out tests. |
| **S7** | DPNR-08 | Conditional write (or a DynamoDB transaction coupling session write + credit reservation) on `sessionVersion` in `rooms/command.ts`, replacing the unconditional `PutCommand` at line 189. |
| **S8** | DPNR-09 | Server-owned erasure workflow covering the session-tickets table and any legacy-provider data, not just the application-table partition `delete.ts` currently handles. |
| **S9** | DPNR-10 | CSP (nonce/hash-based, `frame-ancestors 'none'`), HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` in `next.config.ts`/at the edge. Do this after S2, not before — a strict CSP makes the unsafe-navigation bug harder to exploit but isn't a substitute for fixing it. |
| **S10** | DPNR-11 | Make `isProduction` a stack invariant instead of an optional CDK context flag; deletion protection, alarms (4xx/5xx/cost/safety-failure), tracing, bounded log retention, Cognito MFA. |
| **S11** | DPNR-12 | CI (build/lint/typecheck/audit as required checks), branch protection, handler-level tests for auth/consent/credits/erasure/concurrency. |
| **S12** | DPNR-13 | Reject control characters or swap in a real ICS-escaping library in `calendar/ics/route.ts`. |
| **S13** | DPNR-15 | Doc/pricing/hosting drift pass — same discipline the repo already applies to `MVP_ARCHITECTURE.md`/`PHASE_AUDIT.md`. |

**S1 and S2 should be the very next session's work regardless of how S3 (the privacy/architecture decision) resolves** — neither depends on it, both are self-contained, and S1 in particular is the one item blocking a clean `npm audit`, which the report treats as a release condition.

## 5. Bottom line

No real disagreement with the report's technical findings — everything I checked held up exactly as cited. The one gap I'd flag back is scope (profile-setup's identical `next` bug) and the one framing I'd push back on is DPNR-06 — it's a documented clinical decision with three real operational holes around it, not a single fail-open bug to reverse. Don't onboard external users before S1-S6 land; S7-S13 should close before any of them touch real personal content at scale.
