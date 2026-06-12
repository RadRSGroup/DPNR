'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  addOutcome, getOutcomes, updateDecision,
  replaceTagsForType, replaceProjections, deleteDecision,
} from '@/lib/supabase/decisions'
import { useRouter } from 'next/navigation'
import { CalendarButtons } from '@/components/ui/CalendarButtons'
import { PRESET_TAGS } from '@/lib/types'

/* ─── Types ─────────────────────────────────────────── */
type Tag = { label: string; tag_type: string }
type Projection = { statement: string; selected: boolean }
type OptionRow = { id: string; label: string; content: string; approved: boolean; tags: Tag[]; projections: Projection[] }
type EmotionMap = { body_location: string; emotion_color: string; ai_reflection: string }
type Outcome = { id: string; reflection: string; chosen_option_id: string | null; created_at: string }
type DecisionDetail = {
  id: string; title: string; subtitle: string | null; narrative: string | null
  status: string; current_step: number; lens: string | null
  review_date: string | null; created_at: string
  options: OptionRow[]; emotion_maps: EmotionMap[]
}

/* ─── Constants ─────────────────────────────────────── */
const LENS_LABEL: Record<string, string> = {
  pros_cons: 'Pros & Cons', fears_desires: 'Fears & Desires', values_needs: 'Values & Needs',
}
const TAG_COLOR: Record<string, string> = {
  pro: 'bg-emerald-900/30 border-emerald-700/40 text-emerald-300',
  con: 'bg-red-900/30 border-red-700/40 text-red-300',
  desire: 'bg-purple-900/30 border-purple-700/40 text-purple-300',
  fear: 'bg-orange-900/30 border-orange-700/40 text-orange-300',
  value: 'bg-blue-900/30 border-blue-700/40 text-blue-300',
  need: 'bg-indigo-900/30 border-indigo-700/40 text-indigo-300',
}
const TAG_LABEL: Record<string, string> = {
  pro: 'Pros', con: 'Cons', desire: 'Desires', fear: 'Fears', value: 'Values', need: 'Needs',
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/* ─── Editable tag section ───────────────────────────── */
function EditableTagGroup({
  optionId, tagType, currentTags, onSaved,
  decisionId, optionLabel, optionContent, narrative,
}: {
  optionId: string; tagType: string; currentTags: string[]; onSaved: () => void
  decisionId?: string; optionLabel?: string; optionContent?: string; narrative?: string
}) {
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState<string[]>(currentTags)
  const [custom, setCustom] = useState('')
  const [saving, setSaving] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [suggesting, setSuggesting] = useState(false)

  const presetKey = tagType as keyof typeof PRESET_TAGS
  const usePresets = tagType === 'desire' || tagType === 'fear' || tagType === 'value' || tagType === 'need'
  const presets: string[] = usePresets ? (PRESET_TAGS[presetKey] ?? []) : []
  const allChips = [
    ...presets,
    ...aiSuggestions,
    ...selected,
  ].filter((v, i, a) => a.indexOf(v) === i)

  const canSuggest = !!(optionContent || narrative)

  async function fetchSuggestions() {
    if (!canSuggest) return
    setSuggesting(true)
    try {
      let aiType: string
      let params: Record<string, unknown>

      if (tagType === 'pro' || tagType === 'con') {
        aiType = 'pros_cons_tags'
        params = { optionLabel: optionLabel ?? 'A', optionText: optionContent ?? '', narrative: narrative ?? '' }
      } else if (tagType === 'desire' || tagType === 'fear') {
        aiType = 'fear_desire_tags'
        params = { narrative: narrative ?? optionContent ?? '' }
      } else {
        aiType = 'values_needs_tags'
        params = { optionLabel: optionLabel ?? 'A', optionText: optionContent ?? '' }
      }

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: aiType, decisionId, ...params }),
      })
      const json = await res.json()
      if (!res.ok) return

      let newSuggestions: string[] = []
      const r = json.result
      if (tagType === 'pro') newSuggestions = r.pros ?? []
      else if (tagType === 'con') newSuggestions = r.cons ?? []
      else if (tagType === 'desire') newSuggestions = r.desires ?? []
      else if (tagType === 'fear') newSuggestions = r.fears ?? []
      else if (tagType === 'value') newSuggestions = r.values ?? []
      else if (tagType === 'need') newSuggestions = r.needs ?? []

      setAiSuggestions(prev => [...new Set([...prev, ...newSuggestions])])
    } catch {}
    setSuggesting(false)
  }

  function toggle(label: string) {
    setSelected(prev => prev.includes(label) ? prev.filter(t => t !== label) : [...prev, label])
  }

  function addCustom() {
    const v = custom.trim()
    if (!v) return
    if (!selected.includes(v)) setSelected(prev => [...prev, v])
    setCustom('')
  }

  async function save() {
    setSaving(true)
    try { await replaceTagsForType(optionId, tagType, selected); onSaved() }
    catch {}
    setSaving(false)
    setEditing(false)
  }

  if (!editing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-white/30 text-xs font-medium uppercase tracking-wide">{TAG_LABEL[tagType]}</p>
          <button onClick={() => { setSelected(currentTags); setAiSuggestions([]); setEditing(true) }}
            className="text-white/20 hover:text-purple-400 text-xs transition-colors">Edit</button>
        </div>
        {currentTags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {currentTags.map(t => (
              <span key={t} className={`text-xs border rounded-full px-2.5 py-1 ${TAG_COLOR[tagType] ?? 'bg-white/5 border-white/10 text-white/50'}`}>{t}</span>
            ))}
          </div>
        ) : (
          <p className="text-white/20 text-xs italic">None added — tap Edit to add</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3 bg-white/3 rounded-xl p-3 border border-white/10">
      <div className="flex items-center justify-between">
        <p className="text-purple-300 text-xs font-medium uppercase tracking-wide">{TAG_LABEL[tagType]} — editing</p>
        {canSuggest && (
          <button
            onClick={fetchSuggestions}
            disabled={suggesting}
            className="flex items-center gap-1 text-xs text-purple-400/70 hover:text-purple-300 disabled:opacity-40 transition-colors"
          >
            {suggesting
              ? <span className="animate-pulse">Suggesting…</span>
              : <><span className="text-purple-500">✦</span> AI suggest</>
            }
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {allChips.map(chip => (
          <button
            key={chip}
            onClick={() => toggle(chip)}
            className={`text-xs border rounded-full px-2.5 py-1 transition-all ${
              selected.includes(chip)
                ? TAG_COLOR[tagType] ?? 'bg-purple-900/30 border-purple-700/40 text-purple-300'
                : aiSuggestions.includes(chip) && !presets.includes(chip)
                  ? 'bg-purple-900/10 border-purple-700/25 text-purple-400/60 hover:border-purple-600/40'
                  : 'bg-white/5 border-white/10 text-white/40 hover:border-white/25'
            }`}
          >{chip}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCustom()}
          placeholder="Add your own…"
          className="flex-1 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-white text-xs placeholder-white/25 focus:outline-none focus:border-purple-500/50"
        />
        <button onClick={addCustom} className="px-3 py-1.5 rounded-full bg-purple-900/30 border border-purple-700/40 text-purple-400 text-xs hover:bg-purple-800/40 transition-colors">Add</button>
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={saving}
          className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-medium transition-all">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={() => setEditing(false)} className="px-4 text-white/30 text-xs">Cancel</button>
      </div>
    </div>
  )
}

/* ─── Editable projections ──────────────────────────── */
function EditableProjections({
  optionId, projections, onSaved,
  decisionId, optionLabel, optionContent,
}: {
  optionId: string; projections: Projection[]; onSaved: () => void
  decisionId?: string; optionLabel?: string; optionContent?: string
}) {
  const [editing, setEditing] = useState(false)
  const [items, setItems] = useState<Projection[]>(projections)
  const [custom, setCustom] = useState('')
  const [saving, setSaving] = useState(false)
  const [suggesting, setSuggesting] = useState(false)

  const canSuggest = !!optionContent

  async function fetchSuggestions() {
    if (!canSuggest) return
    setSuggesting(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'future_projection',
          decisionId,
          optionLabel: optionLabel ?? 'A',
          optionText: optionContent,
        }),
      })
      const json = await res.json()
      if (!res.ok) return
      const statements: string[] = json.result?.statements ?? []
      setItems(prev => {
        const existing = new Set(prev.map(p => p.statement))
        const fresh = statements.filter(s => !existing.has(s)).map(s => ({ statement: s, selected: false }))
        return [...prev, ...fresh]
      })
    } catch {}
    setSuggesting(false)
  }

  function toggleSelected(i: number) {
    setItems(prev => prev.map((p, idx) => idx === i ? { ...p, selected: !p.selected } : p))
  }

  function addCustom() {
    const v = custom.trim()
    if (!v) return
    setItems(prev => [...prev, { statement: v, selected: true }])
    setCustom('')
  }

  async function save() {
    setSaving(true)
    try { await replaceProjections(optionId, items); onSaved() }
    catch {}
    setSaving(false)
    setEditing(false)
  }

  if (!editing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-white/30 text-xs font-medium uppercase tracking-wide">Future projections</p>
          <button onClick={() => { setItems(projections); setEditing(true) }}
            className="text-white/20 hover:text-purple-400 text-xs transition-colors">Edit</button>
        </div>
        {projections.length > 0 ? (
          <div className="space-y-2">
            {projections.map((p, i) => (
              <div key={i} className={`flex items-start gap-2 text-sm ${p.selected ? 'text-white/70' : 'text-white/30'}`}>
                <span className={`mt-0.5 flex-shrink-0 text-xs ${p.selected ? 'text-purple-400' : 'text-white/20'}`}>{p.selected ? '✓' : '○'}</span>
                <span>{p.statement}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white/20 text-xs italic">None added — tap Edit to add</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3 bg-white/3 rounded-xl p-3 border border-white/10">
      <div className="flex items-center justify-between">
        <p className="text-purple-300 text-xs font-medium uppercase tracking-wide">Future projections — editing</p>
        {canSuggest && (
          <button
            onClick={fetchSuggestions}
            disabled={suggesting}
            className="flex items-center gap-1 text-xs text-purple-400/70 hover:text-purple-300 disabled:opacity-40 transition-colors"
          >
            {suggesting
              ? <span className="animate-pulse">Suggesting…</span>
              : <><span className="text-purple-500">✦</span> AI suggest</>
            }
          </button>
        )}
      </div>
      <div className="space-y-2">
        {items.map((p, i) => (
          <button key={i} onClick={() => toggleSelected(i)}
            className={`w-full flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all text-sm ${
              p.selected ? 'bg-purple-900/20 border-purple-600/40 text-white/80' : 'bg-white/5 border-white/10 text-white/40'
            }`}>
            <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${p.selected ? 'bg-purple-600 border-purple-500' : 'border-white/30'}`}>
              {p.selected && <span className="text-white text-xs">✓</span>}
            </div>
            {p.statement}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={custom} onChange={e => setCustom(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCustom()}
          placeholder="Add another future…"
          className="flex-1 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-white text-xs placeholder-white/25 focus:outline-none focus:border-purple-500/50"
        />
        <button onClick={addCustom} className="px-3 py-1.5 rounded-full bg-purple-900/30 border border-purple-700/40 text-purple-400 text-xs">Add</button>
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={saving}
          className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-medium transition-all">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={() => setEditing(false)} className="px-4 text-white/30 text-xs">Cancel</button>
      </div>
    </div>
  )
}

/* ─── Option deep-dive card ─────────────────────────── */
function OptionCard({ opt, lens, onSaved, decisionId, narrative }: {
  opt: OptionRow; lens: string | null; onSaved: () => void
  decisionId?: string; narrative?: string
}) {
  const [open, setOpen] = useState(false)

  const tagsByType = (type: string) => opt.tags.filter(t => t.tag_type === type).map(t => t.label)

  // Which tag groups to show based on lens
  const lensGroups: string[][] =
    lens === 'fears_desires' ? [['desire', 'fear'], ['value', 'need']] :
    lens === 'values_needs'  ? [['value', 'need']] :
    [['pro', 'con'], ['value', 'need']]  // default: pros_cons or unknown

  const allTagGroups = [['pro', 'con'], ['desire', 'fear'], ['value', 'need']]
  // Show all groups that have data OR match the lens
  const groupsToShow = allTagGroups.filter(group =>
    group.some(type => tagsByType(type).length > 0) ||
    lensGroups.flat().includes(group[0])
  )

  return (
    <div className={`rounded-2xl border transition-all ${open ? 'border-purple-600/40 bg-purple-900/10' : 'border-white/10 bg-white/5'}`}>
      {/* Header row — always visible */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-start justify-between p-4 text-left"
      >
        <div className="flex-1 pr-3">
          <p className="text-purple-400 text-xs font-medium uppercase tracking-wide mb-1">Option {opt.label}</p>
          <p className="text-white/75 text-sm leading-relaxed line-clamp-3">{opt.content}</p>
          {!open && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {['pro','value','desire'].map(type => {
                const tags = tagsByType(type)
                if (!tags.length) return null
                return <span key={type} className={`text-xs border rounded-full px-2 py-0.5 ${TAG_COLOR[type]}`}>{tags[0]}{tags.length > 1 ? ` +${tags.length-1}` : ''}</span>
              })}
            </div>
          )}
        </div>
        <span className={`text-white/30 text-lg transition-transform flex-shrink-0 ${open ? 'rotate-90' : ''}`}>›</span>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="px-4 pb-4 space-y-5 border-t border-white/8 pt-4">

          {/* Full option text */}
          <div className="flex items-start justify-between gap-2">
            <p className="text-white/60 text-sm leading-relaxed flex-1">{opt.content}</p>
            {decisionId && (
              <Link href={`/decision/new?resume=${decisionId}&step=2`} className="text-white/25 hover:text-purple-400 text-xs flex-shrink-0 transition-colors">Edit</Link>
            )}
          </div>

          {/* Tag groups */}
          {groupsToShow.map(group => (
            <div key={group.join('-')} className="space-y-4">
              {group.map(type => (
                <EditableTagGroup
                  key={type}
                  optionId={opt.id}
                  tagType={type}
                  currentTags={tagsByType(type)}
                  onSaved={onSaved}
                  decisionId={decisionId}
                  optionLabel={opt.label}
                  optionContent={opt.content}
                  narrative={narrative}
                />
              ))}
            </div>
          ))}

          {/* Projections */}
          <EditableProjections
            optionId={opt.id}
            projections={opt.projections}
            onSaved={onSaved}
            decisionId={decisionId}
            optionLabel={opt.label}
            optionContent={opt.content}
          />
        </div>
      )}
    </div>
  )
}

/* ─── Choice summary strip ───────────────────────────── */
function ChoiceSummary({ optA, optB, decisionId }: { optA?: OptionRow; optB?: OptionRow; decisionId?: string }) {
  if (!optA || !optB) return null
  const topPro  = (opt: OptionRow) => opt.tags.find(t => t.tag_type === 'pro')?.label ?? opt.tags[0]?.label
  const topCon  = (opt: OptionRow) => opt.tags.find(t => t.tag_type === 'con')?.label
  const topProj = (opt: OptionRow) => opt.projections.find(p => p.selected)?.statement

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-purple-400 text-xs uppercase tracking-wide font-medium">Choice comparison</p>
        {decisionId && (
          <Link href={`/decision/new?resume=${decisionId}&step=2`} className="text-white/25 hover:text-purple-400 text-xs transition-colors">Edit</Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[optA, optB].map(opt => (
          <div key={opt.id} className="space-y-2">
            <p className="text-purple-300 text-xs font-medium">Option {opt.label}</p>
            <p className="text-white/60 text-xs leading-relaxed line-clamp-2">{opt.content}</p>
            {topPro(opt) && (
              <div className="flex items-center gap-1">
                <span className="text-emerald-400 text-xs">+</span>
                <span className="text-white/50 text-xs line-clamp-1">{topPro(opt)}</span>
              </div>
            )}
            {topCon(opt) && (
              <div className="flex items-center gap-1">
                <span className="text-red-400 text-xs">–</span>
                <span className="text-white/50 text-xs line-clamp-1">{topCon(opt)}</span>
              </div>
            )}
            {topProj(opt) && (
              <p className="text-white/30 text-xs italic line-clamp-2">"{topProj(opt)}"</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Main page ─────────────────────────────────────── */
export default function DecisionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [decision, setDecision] = useState<DecisionDetail | null>(null)
  const [outcomes, setOutcomes] = useState<Outcome[]>([])
  const [loading, setLoading] = useState(true)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!decision) return
    setDeleting(true)
    try {
      await deleteDecision(decision.id)
      router.push('/dashboard')
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const [checkInText, setCheckInText] = useState('')
  const [savingCheckIn, setSavingCheckIn] = useState(false)
  const [showCheckIn, setShowCheckIn] = useState(false)

  const [outcomeText, setOutcomeText] = useState('')
  const [chosenOption, setChosenOption] = useState<string | null>(null)
  const [savingOutcome, setSavingOutcome] = useState(false)
  const [showOutcome, setShowOutcome] = useState(false)

  const [editingReviewDate, setEditingReviewDate] = useState(false)
  const [newReviewDate, setNewReviewDate] = useState('')

  const load = useCallback(async () => {
    const supabase = createClient()
    const [{ data }, outs] = await Promise.all([
      supabase.from('decisions').select(`
        id, title, subtitle, narrative, status, current_step, lens, review_date, created_at,
        options ( id, label, content, approved,
          option_tags ( label, tag_type ),
          projections ( statement, selected )
        ),
        emotion_maps ( body_location, emotion_color, ai_reflection )
      `).eq('id', id).single(),
      getOutcomes(id).catch(() => []),
    ])
    if (data) {
      setDecision({
        ...data,
        options: (data.options ?? []).map((o: {
          id: string; label: string; content: string; approved: boolean;
          option_tags: Tag[]; projections: Projection[];
        }) => ({ ...o, tags: o.option_tags ?? [], projections: o.projections ?? [] })),
      })
    }
    setOutcomes(outs ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleAddCheckIn() {
    if (!checkInText.trim() || !decision) return
    setSavingCheckIn(true)
    try { await addOutcome({ decisionId: decision.id, reflection: checkInText.trim() }); setCheckInText(''); setShowCheckIn(false); setOutcomes(await getOutcomes(decision.id)) } catch {}
    setSavingCheckIn(false)
  }

  async function handleMarkOutcome() {
    if (!outcomeText.trim() || !decision) return
    setSavingOutcome(true)
    try {
      const optionId = chosenOption === 'A' ? decision.options.find(o => o.label === 'A')?.id
        : chosenOption === 'B' ? decision.options.find(o => o.label === 'B')?.id : undefined
      await addOutcome({ decisionId: decision.id, reflection: `[Outcome] ${outcomeText.trim()}`, chosenOptionId: optionId })
      await updateDecision(decision.id, { status: 'completed' })
      setOutcomeText(''); setChosenOption(null); setShowOutcome(false)
      await load()
    } catch {}
    setSavingOutcome(false)
  }

  async function handleSaveReviewDate() {
    if (!newReviewDate || !decision) return
    await updateDecision(decision.id, { review_date: newReviewDate })
    setDecision(prev => prev ? { ...prev, review_date: newReviewDate } : prev)
    setEditingReviewDate(false)
  }

  if (loading) return (
    <div className="relative min-h-screen max-w-[393px] mx-auto px-5">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />
      <div className="pt-14 space-y-3 animate-pulse">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-white/5 rounded-2xl" />)}</div>
    </div>
  )

  if (!decision) return (
    <div className="relative min-h-screen max-w-[393px] mx-auto px-5 flex flex-col justify-center">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />
      <p className="text-white/50 text-center">Decision not found.</p>
      <Link href="/dashboard" className="text-purple-400 text-sm text-center mt-4">← Dashboard</Link>
    </div>
  )

  const optA = decision.options.find(o => o.label === 'A')
  const optB = decision.options.find(o => o.label === 'B')
  const reflectionEntry = outcomes.find(o => o.reflection.startsWith('[Reflection]'))
  const journalEntries = outcomes.filter(o => !o.reflection.startsWith('[Outcome]') && !o.reflection.startsWith('[Reflection]'))
  const outcomeEntries = outcomes.filter(o => o.reflection.startsWith('[Outcome]'))

  return (
    <div className="relative min-h-screen max-w-[393px] mx-auto px-5 pb-20">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />

      {/* Header */}
      <div className="pt-12 pb-5">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="text-purple-400 text-sm">← Dashboard</Link>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-white/20 hover:text-red-400 text-xs transition-colors px-1 py-1"
              title="Delete decision"
            >
              Delete
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-xs">Delete?</span>
              <button onClick={handleDelete} disabled={deleting}
                className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Yes'}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-white/30 hover:text-white/60 text-xs transition-colors">
                No
              </button>
            </div>
          )}
        </div>
        <div className="mt-5 space-y-1">
          <p className={`text-xs uppercase tracking-widest ${decision.status === 'completed' ? 'text-emerald-400' : 'text-purple-400'}`}>
            {decision.status === 'completed' ? '✓ Completed' : `Step ${decision.current_step}/7 in progress`}
            {' · '}{timeAgo(decision.created_at)}
          </p>
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-white text-xl font-light leading-snug flex-1">"{decision.title}"</h1>
            <Link href={`/decision/new?resume=${decision.id}&step=1`} className="text-white/20 hover:text-purple-400 text-xs transition-colors mt-1 flex-shrink-0">Edit</Link>
          </div>
          {decision.subtitle && <p className="text-white/40 text-sm italic">{decision.subtitle}</p>}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex gap-2 mb-5">
        <Link
          href={`/decision/new?resume=${decision.id}`}
          className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-[0.98] text-white text-xs font-medium text-center transition-all"
        >
          {decision.status === 'completed' ? 'Edit →' : 'Continue →'}
        </Link>
        <button onClick={() => { setShowCheckIn(v => !v); setShowOutcome(false) }}
          className="flex-1 py-2.5 rounded-xl border border-purple-700/40 bg-purple-900/20 text-purple-300 text-xs hover:bg-purple-900/35 transition-all">
          + Add check-in
        </button>
        <button onClick={() => { setShowOutcome(v => !v); setShowCheckIn(false) }}
          className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white/50 text-xs hover:bg-white/10 transition-all">
          ✓ Mark outcome
        </button>
      </div>

      {/* Check-in input */}
      {showCheckIn && (
        <div className="mb-5 bg-purple-900/15 border border-purple-700/30 rounded-2xl p-4 space-y-3">
          <p className="text-purple-300 text-xs font-medium">How are you thinking about this now?</p>
          <textarea value={checkInText} onChange={e => setCheckInText(e.target.value.slice(0, 600))}
            placeholder="Something has shifted… / I notice that… / I'm still uncertain about…"
            rows={3} autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-white/25 text-sm resize-none focus:outline-none focus:border-purple-500/50 transition-colors"
          />
          <div className="flex gap-2">
            <button onClick={handleAddCheckIn} disabled={savingCheckIn || !checkInText.trim()}
              className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-medium transition-all">
              {savingCheckIn ? 'Saving…' : 'Save check-in'}
            </button>
            <button onClick={() => setShowCheckIn(false)} className="px-4 text-white/30 text-xs">Cancel</button>
          </div>
        </div>
      )}

      {/* Mark outcome input */}
      {showOutcome && (
        <div className="mb-5 bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
          <p className="text-white/60 text-xs font-medium">What actually happened?</p>
          <div className="grid grid-cols-3 gap-2">
            {(['A', 'B', null] as const).map((opt, i) => (
              <button key={i} onClick={() => setChosenOption(opt as string | null)}
                className={`py-2 rounded-xl border text-xs transition-all ${chosenOption === opt ? 'border-purple-500/60 bg-purple-900/25 text-white' : 'border-white/10 text-white/40 hover:border-white/20'}`}>
                {opt ? `Chose ${opt}` : 'Mixed'}
              </button>
            ))}
          </div>
          <textarea value={outcomeText} onChange={e => setOutcomeText(e.target.value.slice(0, 600))}
            placeholder="I ended up… / It turned out… / Looking back…"
            rows={3} autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-white/25 text-sm resize-none focus:outline-none focus:border-purple-500/50 transition-colors"
          />
          <div className="flex gap-2">
            <button onClick={handleMarkOutcome} disabled={savingOutcome || !outcomeText.trim()}
              className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white text-xs font-medium transition-all">
              {savingOutcome ? 'Saving…' : 'Save outcome'}
            </button>
            <button onClick={() => setShowOutcome(false)} className="px-4 text-white/30 text-xs">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-4">

        {/* Narrative */}
        {decision.narrative ? (
          <Section title="Your story" editHref={`/decision/new?resume=${decision.id}&step=2`}>
            <p className="text-white/60 text-sm leading-relaxed">{decision.narrative}</p>
          </Section>
        ) : (
          <Section title="Your story" editHref={`/decision/new?resume=${decision.id}&step=2`}>
            <p className="text-white/30 text-sm italic">No story written yet.</p>
          </Section>
        )}

        {/* Outcome entries */}
        {outcomeEntries.length > 0 && (
          <Section title="What happened">
            <div className="space-y-3">
              {outcomeEntries.map(o => {
                const optId = o.chosen_option_id
                const label = optId === optA?.id ? 'A' : optId === optB?.id ? 'B' : null
                return (
                  <div key={o.id} className="space-y-0.5">
                    {label && <p className="text-white/30 text-xs">Chose Option {label}</p>}
                    <p className="text-white/70 text-sm leading-relaxed">{o.reflection.replace('[Outcome] ', '')}</p>
                    <p className="text-white/25 text-xs">{timeAgo(o.created_at)}</p>
                  </div>
                )
              })}
            </div>
          </Section>
        )}

        {/* Step 7A reflection */}
        {reflectionEntry && (() => {
          const raw = reflectionEntry.reflection.replace('[Reflection] ', '')
          const lines = raw.split('\n').filter(Boolean)
          const leanLine = lines.find(l => l.startsWith('Leaning') || l.startsWith('Still undecided'))
          const commitmentLine = lines.find(l => l.startsWith('Commitment:'))
          const noteLine = lines.find(l => l !== leanLine && l !== commitmentLine)
          const leanLabel = reflectionEntry.chosen_option_id === optA?.id ? 'A'
            : reflectionEntry.chosen_option_id === optB?.id ? 'B' : null
          return (
            <Section title="Your reflection" editHref={`/decision/new?resume=${decision.id}&step=7`}>
              <div className="space-y-3">
                {leanLine && (
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400 text-xs uppercase tracking-wide">Lean</span>
                    <span className={`text-xs border rounded-full px-2.5 py-0.5 ${
                      leanLabel ? 'bg-purple-900/30 border-purple-700/40 text-purple-300'
                        : 'bg-white/5 border-white/15 text-white/50'
                    }`}>
                      {leanLabel ? `Option ${leanLabel}` : 'Undecided'}
                    </span>
                  </div>
                )}
                {noteLine && (
                  <p className="text-white/70 text-sm leading-relaxed italic">"{noteLine}"</p>
                )}
                {commitmentLine && (
                  <div className="border-t border-white/8 pt-3 space-y-0.5">
                    <p className="text-white/30 text-xs uppercase tracking-wide">Commitment</p>
                    <p className="text-white/60 text-sm">{commitmentLine.replace('Commitment: ', '')}</p>
                  </div>
                )}
              </div>
            </Section>
          )
        })()}

        {/* Journal timeline */}
        {journalEntries.length > 0 && (
          <Section title="Check-in journal">
            <div className="space-y-4">
              {journalEntries.map((o, i) => (
                <div key={o.id} className="relative pl-4">
                  <div className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-purple-500/60" />
                  {i < journalEntries.length - 1 && <div className="absolute left-[2.5px] top-3 bottom-0 w-px bg-purple-900/40" />}
                  <p className="text-white/70 text-sm leading-relaxed">{o.reflection}</p>
                  <p className="text-white/25 text-xs mt-1">{timeAgo(o.created_at)}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Choice comparison summary */}
        <ChoiceSummary optA={optA} optB={optB} decisionId={decision.id} />

        {/* Option deep-dive cards (collapsible, editable) */}
        {optA && <OptionCard opt={optA} lens={decision.lens} onSaved={load} decisionId={decision.id} narrative={decision.narrative ?? undefined} />}
        {optB && <OptionCard opt={optB} lens={decision.lens} onSaved={load} decisionId={decision.id} narrative={decision.narrative ?? undefined} />}

        {/* Review date + calendar */}
        <Section title="Check-in date">
          {editingReviewDate ? (
            <div className="space-y-2">
              <input type="date" value={newReviewDate} onChange={e => setNewReviewDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white/70 text-sm focus:outline-none [color-scheme:dark]" />
              <div className="flex gap-2">
                <button onClick={handleSaveReviewDate} className="flex-1 py-2 rounded-xl bg-purple-600 text-white text-xs">Save</button>
                <button onClick={() => setEditingReviewDate(false)} className="px-4 text-white/30 text-xs">Cancel</button>
              </div>
            </div>
          ) : decision.review_date ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-white/60 text-sm">
                  {new Date(decision.review_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <button onClick={() => { setNewReviewDate(decision.review_date ?? ''); setEditingReviewDate(true) }}
                  className="text-white/25 text-xs hover:text-white/50 transition-colors">Edit</button>
              </div>
              <CalendarButtons
                title={`Decision Room check-in: "${decision.title}"`}
                date={decision.review_date}
                description={`Revisit your decision about "${decision.title}" in Decision Room.`}
              />
            </div>
          ) : (
            <button onClick={() => { setNewReviewDate(''); setEditingReviewDate(true) }}
              className="w-full py-2 rounded-xl border border-dashed border-white/15 text-white/30 text-xs hover:border-white/25 hover:text-white/50 transition-all">
              + Set a date
            </button>
          )}
        </Section>

        {/* Emotion map */}
        <Section title="Body & emotion" editHref={`/decision/new?resume=${decision.id}&step=3`}>
          {decision.emotion_maps?.[0] ? (
            <>
              <div className="flex gap-2 flex-wrap mb-2">
                <span className="text-xs bg-white/10 rounded-full px-2.5 py-1 text-white/60">{decision.emotion_maps[0].body_location}</span>
                <span className="text-xs bg-white/10 rounded-full px-2.5 py-1 text-white/60">{decision.emotion_maps[0].emotion_color}</span>
              </div>
              {decision.emotion_maps[0].ai_reflection && (
                <p className="text-white/50 text-sm italic leading-relaxed">"{decision.emotion_maps[0].ai_reflection}"</p>
              )}
            </>
          ) : (
            <p className="text-white/30 text-sm italic">No emotion map recorded yet.</p>
          )}
        </Section>


      </div>
    </div>
  )
}

function Section({ title, children, editHref }: { title: string; children: React.ReactNode; editHref?: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-purple-400 text-xs uppercase tracking-wide font-medium">{title}</p>
        {editHref && (
          <Link href={editHref} className="text-white/25 hover:text-purple-400 text-xs transition-colors">
            Edit
          </Link>
        )}
      </div>
      {children}
    </div>
  )
}
