export type Tier = 'free' | 'core' | 'pro'

export type Lens = 'pros_cons' | 'fears_desires' | 'values_needs'

export type EmotionColor =
  | 'Anger' | 'Sadness' | 'Fear' | 'Uncertainty' | 'Excitement' | 'Calm'
  | 'Hope' | 'Joy' | 'Guilt' | 'Overwhelm' | 'Grief' | 'Anxiety'

export type TagType = 'pro' | 'con' | 'desire' | 'fear' | 'value' | 'need'

export interface DecisionOption {
  id?: string
  label: 'A' | 'B'
  content: string
  approved: boolean
}

export interface DecisionState {
  id?: string
  title: string
  subtitle?: string
  narrative: string
  optionA?: DecisionOption
  optionB?: DecisionOption
  emotionBodyLocation?: string
  emotionColor?: EmotionColor
  emotionReflection?: string
  lens?: Lens
  currentStep: number
}

export interface AIResponse<T = unknown> {
  result: T
  tokensUsed: number
  remaining: number
}

export const EMOTION_COLORS: { label: EmotionColor; color: string }[] = [
  { label: 'Anger',       color: '#ef4444' },
  { label: 'Sadness',     color: '#3b82f6' },
  { label: 'Fear',        color: '#a855f7' },
  { label: 'Uncertainty', color: '#f59e0b' },
  { label: 'Excitement',  color: '#10b981' },
  { label: 'Calm',        color: '#6366f1' },
  { label: 'Hope',        color: '#84cc16' },
  { label: 'Joy',         color: '#fcd34d' },
  { label: 'Guilt',       color: '#78716c' },
  { label: 'Overwhelm',   color: '#f97316' },
  { label: 'Grief',       color: '#94a3b8' },
  { label: 'Anxiety',     color: '#e879f9' },
]

export const BODY_LOCATIONS = [
  'Head', 'Throat', 'Chest', 'Stomach', 'Gut', 'Shoulders', 'Hands',
]

export const PRESET_TAGS: Record<TagType, string[]> = {
  pro: [
    'Growth', 'Learning', 'Stability', 'Recognition', 'Freedom',
    'Contribution', 'Security', 'Connection', 'Fulfilment', 'Clarity',
    'Meaning', 'Balance', 'Peace', 'Joy',
  ],
  con: [
    'Uncertainty', 'Risk', 'Sacrifice', 'Compromise', 'Distance',
    'Doubt', 'Overwhelm', 'Pressure', 'Loss of stability', 'Regret',
  ],
  desire: [
    'Expand & learn', 'Feel safe', 'Be seen', 'Feel free', 'Find peace',
    'Leave a mark', 'Feel truly seen', 'Belong', 'Reach my potential',
    'Be authentic', 'Feel loved', 'Have clarity',
  ],
  fear: [
    'Losing stability', 'Failing', 'Losing identity', 'Uncertainty',
    'Being left behind', 'Not being enough', 'Making the wrong choice',
    'Being hurt', 'Regret', 'Losing someone', 'Being alone',
  ],
  value: [
    'Integrity', 'Authenticity', 'Compassion', 'Courage', 'Loyalty',
    'Honesty', 'Respect', 'Responsibility', 'Creativity', 'Fairness',
    'Wisdom', 'Kindness', 'Patience', 'Humility',
  ],
  need: [
    'Certainty', 'Variety', 'Significance', 'Love & Connection',
    'Growth', 'Contribution',
  ],
}

export const STEP_LABELS: Record<number, string> = {
  1: 'Name the Decision',
  2: 'Map the Options',
  3: 'Body Emotion Mapping',
  4: 'Choose Your Lens',
  5: 'Deep Exploration',
  6: 'Values & Needs',
  7: 'Future Projection',
  9: 'Insight',
}

export const TOTAL_STEPS = 7
