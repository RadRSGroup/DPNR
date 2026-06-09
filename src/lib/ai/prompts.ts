export const prompts = {
  subtitle: (title: string) => ({
    system: `Generate a short, empathetic one-line frame for a decision title.
Keep it open, not prescriptive. Under 12 words. No advice.`,
    user: title,
  }),

  parseOptions: (narrative: string) => ({
    system: `Read this decision narrative and extract exactly two distinct options the person is facing.
Return ONLY valid JSON: { "optionA": "...", "optionB": "..." }
Each option: 1–2 sentences. Clear, non-judgmental, faithful to their words.`,
    user: narrative,
  }),

  refineOption: (optionText: string) => ({
    system: `Sharpen and clarify this decision option. Keep it faithful to the user's intent.
Make it specific, actionable, and emotionally honest. 1–2 sentences maximum.`,
    user: optionText,
  }),

  emotionReflection: (title: string, bodyLocation: string, emotion: string, narrative?: string) => ({
    system: `You are a somatic awareness guide walking someone through a difficult personal decision.
The person has just located a physical sensation in their body and named its emotional quality.

Write a 2–3 sentence reflection that:
- Connects the physical sensation directly to something specific in THEIR situation — reference the actual tension or dilemma they described, not generic themes
- Uses 1–2 of their own words or phrases from their narrative so it feels personal, not scripted
- Stays curious and tentative — use "perhaps", "it sounds like", "that might be", "as if" — never diagnostic
- Acknowledges the weight of what they're holding without trying to resolve it
- Reads like a wise, warm companion who truly listened — not a therapist, not a chatbot

No advice. No bullet points. No headers. Pure flowing prose.`,
    user: `Decision they're navigating: "${title}"

What they shared in their own words:
"${(narrative ?? '').slice(0, 600)}"

Where they feel it in the body: ${bodyLocation}
The emotional quality of that sensation: ${emotion}`,
  }),

  prosConsTags: (optionLabel: string, optionText: string, narrative: string) => ({
    system: `Based on this decision option, suggest likely pros and cons as short tag labels (2–4 words each).
Return ONLY valid JSON: { "pros": ["...", "..."], "cons": ["...", "..."] }
5–7 pros, 4–6 cons. Realistic, not optimistic bias.`,
    user: `Option ${optionLabel}: "${optionText}"\n\nContext: ${narrative.slice(0, 400)}`,
  }),

  fearDesireTags: (narrative: string) => ({
    system: `Based on this decision narrative, suggest desire and fear phrases.
Return ONLY valid JSON: { "desires": ["...", "..."], "fears": ["...", "..."] }
6 desires (what they truly want, 2–4 words each), 6 fears (what they're afraid of, 2–4 words each).`,
    user: narrative.slice(0, 600),
  }),

  valuesNeedsTags: (optionLabel: string, optionText: string) => ({
    system: `Based on this decision option, suggest values and needs associated with choosing it.
Return ONLY valid JSON: { "values": ["...", "..."], "needs": ["...", "..."] }
6 values (e.g. Growth, Security, Freedom, Integrity, Autonomy, Recognition).
For needs, choose only from the Six Human Needs: Certainty, Variety, Significance, Love & Connection, Growth, Contribution.
Return 3–6 needs that are most relevant to this option — do not invent other need labels.`,
    user: `Option ${optionLabel}: "${optionText}"`,
  }),

  futureProjection: (optionLabel: string, optionText: string) => ({
    system: `For someone considering this option, generate 4–5 realistic emotional/life states
they might feel in one year if they chose it.
Return ONLY valid JSON: { "statements": ["...", "..."] }
Mix positive and challenging. Honest, not optimistic bias. Short phrases 3–6 words each.`,
    user: `Option ${optionLabel}: "${optionText}"`,
  }),
}
