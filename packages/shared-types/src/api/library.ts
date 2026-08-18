import { z } from 'zod'

/**
 * Content Library (MVP_ARCHITECTURE.md §5.5). Catalog itself is config-like,
 * versioned via the same alias mechanism as the Prompt Registry
 * (dynamo/global-tables.ts LibraryTopicVersionItem/LibraryTopicAliasItem) —
 * these are the decrypted, client-facing read shapes built on top of it.
 */

export const LibraryTopicSummarySchema = z.object({
  slug: z.string(),
  title: z.string(),
  taxonomyCategory: z.string(),
})
export type LibraryTopicSummary = z.infer<typeof LibraryTopicSummarySchema>

/** GET /v1/library/topics */
export const LibraryTopicsResponseSchema = z.object({
  topics: z.array(LibraryTopicSummarySchema),
})
export type LibraryTopicsResponse = z.infer<typeof LibraryTopicsResponseSchema>

/**
 * GET /v1/library/topics/{slug} — the authored topic plus an AI-generated
 * explanation layer personalized from the user's *confirmed* Digital Twin
 * signals only (spec is explicit: "not from unsupported assumptions",
 * MVP_ARCHITECTURE.md §5.5).
 */
export const LibraryTopicDetailResponseSchema = z.object({
  slug: z.string(),
  title: z.string(),
  taxonomyCategory: z.string(),
  body: z.string(), // authored content
  personalizedExplanation: z.string().nullable(), // null if no confirmed signals to personalize from yet
  promptRef: z.string().optional(), // present only when personalizedExplanation is non-null
})
export type LibraryTopicDetailResponse = z.infer<typeof LibraryTopicDetailResponseSchema>

/** GET /v1/library/recommendations — topics surfaced from confirmed Twin signals, ranked. */
export const LibraryRecommendationsResponseSchema = z.object({
  recommendations: z.array(
    z.object({
      topic: LibraryTopicSummarySchema,
      reason: z.string(), // short human-readable "why this", e.g. "Related to a confirmed pattern"
    })
  ),
})
export type LibraryRecommendationsResponse = z.infer<typeof LibraryRecommendationsResponseSchema>
