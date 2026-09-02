import type {
  RoomCommandRequest,
  RoomCommandResponse,
  ConsentResponse,
  DecisionRoomFullResponse,
  MirrorRoomFullResponse,
  UserExportResponse,
  DeleteAccountResponse,
  DashboardResponse,
  CompanionMessageRequest,
  CompanionMessageResponse,
  CompanionContextResponse,
  LibraryTopicDetailResponse,
  TwinListResponse,
  TwinSignalActionResponse,
  LibraryTopicsResponse,
  LibraryRecommendationsResponse,
  RoadmapProposalAcceptResponse,
  RoadmapProposalRejectResponse,
  CreditsResponse,
  CreditsPurchaseRequest,
  CreditsPurchaseResponse,
  DailyCardFeedbackRequest,
  DailyCardFeedbackResponse,
  DecisionsListResponse,
  MirrorsListResponse,
  CreditsTransactionsResponse,
  CreateCommitmentRequest,
  CreateCommitmentResponse,
  CompleteCommitmentResponse,
  CommitmentsResponse,
  PlansResponse,
  UserKeysRequest,
  UserKeysResponse,
  SessionTicketRequest,
  SessionTicketResponse,
  SessionTicketPublicKeyResponse,
  RevokeSessionResponse,
} from '@dpnr/shared-types'
import { getIdToken } from '../cognito/client'

const API_URL = process.env.NEXT_PUBLIC_DPNR_API_URL!

/** Mirrors the `{ error: { code, message } }` shape every `/v1` handler returns (infra/cdk/lambda/lib/http.ts). */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message)
  }
}

async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getIdToken()
  if (!token) {
    throw new ApiError(401, 'unauthenticated', 'No active session — sign in again.')
  }
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
  })
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const err = (body as { error?: { code: string; message: string } } | null)?.error
    throw new ApiError(res.status, err?.code ?? 'unknown_error', err?.message ?? 'Request failed.')
  }
  return body as T
}

/** POST /v1/rooms/{decision,mirror} — the single flow-engine command contract (MVP_ARCHITECTURE.md §4). */
export async function submitRoomCommand(request: RoomCommandRequest): Promise<RoomCommandResponse> {
  const path = request.flowId === 'DECISION' ? '/v1/rooms/decision' : '/v1/rooms/mirror'
  const res = await authedFetch(path, { method: 'POST', body: JSON.stringify(request) })
  return parseOrThrow<RoomCommandResponse>(res)
}

/** GET /v1/rooms/decision/{id}/full — used both by `decision/new/page.tsx`'s `?resume=` handling and, eventually, `decision/[id]/page.tsx`. */
export async function getDecisionFull(id: string): Promise<DecisionRoomFullResponse> {
  const res = await authedFetch(`/v1/rooms/decision/${id}/full`)
  return parseOrThrow<DecisionRoomFullResponse>(res)
}

/** GET /v1/rooms/mirror/{id}/full — used by mirror/new/page.tsx's `?resume=` handling. */
export async function getMirrorFull(id: string): Promise<MirrorRoomFullResponse> {
  const res = await authedFetch(`/v1/rooms/mirror/${id}/full`)
  return parseOrThrow<MirrorRoomFullResponse>(res)
}

export async function getDecisionsList(): Promise<DecisionsListResponse> {
  const res = await authedFetch('/v1/rooms/decisions')
  return parseOrThrow<DecisionsListResponse>(res)
}

export async function getMirrorsList(): Promise<MirrorsListResponse> {
  const res = await authedFetch('/v1/rooms/mirrors')
  return parseOrThrow<MirrorsListResponse>(res)
}

/** POST /v1/user/consent — the write path this session built (docs/PHASE_AUDIT.md §2.2). */
export async function grantConsent(): Promise<ConsentResponse> {
  const res = await authedFetch('/v1/user/consent', { method: 'POST' })
  return parseOrThrow<ConsentResponse>(res)
}

/** GET /v1/user/export — GDPR data export, used by /account's "Download my data." */
export async function exportUserData(): Promise<UserExportResponse> {
  const res = await authedFetch('/v1/user/export')
  return parseOrThrow<UserExportResponse>(res)
}

/**
 * DELETE /v1/account — deletes the DynamoDB partition only. Callers must
 * also call `deleteCognitoUser()` (lib/cognito/client.ts) to remove the
 * actual identity — see that function's doc comment for why it's split.
 */
export async function deleteAccountData(): Promise<DeleteAccountResponse> {
  const res = await authedFetch('/v1/account', { method: 'DELETE' })
  return parseOrThrow<DeleteAccountResponse>(res)
}

/** GET /v1/dashboard — aggregate read used by /dashboard (MVP_ARCHITECTURE.md §4). */
export async function getDashboard(): Promise<DashboardResponse> {
  const res = await authedFetch('/v1/dashboard')
  return parseOrThrow<DashboardResponse>(res)
}

/** GET /v1/credits — current ledger balance, used by /account (real, live since Session 11 — no prior caller). */
export async function getCredits(): Promise<CreditsResponse> {
  const res = await authedFetch('/v1/credits')
  return parseOrThrow<CreditsResponse>(res)
}

export async function getCreditsTransactions(): Promise<CreditsTransactionsResponse> {
  const res = await authedFetch('/v1/credits/transactions')
  return parseOrThrow<CreditsTransactionsResponse>(res)
}

/**
 * POST /v1/credits/purchase — initiates a Grow hosted checkout page (ADR
 * 0008); redirect the browser to the returned `paymentPageUrl`. No caller
 * yet — /pricing's buttons stay "coming soon" until real PlanItems are
 * seeded (still blocked on a pack-pricing decision).
 */
export async function initiatePurchase(request: CreditsPurchaseRequest): Promise<CreditsPurchaseResponse> {
  const res = await authedFetch('/v1/credits/purchase', { method: 'POST', body: JSON.stringify(request) })
  return parseOrThrow<CreditsPurchaseResponse>(res)
}

/** POST /v1/daily-card/feedback — dismiss and/or relevance feedback; called from Dashboard and Companion alike. */
export async function sendDailyCardFeedback(request: DailyCardFeedbackRequest): Promise<DailyCardFeedbackResponse> {
  const res = await authedFetch('/v1/daily-card/feedback', { method: 'POST', body: JSON.stringify(request) })
  return parseOrThrow<DailyCardFeedbackResponse>(res)
}

/** POST /v1/companion/message — one chat turn; may come back with a navigation directive. */
export async function sendCompanionMessage(request: CompanionMessageRequest): Promise<CompanionMessageResponse> {
  const res = await authedFetch('/v1/companion/message', { method: 'POST', body: JSON.stringify(request) })
  return parseOrThrow<CompanionMessageResponse>(res)
}

/** GET /v1/companion/context — recent turns, used by /companion to resume the active chat on load. */
export async function getCompanionContext(): Promise<CompanionContextResponse> {
  const res = await authedFetch('/v1/companion/context')
  return parseOrThrow<CompanionContextResponse>(res)
}

/** GET /v1/library/topics/{slug} — used by /companion to render an `open_library_topic` directive inline, and by /library/[slug]. */
export async function getLibraryTopic(slug: string): Promise<LibraryTopicDetailResponse> {
  const res = await authedFetch(`/v1/library/topics/${encodeURIComponent(slug)}`)
  return parseOrThrow<LibraryTopicDetailResponse>(res)
}

/** GET /v1/library/topics — the public catalog listing, used by /library. */
export async function getLibraryTopics(): Promise<LibraryTopicsResponse> {
  const res = await authedFetch('/v1/library/topics')
  return parseOrThrow<LibraryTopicsResponse>(res)
}

/** GET /v1/library/recommendations — deployed but currently always empty (see the Lambda's own doc comment); used by /library so it starts rendering the moment real recommendations exist, with no further frontend work. */
export async function getLibraryRecommendations(): Promise<LibraryRecommendationsResponse> {
  const res = await authedFetch('/v1/library/recommendations')
  return parseOrThrow<LibraryRecommendationsResponse>(res)
}

/** POST /v1/roadmap/proposal/accept — a pending Roadmap revision (surfaced via GET /v1/dashboard) becomes the live Roadmap. */
export async function acceptRoadmapProposal(): Promise<RoadmapProposalAcceptResponse> {
  const res = await authedFetch('/v1/roadmap/proposal/accept', { method: 'POST' })
  return parseOrThrow<RoadmapProposalAcceptResponse>(res)
}

/** POST /v1/roadmap/proposal/reject — discards a pending Roadmap revision. */
export async function rejectRoadmapProposal(): Promise<RoadmapProposalRejectResponse> {
  const res = await authedFetch('/v1/roadmap/proposal/reject', { method: 'POST' })
  return parseOrThrow<RoadmapProposalRejectResponse>(res)
}

/** GET /v1/twin — every Digital Twin ("InnerSelf") signal the caller has, any status. */
export async function getTwin(): Promise<TwinListResponse> {
  const res = await authedFetch('/v1/twin')
  return parseOrThrow<TwinListResponse>(res)
}

/** POST /v1/twin/signals/{id}/confirm | reject — legal from any current status, not a one-way ratchet. */
export async function confirmTwinSignal(signalId: string): Promise<TwinSignalActionResponse> {
  const res = await authedFetch(`/v1/twin/signals/${encodeURIComponent(signalId)}/confirm`, { method: 'POST' })
  return parseOrThrow<TwinSignalActionResponse>(res)
}

export async function rejectTwinSignal(signalId: string): Promise<TwinSignalActionResponse> {
  const res = await authedFetch(`/v1/twin/signals/${encodeURIComponent(signalId)}/reject`, { method: 'POST' })
  return parseOrThrow<TwinSignalActionResponse>(res)
}

/** GET /v1/commitments — every commitment the caller has, any status. */
export async function getCommitments(): Promise<CommitmentsResponse> {
  const res = await authedFetch('/v1/commitments')
  return parseOrThrow<CommitmentsResponse>(res)
}

/** POST /v1/commitments — used by My Evolution Map's "Goals & Dreams" widget. */
export async function createCommitment(request: CreateCommitmentRequest): Promise<CreateCommitmentResponse> {
  const res = await authedFetch('/v1/commitments', { method: 'POST', body: JSON.stringify(request) })
  return parseOrThrow<CreateCommitmentResponse>(res)
}

/** POST /v1/commitments/{id}/complete — used by My Evolution Map's Goals & Dreams and My Wallet's "Weekly Goal Achieved" tile. */
export async function completeCommitment(commitmentId: string): Promise<CompleteCommitmentResponse> {
  const res = await authedFetch(`/v1/commitments/${encodeURIComponent(commitmentId)}/complete`, { method: 'POST' })
  return parseOrThrow<CompleteCommitmentResponse>(res)
}

/** GET /v1/plans — active credit-pack/subscription catalog, used by My Wallet. Honestly empty until real PlanItems are seeded (blocked on a pricing decision). */
export async function getPlans(): Promise<PlansResponse> {
  const res = await authedFetch('/v1/plans')
  return parseOrThrow<PlansResponse>(res)
}

/**
 * GET /v1/session-ticket/public-key — unauthenticated (public keys aren't
 * secret; ADR 0013). Plain `fetch`, not `authedFetch`: this must be callable
 * before a ticket/session exists at all.
 */
export async function getSessionTicketPublicKey(): Promise<SessionTicketPublicKeyResponse> {
  const res = await fetch(`${API_URL}/v1/session-ticket/public-key`)
  return parseOrThrow<SessionTicketPublicKeyResponse>(res)
}

/** GET /v1/keys — the crypto envelope a returning client needs to re-derive its DEK locally. */
export async function getUserKeys(): Promise<UserKeysResponse> {
  const res = await authedFetch('/v1/keys')
  return parseOrThrow<UserKeysResponse>(res)
}

/** POST /v1/keys — one-time; the server rejects a second call for the same user (409 keys_already_exist). */
export async function createUserKeys(request: UserKeysRequest): Promise<UserKeysResponse> {
  const res = await authedFetch('/v1/keys', { method: 'POST', body: JSON.stringify(request) })
  return parseOrThrow<UserKeysResponse>(res)
}

/** POST /v1/session-ticket — `request.wrappedDek` must already be RSA-OAEP-wrapped via `wrapDekForSessionTicket` (lib/crypto). */
export async function createSessionTicket(request: SessionTicketRequest): Promise<SessionTicketResponse> {
  const res = await authedFetch('/v1/session-ticket', { method: 'POST', body: JSON.stringify(request) })
  return parseOrThrow<SessionTicketResponse>(res)
}

/** DELETE /v1/auth/sessions/{id} — idempotent; calling it again on an already-revoked ticket still succeeds. */
export async function revokeSession(sessionId: string): Promise<RevokeSessionResponse> {
  const res = await authedFetch(`/v1/auth/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' })
  return parseOrThrow<RevokeSessionResponse>(res)
}
