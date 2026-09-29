import type { GenderIdentity, GuidanceCardItem } from '@dpnr/shared-types'
import type { Locale } from '../lib/locale'

/**
 * A Pull a Card question in the person's language: the founder's Hebrew
 * (feminine for `female`, masculine otherwise, the same fallback as
 * lib/locale.ts), or the English `text` when the card has no Hebrew yet.
 */
export function cardText(card: Pick<GuidanceCardItem, 'text' | 'textHe'>, locale: Locale, gender: GenderIdentity): string {
  if (locale !== 'he' || !card.textHe) return card.text
  return gender === 'female' ? card.textHe.female : card.textHe.male
}
