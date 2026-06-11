import { createClient } from '@/lib/supabase/server'
import { TIER_CAPS, type Tier } from '@/lib/tier-caps'

export { TIER_CAPS, type Tier }

export async function checkTokenBudget(userId: string) {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tier, billing_period_start')
    .eq('user_id', userId)
    .single()

  if (!profile) throw new Error('User profile not found')

  const { data: usage } = await supabase
    .from('token_usage')
    .select('tokens_used')
    .eq('user_id', userId)
    .gte('created_at', profile.billing_period_start)

  const used = (usage ?? []).reduce((sum, r) => sum + r.tokens_used, 0)
  const tier = profile.tier as Tier
  const cap = TIER_CAPS[tier] ?? TIER_CAPS.free

  return {
    allowed: used < cap,
    used,
    cap,
    remaining: Math.max(0, cap - used),
    tier: profile.tier as Tier,
  }
}

export async function logTokenUsage({
  userId,
  decisionId,
  step,
  callType,
  tokensUsed,
}: {
  userId: string
  decisionId?: string
  step: string
  callType: string
  tokensUsed: number
}) {
  const supabase = await createClient()

  await supabase.from('token_usage').insert({
    user_id: userId,
    decision_id: decisionId ?? null,
    step,
    call_type: callType,
    tokens_used: tokensUsed,
  })
}
