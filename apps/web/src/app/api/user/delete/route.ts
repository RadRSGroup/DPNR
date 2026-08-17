import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Cascade deletes handle decisions → options → option_tags/projections/emotion_maps/outcomes
  // user_profiles also cascades on auth.users delete
  // We use the service-role admin client to delete the auth user
  const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!adminUrl || !serviceKey) {
    return Response.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const admin = createAdminClient(adminUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    console.error('Delete user error:', error)
    return Response.json({ error: 'Failed to delete account' }, { status: 500 })
  }

  return Response.json({ deleted: true })
}
