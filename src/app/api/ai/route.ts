import { createClient } from '@/lib/supabase/server'
import { checkTokenBudget, logTokenUsage } from '@/lib/tokens'
import { aiCall, aiCallJSON } from '@/lib/ai/call'
import { prompts } from '@/lib/ai/prompts'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const budget = await checkTokenBudget(user.id)
  if (!budget.allowed) {
    return Response.json({
      error: 'token_cap_reached',
      used: budget.used,
      cap: budget.cap,
      tier: budget.tier,
    }, { status: 402 })
  }

  const body = await req.json()
  const { type, decisionId, ...params } = body

  let result: unknown
  let tokensUsed = 0

  try {
    switch (type) {
      case 'subtitle': {
        const p = prompts.subtitle(params.title)
        const r = await aiCall(p.system, p.user)
        result = { subtitle: r.text }
        tokensUsed = r.tokensUsed
        break
      }
      case 'parse_options': {
        const p = prompts.parseOptions(params.narrative)
        const r = await aiCallJSON<{ optionA: string; optionB: string }>(p.system, p.user)
        result = r.data
        tokensUsed = r.tokensUsed
        break
      }
      case 'refine_option': {
        const p = prompts.refineOption(params.optionText)
        const r = await aiCall(p.system, p.user)
        result = { refined: r.text }
        tokensUsed = r.tokensUsed
        break
      }
      case 'emotion_reflection': {
        const p = prompts.emotionReflection(params.title, params.bodyLocation, params.emotion, params.narrative as string | undefined)
        const r = await aiCall(p.system, p.user)
        result = { reflection: r.text }
        tokensUsed = r.tokensUsed
        break
      }
      case 'pros_cons_tags': {
        const p = prompts.prosConsTags(params.optionLabel, params.optionText, params.narrative)
        const r = await aiCallJSON<{ pros: string[]; cons: string[] }>(p.system, p.user)
        result = r.data
        tokensUsed = r.tokensUsed
        break
      }
      case 'fear_desire_tags': {
        const p = prompts.fearDesireTags(params.narrative)
        const r = await aiCallJSON<{ desires: string[]; fears: string[] }>(p.system, p.user)
        result = r.data
        tokensUsed = r.tokensUsed
        break
      }
      case 'values_needs_tags': {
        const p = prompts.valuesNeedsTags(params.optionLabel, params.optionText)
        const r = await aiCallJSON<{ values: string[]; needs: string[] }>(p.system, p.user)
        result = r.data
        tokensUsed = r.tokensUsed
        break
      }
      case 'step_info': {
        const p = prompts.stepInfo(params.step as number, params.stepLabel as string, params.decisionTitle as string)
        const r = await aiCall(p.system, p.user)
        result = { info: r.text }
        tokensUsed = r.tokensUsed
        break
      }
      case 'future_projection': {
        const p = prompts.futureProjection(params.optionLabel, params.optionText, params.decisionTitle, params.narrative)
        const r = await aiCallJSON<{ statements: string[] }>(p.system, p.user)
        result = r.data
        tokensUsed = r.tokensUsed
        break
      }
      case 'section_summary': {
        const p = prompts.sectionSummary(
          params.step as 'pros_cons' | 'fears_desires' | 'values_needs' | 'values' | 'needs' | 'projections',
          params.decisionTitle as string,
          params.optionA as string,
          params.optionB as string,
          params.selectionsA as string[],
          params.selectionsB as string[],
        )
        const r = await aiCallJSON<{ wordFromUs: string; reflection: string }>(p.system, p.user)
        result = r.data
        tokensUsed = r.tokensUsed
        break
      }
      default:
        return Response.json({ error: 'Unknown AI call type' }, { status: 400 })
    }

    await logTokenUsage({
      userId: user.id,
      decisionId,
      step: `step_${type}`,
      callType: type,
      tokensUsed,
    })

    return Response.json({ result, tokensUsed, remaining: budget.remaining - tokensUsed })

  } catch (err) {
    console.error('AI call failed:', err)
    return Response.json({ error: 'AI call failed' }, { status: 500 })
  }
}
