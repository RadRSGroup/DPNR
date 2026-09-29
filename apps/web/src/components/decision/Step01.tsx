'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import StepShell from './StepShell'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { useAI, RefineFn } from '@/lib/useAI'
import Dictatable from '@/components/ui/Dictatable'

interface Step01Props {
  initialTitle?: string
  initialSubtitle?: string
  onRefine: RefineFn
  onComplete: (title: string, subtitle?: string) => void
  onBack?: () => void
}

export default function Step01({ initialTitle = '', initialSubtitle, onRefine, onComplete, onBack }: Step01Props) {
  const t = useTranslations('DecisionRoom')
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
    return onComplete(title.trim(), subtitle)
  }

  return (
    <StepShell step={1} decisionTitle={title || '...'} onBack={onBack}>
      <div className="flex-1 flex flex-col justify-between pt-4">
        <div className="space-y-6">
          {/* Prompt */}
          <p className="text-white/70 text-sm text-center leading-relaxed">
            {t('step01.prompt')}
          </p>

          {/* Title input */}
          <div className="space-y-2">
            <Dictatable>
              <textarea
                value={title}
                onChange={e => setTitle(e.target.value.slice(0, 5000))}
                placeholder={t('step01.placeholder')}
                rows={2}
                className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-[var(--color-text-tertiary)] text-base resize-none focus:outline-none focus:border-purple-500/60 transition-colors"
              />
            </Dictatable>
            <p className="text-[var(--color-text-tertiary)] text-xs text-right">{title.length}/5000</p>
          </div>

          {/* AI subtitle */}
          {subtitle ? (
            <div className="bg-purple-900/20 border border-purple-700/30 rounded-2xl px-4 py-3 space-y-1 animate-settle-in">
              <p className="text-purple-300 text-xs uppercase tracking-wide">{t('step01.aiFrame')}</p>
              <p className="text-white/80 text-sm italic">&quot;{subtitle}&quot;</p>
              <button
                onClick={() => setSubtitle(undefined)}
                className="text-[var(--color-text-tertiary)] hover:text-white/50 text-xs transition-colors"
              >
                {t('step01.dismiss')}
              </button>
            </div>
          ) : (
            title.trim().length > 0 && (
              <button
                onClick={handleSuggestSubtitle}
                disabled={loading}
                className="text-purple-400 hover:text-purple-300 text-sm transition-colors flex items-center gap-1.5"
              >
                {loading ? t('step01.thinking') : t('step01.suggestFrame')}
              </button>
            )
          )}
        </div>

        {/* CTA */}
        <div className="pt-6">
          <PrimaryButton
            label={t('continue')}
            onClick={handleContinue}
            disabled={!title.trim()}
          />
        </div>
      </div>
    </StepShell>
  )
}
