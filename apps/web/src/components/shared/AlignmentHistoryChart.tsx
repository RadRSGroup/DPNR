'use client'
import { useState } from 'react'

interface Point {
  date: string
  score: number
}

/**
 * Real daily Alignment Score snapshots (`DashboardResponse.alignmentHistory`,
 * `snapshot-alignment-score.ts`), charted properly instead of the compact
 * bare-line sparkline Dashboard's own "My Evolution" card uses. Range is
 * capped to what the backend actually queries (`dashboard/handler.ts`'s
 * `ALIGNMENT_HISTORY_WINDOW_DAYS`, currently 30) — no 90D/1Y option, since
 * offering a range the data can never fill would look broken rather than
 * honestly sparse.
 */
const RANGE_OPTIONS = [
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', days: 30 },
] as const

function formatAxisDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function AlignmentHistoryChart({ points }: { points: Point[] }) {
  const [range, setRange] = useState<(typeof RANGE_OPTIONS)[number]['key']>('30d')
  const activeDays = RANGE_OPTIONS.find((r) => r.key === range)!.days
  const visible = points.slice(-activeDays)

  const width = 640
  const height = 200
  const padding = { top: 16, right: 12, bottom: 24, left: 30 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom

  const xFor = (i: number) =>
    padding.left + (visible.length <= 1 ? innerW / 2 : (i / (visible.length - 1)) * innerW)
  const yFor = (score: number) => padding.top + innerH - (score / 100) * innerH

  const linePoints = visible.map((p, i) => `${xFor(i)},${yFor(p.score)}`).join(' ')
  const areaPoints = `${padding.left},${padding.top + innerH} ${linePoints} ${xFor(visible.length - 1)},${padding.top + innerH}`
  const latest = visible[visible.length - 1]
  const gridLines = [0, 25, 50, 75, 100]

  const labelCount = Math.min(4, visible.length)
  const labelIndices = Array.from({ length: labelCount }, (_, i) =>
    Math.round((i / Math.max(labelCount - 1, 1)) * (visible.length - 1))
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-1.5">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setRange(opt.key)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                range === opt.key
                  ? 'border-[var(--color-violet-500)] bg-[var(--color-violet-500)]/15 text-white'
                  : 'border-white/10 text-white/40 hover:text-white/60'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {latest && (
          <div className="text-right leading-none">
            <p className="text-lg text-white font-medium">{latest.score}%</p>
            <p className="text-[10px] text-white/40 mt-0.5">Today</p>
          </div>
        )}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="none">
        <defs>
          <linearGradient id="alignmentHistoryFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-violet-400)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--color-violet-400)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridLines.map((g) => (
          <g key={g}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={yFor(g)}
              y2={yFor(g)}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
            <text x={padding.left - 6} y={yFor(g)} textAnchor="end" dominantBaseline="middle" fontSize="9" fill="rgba(255,255,255,0.35)">
              {g}
            </text>
          </g>
        ))}
        <polygon points={areaPoints} fill="url(#alignmentHistoryFade)" stroke="none" />
        <polyline
          points={linePoints}
          fill="none"
          stroke="var(--color-violet-400)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {latest && (
          <circle
            cx={xFor(visible.length - 1)}
            cy={yFor(latest.score)}
            r="4"
            fill="var(--color-violet-400)"
            stroke="var(--color-bg-base)"
            strokeWidth="2"
          />
        )}
        {labelIndices.map((i) => (
          <text
            key={i}
            x={xFor(i)}
            y={height - 6}
            textAnchor={i === 0 ? 'start' : i === visible.length - 1 ? 'end' : 'middle'}
            fontSize="9"
            fill="rgba(255,255,255,0.35)"
          >
            {i === visible.length - 1 ? 'Today' : formatAxisDate(visible[i].date)}
          </text>
        ))}
      </svg>
    </div>
  )
}
