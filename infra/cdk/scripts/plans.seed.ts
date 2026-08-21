/**
 * Plans/Packages catalog seed data (MVP_ARCHITECTURE.md §3.2/§5.6). Spec
 * §Beta Trial only says package names/pricing "should remain configurable
 * rather than hard-coded" — it does not pin down real names, credit
 * amounts, or prices. These three are this session's own placeholder draft
 * (loosely carrying forward the retiring Grow tier framing's price points
 * from apps/web/src/app/terms/page.tsx, $15/$25 monthly), NOT a confirmed
 * product decision — same "flag honestly, don't invent silently" discipline
 * as library-topics.seed.ts's own doc comment. Whoever settles real
 * pricing/package names should overwrite this file, not treat it as
 * approved content.
 */
export const PLAN_SEEDS = [
  {
    planId: 'beta_trial',
    displayName: 'Beta Trial',
    kind: 'credit_pack' as const,
    credits: 50,
    priceMinorUnits: 0,
    currency: 'ILS',
  },
  {
    planId: 'core_monthly',
    displayName: 'Core',
    kind: 'subscription' as const,
    credits: 150,
    priceMinorUnits: 1500 * 100,
    currency: 'ILS',
    billingFrequency: 'monthly' as const,
  },
  {
    planId: 'pro_monthly',
    displayName: 'Pro',
    kind: 'subscription' as const,
    credits: 400,
    priceMinorUnits: 2500 * 100,
    currency: 'ILS',
    billingFrequency: 'monthly' as const,
  },
]
