export type Tier = 'free' | 'core' | 'pro'

export type Lens = 'pros_cons' | 'fears_desires' | 'values_needs'

export type EmotionColor =
  | 'Anger' | 'Sadness' | 'Fear' | 'Uncertainty' | 'Excitement' | 'Calm'

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
]

export const BODY_LOCATIONS = [
  'Head', 'Throat', 'Chest', 'Stomach', 'Gut', 'Shoulders', 'Hands',
]

export const PRESET_TAGS: Record<TagType, string[]> = {
  pro: [
    'Growth', 'Learning', 'Stability', 'Recognition', 'Freedom',
    'Contribution', 'Security', 'Connection', 'Higher salary',
    'Leadership', 'Career growth', 'Autonomy',
  ],
  con: [
    'Uncertainty', 'Lower salary', 'No Growth', 'New pressure',
    'Higher expectations', 'Losing stability', 'Less security',
    'Long hours', 'Risk',
  ],
  desire: [
    'Grow professionally', 'Lead projects', 'Be recognised',
    'Feel secure', 'Progress', 'Reach my potential', 'Make an impact',
  ],
  fear: [
    'Losing stability', 'Failing', 'Losing identity', 'Uncertainty',
    'Left behind', 'Not good enough', 'Making the wrong call',
  ],
  value: [
    'Growth', 'Learning', 'Stability', 'Recognition', 'Freedom',
    'Contribution', 'Security', 'Connection', 'Professionalism', 'Integrity',
  ],
  need: [
    'Certainty', 'Variety', 'Significance', 'Love & Connection', 'Growth', 'Contribution',
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
}

export const TOTAL_STEPS = 7
