'use client'
import { useTranslations } from 'next-intl'
import { confirmedThisMonth, type TwinListResponse, type SignalDirection, type LifeDomainCategory } from '@dpnr/shared-types'
import BottomSheet from '@/components/ui/BottomSheet'
import Card from '@/components/ui/Card'
import { DOMAIN_META } from '@/components/shared/domain-meta'
import { useMirrorPatternLabels } from '@/lib/mirror-pattern-labels'

export type MonthlyStat = 'areasGrowing' | 'patternsShifting' | 'insightsGained'

type Signal = TwinListResponse['signals'][number]

// Same grouping as the page's "What's moving" card; keys index Growth.moving.groups.
const DIRECTION_GROUP: Record<SignalDirection, string> = {
  emerging: 'growing',
  increasing: 'growing',
  decreasing: 'easing',
  recurring: 'steady',
  stable: 'steady',
  mixed: 'mixed',
}

/**
 * The items behind one of Growth Tracker's three monthly counts. Uses
 * `confirmedThisMonth` from shared-types, the same filter dashboard/handler.ts
 * counts with, over the page's own `GET /v1/twin` list (no extra request).
 * `twin` null = still loading, or the request failed (`failed`).
 */
export default function MonthlySignalsSheet({
  stat,
  twin,
  failed,
  onClose,
}: {
  stat: MonthlyStat
  twin: TwinListResponse | null
  failed: boolean
  onClose: () => void
}) {
  const t = useTranslations('Growth')
  const tDomains = useTranslations('Dashboard.lifeDomains')

  const all = twin?.signals ?? []
  // An older backend sends no createdAt at all: say so rather than show an
  // empty list next to a non-zero count.
  const datesMissing = all.some((s) => s.status === 'confirmed') && all.every((s) => s.createdAt == null)
  const thisMonth = confirmedThisMonth(all)
  const items = stat === 'patternsShifting' ? thisMonth.filter((s) => s.domain === 'pattern') : thisMonth

  const patternLabels = useMirrorPatternLabels()
  const label = (s: Signal) => (s.name ? patternLabels.name(s.name) : s.description)

  let content: React.ReactNode
  if (!twin) {
    content = <p className="text-sm text-[var(--color-text-tertiary)]">{failed ? t('statLists.unavailable') : t('statLists.loading')}</p>
  } else if (datesMissing) {
    content = <p className="text-sm text-[var(--color-text-tertiary)]">{t('statLists.unavailable')}</p>
  } else if (stat === 'areasGrowing') {
    const byDomain = new Map<LifeDomainCategory, Signal[]>()
    for (const s of items) {
      if (!s.lifeDomain) continue
      byDomain.set(s.lifeDomain, [...(byDomain.get(s.lifeDomain) ?? []), s])
    }
    content =
      byDomain.size === 0 ? (
        <p className="text-sm text-[var(--color-text-tertiary)]">{t('statLists.empty')}</p>
      ) : (
        <div className="space-y-4">
          {[...byDomain].map(([domain, signals]) => {
            // An id from an older/newer API bundle has no meta: listed without an icon.
            const meta = DOMAIN_META[domain] as (typeof DOMAIN_META)[LifeDomainCategory] | undefined
            const Icon = meta?.icon
            return (
              <div key={domain}>
                <p className="flex items-center gap-2 text-sm text-white mb-1.5">
                  {Icon && meta && <Icon className="w-4 h-4" style={{ color: meta.color }} aria-hidden />}
                  {tDomains(`labels.${domain}`)}
                  <span className="text-xs text-[var(--color-text-tertiary)]">· {signals.length}</span>
                </p>
                <ul className="space-y-1.5 ps-6">
                  {signals.map((s) => (
                    <li key={s.signalId} className="text-sm text-white/75 leading-snug">{label(s)}</li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )
  } else {
    content =
      items.length === 0 ? (
        <p className="text-sm text-[var(--color-text-tertiary)]">{t('statLists.empty')}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((s) => (
            <li key={s.signalId}>
              <p className="text-sm text-white/85 leading-snug">{label(s)}</p>
              {(s.lifeDomain || (stat === 'patternsShifting' && s.direction)) && (
                <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                  {[
                    s.lifeDomain ? tDomains(`labels.${s.lifeDomain}`) : null,
                    stat === 'patternsShifting' && s.direction ? t(`moving.groups.${DIRECTION_GROUP[s.direction]}`) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
            </li>
          ))}
        </ul>
      )
  }

  return (
    <BottomSheet onClose={onClose} closeLabel={t('statLists.close')}>
      <Card className="!p-5">
        <h2 className="font-display text-xl text-white">{t(`stats.${stat}`)}</h2>
        <p className="text-xs text-[var(--color-text-tertiary)] mt-1 mb-4">{t(`statLists.${stat}`)}</p>
        {content}
      </Card>
    </BottomSheet>
  )
}
