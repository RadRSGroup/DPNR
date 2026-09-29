import { useTranslations } from 'next-intl'

/**
 * Display names for the emotion palette (EMOTION_COLORS) and body areas
 * (BodyAreaSchema). The stored values stay the English ids, since they are
 * what rooms send to the backend and prompts and what placements key on;
 * only what's shown is translated. A person's own custom emotion has no
 * entry and is shown exactly as they wrote it.
 */
export function useFeltLabels() {
  const t = useTranslations('Felt')
  return {
    emotion: (label: string) => (t.has(`emotions.${label}`) ? t(`emotions.${label}`) : label),
    area: (area: string) => (t.has(`areas.${area}`) ? t(`areas.${area}`) : area),
    t,
  }
}
