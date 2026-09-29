'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { MirrorBodyPlacement, MirrorEmotionFelt } from '@dpnr/shared-types'
import MirrorStepShell from './MirrorStepShell'
import BodyMap from '@/components/shared/BodyMap'
import EmotionChips from '@/components/shared/EmotionChips'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { useAI, RefineFn } from '@/lib/useAI'
import Dictatable from '@/components/ui/Dictatable'

export interface FeltAnswers {
  thought: string
  emotion: string
  bodyResponse: string
  automaticReaction: string
  emotionsFelt: MirrorEmotionFelt[]
  bodyPlacements: MirrorBodyPlacement[]
}

interface Props {
  sessionTitle: string
  initial: FeltAnswers
  onRefine: RefineFn
  onComplete: (answers: FeltAnswers) => void
  onBack?: () => void
}

/**
 * AUTOMATIC_REACTION — SUBMIT_STEP {thought, emotion, bodyResponse,
 * automaticReaction, emotionsFelt?, bodyPlacements?}, REFINE {thought,
 * emotion, bodyResponse, emotionsFelt?, bodyPlacements?} -> {reflection}.
 * See mirror-steps/automatic-reaction.ts.
 *
 * Session 72 (#35): the feeling is picked from Decision Room's emotion
 * palette, then the body comes forward and the person places each feeling
 * on it (BodyMap). Their own words stay available for both, and are
 * required only when the chips / body map weren't used.
 */
export default function Step02AutomaticReaction({ sessionTitle, initial, onRefine, onComplete, onBack }: Props) {
  const [thought, setThought] = useState(initial.thought)
  const [emotion, setEmotion] = useState(initial.emotion)
  const [bodyResponse, setBodyResponse] = useState(initial.bodyResponse)
  const [automaticReaction, setAutomaticReaction] = useState(initial.automaticReaction)
  const [emotionsFelt, setEmotionsFelt] = useState<MirrorEmotionFelt[]>(initial.emotionsFelt)
  const [bodyPlacements, setBodyPlacements] = useState<MirrorBodyPlacement[]>(initial.bodyPlacements)
  const [reflection, setReflection] = useState<string | undefined>(undefined)
  const t = useTranslations('MirrorRoom')
  const { callAI, loading } = useAI(onRefine)

  const hasEmotion = emotionsFelt.length > 0 || !!emotion.trim()
  const hasBody = bodyPlacements.length > 0 || !!bodyResponse.trim()
  const readyToReflect = !!thought.trim() && hasEmotion && hasBody
  const readyToContinue = readyToReflect && !!automaticReaction.trim()

  function felt() {
    return { thought: thought.trim(), emotion: emotion.trim(), bodyResponse: bodyResponse.trim(), emotionsFelt, bodyPlacements }
  }

  async function handleReflect() {
    if (!readyToReflect) return
    const res = await callAI<{ reflection: string }>('reflection', felt())
    if (res?.reflection) setReflection(res.reflection)
  }

  function handleContinue() {
    if (!readyToContinue) return
    return onComplete({ ...felt(), automaticReaction: automaticReaction.trim() })
  }

  const textarea = 'w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-[var(--color-text-tertiary)] text-sm resize-none focus:outline-none focus:border-purple-500/60 transition-colors'

  return (
    <MirrorStepShell step={2} sessionTitle={sessionTitle} onBack={onBack}>
      <div className="flex-1 flex flex-col justify-between pt-4">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-white/70 text-sm leading-relaxed">{t('step2.thoughtQuestion')}</p>
            <Dictatable>
              <textarea
                value={thought}
                onChange={e => setThought(e.target.value.slice(0, 5000))}
                placeholder={t('step2.thoughtPlaceholder')}
                rows={2}
                className={textarea}
              />
            </Dictatable>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-white/70 text-sm leading-relaxed">{t('step2.feelQuestion')}</p>
              <p className="text-[var(--color-text-tertiary)] text-xs">{t('step2.feelHint')}</p>
            </div>
            <EmotionChips emotionsFelt={emotionsFelt} setEmotionsFelt={setEmotionsFelt} setBodyPlacements={setBodyPlacements} />
            <Dictatable>
              <textarea
                value={emotion}
                onChange={e => setEmotion(e.target.value.slice(0, 5000))}
                placeholder={emotionsFelt.length ? t('step2.emotionPlaceholderMore') : t('step2.emotionPlaceholder')}
                rows={2}
                className={textarea}
              />
            </Dictatable>
          </div>

          {emotionsFelt.length > 0 && (
            <BodyMap emotions={emotionsFelt} placements={bodyPlacements} onChange={setBodyPlacements} />
          )}

          <div className="space-y-2">
            {emotionsFelt.length === 0 && (
              <p className="text-white/70 text-sm leading-relaxed">{t('step2.bodyQuestion')}</p>
            )}
            <Dictatable>
              <textarea
                value={bodyResponse}
                onChange={e => setBodyResponse(e.target.value.slice(0, 5000))}
                placeholder={bodyPlacements.length
                  ? t('step2.bodyPlaceholderMore')
                  : t('step2.bodyPlaceholder')}
                rows={2}
                className={textarea}
              />
            </Dictatable>
          </div>

          {reflection ? (
            <div className="bg-purple-900/20 border border-purple-700/30 rounded-2xl px-4 py-3 space-y-1 animate-settle-in">
              <p className="text-purple-300 text-xs uppercase tracking-wide">{t('step2.reflection')}</p>
              <p className="text-white/80 text-sm italic">&quot;{reflection}&quot;</p>
            </div>
          ) : (
            readyToReflect && (
              <button
                onClick={handleReflect}
                disabled={loading}
                className="text-purple-400 hover:text-purple-300 text-sm transition-colors flex items-center gap-1.5"
              >
                {loading ? t('step2.thinking') : t('step2.reflect')}
              </button>
            )
          )}

          <div className="space-y-2">
            <p className="text-white/70 text-sm leading-relaxed">{t('step2.actionQuestion')}</p>
            <Dictatable>
              <textarea
                value={automaticReaction}
                onChange={e => setAutomaticReaction(e.target.value.slice(0, 5000))}
                placeholder={t('step2.actionPlaceholder')}
                rows={2}
                className={textarea}
              />
            </Dictatable>
          </div>
        </div>

        <div className="pt-6">
          <PrimaryButton label={t('continue')} onClick={handleContinue} disabled={!readyToContinue} />
        </div>
      </div>
    </MirrorStepShell>
  )
}
