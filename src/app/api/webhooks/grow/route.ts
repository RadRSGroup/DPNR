import { createClient } from '@supabase/supabase-js'
import { mapGrowPlanToTier, verifyGrowSignature } from '@/lib/grow'
import { TIER_CAPS } from '@/lib/tokens'

// Use service role for webhook handler (bypasses RLS)
// Lazy init so build doesn't fail without env vars
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request) {
  const signature = req.headers.get('x-grow-signature')
  const body = await req.text()

  const isValid = verifyGrowSignature(body, signature, process.env.GROW_WEBHOOK_SECRET!)
  if (!isValid) return new Response('Unauthorized', { status: 401 })

  const event = JSON.parse(body)

  switch (event.type) {
    case 'payment.success':
    case 'subscription.renewed': {
      const tier = mapGrowPlanToTier(event.data.plan_id)
      await getSupabase()
        .from('user_profiles')
        .update({
          tier,
          token_cap: TIER_CAPS[tier],
          billing_period_start: new Date().toISOString(),
          scheduled_downgrade: null,
          downgrade_at: null,
        })
        .eq('grow_customer_id', event.data.customer_id)
      break
    }

    case 'payment.failed': {
      await getSupabase()
        .from('user_profiles')
        .update({ tier: 'free', token_cap: TIER_CAPS.free })
        .eq('grow_customer_id', event.data.customer_id)
      // TODO: send email via Resend
      break
    }

    case 'subscription.cancelled': {
      await getSupabase()
        .from('user_profiles')
        .update({
          scheduled_downgrade: 'free',
          downgrade_at: event.data.period_end,
        })
        .eq('grow_customer_id', event.data.customer_id)
      break
    }
  }

  return new Response('OK', { status: 200 })
}
