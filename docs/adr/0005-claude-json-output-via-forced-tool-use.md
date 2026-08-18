# ADR 0005 — JSON-output prompts use forced tool-use on Bedrock, not text-mode JSON

**Status:** Accepted (2026-08-18, Session 5 — prompt re-validation for Claude/Bedrock)

## Context

The 13 `decision_room` prompts ported into the Prompt Registry seed data (Session 4) were carried over verbatim from `apps/web/src/lib/ai/prompts.ts`, including their JSON-output convention: the system prompt ends with `Return ONLY valid JSON: { ... }`, paired with OpenAI's `response_format: { type: "json_object" }` API parameter (`apps/web/src/lib/ai/call.ts`'s `aiCallJSON`), which makes the API itself guarantee the response is a syntactically valid JSON object.

`MVP_ARCHITECTURE.md` §5.3 flagged this explicitly as unvalidated: "GPT-4o prompts, esp. JSON-format instructions, aren't guaranteed to transfer [to Claude/Bedrock]." That flag turns out to be concretely true, not just cautious hedging — Bedrock's Claude Converse API has **no equivalent to `response_format: json_object`**. A text instruction alone ("Return ONLY valid JSON") is not a hard guarantee with Claude: it can still prepend a sentence, wrap the object in a ` ```json ` fence, or otherwise produce non-parseable output around the JSON, since nothing at the API level constrains the response shape.

The reliable substitute, and Anthropic's own recommended pattern for structured output, is **forced tool-use**: define a tool whose `input_schema` is the desired JSON shape, force the model to call it (`tool_choice: {type: "tool", name: <fixed>}`), and read the arguments from the `tool_use` content block's `input` field. The model literally cannot respond with anything other than a call to that tool, so there is no free-text preamble or fencing to strip, and the `input` is already a parsed object, not a string to `JSON.parse`.

9 of the 13 seed prompts carry an `outputSchema` field (JSON-schema-shaped) that was already written in Session 4, intended for eventual validation — it maps directly onto this pattern as the tool's `input_schema`, with no new data needed.

## Decision

For any Prompt Registry entry with a non-null `outputSchema`, the (still-unbuilt) Prompt Registry Lambda **must** call Bedrock Converse with a single forced tool call built from that `outputSchema`, and parse the result from the tool_use block — never by treating the model's text output as a JSON string to parse. For entries with no `outputSchema` (plain text output), call normally and use the text response as-is.

Correspondingly, the 9 affected seed templates (`infra/cdk/scripts/decision-room-prompts.seed.ts`) had their `Return ONLY valid JSON: { ... }` restatements removed — the field names/types now live only in `outputSchema`, not duplicated as prompt text that could drift out of sync with it. Per-field *content* guidance those lines carried (counts, what each field should contain) was preserved, since that's still meaningful instruction independent of the enforcement mechanism.

The 4 plain-text prompts (no `outputSchema`) got an explicit "no preamble" instruction added instead, since forced tool-use isn't available to structurally prevent a chatty opening line for free text, and Claude is more prone to that than gpt-4o was under a terse system prompt.

## Consequences

- **The `outputSchema` field is now load-bearing for Lambda behavior, not just documentation.** Its presence/absence is the switch between "forced tool-use call" and "plain text call" — this must be the first thing read when the Prompt Registry Lambda is actually built. Documented directly on the field in `packages/shared-types/src/dynamo/global-tables.ts`.
- Also fixed while re-validating: the `modelParams.temperature` Zod bound was `.max(2)` (OpenAI's range) — narrowed to `.max(1)`, since Anthropic's Converse API clamps/rejects temperature above 1. No existing seed value was affected (all are 0.7), but a future session adding a prompt could otherwise set an invalid value that would only fail at call time.
- `modelParams.model` in `seed-prompt-registry.ts` was changed from `'gpt-4o'` to a Bedrock Claude model ID (`anthropic.claude-sonnet-4-5-20250929-v1:0`). **This is not empirically confirmed** — there is no AWS account or Bedrock access yet (see `docs/AGENT_LOG.md`). Treat it as a placeholder that must be checked against the real Bedrock model catalog for the chosen deploy region (`AWS_SETUP.md` step 3 already flags this same region/availability caveat) before the seed script is ever run against a real table.
- None of this was tested against a live Bedrock/Claude endpoint. This ADR records a design decision made from documented Anthropic/Bedrock API behavior, not a verified empirical result — the next session with real Bedrock access should treat the actual model output as the real test, not this review.
- This decision is specific to Bedrock/Claude prompts. If a future domain in the Prompt Registry ever targets a different model provider with its own native JSON mode, that domain's entries can use `outputSchema` differently — this ADR only binds the `decision_room` domain's current entries and the general Bedrock/Claude calling convention.
