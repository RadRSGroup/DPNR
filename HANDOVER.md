# Decision Room — Data Science Handover
**Repo:** github.com/RadRSGroup/DPNR · Branch: `decision-room`
**Model:** GPT-4o (openai npm v6.42) · **Date:** June 2026 · **Confidential**

---

## What it is

Decision Room is a mobile-first web app that guides users through a seven-step psychological framework for navigating personal dilemmas (career, relationships, finances, life transitions). Each session produces a fully structured decision record in Supabase.

**The AI layer is not decorative. Every structured data point in the schema is either generated or validated by GPT-4o.** Understanding the prompts is understanding the data.

### The 7 Steps

| Step | Name | What it produces |
|------|------|-----------------|
| 01 | Name the Decision | `decisions.title` + AI-generated `subtitle` |
| 02 | Map the Options | `decisions.narrative` → AI extracts `options.content` (A & B) |
| 03 | Body Emotion Mapping | `emotion_maps` — body zone × emotion color → AI somatic reflection |
| 04 | Choose Your Lens | `decisions.lens` ∈ {pros_cons, fears_desires, values_needs} |
| 05 | Deep Exploration | `option_tags` (pro/con/desire/fear) with `ai_suggested` flag |
| 06 | Values & Needs | `option_tags` (value/need) — needs constrained to Six Human Needs |
| 07 | Future Projection | `projections` — AI futures per option, `selected` boolean = user endorsement |

---

## AI Prompts — Full Reference

All calls go through `POST /api/ai`. The `type` field routes to the prompt. Two modes: **JSON mode** (`response_format: json_object`) for structured output; **prose mode** for reflections. Both use GPT-4o at `temperature: 0.7`, `max_tokens: 500–600`. Every call is metered and logged to `token_usage`.

---

### `subtitle` · Prose
**Purpose:** Generate an empathetic one-line reframe of the decision title.

**Inputs:** `title` (user's raw decision title)

**Output:** `{ subtitle: string }` — under 12 words, open, non-prescriptive

**System instruction:**
> "Generate a short, empathetic one-line frame for a decision title. Keep it open, not prescriptive. Under 12 words. No advice."

**Stored in:** `decisions.subtitle`

**Future use:** Fine-tune on (title → subtitle) pairs correlated with session completion vs. abandonment. A subtitle that reframes effectively may predict continuation. Also useful as a classification seed for decision-category tagging.

---

### `parse_options` · JSON
**Purpose:** Extract two distinct options from the user's free-text narrative.

**Inputs:** `narrative` (user's full free-text dilemma description)

**Output:** `{ optionA: string, optionB: string }` — 1–2 sentences each, faithful to user's words

**System instruction:**
> "Read this decision narrative and extract exactly two distinct options the person is facing. Return ONLY valid JSON: { 'optionA': '...', 'optionB': '...' }. Each option: 1–2 sentences. Clear, non-judgmental, faithful to their words."

**Stored in:** `options.content` (label A and B)

**Future use:** The narrative is the richest raw text in the schema. Run NLP classification (career / relationship / financial / health), sentiment analysis, and topic modelling against `decisions.narrative` directly — not the extracted options, which are already abstracted. The semantic gap between narrative and extracted options is measurable and itself a signal of how clearly the user articulated their dilemma.

---

### `refine_option` · Prose
**Purpose:** Sharpen and clarify a single option at the user's request.

**Inputs:** `optionText` (current option content)

**Output:** `{ refined: string }` — 1–2 sentences, specific and emotionally honest

**System instruction:**
> "Sharpen and clarify this decision option. Keep it faithful to the user's intent. Make it specific, actionable, and emotionally honest. 1–2 sentences maximum."

**Stored in:** `options.content` (overwrites previous value)

**Future use:** Each refinement is a user-initiated edit event. Track whether users who refine options complete more steps — a proxy for engagement quality. Consider storing original + refined as a pair for quality scoring.

---

### `emotion_reflection` · Prose
**Purpose:** Generate a somatic prose reflection connecting the body signal to the specific decision.

**Inputs:** `title`, `bodyLocation` (7 zones), `emotion` (6 colors), `narrative` (first 600 chars)

**Output:** `{ reflection: string }` — 2–3 sentences, tentative language, no advice, no diagnosis

**System instruction:**
> "Connect the physical sensation directly to something specific in THEIR situation. Use 1–2 of their own words or phrases from their narrative. Stays curious and tentative — use 'perhaps', 'it sounds like', 'that might be'. No advice. No bullet points. Pure flowing prose."

**Stored in:** `emotion_maps.ai_reflection`

**Future use:** The (body_location × emotion_color) grid is a 42-cell structured signal captured *before* any cognitive analysis. When `outcomes.chosen_option_id` is populated, correlate this pre-rational somatic state with eventual choices. Hypothesis: Chest × Fear predicts status-quo option selection. The AI reflection quality may predict session continuation (measure via step 4+ completion rate).

---

### `pros_cons_tags` · JSON
**Purpose:** Generate pros and cons as short tag labels for one option.

**Inputs:** `optionLabel` (A|B), `optionText`, `narrative` (first 400 chars)

**Output:** `{ pros: string[], cons: string[] }` — 5–7 pros, 4–6 cons, 2–4 words each

**System instruction:**
> "Based on this decision option, suggest likely pros and cons as short tag labels (2–4 words each). Return ONLY valid JSON: { 'pros': [...], 'cons': [...] }. 5–7 pros, 4–6 cons. Realistic, not optimistic bias."

**Stored in:** `option_tags` with `tag_type ∈ {pro, con}`, `ai_suggested = true`

**Future use:** Compare AI-suggested tags vs. user-kept tags using the `ai_suggested` flag. High-discard rate on a label → the model is generating generic content the user doesn't identify with. Use as a fine-tuning signal. Aggregate accepted labels across decisions to find the most universally resonant concepts per decision category.

---

### `fear_desire_tags` · JSON
**Purpose:** Extract desires and fears from the narrative — option-agnostic, describes the person's motivational state.

**Inputs:** `narrative` (first 600 chars)

**Output:** `{ desires: string[], fears: string[] }` — 6 each, 2–4 words

**System instruction:**
> "Based on this decision narrative, suggest desire and fear phrases. Return ONLY valid JSON: { 'desires': [...], 'fears': [...] }. 6 desires (what they truly want, 2–4 words each), 6 fears (what they're afraid of, 2–4 words each)."

**Stored in:** `option_tags` with `tag_type ∈ {desire, fear}`

**Future use:** Fear/desire tags are narrative-derived and option-agnostic — they describe motivational state, not the options themselves. Cross-tabulate with Six Needs tags (step 6) to test whether specific needs cluster with specific fear patterns. This is the foundation of a motivational profiling model.

---

### `values_needs_tags` · JSON
**Purpose:** Map one option to values and the Six Human Needs — constrained vocabulary.

**Inputs:** `optionLabel`, `optionText`

**Output:** `{ values: string[], needs: string[] }` — needs strictly from the canonical Six

**Canonical needs vocabulary:**
`Certainty` · `Variety` · `Significance` · `Love & Connection` · `Growth` · `Contribution`

**System instruction:**
> "For needs, choose only from the Six Human Needs: Certainty, Variety, Significance, Love & Connection, Growth, Contribution. Return 3–6 needs that are most relevant to this option — do not invent other need labels."

**Stored in:** `option_tags` with `tag_type ∈ {value, need}`

**Future use:** This is the dataset's most analytically tractable signal — constrained, canonical vocabulary, directly comparable across all decisions. Aggregate needs distributions per user, per decision type, per outcome. Cluster users by needs profile. The needs split between Option A and Option B (e.g., A = Certainty + Security vs. B = Growth + Variety) is a structured representation of the core tension, directly comparable across thousands of decisions.

---

### `future_projection` · JSON
**Purpose:** Generate 4–5 emotional future states for one year post-choice, per option.

**Inputs:** `optionLabel`, `optionText`

**Output:** `{ statements: string[] }` — 4–5 items, 3–6 words each, mixed positive/challenging valence

**System instruction:**
> "Generate 4–5 realistic emotional/life states they might feel in one year if they chose it. Mix positive and challenging. Honest, not optimistic bias. Short phrases 3–6 words each."

**Stored in:** `projections.statement` + `projections.selected` (boolean — user endorsement)

**Future use:** `selected = true` means the user endorsed that projected future — an implicit preference signal. Compare the ratio of positive-to-challenging statements selected per option. If a user selects mainly challenging futures for Option A and positive ones for Option B, that's a lean signal before any explicit commitment. Future: use selected futures as input to a recommendation model; return users at `review_date` to rate actual outcomes for ground truth.

---

### `step_info` · Prose
**Purpose:** Contextual guidance explaining a specific step in relation to the user's decision. Ephemeral — not persisted.

**Inputs:** `step` (1–7), `stepLabel`, `decisionTitle`

**Output:** `{ info: string }` — 2–3 sentences, warm and plain

**Stored in:** Not persisted. `token_usage` only.

**Future use:** Consider persisting to measure whether users who open the info modal complete more steps. Token spend on `step_info` vs. step completion rate is a pure cost-of-engagement metric.

---

## Prompt Pipeline — Data Lineage

```
User types title
  → subtitle                     → decisions.subtitle

User writes narrative
  → parse_options                → options.content (A, B)
  → [optional] refine_option     → options.content (overwrites)

User picks body zone + emotion
  → emotion_reflection           → emotion_maps.ai_reflection

User selects lens (no AI)        → decisions.lens

If lens = pros_cons:
  → pros_cons_tags × 2           → option_tags (pro, con) per option

If lens = fears_desires:
  → fear_desire_tags × 2         → option_tags (desire, fear) per option

  → values_needs_tags × 2        → option_tags (value, need) per option

  → future_projection × 2        → projections (statement, selected) per option

User returns after review_date
  → [manual] outcome reflection  → outcomes (reflection, chosen_option_id)
```

---

## Supabase Schema

| Table | Key columns | Notes |
|-------|-------------|-------|
| `user_profiles` | `tier`, `token_cap`, `consented_at`, `consent_version` | Consent gate. Analysis window starts at `consented_at`. |
| `decisions` | `title`, `narrative`, `lens`, `status`, `current_step`, `review_date`, `subtitle`* | Core record. `narrative` is richest raw text. Drop-off = last `current_step`. |
| `options` | `label (A\|B)`, `content`, `approved` | Always 2 rows per decision. AI-extracted, user-confirmed. |
| `option_tags` | `tag_type`, `label`, `ai_suggested`* | tag_type ∈ {pro, con, desire, fear, value, need}. `ai_suggested` separates model vs. user. |
| `projections` | `statement`*, `selected` | 4–5 per option. `selected` = implicit preference signal. |
| `emotion_maps` | `body_location`, `emotion_color`, `ai_reflection`* | Pre-cognitive somatic signal. 7 zones × 6 emotions = 42-cell space. |
| `outcomes` | `reflection`, `chosen_option_id` | Ground truth for outcome modelling. Post-decision follow-up. |
| `token_usage` | `call_type`, `step`, `tokens_used` | Every `/api/ai` call logged. Billing + engagement analytics. |

*AI-generated column

**RLS is enforced on all tables.** Analytics queries require `SUPABASE_SERVICE_ROLE_KEY`. Anonymise by dropping `user_id` before sharing datasets. Terms of Use §7 permits anonymised aggregated analysis.

---

## Subscription Tiers

| Tier | Price | Token cap / period | Notes |
|------|-------|--------------------|-------|
| Free | ₪0 | 10,000 | ~1 full decision |
| Core | ₪45/mo | 150,000 | ~10–15 decisions |
| Pro | ₪75/mo | 400,000 | Power users, coaches |

Payment via Grow (grow.co.il, ILS). Webhook HMAC verification is a stub — needs completion per Grow docs before go-live.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16.2.7, React 19, Tailwind CSS 4 (App Router, mobile-first 393 px) |
| Database / Auth | Supabase — PostgreSQL + Auth. `@supabase/ssr` v0.10.x. Cookie-based sessions. |
| AI | OpenAI GPT-4o via `openai` npm v6.42. Single endpoint `/api/ai`. |
| Payments | Grow (grow.co.il) — ILS billing |
| Email | Resend v6 — transactional only |
| Hosting | Render — Web Service, Node 22, branch: `decision-room` |
| Language | TypeScript 5 (strict) |

---

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key — bypasses RLS. Use for analytics. Never client-side. | ✅ |
| `OPENAI_API_KEY` | GPT-4o key | ✅ |
| `NEXT_PUBLIC_SITE_URL` | Full origin URL (e.g. https://decision-room.onrender.com) | ✅ |
| `GROW_SECRET_KEY` | Payment API key | ✅ billing |
| `GROW_PLAN_ID_CORE` | Grow plan ID for Core tier | ✅ billing |
| `GROW_PLAN_ID_PRO` | Grow plan ID for Pro tier | ✅ billing |
| `RESEND_API_KEY` | Transactional email | optional |

---

*Decision Room · DPNR · decision-room branch · June 2026*
