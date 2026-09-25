'use client'
import { useLocale, useTranslations } from 'next-intl'
import { ChevronDown, ChevronUp, Music, X } from 'lucide-react'
import { FOCUS_MOODS } from '@/lib/focus-playlist'
import { closeFocusPlayer, setFocusPlayerExpanded, useFocusPlayer } from '@/lib/focus-player'

/** Spotify's compact embed (artwork, current track, play/pause) and its taller variant. */
const COMPACT_HEIGHT = 80
const DOCKED_HEIGHT = 152

/**
 * The one Spotify embed in the app (Session 70, feedback log "DPNR Music /
 * Global Player"). Mounted in the root layout, so it survives navigation and
 * the music keeps playing from page to page.
 *
 * - On Main Chat, Focus Mode docks it into its card slot (see
 *   `setFocusPlayerDock`): same look as before, just drawn from here.
 * - Everywhere else it's a small floating bar: playlist name, show/hide
 *   Spotify's compact player (current track + play/pause), stop.
 *
 * Previous/next track aren't offered: Spotify's embed doesn't expose them
 * (only play/pause/seek), and the Web API that would needs Spotify's
 * developer program, capped at 5 users (docs/SPOTIFY_FOCUS_MODE_SCOPE.md).
 *
 * The iframe keeps the same element and key in every state (docked,
 * floating, collapsed) so moving between them never reloads it; collapsing
 * only clips it to zero height.
 */
export default function GlobalMusicPlayer() {
  const t = useTranslations('Companion.focusMode')
  const locale = useLocale()
  const { moodId, expanded, dock } = useFocusPlayer()
  const mood = moodId ? FOCUS_MOODS.find((m) => m.id === moodId) : undefined
  if (!mood) return null

  const label = locale === 'he' ? mood.label.he : mood.label.en
  const docked = dock !== null
  const frameHeight = docked ? DOCKED_HEIGHT : COMPACT_HEIGHT

  return (
    <div
      className={
        docked
          ? 'fixed z-30'
          : 'fixed z-40 bottom-[5.5rem] end-3 lg:bottom-5 lg:end-5 w-[min(320px,calc(100vw-1.5rem))] rounded-2xl border border-[var(--color-border-glass)] bg-[var(--color-violet-950)]/95 shadow-[0_8px_30px_rgba(0,0,0,0.45)] p-2'
      }
      style={
        dock
          ? {
              top: dock.top,
              left: dock.left,
              width: dock.width,
              clipPath: `inset(${dock.clipTop}px 0 ${dock.clipBottom}px 0)`,
            }
          : undefined
      }
    >
      {!docked && (
        <div className="flex items-center gap-2 px-1">
          <Music className="w-4 h-4 shrink-0 text-[var(--color-violet-300)]" />
          <p className="flex-1 min-w-0 truncate text-xs text-white/80">{t('moodSubtitle', { mood: label })}</p>
          <button
            onClick={() => setFocusPlayerExpanded(!expanded)}
            aria-expanded={expanded}
            className="w-7 h-7 shrink-0 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            aria-label={expanded ? t('collapsePlayer') : t('expandPlayer')}
            title={expanded ? t('collapsePlayer') : t('expandPlayer')}
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            onClick={closeFocusPlayer}
            className="w-7 h-7 shrink-0 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            aria-label={t('stopMusic')}
            title={t('stopMusic')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div
        className={docked ? '' : 'overflow-hidden'}
        style={{ height: docked || expanded ? frameHeight : 0, marginTop: docked || !expanded ? 0 : 8 }}
      >
        <iframe
          title={t('playerTitle')}
          key={mood.spotifyId}
          src={`https://open.spotify.com/embed/playlist/${mood.spotifyId}?theme=0`}
          width="100%"
          height={frameHeight}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          className="block rounded-xl border-0"
        />
      </div>
    </div>
  )
}
