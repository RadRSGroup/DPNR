'use client'
import { useState, useSyncExternalStore } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { ExternalLink, Music, Play, SlidersHorizontal, X } from 'lucide-react'
import Card from '@/components/ui/Card'
import { FOCUS_MOODS } from '@/lib/focus-playlist'

const MOOD_STORAGE_KEY = 'dpnr.focusMood'

// The viewer's last mood, read from localStorage as an external store:
// null on the server and whenever storage is blocked, so server and
// client render the same markup and nothing throws.
function readSavedMood(): string | null {
  try {
    return localStorage.getItem(MOOD_STORAGE_KEY)
  } catch {
    return null
  }
}
function subscribeToStorage(onChange: () => void) {
  window.addEventListener('storage', onChange)
  return () => window.removeEventListener('storage', onChange)
}

/**
 * Focus Mode — DPNR's mood playlists through Spotify's official embed
 * (Session 68, docs/SPOTIFY_FOCUS_MODE_SCOPE.md option A: no developer
 * app, no OAuth; a full "connect your Spotify" integration is capped at 5
 * users by Spotify's quota rules). Listeners logged in to Spotify in this
 * browser get full tracks, everyone else 30-second previews.
 *
 * The embed is only loaded when the person presses play, so Spotify is
 * never contacted for anyone who doesn't use it. Playback itself uses the
 * embed's own button — starting it through Spotify's iFrame API can fall
 * back to previews (known Spotify issue).
 *
 * The settings button picks the mood; the choice is remembered per browser
 * (a convenience only — localStorage, guarded). With no playlist
 * configured (`lib/focus-playlist.ts`) this stays the
 * original disabled "coming soon" stub (docs/MAIN_CHAT_UX_UPDATE_PLAN.md
 * §3.4).
 */
export default function FocusMode() {
  const t = useTranslations('Companion.focusMode')
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const savedMood = useSyncExternalStore(subscribeToStorage, readSavedMood, () => null)
  const [chosenMood, setChosenMood] = useState<string | null>(null)
  const moodId = chosenMood ?? savedMood

  function chooseMood(id: string) {
    setChosenMood(id)
    setPickerOpen(false)
    try {
      localStorage.setItem(MOOD_STORAGE_KEY, id)
    } catch {
      // storage blocked — the choice just won't be remembered
    }
  }

  const mood = FOCUS_MOODS.find((m) => m.id === moodId) ?? FOCUS_MOODS[0]

  if (!mood) {
    return (
      <Card className="!p-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 shrink-0 rounded-xl bg-[var(--color-violet-600)]/20 flex items-center justify-center">
            <Music className="w-5 h-5 text-[var(--color-violet-300)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-white/85">{t('title')}</p>
            <p className="text-xs text-[var(--color-text-tertiary)] truncate">{t('subtitle')}</p>
          </div>
          <button
            disabled
            title={t('comingSoon')}
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-white/10 text-white/40 cursor-not-allowed"
            aria-label={t('playLabel')}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
          </button>
          <button
            disabled
            title={t('comingSoon')}
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full text-white/30 cursor-not-allowed"
            aria-label={t('settingsLabel')}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </Card>
    )
  }

  const moodLabel = (m: (typeof FOCUS_MOODS)[number]) => (locale === 'he' ? m.label.he : m.label.en)
  const moodTagline = locale === 'he' ? mood.tagline.he : mood.tagline.en
  const playlistUrl = `https://open.spotify.com/playlist/${mood.spotifyId}`

  return (
    <Card className="!p-3">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 shrink-0 rounded-xl bg-[var(--color-violet-600)]/20 flex items-center justify-center">
          <Music className="w-5 h-5 text-[var(--color-violet-300)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-white/85">{t('title')}</p>
          <p className="text-xs text-[var(--color-text-tertiary)] truncate">{t('moodSubtitle', { mood: moodLabel(mood) })}</p>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-[var(--color-violet-600)]/40 hover:bg-[var(--color-violet-600)]/60 text-white transition-colors"
          aria-label={open ? t('closePlayer') : t('openPlayer')}
        >
          {open ? <X className="w-4 h-4" /> : <Play className="w-3.5 h-3.5 fill-current" />}
        </button>
        {FOCUS_MOODS.length > 1 && (
          <button
            onClick={() => setPickerOpen((o) => !o)}
            aria-expanded={pickerOpen}
            className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-full transition-colors ${
              pickerOpen ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
            aria-label={t('chooseMood')}
            title={t('chooseMood')}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        )}
        <a
          href={playlistUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-colors"
          aria-label={t('openInSpotify')}
          title={t('openInSpotify')}
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {pickerOpen && (
        <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={t('chooseMood')}>
          {FOCUS_MOODS.map((m) => (
            <button
              key={m.id}
              role="radio"
              aria-checked={m.id === mood.id}
              onClick={() => chooseMood(m.id)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                m.id === mood.id
                  ? 'bg-[var(--color-violet-600)] text-white'
                  : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'
              }`}
            >
              {moodLabel(m)}
            </button>
          ))}
          <p className="w-full text-xs text-[var(--color-text-tertiary)]">{moodTagline}</p>
        </div>
      )}

      {open && (
        <div className="mt-3">
          <iframe
            title={t('playerTitle')}
            key={mood.spotifyId}
            src={`https://open.spotify.com/embed/playlist/${mood.spotifyId}?theme=0`}
            width="100%"
            height="152"
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            className="block rounded-xl border-0"
          />
          <p className="mt-2 text-[11px] leading-snug text-[var(--color-text-tertiary)]">{t('previewNote')}</p>
        </div>
      )}
    </Card>
  )
}
