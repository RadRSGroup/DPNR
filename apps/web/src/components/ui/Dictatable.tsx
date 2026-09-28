'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Mic } from 'lucide-react'
import { speechRecognitionCtor, startDictation, type DictationError, type DictationHandle } from '@/lib/dictation'

/**
 * Talk-to-text for any free-text field (user request 2026-09-28: "all text
 * entry points"). Engine and mobile notes: lib/dictation.ts.
 *
 * Usage: wrap one text field (a textarea or a text input). The mic sits
 * inside the field's end corner, and the field gets extra end padding so
 * text never runs under it. The transcript goes in through the field's OWN
 * onChange (native value setter + a bubbling input event), so every field
 * keeps its existing length cap and state logic — no per-field wiring.
 *
 * Hidden where the browser has no speech recognition (e.g. Firefox, and
 * most in-app browsers), and feature-detected after mount so SSR and the
 * first client render match (the hydration mismatch Main Chat hit).
 */

type Field = HTMLTextAreaElement | HTMLInputElement

function appendToField(field: Field, text: string) {
  const current = field.value
  const next = current && !/\s$/.test(current) ? `${current} ${text}` : `${current}${text}`
  const proto = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(field, next)
  field.dispatchEvent(new Event('input', { bubbles: true }))
}

export default function Dictatable({
  children,
  single = false,
  className = '',
}: {
  children: ReactNode
  /** A one-line input: centre the mic vertically instead of the bottom corner. */
  single?: boolean
  /** Layout classes for the wrapper when the field sits in a flex row (e.g. `flex-1`). */
  className?: string
}) {
  const t = useTranslations('Dictation')
  const locale = useLocale()
  const wrapRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<DictationHandle | null>(null)
  const hintTimer = useRef<number | undefined>(undefined)
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const [hint, setHint] = useState<DictationError | null>(null)

  useEffect(() => {
    Promise.resolve().then(() => setSupported(!!speechRecognitionCtor()))
    return () => {
      handleRef.current?.stop()
      window.clearTimeout(hintTimer.current)
    }
  }, [])

  // Follow the wrapped field's disabled state (e.g. while a step is saving).
  useEffect(() => {
    const field = wrapRef.current?.querySelector('textarea, input') as Field | null
    if (!field) return
    const sync = () => setDisabled(field.disabled || field.readOnly)
    sync()
    const mo = new MutationObserver(sync)
    mo.observe(field, { attributes: true, attributeFilter: ['disabled', 'readonly'] })
    return () => mo.disconnect()
  }, [supported])

  function showHint(error: DictationError) {
    setHint(error)
    window.clearTimeout(hintTimer.current)
    hintTimer.current = window.setTimeout(() => setHint(null), 4000)
  }

  function toggle() {
    const field = wrapRef.current?.querySelector('textarea, input') as Field | null
    if (!field) return
    if (listening) {
      handleRef.current?.stop()
      return
    }
    setHint(null)
    // No field.focus() here: on phones it opens the keyboard, which can end
    // recognition immediately (iOS). Focus once dictation has finished.
    const handle = startDictation({
      locale,
      onText: (text) => appendToField(field, text),
      onEnd: () => {
        setListening(false)
        handleRef.current = null
        field.focus()
      },
      onError: showHint,
    })
    if (handle) {
      handleRef.current = handle
      setListening(true)
    }
  }

  return (
    <div ref={wrapRef} className={`relative ${supported ? '[&>textarea]:pe-11 [&>input]:pe-11' : ''} ${className}`}>
      {children}
      {supported && (
        <>
          <button
            type="button"
            onClick={toggle}
            disabled={disabled}
            aria-label={listening ? t('stop') : t('start')}
            aria-pressed={listening}
            title={listening ? t('stop') : t('start')}
            className={`absolute end-2 ${single ? 'top-1/2 -translate-y-1/2 w-7 h-7' : 'bottom-2 w-8 h-8'} rounded-full flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              listening
                ? 'bg-[var(--color-violet-500)]/25 text-[var(--color-violet-200)] animate-soft-pulse'
                : 'text-white/45 hover:text-white/80 hover:bg-white/5'
            }`}
          >
            <Mic className={single ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />
          </button>
          <span role="status" aria-live="polite" className="sr-only">
            {listening ? t('listening') : ''}
          </span>
          {hint && (
            <p
              role="alert"
              className="absolute end-0 bottom-full mb-1.5 z-10 max-w-[16rem] rounded-xl bg-[#1d1530] border border-white/15 px-3 py-1.5 text-xs text-white/85 shadow-lg animate-fade-in"
            >
              {t(`errors.${hint}`)}
            </p>
          )}
        </>
      )}
    </div>
  )
}
