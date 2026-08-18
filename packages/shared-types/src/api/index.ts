export * from './command-contract'
export * from './dashboard-twin-credits'
export * from './health'

/**
 * Not yet typed — see MVP_ARCHITECTURE.md §4 for the full endpoint list.
 * Add schemas here as each is actually built, rather than speculatively
 * up front: auth/account (session-ticket, logout, password change, delete
 * account, GET /v1/keys), Companion message/context, room creation
 * (POST /v1/rooms/decision|mirror, GET .../full — the read side probably
 * just returns arrays of the Dynamo item types in ../dynamo, decrypted),
 * Content Library (topics, recommendations), Daily Card / Weekly Recap
 * reads, Commitments, and the payment webhook.
 */
