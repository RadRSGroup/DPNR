import type { EncryptedBlob, TranslatedContent } from '@dpnr/shared-types'
import type { SessionCrypto } from './session-crypto'
import type { Locale } from './locale'

/**
 * AI-written items (Daily Card, Weekly Recap, Life Domain summaries, the
 * Roadmap, Twin signals) are stored in the language they were written in.
 * After a language switch the relocalize worker (account/relocalize.ts)
 * stores a translated copy in `translated`; readers show whichever matches
 * the screen.
 *
 * Each field's language is detected, not stored: nothing written before
 * 2026-09-29 records its language, and the app has exactly two, one of
 * which uses its own script. Text with any Hebrew letter is Hebrew.
 */
const HEBREW_LETTER = /[א-ת]/

export function textLanguage(value: unknown): Locale {
  const texts: string[] = []
  const collect = (v: unknown) => {
    if (typeof v === 'string') texts.push(v)
    else if (Array.isArray(v)) v.forEach(collect)
    else if (v && typeof v === 'object') Object.values(v).forEach(collect)
  }
  collect(value)
  return texts.some((t) => HEBREW_LETTER.test(t)) ? 'he' : 'en'
}

/**
 * The item's content in `locale` when a translation exists, otherwise the
 * original. The translation holds only the text fields, so non-text fields
 * (a card's `kind`, the Roadmap's `suggestedSpaces`) always come from the
 * original.
 */
export async function readLocalized<T extends object>(
  crypto: SessionCrypto,
  item: { content: EncryptedBlob; translated?: TranslatedContent },
  locale: Locale
): Promise<T> {
  const original = await crypto.decryptField<T>(item.content)
  // The translation holds only the fields that were not already in its
  // language (lib/relocalize.ts), so it always applies when it matches.
  if (item.translated?.lang !== locale) return original
  try {
    const translated = await crypto.decryptField<Partial<T>>(item.translated.content)
    return { ...original, ...translated }
  } catch {
    // An unreadable translation is not worth failing the read over.
    return original
  }
}
