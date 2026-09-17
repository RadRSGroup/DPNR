# DPNR — Main Chat UX Update: Plan

**Status: scoped, no code written yet.** Written Session 59 (2026-09-17)
against the source doc `docs/DPNR_Main_Chat_UX_Update_MVP.pdf` ("MVP
Refinement Guide for Rad & Claude") after a full survey of the current
`companion/page.tsx` and everything it touches. The source doc is
explicit that this is a **refinement**, not a redesign: keep the existing
architecture, routes, nav, and composer; only the items below change.

This is smaller than the Hebrew Localization or First-Time Onboarding
plans, but it bundles a few genuinely separate pieces of work (a new
upload/asset system, a new persisted metric, a net-new audio feature) —
don't build it all in one pass. Slices below are independently shippable.

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

## 3. Open decisions — needs the user's call, not decided here

1. **Default chat background: Option A (Digital Twin character) or Option B
   (calm environment)?** The PDF names both as acceptable MVP choices but
   doesn't pick one. Either way, real art needs to be sourced or generated
   — this isn't just a code decision.
2. **Where does the per-question Pull-a-Card art come from?** 300 real,
   "meaningful and emotionally relevant" images is a substantial asset-
   production task, not a code task. Options: commission/generate all 300
   up front, ship a smaller curated subset first (e.g. per-category hero
   images, 10 instead of 300), or keep the current single placeholder and
   treat this as explicitly deferred. Recommend asking before any of this
   is built, same as Slice 3's cover-art question was deferred back in
   Session 24.
3. **What does "Time on DPNR" actually measure, and how accurate does it
   need to be for MVP?** A real cross-session accumulator is a real (if
   small) backend feature — new event write(s) + a daily read. A cheaper
   MVP proxy (e.g. derived from existing `SessionMessageItem` timestamps
   for the day, no new writes) is very plausibly good enough and cheaper to
   build — but that's a real accuracy/effort tradeoff the user should pick,
   not something to silently approximate.
4. **Is Focus Mode/Music real playback or an honest "coming soon" stub?**
   No audio content or player exists today. Building a real player against
   real tracks is a materially bigger lift than a disabled/placeholder
   widget (the same pattern Wallet's checkout already uses for "coming
   soon" functionality, Session 27) — recommend the stub for MVP unless the
   user has real audio content ready to wire in now.
5. **Where does the top-right profile image render on Main Chat
   specifically?** `companion/page.tsx` doesn't render a profile-image
   element in its own header today (it only lives in `Sidebar`/Account) —
   confirm whether the PDF expects it added inline on this page's own top
   bar (a small, net-new placement) or whether the existing sidebar
   placement already satisfies the requirement.
6. **Composer's voice input / image-file upload icons** — the PDF's
   requirement 5 says "keep" these, implying they already exist; they
   don't (`companion/page.tsx:470-491` has send only). This is a
   pre-existing gap unrelated to anything this PDF changes — flag it back
   to the user rather than assume it's suddenly in scope. Do not build
   this as part of this plan unless explicitly asked.

## 4. Proposed slices (pending the decisions in §3)

- **Slice A — Chat background system.** `backgroundKey` field + upload
  Lambda (mirrors avatar's exact pattern) + selection UI + real default
  art for whichever option (§3.1) the user picks. Blocked on §3.1.
- **Slice B — Focus Mode/Music widget.** Right-panel placement only,
  scoped per §3.4 (stub vs. real playback). Not blocked on anything else —
  could ship first if the user wants the smallest possible increment.
- **Slice C — "Time on DPNR" indicator.** Scoped per §3.3's
  accuracy/effort tradeoff. The smallest correct version is likely a
  read-only derivation from existing message timestamps, no new writes —
  worth proposing as the default unless the user wants true
  cross-surface tracking (also covering Decision/Mirror Room time, not
  just Companion).
- **Slice D — Pull-a-Card visual upgrade.** Blocked on §3.2 (art sourcing
  decision). Zero schema/API work either way — purely seed-data + assets.
- **Nav/profile-image placement** (§3.5/§3.6) are small enough to fold into
  whichever slice touches that part of the page, not their own slice.

No ADR needed for any of this yet — nothing here is an irreversible
architectural call; §3's items are product/scope decisions for the user,
not engineering decisions this doc is deciding unilaterally.
