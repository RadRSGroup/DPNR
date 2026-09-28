/**
 * Mirror Room pattern reference (founder feedback #33, Session 77).
 *
 * `meaning` is the founder's Appendix A ("Mirror Room Pattern Reference",
 * Drive "Mirror Room" folder) verbatim. Appendix A is reference only: these
 * are candidate lenses the person may browse and choose, NOT a backend
 * taxonomy — no pattern id is ever persisted. A choice travels only as the
 * Mirror entry's name + meaning with `patternSource: 'reference'`.
 *
 * `showsUp` ("How it may show up") is NOT in Appendix A. The lines below were
 * drafted by the agent in Session 77 (user-approved approach) and are
 * PENDING FOUNDER REVIEW. Keep them tentative ("You might notice…"), in the
 * second person, and never an identity statement.
 */
export interface ReferencePattern {
  name: string
  meaning: string
  showsUp: string
}

export const REFERENCE_PATTERNS: readonly ReferencePattern[] = [
  { name: 'People-Pleasing', meaning: "Prioritizing approval, harmony or another person's comfort over one's own needs, truth or boundaries.", showsUp: "You might notice it when a yes comes out before you've checked what you actually want." },
  { name: 'Avoidance', meaning: 'Pulling away, delaying, distracting or disengaging when something feels difficult, uncertain or exposing.', showsUp: 'You might notice it when a hard conversation, message or decision keeps sliding to later.' },
  { name: 'Over-Control', meaning: 'Trying to reduce uncertainty by tightly managing outcomes, timing, details, people or the environment.', showsUp: 'You might notice it when plans change and you feel a pull to take everything back into your own hands.' },
  { name: 'Perfectionism', meaning: "Rigid standards that can turn 'good enough' into something unsafe, incomplete or unacceptable.", showsUp: "You might notice it when something is finished but still doesn't feel safe to share." },
  { name: 'Over-Responsibility', meaning: 'Taking emotional or practical responsibility for things that may not fully belong to the user.', showsUp: "You might notice it when someone else's mood or problem starts to feel like yours to fix." },
  { name: 'Emotional Suppression', meaning: 'Minimizing, intellectualizing or pushing away feelings instead of allowing them to be noticed and processed.', showsUp: 'You might notice it when you explain a feeling away, or say "I\'m fine", before letting yourself feel it.' },
  { name: 'Conflict Avoidance', meaning: 'Avoiding disagreement or difficult conversations in order to preserve safety, harmony or acceptance.', showsUp: 'You might notice it when you swallow a disagreement to keep the peace.' },
  { name: 'Hyper-Independence', meaning: 'Reluctance to ask for help, rely on others or show need because dependence feels uncomfortable or unsafe.', showsUp: "You might notice it when help is offered and something in you says you'll manage alone." },
  { name: 'Reassurance Seeking', meaning: 'Repeatedly looking outside oneself for confirmation, approval or certainty when internal confidence feels unstable.', showsUp: "You might notice it when you check again, or ask again, to feel sure it's okay." },
  { name: 'Withdrawal', meaning: 'Becoming quiet, distant or unavailable when emotionally activated.', showsUp: 'You might notice it when you go quiet or slip away just as things become emotional.' },
  { name: 'Overthinking', meaning: 'Repeated analysis used to seek certainty, prevent mistakes or avoid emotional exposure.', showsUp: 'You might notice it when you replay a conversation, or run through every outcome, to feel ready.' },
  { name: 'Self-Abandonment', meaning: "Ignoring one's own needs, truth or limits to preserve connection or avoid rejection or conflict.", showsUp: 'You might notice it when your own need gets set aside so the connection stays smooth.' },
  { name: 'Fear-Based Procrastination', meaning: 'Delay driven by risk, exposure, possible failure, judgment or uncertainty.', showsUp: 'You might notice it when something that matters keeps waiting until it feels less risky.' },
  { name: 'Anger as Protection', meaning: 'Anger may sometimes appear alongside hurt, fear, powerlessness, shame or a boundary violation. Treat this as a possibility, never an assumed cause.', showsUp: 'You might notice it when anger arrives quickly, and something softer may be sitting underneath it.' },
  { name: 'Fixing / Rescuing', meaning: "Moving quickly to solve, manage or rescue others instead of staying with one's own experience and allowing shared responsibility.", showsUp: 'You might notice it when you jump in with solutions before staying with what you feel.' },
  { name: 'Testing / Pushing Away', meaning: 'Creating distance, conflict or tests to check whether another person will stay, care or respond.', showsUp: 'You might notice it when you create distance to see whether someone will come closer.' },
  { name: 'Over-Accommodation', meaning: 'Changing oneself excessively to fit an environment, relationship or expectation.', showsUp: 'You might notice it when you reshape yourself around what a room or a person seems to expect.' },
  { name: 'Freeze / Shutdown', meaning: 'Reduced access to words, action or decision-making when the system feels overwhelmed.', showsUp: 'You might notice it when words, choices or action suddenly feel out of reach.' },
  { name: 'Comparison', meaning: 'Using other people as the main reference point for worth, success, progress or identity.', showsUp: "You might notice it when someone else's progress changes how you feel about your own." },
  { name: 'Self-Criticism', meaning: 'Turning discomfort, mistakes or vulnerability into internal judgment or attack.', showsUp: 'You might notice it when a small mistake turns into a harsh voice inside.' },
  { name: 'Push-Pull / Approach-Avoidance', meaning: 'Wanting closeness, success or change while also pulling away when it becomes emotionally real.', showsUp: 'You might notice it when something you want comes closer and part of you starts to step back.' },
]

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, '')
}

/** The reference entry whose name matches a Twin signal's generated name, if any. */
export function findReferencePattern(name: string | undefined): ReferencePattern | undefined {
  if (!name) return undefined
  const key = normalize(name)
  return REFERENCE_PATTERNS.find((p) => normalize(p.name) === key)
}
