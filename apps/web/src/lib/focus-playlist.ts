/**
 * Focus Mode's mood playlists (Session 68 — docs/SPOTIFY_FOCUS_MODE_SCOPE.md,
 * option A). One entry per mood; the first is the default. `url` is the
 * playlist's Spotify share link, e.g.
 * "https://open.spotify.com/playlist/37i9dQZF1DX..." (a trailing `?si=…`
 * is fine). Entries without a valid link are ignored; with none at all,
 * Focus Mode stays the "coming soon" stub.
 */
export interface FocusPlaylist {
  /** Stable key — also what the viewer's last choice is remembered by. */
  id: string
  /** The playlist's own name. DPNR brand names, kept in English in both locales (they match Spotify). */
  label: { en: string; he: string }
  /** One line under the picker for the chosen mood. */
  tagline: { en: string; he: string }
  url: string
}

/*
 * The approved DPNR collection, from "DPNR – Living Bugs, Fixes & Product
 * Feedback Log" (Drive, 2026-09-25). Taglines shortened from the doc's
 * descriptions; the Hebrew taglines are agent translations (infinitive /
 * gender-neutral forms) awaiting a native-speaker review.
 */
export const FOCUS_PLAYLISTS: FocusPlaylist[] = [
  {
    id: 'come-home',
    label: { en: 'Come Home', he: 'Come Home' },
    tagline: { en: 'Slow down. Come back to yourself.', he: 'להאט. לחזור אל עצמך.' },
    url: 'https://open.spotify.com/playlist/0onNkLtrkZPE4577EMsyEy',
  },
  {
    id: 'deep-focus',
    label: { en: 'Deep Focus', he: 'Deep Focus' },
    tagline: { en: 'Focus, flow and creating without distraction.', he: 'ריכוז, זרימה ויצירה בלי הסחות.' },
    url: 'https://open.spotify.com/playlist/6jl4sbwFUWfJZy1o54PDEX',
  },
  {
    id: 'ground-me',
    label: { en: 'Ground Me', he: 'Ground Me' },
    tagline: { en: 'Slow the noise. Feel your feet. Come back to now.', he: 'להנמיך את הרעש. להרגיש את הקרקע. לחזור לעכשיו.' },
    url: 'https://open.spotify.com/playlist/3rs6StDiebOt206mb4WXQ5',
  },
  {
    id: 'ignite',
    label: { en: 'Ignite', he: 'Ignite' },
    tagline: { en: 'Drive. Desire. Forward motion.', he: 'דחף. תשוקה. תנועה קדימה.' },
    url: 'https://open.spotify.com/playlist/4Y3QkLNFRPuJ1cho9wHIDT',
  },
  {
    id: 'feel-it',
    label: { en: 'Feel It', he: 'Feel It' },
    tagline: { en: 'You don’t have to fix it. Feel it and land somewhere soft.', he: 'לא צריך לתקן. להרגיש, ולנחות במקום רך.' },
    url: 'https://open.spotify.com/playlist/2wYTKohcxi5ZOcj6xK3nOB',
  },
  {
    id: 'desire',
    label: { en: 'Desire — Body Edit', he: 'Desire — Body Edit' },
    tagline: { en: 'Drop out of thought and into sensation.', he: 'לצאת מהמחשבה ולהיכנס לתחושה.' },
    url: 'https://open.spotify.com/playlist/2FthO3ht6U9MMH1DJt5DCw',
  },
  {
    id: 'good-life',
    label: { en: 'Good Life', he: 'Good Life' },
    tagline: { en: 'Nothing to fix. Feel the life that is already here.', he: 'אין מה לתקן. להרגיש את החיים שכבר כאן.' },
    url: 'https://open.spotify.com/playlist/6qNEEOtE3gndB7U6EeTiBx',
  },
  {
    id: 'remember',
    label: { en: 'Remember', he: 'Remember' },
    tagline: { en: 'Come back to what you already know within.', he: 'לחזור אל מה שכבר ידוע לך מבפנים.' },
    url: 'https://open.spotify.com/playlist/66gtSqCtsupOKrMLkGquPB',
  },
]

/** The playlist id from a Spotify share link or `spotify:playlist:<id>` URI, or null if it isn't one. */
export function spotifyPlaylistId(url: string | null | undefined): string | null {
  if (!url) return null
  const match = url.match(/(?:open\.spotify\.com\/(?:intl-[a-z-]+\/)?playlist\/|spotify:playlist:)([A-Za-z0-9]{22})/)
  return match ? match[1] : null
}

/** Configured moods that have a usable Spotify link, with the parsed playlist id. */
export const FOCUS_MOODS = FOCUS_PLAYLISTS.flatMap((p) => {
  const spotifyId = spotifyPlaylistId(p.url)
  return spotifyId ? [{ ...p, spotifyId }] : []
})
