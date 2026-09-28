'use client'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import { Lock, Pencil, Trash2 } from 'lucide-react'
import { JOURNAL_BODY_MAX, JOURNAL_TITLE_MAX, type JournalEntryView } from '@dpnr/shared-types'
import Card from '@/components/ui/Card'
import { getCurrentSession } from '@/lib/cognito/client'
import { listJournal, createJournalEntry, updateJournalEntry, deleteJournalEntry } from '@/lib/api/v1-client'
import Dictatable from '@/components/ui/Dictatable'

/**
 * Self Reflection — the private journal (founder feedback #16, Session 74).
 * Write, read back, edit and delete your own entries, newest first.
 * Entries are encrypted at rest and never read by any AI, the Digital Twin,
 * signals or scoring (see lambda/personal/handler.ts), which is what the
 * privacy line on this page promises.
 */
export default function JournalPage() {
  const t = useTranslations('Journal')
  const locale = useLocale()
  const router = useRouter()
  const [entries, setEntries] = useState<JournalEntryView[] | null>(null)
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [loadFailed, setLoadFailed] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    async function load() {
      const session = await getCurrentSession()
      if (!session) { router.push('/login'); return }
      try {
        const res = await listJournal()
        if (ignore) return
        setEntries(res.entries)
        setCursor(res.nextCursor)
      } catch {
        if (!ignore) setLoadFailed(true)
      }
    }
    load()
    return () => { ignore = true }
  }, [router])

  async function loadMore() {
    if (!cursor) return
    setLoadingMore(true)
    try {
      const res = await listJournal(cursor)
      setEntries((prev) => [...(prev ?? []), ...res.entries])
      setCursor(res.nextCursor)
    } catch {
      setError(t('loadError'))
    } finally {
      setLoadingMore(false)
    }
  }

  async function save() {
    if (!body.trim()) return
    setSaving(true)
    setError(null)
    try {
      const created = await createJournalEntry({ title: title.trim() || undefined, body: body.trim() })
      setEntries((prev) => [created, ...(prev ?? [])])
      setTitle('')
      setBody('')
    } catch {
      setError(t('error'))
    } finally {
      setSaving(false)
    }
  }

  const input = 'w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-violet-500)]/60 transition-colors'

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/utility-bg.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>

      <div className="max-w-[440px] lg:max-w-3xl mx-auto px-5 lg:px-8 pb-16 lg:pb-12">
        <div className="pt-14 lg:pt-8 pb-6 space-y-2">
          <Link href="/account" className="inline-flex items-center gap-1 text-xs text-[var(--color-text-tertiary)] hover:text-white transition-colors">
            <span aria-hidden className="rtl:-scale-x-100">←</span> {t('back')}
          </Link>
          <h1 className="font-display text-3xl lg:text-4xl text-white">{t('title')}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">{t('subtitle')}</p>
          <p className="flex items-start gap-1.5 text-xs text-[var(--color-text-tertiary)] leading-relaxed">
            <Lock aria-hidden className="h-3.5 w-3.5 shrink-0 translate-y-px" strokeWidth={1.75} />
            {t('privacy')}
          </p>
        </div>

        <Card className="p-4 lg:p-5 space-y-3">
          <p className="text-white/80 text-sm">{t('newEntry')}</p>
          <Dictatable single>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, JOURNAL_TITLE_MAX))}
              placeholder={t('titlePlaceholder')}
              className={`${input} text-sm`}
            />
          </Dictatable>
          <Dictatable>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, JOURNAL_BODY_MAX))}
              placeholder={t('bodyPlaceholder')}
              rows={6}
              className={`${input} text-base leading-relaxed resize-y min-h-[140px]`}
            />
          </Dictatable>
          {error && <p className="text-red-400/90 text-xs">{error}</p>}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={save}
              disabled={saving || !body.trim()}
              className="rounded-full bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] px-5 py-2.5 text-sm text-white transition-colors disabled:opacity-40"
            >
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        </Card>

        <div className="mt-6 space-y-3">
          {loadFailed ? (
            <p className="text-sm text-[var(--color-text-tertiary)]">{t('loadError')}</p>
          ) : entries === null ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-[var(--color-violet-500)]/40 border-t-[var(--color-violet-500)] rounded-full animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-[var(--color-text-tertiary)] text-center py-6">{t('empty')}</p>
          ) : (
            entries.map((entry) => (
              <JournalEntryCard
                key={entry.entryId}
                entry={entry}
                locale={locale}
                onUpdated={(next) => setEntries((prev) => (prev ?? []).map((e) => (e.entryId === next.entryId ? next : e)))}
                onDeleted={(id) => setEntries((prev) => (prev ?? []).filter((e) => e.entryId !== id))}
              />
            ))
          )}
          {cursor && (
            <div className="flex justify-center pt-2">
              <button type="button" onClick={loadMore} disabled={loadingMore} className="text-sm text-[var(--color-violet-300)] hover:text-white disabled:opacity-50 transition-colors">
                {t('loadMore')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function JournalEntryCard({ entry, locale, onUpdated, onDeleted }: {
  entry: JournalEntryView
  locale: string
  onUpdated: (entry: JournalEntryView) => void
  onDeleted: (entryId: string) => void
}) {
  const t = useTranslations('Journal')
  const [mode, setMode] = useState<'read' | 'edit' | 'confirmDelete'>('read')
  const [title, setTitle] = useState(entry.title ?? '')
  const [body, setBody] = useState(entry.body)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const date = new Date(entry.createdAt).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const edited = entry.updatedAt !== entry.createdAt

  async function save() {
    if (!body.trim()) return
    setBusy(true)
    setError(null)
    try {
      onUpdated(await updateJournalEntry(entry.entryId, { title: title.trim() || undefined, body: body.trim() }))
      setMode('read')
    } catch {
      setError(t('error'))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    setError(null)
    try {
      await deleteJournalEntry(entry.entryId)
      onDeleted(entry.entryId)
    } catch {
      setError(t('error'))
      setBusy(false)
    }
  }

  return (
    <Card className="p-4 lg:p-5 animate-settle-in">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">
            {date}{edited ? ` · ${t('edited')}` : ''}
          </p>
          {mode !== 'edit' && <h2 className="text-white text-base mt-1">{entry.title || t('untitled')}</h2>}
        </div>
        {mode === 'read' && (
          <>
            <button type="button" onClick={() => setMode('edit')} aria-label={t('edit')} className="p-1.5 text-white/40 hover:text-white transition-colors">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => setMode('confirmDelete')} aria-label={t('delete')} className="p-1.5 text-white/40 hover:text-red-300 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {mode === 'edit' ? (
        <div className="mt-3 space-y-2">
          <Dictatable single>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, JOURNAL_TITLE_MAX))}
              placeholder={t('titlePlaceholder')}
              className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-violet-500)]/60"
            />
          </Dictatable>
          <Dictatable>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, JOURNAL_BODY_MAX))}
              rows={6}
              className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white leading-relaxed resize-y focus:outline-none focus:border-[var(--color-violet-500)]/60"
            />
          </Dictatable>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setMode('read'); setTitle(entry.title ?? ''); setBody(entry.body) }} className="px-3 py-1.5 text-xs text-white/50 hover:text-white">{t('cancel')}</button>
            <button type="button" onClick={save} disabled={busy || !body.trim()} className="rounded-full bg-[var(--color-violet-600)] px-4 py-1.5 text-xs text-white disabled:opacity-40">{t('update')}</button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-white/75 leading-relaxed whitespace-pre-wrap break-words">{entry.body}</p>
      )}

      {mode === 'confirmDelete' && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-red-900/30 bg-red-950/20 px-3 py-2">
          <p className="flex-1 text-xs text-red-300/90">{t('deleteConfirm')}</p>
          <button type="button" onClick={() => setMode('read')} className="px-2 py-1 text-xs text-white/50 hover:text-white">{t('cancel')}</button>
          <button type="button" onClick={remove} disabled={busy} className="rounded-lg bg-red-700 hover:bg-red-600 px-3 py-1 text-xs text-white disabled:opacity-40">{t('confirmDelete')}</button>
        </div>
      )}
      {error && <p className="mt-2 text-red-400/90 text-xs">{error}</p>}
    </Card>
  )
}
