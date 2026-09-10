/**
 * Content Library catalog seed data -- v2, replacing the original 6-topic
 * catalog wholesale. Source: `docs/DPNR_Content_Library_Master_Architecture_and_Complete_Content_v2.pdf`
 * ("Content Library Master Architecture, Complete Catalog & Model Guide"),
 * a founder-authored document, not Claude-drafted content -- unlike every
 * earlier seed batch in this file's history, these 54 topics' prose is
 * transcribed from that PDF (Part I's catalog metadata + Part II's full
 * per-topic learning-unit text), not written by an agent, and therefore
 * does NOT carry the "flagged for product review, not treated as final"
 * status every earlier authored batch here needed -- the founder document
 * IS the review.
 *
 * Extracted programmatically (PyMuPDF text extraction + a Python parser
 * matching each of Part I's 54 catalog entries as an anchor into Part II's
 * content, not retyped by hand) to avoid transcription drift from a
 * 61-page source. Slugs are derived from title (kebab-case); `relatedTopics`
 * resolves the source's own free-text cross-references against the real
 * catalog (a shorthand like "Triggers" resolves to "Emotional Triggers", a
 * genuine non-topic reference like "Practice" or "Growth tracking" -- the
 * source's own related-topics list conflates a couple of product concepts
 * with topic titles -- is dropped rather than guessed).
 *
 * Retires the prior 6-topic catalog (`understanding-your-patterns`,
 * `what-triggers-you`, `values-vs-needs`, `body-awareness-basics`,
 * `finding-your-direction`, `why-commitments-dont-stick`) in favor of this
 * set -- several overlapped conceptually with a more precise, better-
 * structured equivalent here (e.g. the old combined "Values vs. Needs"
 * topic vs. this set's separate `Values` and `Needs vs. Neediness`) and the
 * founder document is now the canonical source. `seed-library-catalog.ts`
 * marks the old 6 `status: 'retired'` rather than deleting their DynamoDB
 * items outright.
 *
 * `lifeDomains` values are normalized to Part I's own canonical 11-domain
 * list (the source catalog map is inconsistent about this — "Self" and
 * "Work" appear alongside the canonical "Self & Identity"/"Work & Career"
 * for different topics; a handful of non-domain tokens the source uses
 * loosely as if they were domains — "Decisions", "Time", "Life",
 * "Life transitions" — are dropped rather than force-mapped, since every
 * topic using one keeps at least one other real domain).
 *
 * Two source concepts intentionally have no seed field yet: "Possible
 * Roots" (this doc's Learning Unit has no equivalent section -- stays
 * undefined per every consumer's existing honest-empty-section handling)
 * and per-topic `recommendedRooms` room routing (the source's own "GO
 * DEEPER WITH DPNR" text is prose guidance, not a fixed room enum -- stored
 * as `goDeeperGuidance` instead of force-fitting it into `recommendedRooms`,
 * which stays unset for every topic in this batch).
 */
export interface TopicSeedV2 {
  slug: string
  title: string
  exploreTheme: 'ME' | 'FEEL' | 'PATTERNS' | 'NEED' | 'RELATE' | 'REPAIR' | 'BODY' | 'CHOOSE' | 'CREATE' | 'LIFE'
  lifeDomains: string[]
  level: 'Foundation' | 'Intermediate' | 'Deep Dive'
  contentType: string[]
  relatedTopics: string[]
  body: string
  expandTheLens: string
  howItMayShowUp: string[]
  reflectionQuestions: string[]
  waysToWorkWithIt: string[]
  goDeeperGuidance: string[]
}

export const RETIRED_TOPIC_SLUGS = [
  'understanding-your-patterns',
  'what-triggers-you',
  'values-vs-needs',
  'body-awareness-basics',
  'finding-your-direction',
  'why-commitments-dont-stick',
]

export const LIBRARY_TOPIC_SEEDS_V2: TopicSeedV2[] = [
  {
    slug: `identity-vs-roles`,
    title: `Identity vs. Roles`,
    exploreTheme: 'ME',
    lifeDomains: [
      `Self & Identity`,
    ],
    level: 'Foundation',
    contentType: [
      `Distinction`,
    ],
    relatedTopics: [
      `self-worth-vs-performance`,
      `authenticity`,
      `future-self`,
    ],
    body: `Identity is your evolving sense of who you are. Roles are the positions you hold - parent, partner, founder, employee, child, caregiver, friend. Roles matter, but they are not the whole self.`,
    expandTheLens: `A person can become over-identified with one role. When that role changes, they may feel lost. A healthier identity can hold multiple roles while preserving a sense of self underneath them.`,
    howItMayShowUp: [
      `You feel valuable mainly when you are useful to others.`,
      `A work setback makes you question who you are, not only what happened.`,
      `You struggle to answer who you are without listing roles or achievements.`,
    ],
    reflectionQuestions: [
      `Who are you when no role needs to be performed?`,
    ],
    waysToWorkWithIt: [
      `Write three sentences beginning with: “I am someone who…” without naming a role, title, relationship, or achievement.`,
    ],
    goDeeperGuidance: [
      `Explore which roles currently carry too much of the user's identity and what qualities remain stable across contexts.`,
    ],
  },
  {
    slug: `self-worth-vs-performance`,
    title: `Self-Worth vs. Performance`,
    exploreTheme: 'ME',
    lifeDomains: [
      `Self & Identity`,
      `Work & Career`,
    ],
    level: 'Foundation',
    contentType: [
      `Concept`,
    ],
    relatedTopics: [
      `inner-critic`,
      `ambition`,
      `success-and-enough`,
    ],
    body: `Self-worth is the sense that you have value as a person. Performance is what you do and how well you do it. They influence each other, but they are not the same thing.`,
    expandTheLens: `When worth becomes fused with achievement, praise, money, beauty, productivity, or being needed, every setback can feel personal. Healthy ambition does not require turning every outcome into a verdict on the self.`,
    howItMayShowUp: [
      `A small mistake feels like proof that you are not good enough.`,
      `You relax only after you have “earned” it.`,
      `Praise gives a high, criticism creates a crash.`,
    ],
    reflectionQuestions: [
      `Where do you most often turn an outcome into a judgment about yourself?`,
    ],
    waysToWorkWithIt: [
      `Choose one recent outcome. Separate it into two columns: “What happened” and “What I made it mean about me.”`,
    ],
    goDeeperGuidance: [
      `Help the user identify domains where worth is conditional and distinguish useful feedback from identity-level conclusions.`,
    ],
  },
  {
    slug: `self-trust`,
    title: `Self-Trust`,
    exploreTheme: 'ME',
    lifeDomains: [
      `Self & Identity`,
    ],
    level: 'Foundation',
    contentType: [
      `Concept`,
    ],
    relatedTopics: [
      `decision-making`,
      `authenticity`,
      `future-self`,
    ],
    body: `Self-trust is confidence that you can listen to yourself, make decisions, respond to consequences, and repair when needed. It is not the belief that you will always be right.`,
    expandTheLens: `Self-trust grows through evidence: noticing your signals, making choices, keeping small promises, learning from mistakes, and recovering after uncertainty.`,
    howItMayShowUp: [
      `You ask many people for advice but feel more confused afterward.`,
      `You know what you want but keep looking for permission.`,
      `You distrust your reaction because you have been wrong before.`,
    ],
    reflectionQuestions: [
      `Where do you already know more than you are allowing yourself to trust?`,
    ],
    waysToWorkWithIt: [
      `Make one small decision today without polling anyone else. Notice what made it easier or harder.`,
    ],
    goDeeperGuidance: [
      `Explore whether the user needs more information, more time, or simply more permission to trust an already clear preference.`,
    ],
  },
  {
    slug: `authenticity`,
    title: `Authenticity`,
    exploreTheme: 'ME',
    lifeDomains: [
      `Self & Identity`,
      `Relationships & Love`,
      `Work & Career`,
    ],
    level: 'Foundation',
    contentType: [
      `Concept`,
    ],
    relatedTopics: [
      `values`,
      `boundaries`,
      `self-trust`,
    ],
    body: `Authenticity is the ability to act in ways that feel congruent with your values, feelings, needs, and reality. It does not mean saying everything to everyone or never adapting socially.`,
    expandTheLens: `Authenticity requires both self-awareness and discernment. Privacy is not inauthenticity. Flexibility is not self-betrayal. The question is whether adaptation costs you your core truth.`,
    howItMayShowUp: [
      `You become a different version of yourself around certain people.`,
      `You say what is expected and feel resentful later.`,
      `You hide preferences because you fear being difficult.`,
    ],
    reflectionQuestions: [
      `Where in your life do you feel most edited?`,
    ],
    waysToWorkWithIt: [
      `Choose one small preference you normally suppress and express it clearly this week.`,
    ],
    goDeeperGuidance: [
      `Help distinguish healthy social flexibility from chronic self-silencing.`,
    ],
  },
  {
    slug: `inner-critic`,
    title: `Inner Critic`,
    exploreTheme: 'ME',
    lifeDomains: [
      `Self & Identity`,
      `Work & Career`,
      `Emotional Well-Being`,
    ],
    level: 'Foundation',
    contentType: [
      `Concept`,
    ],
    relatedTopics: [
      `self-compassion`,
      `perfectionism`,
      `shame-vs-guilt`,
    ],
    body: `The inner critic is the internal voice that monitors, judges, warns, compares, or pushes. It often tries to protect against failure, rejection, shame, or loss of control, even when its tone becomes harsh.`,
    expandTheLens: `Useful self-evaluation is specific and actionable. The inner critic tends to be global: “You always fail,” “You are too much,” “You should know better.” The goal is not to eliminate it, but to relate to it differently.`,
    howItMayShowUp: [
      `You replay mistakes long after they are useful to review.`,
      `Your standards rise every time you meet them.`,
      `You speak to yourself in ways you would never speak to someone you love.`,
    ],
    reflectionQuestions: [
      `What is your inner critic trying to prevent?`,
    ],
    waysToWorkWithIt: [
      `Rewrite one critical sentence as specific information: from “I am a failure” to “I am disappointed with how I handled X, and I want to change Y.”`,
    ],
    goDeeperGuidance: [
      `Identify triggers, protective intent, and a more effective internal response without romanticizing the critic.`,
    ],
  },
  {
    slug: `emotion-vs-reaction`,
    title: `Emotion vs. Reaction`,
    exploreTheme: 'FEEL',
    lifeDomains: [
      `Emotional Well-Being`,
      `Relationships & Love`,
    ],
    level: 'Foundation',
    contentType: [
      `Concept`,
      `Skill`,
    ],
    relatedTopics: [
      `emotional-regulation`,
      `emotional-triggers`,
      `body-signals`,
    ],
    body: `An emotion is an internal experience. A reaction is what you do next. Anger is not shouting. Fear is not avoidance. Sadness is not withdrawal. Separating feeling from behavior creates choice.`,
    expandTheLens: `Emotions carry information, but they are not always instructions. A feeling can be valid even when the first impulse it creates is not useful.`,
    howItMayShowUp: [
      `You feel rejected and immediately send multiple messages.`,
      `You feel anxious and cancel something important.`,
      `You feel angry and decide the other person must be wrong.`,
    ],
    reflectionQuestions: [
      `What are you feeling, and what are you doing because of that feeling?`,
    ],
    waysToWorkWithIt: [
      `Name the feeling. Then wait ten minutes before acting on the first impulse. Ask: “What response would still make sense tomorrow?”`,
    ],
    goDeeperGuidance: [
      `Help the user separate emotion, interpretation, impulse, and chosen behavior.`,
    ],
  },
  {
    slug: `emotional-triggers`,
    title: `Emotional Triggers`,
    exploreTheme: 'FEEL',
    lifeDomains: [
      `Self & Identity`,
      `Relationships & Love`,
      `Family`,
      `Friends & Social Connection`,
      `Work & Career`,
      `Money & Financial Life`,
      `Body & Health`,
      `Emotional Well-Being`,
      `Personal Growth`,
      `Leisure & Joy`,
      `Purpose & Spiritual Meaning`,
    ],
    level: 'Foundation',
    contentType: [
      `Concept`,
      `Skill`,
    ],
    relatedTopics: [
      `emotion-vs-reaction`,
      `body-signals`,
      `attachment-styles-overview`,
    ],
    body: `A trigger is something that activates a stronger emotional response than the present event alone seems to explain. Triggers can connect to past experiences, expectations, values, fears, or unresolved meanings.`,
    expandTheLens: `Not every strong reaction is trauma. Sometimes the present situation really matters. The useful question is whether the intensity belongs entirely to now or whether older learning is adding volume.`,
    howItMayShowUp: [
      `A delayed reply feels like abandonment.`,
      `A colleague's tone creates a disproportionate sense of humiliation.`,
      `A small change of plan creates intense anxiety.`,
    ],
    reflectionQuestions: [
      `What happened - and what did your system immediately believe it meant?`,
    ],
    waysToWorkWithIt: [
      `Write: event -> meaning -> feeling -> impulse. Then add one alternative meaning that is also plausible.`,
    ],
    goDeeperGuidance: [
      `Explore repeated trigger themes, especially rejection, criticism, uncertainty, control, exclusion, and disappointment.`,
    ],
  },
  {
    slug: `emotional-regulation`,
    title: `Emotional Regulation`,
    exploreTheme: 'FEEL',
    lifeDomains: [
      `Emotional Well-Being`,
      `Body & Health`,
    ],
    level: 'Foundation',
    contentType: [
      `Concept`,
      `Skill`,
    ],
    relatedTopics: [
      `window-of-tolerance`,
      `body-signals`,
      `rest-recovery-and-depletion`,
    ],
    body: `Emotional regulation is the ability to stay in contact with an emotion while helping the nervous system return to a workable range. It is not suppression, positivity, or never becoming overwhelmed.`,
    expandTheLens: `Regulation can involve breath, movement, naming, time, sensory grounding, co-regulation, boundaries, sleep, food, or simply reducing stimulation. Different states need different tools.`,
    howItMayShowUp: [
      `You cannot think clearly during conflict.`,
      `You try to reason with yourself while your body is highly activated.`,
      `You use distraction for every uncomfortable emotion.`,
    ],
    reflectionQuestions: [
      `What does your body need before your mind can solve this?`,
    ],
    waysToWorkWithIt: [
      `Choose one regulation tool: slower exhale, short walk, cold water on hands, quiet, stretching, or contacting a safe person. Reassess after five minutes.`,
    ],
    goDeeperGuidance: [
      `Match regulation tools to the user's actual state instead of giving generic calming advice.`,
    ],
  },
  {
    slug: `anger`,
    title: `Anger`,
    exploreTheme: 'FEEL',
    lifeDomains: [
      `Relationships & Love`,
      `Family`,
      `Work & Career`,
    ],
    level: 'Foundation',
    contentType: [
      `Concept`,
      `Skill`,
    ],
    relatedTopics: [
      `boundaries`,
      `emotional-regulation`,
      `conflict-and-repair`,
    ],
    body: `Anger often appears when something feels unfair, threatening, blocked, intrusive, or disrespectful. It can protect boundaries and mobilize action.`,
    expandTheLens: `Anger may sit on top of hurt, fear, shame, helplessness, or exhaustion - but not always. Sometimes anger is simply anger. The task is to understand what it is protecting and how to express it responsibly.`,
    howItMayShowUp: [
      `You become angry after repeatedly saying yes when you meant no.`,
      `You feel rage when you are not taken seriously.`,
      `You stay “calm” for weeks and then explode.`,
    ],
    reflectionQuestions: [
      `What does your anger want protected, changed, or acknowledged?`,
    ],
    waysToWorkWithIt: [
      `Complete: “I am angry because ____. What matters to me here is ____.”`,
    ],
    goDeeperGuidance: [
      `Explore boundary violations, unmet expectations, accumulated resentment, and constructive expression.`,
    ],
  },
  {
    slug: `shame-vs-guilt`,
    title: `Shame vs. Guilt`,
    exploreTheme: 'FEEL',
    lifeDomains: [
      `Self & Identity`,
      `Relationships & Love`,
    ],
    level: 'Intermediate',
    contentType: [
      `Concept`,
      `Skill`,
    ],
    relatedTopics: [
      `self-compassion`,
      `forgiveness`,
      `inner-critic`,
    ],
    body: `Guilt says: “I did something I regret.” Shame says: “There is something wrong with me.” Guilt can guide repair. Shame often pushes hiding, collapse, defensiveness, or self-attack.`,
    expandTheLens: `Healthy responsibility does not require identity-level condemnation. A person can face harm honestly while preserving the possibility of learning and repair.`,
    howItMayShowUp: [
      `You avoid apologizing because admitting the mistake feels unbearable.`,
      `You keep punishing yourself long after you have taken responsibility.`,
      `Criticism makes you want to disappear rather than improve.`,
    ],
    reflectionQuestions: [
      `Are you judging what you did, or who you are?`,
    ],
    waysToWorkWithIt: [
      `Write one sentence of responsibility and one sentence of humanity: “I regret ____. I am still a person capable of repair.”`,
    ],
    goDeeperGuidance: [
      `Help separate accountability from self-erasure and identify whether shame is blocking repair.`,
    ],
  },
  {
    slug: `grief-and-letting-go`,
    title: `Grief & Letting Go`,
    exploreTheme: 'FEEL',
    lifeDomains: [
      `Relationships & Love`,
      `Family`,
    ],
    level: 'Foundation',
    contentType: [
      `Concept`,
      `Skill`,
    ],
    relatedTopics: [
      `forgiveness`,
      `meaning-vs-happiness`,
      `integration`,
    ],
    body: `Grief is the process of adapting to loss. The loss may be a person, relationship, identity, dream, role, future, or version of life that will not happen as imagined.`,
    expandTheLens: `Letting go is not forgetting, approving, or no longer caring. It is gradually reducing the demand that reality be different from what it is.`,
    howItMayShowUp: [
      `You miss not only the person but the future you imagined.`,
      `A career change feels like losing part of your identity.`,
      `You keep revisiting the same “what if” because the ending feels unfinished.`,
    ],
    reflectionQuestions: [
      `What exactly are you grieving - the reality, the person, the role, or the future you imagined?`,
    ],
    waysToWorkWithIt: [
      `Name the loss in one sentence and the part of life that still remains available to you.`,
    ],
    goDeeperGuidance: [
      `Explore ambiguous loss, identity loss, unfinished meaning, and the difference between remembering and remaining stuck.`,
    ],
  },
  {
    slug: `avoidance`,
    title: `Avoidance`,
    exploreTheme: 'PATTERNS',
    lifeDomains: [
      `Self & Identity`,
      `Relationships & Love`,
      `Family`,
      `Friends & Social Connection`,
      `Work & Career`,
      `Money & Financial Life`,
      `Body & Health`,
      `Emotional Well-Being`,
      `Personal Growth`,
      `Leisure & Joy`,
      `Purpose & Spiritual Meaning`,
    ],
    level: 'Foundation',
    contentType: [
      `Pattern`,
    ],
    relatedTopics: [
      `procrastination`,
      `fear-vs-desire-in-decisions`,
      `emotional-regulation`,
    ],
    body: `Avoidance is moving away from discomfort, uncertainty, conflict, emotion, or effort. It can be protective in the short term and costly when it repeatedly blocks important action.`,
    expandTheLens: `Avoidance can look active: overworking, joking, scrolling, helping others, planning endlessly, staying busy, intellectualizing, or changing the subject.`,
    howItMayShowUp: [
      `You delay a conversation even though the tension keeps growing.`,
      `You research for weeks instead of deciding.`,
      `You keep busy so you do not have to feel.`,
    ],
    reflectionQuestions: [
      `What discomfort are you trying not to experience?`,
    ],
    waysToWorkWithIt: [
      `Choose the smallest version of the avoided action and do it for five minutes.`,
    ],
    goDeeperGuidance: [
      `Distinguish healthy pacing from chronic avoidance; identify the feared feeling or outcome underneath.`,
    ],
  },
  {
    slug: `people-pleasing`,
    title: `People-Pleasing`,
    exploreTheme: 'PATTERNS',
    lifeDomains: [
      `Relationships & Love`,
      `Family`,
      `Work & Career`,
    ],
    level: 'Foundation',
    contentType: [
      `Pattern`,
    ],
    relatedTopics: [
      `boundaries`,
      `needs-vs-neediness`,
      `assertiveness`,
    ],
    body: `People-pleasing is prioritizing approval, harmony, or others' comfort so strongly that your own truth becomes secondary. Kindness and generosity are not the same as people-pleasing.`,
    expandTheLens: `The clue is often the cost: resentment, exhaustion, self-silencing, or saying yes from fear rather than choice.`,
    howItMayShowUp: [
      `You agree quickly and regret it later.`,
      `You scan the room for how everyone feels before checking yourself.`,
      `You soften every boundary so no one can be disappointed.`,
    ],
    reflectionQuestions: [
      `If you knew no one would be upset, what would you choose?`,
    ],
    waysToWorkWithIt: [
      `Before your next yes, pause and ask: “Would I still choose this if approval were guaranteed either way?”`,
    ],
    goDeeperGuidance: [
      `Explore fear of rejection, conflict, disapproval, or being seen as selfish.`,
    ],
  },
  {
    slug: `perfectionism`,
    title: `Perfectionism`,
    exploreTheme: 'PATTERNS',
    lifeDomains: [
      `Work & Career`,
      `Self & Identity`,
      `Personal Growth`,
    ],
    level: 'Foundation',
    contentType: [
      `Pattern`,
    ],
    relatedTopics: [
      `inner-critic`,
      `procrastination`,
      `self-worth-vs-performance`,
    ],
    body: `Perfectionism is not simply high standards. It is when mistakes, uncertainty, or “good enough” feel threatening to identity, safety, belonging, or control.`,
    expandTheLens: `It can create procrastination, overwork, rigidity, difficulty delegating, chronic dissatisfaction, or never finishing.`,
    howItMayShowUp: [
      `You delay sharing work until it is flawless.`,
      `You achieve something and immediately focus on what could be better.`,
      `You avoid trying because you may not excel.`,
    ],
    reflectionQuestions: [
      `What do you believe a mistake would say about you?`,
    ],
    waysToWorkWithIt: [
      `Define a “good enough” version before starting. Stop when you reach it.`,
    ],
    goDeeperGuidance: [
      `Explore whether perfectionism protects from criticism, shame, uncertainty, or loss of control.`,
    ],
  },
  {
    slug: `control`,
    title: `Control`,
    exploreTheme: 'PATTERNS',
    lifeDomains: [
      `Relationships & Love`,
      `Work & Career`,
      `Family`,
    ],
    level: 'Foundation',
    contentType: [
      `Pattern`,
    ],
    relatedTopics: [
      `self-trust`,
      `decision-making`,
      `emotional-regulation`,
    ],
    body: `Control is the effort to reduce uncertainty by managing outcomes, people, information, or timing. Some control is useful; over-control can create rigidity and anxiety.`,
    expandTheLens: `The opposite of control is not passivity. It is distinguishing what is yours to influence from what is not yours to command.`,
    howItMayShowUp: [
      `You struggle when plans change unexpectedly.`,
      `You repeat instructions because trusting others feels risky.`,
      `You feel responsible for preventing everyone's disappointment.`,
    ],
    reflectionQuestions: [
      `What are you trying to guarantee that cannot actually be guaranteed?`,
    ],
    waysToWorkWithIt: [
      `Make two lists: “I can influence” and “I cannot control.” Put today's concern in the correct column.`,
    ],
    goDeeperGuidance: [
      `Help the user identify useful action versus attempts to eliminate uncertainty.`,
    ],
  },
  {
    slug: `overthinking-and-rumination`,
    title: `Overthinking & Rumination`,
    exploreTheme: 'PATTERNS',
    lifeDomains: [
      `Self & Identity`,
      `Work & Career`,
      `Relationships & Love`,
    ],
    level: 'Foundation',
    contentType: [
      `Pattern`,
    ],
    relatedTopics: [
      `decision-making`,
      `emotional-regulation`,
      `control`,
    ],
    body: `Overthinking is repeated mental processing that feels productive but often does not create new information or action. Rumination is repetitive thinking around distress, mistakes, or unresolved meaning.`,
    expandTheLens: `The key distinction is movement. Reflection clarifies. Rumination circles.`,
    howItMayShowUp: [
      `You replay a conversation looking for the perfect interpretation.`,
      `You keep asking the same question in different forms.`,
      `Thinking increases anxiety but not clarity.`,
    ],
    reflectionQuestions: [
      `Has this thinking produced any new information in the last ten minutes?`,
    ],
    waysToWorkWithIt: [
      `Write the question once. Under it, write either the next action or “no action available yet.” Then stop processing for a set period.`,
    ],
    goDeeperGuidance: [
      `Identify whether the user needs data, action, acceptance, or regulation - not more analysis.`,
    ],
  },
  {
    slug: `procrastination`,
    title: `Procrastination`,
    exploreTheme: 'PATTERNS',
    lifeDomains: [
      `Work & Career`,
      `Personal Growth`,
      `Self & Identity`,
    ],
    level: 'Foundation',
    contentType: [
      `Pattern`,
    ],
    relatedTopics: [
      `avoidance`,
      `perfectionism`,
      `decision-making`,
    ],
    body: `Procrastination is delaying an intended action even when delay creates cost. It is often less about laziness and more about emotion, ambiguity, overwhelm, perfectionism, low reward, or fear of evaluation.`,
    expandTheLens: `Different causes need different solutions. A vague task needs clarity. An overwhelming task needs reduction. A feared task may need emotional support. A meaningless task may need motivation or redesign.`,
    howItMayShowUp: [
      `You do small tasks to avoid the important one.`,
      `You wait for the “right mood” to begin.`,
      `You repeatedly underestimate how emotionally hard the task feels.`,
    ],
    reflectionQuestions: [
      `What feeling appears when you imagine starting?`,
    ],
    waysToWorkWithIt: [
      `Reduce the task to a two-minute entry step and begin before negotiating with yourself.`,
    ],
    goDeeperGuidance: [
      `Classify the likely driver: ambiguity, perfectionism, fear, boredom, low energy, resentment, or overload.`,
    ],
  },
  {
    slug: `needs-vs-neediness`,
    title: `Needs vs. Neediness`,
    exploreTheme: 'NEED',
    lifeDomains: [
      `Relationships & Love`,
      `Self & Identity`,
    ],
    level: 'Foundation',
    contentType: [
      `Concept`,
      `Distinction`,
    ],
    relatedTopics: [
      `six-broad-human-needs`,
      `boundaries`,
      `attachment-styles-overview`,
    ],
    body: `A need is a legitimate human requirement or inner drive - such as safety, connection, autonomy, rest, meaning, recognition, or growth. Neediness is not “having needs.” It is when a need becomes fused with urgency, fear, or the belief that only one specific person or outcome can regulate your sense of safety or worth.`,
    expandTheLens: `The distinction is flexibility. A healthy need can be named, negotiated, and met in more than one way. Neediness often sounds like: “I need this exact response now or I cannot be okay.” The goal is not independence from others; healthy humans are interdependent.`,
    howItMayShowUp: [
      `Need: “I need reassurance after a hard conversation.” Neediness: “If they do not reassure me immediately, it means I am unlovable.”`,
      `Need: “I need closeness.” Neediness: “Only this person can make me feel whole.”`,
      `Need: “I need recognition at work.” Neediness: “If my manager does not praise me, my work has no value.”`,
    ],
    reflectionQuestions: [
      `What is the real need - and have you attached it to only one possible source?`,
    ],
    waysToWorkWithIt: [
      `Name the need, then list three different ways it could be supported: by you, by another person, and by your environment or routine.`,
    ],
    goDeeperGuidance: [
      `Help the user normalize the need while widening the range of ways it can be met.`,
    ],
  },
  {
    slug: `six-broad-human-needs`,
    title: `Six Broad Human Needs`,
    exploreTheme: 'NEED',
    lifeDomains: [
      `Self & Identity`,
      `Relationships & Love`,
      `Family`,
      `Friends & Social Connection`,
      `Work & Career`,
      `Money & Financial Life`,
      `Body & Health`,
      `Emotional Well-Being`,
      `Personal Growth`,
      `Leisure & Joy`,
      `Purpose & Spiritual Meaning`,
    ],
    level: 'Foundation',
    contentType: [
      `Concept`,
      `Distinction`,
    ],
    relatedTopics: [
      `basic-everyday-needs`,
      `values`,
      `competing-needs`,
    ],
    body: `One useful map groups human motivation into six broad needs: certainty, variety, significance, love/connection, growth, and contribution. This is not the only valid model, but it is a practical lens for noticing what drives behavior.`,
    expandTheLens: `CERTAINTY: safety, stability, predictability. VARIETY: novelty, movement, stimulation. SIGNIFICANCE: feeling valued, unique, important. LOVE/CONNECTION: belonging, closeness, intimacy. GROWTH: learning and expanding. CONTRIBUTION: giving beyond the self and creating value.`,
    howItMayShowUp: [
      `A person may stay in an unfulfilling job because certainty is currently stronger than growth.`,
      `Someone may create constant drama because variety feels more tolerable than calm.`,
      `Achievement may meet significance but leave connection underfed.`,
    ],
    reflectionQuestions: [
      `Which two needs seem strongest in your life right now?`,
    ],
    waysToWorkWithIt: [
      `Choose one recent decision and ask which need it served most strongly. Then ask which need may have been neglected.`,
    ],
    goDeeperGuidance: [
      `Explore conflicts between needs and whether the current strategy for meeting a need is healthy, costly, or outdated.`,
    ],
  },
  {
    slug: `basic-everyday-needs`,
    title: `Basic Everyday Needs`,
    exploreTheme: 'NEED',
    lifeDomains: [
      `Body & Health`,
      `Emotional Well-Being`,
    ],
    level: 'Foundation',
    contentType: [
      `Concept`,
      `Distinction`,
    ],
    relatedTopics: [
      `rest-recovery-and-depletion`,
      `body-signals`,
      `emotional-regulation`,
    ],
    body: `Beyond broad motivational needs, daily well-being depends on practical emotional and physical needs: rest, food, movement, safety, space, autonomy, clarity, support, affection, respect, play, privacy, belonging, reassurance, expression, and recovery.`,
    expandTheLens: `People often misread unmet basic needs as character problems. Irritability may be exhaustion. Withdrawal may be overstimulation. Indecision may be lack of clarity. Not every inner struggle requires deep interpretation.`,
    howItMayShowUp: [
      `You think you are “unmotivated” but you are depleted.`,
      `You become reactive after days without privacy or rest.`,
      `You seek reassurance when what you actually need is clarity.`,
    ],
    reflectionQuestions: [
      `What basic need might make the biggest difference today?`,
    ],
    waysToWorkWithIt: [
      `Choose one need that can be addressed within 24 hours and meet it in the simplest available way.`,
    ],
    goDeeperGuidance: [
      `Always check for basic-state explanations before interpreting behavior through deeper psychological frameworks.`,
    ],
  },
  {
    slug: `competing-needs`,
    title: `Competing Needs`,
    exploreTheme: 'NEED',
    lifeDomains: [
      `Self & Identity`,
      `Relationships & Love`,
      `Family`,
      `Friends & Social Connection`,
      `Work & Career`,
      `Money & Financial Life`,
      `Body & Health`,
      `Emotional Well-Being`,
      `Personal Growth`,
      `Leisure & Joy`,
      `Purpose & Spiritual Meaning`,
    ],
    level: 'Foundation',
    contentType: [
      `Concept`,
      `Distinction`,
    ],
    relatedTopics: [
      `decision-making`,
      `values`,
      `needs-vs-neediness`,
    ],
    body: `Two valid needs can pull in opposite directions. You may want closeness and freedom, security and growth, recognition and privacy, stability and adventure.`,
    expandTheLens: `Conflict does not always mean confusion. Sometimes the person is accurately sensing two truths at once. Good decisions often involve choosing which need leads now and how to care for the other need too.`,
    howItMayShowUp: [
      `You want commitment and also fear losing independence.`,
      `You want to leave a job and also need financial stability.`,
      `You want to be seen and also want privacy.`,
    ],
    reflectionQuestions: [
      `Which two needs are competing in this situation?`,
    ],
    waysToWorkWithIt: [
      `Name both needs without forcing a winner. Then ask: “What choice honors one while reducing unnecessary harm to the other?”`,
    ],
    goDeeperGuidance: [
      `Help the user move from either/or thinking toward sequencing, tradeoffs, and creative integration.`,
    ],
  },
  {
    slug: `values`,
    title: `Values`,
    exploreTheme: 'NEED',
    lifeDomains: [
      `Self & Identity`,
      `Relationships & Love`,
      `Family`,
      `Friends & Social Connection`,
      `Work & Career`,
      `Money & Financial Life`,
      `Body & Health`,
      `Emotional Well-Being`,
      `Personal Growth`,
      `Leisure & Joy`,
      `Purpose & Spiritual Meaning`,
    ],
    level: 'Foundation',
    contentType: [
      `Concept`,
      `Distinction`,
    ],
    relatedTopics: [
      `values-vs-rules`,
      `value-conflicts`,
      `decision-making`,
    ],
    body: `Values are qualities or principles you want to embody in how you live - such as honesty, freedom, family, courage, loyalty, creativity, stability, learning, compassion, faith, excellence, adventure, justice, intimacy, contribution, beauty, independence, or belonging.`,
    expandTheLens: `Values are directions, not finish lines. A goal can be completed; a value keeps guiding choices. “Get promoted” is a goal. Achievement, contribution, freedom, mastery, or security may be the values underneath it.`,
    howItMayShowUp: [
      `Two people may want the same goal for different values.`,
      `A conflict can feel intense because a value - not only a preference - is being threatened.`,
      `A life can look successful while feeling wrong if it repeatedly violates core values.`,
    ],
    reflectionQuestions: [
      `What value are you trying to protect or express in this situation?`,
    ],
    waysToWorkWithIt: [
      `Pick five values from a broad list, then reduce to three by asking: “If I could keep only one of these in a difficult season, which one would still guide me?”`,
    ],
    goDeeperGuidance: [
      `Help identify lived values versus admired values and compare them with actual behavior.`,
    ],
  },
  {
    slug: `values-vs-rules`,
    title: `Values vs. Rules`,
    exploreTheme: 'NEED',
    lifeDomains: [
      `Self & Identity`,
      `Family`,
      `Work & Career`,
    ],
    level: 'Intermediate',
    contentType: [
      `Concept`,
      `Distinction`,
    ],
    relatedTopics: [
      `values`,
      `authenticity`,
      `limiting-beliefs`,
    ],
    body: `A value is a chosen direction. A rule is a fixed statement about how things must be done. Rules can express values, but they can also become rigid or inherited.`,
    expandTheLens: `“Family matters to me” is a value. “A good parent must always put the children first” is a rule. The rule may or may not serve the deeper value in every situation.`,
    howItMayShowUp: [
      `You feel guilty breaking a rule even when the rule no longer fits your life.`,
      `You judge yourself by “shoulds” you never consciously chose.`,
      `You mistake cultural expectations for personal values.`,
    ],
    reflectionQuestions: [
      `Is this truly one of your values - or a rule you learned?`,
    ],
    waysToWorkWithIt: [
      `Take one “I should” sentence and ask: “What value is this rule trying to serve? Is there another way to serve it?”`,
    ],
    goDeeperGuidance: [
      `Explore inherited rules from family, culture, gender, religion, work, and past relationships without dismissing them automatically.`,
    ],
  },
  {
    slug: `value-conflicts`,
    title: `Value Conflicts`,
    exploreTheme: 'NEED',
    lifeDomains: [
      `Self & Identity`,
      `Relationships & Love`,
      `Family`,
      `Friends & Social Connection`,
      `Work & Career`,
      `Money & Financial Life`,
      `Body & Health`,
      `Emotional Well-Being`,
      `Personal Growth`,
      `Leisure & Joy`,
      `Purpose & Spiritual Meaning`,
    ],
    level: 'Intermediate',
    contentType: [
      `Concept`,
      `Distinction`,
    ],
    relatedTopics: [
      `competing-needs`,
      `decision-making`,
      `boundaries`,
    ],
    body: `Values can conflict. Honesty can conflict with harmony. Freedom can conflict with stability. Loyalty can conflict with self-respect. Achievement can conflict with presence.`,
    expandTheLens: `A difficult decision may not have a value-free solution. Clarity comes from naming the tradeoff rather than pretending one option has no cost.`,
    howItMayShowUp: [
      `You want to tell the truth but fear hurting someone.`,
      `You want career growth but also want more family presence.`,
      `You value loyalty but a relationship repeatedly violates your standards.`,
    ],
    reflectionQuestions: [
      `Which values are in conflict here?`,
    ],
    waysToWorkWithIt: [
      `Write the two competing values. For each option, note which value it honors and which value it costs.`,
    ],
    goDeeperGuidance: [
      `Help the user choose consciously and reduce false guilt by making tradeoffs explicit.`,
    ],
  },
  {
    slug: `attachment-styles-overview`,
    title: `Attachment Styles - Overview`,
    exploreTheme: 'RELATE',
    lifeDomains: [
      `Relationships & Love`,
      `Family`,
      `Friends & Social Connection`,
    ],
    level: 'Foundation',
    contentType: [
      `Concept`,
      `Pattern`,
    ],
    relatedTopics: [
      `anxious-attachment-pattern`,
      `avoidant-attachment-pattern`,
      `fearful-avoidant-push-pull-pattern`,
      `secure-relating`,
    ],
    body: `Attachment describes patterns in how people seek closeness, respond to distance, handle dependence, and protect themselves in relationships. Common adult patterns are secure, anxious, avoidant, and fearful-avoidant/disorganized.`,
    expandTheLens: `SECURE: comfortable with closeness and autonomy. ANXIOUS: heightened sensitivity to distance or rejection, often seeking reassurance. AVOIDANT: protects independence, may minimize needs or pull away under emotional pressure. FEARFUL-AVOIDANT: may strongly desire closeness while also fearing it, creating push-pull patterns. These are tendencies, not diagnoses or identities.`,
    howItMayShowUp: [
      `A person may feel secure with friends and anxious in romance.`,
      `Someone avoidant may care deeply but experience closeness as pressure.`,
      `An anxious person may interpret ambiguity as rejection faster than others.`,
    ],
    reflectionQuestions: [
      `What happens inside you when someone important becomes less available?`,
    ],
    waysToWorkWithIt: [
      `Notice your first move under relational stress: move closer, pull away, freeze, test, explain, reassure, attack, or self-silence.`,
    ],
    goDeeperGuidance: [
      `Use attachment language carefully. Describe observable patterns before naming a style, and avoid treating style as destiny.`,
    ],
  },
  {
    slug: `anxious-attachment-pattern`,
    title: `Anxious Attachment Pattern`,
    exploreTheme: 'RELATE',
    lifeDomains: [
      `Relationships & Love`,
      `Family`,
      `Friends & Social Connection`,
    ],
    level: 'Intermediate',
    contentType: [
      `Concept`,
      `Pattern`,
    ],
    relatedTopics: [
      `needs-vs-neediness`,
      `emotional-triggers`,
      `secure-relating`,
    ],
    body: `An anxious attachment pattern often involves heightened attention to signs of distance, uncertainty, rejection, or changing availability. The nervous system may seek reassurance quickly.`,
    expandTheLens: `The need for connection is not the problem. The difficulty is when ambiguity becomes intolerable and behavior becomes organized around restoring certainty at any cost.`,
    howItMayShowUp: [
      `You reread messages to detect a change in tone.`,
      `A delayed response creates a strong urge to seek reassurance.`,
      `You over-focus on the relationship when you feel insecure.`,
    ],
    reflectionQuestions: [
      `What does distance immediately make you fear?`,
    ],
    waysToWorkWithIt: [
      `Before seeking reassurance, name the feared story and one alternative explanation. Then decide whether direct communication is still needed.`,
    ],
    goDeeperGuidance: [
      `Explore reassurance-seeking, fear of abandonment, protest behavior, and self-soothing without shaming the need for closeness.`,
    ],
  },
  {
    slug: `avoidant-attachment-pattern`,
    title: `Avoidant Attachment Pattern`,
    exploreTheme: 'RELATE',
    lifeDomains: [
      `Relationships & Love`,
      `Family`,
      `Friends & Social Connection`,
    ],
    level: 'Intermediate',
    contentType: [
      `Concept`,
      `Pattern`,
    ],
    relatedTopics: [
      `boundaries`,
      `secure-relating`,
    ],
    body: `An avoidant pattern often protects autonomy by minimizing needs, reducing emotional dependence, or pulling away when closeness feels demanding, exposing, or hard to regulate.`,
    expandTheLens: `Avoidance can be confused with lack of feeling. Sometimes the person feels deeply but experiences dependence, vulnerability, or expectation as threatening to freedom or control.`,
    howItMayShowUp: [
      `You feel relief after creating distance, then miss the person later.`,
      `You become highly practical when someone wants emotional closeness.`,
      `You focus on a partner's flaws when intimacy increases.`,
    ],
    reflectionQuestions: [
      `What does closeness make you fear you might lose?`,
    ],
    waysToWorkWithIt: [
      `When you want to pull away, name the boundary or need directly before disappearing or shutting down.`,
    ],
    goDeeperGuidance: [
      `Explore autonomy, vulnerability, emotional deactivation, fear of engulfment, and learned self- reliance without pathologizing independence.`,
    ],
  },
  {
    slug: `fearful-avoidant-push-pull-pattern`,
    title: `Fearful-Avoidant / Push-Pull Pattern`,
    exploreTheme: 'RELATE',
    lifeDomains: [
      `Relationships & Love`,
    ],
    level: 'Intermediate',
    contentType: [
      `Concept`,
      `Pattern`,
    ],
    relatedTopics: [
      `emotional-triggers`,
      `emotional-regulation`,
      `secure-relating`,
    ],
    body: `This pattern can involve both longing for closeness and fearing it. The person may move toward connection, then pull away when it becomes real, intense, or vulnerable.`,
    expandTheLens: `The push-pull cycle often makes both people feel confused. The key is to identify what changes at the moment closeness shifts from desired to threatening.`,
    howItMayShowUp: [
      `You intensely miss someone when they are distant but feel trapped when they come closer.`,
      `You test a relationship, then distrust the reassurance you receive.`,
      `You alternate between idealizing connection and needing escape.`,
    ],
    reflectionQuestions: [
      `At what point does closeness begin to feel unsafe?`,
    ],
    waysToWorkWithIt: [
      `Draw the cycle: longing -> closeness -> trigger -> protection -> distance -> longing. Mark where you have the most choice.`,
    ],
    goDeeperGuidance: [
      `Help the user see the cycle without assigning blame or using attachment style as a fixed identity.`,
    ],
  },
  {
    slug: `secure-relating`,
    title: `Secure Relating`,
    exploreTheme: 'RELATE',
    lifeDomains: [
      `Relationships & Love`,
      `Family`,
      `Friends & Social Connection`,
    ],
    level: 'Foundation',
    contentType: [
      `Concept`,
      `Pattern`,
    ],
    relatedTopics: [
      `boundaries`,
      `assertiveness`,
      `conflict-and-repair`,
    ],
    body: `Secure relating is the capacity to stay connected to yourself while staying connected to others. It includes clear communication, boundaries, repair, flexibility, trust, and tolerance for temporary distance or disagreement.`,
    expandTheLens: `Security does not mean never feeling jealous, anxious, hurt, or triggered. It means those states do not consistently control the relationship.`,
    howItMayShowUp: [
      `You can ask for reassurance without demanding certainty.`,
      `You can disagree without threatening the bond.`,
      `You can say no without withdrawing love.`,
    ],
    reflectionQuestions: [
      `What would a secure response look like in this situation?`,
    ],
    waysToWorkWithIt: [
      `Choose one secure behavior: ask directly, name a need, set a boundary, tolerate a pause, or repair after conflict.`,
    ],
    goDeeperGuidance: [
      `Use secure relating as a behavior set, not a personality label.`,
    ],
  },
  {
    slug: `relationship-red-flags-vs-triggers`,
    title: `Relationship Red Flags vs. Triggers`,
    exploreTheme: 'RELATE',
    lifeDomains: [
      `Relationships & Love`,
    ],
    level: 'Foundation',
    contentType: [
      `Concept`,
      `Pattern`,
    ],
    relatedTopics: [
      `emotional-triggers`,
      `boundaries`,
      `secure-relating`,
    ],
    body: `A trigger is an internal activation. A red flag is observable behavior that may indicate incompatibility, disrespect, manipulation, unreliability, coercion, or harm. Being triggered does not automatically mean the relationship is unsafe, and feeling calm does not automatically mean it is healthy.`,
    expandTheLens: `Look at patterns, not isolated moments: consistency, accountability, respect for boundaries, honesty, reciprocity, emotional safety, and repair.`,
    howItMayShowUp: [
      `A delayed message may trigger abandonment fear but is not automatically a red flag.`,
      `Repeated lying is a behavioral pattern, not merely a trigger.`,
      `Feeling intense chemistry does not prove compatibility.`,
    ],
    reflectionQuestions: [
      `What is the observable behavior - separate from what it makes you feel?`,
    ],
    waysToWorkWithIt: [
      `Describe the situation using only facts a camera could record. Then separately list your interpretations and emotions.`,
    ],
    goDeeperGuidance: [
      `Help distinguish internal activation from external behavior and avoid minimizing genuinely harmful patterns.`,
    ],
  },
  {
    slug: `boundaries`,
    title: `Boundaries`,
    exploreTheme: 'RELATE',
    lifeDomains: [
      `Relationships & Love`,
      `Family`,
      `Work & Career`,
    ],
    level: 'Foundation',
    contentType: [
      `Concept`,
      `Pattern`,
    ],
    relatedTopics: [
      `assertiveness`,
      `values`,
      `people-pleasing`,
    ],
    body: `Boundaries are limits that help you stay connected to yourself while interacting with others. They clarify what is okay, what is not, what you are available for, and what you need.`,
    expandTheLens: `Boundaries can be external (“I will leave if I am shouted at”) or internal (“I will not keep explaining after I have answered clearly”). They are not punishments and they do not control another person's choices.`,
    howItMayShowUp: [
      `You say yes and feel resentment later.`,
      `You feel responsible for preventing someone else's disappointment.`,
      `You keep participating in a conversation after you are emotionally flooded.`,
    ],
    reflectionQuestions: [
      `What are you allowing that is costing you self-respect or peace?`,
    ],
    waysToWorkWithIt: [
      `Complete: “When X happens, I will Y because I need Z.”`,
    ],
    goDeeperGuidance: [
      `Help distinguish boundary, request, preference, threat, and attempt to control another person.`,
    ],
  },
  {
    slug: `boundary-vs-ultimatum`,
    title: `Boundary vs. Ultimatum`,
    exploreTheme: 'RELATE',
    lifeDomains: [
      `Relationships & Love`,
      `Family`,
      `Work & Career`,
    ],
    level: 'Intermediate',
    contentType: [
      `Concept`,
      `Pattern`,
    ],
    relatedTopics: [
      `boundaries`,
      `assertiveness`,
      `conflict-and-repair`,
    ],
    body: `A boundary describes what you will do to protect your well-being. An ultimatum tries to force another person to behave a certain way, often through threat or pressure.`,
    expandTheLens: `“If you shout at me, I will end the conversation” is a boundary. “You are not allowed to be angry” is control. Sometimes serious situations do require clear consequences, but the focus remains on your action.`,
    howItMayShowUp: [
      `You repeat a boundary but never follow through.`,
      `You call something a boundary while trying to manage another person's choices.`,
      `You are afraid that any limit is “mean.”`,
    ],
    reflectionQuestions: [
      `Is this about what you will do - or what you need them to do?`,
    ],
    waysToWorkWithIt: [
      `Rewrite one boundary so it contains your action, not a command for the other person.`,
    ],
    goDeeperGuidance: [
      `Clarify enforceable boundaries and realistic consequences.`,
    ],
  },
  {
    slug: `assertiveness`,
    title: `Assertiveness`,
    exploreTheme: 'REPAIR',
    lifeDomains: [
      `Relationships & Love`,
      `Work & Career`,
      `Family`,
    ],
    level: 'Foundation',
    contentType: [
      `Skill`,
      `Practice`,
    ],
    relatedTopics: [
      `boundaries`,
      `conflict-and-repair`,
      `self-trust`,
    ],
    body: `Assertiveness is expressing your needs, opinions, feelings, and limits clearly while respecting the other person's right to have their own perspective.`,
    expandTheLens: `It sits between passivity and aggression. Assertiveness does not guarantee agreement; it makes your position visible.`,
    howItMayShowUp: [
      `You over-explain to make your request impossible to reject.`,
      `You avoid asking until resentment builds.`,
      `You become harsh because being direct feels vulnerable.`,
    ],
    reflectionQuestions: [
      `What would the clearest respectful sentence be?`,
    ],
    waysToWorkWithIt: [
      `Use: “When __ happens, I feel __. I need / prefer __. Are you willing to __?”`,
    ],
    goDeeperGuidance: [
      `Help the user shorten communication, reduce mind-reading, and tolerate the possibility of a no.`,
    ],
  },
  {
    slug: `conflict-and-repair`,
    title: `Conflict & Repair`,
    exploreTheme: 'REPAIR',
    lifeDomains: [
      `Relationships & Love`,
      `Family`,
      `Work & Career`,
    ],
    level: 'Foundation',
    contentType: [
      `Skill`,
      `Practice`,
    ],
    relatedTopics: [
      `assertiveness`,
      `emotional-regulation`,
      `secure-relating`,
    ],
    body: `Conflict is disagreement or friction. Repair is what happens afterward to restore understanding, accountability, trust, or connection. Healthy relationships are not conflict-free; they are repair- capable.`,
    expandTheLens: `Repair can include apology, clarification, validation, changed behavior, boundary-setting, or accepting that not every disagreement will fully resolve.`,
    howItMayShowUp: [
      `You focus on proving who was right instead of understanding impact.`,
      `An apology happens but behavior never changes.`,
      `You avoid conflict so nothing ever gets repaired.`,
    ],
    reflectionQuestions: [
      `What would repair require beyond explanation?`,
    ],
    waysToWorkWithIt: [
      `Complete three lines: “My part was… The impact may have been… Next time I want to…”`,
    ],
    goDeeperGuidance: [
      `Help distinguish explanation, accountability, forgiveness, and actual behavioral repair.`,
    ],
  },
  {
    slug: `body-signals`,
    title: `Body Signals`,
    exploreTheme: 'BODY',
    lifeDomains: [
      `Body & Health`,
      `Emotional Well-Being`,
    ],
    level: 'Foundation',
    contentType: [
      `State`,
      `Skill`,
    ],
    relatedTopics: [
      `emotional-regulation`,
      `window-of-tolerance`,
      `emotional-triggers`,
    ],
    body: `The body often registers activation before conscious thought catches up. Tightness, heat, heaviness, restlessness, numbness, shallow breathing, or expansion can offer clues about state.`,
    expandTheLens: `Body sensations are data, not verdicts. A racing heart can mean anxiety, excitement, caffeine, illness, or exertion. Interpretation should stay curious and contextual.`,
    howItMayShowUp: [
      `Your shoulders tense before you admit you are overwhelmed.`,
      `You feel relief in your body after saying no.`,
      `You mistake activation for certainty about what a situation means.`,
    ],
    reflectionQuestions: [
      `What is your body doing right now, before you explain why?`,
    ],
    waysToWorkWithIt: [
      `Name three neutral sensations without interpretation: pressure, warmth, tightness, movement, numbness, etc.`,
    ],
    goDeeperGuidance: [
      `Use somatic awareness to support regulation and decision-making without overclaiming meaning.`,
    ],
  },
  {
    slug: `fight-flight-freeze-and-fawn`,
    title: `Fight, Flight, Freeze & Fawn`,
    exploreTheme: 'BODY',
    lifeDomains: [
      `Body & Health`,
      `Relationships & Love`,
      `Work & Career`,
    ],
    level: 'Foundation',
    contentType: [
      `State`,
      `Skill`,
    ],
    relatedTopics: [
      `body-signals`,
      `emotional-regulation`,
      `window-of-tolerance`,
    ],
    body: `Under threat or strong stress, the nervous system may mobilize toward fighting, escaping, freezing, or appeasing. These are protective responses, not moral failures.`,
    expandTheLens: `FIGHT may look like anger or control. FLIGHT like urgency, escape, overworking, or restlessness. FREEZE like shutdown, numbness, indecision, or going blank. FAWN like appeasing, agreeing, or abandoning your needs to preserve safety.`,
    howItMayShowUp: [
      `You cannot think during conflict and later remember what you wanted to say.`,
      `You become unusually agreeable when someone is upset with you.`,
      `You need to leave immediately when tension rises.`,
    ],
    reflectionQuestions: [
      `Which protective response shows up first when you feel threatened?`,
    ],
    waysToWorkWithIt: [
      `Identify the state, then choose one regulating action before making a major decision.`,
    ],
    goDeeperGuidance: [
      `Normalize protective responses while helping the user regain choice and avoid using these labels as fixed personality types.`,
    ],
  },
  {
    slug: `window-of-tolerance`,
    title: `Window of Tolerance`,
    exploreTheme: 'BODY',
    lifeDomains: [
      `Body & Health`,
      `Emotional Well-Being`,
    ],
    level: 'Intermediate',
    contentType: [
      `State`,
      `Skill`,
    ],
    relatedTopics: [
      `emotional-regulation`,
      `rest-recovery-and-depletion`,
      `fight-flight-freeze-and-fawn`,
    ],
    body: `The window of tolerance is the range in which you can feel emotion while still thinking, communicating, and choosing. Above it, you may become hyperactivated. Below it, you may shut down or disconnect.`,
    expandTheLens: `The goal is not to remain perfectly calm. It is to notice when you have moved outside your workable range and return before attempting complex reflection or conflict resolution.`,
    howItMayShowUp: [
      `You keep arguing even though neither person can think clearly.`,
      `You feel numb and assume that means you no longer care.`,
      `You try to solve a problem while highly activated.`,
    ],
    reflectionQuestions: [
      `Are you regulated enough to think clearly right now?`,
    ],
    waysToWorkWithIt: [
      `Rate activation from 0-10. If above 7 or below 3, regulate first and revisit the issue later.`,
    ],
    goDeeperGuidance: [
      `Prioritize state regulation before insight when the user is flooded, shut down, or highly activated.`,
    ],
  },
  {
    slug: `rest-recovery-and-depletion`,
    title: `Rest, Recovery & Depletion`,
    exploreTheme: 'BODY',
    lifeDomains: [
      `Body & Health`,
      `Work & Career`,
    ],
    level: 'Foundation',
    contentType: [
      `State`,
      `Skill`,
    ],
    relatedTopics: [
      `basic-everyday-needs`,
      `ambition`,
      `emotional-regulation`,
    ],
    body: `Rest is not only sleep. Recovery can include quiet, play, nature, reduced decision load, movement, social connection, solitude, food, creativity, or time without performance.`,
    expandTheLens: `Depletion can distort interpretation. Before assigning deep meaning to irritability, hopelessness, or disconnection, check basic state factors.`,
    howItMayShowUp: [
      `Everything feels more personal when you are exhausted.`,
      `You call yourself lazy when you are actually depleted.`,
      `You rest physically but never mentally disconnect.`,
    ],
    reflectionQuestions: [
      `What kind of recovery are you missing?`,
    ],
    waysToWorkWithIt: [
      `Choose one form of recovery your body or mind has not received recently and schedule a small version of it.`,
    ],
    goDeeperGuidance: [
      `Check sleep, food, physical health, workload, stimulation, and recovery before psychologizing every state.`,
    ],
  },
  {
    slug: `decision-making`,
    title: `Decision-Making`,
    exploreTheme: 'CHOOSE',
    lifeDomains: [
      `Self & Identity`,
      `Relationships & Love`,
      `Family`,
      `Friends & Social Connection`,
      `Work & Career`,
      `Money & Financial Life`,
      `Body & Health`,
      `Emotional Well-Being`,
      `Personal Growth`,
      `Leisure & Joy`,
      `Purpose & Spiritual Meaning`,
    ],
    level: 'Foundation',
    contentType: [
      `Skill`,
      `Distinction`,
    ],
    relatedTopics: [
      `values`,
      `competing-needs`,
      `self-trust`,
    ],
    body: `A good decision is not the same as a guaranteed outcome. Good decisions use the best available information, relevant values, needs, risks, and constraints at the time.`,
    expandTheLens: `People often delay decisions because they want certainty about the future. Sometimes clarity comes before action; sometimes clarity grows through action.`,
    howItMayShowUp: [
      `You keep revisiting a decision after no new information has arrived.`,
      `You ask for advice until you hear the answer you want.`,
      `You confuse anxiety with evidence that the choice is wrong.`,
    ],
    reflectionQuestions: [
      `What do you know, what do you not know, and what cannot be known yet?`,
    ],
    waysToWorkWithIt: [
      `Make three columns: facts, assumptions, unknowns. Decide only from the first two while respecting the third.`,
    ],
    goDeeperGuidance: [
      `Help separate decision quality from outcome quality and identify whether the user needs more data or more tolerance for uncertainty.`,
    ],
  },
  {
    slug: `fear-vs-desire-in-decisions`,
    title: `Fear vs. Desire in Decisions`,
    exploreTheme: 'CHOOSE',
    lifeDomains: [
      `Self & Identity`,
      `Relationships & Love`,
      `Family`,
      `Friends & Social Connection`,
      `Work & Career`,
      `Money & Financial Life`,
      `Body & Health`,
      `Emotional Well-Being`,
      `Personal Growth`,
      `Leisure & Joy`,
      `Purpose & Spiritual Meaning`,
    ],
    level: 'Foundation',
    contentType: [
      `Skill`,
      `Distinction`,
    ],
    relatedTopics: [
      `decision-making`,
      `future-self`,
      `values`,
    ],
    body: `Many decisions contain both desire and fear. The question is not “Which one is real?” but “Which one should lead?”`,
    expandTheLens: `Fear can provide useful risk information. Desire can provide direction. A mature decision listens to both without allowing either to dominate automatically.`,
    howItMayShowUp: [
      `You want to apply for a role but fear rejection.`,
      `You want to leave a relationship but fear loneliness.`,
      `You want closeness but fear losing freedom.`,
    ],
    reflectionQuestions: [
      `If fear were not making the decision, what would you want? If desire ignored all risk, what would it miss?`,
    ],
    waysToWorkWithIt: [
      `Write one sentence from fear and one from desire. Then write a third from your wiser decision- making self.`,
    ],
    goDeeperGuidance: [
      `Integrate risk, values, needs, and long-term consequences rather than treating fear as the enemy.`,
    ],
  },
  {
    slug: `future-self`,
    title: `Future Self`,
    exploreTheme: 'CHOOSE',
    lifeDomains: [
      `Self & Identity`,
      `Personal Growth`,
      `Work & Career`,
    ],
    level: 'Foundation',
    contentType: [
      `Skill`,
      `Distinction`,
    ],
    relatedTopics: [
      `decision-making`,
      `purpose`,
      `ambition`,
    ],
    body: `The future-self lens helps users make choices based on the person they are becoming, not only the discomfort of the present moment.`,
    expandTheLens: `It should not become fantasy or self-pressure. The useful future self is realistic, value-aligned, and connected to small present actions.`,
    howItMayShowUp: [
      `You know what you want long term but repeatedly choose short-term relief.`,
      `You imagine a future identity but do not change current routines.`,
      `You postpone life until you become “better.”`,
    ],
    reflectionQuestions: [
      `What would your future self thank you for doing now?`,
    ],
    waysToWorkWithIt: [
      `Choose one action that takes less than 15 minutes and is consistent with the future you want.`,
    ],
    goDeeperGuidance: [
      `Keep future-self work concrete and avoid using idealized identity as another perfectionistic standard.`,
    ],
  },
  {
    slug: `ambition`,
    title: `Ambition`,
    exploreTheme: 'CREATE',
    lifeDomains: [
      `Work & Career`,
      `Self & Identity`,
    ],
    level: 'Foundation',
    contentType: [
      `Concept`,
      `Reflection`,
    ],
    relatedTopics: [
      `self-worth-vs-performance`,
      `success-and-enough`,
      `rest-recovery-and-depletion`,
    ],
    body: `Ambition is the drive to build, achieve, influence, master, create, or expand. It can be healthy, joyful, compensatory, fear-driven, or some combination.`,
    expandTheLens: `The question is not whether ambition is good or bad, but what it serves and what it costs. Achievement can express values or become a way to regulate worth.`,
    howItMayShowUp: [
      `You feel alive while creating but empty after recognition fades.`,
      `You cannot slow down without feeling guilty.`,
      `You keep raising the goal because reaching it does not create enough.`,
    ],
    reflectionQuestions: [
      `What does achievement give you emotionally?`,
    ],
    waysToWorkWithIt: [
      `Name the goal, then name the feeling or need you expect it to create. Ask whether that need has other sources too.`,
    ],
    goDeeperGuidance: [
      `Explore purpose, significance, security, creativity, comparison, and self-worth without assuming ambition is compensation.`,
    ],
  },
  {
    slug: `money-meaning`,
    title: `Money Meaning`,
    exploreTheme: 'CREATE',
    lifeDomains: [
      `Money & Financial Life`,
      `Self & Identity`,
      `Family`,
    ],
    level: 'Foundation',
    contentType: [
      `Concept`,
      `Reflection`,
    ],
    relatedTopics: [
      `needs-vs-neediness`,
      `values`,
      `success-and-enough`,
    ],
    body: `Money is practical, but it also carries emotional meaning: safety, freedom, status, power, care, possibility, success, control, generosity, or fear.`,
    expandTheLens: `People can have conflicting money stories learned from family, culture, scarcity, privilege, or past experiences. Understanding meaning can improve choices without replacing financial facts.`,
    howItMayShowUp: [
      `Spending creates guilt even when you can afford it.`,
      `Saving creates safety far beyond the actual numbers.`,
      `Income becomes a measure of personal success.`,
    ],
    reflectionQuestions: [
      `What does money represent emotionally for you?`,
    ],
    waysToWorkWithIt: [
      `Finish: “More money would mean… Less money would mean…” Look for the emotional words underneath.`,
    ],
    goDeeperGuidance: [
      `Keep emotional reflection separate from financial advice; encourage concrete numbers when decisions require them.`,
    ],
  },
  {
    slug: `creative-block`,
    title: `Creative Block`,
    exploreTheme: 'CREATE',
    lifeDomains: [
      `Work & Career`,
      `Personal Growth`,
      `Leisure & Joy`,
    ],
    level: 'Foundation',
    contentType: [
      `Concept`,
      `Reflection`,
    ],
    relatedTopics: [
      `perfectionism`,
      `inner-critic`,
      `joy-and-play`,
    ],
    body: `A creative block is difficulty accessing ideas, expression, or momentum. It can come from fear of judgment, perfectionism, depletion, ambiguity, boredom, or lack of input.`,
    expandTheLens: `Creativity often needs alternation between focus and openness. More pressure is not always the solution.`,
    howItMayShowUp: [
      `You edit before you have created anything.`,
      `You compare your early draft to someone else's finished work.`,
      `You call yourself uninspired after weeks without recovery or novelty.`,
    ],
    reflectionQuestions: [
      `What is stopping the first imperfect version from existing?`,
    ],
    waysToWorkWithIt: [
      `Create a deliberately rough version for ten minutes with no editing allowed.`,
    ],
    goDeeperGuidance: [
      `Identify whether the block is emotional, structural, energetic, or informational.`,
    ],
  },
  {
    slug: `success-and-enough`,
    title: `Success & Enough`,
    exploreTheme: 'CREATE',
    lifeDomains: [
      `Work & Career`,
      `Money & Financial Life`,
      `Self & Identity`,
    ],
    level: 'Foundation',
    contentType: [
      `Concept`,
      `Reflection`,
    ],
    relatedTopics: [
      `ambition`,
      `self-worth-vs-performance`,
      `meaning-vs-happiness`,
    ],
    body: `Success is an outcome or condition you define. “Enough” is the point at which more is no longer automatically better. Without an internal definition, success can become endlessly moving.`,
    expandTheLens: `Enough can apply to money, recognition, workload, growth, possessions, visibility, or achievement. It does not mean lack of ambition; it creates a reference point.`,
    howItMayShowUp: [
      `Every milestone immediately becomes the starting line for the next one.`,
      `You cannot enjoy progress because the target keeps moving.`,
      `You do not know what would actually feel sufficient.`,
    ],
    reflectionQuestions: [
      `What would “enough for this season” look like?`,
    ],
    waysToWorkWithIt: [
      `Define one concrete enough-point for money, work hours, or achievement this month.`,
    ],
    goDeeperGuidance: [
      `Help the user distinguish chosen ambition from compulsive escalation.`,
    ],
  },
  {
    slug: `inner-child-a-practical-lens`,
    title: `Inner Child - A Practical Lens`,
    exploreTheme: 'LIFE',
    lifeDomains: [
      `Self & Identity`,
      `Family`,
      `Relationships & Love`,
    ],
    level: 'Intermediate',
    contentType: [
      `Concept`,
      `Reflection`,
    ],
    relatedTopics: [
      `emotional-triggers`,
      `attachment-styles-overview`,
      `self-compassion`,
    ],
    body: `“Inner child” is a metaphor for younger emotional learning that can still shape present reactions - especially around safety, love, approval, shame, play, and belonging.`,
    expandTheLens: `The concept is useful when it creates compassion and choice. It becomes unhelpful if every adult reaction is attributed to childhood or if it removes responsibility for present behavior.`,
    howItMayShowUp: [
      `Criticism makes you feel suddenly small or powerless.`,
      `You become intensely afraid of disappointing authority figures.`,
      `Play, tenderness, or creativity feel inaccessible.`,
    ],
    reflectionQuestions: [
      `Does this reaction feel connected to an older emotional memory or role?`,
    ],
    waysToWorkWithIt: [
      `Ask: “What did younger me need then? What can adult me provide now?” Choose one realistic action.`,
    ],
    goDeeperGuidance: [
      `Use childhood links as hypotheses and return agency to the present-day adult self.`,
    ],
  },
  {
    slug: `limiting-beliefs`,
    title: `Limiting Beliefs`,
    exploreTheme: 'LIFE',
    lifeDomains: [
      `Self & Identity`,
      `Relationships & Love`,
      `Family`,
      `Friends & Social Connection`,
      `Work & Career`,
      `Money & Financial Life`,
      `Body & Health`,
      `Emotional Well-Being`,
      `Personal Growth`,
      `Leisure & Joy`,
      `Purpose & Spiritual Meaning`,
    ],
    level: 'Foundation',
    contentType: [
      `Concept`,
      `Reflection`,
    ],
    relatedTopics: [
      `values-vs-rules`,
      `inner-critic`,
      `future-self`,
    ],
    body: `A limiting belief is a conclusion about yourself, others, or life that narrows what you consider possible. Examples: “I am too much,” “People always leave,” “Success requires sacrifice,” “I cannot trust myself.”`,
    expandTheLens: `Beliefs are not changed by positive slogans alone. They weaken when they are examined, updated with evidence, and replaced with more accurate working beliefs.`,
    howItMayShowUp: [
      `You reject opportunities before testing them.`,
      `You interpret neutral events through the same negative conclusion.`,
      `You keep choosing situations that confirm what you already believe.`,
    ],
    reflectionQuestions: [
      `What belief is this situation activating?`,
    ],
    waysToWorkWithIt: [
      `Write the belief. Then list evidence for it, evidence against it, and a more accurate middle statement.`,
    ],
    goDeeperGuidance: [
      `Focus on accuracy rather than forced positivity.`,
    ],
  },
  {
    slug: `forgiveness`,
    title: `Forgiveness`,
    exploreTheme: 'REPAIR',
    lifeDomains: [
      `Self & Identity`,
      `Relationships & Love`,
      `Family`,
    ],
    level: 'Intermediate',
    contentType: [
      `Skill`,
      `Practice`,
    ],
    relatedTopics: [
      `shame-vs-guilt`,
      `grief-and-letting-go`,
      `self-compassion`,
    ],
    body: `Forgiveness is a personal process of reducing the hold of resentment, revenge, or unresolved grievance. It is not forgetting, excusing, reconciling, or removing boundaries.`,
    expandTheLens: `Some people choose forgiveness; others first need distance, accountability, grief, or safety. The concept should never be used to pressure someone back into harmful contact.`,
    howItMayShowUp: [
      `You think forgiving means saying what happened was okay.`,
      `You stay angry because anger feels like the only protection left.`,
      `You forgive verbally but continue to violate your own boundary.`,
    ],
    reflectionQuestions: [
      `What would forgiveness mean to you - and what are you afraid it would require?`,
    ],
    waysToWorkWithIt: [
      `Separate four things: understanding, accountability, forgiveness, reconciliation. Decide which, if any, is appropriate now.`,
    ],
    goDeeperGuidance: [
      `Never equate forgiveness with reunion or access.`,
    ],
  },
  {
    slug: `self-compassion`,
    title: `Self-Compassion`,
    exploreTheme: 'REPAIR',
    lifeDomains: [
      `Self & Identity`,
      `Emotional Well-Being`,
    ],
    level: 'Foundation',
    contentType: [
      `Skill`,
      `Practice`,
    ],
    relatedTopics: [
      `inner-critic`,
      `shame-vs-guilt`,
      `forgiveness`,
    ],
    body: `Self-compassion is responding to your own pain, mistakes, or limitation with the same humanity you would offer someone you care about. It is not self-indulgence or avoiding responsibility.`,
    expandTheLens: `Compassion and standards can coexist. Harshness is not the only path to growth.`,
    howItMayShowUp: [
      `You believe you need self-criticism to stay motivated.`,
      `You recover slowly because mistakes become identity judgments.`,
      `You can understand everyone's context except your own.`,
    ],
    reflectionQuestions: [
      `What would accountability sound like without cruelty?`,
    ],
    waysToWorkWithIt: [
      `Write what happened as if speaking to a good friend who still needs to take responsibility.`,
    ],
    goDeeperGuidance: [
      `Help the user combine responsibility, learning, and humane self-talk.`,
    ],
  },
  {
    slug: `meaning-vs-happiness`,
    title: `Meaning vs. Happiness`,
    exploreTheme: 'LIFE',
    lifeDomains: [
      `Purpose & Spiritual Meaning`,
      `Emotional Well-Being`,
    ],
    level: 'Foundation',
    contentType: [
      `Concept`,
      `Reflection`,
    ],
    relatedTopics: [
      `purpose`,
      `gratitude`,
      `integration`,
    ],
    body: `Happiness is a positive emotional experience. Meaning is the sense that life, actions, relationships, or effort connect to something that matters. They overlap, but they are not identical.`,
    expandTheLens: `A meaningful life can include grief, difficulty, sacrifice, and uncertainty. A pleasant life can still feel empty if it lacks connection, purpose, or alignment.`,
    howItMayShowUp: [
      `You are doing well but feel flat.`,
      `A difficult responsibility still feels deeply worthwhile.`,
      `You chase positive feelings but remain disconnected from what matters.`,
    ],
    reflectionQuestions: [
      `What feels worth doing even when it is not easy?`,
    ],
    waysToWorkWithIt: [
      `Name one activity that gives pleasure and one that gives meaning. Make room for both this week.`,
    ],
    goDeeperGuidance: [
      `Help the user avoid treating happiness as a permanent emotional state.`,
    ],
  },
  {
    slug: `gratitude`,
    title: `Gratitude`,
    exploreTheme: 'LIFE',
    lifeDomains: [
      `Self & Identity`,
      `Relationships & Love`,
      `Family`,
      `Friends & Social Connection`,
      `Work & Career`,
      `Money & Financial Life`,
      `Body & Health`,
      `Emotional Well-Being`,
      `Personal Growth`,
      `Leisure & Joy`,
      `Purpose & Spiritual Meaning`,
    ],
    level: 'Foundation',
    contentType: [
      `Concept`,
      `Reflection`,
    ],
    relatedTopics: [
      `joy-and-play`,
      `meaning-vs-happiness`,
      `integration`,
    ],
    body: `Gratitude is deliberate attention to what is supportive, meaningful, beautiful, or already present. It does not require denying pain or pretending everything is good.`,
    expandTheLens: `Healthy gratitude expands attention. Toxic positivity uses gratitude to suppress legitimate distress. Both can sound similar on the surface, so context matters.`,
    howItMayShowUp: [
      `You notice what is missing faster than what is working.`,
      `You feel guilty for being unhappy because “you should be grateful.”`,
      `Small positive moments disappear quickly from attention.`,
    ],
    reflectionQuestions: [
      `What is present today that you do not want to take for granted?`,
    ],
    waysToWorkWithIt: [
      `Name three specific things from the last 24 hours and why each mattered.`,
    ],
    goDeeperGuidance: [
      `Use gratitude alongside, not instead of, emotional truth.`,
    ],
  },
  {
    slug: `joy-and-play`,
    title: `Joy & Play`,
    exploreTheme: 'LIFE',
    lifeDomains: [
      `Leisure & Joy`,
      `Relationships & Love`,
      `Self & Identity`,
    ],
    level: 'Foundation',
    contentType: [
      `Concept`,
      `Reflection`,
    ],
    relatedTopics: [
      `rest-recovery-and-depletion`,
      `gratitude`,
      `creative-block`,
    ],
    body: `Joy and play are not rewards for finishing all responsibilities. They are forms of aliveness, regulation, creativity, connection, and recovery.`,
    expandTheLens: `Adults often narrow play into entertainment or achievement. Play can include music, movement, humor, curiosity, games, art, nature, spontaneity, or doing something with no productive outcome.`,
    howItMayShowUp: [
      `You cannot remember the last thing you did with no purpose.`,
      `Fun feels irresponsible when work is unfinished.`,
      `You consume entertainment but rarely feel genuinely playful.`,
    ],
    reflectionQuestions: [
      `What feels fun before it becomes useful?`,
    ],
    waysToWorkWithIt: [
      `Do one ten-minute activity with no improvement goal and no output requirement.`,
    ],
    goDeeperGuidance: [
      `Help distinguish passive distraction from active restoration and play.`,
    ],
  },
  {
    slug: `purpose`,
    title: `Purpose`,
    exploreTheme: 'LIFE',
    lifeDomains: [
      `Work & Career`,
      `Personal Growth`,
      `Purpose & Spiritual Meaning`,
    ],
    level: 'Foundation',
    contentType: [
      `Concept`,
      `Reflection`,
    ],
    relatedTopics: [
      `meaning-vs-happiness`,
      `future-self`,
      `values`,
    ],
    body: `Purpose is a sense of direction or contribution that gives coherence to choices. It can be large or local, stable or evolving. Not everyone needs one grand life mission.`,
    expandTheLens: `Purpose often emerges through values, strengths, relationships, responsibility, curiosity, and repeated action - not only through revelation.`,
    howItMayShowUp: [
      `You keep waiting to discover “the one thing” you were meant to do.`,
      `Your work is meaningful but not your entire purpose.`,
      `A life transition changes what feels important.`,
    ],
    reflectionQuestions: [
      `What do you want your energy to serve in this season?`,
    ],
    waysToWorkWithIt: [
      `Write one sentence: “Right now, I want to use my time and abilities to…” Keep it provisional.`,
    ],
    goDeeperGuidance: [
      `Protect users from purpose pressure; allow multiple sources of meaning.`,
    ],
  },
  {
    slug: `integration`,
    title: `Integration`,
    exploreTheme: 'LIFE',
    lifeDomains: [
      `Self & Identity`,
      `Relationships & Love`,
      `Family`,
      `Friends & Social Connection`,
      `Work & Career`,
      `Money & Financial Life`,
      `Body & Health`,
      `Emotional Well-Being`,
      `Personal Growth`,
      `Leisure & Joy`,
      `Purpose & Spiritual Meaning`,
    ],
    level: 'Deep Dive',
    contentType: [
      `Concept`,
      `Reflection`,
    ],
    relatedTopics: [
      `future-self`,
    ],
    body: `Integration is the process of turning insight into lived change. Understanding a pattern is useful, but the nervous system and daily life learn through repetition, environment, relationships, and behavior.`,
    expandTheLens: `Insight without action can become another form of avoidance. Action without reflection can repeat old patterns. Integration connects both.`,
    howItMayShowUp: [
      `You can explain your pattern perfectly but still repeat it.`,
      `You have many tools but use none when activated.`,
      `You make a major insight and expect immediate permanent change.`,
    ],
    reflectionQuestions: [
      `What would this insight look like as one behavior?`,
    ],
    waysToWorkWithIt: [
      `Choose one cue and one response: “When X happens, I will practice Y.” Keep it small enough to repeat.`,
    ],
    goDeeperGuidance: [
      `Always end deeper reflection with a realistic integration step when the user is ready.`,
    ],
  },
]
