import {
  User, Heart, RefreshCw, Target, Users,
  HeartHandshake, Activity, GitBranch, Briefcase, Compass,
} from 'lucide-react'
import type { ExploreTheme } from '@dpnr/shared-types'

/**
 * Every Explore Theme (dynamo/global-tables.ts `EXPLORE_THEMES`), with a
 * lucide icon (used inline in the small "Explore by Theme" chip row
 * alongside the image, and anywhere a photo would be too small to read) and
 * a real per-theme image (`public/images/categories/<theme>.webp`), cropped
 * directly from `docs/UI reference for platform.pdf` page 5's own mandala
 * row and photo shelves — see `docs/AGENT_LOG.md` Session 48 for the exact
 * source crop per theme. **This is still an aesthetic pairing, not a
 * semantic one** — the reference's own example topics (Pleasure, Anger,
 * Comfort Zone, etc.) don't correspond to any of this catalog's real 54
 * topics, so there's no honest per-topic mapping available, only a
 * per-theme color/symbol fit (same last-resort convention Session 41/43
 * already established for the prior 4-category icon set). Two pairings are
 * the weakest and worth a future revisit if better source art turns up:
 * `BODY` (a "Motivation & Drive" figure, not literally nervous-system
 * imagery) and `CREATE` (the "Anger" mandala's teal tone, chosen only for a
 * fresh/growth color association with "Work, Money & Creation" — the
 * reference has no work/money imagery at all).
 *
 * Single source of truth, shared by every surface that shows a topic's
 * theme (Library's shelves + chip row, the full `/library/[slug]` page, and
 * Companion's `LibrarySidePanel`) — every topic has exactly one
 * `exploreTheme` (`LibraryTopicSummary`/`LibraryTopicDetailResponse`), so
 * every one of those surfaces renders the same image for the same theme.
 */
export const THEME_META: Record<ExploreTheme, { label: string; icon: typeof User; image: string }> = {
  ME: { label: 'Identity & Self', icon: User, image: '/images/categories/me.webp' },
  FEEL: { label: 'Emotions & Regulation', icon: Heart, image: '/images/categories/feel.webp' },
  PATTERNS: { label: 'Patterns & Loops', icon: RefreshCw, image: '/images/categories/patterns.webp' },
  NEED: { label: 'Needs & Values', icon: Target, image: '/images/categories/need.webp' },
  RELATE: { label: 'Attachment & Closeness', icon: Users, image: '/images/categories/relate.webp' },
  REPAIR: { label: 'Repair & Self-Compassion', icon: HeartHandshake, image: '/images/categories/repair.webp' },
  BODY: { label: 'Body & Nervous System', icon: Activity, image: '/images/categories/body.webp' },
  CHOOSE: { label: 'Decisions & Direction', icon: GitBranch, image: '/images/categories/choose.webp' },
  CREATE: { label: 'Work, Money & Creation', icon: Briefcase, image: '/images/categories/create.webp' },
  LIFE: { label: 'Meaning & Life', icon: Compass, image: '/images/categories/life.webp' },
}

export const THEME_ORDER: ExploreTheme[] = [
  'ME', 'FEEL', 'PATTERNS', 'NEED', 'RELATE', 'REPAIR', 'BODY', 'CHOOSE', 'CREATE', 'LIFE',
]
