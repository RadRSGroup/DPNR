'use client'
import { useState } from 'react'
import type { MirrorBodyPlacement, MirrorEmotionFelt } from '@dpnr/shared-types'
import MirrorStepShell from './MirrorStepShell'
import BodyMap from '@/components/shared/BodyMap'
import EmotionChips from '@/components/shared/EmotionChips'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { useAI, RefineFn } from '@/lib/useAI'

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
    onComplete({ ...felt(), automaticReaction: automaticReaction.trim() })
  }

  const textarea = 'w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-[var(--color-text-tertiary)] text-sm resize-none focus:outline-none focus:border-purple-500/60 transition-colors'

  return (
    <MirrorStepShell step={2} sessionTitle={sessionTitle} onBack={onBack}>
      <div className="flex-1 flex flex-col justify-between pt-4">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-white/70 text-sm leading-relaxed">What went through your mind in that moment?</p>
            <textarea
              value={thought}
              onChange={e => setThought(e.target.value.slice(0, 5000))}
              placeholder="The first thought that crossed your mind..."
              rows={2}
              className={textarea}
            />
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-white/70 text-sm leading-relaxed">What did you feel?</p>
              <p className="text-[var(--color-text-tertiary)] text-xs">Choose any that fit. There&apos;s no right answer.</p>
            </div>
            <EmotionChips emotionsFelt={emotionsFelt} setEmotionsFelt={setEmotionsFelt} setBodyPlacements={setBodyPlacements} />
            <textarea
              value={emotion}
              onChange={e => setEmotion(e.target.value.slice(0, 5000))}
              placeholder={emotionsFelt.length ? 'Anything to add, in your own words? (optional)' : 'Or name the feeling in your own words...'}
              rows={2}
              className={textarea}
            />
          </div>

          {emotionsFelt.length > 0 && (
            <BodyMap emotions={emotionsFelt} placements={bodyPlacements} onChange={setBodyPlacements} />
          )}

          <div className="space-y-2">
            {emotionsFelt.length === 0 && (
              <p className="text-white/70 text-sm leading-relaxed">Where did you feel it in your body?</p>
            )}
            <textarea
              value={bodyResponse}
              onChange={e => setBodyResponse(e.target.value.slice(0, 5000))}
              placeholder={bodyPlacements.length
                ? 'How did it feel there? Tight, heavy, hot... (optional)'
                : 'Tight chest, clenched jaw, a knot in your stomach...'}
              rows={2}
              className={textarea}
            />
          </div>

          {reflection ? (
            <div className="bg-purple-900/20 border border-purple-700/30 rounded-2xl px-4 py-3 space-y-1 animate-settle-in">
              <p className="text-purple-300 text-xs uppercase tracking-wide">Reflection</p>
              <p className="text-white/80 text-sm italic">&quot;{reflection}&quot;</p>
            </div>
          ) : (
            readyToReflect && (
              <button
                onClick={handleReflect}
                disabled={loading}
                className="text-purple-400 hover:text-purple-300 text-sm transition-colors flex items-center gap-1.5"
              >
                {loading ? 'Thinking...' : 'Reflect on this'}
              </button>
            )
          )}

          <div className="space-y-2">
            <p className="text-white/70 text-sm leading-relaxed">What did you actually do or say?</p>
            <textarea
              value={automaticReaction}
              onChange={e => setAutomaticReaction(e.target.value.slice(0, 5000))}
              placeholder="Your actual reaction, not what you wish you'd done..."
              rows={2}
              className={textarea}
            />
          </div>
        </div>

        <div className="pt-6">
          <PrimaryButton label="Continue" onClick={handleContinue} disabled={!readyToContinue} />
        </div>
      </div>
    </MirrorStepShell>
  )
}
