'use client'
import Image from 'next/image'
import { useEffect } from 'react'
import { Link, useRouter } from '@/i18n/navigation'
import { useParams } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getCurrentSession } from '@/lib/cognito/client'
import Card from '@/components/ui/Card'
import { DPNR_METHOD, getMethodPiece, readingMinutes, markMethodRead } from '@/lib/library/method-content'

/**
 * One piece of "The DPNR Method" (lib/library/method-content.ts). Static
 * content, so unlike the topic page there's no fetch, only the same
 * signed-in check every Library page does. Laid out like the topic page
 * (same background, width, section styling) so the two read as one
 * Library, plus a "next" link so the six pieces read as a series.
 */
export default function MethodPiecePage() {
  const t = useTranslations('Library')
  const router = useRouter()
  const params = useParams<{ slug: string }>()
  const piece = getMethodPiece(params.slug)
  const index = DPNR_METHOD.findIndex((p) => p.slug === params.slug)
  const next = index >= 0 ? DPNR_METHOD[(index + 1) % DPNR_METHOD.length] : undefined

  useEffect(() => {
    getCurrentSession().then((session) => { if (!session) router.push('/login') }).catch(() => {})
  }, [router])

  // Lets Featured Today move on to the next unread piece (see readMethodSlugs).
  useEffect(() => {
    if (piece) markMethodRead(piece.slug)
  }, [piece])

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/library-bg.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>

      <div className="max-w-[393px] lg:max-w-2xl mx-auto px-5 lg:px-8 pb-10 pt-14 lg:pt-8">
        <Link href="/library" className="inline-flex items-center gap-1.5 text-[var(--color-text-tertiary)] hover:text-white/60 text-xs mb-6">
          <ArrowLeft className="w-3.5 h-3.5 rtl:-scale-x-100" /> {t('title')}
        </Link>

        {!piece ? (
          <p className="text-[var(--color-text-tertiary)] text-sm text-center pt-8">{t('topic.loadError')}</p>
        ) : (
          <article className="space-y-5">
            <div className="relative overflow-hidden rounded-[var(--radius-card-lg)] ring-1 ring-white/10 aspect-[16/7]">
              <Image src={piece.image} alt="" fill priority sizes="(min-width: 1024px) 672px, 100vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <span className="absolute bottom-3 start-4 liquid-glass rounded-full px-2.5 py-0.5 text-[11px] text-white/85">
                {t('method.shelfTitle')} · {t('method.minRead', { minutes: readingMinutes(piece) })}
              </span>
            </div>

            <div>
              <h1 className="font-display text-2xl lg:text-3xl text-white leading-tight">{piece.title}</h1>
              <p className="text-white/60 text-sm mt-2">{piece.tagline}</p>
            </div>

            {piece.sections.map((section, i) => (
              <section key={i} className="space-y-2.5">
                {section.heading && <h2 className="text-white/50 text-xs uppercase tracking-wide pt-1">{section.heading}</h2>}
                {section.paragraphs?.map((para, j) => (
                  <p key={j} className="text-white/75 text-sm leading-relaxed">{para}</p>
                ))}
                {section.bullets && (
                  <ul className="space-y-1.5">
                    {section.bullets.map((item, j) => (
                      <li key={j} className="flex gap-2 text-white/70 text-sm leading-relaxed">
                        <span className="text-[var(--color-violet-400)] shrink-0">•</span>{item}
                      </li>
                    ))}
                  </ul>
                )}
                {section.steps && (
                  <ol className="space-y-2">
                    {section.steps.map((step, j) => (
                      <li key={j} className="flex gap-3">
                        <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--color-violet-600)]/30 border border-[var(--color-violet-500)]/40 text-[var(--color-violet-300)] text-xs flex items-center justify-center mt-0.5">
                          {j + 1}
                        </span>
                        <p className="text-white/70 text-sm leading-relaxed">
                          <span className="text-white">{step.title}</span> {step.text}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            ))}

            <Card className="bg-[var(--color-violet-900)]/20 border-[var(--color-violet-600)]/30">
              <p className="text-[var(--color-violet-300)] text-xs uppercase tracking-wide mb-1">{t('method.reflect')}</p>
              <p className="text-white/80 text-sm leading-relaxed">{piece.reflection}</p>
            </Card>

            <div>
              <p className="text-white/50 text-xs uppercase tracking-wide mb-2">{t('topic.relatedTopics')}</p>
              <div className="flex flex-wrap gap-2">
                {piece.relatedTopics.map((related) => (
                  <Link
                    key={related.slug}
                    href={`/library/${related.slug}`}
                    className="text-xs text-[var(--color-violet-300)] bg-[var(--color-violet-900)]/30 border border-[var(--color-violet-700)]/40 hover:bg-[var(--color-violet-900)]/50 rounded-full px-3 py-1.5 transition-colors"
                  >
                    {related.title}
                  </Link>
                ))}
              </div>
            </div>

            {next && next.slug !== piece.slug && (
              <Link
                href={`/library/method/${next.slug}`}
                className="liquid-glass flex items-center justify-between gap-3 rounded-2xl px-4 py-3 mt-2"
              >
                <span className="min-w-0">
                  <span className="block text-[var(--color-text-tertiary)] text-xs">{t('method.next')}</span>
                  <span className="block text-white text-sm truncate">{next.title}</span>
                </span>
                <ArrowRight className="w-4 h-4 text-white/70 shrink-0 rtl:-scale-x-100" />
              </Link>
            )}
          </article>
        )}
      </div>
    </div>
  )
}
