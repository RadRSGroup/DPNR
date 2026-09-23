/**
 * "The DPNR Method": six short pieces explaining the thinking behind the
 * product, shown as their own Library shelf and rotated into Featured Today.
 *
 * Source: the founder's "DPNR Platform function and concept overview"
 * document (causal hierarchy Values → Boundaries → Needs → Behavior, inside
 * creates the outside, internal cause vs. external effect, the five whys,
 * the journey stages, and the core question "Will I be loved if I do what's
 * right for me?"). Rewritten here as user-facing copy in the Library's
 * voice, drafted in Session 65 and **pending founder review**. Deliberately
 * left out: the DPNR Score / scoring rubrics (not built, so nothing here
 * promises a score) and the document's internal wording ("DocuPreneur",
 * "commoditizing needs", "manipulating the environment").
 *
 * Static and frontend-only on purpose: this is fixed product content, not
 * a catalog topic (no Explore Theme, no AI personalization layer), so it
 * doesn't belong in `dpnr-library-catalog` and needs no deploy to change.
 * English-only for now, same as the Library topics.
 */

export interface MethodSection {
  heading?: string
  paragraphs?: string[]
  bullets?: string[]
  /** Numbered, titled steps (the journey stages, the four layers). */
  steps?: { title: string; text: string }[]
}

export interface MethodPiece {
  slug: string
  title: string
  tagline: string
  image: string
  sections: MethodSection[]
  reflection: string
  /** Existing Library topics to continue with. Slugs must exist in the catalog. */
  relatedTopics: { slug: string; title: string }[]
}

export const DPNR_METHOD: MethodPiece[] = [
  {
    slug: `how-dpnr-works`,
    title: `How the DPNR Method Works`,
    tagline: `Why the inside creates the outside, and what that means for real change.`,
    image: `/images/library/header.webp`,
    sections: [
      {
        paragraphs: [
          `DPNR is built on one simple idea: the inside creates the outside. The way you act at work, in your relationships, and with yourself grows out of something deeper: what you value, the limits you hold, and the needs underneath them.`,
          `Every situation you bring here, however different it looks on the surface, has the same inner structure. Once you can see that structure, you can see where change is actually possible.`,
        ],
      },
      {
        heading: `Where most change starts`,
        paragraphs: [
          `Most attempts at change start on the outside: the habit, the argument, the job, the schedule. That can help for a while. But when the deeper layer stays the same, the same pattern tends to return in a new form: a new job with the same frustration, a new relationship with the same argument, a new plan that stalls in the same place.`,
        ],
      },
      {
        heading: `The four layers`,
        steps: [
          { title: `Values`, text: `What matters most to you. Your values set the direction.` },
          { title: `Boundaries`, text: `The limits that protect what you value: what you will and won’t agree to, give your time to, or accept.` },
          { title: `Needs`, text: `What you require to feel steady and whole. When boundaries hold, needs tend to be met.` },
          { title: `Behavior`, text: `What you actually do, the visible layer, often a need trying to get met.` },
        ],
      },
      {
        heading: `What DPNR helps you do`,
        paragraphs: [
          `Each part of the platform works with this same structure. The Library gives you language for what you’re experiencing. Mirror Room helps you look underneath a pattern that keeps repeating. Decision Room helps you make choices that fit what matters to you. Main Chat is there to think things through along the way.`,
          `The aim is not to force yourself to act differently. It’s to understand what drives you, so that your choices can move from reactive and rushed to calm and directed.`,
        ],
      },
    ],
    reflection: `Think of one situation that keeps repeating in your life. When it happens, what do you usually try to change: the situation, or something in you?`,
    relatedTopics: [
      { slug: `values`, title: `Values` },
      { slug: `boundaries`, title: `Boundaries` },
      { slug: `needs-vs-neediness`, title: `Needs vs. Neediness` },
    ],
  },
  {
    slug: `values-boundaries-needs-behavior`,
    title: `Values, Boundaries, Needs, Behavior`,
    tagline: `The four layers underneath everything you do, and how they connect.`,
    image: `/images/library/themes/need-art.webp`,
    sections: [
      {
        paragraphs: [
          `At the heart of DPNR is a simple chain. Your values shape the boundaries you hold. Your boundaries determine whether your needs are met. And your needs drive your behavior. Behavior is what you and others see, but it is usually the last link, not the first.`,
        ],
      },
      {
        heading: `Each layer`,
        steps: [
          { title: `Values`, text: `Deeply held priorities such as integrity, family, growth, freedom, security, creativity, or service. They guide your decisions whether or not you have named them.` },
          { title: `Boundaries`, text: `Where values become practical. A boundary is the line that protects something you value, like keeping certain hours for the people you love, or refusing work that asks you to compromise your principles.` },
          { title: `Needs`, text: `Connection, rest, autonomy, recognition, safety, meaning. When a boundary holds, the need behind it can be met. When it gives way, the need goes unmet and starts asking for attention.` },
          { title: `Behavior`, text: `What you do: how you react, what you avoid, what you push for. Behavior is often an unmet need looking for a way to be met, sometimes in a way that works and sometimes in a way that costs you.` },
        ],
      },
      {
        heading: `An example`,
        paragraphs: [
          `Say family is one of your core values. A boundary that protects it might be keeping weekends for the people close to you. Underneath is a need for connection and time together.`,
          `Now imagine an important client keeps asking for weekend work, and you keep saying yes. The boundary gives way, the need for connection goes unmet, and what shows up is behavior: irritability at home, working late to “get it over with”, or pulling away from the people you are doing it all for. Trying to fix only the irritability misses where it comes from.`,
        ],
      },
      {
        heading: `Reading the chain in both directions`,
        paragraphs: [
          `You can start from a behavior you want to understand and work down: what need might this be serving, which boundary gave way, and what value was it protecting? Or you can start from your values and work up: what boundaries would protect this, and what would that change in how you act?`,
        ],
      },
    ],
    reflection: `Pick one behavior of yours you would like to change. What need might it be trying to meet, and which boundary around that need has been hard to hold?`,
    relatedTopics: [
      { slug: `values`, title: `Values` },
      { slug: `boundaries`, title: `Boundaries` },
      { slug: `six-broad-human-needs`, title: `Six Broad Human Needs` },
    ],
  },
  {
    slug: `cause-and-effect`,
    title: `Cause and Effect: Living From the Inside Out`,
    tagline: `Are you reacting to what happens, or acting from what matters?`,
    image: `/images/library/themes/patterns-art.webp`,
    sections: [
      {
        paragraphs: [
          `There are two broad ways of relating to your life. In one, life mostly happens to you: circumstances, other people, and pressure are the cause, and you are dealing with the effect. In the other, you notice the values, boundaries, and needs behind your reactions, and respond from there.`,
          `Nobody lives entirely in one or the other. Circumstances are real, and some things genuinely are outside your control. The question is where you look first when something isn’t working.`,
        ],
      },
      {
        heading: `When you’re responding from the outside`,
        bullets: [
          `Your decisions depend mostly on what others will think, or on the outcome you hope to get.`,
          `You realize something needs to change only when people complain or you are overwhelmed.`,
          `You try to feel better by changing the situation fast: working harder, fixing, managing, pleasing.`,
          `Success, money, or recognition are asked to fill a gap that isn’t really about them.`,
        ],
      },
      {
        heading: `When you’re responding from the inside`,
        bullets: [
          `You notice early, often in your body, when you are out of line with what matters to you.`,
          `You can disappoint someone and still feel at peace with your choice.`,
          `You look at your own response before trying to control everything around you.`,
          `A setback becomes something to learn from rather than a verdict on you.`,
        ],
      },
      {
        heading: `Why this matters`,
        paragraphs: [
          `The outside is where the effect shows up, but the inside is usually where you can act. When a reflection in DPNR points outward (“because they…”, “because work…”), that isn’t wrong. It is a signal to go one layer deeper and find the part of the situation that is yours to change.`,
        ],
      },
    ],
    reflection: `When something in your life needs to change, how do you usually find out: from the outside (pressure, complaints, burnout), or from a quieter inner sense that you are out of line with yourself?`,
    relatedTopics: [
      { slug: `emotion-vs-reaction`, title: `Emotion vs. Reaction` },
      { slug: `self-worth-vs-performance`, title: `Self-Worth vs. Performance` },
      { slug: `control`, title: `Control` },
    ],
  },
  {
    slug: `asking-why`,
    title: `Asking Why Until You Reach the Root`,
    tagline: `A simple practice for getting underneath a problem to the layer you can act on.`,
    image: `/images/library/themes/me-art.webp`,
    sections: [
      {
        paragraphs: [
          `DPNR borrows a simple tool from continuous-improvement practice: when something goes wrong, ask “why?” again and again (about five times) until you reach a cause you can actually do something about.`,
        ],
      },
      {
        heading: `The classic example`,
        steps: [
          { title: `You were caught speeding on the way to work.`, text: `Why? You were running late.` },
          { title: `You were running late.`, text: `Why? You overslept.` },
          { title: `You overslept.`, text: `Why? The alarm didn’t go off.` },
          { title: `The alarm didn’t go off.`, text: `Why? The batteries were dead.` },
          { title: `The batteries were dead.`, text: `Why? You forgot to replace them. That is the root, and it is actionable: a plug-in clock, or a routine for changing batteries.` },
        ],
      },
      {
        heading: `Turning it inward`,
        paragraphs: [
          `The same practice works on the inner layers. “I snapped at my partner last night.” Why? I was exhausted and on edge. Why? I worked until ten again. Why? I said yes to another deadline. Why? I didn’t want the client to think I’m not committed. Why? Somewhere, I believe my value depends on never letting anyone down.`,
          `Now the place to act isn’t “be nicer tonight.” It’s the boundary around your time, and the belief that ties your worth to other people’s approval.`,
        ],
      },
      {
        heading: `A few guidelines`,
        bullets: [
          `Stay curious, not accusatory. You are looking for a cause, not a culprit.`,
          `Stop when you reach something you can act on. That may take fewer or more than five whys.`,
          `There can be more than one branch. Follow the one that feels most alive.`,
          `If an answer points outward (“because they…”), ask what that touched in you.`,
        ],
      },
    ],
    reflection: `Take one moment from this week that bothered you. Ask “why?” five times and write each answer down. Which layer did you land on: behavior, need, boundary, or value?`,
    relatedTopics: [
      { slug: `limiting-beliefs`, title: `Limiting Beliefs` },
      { slug: `emotional-triggers`, title: `Emotional Triggers` },
      { slug: `self-worth-vs-performance`, title: `Self-Worth vs. Performance` },
    ],
  },
  {
    slug: `the-journey`,
    title: `The Stages of the DPNR Journey`,
    tagline: `From noticing to lasting change: how growth tends to unfold.`,
    image: `/images/library/themes/choose-art.webp`,
    sections: [
      {
        paragraphs: [
          `Change in DPNR follows a natural sequence. You don’t need to push through it in order, and you will likely move back and forth, but it helps to know where you are.`,
        ],
      },
      {
        steps: [
          { title: `Awareness`, text: `Connecting with what you feel and sense, and starting to recognize your patterns, coping habits, and the beliefs that keep producing the same outcomes.` },
          { title: `Self-Discovery`, text: `Uncovering what you truly want, value, and fear, and telling the difference between the story of your past and the person you want to become.` },
          { title: `Values and Boundaries`, text: `Seeing how well your boundaries protect what you value, and how that shows up in your needs and behavior. Then shaping boundaries that serve your real, healthy needs.` },
          { title: `New Tools`, text: `Learning practical ways to meet your emotions and reactions at the level of cause, so you can respond differently than you used to.` },
          { title: `Taking Action`, text: `Bringing what you are learning into everyday situations, from the hard moments to the good ones, until it becomes part of how you live.` },
          { title: `Change`, text: `Seeing clearly what no longer serves you, and setting new directions that fit your values and needs, in work, relationships, and life.` },
          { title: `Maintenance and Growth`, text: `Checking new circumstances against the values and boundaries you have defined, and noticing when your values themselves are shifting, so the cycle can begin again.` },
        ],
      },
      {
        heading: `Not a straight line`,
        paragraphs: [
          `New circumstances will sometimes send you back to awareness. That isn’t failure; it is the process working. Each time through, you start from a deeper understanding of yourself.`,
        ],
      },
    ],
    reflection: `Which stage feels closest to where you are right now, and what would one small step into the next stage look like?`,
    relatedTopics: [
      { slug: `integration`, title: `Integration` },
      { slug: `future-self`, title: `Future Self` },
      { slug: `decision-making`, title: `Decision-Making` },
    ],
  },
  {
    slug: `the-core-question`,
    title: `Will I Be Loved If I Do What’s Right for Me?`,
    tagline: `The question at the heart of DPNR.`,
    image: `/images/library/themes/repair-art.webp`,
    sections: [
      {
        paragraphs: [
          `Many people carry this question without ever saying it out loud. It shows up when you hesitate to say no, hide a need, agree to something that doesn’t fit, or stay in a role you have outgrown, because part of you fears that being true to yourself could cost you connection.`,
        ],
      },
      {
        heading: `Answering it from the inside`,
        paragraphs: [
          `The core idea of DPNR is that this question can only be answered with certainty from within. That means looking inside, understanding what you find there, accepting it, and caring for it, regardless of how you expect others to react.`,
          `This kind of self-love isn’t self-indulgence. It is what makes boundaries possible. When your worth no longer depends on approval, saying no stops feeling like a threat, and choosing what is right for you stops feeling like a risk to every relationship you have.`,
        ],
      },
      {
        heading: `When the connection is lost`,
        paragraphs: [`Losing touch with what is inside often shows up in familiar ways:`],
        bullets: [
          `Work that used to satisfy you no longer does.`,
          `Something isn’t working and you can’t say why.`,
          `You don’t know what you want, or why you aren’t happy.`,
          `A persistent, restless feeling of “what’s next?”`,
        ],
      },
      {
        paragraphs: [
          `These are not signs that something is wrong with you. They are signals that the outside of your life has drifted from the inside, and an invitation to reconnect.`,
        ],
      },
    ],
    reflection: `Where are you holding back something true about yourself because you’re unsure how it will be received?`,
    relatedTopics: [
      { slug: `self-love`, title: `Self-Love` },
      { slug: `self-respect`, title: `Self-Respect` },
      { slug: `people-pleasing`, title: `People-Pleasing` },
      { slug: `authenticity`, title: `Authenticity` },
    ],
  },
]

export function getMethodPiece(slug: string): MethodPiece | undefined {
  return DPNR_METHOD.find((piece) => piece.slug === slug)
}

/** Rough reading time at ~200 words per minute, rounded up. */
export function readingMinutes(piece: MethodPiece): number {
  const text = piece.sections
    .flatMap((s) => [s.heading ?? '', ...(s.paragraphs ?? []), ...(s.bullets ?? []), ...(s.steps ?? []).flatMap((st) => [st.title, st.text])])
    .concat(piece.reflection)
    .join(' ')
  return Math.ceil(text.split(/\s+/).filter(Boolean).length / 200)
}

/**
 * Which method pieces this viewer has opened, so Featured Today can walk a
 * new user through them in order (first unread piece first). A per-viewer
 * convenience only: browser storage can be empty, blocked, or throw (private
 * windows, cleared data), in which case every piece simply counts as unread
 * and the walk-through starts from the first piece again. Never used for
 * anything that must persist.
 */
const METHOD_READ_KEY = 'dpnr.methodRead'

export function readMethodSlugs(): Set<string> {
  try {
    const raw = window.localStorage.getItem(METHOD_READ_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [])
  } catch {
    return new Set()
  }
}

export function markMethodRead(slug: string): void {
  try {
    const read = readMethodSlugs()
    if (read.has(slug)) return
    read.add(slug)
    window.localStorage.setItem(METHOD_READ_KEY, JSON.stringify([...read]))
  } catch {
    // Storage unavailable: the piece just stays "unread" for Featured Today.
  }
}
