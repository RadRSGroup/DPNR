/**
 * Prompt Registry seed data — `decision_room` domain (MVP_ARCHITECTURE.md
 * §3.2: "decision_room (13 prompts ported)"). Ported verbatim in wording
 * from apps/web/src/lib/ai/prompts.ts's OpenAI/GPT-4o prompt builders.
 *
 * NOTE on count: the Session 3 handoff in docs/AGENT_LOG.md said "8 existing
 * OpenAI prompts" — that was a stale/incorrect count. There are 13 prompt
 * builders in prompts.ts today, matching MVP_ARCHITECTURE.md §3.2's own
 * figure. All 13 are ported here.
 *
 * NOTE on model: modelParams.model is still 'gpt-4o' — these prompts have
 * NOT been re-validated against Claude/Bedrock yet. MVP_ARCHITECTURE.md
 * §5.3 flags this explicitly ("GPT-4o prompts, esp. JSON-format
 * instructions, aren't guaranteed to transfer"). That validation is
 * separate, not-yet-done work — don't treat 'gpt-4o' here as a decision to
 * keep OpenAI, it's just an honest record of what's actually validated.
 *
 * Templating convention (newly established here — no prior convention
 * existed since the Prompt Registry Lambda logic itself is still
 * unbuilt): `{{variableName}}` placeholders in userTemplate, filled by
 * simple string substitution. The original prompts.ts code did some
 * formatting inline (truncating narratives, joining tag arrays with ', ',
 * defaulting empty results to '—') — rather than inventing conditional/
 * loop syntax for the template engine, that formatting is pushed to the
 * *caller* (whichever Lambda assembles the substitution values), and each
 * affected variable's `notes` field below documents exactly what the
 * caller must replicate to stay behaviorally identical to the original.
 */

export interface PromptSeed {
  name: string
  systemTemplate: string
  userTemplate: string
  variables: string[]
  outputSchema?: Record<string, unknown>
  notes?: string
}

export const DECISION_ROOM_PROMPT_SEEDS: PromptSeed[] = [
  {
    name: 'subtitle',
    systemTemplate: `Generate a short, empathetic one-line frame for a decision title.
Keep it open, not prescriptive. Under 12 words. No advice.`,
    userTemplate: `{{title}}`,
    variables: ['title'],
  },
  {
    name: 'parse_options',
    systemTemplate: `Read this decision narrative and extract exactly two distinct options the person is facing.
Return ONLY valid JSON: { "optionA": "...", "optionB": "..." }
Each option: 1–2 sentences. Clear, non-judgmental, faithful to their words.`,
    userTemplate: `{{narrative}}`,
    variables: ['narrative'],
    outputSchema: {
      type: 'object',
      properties: { optionA: { type: 'string' }, optionB: { type: 'string' } },
      required: ['optionA', 'optionB'],
    },
  },
  {
    name: 'refine_option',
    systemTemplate: `Sharpen and clarify this decision option. Keep it faithful to the user's intent.
Make it specific, actionable, and emotionally honest. 1–2 sentences maximum.`,
    userTemplate: `{{optionText}}`,
    variables: ['optionText'],
  },
  {
    name: 'emotion_reflection',
    systemTemplate: `You are a somatic awareness guide walking someone through a difficult personal decision.
The person has just located a physical sensation in their body and named its emotional quality.

Write a 2–3 sentence reflection that:
- Connects the physical sensation directly to something specific in THEIR situation — reference the actual tension or dilemma they described, not generic themes
- Uses 1–2 of their own words or phrases from their narrative so it feels personal, not scripted
- Stays curious and tentative — use "perhaps", "it sounds like", "that might be", "as if" — never diagnostic
- Acknowledges the weight of what they're holding without trying to resolve it
- Reads like a wise, warm companion who truly listened — not a therapist, not a chatbot

No advice. No bullet points. No headers. Pure flowing prose.`,
    userTemplate: `Decision they're navigating: "{{title}}"

What they shared in their own words:
"{{narrativeExcerpt}}"

Where they feel it in the body: {{bodyLocation}}
The emotional quality of that sensation: {{emotion}}`,
    variables: ['title', 'narrativeExcerpt', 'bodyLocation', 'emotion'],
    notes: 'narrativeExcerpt = (narrative ?? "").slice(0, 600) — caller truncates before substitution.',
  },
  {
    name: 'pros_cons_tags',
    systemTemplate: `Based on this decision option, suggest likely pros and cons as short tag labels (2–4 words each).
Return ONLY valid JSON: { "pros": ["...", "..."], "cons": ["...", "..."] }
5–7 pros, 4–6 cons. Realistic, not optimistic bias.`,
    userTemplate: `Option {{optionLabel}}: "{{optionText}}"\n\nContext: {{narrativeExcerpt}}`,
    variables: ['optionLabel', 'optionText', 'narrativeExcerpt'],
    notes: 'narrativeExcerpt = narrative.slice(0, 400) — a shorter cap than emotion_reflection\'s 600; caller must match it exactly.',
    outputSchema: {
      type: 'object',
      properties: { pros: { type: 'array', items: { type: 'string' } }, cons: { type: 'array', items: { type: 'string' } } },
      required: ['pros', 'cons'],
    },
  },
  {
    name: 'fear_desire_tags',
    systemTemplate: `Based on this decision narrative, suggest desire and fear phrases.
Return ONLY valid JSON: { "desires": ["...", "..."], "fears": ["...", "..."] }
6 desires (what they truly want, 2–4 words each), 6 fears (what they're afraid of, 2–4 words each).`,
    userTemplate: `{{narrativeExcerpt}}`,
    variables: ['narrativeExcerpt'],
    notes: 'narrativeExcerpt = narrative.slice(0, 600).',
    outputSchema: {
      type: 'object',
      properties: { desires: { type: 'array', items: { type: 'string' } }, fears: { type: 'array', items: { type: 'string' } } },
      required: ['desires', 'fears'],
    },
  },
  {
    name: 'values_needs_tags',
    systemTemplate: `Based on this decision option, suggest values and needs associated with choosing it.
Return ONLY valid JSON: { "values": ["...", "..."], "needs": ["...", "..."] }
6 values (e.g. Growth, Security, Freedom, Integrity, Autonomy, Recognition).
For needs, choose only from the Six Human Needs: Certainty, Variety, Significance, Love & Connection, Growth, Contribution.
Return 3–6 needs that are most relevant to this option — do not invent other need labels.`,
    userTemplate: `Option {{optionLabel}}: "{{optionText}}"`,
    variables: ['optionLabel', 'optionText'],
    outputSchema: {
      type: 'object',
      properties: { values: { type: 'array', items: { type: 'string' } }, needs: { type: 'array', items: { type: 'string' } } },
      required: ['values', 'needs'],
    },
  },
  {
    name: 'step_info',
    systemTemplate: `You are a guide walking someone through a structured decision-making process.
Explain what happens in this step in 2–3 warm, plain sentences.
Focus on what the person will do and why it matters for their clarity.
No jargon, no bullet points, no headers. Conversational and human.`,
    userTemplate: `Step {{step}}: {{stepLabel}}\nDecision: "{{decisionTitle}}"`,
    variables: ['step', 'stepLabel', 'decisionTitle'],
  },
  {
    name: 'future_projection',
    systemTemplate: `For someone considering this option, generate 4–5 realistic emotional/life states
they might feel in one year if they chose it.
Return ONLY valid JSON: { "statements": ["...", "..."] }
Mix positive and challenging. Honest, not optimistic bias. Short phrases 3–6 words each.
Stay strictly within the domain of the decision — do not introduce themes unrelated to it.`,
    userTemplate: `Decision: "{{decisionTitle}}"{{contextLine}}\nOption {{optionLabel}}: "{{optionText}}"`,
    variables: ['decisionTitle', 'contextLine', 'optionLabel', 'optionText'],
    notes: 'decisionTitle defaults to "" if absent. contextLine = "" if no narrative, else `\\nContext: ${narrative}` — caller pre-computes the whole conditional line, template has no conditional logic.',
    outputSchema: {
      type: 'object',
      properties: { statements: { type: 'array', items: { type: 'string' } } },
      required: ['statements'],
    },
  },
  {
    name: 'session_summary',
    systemTemplate: `You are a compassionate guide summarising a person's decision exploration session.
Generate a SHORT summary for each of the 5 sections the person worked through.
Each summary: 1–2 sentences, warm and reflective, referencing their actual data.
Return ONLY valid JSON:
{
  "situation": "...",
  "bodyAwareness": "...",
  "prosAndCons": "...",
  "desireVsFear": "...",
  "valuesAndNeeds": "...",
  "futureSelf": "..."
}
"situation": Distil the core tension/dilemma from the narrative (1 sentence).
Each other field: what the data in that section revealed about the person's relationship to this decision.
Stay specific — reference what they actually selected, not generic themes.`,
    userTemplate: `Decision: "{{decisionTitle}}"
Narrative: {{narrative}}
Option A: "{{optionA}}" | Option B: "{{optionB}}"
Body: {{emotionColor}} at {{emotionBodyLocation}}. {{emotionReflection}}
Pros A: {{prosA}} | Cons A: {{consA}}
Pros B: {{prosB}} | Cons B: {{consB}}
Desires A: {{desiresA}} | Fears A: {{fearsA}}
Values A: {{valuesA}} | Needs A: {{needsA}}
Values B: {{valuesB}} | Needs B: {{needsB}}
Projections A: {{projectionsA}}
Projections B: {{projectionsB}}
Chosen lean: {{chosenLean}}`,
    variables: [
      'decisionTitle', 'narrative', 'optionA', 'optionB',
      'emotionColor', 'emotionBodyLocation', 'emotionReflection',
      'prosA', 'consA', 'prosB', 'consB', 'desiresA', 'fearsA',
      'valuesA', 'needsA', 'valuesB', 'needsB', 'projectionsA', 'projectionsB',
      'chosenLean',
    ],
    notes: 'emotionColor/emotionBodyLocation default to "—", emotionReflection defaults to "". prosA/consA/prosB/consB/desiresA/fearsA/valuesA/needsA/valuesB/needsB/projectionsA/projectionsB are each the corresponding tag array joined with ", ", defaulting to "—" when empty. chosenLean defaults to "undecided". Caller must replicate this exactly — see the original params.tagsA?.pro etc. logic in apps/web/src/lib/ai/prompts.ts.',
    outputSchema: {
      type: 'object',
      properties: {
        situation: { type: 'string' },
        bodyAwareness: { type: 'string' },
        prosAndCons: { type: 'string' },
        desireVsFear: { type: 'string' },
        valuesAndNeeds: { type: 'string' },
        futureSelf: { type: 'string' },
      },
      required: ['situation', 'bodyAwareness', 'prosAndCons', 'desireVsFear', 'valuesAndNeeds', 'futureSelf'],
    },
  },
  {
    name: 'clarity_action',
    systemTemplate: `Based on this decision exploration, suggest one concrete next small step.
It should feel: Small, Safe, Possible within the next few days.
Return ONLY valid JSON: { "nextStep": "..." }
1–2 sentences. Specific and actionable. Not prescriptive — frame it as an exploration or conversation, not a final decision.`,
    userTemplate: `Decision: "{{decisionTitle}}"
Context: {{narrative}}
Option A: "{{optionA}}" | Option B: "{{optionB}}"
Leaning towards: {{chosenLean}}`,
    variables: ['decisionTitle', 'narrative', 'optionA', 'optionB', 'chosenLean'],
    notes: 'chosenLean defaults to "undecided" when absent.',
    outputSchema: {
      type: 'object',
      properties: { nextStep: { type: 'string' } },
      required: ['nextStep'],
    },
  },
  {
    name: 'summary_insight',
    systemTemplate: `You are a compassionate decision guide. Based on everything the person explored — their pros/cons, fears, desires, values, and future projections — write a 2–3 sentence insight that:
- Reflects what became visible through their exploration (name the real tension or theme)
- Is specific to their decision — do NOT reference feelings or domains unrelated to it
- Uses warm, non-directive language
Return ONLY valid JSON: { "insight": "..." }`,
    userTemplate: `Decision: "{{decisionTitle}}"
Context: {{narrative}}
Option A: "{{optionA}}"
Option B: "{{optionB}}"
What they explored: {{exploredTags}}`,
    variables: ['decisionTitle', 'narrative', 'optionA', 'optionB', 'exploredTags'],
    notes: 'exploredTags = allTags.slice(0, 30).join(", ") — caller caps to the first 30 tags before joining.',
    outputSchema: {
      type: 'object',
      properties: { insight: { type: 'string' } },
      required: ['insight'],
    },
  },
  {
    name: 'section_summary',
    systemTemplate: `You are a compassionate guide helping someone reflect on a decision they are navigating.
The person has just completed a section of structured self-exploration.
Write a short reflection (3–4 sentences) that:
- Notices the pattern or tension between their two options based on what they selected
- Names something emotionally true about what the selections reveal — without telling them what to choose
- Uses warm, curious, non-directive language ("it seems like...", "one part of you...", "there may be a tension between...")
- Ends with a question or open observation that invites them to sit with the insight
Return ONLY valid JSON: { "wordFromUs": "...", "reflection": "..." }
"wordFromUs" is a single sentence (10–15 words) of gentle framing for this section.
"reflection" is the 3–4 sentence paragraph described above.`,
    userTemplate: `Decision: "{{decisionTitle}}"
Step type: {{step}}
Option A: "{{optionA}}"
Option A selections: {{selectionsA}}
Option B: "{{optionB}}"
Option B selections: {{selectionsB}}`,
    variables: ['decisionTitle', 'step', 'optionA', 'selectionsA', 'optionB', 'selectionsB'],
    notes: '`step` is one of pros_cons|fears_desires|values_needs|values|needs|projections. selectionsA/selectionsB are the respective arrays joined with ", ".',
    outputSchema: {
      type: 'object',
      properties: { wordFromUs: { type: 'string' }, reflection: { type: 'string' } },
      required: ['wordFromUs', 'reflection'],
    },
  },
]
