# Focus Mode × Spotify — integration scope

*Session 68, 2026-09-24. **Update (same session): option A is built** — the user has multiple mood playlists and will send the links. Paste them into `apps/web/src/lib/focus-playlist.ts` (`FOCUS_PLAYLISTS`); until then Focus Mode stays the stub. Built: click-to-load 152px embed, mood picker on the settings button (remembered per browser), "Open in Spotify" link, preview note, `frame-src https://open.spotify.com`. Still open from §5: mobile placement.*

## 1. Where things stand

- **Focus Mode today is a stub.** `apps/web/src/components/companion/FocusMode.tsx` renders a card ("Focus Mode · Deep Work · DPNR Playlist") with a **disabled** play button and a disabled settings button — no audio, no source. Used once: the desktop right column of `companion/page.tsx` (~line 878). **Mobile has no Focus Mode at all.**
- **The spec doesn't name a provider.** `docs/DPNR_Main_Chat_UX_Update_MVP.pdf` §7 asks for a small, secondary player: current playlist/track, play/pause, a small settings control. `docs/MAIN_CHAT_UX_UPDATE_PLAN.md` §3.4 left "real playback vs stub" open, resolved as stub pending real audio.
- **Nothing to reuse for third-party auth.** Cognito only; no OAuth client, no token storage. One Secrets Manager secret exists (`dpnr/grow-credentials`), so that pattern is available if ever needed.
- **CSP blocks any player today** (`apps/web/src/lib/securityHeaders.ts`): no `frame-src` / `media-src` (fall back to `'self'`), `connect-src` limited to Cognito/API/S3.

## 2. What Spotify allows (checked 2026-09-24)

| Constraint | Source |
|---|---|
| An app in **development mode** works for **at most 5 authenticated Spotify users**, and the app owner needs Premium. | [Quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes) |
| **Extended quota** (more users) is only granted to a registered business with a launched service and **≥250k monthly active users**; individuals can't apply (since 2025-05-15). | same page |
| The **Web Playback SDK** (a real player inside our page) needs **Premium for every listener**, and **must not be used in commercial projects without Spotify's written approval**. DPNR sells credits → commercial. | [Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk) |
| The **Embed player** (+ its iFrame API: `play/pause/togglePlay/loadUri`, `playback_update` events) needs no developer app and no OAuth. Listeners **logged in to spotify.com in the same browser get full tracks; everyone else gets 30-second previews**. A known issue: starting playback *via the API* can fall back to preview; the embed's own play button plays full tracks. | [iFrame API](https://developer.spotify.com/documentation/embeds/references/iframe-api), [community report](https://community.spotify.com/t5/Spotify-for-Developers/Spotify-iframe-API-play-resume-starts-preview-playback-while/td-p/7430703) |

**Consequence:** a "Connect your Spotify, play your own music inside DPNR" integration cannot go beyond 5 users, and can't be offered commercially without Spotify's approval. It is not a real option for the beta, let alone launch.

## 3. Options

### A. Spotify Embed with DPNR-curated playlists — **recommended**
Focus Mode shows a compact official Spotify embed of a DPNR playlist; the settings button switches between a few moods.

- **Works for:** everyone, with no sign-up. Full tracks if they're logged in to Spotify in that browser, otherwise 30s previews (plus a "Open in Spotify" link).
- **Build (frontend only, ~1–1.5 days):**
  - `FocusMode.tsx`: compact embed (80px "compact" height fits the card) loaded via the iFrame API; play/pause through the embed's own button (avoids the API preview issue); mood picker in the settings button.
  - Playlist list in a small config file (`lib/focus-playlists.ts`: id, label en/he, Spotify URI). Remember the choice per viewer (localStorage; or a `focusPlaylist` field on the existing preferences endpoint if it should follow the account — small backend change, optional).
  - CSP: `frame-src https://open.spotify.com`; the iFrame API script is loaded with our nonce so `'strict-dynamic'` covers it; iframe `allow="encrypted-media; autoplay"`.
  - i18n keys (en/he), Spotify attribution per their branding rules, lazy-load the embed only when the card is visible/clicked (no Spotify request for users who never touch it — privacy + performance).
  - Mobile: decide placement (§5) — e.g. a small pill in the Companion header or a row under Pull a Card.
- **Privacy note:** loading the embed lets Spotify see that the user visited (standard third-party embed). Lazy-loading on first click keeps that opt-in.
- **Content needed:** 3–5 playlists (Deep Work, Calm, Wind Down…). Best owned by a DPNR Spotify account so the founder controls them; public Spotify playlists work too.

### B. Full integration (OAuth + Web Playback SDK) — **not viable now**
"Connect Spotify", use the person's own library, full player inside DPNR.

- **Blocked by:** 5-user dev-mode cap, Premium-only listeners, commercial-use approval (§2).
- **If Spotify ever approves** (business entity + growth), the work is ~5–8 days: Spotify app + redirect URIs; OAuth PKCE flow; Lambda for code exchange/refresh; refresh token stored encrypted (`encryptField`, like other personal data) on a new `USER#…/SPOTIFY` item; disconnect + coverage in account export/deletion; CSP (`sdk.scdn.co`, `accounts.spotify.com`, `api.spotify.com`); a `security-review` pass (auth/tokens — standing guardrail).

### C. DPNR-hosted audio — alternative to Spotify
Royalty-free or commissioned focus tracks on S3/CloudFront, played with an `<audio>` element. Works for everyone, full tracks, full control of the UI (real play/pause in our own button), no third party watching. Cost is content: licensing/commissioning, plus ~1 day to build. Worth considering if 30-second previews for non-Spotify users are unacceptable.

## 4. Recommendation

Ship **A** now; it is the only Spotify path that works for all users today. Keep **C** in mind if previews turn out to frustrate people. Don't start **B** unless DPNR gets Spotify's written approval.

## 5. Decisions needed before building A

1. **Which playlists?** Founder-curated on a DPNR Spotify account, or existing public playlists (which)? How many moods?
2. **Mobile:** add Focus Mode to mobile, and where?
3. **Is a 30-second preview acceptable** for users not logged in to Spotify? (If not → option C.)
4. **Remember the chosen playlist** per browser (no backend) or per account (small preferences change + deploy)?
