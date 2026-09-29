# Life Domains → the spec's 8: mapping + migration (proposal)

*Session 83, 2026-09-29. Proposal only: nothing is built and no production data has changed. Founder decision #21 (Session 78): adopt the spec's 8 Life Domains; custom domains come later as personal sub-areas (`docs/CUSTOM_LIFE_DOMAINS_REVIEW.md`). Source: `DPNR_operating_spec_principles.pdf` §4.*

## 1. The canonical 8 (replaces `LifeDomainCategorySchema`'s 7)

| # | id | Label (spec) | Was |
|---|---|---|---|
| 1 | `self_inner_world` | Self & Inner World | same id |
| 2 | `relationships` | Relationships & Connection | same id, label was "Relationships" |
| 3 | `health_body` | Health & Body | same id |
| 4 | `work_purpose` | Work, Purpose & Contribution | `career_purpose` + `creativity_expression` |
| 5 | `money_abundance` | Money & Abundance | same id |
| 6 | `growth_expansion` | Growth & Expansion | **new** |
| 7 | `home_lifestyle` | Home & Lifestyle | **new** |
| 8 | `meaning_spirituality` | Meaning & Spirituality | `spirituality` |

`creativity_expression` is dropped: the spec lists creativity as a subdomain of #4 ("Subtopics such as parenting, sexuality, creativity or career remain contextual subdomains"). Two ids are renamed so they match the spec's names. The alternative is to keep `career_purpose`/`spirituality` as ids and change only the labels, which means no data writes but ids that no longer match their labels.

## 2. The other lists → the 8

**E. Onboarding choices** (`ACTIVE_DOMAIN_TO_LIFE_DOMAIN`):

| Choice | Now | Proposed |
|---|---|---|
| Me | self_inner_world | self_inner_world |
| Love / Family / Friends | relationships | relationships |
| Work | career_purpose | work_purpose |
| Money | money_abundance | money_abundance |
| Body | health_body | health_body |
| **Growth** | self_inner_world | **growth_expansion** |
| Purpose | career_purpose | work_purpose |
| **Fun** | creativity_expression | **home_lifestyle** (spec: recreation) |

**C. Pull a Card** (Twin domain → card domain, `companion/pull-card.ts`):

| Twin | Now | Proposed |
|---|---|---|
| self_inner_world | Personal Growth | **Emotional Well-being** |
| relationships | Relationships | Relationships |
| health_body | Health | Health |
| work_purpose | Work-Career | Work-Career |
| money_abundance | Finance | Finance |
| growth_expansion | n/a | Personal Growth |
| home_lifestyle | n/a | Leisure |
| meaning_spirituality | Spirituality | Spirituality |

(Card "Family" has no direct Twin domain; it belongs under Relationships.)

**B. Library** (Twin domain → Explore theme, `library/recommendations.ts`): unchanged for the existing ids; `growth_expansion` → CREATE, `home_lifestyle` → LIFE, `meaning_spirituality` → LIFE, `work_purpose` → CHOOSE. The Library's own 11 topic tags stay as the founder's content. For the record, they map as: Self & Identity, Emotional Well-Being → 1; Relationships & Love, Family, Friends & Social Connection → 2; Body & Health → 3; Work & Career → 4; Money & Financial Life → 5; Personal Growth → 6; Leisure & Joy → 7; Purpose & Spiritual Meaning → 8.

**D. Mirror Step 4** stays free text. No change.

## 3. Stored data (production, scanned 2026-09-29)

48 domain-tagged items across 3 users. No item uses `creativity_expression`, and there are no summaries under a renamed id. Dry run of `infra/cdk/scripts/migrate-life-domains-v8.ts`: **6 changes**:

- 1 Twin signal: `career_purpose` → `work_purpose`
- 3 commitments: `career_purpose` → `work_purpose`
- 1 commitment: `spirituality` → `meaning_spirituality`
- 1 onboarding snapshot: `[relationships, career_purpose]` → `[relationships, work_purpose]`

Each write only goes through if the item still holds the old value. Encrypted content is not read. Legacy `TWIN#DOMAIN_SUMMARY#<old id>` items (none today) would be deleted and regenerated.

Existing signals are **not** reclassified: nothing moves into Growth or Home & Lifestyle retroactively. New signals are classified into all 8.

## 4. Code changes

- `shared-types/dynamo/twin.ts`: the 8-value enum + labels. Reads go through a legacy-id mapper, so an old value never breaks a parse (safety net, whatever the rollout order).
- `twin/classify_signal` prompt: the 8 with the spec's descriptions (new version). `companion/respond` + `onboard` open-thread enums.
- Frontend: `DOMAIN_META` icons/colours for the two new domains, en/he labels (**Hebrew needs native review**), and the Dashboard carousel shows 8 (the spec says "UI carousels may show all eight").
- The mapping tables above, plus tests.

## 5. Rollout (strict order)

*Approved by the user in Session 83: rename ids, mapping as proposed.*

1. The user deploys `Dpnr-Api` (+ `Dpnr-Auth` if the diff pulls it in). Verify the live bundle contains `work_purpose`. The backend goes first because the new frontend's onboarding sends `growth_expansion`/`home_lifestyle`, which the old Lambda rejects.
2. Push `mvp`. Pages skip a domain id they don't know instead of crashing, so a brief old/new mismatch only hides a row.
3. Run the migration dry run again, then run it with `--confirm`. Re-scan: expect 0 legacy values. (Reads already map legacy ids, so this is cleanup, not urgent.)
4. `npm run seed:prompt-registry`. It must run after step 1, because the old Lambda would reject the new ids the new prompt returns.
