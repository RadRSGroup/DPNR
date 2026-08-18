import { z } from 'zod'

/** GET /v1/health — unauthenticated, proves the API Gateway → Lambda wiring works. Not a product endpoint. */
export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('dpnr-api'),
  timestamp: z.string().datetime(),
})
export type HealthResponse = z.infer<typeof HealthResponseSchema>
