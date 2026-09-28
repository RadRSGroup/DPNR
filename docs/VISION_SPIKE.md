# Create My Vision — research spike (Wave 2 Slice 7, feedback #17)

> **Outcome (same session): the user chose to remove Create My Vision and go back to picture upload
> only.** This doc is kept in case the feature comes back.

*Session 76, 2026-09-27. Research only — no code changed, no samples generated yet.*

## The problem (founder, Living Feedback Log #17)

The output "looks as though the user's existing profile photo has been placed or pasted onto a generated
background." Wanted: the profile photo works as a **reference for the person**, and the result is **one
coherent generated scene**.

## Why the current pipeline looks pasted (`infra/cdk/lambda/account/vision-worker.ts`)

1. Stability remove-background cuts the person out of their photo.
2. jimp pastes the cut-out, unchanged, bottom-centre on a transparent 1792x1024 canvas.
3. Stability inpaint paints the scene into the transparent pixels only.

The person's pixels are never touched, by design (Session 67 chose this to keep the person exact and
avoid an invented hanging figure). So the person keeps the photo's own lighting, colour, grain, focus
and camera angle, and the edge is a hard cut-out. Whatever scene is painted around them, it reads as a
collage. **This can't be fixed with prompt wording; the pipeline has to change.**

## What this account can use (checked live, `aws bedrock list-foundation-models`)

- us-east-1: Stability editing tools (remove-background, inpaint, outpaint, search-replace,
  control-structure, control-sketch, style-guide, style-transfer, upscalers). Nova Canvas is LEGACY
  (end of life 2026-09-30) and blocked for this account.
- us-west-2 only: SD3.5 Large (text-to-image and **image-to-image** with `strength` 0–1),
  Stable Image Ultra, Stable Image Core.
- **Nothing on Bedrock takes a photo as an identity reference** (no subject-reference or face-ID model).

## Options

| | A. Harmonize pass (Bedrock) | B. Structure-guided redraw (Bedrock) | C. Identity-reference model (outside Bedrock) |
|---|---|---|---|
| How | Keep steps 1–3, then run the whole composite through SD3.5 Large image-to-image at low strength (~0.3–0.45), so light, colour, edges and grain are redrawn as one image | Stability control-structure with the profile photo as the structure guide; the whole image is generated from the prompt | A model built for "this person, in this scene": e.g. Google's Gemini image models, OpenAI image edits, Black Forest Labs FLUX Kontext, Stability's own "replace background and relight" (not on Bedrock), or an open-weight edit model (e.g. Qwen-Image-Edit, Apache-2.0) self-hosted on SageMaker |
| Coherent scene? | Better; may still look composited at low strength | Yes | Yes, this is what these models are for |
| Still looks like the person? | Mostly at ≤0.4; the face drifts as strength goes up | Weak: a lookalike, and stuck in the selfie's pose/framing | Good (varies by model) |
| Where the photo goes | Stays in AWS (one extra call to us-west-2, where the DR backups already live) | Stays in AWS, us-east-1 | **Hosted APIs: leaves AWS, to a new subprocessor.** SageMaker self-host: stays in AWS |
| Change size | Small: one extra model call in the worker, one extra IAM grant, ~+10–15s | Small: swap the pipeline in the worker | Hosted API: new secret, new provider, privacy/terms work. SageMaker: a GPU endpoint (real standing cost + ops) |
| Extra cost per image | One more Stability call (a few cents; confirm on the Bedrock pricing page) | About the same as today | Varies by provider; SageMaker adds hourly GPU cost unless run async/scale-to-zero |

## Privacy notes for C (why it isn't just a technical choice)

A face photo is personal data, and arguably biometric. Sending it to a provider outside AWS needs:
a DPA with a no-training/no-retention setting, a Privacy page and consent-copy update naming the
provider, and ideally a per-use notice on the Vision panel. This ties into the open DPNR-02
privacy-counsel review. The self-hosted SageMaker route avoids the new subprocessor, but adds a GPU
endpoint to run and pay for.

## Recommendation

1. **Try A first.** It's cheap, stays in AWS, and is a small change to the worker. Test it on a
   synthetic portrait at 2–3 strengths.
2. If A still looks pasted at any strength that keeps the face, **go to C**. That is a product and
   privacy decision for the user and founder, not something the agent picks.
3. B is listed for completeness only. Losing the person's likeness defeats the purpose.

## Samples (need the user's OK before running)

Plan: create a **synthetic** portrait with SD3.5 Large text-to-image (no real person), run the current
pipeline and A at strengths 0.3 / 0.4 / 0.5 on 2 scene prompts, and save the results to the
scratchpad for side-by-side review. Around 10–12 Bedrock image calls, well under $2. Nothing touches
DynamoDB, S3 or any user. A real profile photo is used only with the user's explicit OK.

## Caveats

The list of image models outside Bedrock moves fast, and model names here are as of the agent's
knowledge plus one catalog check (2026). Check each provider's current offering and terms before
picking one for C.
