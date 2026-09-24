'use client'
import Image from 'next/image'
import { useState, useEffect, useMemo } from 'react'
import { Link } from '@/i18n/navigation'
import { useRouter } from '@/i18n/navigation'
import { Search, ArrowRight, ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getCurrentSession } from '@/lib/cognito/client'
import { getLibraryTopics, getLibraryRecommendations } from '@/lib/api/v1-client'
import type { LibraryTopicSummary, LibraryRecommendationsResponse, ExploreTheme } from '@dpnr/shared-types'
import Card from '@/components/ui/Card'
import { THEME_ORDER } from '@/lib/library/theme-meta'
import {
  topicImage, themeCover, LIBRARY_HEADER_IMAGE, FOR_YOU_IMAGE, START_HERE_IMAGES,
} from '@/lib/library/topic-images'
import { DPNR_METHOD, readingMinutes, readMethodSlugs, type MethodPiece } from '@/lib/library/method-content'

/**
 * Named homepage shelves (Content Library Master Architecture v2, Part I §2)
 * mapped onto the one Explore Theme each is closest to. Doc names 11 shelves
 * total; FOR YOU and START HERE are built separately below (personalized /
 * fixed-list, not theme-filtered), and CONTINUE EXPLORING + WHAT YOU'RE
 * NAVIGATING NOW are deliberately not built this pass — both need real
 * interaction-history tracking ("Track opened, completed, saved, discussed,
 * and revisited topics", Part I §11) that doesn't exist anywhere in this
 * codebase yet; a shelf that always renders empty would be a worse honest-
 * empty-state violation than simply not showing it. NEED/CHOOSE/REPAIR don't
 * get a dedicated named shelf (the doc's own 11 don't name one for them
 * either) but stay fully reachable via the Explore by Theme row below, so
 * nothing in the catalog is stranded.
 */
// titleKey indexes Library.shelves, resolved via t() at render time —
// module scope has no hook access.
const NAMED_SHELVES: { titleKey: string; theme: ExploreTheme }[] = [
  { titleKey: 'knowYourself', theme: 'ME' },
  { titleKey: 'patternsWorthNoticing', theme: 'PATTERNS' },
  { titleKey: 'relationships', theme: 'RELATE' },
  { titleKey: 'emotionalWorld', theme: 'FEEL' },
  { titleKey: 'workMoney', theme: 'CREATE' },
  { titleKey: 'bodyEnergy', theme: 'BODY' },
  { titleKey: 'meaningLife', theme: 'LIFE' },
]

/**
 * Part I §2's own "Start Here" line: "Foundational topics that give new
 * users useful language quickly: Needs, Values, Boundaries, Emotions,
 * Patterns, Self-Trust, Attachment, Regulation." None of those 8 words are
 * exact topic titles, so each is resolved to the closest real Foundation-
 * level topic below — a judgment call, not a literal lookup (flagged here
 * rather than silently guessed).
 */
const START_HERE_TITLES = [
  'Needs vs. Neediness', 'Values', 'Boundaries', 'Emotion vs. Reaction',
  'Avoidance', 'Self-Trust', 'Attachment Styles - Overview', 'Emotional Regulation',
]

/**
 * The selected Explore Theme lives in the URL (`?theme=FEEL`) so the
 * browser's own Back button returns from a theme view to the full shelves,
 * and a theme view can be linked/refreshed. Unknown values are ignored.
 */
function themeFromUrl(): ExploreTheme | null {
  const value = new URLSearchParams(window.location.search).get('theme')
  return value && (THEME_ORDER as string[]).includes(value) ? (value as ExploreTheme) : null
}

/**
 * One Library tile, in the designer's three styles
 * (docs/reference-screens/theme_and_section_photos/): `photo` is the
 * topic's own cover art with the title over a bottom scrim (every themed
 * shelf); `startHere` and `forYou` are the designer's abstract/plain framed
 * cards with the title set in the middle ("naming in the middle, bold",
 * per the For You source file's own name). The framed styles carry their
 * own glowing border in the art itself, so they get no extra ring.
 */
type TileVariant = 'photo' | 'startHere' | 'forYou'

const TILE_ASPECT: Record<TileVariant, string> = {
  photo: 'aspect-[4/3]',
  startHere: 'aspect-[11/6]', // the Start Here art's own ~1.83:1
  forYou: 'aspect-[720/257]', // the For You art's own ~2.8:1 — cropping it would clip its frame
}

function TopicTile({
  topic, image, variant = 'photo', subtitle, className = 'w-36 lg:w-40',
}: {
  topic: LibraryTopicSummary
  image: string
  variant?: TileVariant
  subtitle?: string
  className?: string
}) {
  const framed = variant !== 'photo'
  return (
    <Link href={`/library/${topic.slug}`} className={`group shrink-0 ${className}`}>
      <div
        className={`relative overflow-hidden rounded-2xl transition-all active:scale-[0.98] ${TILE_ASPECT[variant]} ${
          framed ? '' : 'ring-1 ring-white/10 group-hover:ring-white/30'
        }`}
      >
        <Image
          src={image}
          alt=""
          fill
          sizes="(min-width: 1024px) 240px, 50vw"
          className={`object-cover ${framed ? '' : 'transition-transform duration-(--motion-slow) group-hover:scale-105'}`}
        />
        {framed ? (
          <div className="absolute inset-0 flex items-center justify-center px-5 text-center">
            <p className={`text-white text-sm lg:text-base leading-snug drop-shadow-md ${variant === 'forYou' ? 'font-semibold' : 'font-medium'}`}>
              {topic.title}
            </p>
          </div>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
            <p className="absolute inset-x-0 bottom-0 p-2.5 text-start text-white text-xs lg:text-sm leading-snug drop-shadow">
              {topic.title}
            </p>
          </>
        )}
      </div>
      {subtitle && <p className="text-[var(--color-text-tertiary)] text-xs mt-1.5 line-clamp-2">{subtitle}</p>}
    </Link>
  )
}

/** A "The DPNR Method" card: wide art, reading time, title over a scrim. */
function MethodTile({ piece, minutesLabel }: { piece: MethodPiece; minutesLabel: string }) {
  return (
    <Link href={`/library/method/${piece.slug}`} className="group shrink-0 w-64 lg:w-72">
      <div className="relative overflow-hidden rounded-2xl aspect-[16/9] ring-1 ring-white/10 group-hover:ring-white/30 transition-all active:scale-[0.98]">
        <Image
          src={piece.image}
          alt=""
          fill
          sizes="(min-width: 1024px) 288px, 256px"
          className="object-cover transition-transform duration-(--motion-slow) group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <span className="absolute top-2.5 start-2.5 liquid-glass rounded-full px-2 py-0.5 text-[10px] text-white/85">{minutesLabel}</span>
        <p className="absolute inset-x-0 bottom-0 p-3 text-start text-white text-sm leading-snug drop-shadow">{piece.title}</p>
      </div>
    </Link>
  )
}

function Shelf({ title, action, panel = false, children }: {
  title: string
  action?: React.ReactNode
  panel?: boolean
  children: React.ReactNode
}) {
  const header = (
    <div className="flex items-center justify-between mb-3">
      <p className="text-white text-sm lg:text-base">{title}</p>
      {action}
    </div>
  )
  // Themed shelves sit in glass panels (two per row on desktop, as in the
  // designer's layout); the full-width For You / Start Here rows don't.
  if (panel) {
    return (
      <Card className="min-w-0">
        {header}
        <div className="scrollbar-glass flex gap-3 overflow-x-auto pb-1">{children}</div>
      </Card>
    )
  }
  return (
    <div className="mb-6">
      {header}
      <div className="scrollbar-glass flex gap-3 overflow-x-auto pb-1 -mx-5 px-5 lg:mx-0 lg:px-0">{children}</div>
    </div>
  )
}

/**
 * Content & Learning's hub — redesigned this session against the Content
 * Library Master Architecture v2 (superseding the earlier reskin against the
 * mockup reference alone). That doc's own "Key Architecture Decision" is
 * explicit: "Do not organize the library as one rigid tree... the same topic
 * can belong to several life domains... at the same time" — replaces the
 * old single-`taxonomyCategory` grid with real Netflix-style horizontal
 * shelves keyed off the new many-to-many `exploreTheme`/`lifeDomains` axes
 * (dynamo/global-tables.ts). See NAMED_SHELVES' own doc comment for which of
 * the source doc's 11 named shelves are and aren't built this pass.
 */
export default function LibraryPage() {
  const t = useTranslations('Library')
  const router = useRouter()
  const [topics, setTopics] = useState<LibraryTopicSummary[] | null>(null)
  const [recommendations, setRecommendations] = useState<LibraryRecommendationsResponse['recommendations']>([])
  const [recommendationBasis, setRecommendationBasis] = useState<LibraryRecommendationsResponse['basis']>(undefined)
  // Featured Today waits for recommendations to settle, so it doesn't flash
  // the DPNR Method and then swap to a topic a moment later.
  const [recommendationsSettled, setRecommendationsSettled] = useState(false)
  const [readMethod, setReadMethod] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [activeTheme, setActiveTheme] = useState<ExploreTheme | null>(null)

  useEffect(() => {
    const onPopState = () => setActiveTheme(themeFromUrl())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Every theme change goes through here so the URL (and so the Back button)
  // always matches what's on screen. Search clears a theme with `replace`,
  // so typing doesn't pile up history entries.
  function selectTheme(theme: ExploreTheme | null, mode: 'push' | 'replace' = 'push') {
    setActiveTheme(theme)
    const url = new URL(window.location.href)
    if (theme) url.searchParams.set('theme', theme)
    else url.searchParams.delete('theme')
    if (mode === 'push') window.history.pushState(null, '', url)
    else window.history.replaceState(null, '', url)
    if (mode === 'push') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    async function load() {
      try {
        const session = await getCurrentSession()
        if (!session) { router.push('/login'); return }

        setReadMethod(readMethodSlugs())
        const data = await getLibraryTopics()
        setTopics(data.topics)
        setActiveTheme(themeFromUrl())
        getLibraryRecommendations()
          .then((r) => { setRecommendations(r.recommendations); setRecommendationBasis(r.basis) })
          .catch(() => {})
          .finally(() => setRecommendationsSettled(true))
      } catch {
        // Degrades to an empty state — same tolerance every other page here uses.
        setRecommendationsSettled(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const filtered = useMemo(() => {
    if (!topics) return null
    const q = query.trim().toLowerCase()
    return q ? topics.filter((t) => t.title.toLowerCase().includes(q)) : topics
  }, [topics, query])

  const byTheme = useMemo(() => {
    const map = new Map<ExploreTheme, LibraryTopicSummary[]>()
    for (const t of topics ?? []) {
      const list = map.get(t.exploreTheme)
      if (list) list.push(t)
      else map.set(t.exploreTheme, [t])
    }
    return map
  }, [topics])

  const startHere = useMemo(() => {
    if (!topics) return []
    return START_HERE_TITLES.map((title) => topics.find((t) => t.title === title)).filter(
      (t): t is LibraryTopicSummary => t !== undefined
    )
  }, [topics])

  // Featured Today (user request, Session 65): feature the DPNR Method until
  // there's real user info to suggest something more relevant, so a new
  // user gets comfortable with how DPNR works first. "Real user info" means
  // recommendations ranked from confirmed Twin signals (`basis: 'signals'`);
  // onboarding answers alone aren't enough (nearly every new account has
  // those). Until then, show the first method piece this viewer hasn't
  // opened yet, in order, then cycle by day once all six are read. Once
  // signals exist, rotate daily through their recommended topics.
  function pickFeatured(): { href: string; title: string; subtitle: string } | undefined {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 0).getTime()
    const dayOfYear = Math.floor((now.getTime() - startOfYear) / 86_400_000)
    if (recommendationBasis === 'signals' && recommendations.length > 0) {
      const { topic } = recommendations[dayOfYear % recommendations.length]
      return { href: `/library/${topic.slug}`, title: topic.title, subtitle: t(`themes.${topic.exploreTheme}`) }
    }
    const piece = DPNR_METHOD.find((p) => !readMethod.has(p.slug)) ?? DPNR_METHOD[dayOfYear % DPNR_METHOD.length]
    return { href: `/library/method/${piece.slug}`, title: piece.title, subtitle: t('method.shelfTitle') }
  }
  const featured = recommendationsSettled ? pickFeatured() : undefined
  const searching = query.trim().length > 0

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/library-bg.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>

      <div className="max-w-[393px] lg:max-w-none mx-auto px-5 lg:px-8 pb-10 lg:pb-12">
        <div className="pt-14 lg:pt-8 pb-6 lg:flex lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl text-white">{t('title')}</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              {t('subtitle')}
            </p>
          </div>
          <div className="relative mt-4 lg:mt-0 lg:w-72">
            <Search className="w-4 h-4 text-[var(--color-text-tertiary)] absolute start-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); if (activeTheme) selectTheme(null, 'replace') }}
              placeholder={t('searchPlaceholder')}
              className="w-full bg-[var(--color-surface-glass)] border border-[var(--color-border-glass)] rounded-full ps-10 pe-4 py-2.5 text-sm text-white placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-violet-500)]/60 transition-colors"
            />
          </div>
        </div>

        {loading && <p className="text-[var(--color-text-tertiary)] text-sm text-center pt-8">{t('loading')}</p>}

        {!loading && topics?.length === 0 && (
          <Card>
            <p className="text-[var(--color-text-tertiary)] text-sm">{t('empty')}</p>
          </Card>
        )}

        {!loading && featured && !searching && !activeTheme && (
          <Link href={featured.href} className="group block mb-8">
            <div className="relative overflow-hidden rounded-[var(--radius-card-lg)] ring-1 ring-white/10 h-44 lg:h-64">
              <Image src={LIBRARY_HEADER_IMAGE} alt="" fill priority sizes="100vw" className="object-cover" />
              {/* Scrim on the text's (start) side only, so the art stays bright */}
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-base)]/90 via-[var(--color-bg-base)]/30 to-transparent lg:bg-gradient-to-r rtl:lg:bg-gradient-to-l lg:from-[var(--color-bg-base)]/85 lg:via-[var(--color-bg-base)]/35" />
              <div className="absolute inset-0 flex flex-col items-start justify-end lg:justify-center p-5 lg:p-10 lg:max-w-[55%]">
                <span className="liquid-glass rounded-full px-2.5 py-0.5 text-[11px] text-white/85 mb-2">{t('featuredToday')}</span>
                <h2 className="font-display text-2xl lg:text-4xl text-white leading-tight">{featured.title}</h2>
                <p className="text-white/70 text-xs lg:text-sm mt-1.5">{featured.subtitle}</p>
                <span className="hidden lg:inline-flex items-center gap-1.5 mt-4 rounded-full bg-[var(--color-violet-600)] group-hover:bg-[var(--color-violet-500)] px-4 py-1.5 text-sm text-white transition-colors">
                  {t('openTopic')} <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
                </span>
              </div>
            </div>
          </Link>
        )}

        {searching ? (
          <>
            {filtered && filtered.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                {filtered.map((topic) => (
                  <TopicTile key={topic.slug} topic={topic} image={topicImage(topic.slug, topic.exploreTheme)} className="w-full" />
                ))}
              </div>
            )}
            {filtered?.length === 0 && (
              <p className="text-[var(--color-text-tertiary)] text-sm text-center pt-8">{t('noResults', { query })}</p>
            )}
          </>
        ) : (
          <>
            {activeTheme && (
              <div className="mb-6">
                <button
                  onClick={() => selectTheme(null)}
                  className="liquid-glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4 rtl:-scale-x-100" /> {t('backToLibrary')}
                </button>
                <h2 className="font-display text-xl lg:text-2xl text-white mt-4">
                  {t(`themes.${activeTheme}`)}
                  <span className="ms-2 text-sm font-sans text-[var(--color-text-tertiary)]">{byTheme.get(activeTheme)?.length ?? 0}</span>
                </h2>
              </div>
            )}

            {!loading && !activeTheme && recommendations.length > 0 && (
              <Shelf title={t('forYou')}>
                {recommendations.map(({ topic, reason }) => (
                  <TopicTile key={topic.slug} topic={topic} image={FOR_YOU_IMAGE} variant="forYou" subtitle={reason} className="w-56 lg:w-64" />
                ))}
              </Shelf>
            )}

            {!loading && !activeTheme && startHere.length > 0 && (
              <Shelf title={t('startHere')}>
                {startHere.map((topic, i) => (
                  <TopicTile
                    key={topic.slug}
                    topic={topic}
                    image={START_HERE_IMAGES[i % START_HERE_IMAGES.length]}
                    variant="startHere"
                    className="w-52 lg:w-56"
                  />
                ))}
              </Shelf>
            )}

            {!loading && !activeTheme && (
              <Shelf title={t('method.shelfTitle')}>
                {DPNR_METHOD.map((piece) => (
                  <MethodTile key={piece.slug} piece={piece} minutesLabel={t('method.minRead', { minutes: readingMinutes(piece) })} />
                ))}
              </Shelf>
            )}

            {!loading && topics && topics.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-white text-sm lg:text-base">{t('exploreByTheme')}</p>
                </div>
                <div className="scrollbar-glass flex gap-3 overflow-x-auto pb-1 -mx-5 px-5 lg:mx-0 lg:px-0">
                  {THEME_ORDER.filter((theme) => byTheme.has(theme)).map((theme) => {
                    const active = activeTheme === theme
                    return (
                      <button
                        key={theme}
                        onClick={() => selectTheme(active ? null : theme)}
                        aria-pressed={active}
                        className="group shrink-0 w-44 lg:w-52 text-start"
                      >
                        <span
                          className={`relative block aspect-[1597/858] rounded-2xl overflow-hidden transition-all ${
                            active ? 'ring-2 ring-[var(--color-violet-400)] shadow-[var(--shadow-glow-violet)]' : 'group-hover:brightness-110'
                          } ${activeTheme && !active ? 'opacity-50' : ''}`}
                        >
                          <Image src={themeCover(theme)} alt="" fill sizes="(min-width: 1024px) 208px, 176px" className="object-cover" />
                        </span>
                        <span className={`block mt-1.5 text-xs lg:text-sm ${active ? 'text-white' : 'text-white/75'}`}>
                          {t(`themes.${theme}`)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {activeTheme ? (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                {(byTheme.get(activeTheme) ?? []).map((topic) => (
                  <TopicTile key={topic.slug} topic={topic} image={topicImage(topic.slug, topic.exploreTheme)} className="w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {NAMED_SHELVES.map(({ titleKey, theme }) => {
                  const items = byTheme.get(theme)
                  if (!items || items.length === 0) return null
                  return (
                    <Shelf
                      key={theme}
                      panel
                      title={t(`shelves.${titleKey}`)}
                      action={
                        <button
                          onClick={() => selectTheme(theme)}
                          className="inline-flex items-center gap-1 text-xs text-[var(--color-violet-400)] hover:text-[var(--color-violet-300)]"
                        >
                          {t('viewAll')} <ArrowRight className="w-3.5 h-3.5 rtl:-scale-x-100" />
                        </button>
                      }
                    >
                      {items.map((topic) => (
                        <TopicTile key={topic.slug} topic={topic} image={topicImage(topic.slug, topic.exploreTheme)} />
                      ))}
                    </Shelf>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
