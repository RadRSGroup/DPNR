# Mirror Room depth vs. the Figma journey (#30 / #31) — review

*Session 77, 2026-09-28. Review only; nothing here is built. Source: founder feedback #29–#31, #37 and Appendix B ("Adaptive does not mean shallow"). The 12 Figma stage names come from Session 71's read of the approved Figma file ("DPNR MLP Designs (Frame Copy)"). The individual frames were not re-opened for this review, so check each stage's interaction in Figma before building it.*

## What the founder asked

- Keep the current Mirror design as the foundation. Use Figma only as the reference for the missing experiential stages (#29).
- Preserve depth and pacing: reflection, containment, emotion exploration, body awareness, pause, meaning-making, integration, summary. "Do not force depth. Do not prematurely end depth." (#30)
- The 12 stages are an *experience*, not 12 questions, 12 backend states or 12 API steps. A stage can be a pause, a visual moment or a reflection (#31).

## Figma's 12 stages vs. today's flow

Today the backend has 6 steps (`infra/cdk/lambda/rooms/mirror-steps/*`), each one screen:

| # | Figma stage | Where it lives today | Status |
|---|---|---|---|
| 1 | Situation | Step 1 SITUATION: "What happened?" + "What triggered this for you?" (entry-aware since Session 72, pattern picker since Session 77) | Covered |
| 2 | Automatic | Step 2: "What went through your mind in that moment?" + "What did you actually do or say?" | Covered |
| 3 | Emotion underneath | Step 2: "What did you feel?" (emotion chips + own words) | **Partial.** It asks for the felt emotion, not the quieter one underneath it (e.g. anger → hurt). |
| 4 | Strategy | Step 3: "How did you cope with it afterward?" | Mostly covered. It asks about the *after*, not the protective strategy in the moment. |
| 5 | Payoff | — | **Missing.** Nothing asks what the reaction protected them from or gave them. |
| 6 | Cost | Step 4: "How did this affect your energy or mood?" + "Which part of your life does this touch most?" | Covered |
| 7 | Origin | — | **Missing**, and deliberately risky: #37 says no invented roots or childhood causes. It can only be user-led and optional. |
| 8 | Deeper belief | — | **Missing.** Nothing asks what the moment seemed to say about them. |
| 9 | Body | Step 2: body map (the person places each emotion; DPNR never picks the spot) | Covered (Session 72) |
| 10 | Summary | Step 5: AI synthesis | Covered |
| 11 | Support | — | **Missing.** There's no containment moment and no "what would support you" before the ending. |
| 12 | New possibility | Step 6: "What are you committing to from here?" | Covered in function. The copy leans towards a task ("committing"), where Figma's wording is softer. |

Pauses and containment: apart from the body-video moment in Step 2, the flow moves straight from one answer screen to the next. There's no breathing space between the heavier questions and the summary.

**Verdict.** The flow covers 7 of the 12 stages fully or mostly, and 1 partially (Emotion underneath). 4 are missing: Payoff, Origin, Deeper belief and Support. There are also no pause or containment moments. This is the "optimized into a few efficient questions" risk that #30 warns about.

## Proposed approach: adaptive depth without forcing it

Keep the 6 backend steps. Add the missing stages as **optional depth moments inside existing steps**, offered only when the material invites it, plus two frontend-only containment screens:

1. **"Stay with this a little longer" choice** (frontend-only). After Step 2's reflection and after Step 4, offer *Go a little deeper* or *Continue*. Continue keeps today's flow exactly as it is. Going deeper opens the optional moments below. This follows #30 in both directions: depth isn't forced, and it isn't cut short.
2. **Emotion underneath** (Step 2, optional): "Is there something quieter underneath that feeling?" Offer the same chip palette plus own words.
3. **Payoff** (Step 3, optional): "What did that reaction protect you from, or give you, in that moment?"
4. **Deeper belief** (Step 3 or 4, optional): "What did this moment seem to say about you?" The AI only reflects the person's own words back.
5. **Origin** (optional, user-led, never prompted by the AI): "Does this feel familiar from earlier in your life? Only if you want to go there." Skip is the default, and nothing is inferred when it's skipped.
6. **Containment pause before the synthesis** (frontend-only): a short breath/pause screen using the existing Breath modal rhythm and MOTION.md tokens, with nothing to answer.
7. **Support** (fold into Step 6, copy change plus an optional field): "What would support you the next time this shows up?" before the commitment. Soften "committing" towards Figma's "new possibility".

## What this touches (the flags #31/Appendix B ask for)

- **Frontend-only, safe to build first:** 1 (the choice UI, provided it records nothing), 6 (the pause screen), and the copy part of 7.
- **Backend + persistence (needs approval):** 2, 3, 4, 5 and the Support field. These are new optional fields inside the encrypted Mirror content (same pattern as `emotionsFelt`), a `normalize`/`withAnswers` extension, and new prompt variables for `reflection`, `synthesis` and the COMMITMENT summary that feeds Twin extraction. Deploy order: Lambda first, then re-seed prompts, then push the frontend, the same as Slice 3.
- **Twin/AI logic:** feeding payoff/belief/origin into Twin extraction would make the Digital Twin learn from more sensitive material. Recommendation: use them in the reflection and synthesis only, and **don't** send Origin to `twin/extract_signals` without an explicit product decision.
- **Safety:** Origin and Deeper-belief answers are more likely to surface distress. They should go through the same safety classifier as other free-text step answers, which the command engine already does for step input. Confirm in the build.
- **Cost:** no new paid calls if the optional answers just enrich the existing two REFINEs. A separate reflection per depth moment would add credits, which is a product call.

## From this session's live check (two real sessions, 2026-09-28)

- A reference-pattern entry was explored, not re-identified, and "Help me notice" produced one tentative, rejectable suggestion. Both behave as #33/#34 intend.
- Prompt-tuning candidates for the next prompt pass: (a) the synthesis for a *reference* pattern was more assertive than its reflection ("You saw avoidance appear…"), where "may have" wording would fit better; (b) in a help-identify session the pattern question was asked twice, in the reflection and again in the synthesis. The synthesis could acknowledge it without asking again.

## Recommended next step

Get the founder's go/no-go per item. A sensible first slice is the frontend-only part: the depth choice, the containment pause and the Support copy. Then do one backend slice for the optional depth fields (without Origin going to the Twin), after an explicit OK.
