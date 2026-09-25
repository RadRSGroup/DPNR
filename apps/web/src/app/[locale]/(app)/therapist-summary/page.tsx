'use client'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useLocale, useTranslations } from 'next-intl'
import { FileText, Printer, Trash2, ShieldCheck } from 'lucide-react'
import Card from '@/components/ui/Card'
import { getCommitments, getDashboard, getPreferences, getSessionSummaries, getTwin } from '@/lib/api/v1-client'
import { getCurrentSession } from '@/lib/cognito/client'
import { displayFirstName } from '@/lib/displayName'

/**
 * "Summary for my therapist" — docs/PROVIDER_SUMMARY_PLAN.md, Slice 1.
 *
 * The person assembles a summary from their own existing DPNR material,
 * edits or removes any line, and saves it as a PDF through the browser's
 * print dialog. Everything happens on this device: nothing here is written
 * to DPNR, and no request carries the summary's content anywhere (the page
 * only reads what the person can already see elsewhere in the app). Once
 * saved, the PDF is the person's own file and responsibility.
 *
 * No AI in this slice: it lays out the person's own text (plan §3.2).
 * Excluded by design: chats, unconfirmed signals, safety events (plan §3.1).
 */

const NOTE_MAX = 2000
const DAY_MS = 24 * 60 * 60 * 1000
const PRESETS = [30, 90, 180] as const

type SectionKey = 'focus' | 'patterns' | 'sessions' | 'commitments'

interface Line {
  id: string
  text: string
}
interface SessionLine extends Line {
  date: string
  roomType: 'decision' | 'mirror'
}
interface CommitmentLine extends Line {
  status: 'open' | 'completed' | 'dropped'
  reviewDate: string | null
}
interface Focus {
  currentFocus: string
  theme: string
  direction: string
}

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default function TherapistSummaryPage() {
  const t = useTranslations('TherapistSummary')
  const locale = useLocale()

  const today = useMemo(() => isoDay(new Date()), [])
  const [from, setFrom] = useState(() => isoDay(new Date(Date.now() - 30 * DAY_MS)))
  const [to, setTo] = useState(today)

  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [focus, setFocus] = useState<Focus | null>(null)
  const [patterns, setPatterns] = useState<Line[]>([])
  const [sessions, setSessions] = useState<SessionLine[]>([])
  const [commitments, setCommitments] = useState<CommitmentLine[]>([])
  const [include, setInclude] = useState<Record<SectionKey, boolean>>({ focus: true, patterns: true, sessions: true, commitments: true })

  const [loading, setLoading] = useState(true)
  // The range the loaded sessions belong to; loading = it differs from the current one.
  const [sessionsRange, setSessionsRange] = useState<string | null>(null)
  const sessionsLoading = sessionsRange !== `${from}|${to}`
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [confirmingPdf, setConfirmingPdf] = useState(false)
  // Portals need document.body, which only exists after hydration.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false)

  // Everything except Room sessions doesn't depend on the date range.
  useEffect(() => {
    let active = true
    async function load() {
      try {
        const session = await getCurrentSession()
        const email = session?.getIdToken().payload.email as string | undefined
        const [prefs, dashboard, twin, commitmentList] = await Promise.all([
          getPreferences().catch(() => null),
          getDashboard().catch(() => null),
          getTwin().catch(() => null),
          getCommitments().catch(() => null),
        ])
        if (!active) return
        setName(displayFirstName(prefs?.firstName, email))
        if (dashboard?.roadmap) {
          const { currentFocus, theme, direction } = dashboard.roadmap
          setFocus({ currentFocus, theme, direction })
        }
        setPatterns(
          (twin?.signals ?? [])
            .filter((s) => s.status === 'confirmed')
            .map((s) => ({ id: s.signalId, text: s.description }))
        )
        setCommitments(
          (commitmentList?.commitments ?? [])
            .filter((c) => c.status !== 'dropped')
            .map((c) => ({ id: c.commitmentId, text: c.description, status: c.status, reviewDate: c.reviewDate }))
        )
        if (!dashboard && !twin && !commitmentList) setError(t('loadError'))
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [t])

  useEffect(() => {
    let active = true
    const key = `${from}|${to}`
    getSessionSummaries(from, to)
      .then((res) => {
        if (!active) return
        setSessions(
          res.sessions.map((s) => ({ id: s.sessionId, text: s.summary, date: s.createdAt.slice(0, 10), roomType: s.roomType }))
        )
      })
      .catch(() => {
        if (active) setSessions([])
      })
      .finally(() => {
        if (active) setSessionsRange(key)
      })
    return () => {
      active = false
    }
  }, [from, to])

  function setPreset(days: number) {
    setTo(today)
    setFrom(isoDay(new Date(Date.parse(`${today}T00:00:00Z`) - days * DAY_MS)))
  }

  function downloadPdf() {
    setConfirmingPdf(false)
    window.print()
  }

  const doc = (
    <SummaryDocument
      name={name}
      from={from}
      to={to}
      locale={locale}
      note={note}
      focus={include.focus ? focus : null}
      patterns={include.patterns ? patterns : []}
      sessions={include.sessions ? sessions : []}
      commitments={include.commitments ? commitments : []}
    />
  )

  return (
    <div className="max-w-3xl mx-auto px-5 lg:px-8 pt-16 lg:pt-10 pb-16 space-y-5">
      <header>
        <h1 className="font-display text-3xl text-white">{t('title')}</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">{t('subtitle')}</p>
        <p className="mt-3 inline-flex items-start gap-2 text-xs text-[var(--color-text-tertiary)]">
          <ShieldCheck className="w-4 h-4 shrink-0 text-[var(--color-violet-300)]" />
          {t('privacy')}
        </p>
      </header>

      <div className="flex gap-2" role="tablist">
        {(['edit', 'preview'] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              mode === m ? 'bg-[var(--color-violet-600)] text-white' : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'
            }`}
          >
            {t(`mode.${m}`)}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}

      {mode === 'edit' ? (
        <div className="space-y-4">
          <Card className="space-y-4">
            <div>
              <p className="text-sm text-white/85 mb-2">{t('range.label')}</p>
              <div className="flex flex-wrap items-center gap-2">
                {PRESETS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setPreset(d)}
                    className="rounded-full px-3 py-1 text-xs bg-white/5 border border-white/10 text-white/75 hover:bg-white/10"
                  >
                    {t('range.lastDays', { days: d })}
                  </button>
                ))}
                <label className="flex items-center gap-1.5 text-xs text-white/60">
                  {t('range.from')}
                  <input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white/85" />
                </label>
                <label className="flex items-center gap-1.5 text-xs text-white/60">
                  {t('range.to')}
                  <input type="date" value={to} min={from} max={today} onChange={(e) => e.target.value && setTo(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white/85" />
                </label>
              </div>
            </div>
            <label className="block">
              <span className="block text-sm text-white/85 mb-1.5">{t('nameLabel')}</span>
              <input
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-violet-500)]/60"
              />
            </label>
          </Card>

          <Card>
            <label className="block">
              <span className="block text-sm text-white/85">{t('sections.note')}</span>
              <span className="block text-xs text-[var(--color-text-tertiary)] mt-0.5 mb-2">{t('sections.noteHint')}</span>
              <textarea
                value={note}
                maxLength={NOTE_MAX}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                placeholder={t('sections.notePlaceholder')}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-violet-500)]/60"
              />
              <span className="block text-end text-[11px] text-[var(--color-text-tertiary)]">{note.length}/{NOTE_MAX}</span>
            </label>
          </Card>

          <EditableSection
            title={t('sections.focus')}
            included={include.focus}
            onToggle={(v) => setInclude((s) => ({ ...s, focus: v }))}
            loading={loading}
            empty={!focus}
            emptyText={t('empty.focus')}
            toggleLabel={t('include')}
          >
            {focus &&
              (['currentFocus', 'theme', 'direction'] as const).map((k) => (
                <label key={k} className="block">
                  <span className="block text-xs text-[var(--color-text-tertiary)] mb-1">{t(`focus.${k}`)}</span>
                  <LineInput value={focus[k]} onChange={(v) => setFocus({ ...focus, [k]: v })} />
                </label>
              ))}
          </EditableSection>

          <EditableSection
            title={t('sections.patterns')}
            hint={t('sections.patternsHint')}
            included={include.patterns}
            onToggle={(v) => setInclude((s) => ({ ...s, patterns: v }))}
            loading={loading}
            empty={patterns.length === 0}
            emptyText={t('empty.patterns')}
            toggleLabel={t('include')}
          >
            {patterns.map((p) => (
              <EditableLine
                key={p.id}
                value={p.text}
                removeLabel={t('remove')}
                onChange={(v) => setPatterns((list) => list.map((x) => (x.id === p.id ? { ...x, text: v } : x)))}
                onRemove={() => setPatterns((list) => list.filter((x) => x.id !== p.id))}
              />
            ))}
          </EditableSection>

          <EditableSection
            title={t('sections.sessions')}
            included={include.sessions}
            onToggle={(v) => setInclude((s) => ({ ...s, sessions: v }))}
            loading={sessionsLoading}
            empty={sessions.length === 0}
            emptyText={t('empty.sessions')}
            toggleLabel={t('include')}
          >
            {sessions.map((s) => (
              <div key={s.id}>
                <p className="text-xs text-[var(--color-text-tertiary)] mb-1">
                  {t(`room.${s.roomType}`)} · {formatDate(s.date, locale)}
                </p>
                <EditableLine
                  value={s.text}
                  multiline
                  removeLabel={t('remove')}
                  onChange={(v) => setSessions((list) => list.map((x) => (x.id === s.id ? { ...x, text: v } : x)))}
                  onRemove={() => setSessions((list) => list.filter((x) => x.id !== s.id))}
                />
              </div>
            ))}
          </EditableSection>

          <EditableSection
            title={t('sections.commitments')}
            included={include.commitments}
            onToggle={(v) => setInclude((s) => ({ ...s, commitments: v }))}
            loading={loading}
            empty={commitments.length === 0}
            emptyText={t('empty.commitments')}
            toggleLabel={t('include')}
          >
            {commitments.map((c) => (
              <div key={c.id}>
                <p className="text-xs text-[var(--color-text-tertiary)] mb-1">{t(`commitmentStatus.${c.status}`)}</p>
                <EditableLine
                  value={c.text}
                  removeLabel={t('remove')}
                  onChange={(v) => setCommitments((list) => list.map((x) => (x.id === c.id ? { ...x, text: v } : x)))}
                  onRemove={() => setCommitments((list) => list.filter((x) => x.id !== c.id))}
                />
              </div>
            ))}
          </EditableSection>

          <button
            onClick={() => setMode('preview')}
            className="w-full rounded-2xl bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] text-white py-3 text-sm font-medium transition-colors"
          >
            {t('toPreview')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.4)]">{doc}</div>
          {confirmingPdf ? (
            <Card className="space-y-3">
              <p className="text-sm text-white/85">{t('pdfWarning.title')}</p>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{t('pdfWarning.body')}</p>
              <div className="flex gap-2">
                <button onClick={downloadPdf} className="flex-1 rounded-2xl bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] text-white py-2.5 text-sm">
                  {t('pdfWarning.confirm')}
                </button>
                <button onClick={() => setConfirmingPdf(false)} className="flex-1 rounded-2xl border border-white/15 text-white/70 hover:text-white py-2.5 text-sm">
                  {t('pdfWarning.cancel')}
                </button>
              </div>
            </Card>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingPdf(true)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] text-white py-3 text-sm font-medium"
              >
                <Printer className="w-4 h-4" /> {t('downloadPdf')}
              </button>
              <button onClick={() => setMode('edit')} className="rounded-2xl border border-white/15 text-white/70 hover:text-white px-5 py-3 text-sm">
                {t('backToEdit')}
              </button>
            </div>
          )}
          <p className="text-xs text-[var(--color-text-tertiary)]">{t('pdfHowTo')}</p>
        </div>
      )}

      {/* The printable copy lives directly under <body> (globals.css "Printing"),
          so the printed page has no app chrome around it. */}
      {mounted && createPortal(<div className="print-root">{doc}</div>, document.body)}
    </div>
  )
}

function noopSubscribe() {
  return () => {}
}

function formatDate(day: string, locale: string) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function EditableSection({
  title,
  hint,
  included,
  onToggle,
  loading,
  empty,
  emptyText,
  toggleLabel,
  children,
}: {
  title: string
  hint?: string
  included: boolean
  onToggle: (v: boolean) => void
  loading: boolean
  empty: boolean
  emptyText: string
  toggleLabel: string
  children: React.ReactNode
}) {
  return (
    <Card className={`space-y-3 transition-opacity ${included ? '' : 'opacity-60'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-white/85">{title}</p>
          {hint && <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{hint}</p>}
        </div>
        <label className="inline-flex items-center gap-2 text-xs text-white/70 shrink-0 cursor-pointer">
          <input type="checkbox" checked={included} onChange={(e) => onToggle(e.target.checked)} className="accent-[var(--color-violet-500)] w-4 h-4" />
          {toggleLabel}
        </label>
      </div>
      {included &&
        (loading ? (
          <div className="h-10 rounded-xl bg-white/5 animate-soft-pulse" />
        ) : empty ? (
          <p className="text-xs text-[var(--color-text-tertiary)]">{emptyText}</p>
        ) : (
          <div className="space-y-3">{children}</div>
        ))}
    </Card>
  )
}

function LineInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-violet-500)]/60"
    />
  )
}

function EditableLine({
  value,
  multiline,
  removeLabel,
  onChange,
  onRemove,
}: {
  value: string
  multiline?: boolean
  removeLabel: string
  onChange: (v: string) => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-start gap-2">
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={Math.min(8, Math.max(3, Math.ceil(value.length / 90)))}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white leading-relaxed focus:outline-none focus:border-[var(--color-violet-500)]/60"
        />
      ) : (
        <div className="flex-1">
          <LineInput value={value} onChange={onChange} />
        </div>
      )}
      <button
        onClick={onRemove}
        aria-label={removeLabel}
        title={removeLabel}
        className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/5"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

/** The document itself: a paper page (white, dark text), the same on screen and in print. */
function SummaryDocument({
  name,
  from,
  to,
  locale,
  note,
  focus,
  patterns,
  sessions,
  commitments,
}: {
  name: string
  from: string
  to: string
  locale: string
  note: string
  focus: Focus | null
  patterns: Line[]
  sessions: SessionLine[]
  commitments: CommitmentLine[]
}) {
  const t = useTranslations('TherapistSummary')
  const who = name.trim() || t('doc.theClient')
  const has = (s: string) => s.trim().length > 0
  const liveSessions = sessions.filter((s) => has(s.text))
  const livePatterns = patterns.filter((p) => has(p.text))
  const liveCommitments = commitments.filter((c) => has(c.text))
  const nothing = !has(note) && !focus && livePatterns.length + liveSessions.length + liveCommitments.length === 0

  return (
    <article className="summary-doc bg-white text-neutral-900 px-8 py-9 lg:px-12 lg:py-12 text-[13px] leading-relaxed">
      <header className="border-b border-neutral-300 pb-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          <p className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.2em] uppercase text-neutral-500">
            <FileText className="w-3.5 h-3.5" /> DPNR
          </p>
          <p className="text-[11px] text-neutral-500">{t('doc.createdOn', { date: formatDate(new Date().toISOString().slice(0, 10), locale) })}</p>
        </div>
        <h2 className="font-display text-2xl text-neutral-900 mt-2">{t('doc.title', { name: who })}</h2>
        <p className="text-neutral-600 mt-1">{t('doc.period', { from: formatDate(from, locale), to: formatDate(to, locale) })}</p>
        <p className="mt-3 text-[11.5px] text-neutral-600 bg-neutral-100 rounded-md px-3 py-2">{t('doc.disclaimer', { name: who })}</p>
      </header>

      {nothing && <p className="text-neutral-500">{t('doc.nothing')}</p>}

      {has(note) && (
        <DocSection title={t('sections.note')}>
          <p className="whitespace-pre-wrap">{note.trim()}</p>
        </DocSection>
      )}

      {focus && (has(focus.currentFocus) || has(focus.theme) || has(focus.direction)) && (
        <DocSection title={t('sections.focus')}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            {(['currentFocus', 'theme', 'direction'] as const)
              .filter((k) => has(focus[k]))
              .map((k) => (
                <div key={k} className="contents">
                  <dt className="text-neutral-500">{t(`focus.${k}`)}</dt>
                  <dd>{focus[k].trim()}</dd>
                </div>
              ))}
          </dl>
        </DocSection>
      )}

      {livePatterns.length > 0 && (
        <DocSection title={t('sections.patterns')}>
          <ul className="list-disc ps-5 space-y-1">
            {livePatterns.map((p) => (
              <li key={p.id}>{p.text.trim()}</li>
            ))}
          </ul>
        </DocSection>
      )}

      {liveSessions.length > 0 && (
        <DocSection title={t('sections.sessions')}>
          <div className="space-y-3">
            {liveSessions.map((s) => (
              <div key={s.id} className="break-inside-avoid">
                <p className="text-[11.5px] text-neutral-500">
                  {t(`room.${s.roomType}`)} · {formatDate(s.date, locale)}
                </p>
                <p className="whitespace-pre-wrap">{s.text.trim()}</p>
              </div>
            ))}
          </div>
        </DocSection>
      )}

      {liveCommitments.length > 0 && (
        <DocSection title={t('sections.commitments')}>
          <ul className="space-y-1">
            {liveCommitments.map((c) => (
              <li key={c.id} className="flex gap-2">
                <span className="text-neutral-500 shrink-0">{c.status === 'completed' ? '✓' : '○'}</span>
                <span>
                  {c.text.trim()}
                  {c.reviewDate && c.status === 'open' && (
                    <span className="text-neutral-500"> · {t('doc.reviewBy', { date: formatDate(c.reviewDate, locale) })}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </DocSection>
      )}

      <footer className="mt-8 pt-3 border-t border-neutral-200 text-[10.5px] text-neutral-500">{t('doc.footer')}</footer>
    </article>
  )
}

function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 break-inside-avoid-page">
      <h3 className="text-[11px] tracking-[0.15em] uppercase text-neutral-500 mb-2">{title}</h3>
      {children}
    </section>
  )
}
