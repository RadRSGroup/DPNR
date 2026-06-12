import { createClient } from '@/lib/supabase/client'
import { TIER_CAPS, type Tier } from '@/lib/tier-caps'

export async function createDecision(title: string, subtitle?: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('decisions')
    .insert({ user_id: user.id, title, subtitle, status: 'active', current_step: 1 })
    .select('id')
    .single()

  if (error) throw error
  return data.id as string
}

export async function updateDecision(id: string, patch: Record<string, unknown>) {
  const supabase = createClient()
  const { error } = await supabase
    .from('decisions')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function upsertOptions(
  decisionId: string,
  optionA: string,
  optionB: string,
): Promise<{ idA: string; idB: string }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('options')
    .upsert([
      { decision_id: decisionId, label: 'A', content: optionA, approved: true },
      { decision_id: decisionId, label: 'B', content: optionB, approved: true },
    ], { onConflict: 'decision_id,label' })
    .select('id, label')

  if (error) throw error
  const idA = data.find((r: { id: string; label: string }) => r.label === 'A')!.id as string
  const idB = data.find((r: { id: string; label: string }) => r.label === 'B')!.id as string
  return { idA, idB }
}

export async function saveEmotionMap(
  decisionId: string,
  bodyLocation: string,
  emotionColor: string,
  aiReflection: string,
) {
  const supabase = createClient()
  const { error } = await supabase.from('emotion_maps').insert({
    decision_id: decisionId,
    body_location: bodyLocation,
    emotion_color: emotionColor,
    ai_reflection: aiReflection,
  })
  if (error) throw error
}

export async function upsertEmotionMap(
  decisionId: string,
  bodyLocation: string,
  emotionColor: string,
  aiReflection: string,
) {
  const supabase = createClient()
  await supabase.from('emotion_maps').delete().eq('decision_id', decisionId)
  const { error } = await supabase.from('emotion_maps').insert({
    decision_id: decisionId,
    body_location: bodyLocation,
    emotion_color: emotionColor,
    ai_reflection: aiReflection,
  })
  if (error) throw error
}

export async function saveOptionTags(
  optionId: string,
  tags: Array<{ label: string; tagType: string; aiSuggested?: boolean }>,
) {
  if (!tags.length) return
  const supabase = createClient()
  const { error } = await supabase.from('option_tags').insert(
    tags.map(t => ({
      option_id: optionId,
      tag_type: t.tagType,
      label: t.label,
      ai_suggested: t.aiSuggested ?? false,
    }))
  )
  if (error) throw error
}

export async function saveProjections(
  optionId: string,
  statements: string[],
  selected: boolean[],
) {
  if (!statements.length) return
  const supabase = createClient()
  const { error } = await supabase.from('projections').insert(
    statements.map((s, i) => ({
      option_id: optionId,
      statement: s,
      selected: selected[i] ?? false,
    }))
  )
  if (error) throw error
}

export async function replaceTagsForType(
  optionId: string,
  tagType: string,
  labels: string[],
) {
  const supabase = createClient()
  // Remove existing tags of this type for this option
  await supabase.from('option_tags').delete()
    .eq('option_id', optionId).eq('tag_type', tagType)
  if (!labels.length) return
  const { error } = await supabase.from('option_tags').insert(
    labels.map(label => ({ option_id: optionId, tag_type: tagType, label, ai_suggested: false }))
  )
  if (error) throw error
}

export async function replaceProjections(
  optionId: string,
  statements: { statement: string; selected: boolean }[],
) {
  const supabase = createClient()
  await supabase.from('projections').delete().eq('option_id', optionId)
  if (!statements.length) return
  const { error } = await supabase.from('projections').insert(
    statements.map(s => ({ option_id: optionId, statement: s.statement, selected: s.selected }))
  )
  if (error) throw error
}

export async function replaceAllTagsForOption(
  optionId: string,
  tagsByType: Record<string, string[]>,
) {
  const supabase = createClient()
  const types = Object.keys(tagsByType)
  if (!types.length) return
  await supabase.from('option_tags').delete().eq('option_id', optionId).in('tag_type', types)
  const rows = types.flatMap(type =>
    (tagsByType[type] ?? []).map(label => ({ option_id: optionId, tag_type: type, label, ai_suggested: false }))
  )
  if (!rows.length) return
  const { error } = await supabase.from('option_tags').insert(rows)
  if (error) throw error
}

export async function upsertReflectionOutcome({
  decisionId,
  reflection,
  chosenOptionId,
}: {
  decisionId: string
  reflection: string
  chosenOptionId?: string
}) {
  const supabase = createClient()
  await supabase.from('outcomes').delete().eq('decision_id', decisionId).like('reflection', '[Reflection]%')
  const { error } = await supabase.from('outcomes').insert({
    decision_id: decisionId,
    reflection,
    chosen_option_id: chosenOptionId ?? null,
  })
  if (error) throw error
}

export async function addOutcome({
  decisionId,
  reflection,
  chosenOptionId,
}: {
  decisionId: string
  reflection: string
  chosenOptionId?: string
}) {
  const supabase = createClient()
  const { error } = await supabase.from('outcomes').insert({
    decision_id: decisionId,
    reflection,
    chosen_option_id: chosenOptionId ?? null,
  })
  if (error) throw error
}

export async function getOutcomes(decisionId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('outcomes')
    .select('id, reflection, chosen_option_id, created_at')
    .eq('decision_id', decisionId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function deleteDecision(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('decisions').delete().eq('id', id)
  if (error) throw error
}

export async function getDecisions() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('decisions')
    .select('id, title, subtitle, status, current_step, created_at, updated_at')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getTokenUsage() {
  const supabase = createClient()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tier, billing_period_start')
    .single()

  if (!profile) return { used: 0, cap: TIER_CAPS.free, tier: 'free' as const }

  const { data: usage } = await supabase
    .from('token_usage')
    .select('tokens_used')
    .gte('created_at', profile.billing_period_start)

  const used = (usage ?? []).reduce((sum: number, r: { tokens_used: number }) => sum + r.tokens_used, 0)
  const tier = profile.tier as Tier
  return { used, cap: TIER_CAPS[tier] ?? TIER_CAPS.free, tier }
}
