'use client'
import { useState } from 'react'
import MirrorStepShell from './MirrorStepShell'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { useAI, RefineFn } from '@/lib/useAI'

interface Props {
  sessionTitle: string
  initialThought?: string
  initialEmotion?: string
  initialBodyResponse?: string
  initialAutomaticReaction?: string
  onRefine: RefineFn
  onComplete: (thought: string, emotion: string, bodyResponse: string, automaticReaction: string) => void
  onBack?: () => void
}

/**
 * AUTOMATIC_REACTION — SUBMIT_STEP {thought, emotion, bodyResponse,
 * automaticReaction}, REFINE {thought, emotion, bodyResponse} -> {reflection}.
 * See mirror-steps/automatic-reaction.ts.
 */
export default function Step02AutomaticReaction({
  sessionTitle,
  initialThought = '',
  initialEmotion = '',
  initialBodyResponse = '',
  initialAutomaticReaction = '',
  onRefine,
  onComplete,
  onBack,
}: Props) {
  const [thought, setThought] = useState(initialThought)
  const [emotion, setEmotion] = useState(initialEmotion)
  const [bodyResponse, setBodyResponse] = useState(initialBodyResponse)
  const [automaticReaction, setAutomaticReaction] = useState(initialAutomaticReaction)
  const [reflection, setReflection] = useState<string | undefined>(undefined)
  const { callAI, loading } = useAI(onRefine)

  const readyToReflect = thought.trim() && emotion.trim() && bodyResponse.trim()

  async function handleReflect() {
    if (!readyToReflect) return
    const res = await callAI<{ reflection: string }>('reflection', { thought, emotion, bodyResponse })
    if (res?.reflection) setReflection(res.reflection)
  }

  function handleContinue() {
    if (!thought.trim() || !emotion.trim() || !bodyResponse.trim() || !automaticReaction.trim()) return
    onComplete(thought.trim(), emotion.trim(), bodyResponse.trim(), automaticReaction.trim())
  }

  return (
    <MirrorStepShell step={2} sessionTitle={sessionTitle} onBack={onBack}>
      <div className="flex-1 flex flex-col justify-between pt-4">
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-white/70 text-sm leading-relaxed">What went through your mind in that moment?</p>
            <textarea
              value={thought}
              onChange={e => setThought(e.target.value.slice(0, 400))}
              placeholder="The first thought that crossed your mind..."
              rows={2}
              className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-white/30 text-sm resize-none focus:outline-none focus:border-purple-500/60 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <p className="text-white/70 text-sm leading-relaxed">What did you feel?</p>
            <textarea
              value={emotion}
              onChange={e => setEmotion(e.target.value.slice(0, 200))}
              placeholder="Name the feeling..."
              rows={2}
              className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-white/30 text-sm resize-none focus:outline-none focus:border-purple-500/60 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <p className="text-white/70 text-sm leading-relaxed">Where did you feel it in your body?</p>
            <textarea
              value={bodyResponse}
              onChange={e => setBodyResponse(e.target.value.slice(0, 200))}
              placeholder="Tight chest, clenched jaw, a knot in your stomach..."
              rows={2}
              className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-white/30 text-sm resize-none focus:outline-none focus:border-purple-500/60 transition-colors"
            />
          </div>

          {reflection ? (
            <div className="bg-purple-900/20 border border-purple-700/30 rounded-2xl px-4 py-3 space-y-1 fade-up">
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
                <span className="text-purple-500">✦</span>
                {loading ? 'Thinking...' : 'Reflect on this'}
              </button>
            )
          )}

          <div className="space-y-2">
            <p className="text-white/70 text-sm leading-relaxed">What did you actually do or say?</p>
            <textarea
              value={automaticReaction}
              onChange={e => setAutomaticReaction(e.target.value.slice(0, 400))}
              placeholder="Your actual reaction, not what you wish you'd done..."
              rows={2}
              className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-white/30 text-sm resize-none focus:outline-none focus:border-purple-500/60 transition-colors"
            />
          </div>
        </div>

        <div className="pt-6">
          <PrimaryButton
            label="Continue"
            onClick={handleContinue}
            disabled={!thought.trim() || !emotion.trim() || !bodyResponse.trim() || !automaticReaction.trim()}
          />
        </div>
      </div>
    </MirrorStepShell>
  )
}
