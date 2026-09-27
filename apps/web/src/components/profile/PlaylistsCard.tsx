'use client'
import { useLocale, useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'
import { FOCUS_MOODS } from '@/lib/focus-playlist'
import { openFocusPlayer, useFocusPlayer } from '@/lib/focus-player'

/**
 * The four shown in the compact My Profile view (founder feedback #16,
 * matching the approved reference: Remember, Come Home, Desire, Feel It).
 * The full collection stays in Focus Mode. Tapping one plays it in the
 * app-wide player (`lib/focus-player.ts`), so it keeps playing across pages.
 */
const PROFILE_PLAYLIST_IDS = ['remember', 'come-home', 'desire', 'feel-it'] as const

/*
 * Placeholder tiles until the founder's playlist artwork lands in Drive
 * ("use the exact provided artwork; don't generate, redraw or add symbols"),
 * so each tile is a plain tint with the name underneath. Swap in the images
 * here, keyed by id.
 */
const PLACEHOLDER_TINT: Record<(typeof PROFILE_PLAYLIST_IDS)[number], string> = {
  remember: 'from-violet-500/45 to-indigo-900/60',
  'come-home': 'from-amber-300/35 to-rose-900/55',
  desire: 'from-rose-500/45 to-fuchsia-950/60',
  'feel-it': 'from-fuchsia-300/40 to-violet-900/60',
}

export default function PlaylistsCard() {
  const t = useTranslations('Account.profile.playlists')
  const locale = useLocale() === 'he' ? 'he' : 'en'
  const { moodId } = useFocusPlayer()
  const playlists = PROFILE_PLAYLIST_IDS.flatMap((id) => {
    const mood = FOCUS_MOODS.find((m) => m.id === id)
    return mood ? [mood] : []
  })

  return (
    <Card className="p-4 lg:p-5">
      <p className="text-[var(--color-text-tertiary)] text-[11px] uppercase tracking-[0.14em]">{t('eyebrow')}</p>
      <h2 className="font-display text-white text-lg mt-1">{t('title')}</h2>
      <p className="text-[var(--color-text-tertiary)] text-xs leading-relaxed mt-1">{t('body')}</p>
      <ul className="mt-3 grid grid-cols-4 gap-2.5">
        {playlists.map((p) => {
          const playing = moodId === p.id
          const name = p.label[locale]
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => openFocusPlayer(p.id)}
                aria-label={t('play', { name })}
                aria-pressed={playing}
                className="group block w-full text-center"
              >
                <span
                  className={`block aspect-square w-full rounded-xl bg-gradient-to-br ${PLACEHOLDER_TINT[p.id as keyof typeof PLACEHOLDER_TINT]} border transition-colors ${
                    playing ? 'border-white/70' : 'border-white/10 group-hover:border-white/35'
                  }`}
                />
                <span className="mt-1.5 block text-[10.5px] leading-tight text-white/80 uppercase tracking-wide">{name}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
