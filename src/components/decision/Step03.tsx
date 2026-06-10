'use client'
import { useState } from 'react'
import StepShell from './StepShell'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { useAI } from '@/lib/useAI'
import { TokenCapModal } from '@/components/ui/TokenCapModal'
import { EMOTION_COLORS, BODY_LOCATIONS, EmotionColor } from '@/lib/types'

interface Step03Props {
  decisionTitle: string
  decisionId?: string
  narrative?: string
  onComplete: (bodyLocation: string, emotion: EmotionColor, reflection: string) => void
  onBack?: () => void
  onSkip?: () => void
}

type UserResponse = 'accurate' | 'refine' | 'not_sure' | 'partly_true'

export default function Step03({ decisionTitle, decisionId, narrative, onComplete, onBack, onSkip }: Step03Props) {
  const [bodyLocation, setBodyLocation] = useState<string | null>(null)
  const [emotion, setEmotion] = useState<EmotionColor | null>(null)
  const [reflection, setReflection] = useState<string | null>(null)
  const [response, setResponse] = useState<UserResponse | null>(null)
  const [userRefinement, setUserRefinement] = useState('')
  const { callAI, loading, tokenCapReached, dismissTokenCap } = useAI()

  async function handleMapFeelings() {
    if (!bodyLocation || !emotion) return
    const res = await callAI<{ reflection: string }>(
      'emotion_reflection',
      { title: decisionTitle, bodyLocation, emotion, narrative },
      decisionId
    )
    if (res?.reflection) setReflection(res.reflection)
  }

  function handleContinue() {
    if (!bodyLocation || !emotion || !reflection) return
    const finalReflection = response === 'refine' && userRefinement.trim()
      ? userRefinement.trim()
      : reflection
    onComplete(bodyLocation, emotion, finalReflection)
  }

  return (
    <StepShell step={3} decisionTitle={decisionTitle} onBack={onBack} onSkip={onSkip}>
      {tokenCapReached && <TokenCapModal onClose={dismissTokenCap} />}
      <div className="flex-1 flex flex-col space-y-5 pt-2">

        {!reflection ? (
          <>
            {/* Body location */}
            <div className="space-y-3">
              <p className="text-white/60 text-sm text-center">
                Where do you feel this experience in your body?
              </p>

              {/* Simplified body figure — SVG silhouette with tap zones */}
              <div className="flex justify-center">
                <BodyFigure selected={bodyLocation} onSelect={setBodyLocation} />
              </div>

              {/* Location chip strip as fallback / supplement */}
              <div className="chips-row justify-center">
                {BODY_LOCATIONS.map(loc => (
                  <button
                    key={loc}
                    onClick={() => setBodyLocation(loc)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs border transition-all ${
                      bodyLocation === loc
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-white/5 border-white/15 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            {/* Emotion colour picker */}
            <div className="space-y-3">
              <p className="text-white/60 text-sm text-center">Identify the colour of this experience</p>
              <div className="flex justify-center gap-3">
                {EMOTION_COLORS.map(({ label, color }) => (
                  <button
                    key={label}
                    onClick={() => setEmotion(label)}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div
                      className={`w-10 h-10 rounded-full border-2 transition-all ${
                        emotion === label ? 'scale-110 border-white' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-white/50 text-xs">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <PrimaryButton
              label="Map My Feelings"
              onClick={handleMapFeelings}
              disabled={!bodyLocation || !emotion}
              loading={loading}
            />
          </>
        ) : (
          /* AI Reflection */
          <div className="flex-1 flex flex-col space-y-4 fade-up">
            <div className="bg-purple-900/20 border border-purple-700/30 rounded-2xl p-4 space-y-3">
              <p className="text-purple-300 text-xs uppercase tracking-wide">
                Your selection: {bodyLocation} · {emotion}
              </p>
              <div className="space-y-2">
                <p className="text-white/40 text-xs font-medium uppercase tracking-wide">A word from us:</p>
                <p className="text-white/80 text-sm leading-relaxed">{reflection}</p>
              </div>
              <div className="space-y-2">
                <p className="text-white/40 text-xs">Does this resonate?</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['accurate', 'Accurate'],
                    ['refine', 'Refine this'],
                    ['not_sure', 'Not sure'],
                    ['partly_true', 'Partly True'],
                  ] as [UserResponse, string][]).map(([val, lbl]) => (
                    <button
                      key={val}
                      onClick={() => setResponse(val)}
                      className={`py-2 px-3 rounded-full border text-xs transition-all ${
                        response === val
                          ? 'bg-purple-600 border-purple-500 text-white'
                          : 'border-white/20 text-white/50 hover:border-white/40 hover:text-white/70'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
                {response === 'refine' && (
                  <div className="pt-1 space-y-1 fade-up">
                    <p className="text-white/40 text-xs">Write your own version:</p>
                    <textarea
                      autoFocus
                      value={userRefinement}
                      onChange={e => setUserRefinement(e.target.value.slice(0, 300))}
                      placeholder="What feels more accurate for you..."
                      rows={3}
                      className="w-full bg-white/5 border border-purple-700/40 rounded-xl px-3 py-2.5 text-white placeholder-white/25 text-sm resize-none focus:outline-none focus:border-purple-500/60 transition-colors"
                    />
                  </div>
                )}
              </div>
            </div>

            <PrimaryButton
              label="Keep Exploring"
              onClick={handleContinue}
              disabled={!response || (response === 'refine' && !userRefinement.trim())}
            />
          </div>
        )}
      </div>
    </StepShell>
  )
}

/* Simplified interactive SVG body figure */
function BodyFigure({ selected, onSelect }: { selected: string | null; onSelect: (loc: string) => void }) {
  const zones: { id: string; cx: number; cy: number; r: number }[] = [
    { id: 'Head',      cx: 60, cy: 18,  r: 14 },
    { id: 'Throat',    cx: 60, cy: 40,  r: 8  },
    { id: 'Chest',     cx: 60, cy: 62,  r: 14 },
    { id: 'Stomach',   cx: 60, cy: 86,  r: 11 },
    { id: 'Gut',       cx: 60, cy: 106, r: 10 },
    { id: 'Shoulders', cx: 60, cy: 54,  r: 8  },
  ]
  return (
    <svg viewBox="0 0 120 160" width="90" height="120" className="overflow-visible">
      {/* Simple body outline */}
      <ellipse cx="60" cy="18" rx="13" ry="14" fill="#1e1030" stroke="#4c1d95" strokeWidth="1.5" />
      <rect x="44" y="32" width="32" height="58" rx="8" fill="#1e1030" stroke="#4c1d95" strokeWidth="1.5" />
      <rect x="30" y="34" width="14" height="42" rx="7" fill="#1e1030" stroke="#4c1d95" strokeWidth="1.5" />
      <rect x="76" y="34" width="14" height="42" rx="7" fill="#1e1030" stroke="#4c1d95" strokeWidth="1.5" />
      <rect x="46" y="90" width="12" height="50" rx="6" fill="#1e1030" stroke="#4c1d95" strokeWidth="1.5" />
      <rect x="62" y="90" width="12" height="50" rx="6" fill="#1e1030" stroke="#4c1d95" strokeWidth="1.5" />

      {/* Tap zones */}
      {zones.map(z => (
        <circle
          key={z.id}
          cx={z.cx} cy={z.cy} r={z.r}
          fill={selected === z.id ? 'rgba(139,92,246,0.6)' : 'transparent'}
          stroke={selected === z.id ? '#a78bfa' : 'transparent'}
          strokeWidth="1.5"
          className="cursor-pointer hover:fill-purple-800/40 transition-all"
          onClick={() => onSelect(z.id)}
        />
      ))}
    </svg>
  )
}
