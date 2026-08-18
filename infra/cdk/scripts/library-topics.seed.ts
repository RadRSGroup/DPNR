/**
 * Content Library catalog seed data (MVP_ARCHITECTURE.md §5.5, §3.2). No
 * spec docx section for authored topic content was available this
 * session (same access gap Session 5 had for Mirror Room's prompts) — all
 * 6 topics below are this session's own first-authored draft, written
 * Claude-native in the same warm/curious/non-diagnostic voice already
 * established for `decision_room`/`mirror_room`/`library` prompts, not
 * ported from anywhere. **Treat these as draft content needing explicit
 * product review before being final**, the same status Mirror Room's
 * design had before its own Session 6 review — see docs/AGENT_LOG.md.
 *
 * `taxonomyCategory` names are this session's own choice, loosely aligned
 * to `TwinSignalDomainSchema`'s 6 values (`packages/shared-types/src/dynamo/twin.ts`)
 * so a future signal-domain → topic-category recommendation mapping
 * (`lambda/library/recommendations.ts`'s still-open gap) has an obvious
 * place to start — this alignment is a convenience, not a commitment;
 * whoever builds that mapping should treat it as a hypothesis to check,
 * not an existing contract.
 */

export interface TopicSeed {
  slug: string
  title: string
  taxonomyCategory: string
  body: string
}

export const LIBRARY_TOPIC_SEEDS: TopicSeed[] = [
  {
    slug: 'understanding-your-patterns',
    title: 'Understanding Your Patterns',
    taxonomyCategory: 'Patterns & Habits',
    body: `A pattern isn't a flaw — it's a strategy that made sense once. Most of the patterns you notice in yourself today, whether it's going quiet in conflict or over-preparing before anything important, started as a reasonable response to something real. The problem isn't that the pattern exists; it's that it can keep running long after the situation that shaped it has changed.

Noticing a pattern is different from judging it. The first useful question usually isn't "why do I keep doing this?" but "what was this trying to protect, or get me, at the time it started?" That question tends to open things up instead of closing them down.

Patterns also tend to hide in plain sight because they feel like "just how I am." A pattern only becomes visible once you can name a specific moment it shows up — a particular kind of email, a particular tone of voice from someone, a particular hour of the night. Specificity is what turns a vague sense of "I always do this" into something you can actually work with.`,
  },
  {
    slug: 'what-triggers-you',
    title: 'What Triggers You, and Why',
    taxonomyCategory: 'Triggers',
    body: `A trigger is rarely about the thing that just happened — it's usually about what that thing reminds your nervous system of. A comment that seems small to everyone else in the room can land hard because it echoes something from years earlier. That's not oversensitivity; it's your body doing exactly what memory is for.

Triggers are also specific, not general. "I get anxious in meetings" is a starting point, but "I get anxious when someone interrupts me mid-sentence in a meeting" is something you can actually investigate. The more precisely you can describe the moment — who, what, when, what you noticed in your body first — the more the trigger stops feeling random.

Knowing a trigger doesn't obligate you to fix it immediately. Sometimes the most useful first step is just accurately naming it, without a plan attached — "this is a trigger for me" is a complete, useful sentence on its own.`,
  },
  {
    slug: 'values-vs-needs',
    title: "Values vs. Needs: What's Really Driving You",
    taxonomyCategory: 'Values & Needs',
    body: `Values and needs get used almost interchangeably, but they pull in different directions. A value is a direction you want to move in — honesty, growth, connection. A need is something that has to be met for you to function well right now — rest, safety, being heard. You can hold a value your whole life; a need is more urgent and more immediate.

Confusion between the two is where a lot of decision-paralysis lives. Choosing the option that serves a value ("I value ambition") while ignoring a real, present need ("I need to not be exhausted") usually isn't sustainable, even though it can look admirable from the outside.

A useful move is to ask both questions separately about the same situation: what does this decision serve in the long run, and what does it cost me right now? They don't always point the same way — and noticing when they don't is often more informative than either answer alone.`,
  },
  {
    slug: 'body-awareness-basics',
    title: 'Body Awareness: Listening to What You Feel',
    taxonomyCategory: 'Inner World',
    body: `Emotions show up in the body before they show up as words. Tightness in the chest, a dropped stomach, a jaw that's been clenched for an hour without you noticing — these are often the earliest, clearest signal that something matters, arriving well before you can articulate what it is.

Most people are trained to skip straight to the explanation ("I'm stressed because of the deadline") without ever pausing at the sensation itself. That skip isn't wrong, but it can mean the actual signal — the specific location, the specific quality of tightness or heaviness or restlessness — never gets used as information.

A body scan doesn't have to be elaborate. Noticing one sensation, naming where it is, and staying with it for a few breaths before reaching for an explanation is often enough to find something a fast, verbal read of the situation would have missed entirely.`,
  },
  {
    slug: 'finding-your-direction',
    title: 'Finding Direction When Everything Feels Urgent',
    taxonomyCategory: 'Direction & Focus',
    body: `Urgency and importance get confused constantly, and almost everything that shouts the loudest is urgent, not important. A full inbox creates a feeling of direction — something to do right now — without actually pointing anywhere. That feeling can be mistaken for having a focus, when it's really just having a queue.

Real direction usually comes from a much quieter place: a sense of what you'd regret not having tried, or what you keep returning to in idle moments even when nothing is forcing you to. It rarely announces itself as loudly as the next deadline does.

One way to separate the two: at the end of a demanding week, ask what you actually did versus what you'd have chosen to spend the week on if nothing had been demanding anything. The gap between those two lists is usually where your real direction is waiting.`,
  },
  {
    slug: 'why-commitments-dont-stick',
    title: "Why Commitments Don't Stick (and What Helps)",
    taxonomyCategory: 'Commitments & Follow-Through',
    body: `A commitment usually fails for one of two very different reasons, and they need opposite fixes. Sometimes it fails because it was never really wanted — made under social pressure, or to sound like the "right" answer in the moment. Other times it fails because it was genuinely wanted, but nothing about daily life actually changed to make room for it.

Treating both failures the same way — as a willpower problem — misses what's actually going on in each case. A commitment nobody really wanted needs re-examining, not more discipline. A commitment that keeps losing to daily life needs a smaller, more concrete first step, not a bigger promise.

Before renewing a commitment that slipped, it's worth asking plainly: did I actually want this, or did I want to be the kind of person who wants this? The honest answer usually points straight at what needs to change.`,
  },
]
