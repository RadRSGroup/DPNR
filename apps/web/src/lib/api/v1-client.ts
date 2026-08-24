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
  RoadmapProposalAcceptResponse,
  RoadmapProposalRejectResponse,
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
