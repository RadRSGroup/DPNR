import { NextRequest } from 'next/server'

// Security review 2026-09-14 (DPNR-13) — this GET endpoint builds a
// text/calendar response directly from unauthenticated, attacker-visible
// query params (a shareable URL, not a form post), and `description` was
// already wired to carry real user-typed content — CommitmentScreen.tsx
// embeds the decision's own free-text `decisionTitle` in it. The
// pre-existing per-field `.replace(/[,;\\]/g, ...)` escaping handled RFC
// 5545's TEXT-value reserved characters, but `title` had NO newline
// handling at all, and neither field rejected a raw CR or any other
// control character. ICS's line-folding format means an unescaped CRLF
// (or a lone `\r`, which a naive `\n`-only escape doesn't touch) inside a
// property value can terminate that property early and inject arbitrary
// new ICS lines — a fabricated `BEGIN:VALARM`, a second `VEVENT`, altered
// `DTSTART`, whatever the attacker crafts into the URL — that a victim's
// calendar app then parses as a legitimate part of this event. Rejecting
// the whole request outright (not silently stripping, so the failure is
// visible rather than a quietly-mangled calendar file) if either field
// carries a raw control character closes this without changing behavior
// for any title/description this app itself ever actually generates.
const CONTROL_CHAR_PATTERN = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]|\r/

/**
 * RFC 5545 §3.3.11 TEXT escaping, applied uniformly to every property
 * value below — order matters: backslash first (so the escaping we add
 * for comma/semicolon/newline below isn't itself re-escaped), then the
 * two reserved punctuation characters, then a literal LF to the two-
 * character `\n` sequence the format actually wants for an embedded line
 * break. Call only after CONTROL_CHAR_PATTERN has already rejected a raw
 * CR — this alone does not defend against that on its own.
 */
function escapeICSText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/[,;]/g, (c) => `\\${c}`)
    .replace(/\n/g, '\\n')
}

function toICSDate(d: string) {
  return d.replace(/-/g, '')
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const title       = searchParams.get('title') ?? 'Workshop Rooms Check-in'
  const date        = searchParams.get('date') ?? ''
  const description = searchParams.get('description') ?? ''

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Response('Missing or invalid date', { status: 400 })
  }
  if (CONTROL_CHAR_PATTERN.test(title) || CONTROL_CHAR_PATTERN.test(description)) {
    return new Response('title/description may not contain control characters', { status: 400 })
  }

  const start = toICSDate(date)
  const endDate = new Date(date)
  endDate.setDate(endDate.getDate() + 1)
  const end = toICSDate(endDate.toISOString().split('T')[0])

  const uid = `decision-room-${date}-${Date.now()}@dpnr.app`

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Workshop Rooms//DPNR//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${escapeICSText(title)}`,
    `DESCRIPTION:${escapeICSText(description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="decision-checkin.ics"`,
      'Cache-Control': 'no-store',
    },
  })
}
