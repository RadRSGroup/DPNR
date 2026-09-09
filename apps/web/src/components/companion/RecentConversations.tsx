'use client'
import { useState, useEffect } from 'react'
import { MessageSquarePlus } from 'lucide-react'
import Card from '@/components/ui/Card'
import { getCompanionConversations, createCompanionConversation } from '@/lib/api/v1-client'
import type { CompanionConversationsListResponse } from '@dpnr/shared-types'
import { timeAgo } from '@/lib/format'

interface Props {
  activeSessionId: string | null
  onSelect: (sessionId: string) => void
  onCreated: (sessionId: string) => void
}

/**
 * Companion's "Recent Conversations" — discrete conversations (Session 42),
 * built to close a real gap the reference screen had and the live app
 * didn't: Companion used to be one continuous thread per user, forever.
 * Capped to the 10 most recent — the reference's own "View all" link has
 * no v1 destination, out of scope for this pass.
 */
export default function RecentConversations({ activeSessionId, onSelect, onCreated }: Props) {
  const [conversations, setConversations] = useState<CompanionConversationsListResponse['conversations']>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

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

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-wide">Recent Conversations</p>
        <button
          onClick={handleNew}
          disabled={creating}
          className="inline-flex items-center gap-1 text-xs text-[var(--color-violet-300)] hover:text-[var(--color-violet-200)] disabled:opacity-50"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" /> New
        </button>
      </div>

      {loading ? (
        <p className="text-[var(--color-text-tertiary)] text-xs">Loading…</p>
      ) : conversations.length === 0 ? (
        <p className="text-[var(--color-text-tertiary)] text-xs">Nothing here yet.</p>
      ) : (
        <div className="space-y-1">
          {conversations.slice(0, 10).map((c) => (
            <button
              key={c.sessionId}
              onClick={() => onSelect(c.sessionId)}
              className={`w-full flex items-center justify-between gap-3 rounded-xl -mx-2 px-2 py-2 text-left transition-colors ${
                c.sessionId === activeSessionId ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
            >
              <p className="text-sm text-white/80 line-clamp-1">{c.title ?? 'New conversation'}</p>
              <span className="text-xs text-[var(--color-text-tertiary)] shrink-0">{timeAgo(c.lastMessageAt)}</span>
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}
