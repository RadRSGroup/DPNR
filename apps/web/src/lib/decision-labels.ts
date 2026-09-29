import { useTranslations } from 'next-intl'

/**
 * Display names for the Decision Room's preset chips (PRESET_TAGS in
 * lib/types.ts) and the Clarity to Action body feelings. The stored values
 * stay the English ids, since they are what the room sends to the backend
 * and prompts; only what's shown is translated (same approach as
 * lib/felt-labels.ts). An AI suggestion or a person's own tag has no entry
 * and is shown exactly as written.
 */
export function useDecisionLabels() {
  const t = useTranslations('DecisionRoom')
  return {
    /** `type` is the tag kind: pro, con, desire, fear, value or need. */
    tag: (type: string, label: string) => (t.has(`tags.${type}.${label}`) ? t(`tags.${type}.${label}`) : label),
    bodyFeeling: (label: string) => (t.has(`bodyFeelings.${label}`) ? t(`bodyFeelings.${label}`) : label),
    t,
  }
}
