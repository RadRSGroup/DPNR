'use client'
import { useState } from 'react'
import StepShell from './StepShell'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { useAI, RefineFn } from '@/lib/useAI'

interface Step01Props {
  initialTitle?: string
  initialSubtitle?: string
  onRefine: RefineFn
  onComplete: (title: string, subtitle?: string) => void
  onBack?: () => void
}

export default function Step01({ initialTitle = '', initialSubtitle, onRefine, onComplete, onBack }: Step01Props) {
  const [title, setTitle] = useState(initialTitle)
  const [subtitle, setSubtitle] = useState<string | undefined>(initialSubtitle)
  const { callAI, loading } = useAI(onRefine)

  async function handleSuggestSubtitle() {
    if (!title.trim()) return
    const res = await callAI<{ subtitle: string }>('subtitle', { title })
    if (res?.subtitle) setSubtitle(res.subtitle)
  }

  function handleContinue() {
    if (!title.trim()) return
    onComplete(title.trim(), subtitle)
  }

  return (
    <StepShell step={1} decisionTitle={title || '...'} onBack={onBack}>
      <div className="flex-1 flex flex-col justify-between pt-4">
        <div className="space-y-6">
          {/* Prompt */}
          <p className="text-white/70 text-sm text-center leading-relaxed">
            What decision are you sitting with?
          </p>

          {/* Title input */}
          <div className="space-y-2">
            <textarea
              value={title}
              onChange={e => setTitle(e.target.value.slice(0, 500))}
              placeholder="Name your decision..."
              rows={2}
              className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-white/30 text-base resize-none focus:outline-none focus:border-purple-500/60 transition-colors"
            />
            <p className="text-white/30 text-xs text-right">{title.length}/500</p>
          </div>

          {/* AI subtitle */}
          {subtitle ? (
            <div className="bg-purple-900/20 border border-purple-700/30 rounded-2xl px-4 py-3 space-y-1 fade-up">
              <p className="text-purple-300 text-xs uppercase tracking-wide">AI Frame</p>
              <p className="text-white/80 text-sm italic">&quot;{subtitle}&quot;</p>
              <button
                onClick={() => setSubtitle(undefined)}
                className="text-white/30 hover:text-white/50 text-xs transition-colors"
              >
                Dismiss
              </button>
            </div>
          ) : (
            title.trim().length > 0 && (
              <button
                onClick={handleSuggestSubtitle}
                disabled={loading}
                className="text-purple-400 hover:text-purple-300 text-sm transition-colors flex items-center gap-1.5"
              >
                <span className="text-purple-500">✦</span>
                {loading ? 'Thinking...' : 'Suggest a frame for this decision'}
              </button>
            )
          )}
        </div>

        {/* CTA */}
        <div className="pt-6">
          <PrimaryButton
            label="Continue"
            onClick={handleContinue}
            disabled={!title.trim()}
          />
        </div>
      </div>
    </StepShell>
  )
}
