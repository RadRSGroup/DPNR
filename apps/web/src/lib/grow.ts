// Grow payment gateway integration
// NOTE: Confirm exact endpoint paths and field names with Grow's developer docs
// before going live. This follows common payment gateway conventions.

export const GROW_PLANS: Record<string, string> = {
  core: process.env.GROW_PLAN_ID_CORE!,
  pro: process.env.GROW_PLAN_ID_PRO!,
}

export function mapGrowPlanToTier(planId: string): 'core' | 'pro' | 'free' {
  if (planId === GROW_PLANS.core) return 'core'
  if (planId === GROW_PLANS.pro) return 'pro'
  return 'free'
}

export async function createGrowCheckoutSession({
  userId,
  tier,
  email,
  successUrl,
  cancelUrl,
}: {
  userId: string
  tier: 'core' | 'pro'
  email: string
  successUrl: string
  cancelUrl: string
}): Promise<string> {
  const response = await fetch('https://api.grow.co.il/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROW_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      plan_id: GROW_PLANS[tier],
      customer_email: email,
      metadata: { user_id: userId },
      success_url: successUrl,
      cancel_url: cancelUrl,
      currency: 'ILS',
    }),
  })

  if (!response.ok) {
    throw new Error(`Grow checkout error: ${response.status}`)
  }

  const session = await response.json()
  return session.checkout_url as string
}

export function verifyGrowSignature(
  body: string,
  signature: string | null,
  // Kept in the signature so call sites already pass it; wire it up when the TODO below is implemented.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  secret: string
): boolean {
  // TODO (pre-launch blocker, see ADR 0003): implement real HMAC verification using
  // Grow's signature method once their webhook docs confirm the exact algorithm.
  // Stub currently accepts any signature — do not enable real Credits/webhooks on this.
  if (!signature) return false
  return true
}
