'use client'
import { useRef } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Card from '@/components/ui/Card'
import { LifeDomainCategorySchema, type DashboardResponse, type LifeDomainCategory } from '@dpnr/shared-types'
import { DOMAIN_META } from '@/components/shared/domain-meta'
import InfoPopover from '@/components/ui/InfoPopover'

/**
 * Life Domains as the reference draws them: all seven domains as a scrolling
 * row of tiles (icon, name, share, bar), with the leading one marked
 * "Current area". Percentages are the real aggregate over confirmed,
 * classified Twin signals; a domain with no evidence yet shows "—" and an
 * empty bar rather than a number (user decision, Session 69: every widget
 * always shows, honest when empty).
 *
 * Each tile opens a short note on tap/click/hover (founder feedback
 * 2026-09-27): what seems active in that area (the stored domain summary,
 * from confirmed signals only) and what the percent actually means — a
 * share of what the person has confirmed, not a score of that area of life.
 */
export default function LifeDomainsCarousel({ lifeDomains, loading = false }: { lifeDomains: DashboardResponse['lifeDomains']; loading?: boolean }) {
  const t = useTranslations('Dashboard.lifeDomains')
  const rowRef = useRef<HTMLDivElement>(null)
  const byDomain = new Map(lifeDomains.map((d) => [d.domain, d.percent]))
  const summaryByDomain = new Map(lifeDomains.map((d) => [d.domain, d.summary ?? null]))
  const current = [...lifeDomains].sort((a, b) => b.percent - a.percent)[0]?.domain
  const domains = LifeDomainCategorySchema.options as LifeDomainCategory[]

  function scroll(dir: 1 | -1) {
    const row = rowRef.current
    if (!row) return
    const rtl = getComputedStyle(row).direction === 'rtl'
    row.scrollBy({ left: dir * (rtl ? -1 : 1) * row.clientWidth * 0.8, behavior: 'smooth' })
  }

  return (
    <Card className="lg:px-6 lg:py-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-white text-base lg:text-lg">{t('title')}</p>
          <p className="text-xs text-[var(--color-violet-300)]/80 mt-0.5">
            {lifeDomains.length > 0 || loading ? t('subtitle') : t('empty')}
          </p>
        </div>
        {current && (
          <span className="flex items-center gap-1.5 text-xs text-white/70 shrink-0">
            <span className="w-2 h-2 rounded-full bg-[var(--color-amber-400)]" /> {t('currentArea')}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => scroll(-1)}
          aria-label={t('scrollPrev')}
          className="hidden sm:flex shrink-0 w-7 h-7 items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 rtl:-scale-x-100" />
        </button>
        <div ref={rowRef} className="no-scrollbar flex-1 min-w-0 flex gap-2 overflow-x-auto snap-x snap-mandatory scroll-smooth motion-reduce:scroll-auto">
          {domains.map((domain) => {
            const meta = DOMAIN_META[domain]
            const Icon = meta.icon
            const percent = byDomain.get(domain)
            const isCurrent = domain === current
            return (
              <InfoPopover
                key={domain}
                label={t('about', { name: t(`labels.${domain}`) })}
                className={`snap-start flex-1 basis-[92px] min-w-[92px] rounded-2xl border px-2.5 pt-3 pb-3.5 bg-white/[0.04] text-start hover:bg-white/[0.07] transition-colors ${
                  isCurrent ? 'border-[var(--color-amber-400)]/60 shadow-[0_0_16px_-4px_var(--color-amber-400)]' : 'border-white/10'
                }`}
                content={
                  <>
                    <p className="text-white text-sm mb-1">{t(`labels.${domain}`)}</p>
                    <p>{summaryByDomain.get(domain) ?? t('noSummary')}</p>
                    <p className="mt-2 text-white/60">
                      {percent === undefined ? t('shareNone') : t('shareExplained', { percent })}
                    </p>
                  </>
                }
              >
                <Icon className="w-7 h-7 mx-auto" style={{ color: meta.color }} strokeWidth={1.5} aria-hidden />
                <span className="block text-[11px] text-white/80 text-center mt-2 leading-tight min-h-[2.2em] line-clamp-2">
                  {t(`labels.${domain}`)}
                </span>
                <span className="block text-base text-white mt-1" aria-label={percent === undefined ? t('notYet') : undefined}>
                  {loading ? ' ' : percent === undefined ? '—' : `${percent}%`}
                </span>
                <span className="block h-1 rounded-full bg-white/10 overflow-hidden mt-1.5">
                  {percent !== undefined && (
                    <span className="block h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: meta.color }} />
                  )}
                </span>
              </InfoPopover>
            )
          })}
        </div>
        <button
          onClick={() => scroll(1)}
          aria-label={t('scrollNext')}
          className="hidden sm:flex shrink-0 w-7 h-7 items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ChevronRight className="w-5 h-5 rtl:-scale-x-100" />
        </button>
      </div>
    </Card>
  )
}
