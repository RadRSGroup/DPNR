/**
 * Companion "Pull a Card" library seed data — Session 42's own first draft,
 * written in the same warm/tentative/non-diagnostic voice already
 * established for Mirror Room's/Library's authored content, in the spirit
 * of the reference screen's own example card ("What is the easiest for me
 * to give to others and the hardest for me to give to myself?"). **Flagged
 * for product review, not treated as final** — same status every other
 * net-new content set in this project carries before user sign-off. The
 * user has said real card-back art/style references are coming later;
 * every card below points at the existing `companion/pull-a-card.webp`
 * placeholder until then.
 */
export interface GuidanceCardSeed {
  cardId: string
  text: string
}

export const GUIDANCE_CARD_SEEDS: GuidanceCardSeed[] = [
  { cardId: 'easiest-to-give', text: 'What is the easiest thing for you to give to others — and the hardest to give to yourself?' },
  { cardId: 'comfort-or-honesty', text: 'Where in your life are you choosing comfort over honesty, right now?' },
  { cardId: 'not-yours-to-carry', text: "What's one thing you're carrying today that isn't actually yours to carry?" },
  { cardId: 'loudest-voice', text: "Whose voice is loudest in your head when you're making a hard decision — and is it actually yours?" },
  { cardId: 'repeating-pattern', text: "What's a pattern you keep repeating, even though you already know how it ends?" },
  { cardId: 'permission-to-change', text: "What would you do differently today if you trusted you're allowed to change your mind tomorrow?" },
  { cardId: 'afraid-theyd-see', text: "What are you most afraid people would think if they saw exactly how you feel right now?" },
  { cardId: 'letter-from-a-year', text: 'If the version of you a year from now could send one sentence back, what might it say?' },
]
