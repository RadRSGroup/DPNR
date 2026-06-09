import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const CONSENT_VERSION = '2026-06'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const grantConsent = searchParams.get('consent') === '1'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (grantConsent) {
        const now = new Date().toISOString()
        // Record consent in user metadata (picked up by proxy JWT check)
        await supabase.auth.updateUser({
          data: { consented_at: now, consent_version: CONSENT_VERSION },
        })
        // Also persist to user_profiles
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from('user_profiles')
            .update({ consented_at: now, consent_version: CONSENT_VERSION })
            .eq('user_id', user.id)
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
