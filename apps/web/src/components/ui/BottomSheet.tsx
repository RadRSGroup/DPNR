'use client'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/**
 * A sheet that rises from the bottom on phones and sits centred on wider
 * screens: dimmed, lightly blurred backdrop (static, never animated, per
 * MOTION.md), fade + settle-in entrance, Escape / backdrop tap / the close
 * button all close it. Portaled to <body> so a transformed ancestor can't
 * re-anchor `position: fixed`.
 */
export default function BottomSheet({
  onClose,
  closeLabel,
  children,
}: {
  onClose: () => void
  closeLabel: string
  children: React.ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full lg:max-w-md max-h-[85dvh] overflow-y-auto p-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:pb-3 animate-settle-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end mb-2">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full liquid-glass text-white/70"
            aria-label={closeLabel}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
