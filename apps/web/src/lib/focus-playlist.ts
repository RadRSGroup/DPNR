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
  label: { en: string; he: string }
  url: string
}

export const FOCUS_PLAYLISTS: FocusPlaylist[] = [
  // { id: 'deep-work', label: { en: 'Deep Work', he: 'עבודה עמוקה' }, url: 'https://open.spotify.com/playlist/…' },
  // { id: 'calm', label: { en: 'Calm', he: 'רוגע' }, url: 'https://open.spotify.com/playlist/…' },
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
