'use client'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'
import { ArchetypeSchema, type Archetype, type DashboardResponse } from '@dpnr/shared-types'
import { ARCHETYPE_META } from '@/components/shared/archetype-meta'

/**
 * Leading Archetypes as the reference draws them: all four portraits in a
 * row with name and share. Shares are the real aggregate over confirmed,
 * classified Twin signals; an archetype with no evidence yet shows "—" and
 * a dimmed portrait (Session 69: always shown, honest when empty).
 */
export default function ArchetypesCard({ archetypes, loading = false }: { archetypes: DashboardResponse['archetypes']; loading?: boolean }) {
  const t = useTranslations('Dashboard.archetypes')
  const byArchetype = new Map(archetypes.map((a) => [a.archetype, a.percent]))
  const order = (ArchetypeSchema.options as Archetype[])
    .slice()
    .sort((a, b) => (byArchetype.get(b) ?? -1) - (byArchetype.get(a) ?? -1))

  return (
    <Card className="flex flex-col lg:px-5">
      <p className="text-white text-base">{t('title')}</p>
      <p className="text-xs text-[var(--color-violet-300)]/80 mt-0.5 mb-4">{t('subtitle')}</p>

      <div className="grid grid-cols-4 gap-2 flex-1">
        {order.map((a) => {
          const percent = byArchetype.get(a)
          return (
            <div key={a} className="flex flex-col items-center text-center min-w-0">
              <span
                className={`relative w-12 h-12 xl:w-14 xl:h-14 rounded-full overflow-hidden ring-2 ring-[var(--color-amber-400)]/50 shadow-[0_0_14px_-2px_rgba(139,92,246,0.6)] bg-gradient-to-br ${ARCHETYPE_META[a].gradient} ${
                  percent === undefined && !loading ? 'opacity-40 grayscale' : ''
                }`}
              >
                <Image src={ARCHETYPE_META[a].image} alt="" fill sizes="56px" className="object-cover" />
              </span>
              <p className="text-[11px] text-white/85 mt-2 leading-tight break-words w-full">{t(`names.${a}`)}</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">{loading ? ' ' : percent === undefined ? '—' : `${percent}%`}</p>
            </div>
          )
        })}
      </div>

      <div className="mt-3 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5">
        <p className="text-xs text-white/75 leading-relaxed">{archetypes.length > 0 || loading ? t('footer') : t('empty')}</p>
      </div>
    </Card>
  )
}
