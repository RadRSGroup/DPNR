'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import StepShell from './StepShell'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { useAI } from '@/lib/useAI'
import { TokenCapModal } from '@/components/ui/TokenCapModal'
import { EMOTION_COLORS, BODY_LOCATIONS, EmotionColor, TOTAL_STEPS } from '@/lib/types'

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
  const router = useRouter()
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

  if (reflection) {
    return (
      <div className="relative h-dvh flex flex-col overflow-hidden max-w-[393px] mx-auto">
        {/* Warm mauve background — matches SectionSummaryScreen */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#3d0d52] via-[#2a0940] to-[#1c052e] -z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_0%,_rgba(210,80,230,0.22)_0%,_transparent_70%)] -z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_80%,_rgba(160,40,200,0.12)_0%,_transparent_60%)] -z-10" />

        {tokenCapReached && <TokenCapModal onClose={dismissTokenCap} />}

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-14 pb-2">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white text-lg"
          >✕</button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-purple-400/40 flex items-center justify-center text-xs">✦</div>
            <span className="text-white/40 text-xs">Manifest yo...</span>
          </div>
          <div className="w-8 h-8" />
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 px-5 pt-2 pb-1">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
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
          <h2 className="text-white text-lg font-light">"{decisionTitle}"</h2>
          <p className="text-fuchsia-300/60 text-xs mt-1 uppercase tracking-widest">
            Step 03: Body Emotion Mapping
          </p>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 space-y-4 pb-4 fade-up">
          <div className="bg-fuchsia-950/40 border border-fuchsia-600/25 rounded-2xl px-4 py-4 space-y-3">
            <p className="text-fuchsia-300 text-xs uppercase tracking-widest font-semibold">
              Your selection: {bodyLocation} · {emotion}
            </p>
            <p className="text-white/40 text-xs font-medium uppercase tracking-wide">A word from Us:</p>
            <p className="text-white/80 text-sm leading-relaxed">{reflection}</p>
          </div>

          {/* Do ye Agree? */}
          <div className="space-y-3">
            <p className="text-white/30 text-xs text-center tracking-widest">— Do ye Agree? —</p>
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
              <div className="pt-1 space-y-1 fade-up">
                <p className="text-white/40 text-xs">Add or edit — make it yours:</p>
                <textarea
                  autoFocus
                  value={userRefinement}
                  onChange={e => setUserRefinement(e.target.value.slice(0, 600))}
                  rows={4}
                  className="w-full bg-white/5 border border-fuchsia-700/40 rounded-xl px-3 py-2.5 text-white placeholder-white/25 text-sm resize-none focus:outline-none focus:border-fuchsia-500/60 transition-colors"
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
      </div>
    )
  }

  return (
    <StepShell step={3} decisionTitle={decisionTitle} onBack={onBack} onSkip={onSkip}>
      {tokenCapReached && <TokenCapModal onClose={dismissTokenCap} />}
      <div className="flex-1 flex flex-col space-y-5 pt-2">
        {/* Body location */}
        <div className="space-y-3">
          <p className="text-white/60 text-sm text-center">
            Where do you feel this experience in your body?
          </p>
          <div className="flex justify-center">
            <BodyFigure selected={bodyLocation} onSelect={setBodyLocation} />
          </div>
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
          <div className="grid grid-cols-4 gap-x-3 gap-y-4 justify-items-center">
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
