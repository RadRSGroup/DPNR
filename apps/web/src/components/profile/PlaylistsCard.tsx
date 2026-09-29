'use client'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'
import { FOCUS_MOODS, PLAYLIST_DISPLAY_ORDER, playlistArt } from '@/lib/focus-playlist'
import { openFocusPlayer, useFocusPlayer } from '@/lib/focus-player'

/**
 * My Profile → My Playlists: the whole collection (all 8, founder feedback
 * 2026-09-29; it used to show 4), in the founder's order, as one scrollable
 * row. Every cover is shown in the same round format (the art itself mixes
 * round and square) with its full name underneath, never truncated.
 * Tapping one plays it in the app-wide player (`lib/focus-player.ts`), so
 * it keeps playing across pages.
 */
export default function PlaylistsCard() {
  const t = useTranslations('Account.profile.playlists')
  const locale = useLocale() === 'he' ? 'he' : 'en'
  const { moodId } = useFocusPlayer()
  const playlists = PLAYLIST_DISPLAY_ORDER.flatMap((id) => {
    const mood = FOCUS_MOODS.find((m) => m.id === id)
    return mood ? [mood] : []
  })

  return (
    <Card className="p-4 lg:p-5 min-w-0">
      <p className="text-[var(--color-text-tertiary)] text-[11px] uppercase tracking-[0.14em]">{t('eyebrow')}</p>
      <h2 className="font-display text-white text-lg mt-1">{t('title')}</h2>
      <p className="text-[var(--color-text-tertiary)] text-xs leading-relaxed mt-1">{t('body')}</p>
      <ul className="scrollbar-glass mt-3 -mx-1 flex gap-3 overflow-x-auto px-1 pb-2 snap-x">
        {playlists.map((p) => {
          const playing = moodId === p.id
          const name = p.label[locale]
          return (
            <li key={p.id} className="w-20 lg:w-24 shrink-0 snap-start">
              <button
                type="button"
                onClick={() => openFocusPlayer(p.id)}
                aria-label={t('play', { name })}
                aria-pressed={playing}
                className="group block w-full text-center"
              >
                <span
                  className={`relative block aspect-square w-full overflow-hidden rounded-full ring-2 transition-colors ${
                    playing ? 'ring-white/80' : 'ring-transparent group-hover:ring-white/35'
                  }`}
                >
                  <Image src={playlistArt(p.id)} alt="" fill sizes="96px" className="object-cover" />
                </span>
                <span className="mt-2 block text-[11px] leading-snug text-white/85 uppercase tracking-wide break-words">{name}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
