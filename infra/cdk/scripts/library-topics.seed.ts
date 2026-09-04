/**
 * Content Library catalog seed data (MVP_ARCHITECTURE.md §5.5, §3.2). No
 * spec docx section for authored topic content was available when these
 * were first written (same access gap Session 5 had for Mirror Room's
 * prompts) — all 6 topics' *content* were Session 6's own first-authored
 * draft, written Claude-native in the same warm/curious/non-diagnostic
 * voice already established for `decision_room`/`mirror_room`/`library`
 * prompts, not ported from anywhere. **Approved as-is by the user in
 * Session 10** — treat the content (title/body) as settled, same status
 * Decision Room/Mirror Room's own content already has, not a draft
 * awaiting review.
 *
 * `taxonomyCategory` values were re-seeded in a later session once the
 * spec docx (§4 "Library taxonomy") became available — the original
 * categories ("Patterns & Habits", "Triggers", "Direction & Focus",
 * "Commitments & Follow-Through") were this project's own invention,
 * loosely aligned to `TwinSignalDomainSchema` before anyone had the real
 * taxonomy to check against. The spec defines exactly 6 categories: Inner
 * World, Values & Needs, Energy & Motivation, Patterns & Beliefs,
 * Relationships, Direction & Creation, each with 4-5 named subtopics. The
 * 6 topics below are now mapped onto that real taxonomy by content fit —
 * **honestly leaving Energy & Motivation and Relationships with zero
 * topics**, since none of the 6 existing topics' approved content actually
 * fits either one; inventing new topics to fill them was out of scope for
 * a category re-mapping (spec's own "not required to build hundreds of
 * items" note applies here — a real Relationships/Energy & Motivation
 * topic is future content work, not a re-seed).
 */

/**
 * Intelligence Spec §18/§20 structured fields, added this session
 * (`quickDefinition`/`howItMayShowUp`/`possibleRoots`/`reflectionQuestions`/
 * `waysToWorkWithIt`/`recommendedRooms`, per §20's `KnowledgeTopic{}`
 * shape) — same provenance and status as `body` above: Claude-authored
 * first-draft content, in the same warm/tentative/non-diagnostic voice
 * `body` already established, not ported from any external source. Per the
 * user's own explicit direction this session, `possibleRoots` is grounded
 * in §20's worked "Avoidance" example (tentative language, multiple
 * possibilities, never asserting one cause), and the spec document itself
 * is being used as the methodology-layer grounding rather than waiting on
 * a separate founder-authored Methodology & Source Manual (§19's own
 * named, still-nonexistent prerequisite). Flagged for product review, not
 * treated as final — same status every other net-new content set in this
 * project has carried before user sign-off (Mirror Room's prompts, the
 * original 6 topics' `body` text).
 */
export interface TopicSeed {
  slug: string
  title: string
  taxonomyCategory: string
  body: string
  quickDefinition: string
  howItMayShowUp: string[]
  possibleRoots: string[]
  reflectionQuestions: string[]
  waysToWorkWithIt: string[]
  recommendedRooms: ('mirror' | 'decision')[]
}

export const LIBRARY_TOPIC_SEEDS: TopicSeed[] = [
  {
    slug: 'understanding-your-patterns',
    title: 'Understanding Your Patterns',
    taxonomyCategory: 'Patterns & Beliefs', // spec §4: "Awareness Patterns" subtopic
    body: `A pattern isn't a flaw — it's a strategy that made sense once. Most of the patterns you notice in yourself today, whether it's going quiet in conflict or over-preparing before anything important, started as a reasonable response to something real. The problem isn't that the pattern exists; it's that it can keep running long after the situation that shaped it has changed.

Noticing a pattern is different from judging it. The first useful question usually isn't "why do I keep doing this?" but "what was this trying to protect, or get me, at the time it started?" That question tends to open things up instead of closing them down.

Patterns also tend to hide in plain sight because they feel like "just how I am." A pattern only becomes visible once you can name a specific moment it shows up — a particular kind of email, a particular tone of voice from someone, a particular hour of the night. Specificity is what turns a vague sense of "I always do this" into something you can actually work with.`,
    quickDefinition: 'A pattern is a strategy that made sense once — a repeated way of thinking, feeling, or acting that your mind adopted to handle something real, then kept running long after the situation changed.',
    howItMayShowUp: [
      'Going quiet or agreeable in conflict, even when you disagree',
      'Over-preparing for things that don’t call for it',
      'A strong reaction to something that, described out loud, sounds small',
      'Noticing you’ve "done this before" in a specific kind of moment',
      'A thought that arrives fully formed, before you’ve consciously decided anything',
    ],
    possibleRoots: [
      'May have started as a way to stay safe in an earlier situation where a different response wasn’t available',
      'May be a learned response to how conflict or attention was handled by people around you early on',
      'May reflect a genuine value, like keeping peace, applied more broadly than it currently needs to be',
      'May be a body-level habit that formed before there were words for what it was responding to',
    ],
    reflectionQuestions: [
      'Can you name one specific, recent moment this pattern showed up — who, where, what exactly happened?',
      'What might this pattern have been protecting you from, the first few times it appeared?',
      'Is it still doing that job today, or is it running on its own?',
    ],
    waysToWorkWithIt: [
      'Next time you notice it, just name it silently ("there it is") without trying to stop it',
      'Write down the specific trigger the next time it happens, instead of the general feeling',
      'Bring one specific instance into Mirror Room and look at it structurally',
    ],
    recommendedRooms: ['mirror'],
  },
  {
    slug: 'what-triggers-you',
    title: 'What Triggers You, and Why',
    taxonomyCategory: 'Inner World', // spec §4: "Emotional Triggers" subtopic
    body: `A trigger is rarely about the thing that just happened — it's usually about what that thing reminds your nervous system of. A comment that seems small to everyone else in the room can land hard because it echoes something from years earlier. That's not oversensitivity; it's your body doing exactly what memory is for.

Triggers are also specific, not general. "I get anxious in meetings" is a starting point, but "I get anxious when someone interrupts me mid-sentence in a meeting" is something you can actually investigate. The more precisely you can describe the moment — who, what, when, what you noticed in your body first — the more the trigger stops feeling random.

Knowing a trigger doesn't obligate you to fix it immediately. Sometimes the most useful first step is just accurately naming it, without a plan attached — "this is a trigger for me" is a complete, useful sentence on its own.`,
    quickDefinition: 'A trigger is a moment that provokes a reaction disproportionate to what just happened — usually because it echoes something your nervous system remembers, not because you’re overreacting.',
    howItMayShowUp: [
      'A strong emotional spike to something others in the room barely notice',
      'A specific tone of voice, word, or gesture that reliably sets something off',
      'A physical reaction — tight chest, racing heart — before you’ve consciously registered why',
      'Replaying the moment afterward, longer than it seems to "deserve"',
    ],
    possibleRoots: [
      'May echo an earlier experience where a similar moment carried real stakes',
      'May be connected to a specific relationship or period, not the present situation itself',
      'May be your body flagging a pattern before your thinking catches up',
      'May be amplified by how tired, depleted, or already-stretched you are right now in general',
    ],
    reflectionQuestions: [
      'Who, what, and when — can you describe the exact moment, not just "meetings" or "conflict" in general?',
      'What did you notice in your body first, before any thought?',
      'Does this remind you of anything from earlier — even loosely?',
    ],
    waysToWorkWithIt: [
      'Name it out loud or in writing, without a plan attached: "this is a trigger for me"',
      'Notice where in your body it shows up first, next time',
      'Bring a specific instance into Mirror Room to look at what’s underneath it',
    ],
    recommendedRooms: ['mirror'],
  },
  {
    slug: 'values-vs-needs',
    title: "Values vs. Needs: What's Really Driving You",
    taxonomyCategory: 'Values & Needs',
    body: `Values and needs get used almost interchangeably, but they pull in different directions. A value is a direction you want to move in — honesty, growth, connection. A need is something that has to be met for you to function well right now — rest, safety, being heard. You can hold a value your whole life; a need is more urgent and more immediate.

Confusion between the two is where a lot of decision-paralysis lives. Choosing the option that serves a value ("I value ambition") while ignoring a real, present need ("I need to not be exhausted") usually isn't sustainable, even though it can look admirable from the outside.

A useful move is to ask both questions separately about the same situation: what does this decision serve in the long run, and what does it cost me right now? They don't always point the same way — and noticing when they don't is often more informative than either answer alone.`,
    quickDefinition: 'A value is a direction you want to keep moving in, like honesty or growth. A need is something that has to be met right now for you to function well, like rest or safety. Confusing the two is where a lot of decision-paralysis lives.',
    howItMayShowUp: [
      'Choosing the "admirable" option while ignoring real exhaustion or overwhelm',
      'Feeling guilty for prioritizing a need, as if it were a lesser reason',
      'A decision that looks right on paper but doesn’t sit right in the body',
      'Repeatedly making the same kind of choice and still feeling unsettled by it',
    ],
    possibleRoots: [
      'May reflect a habit of treating needs as optional or self-indulgent',
      'May come from an environment that rewarded ignoring needs in favor of values that looked good externally',
      'May simply be that the value and the need haven’t been named separately yet',
    ],
    reflectionQuestions: [
      'In this decision, what does it serve in the long run — and what does it cost you right now?',
      'If a friend described this same situation to you, what would you tell them they needed?',
      'Are you choosing this, or choosing to be the kind of person who chooses this?',
    ],
    waysToWorkWithIt: [
      'Before deciding, write the value and the need on separate lines and ask both questions on their own',
      'Notice when they point in different directions — that gap is often more informative than either answer alone',
      'Bring a live decision into Decision Room and map both sides explicitly',
    ],
    recommendedRooms: ['decision', 'mirror'],
  },
  {
    slug: 'body-awareness-basics',
    title: 'Body Awareness: Listening to What You Feel',
    taxonomyCategory: 'Inner World', // spec §4: "Pain & Healing" subtopic
    body: `Emotions show up in the body before they show up as words. Tightness in the chest, a dropped stomach, a jaw that's been clenched for an hour without you noticing — these are often the earliest, clearest signal that something matters, arriving well before you can articulate what it is.

Most people are trained to skip straight to the explanation ("I'm stressed because of the deadline") without ever pausing at the sensation itself. That skip isn't wrong, but it can mean the actual signal — the specific location, the specific quality of tightness or heaviness or restlessness — never gets used as information.

A body scan doesn't have to be elaborate. Noticing one sensation, naming where it is, and staying with it for a few breaths before reaching for an explanation is often enough to find something a fast, verbal read of the situation would have missed entirely.`,
    quickDefinition: 'Emotions usually show up in the body — a tight chest, a dropped stomach, a clenched jaw — before they show up as words. Those sensations are often the earliest, clearest signal that something matters.',
    howItMayShowUp: [
      'Jumping straight to an explanation ("I’m stressed because of the deadline") without noticing the sensation itself',
      'A physical tension you only notice once it’s been there a while',
      'Feeling "off" without being able to say why, until you check in with your body directly',
      'The same sensation showing up in similar situations, once you start looking for it',
    ],
    possibleRoots: [
      'May reflect being taught, directly or indirectly, to prioritize explaining feelings over sensing them',
      'May simply be that body-checking isn’t a practiced habit yet, not that anything is wrong',
      'May be the body accurately flagging something the conscious mind hasn’t caught up to',
    ],
    reflectionQuestions: [
      'Where in your body do you feel this right now, specifically?',
      'What quality does it have — tight, heavy, buzzing, hollow?',
      'Has it changed at all since you started paying attention to it?',
    ],
    waysToWorkWithIt: [
      'Pause and name one sensation and its location, before reaching for an explanation',
      'Stay with it for a few breaths rather than moving straight to "why"',
      'Bring what you notice into a Mirror Room session on a specific moment',
    ],
    recommendedRooms: ['mirror'],
  },
  {
    slug: 'finding-your-direction',
    title: 'Finding Direction When Everything Feels Urgent',
    taxonomyCategory: 'Direction & Creation', // spec §4: "Purpose & Meaning" / "Freedom & Choice" subtopics
    body: `Urgency and importance get confused constantly, and almost everything that shouts the loudest is urgent, not important. A full inbox creates a feeling of direction — something to do right now — without actually pointing anywhere. That feeling can be mistaken for having a focus, when it's really just having a queue.

Real direction usually comes from a much quieter place: a sense of what you'd regret not having tried, or what you keep returning to in idle moments even when nothing is forcing you to. It rarely announces itself as loudly as the next deadline does.

One way to separate the two: at the end of a demanding week, ask what you actually did versus what you'd have chosen to spend the week on if nothing had been demanding anything. The gap between those two lists is usually where your real direction is waiting.`,
    quickDefinition: 'Urgency and importance get confused constantly — almost everything that shouts loudest is urgent, not important. Real direction usually comes from a quieter, more consistent place.',
    howItMayShowUp: [
      'A full inbox or task list that feels like direction but doesn’t actually point anywhere',
      'Ending demanding weeks having done a lot, but not the things you’d have chosen',
      'A recurring idle-moment thought or interest you keep returning to, unprompted',
      'Difficulty answering "what do you actually want" despite being very busy',
    ],
    possibleRoots: [
      'May reflect an environment that consistently rewarded responsiveness over reflection',
      'May be that direction hasn’t been asked about directly in a while, not that it’s missing',
      'May be genuine uncertainty that’s being covered over by staying busy',
    ],
    reflectionQuestions: [
      'At the end of a demanding week, what did you actually do versus what you’d have chosen to spend it on?',
      'What do you keep returning to in idle moments, when nothing is forcing your attention?',
      'What would you regret not having tried?',
    ],
    waysToWorkWithIt: [
      'Keep a short list, for one week, of what you’d choose to do if nothing were demanding anything',
      'Compare that list to what actually filled your week',
      'Bring what you notice into Decision Room if it points toward a real choice',
    ],
    recommendedRooms: ['decision'],
  },
  {
    slug: 'why-commitments-dont-stick',
    title: "Why Commitments Don't Stick (and What Helps)",
    taxonomyCategory: 'Direction & Creation', // spec §4: "Decision Making" / "Change & Transition" subtopics
    body: `A commitment usually fails for one of two very different reasons, and they need opposite fixes. Sometimes it fails because it was never really wanted — made under social pressure, or to sound like the "right" answer in the moment. Other times it fails because it was genuinely wanted, but nothing about daily life actually changed to make room for it.

Treating both failures the same way — as a willpower problem — misses what's actually going on in each case. A commitment nobody really wanted needs re-examining, not more discipline. A commitment that keeps losing to daily life needs a smaller, more concrete first step, not a bigger promise.

Before renewing a commitment that slipped, it's worth asking plainly: did I actually want this, or did I want to be the kind of person who wants this? The honest answer usually points straight at what needs to change.`,
    quickDefinition: 'A commitment usually fails for one of two very different reasons — it was never really wanted, or it was wanted but nothing in daily life made room for it. They need opposite fixes.',
    howItMayShowUp: [
      'Renewing the same commitment repeatedly without it ever sticking',
      'Feeling relief rather than disappointment when a commitment falls through',
      'Wanting to be the kind of person who does something, more than wanting the thing itself',
      'A commitment that keeps losing out to daily life, no matter how it’s scheduled',
    ],
    possibleRoots: [
      'May have been made under social pressure or to sound like the "right" answer at the time',
      'May be genuinely wanted but missing a small enough first step to survive a busy week',
      'May reflect a mismatch between the size of the commitment and the amount of real room for it',
    ],
    reflectionQuestions: [
      'Did you actually want this, or did you want to be the kind of person who wants this?',
      'What, specifically, keeps beating it in your actual week?',
      'What would the smallest honest version of this commitment look like?',
    ],
    waysToWorkWithIt: [
      'Before renewing a commitment that slipped, ask the "did I actually want this" question directly',
      'If it’s genuinely wanted, shrink it to the smallest concrete first step rather than a bigger promise',
      'Bring it into Mirror Room’s COMMITMENT step or a Decision Room session to test it for real',
    ],
    recommendedRooms: ['mirror', 'decision'],
  },
]
