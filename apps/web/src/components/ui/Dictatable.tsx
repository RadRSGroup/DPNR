'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Mic } from 'lucide-react'

/**
 * Talk-to-text for any free-text field (user request 2026-09-28: "all text
 * entry points"). Same client-only Web Speech API dictation Main Chat's
 * composer has had since Session 49 — nothing is sent to DPNR's backend;
 * the browser's own speech service does the transcription.
 *
 * Usage: wrap one text field (a textarea or a text input). The mic sits
 * inside the field's end corner, and the field gets extra end padding so
 * text never runs under it. The transcript goes in through the field's OWN
 * onChange (native value setter + a bubbling input event), so every field
 * keeps its existing length cap and state logic — no per-field wiring.
 *
 * Hidden where the browser has no speech recognition (e.g. Firefox), and
 * feature-detected after mount so SSR and the first client render match
 * (the hydration mismatch Main Chat hit, see companion/page.tsx).
 */

// No lib.dom typings for the (webkit-prefixed) Web Speech API yet.
/* eslint-disable @typescript-eslint/no-explicit-any */
let active: { stop: () => void } | null = null

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
  const ctorRef = useRef<any>(null)
  const recognitionRef = useRef<any>(null)
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [disabled, setDisabled] = useState(false)

  useEffect(() => {
    Promise.resolve().then(() => {
      const ctor = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
      if (ctor) {
        ctorRef.current = ctor
        setSupported(true)
      }
    })
    return () => recognitionRef.current?.stop()
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

  function toggle() {
    const field = wrapRef.current?.querySelector('textarea, input') as Field | null
    if (!field || !ctorRef.current) return
    if (listening) {
      recognitionRef.current?.stop()
      return
    }
    active?.stop() // one microphone at a time across the page
    const recognition = new ctorRef.current()
    const handle = { stop: () => recognition.stop() }
    recognition.lang = locale === 'he' ? 'he-IL' : 'en-US'
    recognition.interimResults = false
    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results as ArrayLike<{ 0: { transcript: string } }>)
        .map((r) => r[0].transcript)
        .join(' ')
        .trim()
      if (transcript) appendToField(field, transcript)
    }
    const done = () => {
      setListening(false)
      if (active === handle) active = null
    }
    recognition.onend = done
    recognition.onerror = done
    active = handle
    recognitionRef.current = recognition
    setListening(true)
    recognition.start()
    field.focus()
  }

  return (
    <div ref={wrapRef} className={`relative ${supported ? '[&>textarea]:pe-11 [&>input]:pe-11' : ''} ${className}`}>
      {children}
      {supported && (
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
      )}
    </div>
  )
}
