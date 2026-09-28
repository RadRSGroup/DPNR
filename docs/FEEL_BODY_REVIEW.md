# Global Feel / Body action (#36) — review

*Session 77, 2026-09-28. Review only; nothing here is built. Founder #36: "a lightweight permanent Feel / Body action near Check-In. pause → feel → locate → return … Before implementation, determine whether this requires shared/global state, new persisted data, cross-route component behavior, changes to existing emotion/body logic."*

## What exists today

- **Check-In / Breath** (`components/shared/CheckInModal.tsx`) is mounted **per page**, not globally. There's a button plus local `useState` on Dashboard (`dashboard/page.tsx:185`) and Growth Tracker (`growth/page.tsx:100`). Both buttons are `hidden lg:inline-flex`, so **there's no Check-In at all on phones**, and none in Sidebar/MobileNav. Its mood chips are local only; nothing is persisted, and no mood/check-in item exists in the backend.
- **Emotion/body pieces are already reusable.** `BodyMap`, `EmotionChips` and `FeltSummary` (`components/shared/`) are controlled components with no room dependencies (Mirror Step 2 and Decision Step 3 both use them). `lib/body-map.ts` has the 9 areas and the media: the alpha body video `body.webm` (~824 KB) and the still `body-front.webp` (~85 KB). There's a still-image fallback for reduced motion and Safari.
- **The one cross-route pattern** is the global music player: a module-level store (`lib/focus-player.ts`, `useSyncExternalStore`, imperative `openFocusPlayer()`), mounted once in the root layout `app/[locale]/layout.tsx:102`. The `(app)` layout doesn't wrap the Mirror/Decision room routes, so anything that must appear *inside* rooms has to live in the root layout.
- **Emotion/body data is persisted only inside encrypted room content** (Mirror `emotionsFelt`/`bodyPlacements`, Decision EMOTION item). There's no standalone "feeling" record.

## Answers to the founder's four questions

| Question | Answer |
|---|---|
| Shared/global state? | **Yes, if it's truly permanent** (every route, including rooms): a small module store like `focus-player.ts` plus one overlay mounted in the root layout. It's a known pattern here, not new architecture. If it only lives next to the existing Check-In buttons (Dashboard, Growth), local state is enough. |
| New persisted data? | **No, if it stays a private in-the-moment practice** (the same honesty as the Check-In mood chips: nothing saved). **Yes, if "return" should mean DPNR remembers it:** that needs a new encrypted item type, a Lambda and a route. It's also a Digital Twin question (should a quick body check-in ever become evidence?), so it needs a product decision first. |
| Cross-route behavior? | **Yes, for "permanent":** a trigger in the desktop Sidebar and the mobile utility row, plus inside rooms (which sit outside the `(app)` layout). Inside a room there's a design question: a Feel/Body pause mid-session could compete with the room's own body step. |
| Changes to existing emotion/body logic? | **None needed.** Reuse `EmotionChips` + `BodyMap` as they are. Two small prerequisites: their strings are hard-coded English (needs i18n before Hebrew users see the overlay), and `BodyMap` preloads the ~824 KB video on every mount. For an overlay that's opened often, load it only when opened, or use the still by default. |

## Proposed MVP (smallest version that fits "pause → feel → locate → return")

1. A **Feel** trigger next to where Check-In is reached today. Add a Check-In/Feel entry to the mobile utility row too, since phones currently have neither.
2. Tap → the page content fades back (opacity only; MOTION.md forbids animating blur or sliding `.liquid-glass`). A full-screen overlay brings the body forward. Pick emotions → place them on the body → optional one line in their own words.
3. **Return:** a quiet closing line built from what they chose ("Fear in your chest, noticed."), with no AI call and no cost. Close, and the page comes back.
4. **Nothing saved** (MVP), stated plainly in the overlay, the same way the Check-In mood chips behave. This keeps it free of new persistence, Twin logic and privacy review.

Scope choice for the founder: **(a)** Dashboard + Growth + the mobile utility row only (local state, simplest); or **(b)** truly permanent, everywhere including rooms (module store + root-layout mount; decide how it behaves inside a room).

## What would need a flag later

- Saving Feel entries, showing them in history, or letting them inform the Digital Twin: new schema, Lambda, route, deploy, and a Twin/privacy decision.
- An AI reflection on the check-in: a new prompt plus a paid model call.
- Hebrew: the `BodyMap`/`FeltSummary` strings need moving to next-intl first.
