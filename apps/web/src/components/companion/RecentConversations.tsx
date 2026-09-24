'use client'
import { useState, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { MessageSquarePlus, Trash2 } from 'lucide-react'
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
 * desktop right column and the mobile sheet. Capped to the 10 most recent.
 *
 * Title and timestamp sit on separate lines so the title gets the row's
 * full width — side by side, the timestamp's shrink-0 was squeezing titles
 * down to a few words in the narrow right column.
 */
export default function RecentConversations({ activeSessionId, onSelect, onCreated, onDeleted, className }: Props) {
  const locale = useLocale()
  const t = useTranslations('Companion.recentConversations')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState(false)

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
      setConversations(remaining)
      setConfirmingId(null)
      onDeleted(sessionId, remaining[0]?.sessionId ?? null)
    } catch {
      setDeleteError(true)
    } finally {
      setDeletingId(null)
    }
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
        <ul className="space-y-1">
          {conversations.slice(0, 10).map((c) => {
            const title = c.title ?? t('untitled')
            const active = c.sessionId === activeSessionId

            if (confirmingId === c.sessionId) {
              return (
                <li key={c.sessionId} className="rounded-xl bg-white/5 px-2 py-2">
                  <p className="text-xs text-white/80 mb-2">{t('confirmDelete')}</p>
                  {deleteError && <p className="text-xs text-red-300 mb-2">{t('deleteFailed')}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(c.sessionId)}
                      disabled={deletingId === c.sessionId}
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
                </li>
              )
            }

            return (
              <li
                key={c.sessionId}
                className={`group flex items-center gap-1 rounded-xl transition-colors ${active ? 'bg-white/10' : 'hover:bg-white/5'}`}
              >
                <button
                  onClick={() => onSelect(c.sessionId)}
                  aria-label={`${t('open')}: ${title}`}
                  aria-current={active ? 'true' : undefined}
                  className="flex-1 min-w-0 text-start px-2 py-2"
                >
                  <p className="text-sm text-white/85 truncate" title={title}>{title}</p>
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
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
