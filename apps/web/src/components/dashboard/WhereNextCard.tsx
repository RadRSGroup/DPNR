'use client'
import { ArrowRight, TrendingUp, Compass } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import Card from '@/components/ui/Card'

/**
 * Replaces the Dashboard's "My Evolution" sparkline (founder-approved page
 * split, 2026-09-29). Dashboard is "now"; the trend lives on Growth
 * Tracker and chosen direction on My Evolution Map, so this card just says
 * which is which instead of repeating either one.
 */
export default function WhereNextCard() {
  const t = useTranslations('Dashboard.whereNext')
  const links = [
    { href: '/growth', Icon: TrendingUp, title: t('growth.title'), body: t('growth.body') },
    { href: '/evolution-map', Icon: Compass, title: t('evolution.title'), body: t('evolution.body') },
  ]
  return (
    <Card className="flex flex-col lg:px-5">
      <p className="text-white text-base">{t('title')}</p>
      <div className="mt-3 flex-1 flex flex-col gap-2.5">
        {links.map(({ href, Icon, title, body }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-start gap-3 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] px-3 py-2.5 transition-colors"
          >
            <Icon className="w-4 h-4 mt-0.5 shrink-0 text-[var(--color-violet-300)]" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-white">{title}</span>
              <span className="block text-xs text-white/60 leading-relaxed mt-0.5">{body}</span>
            </span>
            <ArrowRight className="w-4 h-4 mt-0.5 shrink-0 text-white/40 group-hover:text-white/80 rtl:-scale-x-100 transition-colors" aria-hidden />
          </Link>
        ))}
      </div>
    </Card>
  )
}
