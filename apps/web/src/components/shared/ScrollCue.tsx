'use client'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * A scroll area that makes "there's more below" visible (founder feedback
 * 2026-09-28 #16): a soft fade over the last line and a small quiet
 * "More below" cue, both gone once the person reaches the end. Tapping the
 * cue scrolls one comfortable step. Nothing moves on its own.
 */
export default function ScrollCue({ className = '', children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [more, setMore] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setMore(el.scrollHeight - el.clientHeight - el.scrollTop > 12)
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    for (const child of Array.from(el.children)) ro.observe(child)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [])

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <div ref={ref} className={`flex-1 min-h-0 overflow-y-auto no-scrollbar ${className}`}>
        {children}
      </div>
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--color-bg-base)] to-transparent transition-opacity duration-(--motion-calm) ${
          more ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <button
        type="button"
        tabIndex={more ? 0 : -1}
        onClick={() => ref.current?.scrollBy({ top: ref.current.clientHeight * 0.6, behavior: 'smooth' })}
        className={`absolute bottom-1 inset-x-0 mx-auto w-fit inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] text-white/70 bg-black/40 border border-white/15 transition-opacity duration-(--motion-calm) ${
          more ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        More below <ChevronDown className="w-3.5 h-3.5" aria-hidden />
      </button>
    </div>
  )
}
