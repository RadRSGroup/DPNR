/**
 * Single source of truth for the application table's PK/SK formats
 * (MVP_ARCHITECTURE.md §3.1). Never hand-build a key string in handler
 * code — import these so a typo can't silently create an orphaned item.
 */

export const userPk = (userId: string): string => `USER#${userId}`

export const Sk = {
  profile: (): 'PROFILE' => 'PROFILE',
  keys: (): 'KEYS' => 'KEYS',
  credits: (): 'CREDITS' => 'CREDITS',
  creditsTxn: (isoTimestamp: string): string => `CREDITS#TXN#${isoTimestamp}`,
  pendingPurchase: (purchaseId: string): string => `PURCHASE#${purchaseId}`,
  roadmap: (): 'ROADMAP' => 'ROADMAP',
  roadmapVersion: (version: number): string => `ROADMAP#v${version}`,
  roadmapProposal: (): 'ROADMAP#PROPOSED' => 'ROADMAP#PROPOSED',
  twinSignal: (domain: string, signalId: string): string => `TWIN#SIGNAL#${domain}#${signalId}`,
  session: (sessionId: string): string => `SESSION#${sessionId}`,
  // Pointer to the user's current Companion session, so handlers can GetItem
  // it directly instead of scanning/filtering SESSION# items by roomType.
  companionActiveSession: (): 'COMPANION#ACTIVE_SESSION' => 'COMPANION#ACTIVE_SESSION',
  sessionMessage: (sessionId: string, isoTimestamp: string): string =>
    `SESSION#${sessionId}#MSG#${isoTimestamp}`,
  sessionSummary: (sessionId: string): string => `SESSION#${sessionId}#SUMMARY`,
  decisionRoom: (decisionId: string): string => `ROOM#DECISION#${decisionId}`,
  decisionOption: (decisionId: string, label: 'A' | 'B'): string =>
    `ROOM#DECISION#${decisionId}#OPTION#${label}`,
  decisionEmotion: (decisionId: string): string => `ROOM#DECISION#${decisionId}#EMOTION`,
  decisionTag: (decisionId: string, tagId: string): string =>
    `ROOM#DECISION#${decisionId}#TAG#${tagId}`,
  decisionProjection: (decisionId: string, projectionId: string): string =>
    `ROOM#DECISION#${decisionId}#PROJECTION#${projectionId}`,
  decisionOutcome: (decisionId: string, isoTimestamp: string): string =>
    `ROOM#DECISION#${decisionId}#OUTCOME#${isoTimestamp}`,
  decisionSummary: (decisionId: string): string => `ROOM#DECISION#${decisionId}#SUMMARY`,
  mirrorRoom: (mirrorId: string): string => `ROOM#MIRROR#${mirrorId}`,
  commitment: (commitmentId: string): string => `COMMITMENT#${commitmentId}`,
  insight: (insightId: string): string => `INSIGHT#${insightId}`,
  dailyCard: (isoDate: string): string => `DAILYCARD#${isoDate}`,
  alignmentScoreSnapshot: (isoDate: string): string => `ALIGNMENT#SNAPSHOT#${isoDate}`,
  weeklyRecap: (isoWeek: string): string => `WEEKLYRECAP#${isoWeek}`,
  libraryProgress: (topicSlug: string): string => `LIBRARY#PROGRESS#${topicSlug}`,
  usage: (billingPeriod: string): string => `USAGE#${billingPeriod}`,
  promptOverlay: (domain: string): string => `PROMPT_OVERLAY#${domain}`,
  safetyEvent: (eventId: string): string => `SAFETY#EVENT#${eventId}`,
  openThread: (threadId: string): string => `OPENTHREAD#${threadId}`,
} as const

/** Global (not per-user) tables — see MVP_ARCHITECTURE.md §3.2. */
export const GlobalKeys = {
  promptRegistryPk: (app: string, name: string): string => `PROMPT#${app}#${name}`,
  promptVersion: (version: number): string => `VERSION#${String(version).padStart(4, '0')}`,
  promptAlias: (alias: string): string => `ALIAS#${alias}`,
  sessionTicketPk: (userId: string): string => `USER#${userId}`,
  sessionTicketSk: (sessionId: string): string => `TICKET#${sessionId}`,
  libraryTopicPk: (slug: string): string => `LIBRARY#TOPIC#${slug}`,
  planPk: (planId: string): string => `PLAN#${planId}`,
} as const
