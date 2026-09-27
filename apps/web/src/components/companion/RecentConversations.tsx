'use client'
import { useState, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { MessageSquarePlus, Search, Trash2 } from 'lucide-react'
import Card from '@/components/ui/Card'
import { getCompanionConversations, createCompanionConversation, deleteCompanionConversation } from '@/lib/api/v1-client'
import type { CompanionConversationsListResponse } from '@dpnr/shared-types'
import { timeAgo } from '@/lib/format'

type Conversation = CompanionConversationsListResponse['conversations'][number]

interface Props {
  activeSessionId: string | null
  onSelect: (sessionId: string) => void
  onCreated: (sessionId: string) => void
  /**
   * Called after a successful delete. `nextSessionId` is the most recent
   * remaining conversation (or null if none are left) — the parent decides
   * what to open, but only needs to act when the deleted one was open.
   */
  onDeleted: (deletedSessionId: string, nextSessionId: string | null) => void
  className?: string
}

/**
 * Companion's "Recent Conversations" — discrete conversations (Session 42).
 * Each row opens/resumes its conversation; the trash control deletes it
 * permanently (`DELETE /v1/companion/conversations/{id}`) after an inline
 * confirm — inline rather than a modal so it works identically in the
 * desktop right column and the mobile sheet.
 *
 * Shows the RECENT_SHOWN most recent, then "Show more" expands the full
 * history in place (founder feedback 2026-09-27): an internally scrolling
 * list grouped by time with a title search, so Main Chat stays compact.
 * Grouping lives in one function (groupConversations) so topic/folder
 * organization can replace the time buckets later without a new structure.
 *
 * Title and timestamp sit on separate lines so the title gets the row's
 * full width — side by side, the timestamp's shrink-0 was squeezing titles
 * down to a few words in the narrow right column.
 */
// Matches --motion-calm (320ms), the row-collapse transition below.
const LEAVE_MS = 320

const RECENT_SHOWN = 5
const DAY_MS = 86_400_000

type GroupKey = 'today' | 'week' | 'earlier'

/** Time buckets for the expanded history — the seam where folders would go. */
function groupConversations(list: Conversation[], now: number): { key: GroupKey; items: Conversation[] }[] {
  const startOfToday = new Date(now).setHours(0, 0, 0, 0)
  const groups: Record<GroupKey, Conversation[]> = { today: [], week: [], earlier: [] }
  for (const c of list) {
    const at = new Date(c.lastMessageAt).getTime()
    groups[at >= startOfToday ? 'today' : at >= startOfToday - 6 * DAY_MS ? 'week' : 'earlier'].push(c)
  }
  return (['today', 'week', 'earlier'] as const).filter((k) => groups[k].length > 0).map((key) => ({ key, items: groups[key] }))
}

export default function RecentConversations({ activeSessionId, onSelect, onCreated, onDeleted, className }: Props) {
  const locale = useLocale()
  const t = useTranslations('Companion.recentConversations')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState(false)
  // A just-deleted row collapses out before it's removed (docs/MOTION.md).
  const [leavingId, setLeavingId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [query, setQuery] = useState('')
  // Time buckets are relative to when the list was opened (render stays pure).
  const [openedAt] = useState(() => Date.now())

  useEffect(() => {
    getCompanionConversations()
      .then((r) => setConversations(r.conversations))
      .catch(() => {
        // Honest degrade — the list just doesn't render, same tolerance every other page here uses.
      })
      .finally(() => setLoading(false))
  }, [activeSessionId]) // refetch after switching/creating, so a brand-new conversation's real title (once it has one) and reordering show up next time this list is touched

  async function handleNew() {
    if (creating) return
    setCreating(true)
    try {
      const { sessionId } = await createCompanionConversation()
      onCreated(sessionId)
    } catch {
      // Leave the button available to retry.
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(sessionId: string) {
    if (deletingId) return
    setDeletingId(sessionId)
    setDeleteError(false)
    try {
      await deleteCompanionConversation(sessionId)
      const remaining = conversations.filter((c) => c.sessionId !== sessionId)
      setLeavingId(sessionId) // the confirm row stays up while it collapses
      // Let the row fade and the list close up first, THEN tell the page:
      // switching threads changes activeSessionId, whose refetch above would
      // otherwise pull the row out mid-animation.
      window.setTimeout(() => {
        setConversations(remaining)
        setLeavingId(null)
        setConfirmingId(null)
        onDeleted(sessionId, remaining[0]?.sessionId ?? null)
      }, LEAVE_MS)
    } catch {
      setDeleteError(true)
    } finally {
      setDeletingId(null)
    }
  }

  function renderRow(c: Conversation) {
    const title = c.title ?? t('untitled')
    const active = c.sessionId === activeSessionId
    // Row collapse on delete: grid rows 1fr → 0fr closes the gap
    // smoothly. Both states (row / inline confirm) share this one
    // wrapper so the collapse always starts from the height that's
    // actually showing. A height change — the one documented
    // exception to transform/opacity (MOTION.md): one small row,
    // once. Instant under reduced motion.
    const leaving = leavingId === c.sessionId

    return (
      <li
        key={c.sessionId}
        className={`grid transition-[grid-template-rows,opacity] duration-(--motion-calm) motion-reduce:transition-none ${
          leaving ? 'grid-rows-[0fr] opacity-0 pointer-events-none' : 'grid-rows-[1fr] opacity-100'
        }`}
        aria-hidden={leaving || undefined}
      >
        {confirmingId === c.sessionId ? (
          <div className="min-h-0 overflow-hidden rounded-xl bg-white/5">
            <div className="px-2 py-2">
              <p className="text-xs text-white/80 mb-2">{t('confirmDelete')}</p>
              {deleteError && <p className="text-xs text-red-300 mb-2">{t('deleteFailed')}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => handleDelete(c.sessionId)}
                  disabled={deletingId === c.sessionId || leaving}
                  className="text-xs px-3 py-1 rounded-full bg-red-500/80 hover:bg-red-500 text-white disabled:opacity-50"
                >
                  {t('confirm')}
                </button>
                <button
                  onClick={() => {
                    setConfirmingId(null)
                    setDeleteError(false)
                  }}
                  className="text-xs px-3 py-1 rounded-full bg-white/10 hover:bg-white/15 text-white/80"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`min-h-0 overflow-hidden group flex items-center gap-1 rounded-xl transition-colors ${active ? 'bg-white/10' : 'hover:bg-white/5'}`}
          >
            <button
              onClick={() => onSelect(c.sessionId)}
              aria-label={`${t('open')}: ${title}`}
              aria-current={active ? 'true' : undefined}
              className="flex-1 min-w-0 text-start px-2 py-2"
            >
              <p className="text-sm text-white/85 line-clamp-2 break-words" title={title}>{title}</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">{timeAgo(c.lastMessageAt, locale)}</p>
            </button>
            <button
              onClick={() => {
                setConfirmingId(c.sessionId)
                setDeleteError(false)
              }}
              aria-label={`${t('delete')}: ${title}`}
              // Hidden-until-hover only where hover actually exists (a
              // mouse). It used to key on `lg:` (screen width), which hid
              // it on iPads/touch laptops ≥1024px with no way to reveal it.
              className="shrink-0 p-2.5 [@media(hover:hover)_and_(pointer:fine)]:p-2 rounded-lg text-white/45 hover:text-red-300 hover:bg-white/5 [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:group-focus-within:opacity-100 transition-opacity"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </li>
    )
  }

  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-wide">{t('title')}</p>
        <button
          onClick={handleNew}
          disabled={creating}
          className="inline-flex items-center gap-1 text-xs text-[var(--color-violet-300)] hover:text-[var(--color-violet-200)] disabled:opacity-50"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" /> {t('new')}
        </button>
      </div>

      {loading ? (
        <p className="text-[var(--color-text-tertiary)] text-xs">{t('loading')}</p>
      ) : conversations.length === 0 ? (
        <p className="text-[var(--color-text-tertiary)] text-xs">{t('empty')}</p>
      ) : (
        <>
          {expanded && (
            <label className="relative block mb-2">
              <Search aria-hidden className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('search')}
                aria-label={t('search')}
                className="w-full rounded-xl bg-white/5 border border-white/10 ps-8 pe-3 py-1.5 text-sm text-white placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-violet-500)]/60"
              />
            </label>
          )}
          {expanded ? (
            <div className="max-h-[26rem] overflow-y-auto scrollbar-glass pe-1 -me-1 space-y-3">
              {groupConversations(
                conversations.filter((c) => !query.trim() || (c.title ?? t('untitled')).toLowerCase().includes(query.trim().toLowerCase())),
                openedAt
              ).map((g) => (
                <section key={g.key}>
                  <p className="text-[11px] text-[var(--color-text-tertiary)] px-2 mb-1">{t(`groups.${g.key}`)}</p>
                  <ul className="space-y-1">{g.items.map(renderRow)}</ul>
                </section>
              ))}
            </div>
          ) : (
            <ul className="space-y-1">{conversations.slice(0, RECENT_SHOWN).map(renderRow)}</ul>
          )}
          {conversations.length > RECENT_SHOWN && (
            <button
              onClick={() => {
                setExpanded((v) => !v)
                setQuery('')
              }}
              className="mt-2 px-2 text-xs text-[var(--color-violet-300)] hover:text-[var(--color-violet-200)]"
            >
              {expanded ? t('showLess') : t('showMore')}
            </button>
          )}
        </>
      )}
    </Card>
  )
}
