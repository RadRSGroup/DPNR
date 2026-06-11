export const TIER_CAPS = {
  free: 15_000,
  core: 150_000,
  pro: 400_000,
} as const

export type Tier = keyof typeof TIER_CAPS
