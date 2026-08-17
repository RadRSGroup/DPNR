import { createClient } from '@/lib/supabase/server'

const CURRENT_VERSION = '2026-06'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date().toISOString()

  // Write to user_profiles for legal record
  await supabase
    .from('user_profiles')
    .update({ consented_at: now, consent_version: CURRENT_VERSION })
    .eq('user_id', user.id)

  // Write to user metadata so the proxy can read it from the JWT without a DB query
  await supabase.auth.updateUser({
    data: { consented_at: now, consent_version: CURRENT_VERSION },
  })

  return Response.json({ ok: true })
}
