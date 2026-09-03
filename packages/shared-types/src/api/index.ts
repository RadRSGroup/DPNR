export * from './command-contract'
export * from './dashboard-twin-credits'
export * from './health'
export * from './account'
export * from './companion'
export * from './rooms'
export * from './library'
export * from './continuity'
export * from './webhooks'
export * from './open-threads'

/**
 * Every /v1 endpoint in MVP_ARCHITECTURE.md §4 now has a contract here.
 * One open item to revisit, not forgotten:
 * - account.ts's SessionTicketRequestSchema mirrors the already-committed
 *   SessionTicketItem fields, but the actual KMS wrap handshake needs a
 *   security-review pass before the Lambda is built.
 * webhooks.ts's GrowWebhookPayloadSchema is now Grow's real shape (Session
 * 18, see ADR 0008) — some fields (the success status value, whether this
 * arrives as JSON or form-encoded) are still unconfirmed against a real
 * sandbox transaction, flagged in that file's own doc comment.
 */
