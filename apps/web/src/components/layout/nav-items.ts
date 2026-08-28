import {
  MessageCircle,
  LayoutGrid,
  Hexagon,
  Compass,
  BookOpen,
  TrendingUp,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  /** Set for reference-design surfaces this app doesn't have a real page for yet. */
  comingSoon?: boolean
}

// Mirrors the reference sidebar's flatter IA (Mirror Room / Decision Room as
// direct top-level items) rather than routing through the existing /rooms hub.
export const PRIMARY_NAV: NavItem[] = [
  { label: 'Main Chat', href: '/companion', icon: MessageCircle },
  { label: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
  { label: 'Mirror Room', href: '/mirror/new', icon: Hexagon },
  { label: 'Decision Room', href: '/decision/new', icon: Compass },
  { label: 'Content & Learning', href: '/library', icon: BookOpen },
  { label: 'Growth Tracker', href: '/growth', icon: TrendingUp },
  { label: 'My Evolution Map', href: '/evolution-map', icon: Sparkles },
]
