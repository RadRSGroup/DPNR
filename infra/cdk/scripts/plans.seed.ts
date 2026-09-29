/**
 * Plans/Packages catalog (MVP_ARCHITECTURE.md §3.2/§5.6), read by
 * `GET /v1/plans` and shown on My Wallet.
 *
 * Pricing is the founder's (Living Feedback Log, 2026-09-29):
 *   Plans:   Free $0 · Self $29/month + 120 credits · Pro $59/month + 350 credits
 *   Credits: 50 for $9 · 120 for $19 · 300 for $39
 * The subscription is access to DPNR plus monthly credits; extra credits
 * are for more depth and are not an alternative to a plan.
 *
 * Free is not a catalog item: it has no price and no monthly grant
 * (`credits` must be positive), so My Wallet renders it as a fixed card.
 * New accounts still get the one-time starter grant from
 * `auth/ensure-profile.ts` (STARTER_TRIAL_CREDITS), which never read this
 * catalog.
 *
 * planIds `core_monthly`/`pro_monthly` are kept (only their display name,
 * price and credits change) so nothing keyed on them breaks; `Tier` in
 * shared-types still says `core`. `beta_trial` is switched off (it was only
 * ever a display row, and it showed up as a $0 "credit pack").
 *
 * Purchasing is still off (no payment provider since Grow was removed), so
 * these are shown with disabled buttons. Prices are USD minor units (cents).
 */
export const PLAN_SEEDS = [
  {
    planId: 'beta_trial',
    displayName: 'Beta Trial',
    kind: 'credit_pack' as const,
    credits: 50,
    priceMinorUnits: 0,
    currency: 'USD',
    active: false,
  },
  {
    planId: 'core_monthly',
    displayName: 'Self',
    kind: 'subscription' as const,
    credits: 120,
    priceMinorUnits: 29_00,
    currency: 'USD',
    billingFrequency: 'monthly' as const,
  },
  {
    planId: 'pro_monthly',
    displayName: 'Pro',
    kind: 'subscription' as const,
    credits: 350,
    priceMinorUnits: 59_00,
    currency: 'USD',
    billingFrequency: 'monthly' as const,
  },
  {
    planId: 'credits_50',
    displayName: '50 Credits',
    kind: 'credit_pack' as const,
    credits: 50,
    priceMinorUnits: 9_00,
    currency: 'USD',
    billingFrequency: 'one_time' as const,
  },
  {
    planId: 'credits_120',
    displayName: '120 Credits',
    kind: 'credit_pack' as const,
    credits: 120,
    priceMinorUnits: 19_00,
    currency: 'USD',
    billingFrequency: 'one_time' as const,
  },
  {
    planId: 'credits_300',
    displayName: '300 Credits',
    kind: 'credit_pack' as const,
    credits: 300,
    priceMinorUnits: 39_00,
    currency: 'USD',
    billingFrequency: 'one_time' as const,
  },
]
