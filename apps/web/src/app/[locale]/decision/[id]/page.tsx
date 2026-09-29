'use client'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'
import Card from '@/components/ui/Card'
import ReopenPanel from '@/components/rooms/ReopenPanel'
import FeltSummary from '@/components/shared/FeltSummary'
import { feltFromDecisionEmotion } from '@/lib/body-map'
import { getDecisionFull, ApiError } from '@/lib/api/v1-client'
import type { DecisionRoomFullResponse, DecisionRoomOptionView, TagType } from '@dpnr/shared-types'
import { useDecisionLabels } from '@/lib/decision-labels'

/**
 * Decision Room's post-completion review page — was Supabase-only
 * (`supabase.from('decisions')`), which meant it could never show a
 * decision made through the real Cognito-backed `/v1/rooms` flow (that
 * flow never wrote to Supabase at all — see docs/AGENT_LOG.md Session 7
 * part 4). Ported onto the real `GET /v1/rooms/decision/{id}/full` read,
 * same session-ticket/design-token pattern every other real page here uses.
 *
 * Deliberately read-only, unlike the old Supabase-backed page. The legacy
 * version let you edit tags/projections, ask the AI to re-suggest them,
 * add check-ins, mark an outcome, edit the review date, and delete the
 * decision outright — none of those have a real `/v1` write endpoint today
 * (decision-full.ts is a read; there's no PATCH/DELETE for a decision, no
 * add-outcome or replace-tags endpoint). Rather than fake write buttons
 * against nothing real, this page only shows what's actually stored —
 * the same "don't fabricate" call every other page here already makes
 * for its own dropped widgets. A future session can restore
 * editing/outcome-tracking once real write endpoints exist for it.
 */

// Group labels: DecisionRoom.sections.{tagType}.

const TAG_COLOR: Record<TagType, string> = {
  pro: 'text-emerald-400 border-emerald-700/40 bg-emerald-900/20',
  con: 'text-red-300 border-red-700/40 bg-red-900/20',
  desire: 'text-[var(--color-violet-300)] border-[var(--color-violet-600)]/40 bg-[var(--color-violet-900)]/20',
  fear: 'text-orange-300 border-orange-700/40 bg-orange-900/20',
  value: 'text-blue-300 border-blue-700/40 bg-blue-900/20',
  need: 'text-indigo-300 border-indigo-700/40 bg-indigo-900/20',
}

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}

function OptionSection({ option }: { option: DecisionRoomOptionView }) {
  const { t, tag: tagLabel } = useDecisionLabels()
  const tagsByType = (type: TagType) => option.tags.filter((tg) => tg.tagType === type)
  const groups: TagType[] = ['pro', 'con', 'desire', 'fear', 'value', 'need']
  const selectedProjections = option.projections.filter((p) => p.selected)

  return (
    <Card>
      <p className="text-[var(--color-violet-400)] text-xs uppercase tracking-wide mb-1">{t('optionLabel', { label: option.label })}</p>
      <p className="text-white/80 text-sm leading-relaxed mb-4">{option.content}</p>

      <div className="space-y-3">
        {groups.map((type) => {
          const tags = tagsByType(type)
          if (tags.length === 0) return null
          return (
            <div key={type}>
              <p className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-wide mb-1.5">{t(`sections.${type}`)}</p>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tg, i) => (
                  <span key={i} className={`text-xs border rounded-full px-2.5 py-1 ${TAG_COLOR[type]}`}>
                    {tagLabel(type, tg.label)}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {selectedProjections.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[var(--color-border-glass)]">
          <p className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-wide mb-1.5">{t('detail.futureProjections')}</p>
          <div className="space-y-1.5">
            {selectedProjections.map((p, i) => (
              <p key={i} className="text-white/60 text-sm leading-relaxed">
                &ldquo;{p.statement}&rdquo;
              </p>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

// Must match the flow's `reopenableSteps` (infra/cdk/lambda/rooms/*-steps/index.ts).
const DECISION_REOPEN_STEPS = ['NAME_DECISION', 'MAP_OPTIONS', 'BODY_EMOTION', 'CHOOSE_LENS', 'DEEP_EXPLORATION', 'VALUES_NEEDS', 'FUTURE_PROJECTION', 'COMMITMENT']

export default function DecisionDetailPage() {
  const locale = useLocale()
  const tr = useTranslations('RoomsReopen')
  const t = useTranslations('DecisionRoom')
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [decision, setDecision] = useState<DecisionRoomFullResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await getDecisionFull(id)
        setDecision(data)
      } catch (err) {
        if (err instanceof ApiError && err.code === 'decision_not_found') {
          setNotFound(true)
        } else if (err instanceof ApiError && err.status === 401) {
          router.push('/login')
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, router])

  // The whole session finished (not just the room record) — only then can it be reopened.
  const sessionFinished = decision ? (decision.sessionStatus ? decision.sessionStatus === 'completed' : decision.status === 'completed') : false

  return (
    <div className="lg:flex lg:min-h-screen">
      <Sidebar />
      <main className="flex-1 pb-20 lg:pb-0">
        <div className="relative min-h-screen">
          <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/decision-bg.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>

          <div className="max-w-[393px] lg:max-w-2xl mx-auto px-5 lg:px-8 pt-14 lg:pt-8 pb-10 lg:pb-12">
            <Link href="/decision/new" className="text-[var(--color-violet-400)] text-sm">
              {t('detail.backLink')}
            </Link>

            {loading && <p className="text-[var(--color-text-tertiary)] text-sm text-center pt-12">{t('detail.loading')}</p>}

            {!loading && notFound && (
              <div className="pt-12 text-center">
                <p className="text-white/50">{t('detail.notFound')}</p>
              </div>
            )}

            {!loading && decision && (
              <div className="mt-5 space-y-4">
                <div>
                  <p
                    className={`text-xs uppercase tracking-widest ${
                      decision.status === 'completed' ? 'text-emerald-400' : 'text-[var(--color-violet-400)]'
                    }`}
                  >
                    {decision.status === 'completed' ? t('detail.completed') : t('detail.inProgress', { step: decision.currentStep })}
                    {' · '}
                    {formatDate(decision.createdAt, locale)}
                  </p>
                  <h1 className="font-display text-xl lg:text-2xl text-white mt-1">{decision.title}</h1>
                  {decision.subtitle && <p className="text-[var(--color-text-tertiary)] text-sm italic mt-1">{decision.subtitle}</p>}
                </div>

                {sessionFinished && decision.sessionVersion !== undefined && (
                  <ReopenPanel
                    flowId="DECISION"
                    sessionId={decision.decisionId}
                    sessionVersion={decision.sessionVersion}
                    steps={DECISION_REOPEN_STEPS.map((id) => ({ id, label: tr(`steps.decision.${id}`) }))}
                    resumeHref={`/decision/new?resume=${decision.decisionId}`}
                  />
                )}

                {!sessionFinished && (
                  <Link
                    href={`/decision/new?resume=${decision.decisionId}`}
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] px-4 py-2 text-sm text-white transition-colors"
                  >
                    {t('continue')}
                  </Link>
                )}

                {decision.narrative && (
                  <Card>
                    <p className="text-[var(--color-violet-400)] text-xs uppercase tracking-wide mb-2">{t('detail.yourStory')}</p>
                    <p className="text-white/70 text-sm leading-relaxed">{decision.narrative}</p>
                  </Card>
                )}

                {decision.options.map((option) => (
                  <OptionSection key={option.label} option={option} />
                ))}

                {decision.emotion && (
                  <Card>
                    <p className="text-[var(--color-violet-400)] text-xs uppercase tracking-wide mb-2">{t('detail.bodyEmotion')}</p>
                    <div className="mb-3">
                      <FeltSummary {...feltFromDecisionEmotion(decision.emotion)} />
                    </div>
                    {decision.emotion.aiReflection && (
                      <p className="text-white/50 text-sm italic leading-relaxed">&ldquo;{decision.emotion.aiReflection}&rdquo;</p>
                    )}
                  </Card>
                )}

                {decision.outcomes.length > 0 && (
                  <Card>
                    <p className="text-[var(--color-violet-400)] text-xs uppercase tracking-wide mb-2">{t('detail.whatHappened')}</p>
                    <div className="space-y-3">
                      {decision.outcomes.map((o, i) => (
                        <div key={i} className="space-y-0.5">
                          {o.chosenOptionLabel && <p className="text-[var(--color-text-tertiary)] text-xs">{t('detail.choseOption', { label: o.chosenOptionLabel })}</p>}
                          {o.reflection && <p className="text-white/70 text-sm leading-relaxed">{o.reflection}</p>}
                          <p className="text-[var(--color-text-tertiary)] text-xs">{formatDate(o.createdAt, locale)}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {decision.summary && (
                  <Card>
                    <p className="text-[var(--color-violet-400)] text-xs uppercase tracking-wide mb-2">{t('detail.summary')}</p>
                    <p className="text-white/70 text-sm leading-relaxed">{decision.summary}</p>
                  </Card>
                )}

                {decision.reviewDate && (
                  <Card>
                    <p className="text-[var(--color-violet-400)] text-xs uppercase tracking-wide mb-2">{t('detail.checkInDate')}</p>
                    <p className="text-white/60 text-sm">{formatDate(decision.reviewDate, locale)}</p>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  )
}
