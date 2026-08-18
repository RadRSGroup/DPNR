import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const [
    { data: profile },
    { data: decisions },
    { data: tokenUsage },
  ] = await Promise.all([
    supabase.from('user_profiles').select('tier, token_cap, billing_period_start, preferred_language, created_at').eq('user_id', user.id).single(),
    supabase.from('decisions').select(`
      id, title, subtitle, narrative, status, current_step, lens, review_date, created_at, updated_at,
      options (
        id, label, content, approved, created_at,
        option_tags ( tag_type, label, ai_suggested ),
        projections ( statement, selected )
      ),
      emotion_maps ( body_location, emotion_color, ai_reflection, user_response, created_at ),
      outcomes ( reflection, chosen_option_id, created_at )
    `).eq('user_id', user.id).order('created_at', { ascending: true }),
    supabase.from('token_usage').select('step, call_type, tokens_used, created_at').eq('user_id', user.id).order('created_at', { ascending: true }),
  ])

  const export_data = {
    exported_at: new Date().toISOString(),
    account: {
      email: user.email,
      created_at: user.created_at,
      tier: profile?.tier ?? 'free',
      preferred_language: profile?.preferred_language ?? 'en',
    },
    decisions: decisions ?? [],
    token_usage_summary: {
      total_tokens_used: (tokenUsage ?? []).reduce((s, r) => s + (r.tokens_used ?? 0), 0),
      records: tokenUsage ?? [],
    },
  }

  const json = JSON.stringify(export_data, null, 2)
  return new Response(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="decision-room-data-${new Date().toISOString().split('T')[0]}.json"`,
    },
  })
}
