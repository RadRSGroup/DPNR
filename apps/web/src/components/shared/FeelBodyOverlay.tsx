'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { BodyPlacement, EmotionFelt } from '@dpnr/shared-types'
import BottomSheet from '@/components/ui/BottomSheet'
import Card from '@/components/ui/Card'
import Dictatable from '@/components/ui/Dictatable'
import EmotionChips from './EmotionChips'
import BodyMap from './BodyMap'
import FeltSummary from './FeltSummary'

type Stage = 'feel' | 'locate' | 'return'

/**
 * Feel / Body (founder feedback #36, scope (a) approved 2026-09-28): a short
 * pause → feel → locate → return, reachable from Dashboard, Growth Tracker
 * and Main Chat's mobile utility row. It reuses the rooms' own emotion chips
 * and body map unchanged. Nothing is saved and no AI is called: it's a
 * private moment of noticing, like the Check-In mood chips, and the sheet
 * says so. The body map (and its video) mounts only at the locate stage.
 */
export default function FeelBodyOverlay({ onClose }: { onClose: () => void }) {
  const t = useTranslations('FeelBody')
  const [stage, setStage] = useState<Stage>('feel')
  const [emotionsFelt, setEmotionsFelt] = useState<EmotionFelt[]>([])
  const [bodyPlacements, setBodyPlacements] = useState<BodyPlacement[]>([])
  const [words, setWords] = useState('')

  return (
    <BottomSheet onClose={onClose} closeLabel={t('close')}>
      <Card className="!p-5">
        {stage === 'feel' && (
          <div key="feel" className="animate-settle-in space-y-4">
            <div>
              <h2 className="font-display text-2xl text-white">{t('feel.title')}</h2>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">{t('feel.body')}</p>
            </div>
            <EmotionChips emotionsFelt={emotionsFelt} setEmotionsFelt={setEmotionsFelt} setBodyPlacements={setBodyPlacements} />
            <button
              onClick={() => setStage('locate')}
              disabled={emotionsFelt.length === 0}
              className="w-full rounded-2xl bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] disabled:bg-white/10 disabled:text-white/40 py-3 text-sm font-medium text-white transition-colors"
            >
              {t('feel.next')}
            </button>
          </div>
        )}

        {stage === 'locate' && (
          <div key="locate" className="animate-settle-in space-y-4">
            {/* BodyMap brings its own heading and instructions. */}
            <BodyMap emotions={emotionsFelt} placements={bodyPlacements} onChange={setBodyPlacements} />
            <Dictatable>
              <textarea
                value={words}
                onChange={(e) => setWords(e.target.value)}
                maxLength={280}
                rows={2}
                placeholder={t('locate.wordsPlaceholder')}
                aria-label={t('locate.wordsPlaceholder')}
                className="w-full bg-white/[0.04] border border-white/15 rounded-2xl ps-4 pe-12 py-3 text-base text-white placeholder-[var(--color-text-tertiary)] resize-none focus:outline-none focus:border-[var(--color-violet-500)]/60"
              />
            </Dictatable>
            <div className="flex gap-2">
              <button onClick={() => setStage('feel')} className="flex-1 rounded-2xl border border-white/15 py-3 text-sm text-white/80">
                {t('back')}
              </button>
              <button
                onClick={() => setStage('return')}
                className="flex-[2] rounded-2xl bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] py-3 text-sm font-medium text-white transition-colors"
              >
                {t('locate.next')}
              </button>
            </div>
          </div>
        )}

        {stage === 'return' && (
          <div key="return" className="animate-settle-in space-y-4">
            <h2 className="font-display text-2xl text-white">{t('return.title')}</h2>
            <FeltSummary emotionsFelt={emotionsFelt} bodyPlacements={bodyPlacements} emotion={words} />
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{t('return.body')}</p>
            <button
              onClick={onClose}
              className="w-full rounded-2xl bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] py-3 text-sm font-medium text-white transition-colors"
            >
              {t('return.done')}
            </button>
          </div>
        )}

        <p className="mt-4 text-center text-[11px] text-[var(--color-text-tertiary)]">{t('privacy')}</p>
      </Card>
    </BottomSheet>
  )
}
