'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import { Sunrise, Sun, Moon, ChevronRight, Pencil, Trash2, X, Plus, Check } from 'lucide-react'
import type { RitualTimeOfDay, RitualView } from '@dpnr/shared-types'
import { RITUAL_TEXT_MAX, RITUALS_MAX } from '@dpnr/shared-types/constants'
import Card from '@/components/ui/Card'
import { listRituals, createRitual, updateRitual, deleteRitual, ApiError } from '@/lib/api/v1-client'
import Dictatable from '@/components/ui/Dictatable'

const TIMES: { id: RitualTimeOfDay; Icon: typeof Sun; tint: string }[] = [
  { id: 'morning', Icon: Sunrise, tint: 'text-amber-300' },
  { id: 'afternoon', Icon: Sun, tint: 'text-yellow-200' },
  { id: 'evening', Icon: Moon, tint: 'text-violet-300' },
]

/**
 * My Profile → My Rituals (founder feedback #16, Session 74): compact and
 * light by design ("personal and lightweight, not a dashboard"). The person
 * writes their own rituals, grouped Morning / Afternoon / Evening. No
 * reminders: there's no scheduling/notification infrastructure (flagged to
 * the user, not built).
 *
 * Viewing and adding are separate steps (founder, 2026-09-29: after adding,
 * an empty row kept reopening, and the card only showed counts). The card
 * lists the rituals themselves; a group opens in view mode with an explicit
 * "Add a ritual" action, and saving one confirms it and returns to the list
 * instead of offering another empty field. An empty group opens straight
 * into adding.
 */
const PREVIEW_PER_GROUP = 3
export default function RitualsCard() {
  const t = useTranslations('Account.profile.rituals')
  const [rituals, setRituals] = useState<RitualView[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [open, setOpen] = useState<RitualTimeOfDay | null>(null)

  useEffect(() => {
    listRituals()
      .then((res) => setRituals(res.rituals))
      .catch(() => setLoadFailed(true))
  }, [])

  const ritualsFor = (time: RitualTimeOfDay) => (rituals ?? []).filter((r) => r.timeOfDay === time)

  return (
    <Card className="p-4 lg:p-5">
      <p className="text-[var(--color-text-tertiary)] text-[11px] uppercase tracking-[0.14em]">{t('eyebrow')}</p>
      <h2 className="font-display text-white text-lg mt-1">{t('title')}</h2>
      <p className="text-[var(--color-text-tertiary)] text-xs leading-relaxed mt-1">{t('body')}</p>
      {loadFailed ? (
        <p className="text-[var(--color-text-tertiary)] text-xs mt-3">{t('loadError')}</p>
      ) : (
        <ul className="mt-3 divide-y divide-white/8">
          {TIMES.map(({ id, Icon, tint }) => {
            const mine = ritualsFor(id)
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setOpen(id)}
                  disabled={rituals === null}
                  className="w-full py-2.5 text-start transition-colors hover:text-white disabled:opacity-60"
                >
                  <span className="flex items-center gap-3">
                    <Icon aria-hidden className={`h-4 w-4 shrink-0 ${tint}`} strokeWidth={1.75} />
                    <span className="flex-1 text-sm text-white/85">{t(id)}</span>
                    <span className="text-xs text-[var(--color-text-tertiary)]">{rituals === null ? '…' : t('count', { count: mine.length })}</span>
                    <ChevronRight aria-hidden className="h-3.5 w-3.5 text-white/30 rtl:-scale-x-100" />
                  </span>
                  {mine.length > 0 && (
                    <span className="mt-1.5 block ps-7 space-y-1">
                      {mine.slice(0, PREVIEW_PER_GROUP).map((r) => (
                        <span key={r.ritualId} className="block truncate text-xs text-white/65">{r.text}</span>
                      ))}
                      {mine.length > PREVIEW_PER_GROUP && (
                        <span className="block text-xs text-[var(--color-text-tertiary)]">
                          {t('more', { count: mine.length - PREVIEW_PER_GROUP })}
                        </span>
                      )}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {open && rituals && (
        <RitualsSheet
          time={open}
          rituals={rituals}
          onChange={setRituals}
          onClose={() => setOpen(null)}
        />
      )}
    </Card>
  )
}

function RitualsSheet({ time, rituals, onChange, onClose }: {
  time: RitualTimeOfDay
  rituals: RitualView[]
  onChange: (next: RitualView[]) => void
  onClose: () => void
}) {
  const t = useTranslations('Account.profile.rituals')
  // Opens straight into adding only when this group has nothing yet.
  const [adding, setAdding] = useState(() => !rituals.some((r) => r.timeOfDay === time))
  const [justAdded, setJustAdded] = useState(false)
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mine = rituals.filter((r) => r.timeOfDay === time)
  const { Icon, tint } = TIMES.find((x) => x.id === time)!

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof ApiError && err.code === 'rituals_limit' ? t('limit', { max: RITUALS_MAX }) : t('error'))
    } finally {
      setBusy(false)
    }
  }

  const add = () => run(async () => {
    const text = draft.trim()
    if (!text) return
    const created = await createRitual({ timeOfDay: time, text })
    onChange([...rituals, created])
    setDraft('')
    setAdding(false)
    setJustAdded(true)
  })

  const saveEdit = () => run(async () => {
    if (!editing || !editing.text.trim()) return
    const updated = await updateRitual(editing.id, { text: editing.text.trim() })
    onChange(rituals.map((r) => (r.ritualId === updated.ritualId ? updated : r)))
    setEditing(null)
  })

  const remove = (id: string) => run(async () => {
    await deleteRitual(id)
    onChange(rituals.filter((r) => r.ritualId !== id))
  })

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center px-4 pb-6 sm:pb-0" role="dialog" aria-modal="true" aria-labelledby="rituals-sheet-title">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-[420px] rounded-3xl border border-white/10 bg-[#130d1f] p-5 space-y-4 animate-settle-in">
        <div className="flex items-center gap-2">
          <Icon aria-hidden className={`h-4 w-4 ${tint}`} strokeWidth={1.75} />
          <h3 id="rituals-sheet-title" className="flex-1 text-white text-base font-medium">{t(time)}</h3>
          <button type="button" onClick={onClose} aria-label={t('close')} className="rounded-full p-1.5 text-white/50 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {justAdded && (
          <p role="status" className="flex items-center gap-1.5 text-sm text-emerald-300/90 animate-fade-in">
            <Check aria-hidden className="h-4 w-4" /> {t('added', { time: t(time) })}
          </p>
        )}

        {mine.length === 0 ? (
          <p className="text-[var(--color-text-tertiary)] text-sm leading-relaxed">{t('empty')}</p>
        ) : (
          <ul className="space-y-2 max-h-[45vh] overflow-y-auto scrollbar-glass">
            {mine.map((r) => (
              <li key={r.ritualId} className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                {editing?.id === r.ritualId ? (
                  <div className="space-y-2">
                    <Dictatable>
                      <textarea
                        value={editing.text}
                        onChange={(e) => setEditing({ id: r.ritualId, text: e.target.value.slice(0, RITUAL_TEXT_MAX) })}
                        rows={2}
                        autoFocus
                        className="w-full resize-none rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-violet-500)]/60"
                      />
                    </Dictatable>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setEditing(null)} className="px-3 py-1.5 text-xs text-white/50 hover:text-white">{t('cancel')}</button>
                      <button type="button" onClick={saveEdit} disabled={busy || !editing.text.trim()} className="rounded-full bg-[var(--color-violet-600)] px-3 py-1.5 text-xs text-white disabled:opacity-40">{t('save')}</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <p className="flex-1 text-sm text-white/85 leading-relaxed whitespace-pre-wrap break-words">{r.text}</p>
                    <button type="button" onClick={() => setEditing({ id: r.ritualId, text: r.text })} aria-label={t('edit')} className="p-1 text-white/40 hover:text-white transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => remove(r.ritualId)} disabled={busy} aria-label={t('delete')} className="p-1 text-white/40 hover:text-red-300 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {adding ? (
          <div className="space-y-2">
            <Dictatable>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, RITUAL_TEXT_MAX))}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); add() } }}
                placeholder={t('addPlaceholder')}
                rows={2}
                autoFocus
                className="w-full resize-none rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-violet-500)]/60"
              />
            </Dictatable>
            {error && <p className="text-red-400/90 text-xs">{error}</p>}
            <div className="flex gap-2">
              {mine.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setAdding(false); setDraft(''); setError(null) }}
                  className="flex-1 rounded-2xl border border-white/15 py-2.5 text-sm text-white/70 hover:text-white transition-colors"
                >
                  {t('cancel')}
                </button>
              )}
              <button
                type="button"
                onClick={add}
                disabled={busy || !draft.trim()}
                className="flex-1 rounded-2xl bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] py-2.5 text-sm text-white transition-colors disabled:opacity-40"
              >
                {t('saveRitual')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {error && <p className="text-red-400/90 text-xs">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setAdding(true); setJustAdded(false) }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-2xl border border-[var(--color-violet-500)]/50 py-2.5 text-sm text-white hover:bg-white/5 transition-colors"
              >
                <Plus aria-hidden className="h-4 w-4" /> {t('addRitual')}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-2xl bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] py-2.5 text-sm text-white transition-colors"
              >
                {t('done')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
