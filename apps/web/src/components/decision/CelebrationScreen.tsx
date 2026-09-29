'use client'
import { useTranslations } from 'next-intl'
import RoomScreenFrame from '@/components/shared/RoomScreenFrame'
import InvertedButton from '@/components/ui/InvertedButton'
import { useAvatarUrl } from '@/lib/useAvatarUrl'

// DecisionRoom.affirmations.0–6 in messages.
const AFFIRMATION_COUNT = 7

interface Props {
  userName: string
  decisionTitle: string
  onContinue: () => void
}

export default function CelebrationScreen({ userName, decisionTitle, onContinue }: Props) {
  const t = useTranslations('DecisionRoom')
  const firstName = userName.includes('@')
    ? userName.split('@')[0]
    : userName.split(' ')[0] || userName

  const affirmation = t(`affirmations.${Math.floor(decisionTitle.length % AFFIRMATION_COUNT)}`)
  // Founder feedback 2026-09-28 #18: the person's own photo inside the glowing ring. Personal, not a reward.
  const avatarUrl = useAvatarUrl()

  return (
    <RoomScreenFrame glows={['bg-[radial-gradient(ellipse_60%_55%_at_50%_45%,_rgba(167,139,250,0.22)_0%,_rgba(139,92,246,0.10)_50%,_transparent_80%)]']} className="items-center justify-center px-8">

      <div className="flex flex-col items-center text-center space-y-8 animate-settle-in">
        {/* Glow orb */}
        <div className="relative isolate">
          <div className="w-28 h-28 rounded-full p-[3px] bg-gradient-to-br from-[var(--color-violet-400)] via-[var(--color-magenta-500)] to-[var(--color-amber-400)] shadow-[0_0_60px_rgba(167,139,250,0.35)]">
            {avatarUrl ? (
              // Presigned S3 URL (same reasoning as AccountMenu's <img>).
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="w-full h-full rounded-full object-cover border-2 border-[var(--color-bg-base)]" />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500/40 to-yellow-400/20 border-2 border-[var(--color-bg-base)]" />
            )}
          </div>
          {/* A slow breathing glow — calm, not a celebration burst (docs/MOTION.md). */}
          <div aria-hidden className="absolute -inset-6 -z-10 rounded-full bg-[radial-gradient(circle,_rgba(167,139,250,0.35)_0%,_transparent_70%)] blur-xl animate-soft-glow" />
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="font-display text-white text-3xl lg:text-4xl tracking-tight">
            {firstName ? t('celebration.wellDoneName', { name: firstName }) : t('celebration.wellDone')}
          </h1>
          <p className="text-purple-300/70 text-sm">
            {t('celebration.completed')}
          </p>
        </div>

        {/* Affirmation */}
        <div className="bg-white/5 border border-white/10 rounded-3xl px-6 py-5">
          <p className="text-white/75 text-sm leading-relaxed italic">
            &quot;{affirmation}&quot;
          </p>
        </div>

        {/* CTA */}
        <InvertedButton onClick={onContinue} className="w-full py-4 shadow-lg" label={t('celebration.seeSummary')} />

        <button
          onClick={onContinue}
          className="text-[var(--color-text-tertiary)] text-xs hover:text-white/50 transition-colors"
        >
          {t('skip')}
        </button>
      </div>
    </RoomScreenFrame>
  )
}
