import { createClient } from '@/lib/supabase/server'
import { createGrowCheckoutSession } from '@/lib/grow'

/**
 * UNREACHABLE as of Session 10 — `pricing/page.tsx`'s upgrade buttons are
 * disabled rather than calling this, for two independent reasons neither of
 * which this route fixes: (1) `supabase.auth.getUser()` below always
 * returns null for a real Cognito-only user (Session 7's login swap never
 * ported this route), and (2) `createGrowCheckoutSession` (lib/grow.ts)
 * calls a fabricated Grow endpoint — Grow's real API has a completely
 * different auth/checkout model, see docs/PHASE_AUDIT.md's Session 10
 * update. Left in place (not deleted) as a real reference for whichever
 * future session rebuilds Credits/checkout against Grow's actual API and
 * the new Cognito/DynamoDB backend — don't re-enable the pricing page's
 * buttons without fixing both of the above first.
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { tier } = await req.json()
  if (tier !== 'core' && tier !== 'pro') {
    return Response.json({ error: 'Invalid tier' }, { status: 400 })
  }

  try {
    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''
    const checkoutUrl = await createGrowCheckoutSession({
      userId: user.id,
      tier,
      email: user.email!,
      successUrl: `${origin}/dashboard?upgraded=true`,
      cancelUrl: `${origin}/pricing`,
    })
    return Response.json({ checkoutUrl })
  } catch (err) {
    console.error('Grow checkout error:', err)
    return Response.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
