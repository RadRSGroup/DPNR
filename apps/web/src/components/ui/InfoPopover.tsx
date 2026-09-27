'use client'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const GAP = 8
const EDGE = 12

/**
 * A small piece of extra information that works on every device (founder
 * feedback 2026-09-27: "important information must never depend on hover
 * alone"). Tap or click the trigger to open, tap outside or press Escape to
 * close; where a real hover exists (mouse) it also opens on hover.
 *
 * The panel is portaled to <body>, position: fixed and clamped to the
 * viewport, so a card's overflow or transform (glass cards animate in, which
 * would re-anchor `fixed`) can't clip or misplace it, and it can't run off a
 * phone screen.
 */
export default function InfoPopover({
  label,
  content,
  children,
  className = '',
  panelClassName = '',
}: {
  /** Accessible name for the trigger, e.g. "About Healer". */
  label: string
  content: React.ReactNode
  children: React.ReactNode
  className?: string
  panelClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const id = useId()

  useLayoutEffect(() => {
    if (!open) return
    const trigger = triggerRef.current
    const panel = panelRef.current
    if (!trigger || !panel) return
    const t = trigger.getBoundingClientRect()
    const p = panel.getBoundingClientRect()
    const left = Math.min(Math.max(t.left + t.width / 2 - p.width / 2, EDGE), window.innerWidth - p.width - EDGE)
    const below = t.bottom + GAP
    const top = below + p.height > window.innerHeight - EDGE ? Math.max(EDGE, t.top - GAP - p.height) : below
    setPos({ top, left })
  }, [open])

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    function onScroll() {
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  const canHover = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        // With a mouse, hover already opened it: a click keeps it open rather than toggling it shut.
        onClick={() => (canHover() ? setOpen(true) : setOpen((v) => !v))}
        onMouseEnter={() => canHover() && setOpen(true)}
        onMouseLeave={() => canHover() && setOpen(false)}
        className={className}
      >
        {children}
      </button>
      {open &&
        createPortal(
          <div
            ref={panelRef}
            id={id}
            role="tooltip"
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
            className={`fixed z-[60] w-max max-w-[min(18rem,calc(100vw-1.5rem))] rounded-xl border border-white/15 bg-[var(--color-violet-950)]/95 px-3 py-2.5 text-start text-xs leading-relaxed text-white/85 shadow-xl animate-fade-in ${panelClassName}`}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  )
}
