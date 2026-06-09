# Product Requirements Document
## Decision Room — MLP v1.0 (Revised)
**DPNR Platform | Decision Making Feature**
**Date:** June 8, 2026 | **Status:** Draft v1.1 — Full 7-Step Flow

---

## 1. Overview

### 1.1 Product Vision
Decision Room is a standalone paid web application that guides users through a structured
7-step emotional and cognitive decision-making process. Users map a real-life decision as
a narrative, surface binary choices with AI, explore the emotional and rational dimensions
of each option, and track outcomes over time.

### 1.2 Stack
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Auth + DB:** Supabase (Postgres + Supabase Auth)
- **AI:** OpenAI GPT-4o-mini
- **Payments:** Grow (Israeli gateway, ILS)
- **Hosting:** Vercel
- **Email:** Resend

---

## 2. Subscription Tiers

| Tier   | Price/mo | Token cap  | Sessions (~3k tokens each) |
|--------|----------|------------|----------------------------|
| Free   | ₪0       | 10,000     | ~3                         |
| Core   | ₪45      | 150,000    | ~50                        |
| Pro    | ₪75      | 400,000    | ~133                       |

---

## 3. Full 7-Step Decision Room Flow

### Welcome Screen
- Full-screen galaxy background, DPNR branding
- CTA: "Start a Decision"

### Before You Begin
- Frames the session (~25–30 min)
- Optional intent field

### Step 01 — Name the Decision
- User types decision title (max 80 chars)
- Optional AI subtitle suggestion (~150 tokens)

### Step 02 — Narrative + Map Options
- Freetext narrative (500/1500/3000 chars by tier)
- AI parses → Option A + Option B cards
- Refine button (AI sharpens each option)
- Approve button (locks option)
- ~600–1200 tokens per session

### Step 03 — Body Emotion Mapping
- Interactive body figure (SVG/Lottie)
- User taps body location + selects emotion colour
- AI generates somatic reflection (~400 tokens)
- User responds: Accurate / Refine / Not sure / Partly True

### Step 04 — Choose Exploration Lens
- User picks one of 3 cards: Pros & Cons / Fears & Desires / Values & Needs
- Branches Step 05

### Step 05A — Pros & Cons
- AI suggests tag chips per option (pros + cons)
- User selects/adds chips (~600 tokens total)

### Step 05B — Fears & Desires
- "What do you truly want?" + tag chips
- "What are you afraid might happen?" + tag chips
- ~350 tokens

### Step 06 — Values & Needs
- Choose Values chips per option
- Choose Needs chips per option
- ~600 tokens total

### Step 07 — Future Projection
- "Imagine your life in one year if you choose this option"
- AI generates 4–5 checkbox outcome statements per option
- User selects all that feel true
- CTA: "Reflect your decision" → saves decision
- ~600 tokens total

### Post-Flow
- Decision saved confirmation
- Review date picker
- Return to Dashboard

---

## 4. Token Budget Per Session
| Step         | Tokens    |
|--------------|-----------|
| Step 01      | 0–150     |
| Step 02      | 600–1,200 |
| Step 03      | 400       |
| Step 04      | 0         |
| Step 05      | 350–600   |
| Step 06      | 600       |
| Step 07      | 600       |
| **Total**    | **~2,550–3,550** |

---

## 5. Data Model (key tables)
- `user_profiles` — tier, token_cap, grow_customer_id, billing_period_start
- `decisions` — title, subtitle, narrative, status, review_date
- `options` — decision_id, label (A/B), content, approved
- `emotion_maps` — body_location, emotion_color, ai_reflection, user_response
- `decision_lenses` — lens (pros_cons | fears_desires | values_needs)
- `option_tags` — option_id, tag_type (pro/con/desire/fear/value/need), label
- `projections` — option_id, statement, selected
- `outcomes` — decision_id, chosen_option_id, reflection
- `token_usage` — user_id, decision_id, step, call_type, tokens_used

---

## 6. Payment — Grow Integration
- Israeli gateway, ILS native, recurring subscriptions
- Webhook events: payment.success, subscription.renewed, payment.failed, subscription.cancelled
- Confirm exact API spec with Grow docs before implementation

---

## 7. Open Items
1. Confirm Grow API endpoints + webhook event names
2. Register Grow merchant account
3. Confirm ILS VAT treatment with accountant
4. Choose body figure approach: SVG interactive vs Lottie vs Three.js
5. Define full chip library for Steps 05–06
6. Hebrew RTL copy review
7. Confirm Supabase region (EU vs IL)
