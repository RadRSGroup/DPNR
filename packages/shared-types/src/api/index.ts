export * from './command-contract'
export * from './dashboard-twin-credits'
export * from './health'
export * from './account'
export * from './companion'
export * from './rooms'
export * from './library'
export * from './continuity'
export * from './webhooks'

/**
 * Every /v1 endpoint in MVP_ARCHITECTURE.md §4 now has a contract here.
 * Two open items to revisit, not forgotten:
 * - account.ts's SessionTicketRequestSchema mirrors the already-committed
 *   SessionTicketItem fields, but the actual KMS wrap handshake needs a
 *   security-review pass before the Lambda is built.
 * - webhooks.ts's GrowWebhookEventSchema field names are unconfirmed
 *   against Grow's real docs (same caveat as apps/web/src/lib/grow.ts).
 */
