import {
  MessageCircle,
  LayoutGrid,
  Hexagon,
  Compass,
  BookOpen,
  TrendingUp,
  Map,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  /** Key into the `Nav.items` translation namespace — resolved via t() by
      whichever component renders this list, not stored pre-translated here
      (this is a plain .ts module, no hook access). */
  labelKey: string
  href: string
  icon: LucideIcon
  /** Set for reference-design surfaces this app doesn't have a real page for yet. */
  comingSoon?: boolean
}

// Mirrors the reference sidebar's flatter IA (Mirror Room / Decision Room as
// direct top-level items) rather than routing through the existing /rooms hub.
export const PRIMARY_NAV: NavItem[] = [
  { labelKey: 'mainChat', href: '/companion', icon: MessageCircle },
  { labelKey: 'dashboard', href: '/dashboard', icon: LayoutGrid },
  { labelKey: 'mirrorRoom', href: '/mirror/new', icon: Hexagon },
  { labelKey: 'decisionRoom', href: '/decision/new', icon: Compass },
  { labelKey: 'contentLearning', href: '/library', icon: BookOpen },
  { labelKey: 'growthTracker', href: '/growth', icon: TrendingUp },
  { labelKey: 'evolutionMap', href: '/evolution-map', icon: Map },
]
