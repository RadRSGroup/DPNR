# DPNR — Hebrew Localization + Language Selector: Plan

**Status: Slices A, B, C, and a first increment of D built and live-verified,
Session 50 (2026-09-14). A and B are deployed to real AWS; C and D are
frontend-only, nothing to deploy. D is partial — see §14 for exactly what's
covered and what's deliberately deferred.**
Written Session 48 (2026-09-11)
after a full
codebase survey. Scope, per the user's explicit choice: **both** static UI
translation **and** localization of the AI-generated conversational content
(Companion, Decision Room, Mirror Room, Twin, Roadmap, Library, Continuity,
and the safety/crisis system) — not UI-chrome-only.

This is a large, cross-cutting effort touching the frontend, the auth/session
layer, and every Bedrock prompt in the system. It's broken into independently
shippable slices (matching this project's existing Slice convention — see
Sessions 21-27 in `AGENT_LOG.md`), each with its own verification bar. Do not
attempt to build all of this in one session.

---

## 1. What already exists (don't rebuild it)

The codebase has **more locale plumbing already in place than expected**,
just entirely unused:

- `packages/shared-types/src/dynamo/account.ts` — `UserProfileItemSchema`
  already has `preferredLanguage: z.enum(['en', 'he']).default('en')`. This
  is the correct type and the correct place for it. It is dead code today:
  written once, hardcoded to `'en'`, at signup
  (`infra/cdk/lambda/auth/post-confirmation.ts:48`), and never read or
  updated anywhere else in the repo (confirmed by a full-repo grep).
- `infra/cdk/lambda/auth/pre-token-generation.ts` already establishes the
  exact pattern needed to carry a profile field onto the JWT cheaply: it
  reads the `PROFILE` item and injects `custom:consent` via
  `claimsOverrideDetails`, with an explicit, already-written design note
  that the claim is **"a fast-path optimization, not the sole enforcement
  boundary — it's only as fresh as the last token refresh,"** and that
  handlers needing precision must still check the real DynamoDB value.
  **Reuse this same pattern and the same staleness caveat for
  `custom:locale`** — don't invent a token-refresh-forcing mechanism to
  solve a problem this codebase has already decided is acceptable to leave
  as a fast-path hint.
- The Bedrock call path is already fully centralized: every one of the
  ~25 `resolvePromptVersion(...)` call sites across ~20 files funnels into
  one shared `callPromptModel()` (`infra/cdk/lambda/lib/model-call.ts`), and
  prompt templates already support `{{var}}` substitution via
  `fillTemplate()` (`infra/cdk/lambda/lib/prompt-registry.ts`). Adding a
  `{{language}}` variable is a mechanical extension of a pattern that
  already exists everywhere, not new architecture.
- The Prompt Registry is already versioned and alias-resolved
  (`domain/name@vN`, `prod` alias). Editing a prompt's text — which is what
  "localize the AI responses" mostly reduces to — already has a safe,
  established mechanism: register a new version, verify, flip the alias.
  This project has done exactly this before for safety-prompt fixes (see
  ADR 0012 / Session 30's incident writeup).

## 2. What's missing

- **No i18n library** in `apps/web/package.json` — zero i18n infrastructure
  exists today (checked `next-intl`, `i18next`, `react-intl`; none present).
- `apps/web/src/app/layout.tsx` — `<html lang="en">` with **no `dir`
  attribute at all**. RTL has never been considered.
- Only Latin fonts loaded (`Inter`, `Playfair Display` via
  `next/font/google`, default `latin` subset) — **no Hebrew glyph
  coverage**. Hebrew text would render in a fallback system font today,
  inconsistent with the rest of the design system.
- Hardcoded locale strings that will misbehave for Hebrew users regardless
  of anything else: `'en-GB'` in `apps/web/src/app/decision/[id]/page.tsx:51`,
  `apps/web/src/app/mirror/[id]/page.tsx:24`, and
  `apps/web/src/components/ui/CalendarButtons.tsx:49`; `'en-US'` in
  `apps/web/src/components/shared/AlignmentHistoryChart.tsx:24`; an
  unlocaled `toLocaleDateString()` in `apps/web/src/app/(app)/wallet/page.tsx:256`.
- `apps/web/src/proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts`;
  confirmed present) is a **hand-written auth/consent redirect gate** with
  an explicit path allowlist in its `matcher` — it does not cover every
  route (e.g. `/`, `/pricing`, `/privacy`, `/terms`, `/auth/*` aren't in it
  today). Next.js allows exactly one proxy/middleware file. **A locale
  router cannot be added alongside this file — it has to be merged into
  it**, or the auth gate silently stops firing (or vice versa). This is the
  single easiest thing to get wrong in Slice A; see §4.1.
- `infra/cdk/lambda/lib/safety.ts` has one hardcoded, non-templated English
  string, `FALLBACK_SAFETY_MESSAGE` (line 147-149) — the reply used **only
  when the Bedrock call itself fails**. It deliberately bypasses the Prompt
  Registry (a DB-dependent registry lookup would be one more thing that can
  fail on the exact turn it exists to protect). It needs a hardcoded Hebrew
  twin, not a registry entry.
- Two large **content** assets are English-only and out of engineering's
  control to "translate" quickly: the 54-topic Content Library (full lesson
  text per topic, `infra/cdk/scripts/library-topics-v2.seed.ts`) and the
  300-question Pull-a-Card bank (`infra/cdk/scripts/guidance-cards.seed.ts`).
  This is real translation volume, not a coding task — see §6.

## 3. Library choice and architecture (static UI)

**Recommendation: `next-intl`.** It's the current standard for Next.js App
Router specifically (server-component-native, no client-bundle tax for
translations rendered on the server, first-class middleware for locale
routing) — as opposed to `i18next`/`react-i18next`, which predate the App
Router and need more manual wiring to avoid shipping translations to the
client unnecessarily. React 19 + Next 16 are recent enough that library
compatibility should be re-checked at implementation time, not assumed from
this doc.

**Routing:** locale-prefixed URLs, `en` as the default **unprefixed**
locale (`/companion`, `/dashboard`, ...) and `he` **prefixed**
(`/he/companion`, `/he/dashboard`, ...) — next-intl's "as-needed" mode.
This is the option that disturbs the existing 76-file app the least: every
current URL, bookmark, and internal link keeps working unchanged for
English users; only Hebrew adds a new prefix.

**Explicitly exclude from locale routing:** `/api/*` (backend, not a page),
and `/auth/*` (Cognito hosted-flow / OAuth callback path, if or when that
lands — Session 47 deferred Google OAuth, but the route dir exists). Cognito
app-client redirect URIs are exact-string-matched; a locale prefix
silently appearing on an OAuth callback path would break sign-in outright.
Treat this as a hard constraint, not a style preference.

## 4. Concrete integration points

### 4.1 `proxy.ts` — merge, don't duplicate

`next-intl`'s `createMiddleware(routing)` and the existing hand-written
auth/consent gate must run as **one** function. Recommended shape: run
`createMiddleware` first to resolve/rewrite the locale, strip the resolved
locale prefix off `pathname` before evaluating the existing
`isProtected`/`isAuthPage`/`isConsentPage` checks (so `/he/dashboard` still
matches `/dashboard`'s rule), then let the auth/consent redirects run as
today — building the redirect target back through next-intl's locale-aware
link helper so a redirect to `/login` from `/he/dashboard` correctly lands
on `/he/login`, not `/login`. Widen the `matcher` to cover the routes that
currently fall outside it (`/`, `/pricing`, `/privacy`, `/terms`, `/signup`,
`/forgot-password`) since those need locale-prefixing too, while keeping
`/api` and `/auth` excluded per §3.

### 4.2 Locale resolution on the backend

Priority order for what language a given Lambda invocation should respond
in:
1. `custom:locale` JWT claim (mirrors the existing `custom:consent`
   pattern in `pre-token-generation.ts`, same staleness caveat — cheap,
   good enough for anything non-critical).
2. `UserProfileItem.preferredLanguage` read directly from DynamoDB — the
   authoritative value. Several flows already fetch the profile item for
   consent/tier checks; **reuse that read** rather than adding a second
   DynamoDB call per request wherever one already exists.
3. `'en'` default.

Whatever the implementing session picks, **validate the resolved value
against the existing `z.enum(['en','he'])`** before it touches a template
or a filename — never let a raw claim/query-param string flow unchecked
into `fillTemplate()` or a dynamic message-file import (see §7, injection
note).

### 4.3 Threading `{{language}}` into prompts

For every prompt currently resolved via `resolvePromptVersion` +
`fillTemplate`, add a `language` var (e.g. `"English"` / `"Hebrew"`, not
the raw `en`/`he` code — models follow a spelled-out instruction more
reliably) and one instruction line near the top of each system prompt:
*"Respond to the user entirely in {{language}}."* This means:
- Editing the 8 seed files (`companion-prompts.seed.ts`,
  `decision-room-prompts.seed.ts`, `mirror-room-prompts.seed.ts`,
  `daily-card-prompts.seed.ts`, `weekly-recap-prompts.seed.ts`,
  `safety-prompts.seed.ts`, `twin-prompts.seed.ts`, `roadmap-prompts.seed.ts`,
  `library-prompts.seed.ts`) to add the var + instruction, registering each
  as a new prompt version, verifying, then flipping the `prod` alias —
  exactly this project's existing prompt-change mechanism, applied ~25
  times (once per call site, some files have multiple prompts).
- Updating each of the ~20 calling files to pass `language` in the vars
  object they already build for `fillTemplate`.

This is **instruction-based localization, not prompt duplication** —
there is one English-authored prompt catalog, and Claude (natively
multilingual) generates the actual Hebrew output at request time. This
was chosen over maintaining two parallel prompt catalogs because: (a) the
seed files are ~4,000 lines combined and a forked Hebrew copy would drift
from the English one every time either is tuned, with no mechanism today
to catch that drift; (b) Claude's Hebrew fluency needs verifying per-flow
regardless of which approach is chosen, so duplication buys nothing on the
"does it actually respond well in Hebrew" question. **Trade-off to accept
knowingly:** this makes translation quality a function of model behavior,
not of a human-reviewed static string — every flow needs a live check (a
real Hebrew-language session per room type) before being trusted, not just
a code review.

### 4.4 Safety/crisis prompts — same mechanism, extra care

`safety-prompts.seed.ts`'s `respond_concern`/`respond_overload`/
`respond_high_stakes`/`respond_danger` get the same `{{language}}`
treatment as §4.3, **plus an explicit, unchanged carry-over of ADR 0012's
existing constraint**: generic, locale-agnostic support language, **no
named hotlines or locale-specific resources**, in Hebrew exactly as in
English. This is not a new rule to invent — it's the rule already in force,
and there's already a documented incident (Session 30) where the model
improvised specific hotline numbers when the intended prompt path didn't
fire correctly, treated as a real ADR 0012 violation. The same failure mode
is at least as likely in Hebrew (the model may reach for Israeli-specific
resources — e.g. ER"N/1201 — on its own initiative) and needs the same
"reproduce and verify the fix live" bar Session 30 used, not a paper review.

`FALLBACK_SAFETY_MESSAGE` (safety.ts:147-149) is **not** part of this
mechanism — it's a hardcoded fallback used specifically when the Bedrock
call has already failed, so asking a model to translate it defeats its
purpose. It needs a hand-translated, human-reviewed Hebrew constant
selected by validated locale, e.g.:
```ts
const FALLBACK_SAFETY_MESSAGE: Record<'en' | 'he', string> = { en: '...', he: '...' }
```
Keep it a plain code-level constant, not a registry lookup — that's the
existing design intent (no DB dependency on the exact path that exists
because something already failed), just extended to two locales.

### 4.5 Classification step (`classify_safety_state`)

This step's *input* is free-text user messages (already language-agnostic
today — nothing to change) and its *output* is a structured
state/confidence/reason-code object, not user-facing prose. No `{{language}}`
var needed here. Verify Hebrew-language user input classifies correctly
across all four non-normal states before shipping — this is a real behavior
question (does the classifier reliably recognize distress phrased in
Hebrew?), not just a translation question, and belongs in the same live-test
pass as §4.4.

## 5. RTL and visual design

- `<html lang={locale} dir={locale === 'he' ? 'rtl' : 'ltr'}>` in the (now
  locale-aware) root layout — the one currently-missing attribute that
  matters most; the browser's own bidi algorithm handles a great deal once
  this is correct.
- Tailwind's directional utilities (`pl-*`/`pr-*`, `left-*`/`right-*`,
  `text-left`/`text-right`, `rounded-l-*`/`rounded-r-*`) are **physical**,
  not logical — `dir="rtl"` does not flip them automatically. They need
  migrating to Tailwind's logical-property equivalents (`ps-*`/`pe-*`,
  `start-*`/`end-*`, `ms-*`/`me-*`) wherever a component's layout is
  direction-sensitive. With ~1,738 `className=` occurrences across 76
  files, don't attempt this as one pass — migrate shell/nav/shared
  components first (Slice C), then let each subsequent slice fix its own
  screens' directional classes as it touches them, same incremental
  discipline as everything else in this project. Add a grep-based CI check
  (or a stylelint rule) that flags new physical-direction classes going
  forward so the debt doesn't silently regrow.
- Directional icons (`lucide-react` back/forward chevrons, arrows) need an
  explicit RTL mirror (e.g. `rtl:-scale-x-100` on the icon wrapper) — audit
  case by case; icons with no inherent direction (checkmarks, search,
  X-to-close) must **not** be flipped.
- **Font gap, needs a product/design decision, not just an engineering
  one:** `Inter` (body) has partial Hebrew support via `next/font/google`'s
  `hebrew` subset, so it can likely stay as the shared body font. `Playfair
  Display` (display/heading font) has **no Hebrew glyphs and no direct
  Hebrew equivalent** — a serif display face with a comparable feel. This
  needs a real choice (e.g. drop to the Hebrew-capable sans at a heavier
  weight for `he` headings, or pick a distinct Hebrew display face and
  accept the two locales won't look identical at the type level) before
  Slice C is really "done," not just "compiles."

## 6. Content translation (the actual biggest line item)

Two content sets are large enough to be their own workstream, separate
from all the engineering above, and are **not** solvable by the
instruction-based approach in §4.3 (they're fixed reference content shown
verbatim, not generated per-request):
- The 54-topic Content Library — full lesson text per topic
  (`library-topics-v2.seed.ts`), extracted from a founder-authored PDF.
- The 300-question Pull-a-Card bank (`guidance-cards.seed.ts`).

This is a genuine translation-and-clinical-review task (the content is
psychological/self-development material, not marketing copy — the same
sensitivity this project already treats crisis copy with) and needs a
Hebrew-fluent human reviewer, not a mechanical pass. Recommend sequencing
this **after** Slices A-F prove the mechanism works and after the user has
identified who does this review — don't block the rest of the plan on it,
but don't understaff it either by treating it as "just more translation
strings."

## 7. Security and correctness — non-negotiable, per project guardrails

This project's own standing guardrail (`AGENT_LOG.md` §"Standing
engineering guardrails") already requires a `security-review` pass on
anything touching auth — the `custom:locale` claim work in §4.2 qualifies
and should get one, same as the original `custom:consent` work presumably
did.

- **Locale is a UX preference, never an authorization signal.** Nothing in
  `safety.ts`'s classification/routing *decision* logic should ever branch
  on locale — only the *text* of the response should vary. Keep this
  boundary explicit in code (e.g. don't let a `locale` param leak into a
  function whose job is to decide *whether* to route to a crisis
  response, only into the ones that decide *what to say*).
- **Validate, don't trust.** Every entry point for a locale value (URL
  segment, cookie, JWT claim, DynamoDB field, any future query param) must
  be checked against the existing `z.enum(['en', 'he'])` before use. Never
  interpolate a raw locale string into a dynamic import path
  (`messages/${locale}.json`) or a template key — that's a directory-
  traversal-shaped bug class even with only two "real" values, and
  next-intl's own routing config (a fixed locale array) already prevents
  this if configured correctly; don't bypass it with a second, ad hoc
  locale-driven dynamic import elsewhere (e.g. font selection).
- **No unescaped interpolation.** Any translated string with a variable
  (ICU `{name}`-style placeholders) must go through next-intl's own
  `t()`/`t.rich()`, which escapes by default — audit that no code path
  takes a translated string and a user-controlled variable and combines
  them via `dangerouslySetInnerHTML` or raw string concatenation into HTML.
- **Translation files are code, not data.** Treat `en.json`/`he.json` (and
  any future translation-vendor export) exactly like any other dependency
  — normal PR review before merge, no runtime auto-pull from an external,
  unreviewed source. If a third-party translation service is ever used,
  its output still goes through review before shipping; this project has
  no human dev team, so "review" means an explicit session step, not an
  assumption that a vendor's output is trustworthy by default.
- **UTF-8 everywhere**, explicitly — HTTP response headers, DynamoDB
  (already UTF-8-safe), and specifically `resend`-sent emails (subject +
  body charset), which are easy to miss since they're not rendered in a
  browser during normal testing.
- **Encoding/formatting correctness**, not just translation: fix the four
  hardcoded-locale sites in §2 to use the resolved locale via
  `Intl.DateTimeFormat`/`next-intl`'s formatting helpers, so Hebrew users
  don't see British- or US-formatted dates inside an otherwise-Hebrew page.
- **CI guard against silent partial translation.** Add a simple script
  (diff the key sets of `en.json` vs `he.json`) that fails CI if a key
  exists in one and not the other — next-intl falls back silently to the
  default locale's string (or the raw key) on a miss, which is exactly the
  kind of thing that ships unnoticed without an explicit check.

## 8. Proposed slices

Follows this project's existing Slice convention — one vertical slice per
session, each independently deployed and live-verified before the next
starts, `AGENT_LOG.md` updated per slice.

| Slice | Scope | Depends on |
|---|---|---|
| **A** | i18n infra: install `next-intl`, `[locale]` routing (`en` unprefixed / `he` prefixed), merge into `proxy.ts` (§4.1), `<html lang dir>` wiring, extract existing hardcoded UI strings into `en.json`. No visible behavior change beyond a working (empty) `/he` route. | — |
| **B** | Language selector UI (header nav + account/settings) + persistence: write `preferredLanguage` via the account API, set a guest cookie, add `custom:locale` claim injection (§4.2, mirroring `custom:consent`) — gets its own `security-review` pass per the standing guardrail. | A |
| **C** | RTL shell + Hebrew typography: `dir` switching verified across the app shell, logical-property migration for nav/shared components, Hebrew-capable font(s) (§5's font decision resolved first), directional-icon audit, CI lint for new physical-direction classes. | A |
| **D** (partial — see §14) | Static UI content: translate the extracted `en.json` → `he.json` (auth, nav, forms, settings, pricing, legal/marketing, empty/error states), fix the 4 hardcoded-locale date/format sites, add the CI key-parity check (§7). **Done**: auth funnel (login/signup/forgot-password/consent), nav shell, legal (terms/privacy), pricing, root metadata, error boundary, all 6 hardcoded-locale sites, the CI check. **Not done**: Dashboard/Companion/Decision Room/Mirror Room/Library/Growth Tracker/Evolution Map/Wallet/Account screen content (~900+ strings) — deferred, likely sequenced with Slice E per §14's reasoning. | A, C |
| **E** | AI-content localization infra: `{{language}}` var threaded through the 8 seed files + ~20 call sites (§4.3), re-seed, live-verify one real Hebrew-language session per room type (Companion, Decision Room, Mirror Room, Twin, Roadmap, Library, Continuity) for fluency and no code-switching. | A, B |
| **F** | Safety/crisis localization (§4.4/§4.5) — highest care, its own live-verification pass reproducing Session 30's "does the model stay on-script" test in Hebrew, plus the hand-translated `FALLBACK_SAFETY_MESSAGE` twin. | E |
| **G** | Content Library + Pull-a-Card translation (§6) — content-ops workstream, sequenced once A-F are proven; needs a named human reviewer. | D |
| **H** | QA/rollout: full RTL visual pass, e2e locale-switch-persists test, Bedrock-output-language spot checks across all flows, staged rollout (flag or beta cohort, consistent with this project's existing internal/founder-testing-first precedent per ADR 0007), `AGENT_LOG.md`/`PHASE_AUDIT.md` updated. | A-F (G optional before full launch) |

## 9. Open decisions — resolved 2026-09-14

1. **Rollout gating**: verify each slice thoroughly and deploy it once it
   genuinely works, rather than batching everything to one big-bang launch
   or holding everything back to the end. Applies per-slice, including
   Slice F (safety/crisis) getting its own explicit verification pass
   before it ships, not a blanket end-of-project hold.
2. **Who reviews Hebrew output for quality/clinical correctness**: the
   user has a Hebrew-speaking reviewer lined up. For Slice G specifically
   (Content Library + Pull-a-Card), the user will supply the translated
   content directly, already reviewed by that Hebrew speaker — Slice G's
   job becomes ingesting reviewed content, not sourcing/translating it.
3. **Hebrew display-font choice** (§5): resolved — Heebo (body, pairs with
   Inter) + Frank Ruhl Libre (display/headings, the closest available
   analogue to Playfair Display's editorial feel), both via
   `next/font/google`. Built in Slice A (§10) using the same
   `--font-sans`/`--font-display` CSS variable names the Latin fonts
   already use, specifically so a later swap only touches
   `app/[locale]/layout.tsx`.
4. **Guest locale detection**: auto-detect (next-intl's default
   `Accept-Language` negotiation, with the `NEXT_LOCALE` cookie persisting
   an explicit choice or a prior auto-detected visit) — this is next-intl's
   built-in behavior, no custom code needed.

## 10. Gender field (added 2026-09-14, alongside Slice A)

Hebrew marks grammatical gender on second-person verb conjugation — AI-
generated Hebrew responses (Slice E) need to know which form to use.
Resolved with the user: a `Male / Female / Prefer not to say` question, on
a **dedicated profile/signup field** (not folded into Companion's
conversational onboarding).

- `GenderIdentitySchema = z.enum(['male', 'female', 'unspecified'])` and
  `UserProfileItemSchema.genderIdentity` (default `'unspecified'`) added in
  Slice A (`packages/shared-types/src/dynamo/account.ts`), right next to
  `preferredLanguage` since both are read together wherever Slice E resolves
  what to tell the model. `infra/cdk/lambda/auth/post-confirmation.ts`
  updated to set the new required field explicitly (mirrors how it already
  explicitly sets `preferredLanguage: 'en'` despite both having Zod
  defaults — a literal typed as the schema's output type doesn't get
  defaults for free, only `.parse()` does).
- **Not built yet, and deliberately not the same session as the schema
  change**: the actual signup-form question and its persistence. Cognito
  custom attributes **cannot be added to an already-live User Pool**
  without recreating it (a real AWS constraint, not a preference) — so
  both `genderIdentity` and `preferredLanguage` have to be written via a
  DynamoDB profile-update API call made right after Cognito signup
  completes, not a Cognito custom attribute. This endpoint doesn't exist
  yet. Building it is real backend work (new Lambda + API Gateway route +
  CDK deploy) that belongs in **Slice B** (Language Selector +
  persistence) alongside `preferredLanguage`'s own write path — both
  fields should go through the same endpoint and the same
  `security-review` pass, not two separate ones.
- `'unspecified'`'s actual grammatical fallback in Hebrew output (Hebrew
  has no fully standard neutral second-person conjugation) still needs a
  real choice before Slice E ships — flagged there, not resolved here.

## 11. Slice A — built and locally verified, Session 50 (2026-09-14)

**Committed (`51bf9f3` on `mvp`) at the user's explicit request. Not pushed,
not deployed.** Built and verified against the local dev server only, per
this project's protocol of getting the user's go-ahead before touching real
infrastructure or shared git history.

- Installed `next-intl@4.14.5` (confirmed compatible with `next@^16.3.1`/
  `react@^19`). While auditing dependencies for the install, `npm audit`
  surfaced a **critical, unrelated, pre-existing** advisory — "Next.js:
  Unauthenticated Remote Code Execution on Windows-hosted servers,"
  affecting `next` 16.0.0-16.3.2 — plus a high-severity `js-yaml` issue and
  a high-severity `sharp` issue. All three had non-breaking fixes available
  (`npm audit fix`, no `--force`); applied them, bumping `next` in-range
  from 16.3.1 to **16.3.5** (`package.json`'s `^16.3.1` range is unchanged,
  only the resolved/installed version moved). Confirmed via a full rebuild
  that nothing broke. One remaining moderate `@vitest/mocker` advisory
  needs `vitest@5` (a breaking major-version bump) — left alone, flagged as
  backlog, not fixed opportunistically mid-slice.
- `src/i18n/routing.ts` (`defineRouting`, locales `['en','he']`,
  `localePrefix: 'as-needed'`), `src/i18n/navigation.ts` (`createNavigation`
  → `Link`/`redirect`/`usePathname`/`useRouter`/`getPathname`),
  `src/i18n/request.ts` (`getRequestConfig`, validates the resolved locale
  against `routing.locales` before it ever reaches a dynamic
  `messages/${locale}.json` import — the §7 injection guard, applied for
  real). `next.config.ts` wrapped with `createNextIntlPlugin`.
  `messages/en.json`/`messages/he.json` created with one placeholder key —
  full string extraction is still Slice D's job, not attempted here.
- **Directory restructure** (`git mv`, history preserved): every page route
  moved under `app/[locale]/` — `(app)/*`, `consent`, `decision`,
  `forgot-password`, `login`, `mirror`, `pricing`, `privacy`, `rooms`,
  `signup`, `terms`, plus the root `page.tsx`/`layout.tsx`/`error.tsx`.
  `api/*` and `auth/*` (Cognito callback) stay outside `[locale]` untouched,
  per §3's hard constraint. Also deleted the pre-existing, empty, dead
  `(auth)/login`+`(auth)/signup` route group found during the move — never
  had any files in it, not related to this work, just noise removed while
  in the area.
- **`app/[locale]/layout.tsx`** rewritten: validates the incoming `locale`
  param with `hasLocale`/`notFound`, calls `setRequestLocale`, sets
  `<html lang dir>` for real, wraps children in `NextIntlClientProvider`.
  Hebrew fonts resolved (§9 item 3) — Heebo + Frank Ruhl Libre via
  `next/font/google`, `subsets: ['hebrew','latin']`, deliberately reusing
  the exact same `--font-sans`/`--font-display` CSS variable names the
  English fonts already used (only one pair's `.variable` class is ever
  present on `<body>` at a time, so there's no collision) — every existing
  component using Tailwind's `font-display` utility works unchanged for
  both locales, zero per-component edits needed.
- **`proxy.ts` merge** (§4.1's identified risk): `createMiddleware(routing)`
  runs first; the existing hand-written auth/consent cookie gate then
  evaluates against the de-prefixed pathname and, only when IT needs to
  redirect, builds a locale-aware target itself (`withLocale()`) instead of
  using next-intl's response — otherwise next-intl's own response (rewrite/
  redirect/cookie) passes through untouched. Matcher widened from the old
  explicit protected-paths array to next-intl's standard negative-lookahead
  (`/((?!api|auth|_next|_vercel|.*\..*).*)`) so public/marketing pages get
  locale routing too, while `/api` and `/auth` stay excluded. One accepted,
  documented rough edge (see the comment in `proxy.ts` itself): an
  unauthenticated, Hebrew-preferring visitor whose very first request is a
  direct deep link to an unprefixed protected route takes one extra redirect
  hop (`/login` → `/he/login`) before landing correctly — confirmed live,
  not just theorized; not worth fully re-deriving next-intl's own
  negotiation logic to collapse into one hop.
- **Navigation sweep**: every `Link`/`useRouter`/`usePathname` import
  switched from `next/link`/`next/navigation` to `@/i18n/navigation`
  (`useParams`/`useSearchParams`/`notFound` correctly left on
  `next/navigation` — they're not locale-aware). Caught one real miss on
  the first pass: two files used double-quoted import specifiers
  (`from "next/link"`) while the rest of the codebase uses single quotes,
  which the first grep/sed pass — written against single-quote patterns —
  silently skipped. Found by clicking the actual "Sign In" link in the
  browser under `/he` and seeing it resolve to `/login` instead of
  `/he/login`, not by re-reading the diff. Fixed
  (`app/[locale]/page.tsx`); a second exhaustive any-quote-style grep
  afterward found zero remaining misses.
- Gender schema addition (§10) done alongside this slice — see that
  section for exactly what's built vs. still open.
- **Verified**: `npm run build` (shared-types + web), `apps/web`
  `tsc --noEmit`, `npm run lint`, and `npx vitest run` (26 tests) all clean.
  Live-checked against a real local dev server: `/` unprefixed and English
  by default with zero `NEXT_LOCALE` cookie present (no regression from
  today's live behavior); `/he` renders with `dir="rtl"`, `lang="he"`, and
  the Hebrew font pair, with no console errors; `/dashboard` and
  `/he/dashboard` (both unauthenticated) redirect to `/login`/`/he/login`
  respectively with a correctly locale-prefixed `?next=` target; the
  homepage's Sign In/Sign Up links resolve to the locale-correct target
  under both `/` and `/he` after the navigation-sweep fix above.
  **Not verified**: any authenticated flow, any page beyond the homepage's
  visual RTL rendering, or anything past Slice A's own scope (no
  translated content exists yet — Hebrew pages currently show English
  strings laid out right-to-left, which is expected and correct for this
  slice, not a bug).
- **Not done at the time this section was written**: no CDK deploy — Slice
  A is frontend-only and didn't need one. Committed as `51bf9f3`/`c01181e`
  immediately after, at the user's request; still not pushed to `origin`.

## 12. Slice B — built, deployed to real AWS, and live-verified, Session 50 (2026-09-14)

Language selector + persistence, plus the gender-onboarding field from §10.
Built directly after Slice A in the same session, at the user's request
("complete slice b").

**Backend** (`packages/shared-types/src/api/account.ts`,
`infra/cdk/lambda/account/preferences.ts` + `preferences-get.ts`,
`infra/cdk/lib/api-stack.ts`, `infra/cdk/lambda/auth/pre-token-generation.ts`):
- `PUT /v1/user/preferences` and `GET /v1/user/preferences` — the write/read
  pair `preferredLanguage`/`genderIdentity` never had. Same shape as the
  existing `consent.ts` write-path pattern (requires an existing `PROFILE`
  item, never creates one); PUT accepts either or both fields via a Zod
  `.refine()` that rejects an empty body. `UserPreferencesFn` gets
  `grantReadWriteData`, `UserPreferencesGetFn` gets the narrower
  `grantReadData` — confirmed exactly this via `cdk diff` before deploying,
  each Lambda's API Gateway invoke permission scoped to just this one route
  ARN, not a wildcard.
- `pre-token-generation.ts` now also injects `custom:locale` (mirroring the
  existing `custom:consent` claim exactly, same fast-path/staleness caveat
  extended rather than re-litigated) — added but not yet consumed by
  anything; Slice E is what will actually read it for Bedrock prompts.
- Deployed for real: `cdk diff` reviewed first (confirmed AWS identity via
  `sts get-caller-identity` — account `346866989957`, matches; every
  Lambda in `Dpnr-Api` rebundled from the `shared-types` version bump, same
  precedent as prior shared-types-triggered deploys; only genuinely new
  resources were the two `UserPreferencesFn`/`UserPreferencesGetFn`
  Lambdas + their two routes + IAM), then `cdk deploy Dpnr-Auth Dpnr-Api
  --require-approval never`. Both stacks reached `UPDATE_COMPLETE` cleanly.

**Frontend**:
- `components/shared/LanguageSelector.tsx` — native-name toggle
  ("English"/"עברית"), switches via next-intl's own `router.replace(pathname,
  {locale})` (also sets `NEXT_LOCALE` for guests, no manual cookie code
  needed) and, for a signed-in user, fires a best-effort
  `PUT /v1/user/preferences` — a failed persist is swallowed, matching this
  project's existing degrade-gracefully convention for non-critical writes
  (e.g. the Sidebar's Credits fetch). Placed in `Sidebar.tsx` (desktop) and
  the Account page (both platforms, since Account is one tap away from
  `MobileNav`) — not `MobileNav.tsx` itself, which has no room for it in
  its 5-icon bottom bar.
- `components/shared/GenderSelector.tsx` — a controlled 3-option
  (`Male`/`Female`/`Prefer not to say`) radiogroup, reused by both the
  signup form (local state only, written once the account exists) and the
  Account page (persists on click immediately via the same PUT).
- **Account page's "Preferences" card only renders the Gender control once
  `GET /v1/user/preferences` actually returns a value** — matches this
  project's own "honest state, never fabricate a default the user hasn't
  chosen" convention (the same rule Dashboard's empty-state cards already
  follow). A failed/pending read hides the control rather than guessing.
- `signup/page.tsx`: gender question added to the form; right after
  `signIn()` succeeds (before the recovery-code/session-ticket branching,
  so it fires exactly once regardless of which path is taken), a
  best-effort `updatePreferences({ preferredLanguage: locale, genderIdentity
  })` call writes the real selected values over the post-confirmation
  trigger's `en`/`unspecified` defaults.

**A real bug found live and fixed, not caught by review**: `proxy.ts`'s
`next` query param was being stored locale-prefixed
(`withLocale(pathname, locale)`), but `login/page.tsx` and
`consent/page.tsx` both consume it via the locale-aware `router.push(next)`
(from `@/i18n/navigation`), which prefixes the current locale itself —
double-prefixing produced a real `/he/he/companion` 404, hit live while
signing a throwaway test account through the actual consent flow under
`/he`. Fixed by storing `next` unprefixed and instead prefixing it only in
the one proxy-internal branch that consumes it via a raw
`NextResponse.redirect` (the "already consented, skip consent page"
branch) rather than the client router. Re-verified live after the fix:
`/he/consent?next=%2Fcompanion` now correctly lands on `/he/companion`,
not `/he/he/companion`.

**Live-verified end to end against a real throwaway Cognito test account**
(created via `sign-up` + `admin-confirm-sign-up`, per this project's own
documented lesson that `admin-create-user` skips the post-confirmation
trigger; signed in via a throwaway SRP script using
`amazon-cognito-identity-js` directly, since this app client only allows
the SRP auth flow, not `USER_PASSWORD_AUTH`):
- Post-confirmation correctly created the profile with
  `genderIdentity: "unspecified"`.
- A fresh sign-in's real ID token carried `"custom:locale":"en"` matching
  the profile; after a `PUT` changed `preferredLanguage` to `"he"`, a
  second fresh sign-in's token correctly carried `"custom:locale":"he"` —
  confirms the claim tracks the DB value at token-issuance time, as
  designed.
- `GET`/`PUT /v1/user/preferences` round-tripped correctly against real
  DynamoDB; an invalid enum value and an empty body were both correctly
  rejected with `400` and the exact validation messages the schema defines;
  an unauthenticated call correctly got `401` from the JWT authorizer
  before reaching the Lambda at all.
- Signed all the way through the real UI (login → consent → Companion) as
  this test account, confirmed the Sidebar's real desktop layout mirrors
  correctly under `he` (RTL), and — the actual point of the exercise —
  clicking the Sidebar's "English" button live changed the URL, the
  `NEXT_LOCALE` cookie, `<html lang>`, **and** wrote `preferredLanguage:
  "en"` to the real DynamoDB row; separately, clicking "Male" on the
  Account page's Gender control wrote `genderIdentity: "male"` to the same
  row. Both confirmed by a direct `aws dynamodb get-item` immediately
  after each click, not inferred from the UI alone.
- Full cleanup independently re-confirmed after the fact: Cognito test
  user deleted (`admin-delete-user`), all 3 DynamoDB rows under its
  partition deleted and re-queried to confirm zero remain (`PROFILE`,
  `CREDITS`, one `CREDITS#TXN#...` row from the beta-trial starter grant).

**Not done**: the `custom:locale` claim has no consumer yet (Slice E's
job); no static UI translation exists yet (Slice D); auto-navigating a
returning user to their *saved* `preferredLanguage` on login isn't
built — Slice B only built manual switching plus best-effort persistence,
matching the plan's original scope. Committed as `7aeb4db` on `mvp` at the
user's request; pushing to `origin` and any further deploys are separate
asks.

## 13. Slice C — built and live-verified, Session 50 (2026-09-14)

RTL shell + Hebrew typography (§5). Scoped, per the plan's own "don't
attempt this as one pass" discipline, to the **app shell only** —
`components/layout/*` (Sidebar, MobileNav, PageHeader, nav-items),
`components/shared/*`, `components/ui/*`, and the two `app/[locale]/
layout.tsx` files. Screen-level physical-direction classes (Companion,
Decision Room, Mirror Room, Library, signup, etc.) are explicitly **not**
touched here — each later slice fixes its own screens' classes as it
touches them, same as the plan always said. Hebrew typography itself
(Heebo/Frank Ruhl Libre) was already resolved and built in Slice A (§9
item 3) — nothing further needed there.

**Audited the actual shell scope, not assumed it** — grepped every
`className` in the four target directories for physical-direction Tailwind
tokens (`pl-/pr-/ml-/mr-/left-/right-/text-left/text-right/border-l-/
border-r-/rounded-{t,b}{l,r}-`) and every `lucide-react` import for
directional icons. Found less debt than the plan's "~1,738 `className=`
occurrences across 76 files" headline number suggested was possible in
scope — the shell itself is small and was already written fairly
direction-agnostic (`px-*`, `gap-*`, `items-start`/`items-end` are already
logical or symmetric and needed no change).

**Fixed** (4 files):
- `components/layout/Sidebar.tsx`: `border-r` (the seam between the
  sidebar and main content) → `border-e` — resolves to the correct
  physical side under either `dir`, confirmed live (below). The
  `SidebarMiniCard`'s `ChevronRight` ("navigate into Wallet/Profile," a
  genuinely directional affordance) got `rtl:-scale-x-100`.
- `components/layout/MobileNav.tsx`: `left-0 right-0` → `inset-x-0` — was
  already direction-agnostic in practice (both edges pinned to 0), just
  normalized off a physical utility name so it doesn't trip the new lint
  check below.
- `components/shared/RoadmapTimelineCard.tsx`: `text-left`/`text-right` →
  `text-start`/`text-end`; the internal `align?: 'left' | 'right'` prop
  (unused by any external caller — Dashboard/Growth/Evolution Map only
  ever pass `roadmap`) renamed to `'start' | 'end'` to match. Also gave
  both connector-line divs `rtl:bg-gradient-to-l` alongside their existing
  `bg-gradient-to-r`: Tailwind's flex row itself reverses visually under
  `dir="rtl"` (browser-native, no code needed), but a fixed-direction CSS
  gradient does **not** auto-flip with it — without the RTL override the
  amber→violet→magenta connector would visually point backwards relative
  to the now-reversed Current Focus→Theme→Direction node order.
- `components/shared/AlignmentHistoryChart.tsx`: the "latest score" header
  label's `text-right` → `text-end`. **Deliberately did not touch the SVG
  chart's own geometry** — added a doc comment explaining why: time-series
  charts conventionally keep a chronological left-to-right axis regardless
  of page reading direction (an internationally-recognized convention, not
  a Hebrew-specific gap), so mirroring it would make the data harder to
  read, not more localized. This is the plan's own §5 "icons with no
  inherent direction... must not be flipped" principle applied to a chart
  instead of an icon.

**New: a debt-ratchet CI lint check**, per §5's explicit ask ("Add a
grep-based CI check ... that flags new physical-direction classes going
forward so the debt doesn't silently regrow"). This repo has no GitHub
Actions CI — `apps/web/scripts/check-rtl-classes.mjs` is wired into
`npm run lint` instead (chained after `eslint`), so it runs under this
project's own existing "lint clean before done" discipline every session
already follows. It does **not** fail on the ~19 files/~25 occurrences of
pre-existing physical-direction classes in not-yet-migrated screens
(`apps/web/scripts/rtl-baseline.json`, the checked-in baseline) — it fails
only if a file's count goes *above* its baseline (regression) or a file
with no baseline entry introduces any (new debt in a fresh file). A future
slice that migrates one of the baseline files re-runs the script with
`UPDATE_RTL_BASELINE=1` to tighten it — the script prints which files
improved beyond baseline as a nudge to do this, but doesn't force it.
Scans only actual `className="..."`/`className={'...'}`/`className={\`...\`}`
values (not arbitrary file text) — an early draft that scanned the whole
file self-flagged on the word "left-to-right" inside this slice's own new
doc comment, caught before committing, fixed by scoping the regex to
`className` attribute values only.

**Verified**: `npm run lint` (eslint + the new RTL check) clean, `tsc
--noEmit` clean, full monorepo `npm run build` clean (same 26 routes, no
regressions). **Live-verified against the real, already-signed-in test
account this browser session already had** (from Slice B's own live
verification — reused rather than creating a new throwaway account for a
pure-CSS change): at 1400px width, `/he/dashboard`'s sidebar correctly
renders on the visual **right** with its border on the visual **left**
(`getComputedStyle` confirmed `border-left-width` set, `border-right-width:
0`, and the `<aside>`'s bounding rect positioned at the right edge of the
viewport) — both automatic from `border-e` + the browser's native RTL flex
reversal, no JS involved. The `ChevronRight` mirror was verified by reading
the compiled CSS rule directly rather than trusting a screenshot (Tailwind
v4 compiles `rtl:-scale-x-100` to the modern `scale` CSS property, not
`transform` — checking `getComputedStyle(...).transform` first read `none`
and looked like a bug; `getComputedStyle(...).scale` correctly read `"-1
1"` once checked the right property). Same compiled-CSS technique confirmed
`border-e`/`text-start`/`text-end`/`inset-x-0`/`rtl:bg-gradient-to-l` all
generated correct logical/RTL-scoped CSS. `/growth` (English) confirmed
unaffected — sidebar still renders on the left with the border on the
right, byte-identical visual result to before this slice. **One real gap,
disclosed rather than glossed over**: `RoadmapTimelineCard`'s own gradient
fix was **not** visually observed live — the test account has zero
Roadmap data (honest empty state, "No decisions yet"), so the card never
renders for it. Confidence rests on the same direct compiled-CSS
verification technique (confirmed `rtl:bg-gradient-to-l` compiles to `--tw-
gradient-position: to left in oklab`, correctly scoped to `[dir="rtl"]`),
not a live click-through — a future session with a real-data test account
touching Growth Tracker should give this one a real look.

Committed as `7a7fc10` on `mvp` at the user's request ("complete slice c"),
same pattern as Slice B — not pushed, nothing to deploy (frontend-only, no
CDK change).

## 14. Slice D — first increment built and live-verified, Session 50 (2026-09-14)

Static UI content translation (§8's D row). **A real-scope survey done
before writing any code found the true scope is ~1,200–1,400 distinct
hardcoded UI strings across ~60 files — far larger than the plan's original
one-line D description implied.** Rather than attempt all of it in one pass
(this project's own standing "small, working increments" guardrail, and the
precedent every prior multi-part build here has followed — Content Library,
Pull-a-Card, etc.), this session scoped a first, coherent increment and
explicitly deferred the rest, documented below rather than silently treating
D as "done."

**Scope built this increment: the entire pre-authenticated funnel, plus the
always-visible app shell.** Landing page, Login, Signup (incl. the
confirmation-code and recovery-code-reveal stages), Forgot Password (all 4
stages), Consent, Terms of Use, Privacy & Data Policy, Pricing, the root
`<html lang>`/page `<title>`/`<meta description>`, the global error
boundary, and every nav-adjacent shared component (`Sidebar`,
`MobileNav`, `nav-items.ts`, `LanguageSelector`'s aria-label,
`PasswordCreationField`, `RecoveryCodeReveal`, `GenderSelector`). This is a
real, user-meaningful boundary, not an arbitrary cutoff: a brand-new Hebrew
user can now sign up, read the legal pages, see pricing, and navigate the
whole app shell entirely in Hebrew before ever reaching content that's
still English.

**Deliberately deferred, not silently skipped** — the authenticated app's
own screens (Dashboard, Companion's UI chrome, Decision Room's 14-step flow
chrome, Mirror Room's 6-step flow chrome, Library, Growth Tracker, Evolution
Map, Wallet, Account settings, Twin/Roadmap detail pages): roughly 900+ of
the surveyed strings, concentrated overwhelmingly in Decision Room + Mirror
Room's step-by-step chrome (~700 strings across 26 files — more than half
the entire app). Beyond the sheer size, there's a real product-coherence
argument for *not* rushing these into this increment even if there were
time: those screens interleave static UI labels with AI-generated content
(reflections, prompts) that Slice E hasn't localized yet — translating just
the buttons and labels while the actual Companion/Decision Room/Mirror Room
*conversation* stays English would produce a half-Hebrew, half-English
screen, arguably a worse experience than staying consistently English until
Slice E lands. A future session should treat "Decision Room + Mirror Room
UI chrome" as its own slice, likely sequenced alongside or right after
Slice E for exactly this reason — flagging this judgment call here rather
than deciding it silently.

**Translation-key architecture**: one namespace per page/feature matching
Slice A's existing `Common` convention (`Landing`, `Login`, `Signup`,
`ForgotPassword`, `Consent`, `Auth.{passwordField,recoveryCode,gender}`,
`Nav.{items,mobileItems}`, `Pricing`, `Errors`, `Metadata`, `Terms`,
`Privacy`, plus two small single-purpose ones — `AlignmentChart`,
`CalendarButtons` — picked up while fixing their hardcoded-locale sites,
see below). `messages/en.json`/`messages/he.json` now hold 214 matching
keys each (§7's "translation files are code, not data" — normal review,
not a vendor auto-pull).

- **Legal pages (`Terms`/`Privacy`) use one rich-text block per section**
  (`t.rich('sections.sN.body', {p, ul, li, strong, ...})`), not a key per
  paragraph — a translator or reviewer works with one coherent block of
  text per section (13 sections in Terms, 9 in Privacy + a 6-row table),
  and paragraph/list structure travels with the translation instead of
  being reassembled from fragments in code. `Section`'s own `[&_ul]:pl-5`
  and Privacy's table `text-left`/`pr-4` were fixed to their logical
  equivalents (`ps-5`, `text-start`/`pe-4`) while in these files anyway —
  small, in-scope RTL debt the files already carried, closed rather than
  left for a later pass.
- **Known, pre-existing content issue, not introduced by this
  translation**: Terms §5 ("Subscriptions and Payments") describes a
  3-tier Core-$15/Pro-$25 monthly subscription model that predates the real
  Credits system and doesn't match the product today (`pricing/page.tsx`'s
  own doc comment already flags this same drift for the pricing page
  itself). Translated faithfully as-is — rewriting Terms of Use content is
  a legal/product decision, not something a translation slice should
  decide unilaterally — but flagging it again here since Hebrew now
  doubles the surface area of a pre-existing accuracy gap. A future session
  should get the user's sign-off on real §5 content before either locale's
  version is trusted for a real launch.
- **`Signup`'s consent checkbox and `Consent` page's own agreement text**
  use `t.rich(..., {terms: ..., privacy: ...})` to embed real `<Link>`
  components inline — not string concatenation around a translated
  sentence, which breaks word order across languages.
- **`RoadmapTimelineCard`'s `align` prop internal rename** (Slice C's own
  `'left'|'right'` → `'start'|'end'`) is unrelated to this slice but was
  already done in C; not re-touched here.

**The 4 hardcoded-locale/date-format sites from §2 — actually 6 once
re-audited** (line numbers had shifted since the plan's original survey;
one site the original grep pattern couldn't have caught was found too):
- `wallet/page.tsx`, `decision/[id]/page.tsx`, `mirror/[id]/page.tsx`,
  `CalendarButtons.tsx`, `AlignmentHistoryChart.tsx`'s `formatAxisDate` —
  all switched from a hardcoded `'en-GB'`/`'en-US'`/no-locale
  `toLocaleDateString(...)` call to `toLocaleDateString(locale, ...)`,
  `locale` threaded in via `useLocale()` at each call site (module-level
  helper functions took `locale` as a new parameter rather than trying to
  call a hook outside a component).
- **`lib/format.ts`'s `timeAgo()`** — not part of the plan's original list
  (it hardcodes English relative-time strings/pluralization, not a
  `toLocaleDateString`/`'en-*'` literal, so the plan's own grep pattern
  wouldn't have matched it), found during the re-audit. Rewritten to use
  `Intl.RelativeTimeFormat(locale, {numeric: 'auto'})` instead of
  hand-rolled English pluralization — this is *better* than adding a
  `{count, plural, ...}` translation message would have been, since
  `Intl.RelativeTimeFormat` already knows Hebrew's plural/dual rules
  natively; there's nothing to maintain in `messages/*.json` for this one.
  3 call sites updated (`growth/page.tsx`, `DecisionRoomLanding.tsx`,
  `RecentConversations.tsx`) to pass `locale` — those two files are
  otherwise **not** translated this increment (out of scope per above),
  only this one call site's date-format correctness was touched, a
  narrow, surgical fix independent of the surrounding untranslated screen.
- **`AlignmentHistoryChart`'s "Today" label** (both the header stat and
  the chart's own final x-axis tick) is now translated via a new minimal
  `AlignmentChart.today` key — the chart's *geometry* still deliberately
  doesn't mirror under RTL (Slice C's own documented exception, time-series
  axes follow international convention over reading direction), but the
  label *text* on it is still real UI copy that needed translating like
  anything else; direction-agnostic and language-agnostic are different
  questions, this only affected the first one.

**New CI guard**: `apps/web/scripts/check-i18n-parity.mjs`, wired into
`npm run lint` alongside Slice C's RTL check — diffs the full flattened key
sets of `en.json`/`he.json` and fails on any mismatch in either direction.
Unlike the RTL check's debt-ratchet baseline, this one has no baseline —
every key must exist in both files from the moment it's added, since
next-intl silently falls back to the raw key on a miss (§7's own explicit
ask). Currently 214/214 keys match.

**Verified**: `npm run lint` (eslint + both Slice C/D check scripts),
`tsc --noEmit`, full monorepo `npm run build` (26 routes unchanged),
`npx vitest run` (26 pre-existing tests, untouched by this slice) all
clean. Live-checked extensively against a real local dev server, both
locales: `/` and `/he` render correct, distinct content with no
`NEXT_LOCALE` cookie (genuine default) and with one set explicitly;
`<title>`/`<meta description>` confirmed locale-correct via
`document.title`/the meta tag directly, not just eyeballed. `/he/signup`
live-verified end to end including typing a partial password and watching
the (already-Hebrew-translated, Slice-D-untouched-logic)
`PasswordCreationField` checklist react correctly. `/he/terms` and
`/he/privacy` both confirmed to render every section's rich-text
`<p>`/`<ul>`/`<li>`/`<strong>` structure correctly (checked via full page
text extraction, not sampling), including the privacy-table's 6 rows and
both pages' closing contact/cross-link blocks. `/he/pricing`'s "Back" link
confirmed to actually mirror via `getComputedStyle(svg).scale === '-1 1'`,
not just visually assumed. `/he/forgot-password`'s request stage
live-verified. **`/he/consent` was not reachable for a live check** — the
only available browser session (reused from Slice B/C's own test account)
is already past consent, so visiting `/consent` correctly auto-redirects
to `/companion` per `proxy.ts`'s existing "already consented" branch,
itself confirmed working correctly rather than broken; confidence in
`Consent`'s own translated content rests on the i18n-parity check + build +
code review, not a live click-through — same disclosed-gap convention
Slice C used for `RoadmapTimelineCard`. Zero `next-intl` `MISSING_MESSAGE`
console errors observed across every page visited, both locales. The
Sidebar's `Nav.creditsCount` plural message confirmed live at `0 קרדיטים`
(the real account's real balance) — correctly resolves to Hebrew's
`other` CLDR category, not a hardcoded `other`-only string.

**Not done, honestly**: the ~900+ deferred strings above; any product
decision on Terms §5's stale content; Slice E (AI-content localization,
still has no consumer for the `custom:locale` claim); auth error messages
that come straight from the Cognito SDK (`err.message`) stay English
regardless of locale in every auth flow — mapping Cognito's own error
codes to localized messages is real future work, documented inline at each
try/catch rather than silently left unmentioned.

Committed locally at the user's request ("continue with d") — not pushed,
nothing to deploy (frontend-only, no CDK change).
