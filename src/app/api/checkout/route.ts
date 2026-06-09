import { createClient } from '@/lib/supabase/server'
import { createGrowCheckoutSession } from '@/lib/grow'

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
