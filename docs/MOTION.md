# Motion

How DPNR moves. Decided with the user in Session 69 (2026-09-24): **calm and minimal**. The tokens live in `apps/web/src/app/globals.css`. `apps/web/scripts/check-motion.mjs` (part of `npm run lint`) keeps new code on them.

## Principles

1. **Things settle; they don't perform.** Fast start, long soft landing (`ease-settle`). No bounce, overshoot, spring, shake or confetti, including on "success" screens. This is the motion side of the product's no-gamification decision (no streaks or points, see `PHASE_AUDIT.md`).
2. **Small distances.** 8px (`--motion-distance-sm`) for most arrivals, 16px (`--motion-distance-md`) at most (e.g. a room step changing). Nothing flies across the screen.
3. **Motion means something.** It shows where content came from (a new message, the next step), that something is working, or it *is* the feature (the breathing circle). If it's only decoration, leave it out.
4. **Only new things animate.** Loading a conversation's history, or re-rendering existing content, doesn't replay entrance animations.
5. **Reduced motion is respected everywhere.** Under `prefers-reduced-motion: reduce` the distance tokens are zeroed, so movement becomes a fade. Stock bounce/ping are stopped, and the glass hover lift is dropped. Anything built on the tokens gets this for free. Anything that moves some other way (scale, custom transforms) must add its own `motion-reduce:` fallback.
6. **Cheap properties only.** Animate `transform` and `opacity`. (One documented exception: a deleted Recent Conversations row collapses its height with a `grid-template-rows` 1fr→0fr transition so the list closes up. It's one small row, once.) Never animate `backdrop-filter`/`filter: blur`, and don't slide a `.liquid-glass` element: iPad Safari re-blurs it every frame. Move the content inside the glass instead.
7. **RTL.** Any horizontal movement flips under `dir="rtl"` (forward in Hebrew goes the other way).

## Vocabulary

| Token | Value | Use |
|---|---|---|
| `--motion-quick` | 160ms | taps, hovers, menus; also Tailwind's default `transition-*` duration |
| `--motion-calm` | 320ms | content arriving (messages, cards, step content) |
| `--motion-slow` | 600ms | moments (a session finishing), slow image hovers |
| `ease-settle` | `cubic-bezier(0.22, 1, 0.36, 1)` | anything arriving; also Tailwind's default `transition-*` easing |
| `ease-breath` | `cubic-bezier(0.37, 0, 0.63, 1)` (sine) | loops, breathing |
| `animate-settle-in` | fade + 8px rise, calm | default entrance (replaces the old `.fade-up`) |
| `animate-settle-in-quick` | fade + 8px rise, quick | the person's own action landing (their chat bubble) |
| `animate-fade-in` | fade, calm | entrance where movement would distract |
| `animate-soft-pulse` | opacity 0.35↔1, 1.8s | "working on it" (replaces bounce dots / `animate-pulse`) |
| `animate-step-in-forward` / `-back` | fade + 16px along the inline axis, calm | room step content; follows reading direction via `--motion-dir` (1 LTR, −1 RTL) |
| `animate-journey-fill` | scaleX from `--motion-grow-from` (0; 1 under reduced motion), slow | a progress segment drawing in; pair with `origin-left rtl:origin-right` |
| `animate-card-flip-out` / `-shuffle-a` / `-shuffle-b` / `-deal` / `-sheen` | old face tucks into the deck; two backs swing in 3D arcs (lift, slight rotateY, 800ms passes, z-index swaps at the far point); new card turns in face-up (720ms, no overshoot); one soft light sweep across it after landing (Session 70) | Pull a Card only; shuffles and the sheen are stopped under reduced motion and the component fades instead |
| `animate-soft-glow` | opacity 0.45↔0.9, 5s breath | a slow glow (Celebration orb) |
| `animate-spin` | stock | spinners only (buttons, page loads) — AI waits use `<AiThinking>` |
| `stagger-<n>` | `animation-delay: n × 150ms` | things that animate in sequence (the chat thinking dots) |

Usage: `duration-(--motion-calm)`, `ease-settle`, `animate-settle-in`. Plain `transition-colors`/`transition-all` already pick up the quick/settle defaults, so don't add a duration unless it should differ.

**Adding an animation:** add the `@keyframes` and an `--animate-*` entry inside `@theme` in `globals.css`, build it on the distance tokens so reduced motion works, and add it to the table above. The lint check fails on `@keyframes` anywhere else, on arbitrary `animate-[…]`/`duration-<n>`/`ease-[…]`, on stock `animate-bounce|ping|pulse`, and on inline `style` animation/transition properties. The existing uses are tracked in `scripts/motion-baseline.json` and may only go down. `UPDATE_MOTION_BASELINE=1` accepts a deliberate exception; say why in the commit.

**Timing-as-data exception (Web Animations API):** when an animation's timing *is* product data and other UI must stay in sync with it, drive it with `element.animate()` from the component, and read everything else off that animation's `currentTime`. The Breath modal does this (`components/shared/CheckInModal.tsx`): the 4/4/6 rhythm is defined once in TS, the label, ring and counter follow the circle's clock, and pause is `animation.pause()`. The rules still apply: `ease-breath` read from the CSS var, transform/opacity only, and an explicit reduced-motion branch (constant keyframes, same clock). Don't use this for ordinary entrances; those use the named CSS animations.

## Page and step transitions

**Room steps (Session 69):** a CSS entrance, not `<ViewTransition>`. Each step is its own component, so `RoomStepLayout` remounts on every step and the content wrapper's `animate-step-in-*` plays once per step. Direction comes from comparing `step` with the last step shown in that room (a small module-level map in `RoomStepLayout.tsx`, read once per mount). No exit animation: the old step leaves at once and the new one settles in. This works in every browser and needs no canary React APIs. **AI waits** use `components/shared/AiThinking.tsx` (soft-pulse bars shaped like what's coming: `lines` / `chips` / `cards`, with a plain label and `role="status"`). Staggered lists use `staggerClass(i)` from `lib/motion.ts`, because Tailwind can't see runtime-built `stagger-${i}` class names.

For future route-level transitions, use React's `<ViewTransition>` (built into the Next 16 App Router, no config; see `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`) rather than adding an animation library. Browsers without support skip the animation and still work. Check Safari specifically. If a later need can't be met with CSS + `<ViewTransition>`, adding the `motion` package is the agreed fallback (load it only on the routes that use it).

## Plan (Session 69)

1. **Foundation**: tokens, reduced motion, lint, this doc. **Done.**
2. **Breath** (`CheckInModal.tsx`) **(done, Session 69)**: one continuous Web Animations cycle drives the circle, a progress ring and crossfading labels. Sine easing, pause/resume, soft end. The ring has one arc per phase in its own color (violet in, amber hold, magenta out; user request). Reduced motion keeps the ring and labels but not the scaling. The rhythm stays 4 in / 4 hold / 6 out × 3 (user-confirmed).
3. **Chat** **(done, Session 69)**: settle-in for new messages only; the bouncing dots become `soft-pulse` dots (user-approved); conversation switch crossfades; a deleted row fades out and the list closes up; smooth scroll only for new messages. No typewriter effect.
4. **Rooms** **(done, Session 69)**: directional step transitions via `<ViewTransition>` (content only; shell, art and journey stay still; RTL-aware), the journey fills smoothly, AI-wait shimmer in place of spinners, and a slow glow on completion (the Celebration `animate-ping` goes).

The designer's motion references are coming to Google Drive. When they arrive, retune the token values first; components shouldn't need to change.
