# DPNR — Main Chat UX Update: Plan

**Status (2026-09-17, updated): Slices B+C (top bar, composer icons, Focus
Mode) and the harder half of Slice A (chat background system: schema,
API, both preset assets, the selector UI) are all built and passing
typecheck/lint/build. NOT deployed to real AWS yet** — the frontend
correctly renders the new default preset and the selector UI works
optimistically, but the actual save (`PUT /v1/user/preferences` with the
new `chatBackground` field) hits the currently-deployed Lambda, which has
no idea the field exists — confirmed live (a real `400`, not a guess) —
so the choice doesn't yet survive a reload. Needs a real `Dpnr-Api` deploy
(`PreferencesFn`, `PreferencesGetFn`, `PostConfirmationFn`'s code assets
only — no new resources) before this closes for real.
**The two preset background images are real, derived assets — not raw
mockup crops.** The mockups are flattened UI composites (baked-in fake
sidebar/text/chat bubbles); a direct crop would show ghost text through
the real glass panel. Instead: each full 1536×1024 mockup went through a
heavy Gaussian blur (~28-30px) + darken pass (PIL), which fully destroys
the baked UI/text into unreadable soft color/light shapes while keeping
each mockup's actual mood and palette (warm sunset tones for
`environment`, violet nebula for `digital_twin`) — a legitimate technique
the source PDF itself explicitly sanctions ("must adapt through blur,
gradient, darkening... so chat readability always comes first"), not a
shortcut. Saved as `apps/web/public/images/backgrounds/companion-bg.webp`
(now the `digital_twin` default, replacing the old single hardcoded
asset) and `companion-bg-environment.webp` (new).
Custom background upload (a user's own photo) is still fully deferred —
no S3 prefix/Lambda for it exists, `chatBackground: 'custom'` is a valid
enum value with nowhere to point yet.

---

Written Session 59 (2026-09-17)
against the source doc `docs/DPNR_Main_Chat_UX_Update_MVP.pdf` ("MVP
Refinement Guide for Rad & Claude"), then revised same session once the
user pointed to two full-fidelity reference mockups already in the repo —
`docs/CHAT UX.png` (Option B, photographic "DPNR Environment" background)
and `docs/CHAT UX 2.png` (Option A, cosmic "Digital Twin" character
background) — as **the actual target UI**, not just the PDF's text
description. The source doc is explicit that this is a **refinement**, not
a redesign: keep the existing architecture, routes, nav, and composer;
only the items below change.

This is smaller than the Hebrew Localization or First-Time Onboarding
plans, but it bundles a few genuinely separate pieces of work (a new
upload/asset system, a new persisted metric, a net-new audio feature) —
don't build it all in one pass. Slices below are independently shippable.

## 0. Composition analysis of the two reference mockups

(Per this repo's `mockup-to-code` skill: describe the reference's own
composition before writing code, so a port doesn't unconsciously shrink
toward a "safe" default.) Both mockups share **identical layout and
identical right-panel content** — only the background art and accent
color differ (warm/gold vs. violet/cosmic), confirming these are two
*skins* of one design, not two different screens:

- **A full-bleed page background** (photographic scene or cosmic
  character-portrait) sits behind everything, with the character/subject
  positioned left-of-center so it never sits directly behind the
  conversation glass panel. No separate corner "hero image" — the
  background *is* the hero, matching this project's "hero art wants its
  own dominant, non-shrunk treatment" lesson from other reskins.
- **A top bar that does not exist in the app today at all**: search input
  ("Search anything... ⌘K") roughly centered-right, then date+time, then a
  small pill (leaf icon + "12 min today" + a chevron — reads as a
  disclosure control, not just a static label), then the circular profile
  avatar with its own small dropdown chevron. This is new chrome for
  `companion/page.tsx`, not a relocation of something that exists
  elsewhere.
- **The conversation area is a semi-transparent "glass" card** floating
  over the background (already partially true today via
  `companion/page.tsx`'s existing gradient overlay — needs to get
  measurably more glass/blurred to read as the mockup's soft, frosted
  panel rather than a plain dark overlay).
- **The composer row has 4 controls**: a leading `+` (attach) circle icon,
  the text field, a mic icon, an image icon, and the existing circular
  send button — all inline in the glass panel, not stacked.
- **The right column is 3 stacked cards, in this exact order**: Today's
  Card (a large, full-bleed photographic card with the question quoted
  directly over the image, prev/next arrows and an expand icon in its
  header, a "Pull a New Card" button below it) → Recent Conversations
  (a plain list, relative timestamps, chevron per row, "View all" link) →
  Focus Mode (small: a thumbnail image, "Focus Mode" title, "Deep Work •
  DPNR Playlist" subtitle, a circular play button, and a small
  settings/equalizer icon). This matches §2's already-confirmed order
  exactly — only the Focus Mode card itself was missing.

**One element neither the source PDF nor `docs/AGENT_LOG.md` mentions
anywhere: the "Search anything... ⌘K" bar.** Not in scope per the PDF's
own numbered list — flagged as a new, 7th open decision in §3.

---

## 1. What already exists (don't rebuild it)

- **Pull-a-Card already has a per-card image field.** `PullCardResponseSchema.imageRef`
  (`packages/shared-types/src/api/companion.ts:107-119`) is real and wired
  end to end — `PullACard.tsx` already renders unconditionally (Session 43)
  and already reads `card?.imageRef`. Every seeded card just happens to
  point at the same placeholder (`pull-a-card.webp`, referenced in
  `infra/cdk/scripts/guidance-cards.seed.ts` and reused by
  `DailyGuidanceCard.tsx`/Dashboard). The PDF's "each question should have
  a different meaningful image" requirement needs **real art + updated
  seed data only** — zero schema or API change.
- **Profile image upload is fully built.** `avatarKey`
  (`packages/shared-types/src/dynamo/account.ts:51`), `POST
  /v1/user/avatar/upload-url` + `PUT /v1/user/preferences`
  (`packages/shared-types/src/api/account.ts:181-242`), and a complete
  picker→upload→attach UI (`apps/web/src/components/shared/AvatarUpload.tsx`)
  already exist and are live on the Account page and in `Sidebar.tsx`. The
  PDF's requirement 2 doesn't need new infrastructure — see the open
  question in §3 about *where* it should render.
- **The exact upload pattern a chat-background feature needs already has a
  precedent to copy.** `infra/cdk/lib/data-stack.ts:154-177` (a private,
  `BLOCK_ALL`, browser-CORS-PUT S3 bucket) +
  `infra/cdk/lambda/account/avatar-upload-url.ts` (presigned PUT, scoped
  per-user, 300s expiry) + `infra/cdk/lambda/lib/avatar.ts` (presigned GET,
  1hr expiry). A background-image upload is the same shape, doubled — not
  a new architectural pattern.
- **The 4 quick-entry prompts, the composer's placeholder copy, and the
  left nav's 9 destinations already match the PDF's "keep as-is" list**
  (`companion/page.tsx:28-33`/`451-468` for prompts,
  `:476` for the composer copy, `nav-items.ts:25-33` + two `SidebarMiniCard`s
  for nav). Nothing to change there beyond the one nav-structure note in §3.

## 2. Genuine gaps (real, new work)

1. **Chat background — net new.** Today's background is one hardcoded,
   non-configurable asset for every user (`companion/page.tsx:226-229`, a
   fixed `<Image>` + gradient overlay). There is no per-user background
   field, no upload mechanism, no default-art decision made, and no
   blur/darken/transparency logic beyond the one existing static overlay.
   Needs: a `backgroundKey`-style field (mirroring `avatarKey`), an
   upload-url Lambda (mirroring `avatar-upload-url.ts`), a selection UI,
   and **real default art**, per the open decision in §3.
2. **Focus Mode / Music — net new, zero existing code.** Grepped the whole
   `apps/web/src` tree for `music|playlist|audio|Focus Mode` — no hits.
   This needs actual audio content and a playback mechanism, not just UI —
   see §3 for the scope question this raises.
3. **"Time on DPNR" — net new, and the least trivial gap.** Nothing in the
   app currently tracks or persists a per-user, per-day time total.
   `StepShell.tsx`'s existing countdown (`apps/web/src/components/decision/StepShell.tsx:76-86`)
   is a *countdown* pattern (client-side `setInterval`, no persistence,
   scoped to one room session) — a useful UI precedent, not a data-layer
   head start. A real "12 min today" figure needs either genuine session-
   duration tracking (start/heartbeat/end events, server-aggregated per
   calendar day) or an honest, disclosed proxy metric — a real product
   decision, not an implementation detail (§3).
4. **Right panel — insertion, not reordering.** Current order (`companion/page.tsx:500-509`)
   is already `PullACard → RecentConversations`, matching the PDF's first
   two slots exactly. Only the third slot (Focus Mode/Music) is missing.

## 3. Decisions — resolved by the reference mockups, plus what's still open

**Resolved by the two mockups (the user's explicit instruction: treat them
as the target UI, not a hypothetical to ask about further):**

1. ~~Default background: A or B?~~ **Both are real, finished designs, not
   two alternatives to pick between** — the mockups are the same layout in
   two skins. Ship both as selectable presets (plus custom upload, per the
   PDF's own §2), defaulting new users to Option A (the "Digital Twin"
   cosmic character) since it continues this app's existing InnerSelf/
   Digital Twin branding language (the PDF's own words for why it picked
   that option). Option B ships as the second preset, immediately
   available, not a "someday" item.
5. ~~Where does the profile image render on Main Chat?~~ **A real top bar,
   inline on this page** — confirmed directly in both mockups (§0). Net-new
   chrome, not a relocation.
6. ~~Are the composer's mic/image icons in scope?~~ **Yes** — both mockups
   render them as part of the target UI, not a hypothetical. Scope for
   *this* pass: **icons present and wired to what's realistically
   buildable now** — the mic uses the browser's own Web Speech API to
   dictate into the text field (a real, client-only feature, no backend
   change, no new AWS surface), the image icon attaches a file locally.
   **Not in scope for this pass**: server-side image understanding —
   `companion/message.ts` has no vision/multimodal path today, and adding
   one is a materially separate backend feature, not a UI icon. The
   image icon should look real and functional (file picker works) but an
   attached image is disclosed to the person as not yet analyzed by
   Companion, rather than silently doing nothing or fabricating a response
   to it.

**Still genuinely open — these are asset/content/accuracy calls, not
resolved by looking at a static mockup:**

2. **Where does the per-question Pull-a-Card art come from?** 300 real,
   "meaningful and emotionally relevant" images is a substantial asset-
   production task, not a code task. Options: commission/generate all 300
   up front, ship a smaller curated subset first (e.g. per-category hero
   images), or keep the current single placeholder and treat this as
   explicitly deferred (same call Session 24 made for Library cover art).
3. **What does "Time on DPNR" actually measure, and how accurate does it
   need to be?** Default proposed: derive it from existing message/session
   timestamps for the current calendar day (Companion + Decision Room +
   Mirror Room) — no new writes, no new schema. This is disclosed as an
   implementation choice, not escalated, since it's reversible and cheap;
   flag here only because a true cross-session accumulator (start/
   heartbeat/end events) would be a real, separate backend feature if the
   derived approach turns out too imprecise later.
4. **Is Focus Mode real audio playback, or a UI-only stub?** No audio
   content or player exists anywhere in the codebase today. The mockups
   show a specific, real-looking track ("Deep Work • DPNR Playlist") — but
   real playback needs actual audio files/streaming the user would have to
   supply; a stub (real UI, disabled/inert play control, same "coming
   soon" pattern Wallet's checkout already uses) is a defensible interim
   default (Session 27 precedent).
7. **The "Search anything... ⌘K" bar — real search, or a visual-only
   placeholder for now?** New discovery (§0), not named in the source PDF
   or anywhere in `AGENT_LOG.md`/`MVP_ARCHITECTURE.md`. Real search across
   conversations/content is a genuinely separate, non-trivial backend
   feature (no search index exists anywhere in this codebase today) —
   recommend a visual-only placeholder (renders, focuses, does nothing on
   submit yet) for this pass, with real search scoped as its own future
   slice if wanted.

## 4. Proposed slices

- **Slice A — Chat background system.** `backgroundKey` field + upload
  Lambda (mirrors avatar's exact pattern) + selection UI with both preset
  options (§3.1) + custom upload. Needs real art for both presets sourced/
  finalized (does the mockup art itself ship as the preset art, or does a
  different asset get produced from it? — ask before finalizing) but is
  otherwise unblocked.
- **Slice B — Top bar + composer icons.** The new top bar (search
  placeholder, time-on-DPNR pill, profile avatar+dropdown) and the
  composer's mic (Web Speech API)/image (local attach, disclosed as
  unanalyzed) icons. Pure frontend, no new AWS infra, no blocking
  decisions left — the smallest, most immediately buildable slice.
- **Slice C — Focus Mode widget.** Right-panel placement, ships as the
  disclosed stub per §3.4 unless the user supplies real audio content.
- **Slice D — "Time on DPNR" indicator.** Wired into the new top bar from
  Slice B; uses the derived-from-timestamps approach per §3.3 unless told
  otherwise.
- **Slice E — Pull-a-Card visual upgrade.** Blocked on §3.2 (art sourcing).
  Zero schema/API work either way — purely seed-data + assets.

No ADR needed for any of this — nothing here is an irreversible
architectural call; the remaining open items in §3 are asset/content/
accuracy calls for the user, not engineering decisions made unilaterally.
