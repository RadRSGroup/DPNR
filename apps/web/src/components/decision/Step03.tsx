'use client'
import { useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import StepShell from './StepShell'
import RoomScreenFrame from '@/components/shared/RoomScreenFrame'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { useAI, RefineFn } from '@/lib/useAI'
import { TokenCapModal } from '@/components/ui/TokenCapModal'
import BodyMap from '@/components/shared/BodyMap'
import EmotionChips from '@/components/shared/EmotionChips'
import FeltSummary from '@/components/shared/FeltSummary'
import { TOTAL_STEPS } from '@/lib/types'
import { EMPTY_FELT, type Felt } from '@/lib/body-map'
import type { BodyPlacement, EmotionFelt } from '@dpnr/shared-types'

interface Step03Props {
  decisionTitle: string
  initialFelt?: Felt
  initialReflection?: string
  onRefine: RefineFn
  onComplete: (felt: Felt, reflection: string, response: UserResponse, userRefinement?: string) => void
  onBack?: () => void
  onSkip?: () => void
}

export type UserResponse = 'accurate' | 'refine' | 'not_sure' | 'partly_true'

/**
 * BODY_EMOTION. Slice 5b (Session 75): the same capture as the Mirror Room's
 * Step 2 — emotion chips → the body comes forward and the person places each
 * feeling on it (BodyMap; DPNR never picks a location) → optional own words,
 * required only for a half the chips / map didn't answer. Then the AI
 * reflection and the accurate / refine / not sure / partly true response,
 * unchanged. See decision-steps/body-emotion.ts.
 */
export default function Step03({ decisionTitle, initialFelt = EMPTY_FELT, initialReflection, onRefine, onComplete, onBack, onSkip }: Step03Props) {
  const router = useRouter()
  const [emotionsFelt, setEmotionsFelt] = useState<EmotionFelt[]>(initialFelt.emotionsFelt)
  const [bodyPlacements, setBodyPlacements] = useState<BodyPlacement[]>(initialFelt.bodyPlacements)
  const [emotion, setEmotion] = useState(initialFelt.emotion)
  const [bodyResponse, setBodyResponse] = useState(initialFelt.bodyResponse)
  const [reflection, setReflection] = useState<string | null>(initialReflection ?? null)
  const [response, setResponse] = useState<UserResponse | null>(null)
  const [userRefinement, setUserRefinement] = useState('')
  const { callAI, loading, tokenCapReached, dismissTokenCap } = useAI(onRefine)

  const hasEmotion = emotionsFelt.length > 0 || !!emotion.trim()
  const hasBody = bodyPlacements.length > 0 || !!bodyResponse.trim()

  function felt(): Felt {
    return { emotionsFelt, bodyPlacements, emotion: emotion.trim(), bodyResponse: bodyResponse.trim() }
  }

  async function handleMapFeelings() {
    if (!hasEmotion || !hasBody) return
    const res = await callAI<{ reflection: string }>('emotion_reflection', { ...felt() })
    if (res?.reflection) setReflection(res.reflection)
  }

  function handleContinue() {
    if (!hasEmotion || !hasBody || !reflection || !response) return
    if (response === 'refine' && !userRefinement.trim()) return
    onComplete(felt(), reflection, response, response === 'refine' ? userRefinement.trim() : undefined)
  }

  const textarea = 'w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-[var(--color-text-tertiary)] text-sm resize-none focus:outline-none focus:border-fuchsia-500/60 transition-colors'

  if (reflection) {
    return (
      <RoomScreenFrame backgroundSrc="/images/backgrounds/decision-bg.webp" glows={['bg-[radial-gradient(ellipse_90%_55%_at_50%_0%,_rgba(210,80,230,0.22)_0%,_transparent_70%)]', 'bg-[radial-gradient(ellipse_60%_40%_at_80%_80%,_rgba(160,40,200,0.12)_0%,_transparent_60%)]']}>

        {tokenCapReached && <TokenCapModal onClose={dismissTokenCap} />}

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-14 lg:pt-8 pb-2">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white text-lg"
          >✕</button>
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-text-tertiary)] text-xs">Decision Room</span>
          </div>
          <div className="w-8 h-8" />
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 px-5 pt-2 pb-1">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-(--motion-slow) ${
                i + 1 < 3
                  ? 'bg-purple-400 w-5'
                  : i + 1 === 3
                  ? 'bg-fuchsia-300 w-8 shadow-[0_0_8px_rgba(240,100,255,0.7)]'
                  : 'bg-white/15 w-4'
              }`}
            />
          ))}
        </div>

        {/* Header */}
        <div className="text-center px-6 pt-4 pb-3">
          <h2 className="text-white text-lg font-light">&quot;{decisionTitle}&quot;</h2>
          <p className="text-fuchsia-300/60 text-xs mt-1 uppercase tracking-widest">
            Step 03: Body Emotion Mapping
          </p>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 space-y-4 pb-4 animate-settle-in">
          <div className="bg-fuchsia-950/40 border border-fuchsia-600/25 rounded-2xl px-4 py-4 space-y-3">
            <FeltSummary emotionsFelt={emotionsFelt} bodyPlacements={bodyPlacements} emotion={emotion} bodyResponse={bodyResponse} />
            <p className="text-[var(--color-text-tertiary)] text-xs font-medium uppercase tracking-wide">A word from Us:</p>
            <p className="text-white/80 text-sm leading-relaxed">{reflection}</p>
          </div>

          {/* Do You Agree? */}
          <div className="space-y-3">
            <p className="text-[var(--color-text-tertiary)] text-xs text-center tracking-widest">— Do You Agree? —</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['accurate', 'Accurate'],
                ['refine', 'Refine this'],
                ['not_sure', 'Not sure'],
                ['partly_true', 'Partly True'],
              ] as [UserResponse, string][]).map(([val, lbl]) => (
                <button
                  key={val}
                  onClick={() => {
                    setResponse(val)
                    if (val === 'refine' && reflection && !userRefinement) {
                      setUserRefinement(reflection)
                    }
                  }}
                  className={`rounded-full border px-3 py-2 text-xs transition-all flex items-center gap-2 ${
                    response === val
                      ? 'border-fuchsia-400/60 bg-fuchsia-900/30 text-fuchsia-200'
                      : 'border-white/15 bg-white/5 text-white/50 hover:border-white/30 hover:text-white/70'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full border flex-shrink-0 transition-all ${
                    response === val ? 'border-fuchsia-400 bg-fuchsia-400' : 'border-white/30'
                  }`} />
                  {lbl}
                </button>
              ))}
            </div>
            {response === 'refine' && (
              <div className="pt-1 space-y-1 animate-settle-in">
                <p className="text-[var(--color-text-tertiary)] text-xs">Add or edit — make it yours:</p>
                <textarea
                  autoFocus
                  value={userRefinement}
                  onChange={e => setUserRefinement(e.target.value.slice(0, 5000))}
                  rows={4}
                  className="w-full bg-white/5 border border-fuchsia-700/40 rounded-xl px-3 py-2.5 text-white placeholder-[var(--color-text-tertiary)] text-sm resize-none focus:outline-none focus:border-fuchsia-500/60 transition-colors"
                />
              </div>
            )}
          </div>
        </div>

        {/* Bottom nav */}
        <div className="flex items-center gap-3 px-5 pb-8 pt-3">
          <button
            onClick={() => setReflection(null)}
            className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-all"
            aria-label="Back"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 4L6 9L11 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={onSkip}
            className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-all text-xs"
          >
            Skip
          </button>
          <button
            onClick={handleContinue}
            disabled={!response || (response === 'refine' && !userRefinement.trim())}
            className="flex-1 h-12 rounded-full bg-gradient-to-r from-fuchsia-700 to-purple-600 text-white text-sm font-medium hover:from-fuchsia-600 hover:to-purple-500 transition-all shadow-lg shadow-fuchsia-900/40 disabled:opacity-40 disabled:pointer-events-none"
          >
            Keep Exploring →
          </button>
        </div>
      </RoomScreenFrame>
    )
  }

  return (
    <StepShell step={3} decisionTitle={decisionTitle} onBack={onBack} onSkip={onSkip}>
      {tokenCapReached && <TokenCapModal onClose={dismissTokenCap} />}
      <div className="flex-1 flex flex-col space-y-6 pt-2">
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-white/70 text-sm leading-relaxed">What do you feel when you hold this decision?</p>
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
            <p className="text-white/70 text-sm leading-relaxed">Where do you feel it in your body?</p>
          )}
          <textarea
            value={bodyResponse}
            onChange={e => setBodyResponse(e.target.value.slice(0, 5000))}
            placeholder={bodyPlacements.length
              ? 'How does it feel there? Tight, heavy, hot... (optional)'
              : 'Tight chest, clenched jaw, a knot in your stomach...'}
            rows={2}
            className={textarea}
          />
        </div>

        <PrimaryButton
          label="Map My Feelings"
          onClick={handleMapFeelings}
          disabled={!hasEmotion || !hasBody}
          loading={loading}
        />
      </div>
    </StepShell>
  )
}
