# Custom Life Domains (#21) — review

*Session 77, 2026-09-28. Review only; nothing here is built. Founder #21: "Explore whether users should eventually be able to create a Life Domain that is personally meaningful but not included in the standard DPNR set. Do not implement automatically. Review implications across taxonomy / data model / Digital Twin / Growth Tracker / Evolution Map / recommendations / reporting first."*

## The real starting point: DPNR already has five "life domain" lists

| # | List | Values | Where |
|---|---|---|---|
| A | **Canonical Twin domains** `LifeDomainCategorySchema` (closed enum) | 7: `self_inner_world`, `relationships`, `career_purpose`, `health_body`, `money_abundance`, `creativity_expression`, `spirituality` | `packages/shared-types/src/dynamo/twin.ts:150` |
| B | Library topic `lifeDomains` (free strings) | 11: Self & Identity, Relationships & Love, Family, Friends & Social Connection, Work & Career, Money & Financial Life, Body & Health, Emotional Well-Being, Personal Growth, Leisure & Joy, Purpose & Spiritual Meaning | `infra/cdk/scripts/library-topics-v2.seed.ts` |
| C | Pull-a-Card `GUIDANCE_CARD_LIFE_DOMAINS` | 9: Relationships, Family, Work-Career, Finance, Health, Personal Growth, Leisure, Spirituality, Emotional Well-being | `dynamo/global-tables.ts:150` |
| D | Mirror Step 4 "Which part of your life does this touch most?" | free text, typed by the person | `components/mirror/Step04LifeImpact.tsx:48` |
| E | Onboarding choices (UI only) | 10: Me, Love, Family, Friends, Work, Money, Body, Growth, Purpose, Fun → collapsed into A | `dynamo/onboarding.ts:53-94` |

On top of that, the Intelligence Spec defines **8** domains, which don't match A (`docs/INTELLIGENCE_SPEC_AUDIT.md` §4: it adds Home & Lifestyle and splits Career & Purpose). That reconciliation has been open since the audit (`AGENT_LOG.md` open item 21). Every session has declined to settle it without a product decision.

**Main finding:** custom domains would be a sixth way of carving up a life. Doing it before A–E and the spec's 8 are reconciled would lock the mismatch in. **Reconcile the standard set first, then decide on custom domains.**

## What depends on the canonical list (A)

- **Digital Twin.** `twin/classify_signal` classifies every confirmed signal into one of the 7. The list, with a description per domain, is written into the prompt (`scripts/twin-prompts.seed.ts:86-138`), and the output is checked against the enum (`lib/signal-classification.ts:95`). `twin/domain_summary` writes one encrypted summary per domain (`TWIN#DOMAIN_SUMMARY#<domain>`, `lib/domain-summary.ts`).
- **Companion.** `companion/respond` and `onboard` carry the same 7-value enum for open threads (`scripts/companion-prompts.seed.ts:205-215, 334-344`). Open threads and commitments store `lifeDomain`.
- **Dashboard.** Life Domains tiles + % + summaries (`dashboard/handler.ts:105-165`, `lib/signal-aggregates.ts`), and the carousel loops over the enum's options (`LifeDomainsCarousel.tsx:29`).
- **Growth Tracker / Evolution Map.** Icons and colours come from `DOMAIN_META` (a record over the 7, `components/shared/domain-meta.ts`). Labels come from the English-only `LIFE_DOMAIN_LABELS` (not i18n), and the Evolution Map goal picker is built from it.
- **Recommendations / Pull a Card.** Hardcoded maps A → Library theme (`library/recommendations.ts:60`) and A → card domain (`companion/pull-card.ts:52`).
- **Reporting.** The therapist summary doesn't use Life Domains today.

**Data model (good news).** No secondary indexes exist anywhere. The only key that contains a domain value is the summary sort key, which is read by prefix, so a new domain id fits without changing key shapes. Other copies (`lifeDomain` on signals, threads, commitments, onboarding) are plain attributes. Renaming or merging a *standard* domain means rewriting items, but no index rebuild.

## What letting a person add their own domain would take

1. **Schema.** The closed 7-value enum (used by ~10 schemas and 4 API contracts) becomes "standard ids + the person's own ids". There's a new encrypted per-user item for each domain: name, optional colour/icon, created date.
2. **Digital Twin (the hard part).** Classification has to see *that person's* domain list at runtime, so the prompts change from a fixed list to a per-user variable (new prompt versions, deploy before seeding). Open questions:
   - Can a signal belong to a custom domain *and* a standard one?
   - Is a custom domain a child of a standard one (e.g. "My Dog" under Relationships)? That keeps the dashboard % and recommendations meaningful.
   - What happens to past signals when a domain is created, renamed or deleted: reclassify (model cost) or only going forward?
3. **Dashboard %.** The share-of-confirmed-signals % stays honest only if every signal still lands in exactly one domain. Custom domains that overlap standard ones would double-count unless there's a parent/child rule.
4. **Recommendations / Pull a Card.** A custom domain has no Library theme or card domain. It needs its parent's mapping (with the child/parent model), or no recommendation.
5. **UI.** A fallback icon and colour for `DOMAIN_META` (Tailwind classes can't be built at runtime), i18n for fixed labels (user-typed names stay as typed), and create/rename/delete UI in Evolution Map or My Profile.
6. **Privacy.** A custom domain's *name* can itself be sensitive ("My divorce"), so it belongs in encrypted content, not a plaintext attribute like today's standard `lifeDomain`, and it must be included in export/delete.

## Recommendation

1. **First, a product decision on the standard set:** pick one canonical list, the spec's 8 or an updated 7. Map B, C and E onto it explicitly, and migrate the stored values while there are few users (the audit's "cheap now, expensive later").
2. **Then, if custom domains are wanted: "personal sub-areas" under a standard domain,** not free-floating new domains. The person names an area inside, for example, Relationships. Signals are still classified into the standard domain (the %, summaries and recommendations stay correct), and the person can optionally tag a confirmed signal with their sub-area. That's the smallest honest version: no prompt changes for classification, one new encrypted item type, and a UI to create and tag.
3. **Only after that,** consider AI-suggested tagging into sub-areas (a new prompt plus model cost).

No build is recommended until (1) is decided. It's the prerequisite for everything else, and it needs the founder.
