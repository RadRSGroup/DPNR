import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

/**
 * Security review 2026-09-14 (DPNR-13) — the real bug: `title` had zero
 * newline handling and neither field rejected a raw CR, so a crafted
 * `description`/`title` query param (this is a GET endpoint driven
 * entirely by a shareable URL, and `description` already carries real
 * user-typed decision content per CommitmentScreen.tsx) could inject
 * arbitrary extra ICS lines into the file a victim's calendar app parses.
 */

function requestFor(params: Record<string, string>) {
  const url = new URL('https://dpnr-mvp.onrender.com/api/calendar/ics')
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return new NextRequest(url)
}

describe('GET /api/calendar/ics', () => {
  it('400s on a missing or malformed date, before ever touching title/description', async () => {
    const res = await GET(requestFor({ date: 'not-a-date' }))
    expect(res.status).toBe(400)
  })

  it('400s if title carries a raw control character (CR injection attempt)', async () => {
    const res = await GET(
      requestFor({ date: '2026-09-22', title: 'Checkin\r\nBEGIN:VALARM\r\nACTION:DISPLAY\r\nEND:VALARM' })
    )
    expect(res.status).toBe(400)
  })

  it('400s if description carries a raw control character', async () => {
    const res = await GET(requestFor({ date: '2026-09-22', description: 'legit text\r\nX-INJECTED:evil' }))
    expect(res.status).toBe(400)
  })

  it('400s on a lone CR with no accompanying LF (a naive \\n-only filter would miss this)', async () => {
    const res = await GET(requestFor({ date: '2026-09-22', title: 'a\rb' }))
    expect(res.status).toBe(400)
  })

  it('generates a well-formed ICS file for ordinary input, with commas/semicolons/backslashes escaped', async () => {
    const res = await GET(
      requestFor({
        date: '2026-09-22',
        title: 'Decide: move, or stay; think it over',
        description: 'Path C:\\plans\nsecond line',
      })
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/calendar')

    const body = await res.text()
    expect(body).toContain('BEGIN:VCALENDAR')
    // Colon is not an ICS-reserved character (only , ; \ and newline are) —
    // stays literal.
    expect(body).toContain('SUMMARY:Decide: move\\, or stay\\; think it over')
    expect(body).toContain('DESCRIPTION:Path C:\\\\plans\\nsecond line')
    // Every physical line the response itself constructs is CRLF-joined —
    // confirm no OTHER bare LF snuck into the body content (a symptom the
    // pre-fix backslash-then-newline ordering bug could have produced).
    const bodyWithoutLineBreaks = body.split('\r\n').join('')
    expect(bodyWithoutLineBreaks).not.toContain('\n')
  })

  it('allows a normal multi-line description (an embedded LF, escaped, is not the same thing as a raw CR)', async () => {
    const res = await GET(requestFor({ date: '2026-09-22', title: 'Reminder', description: 'line one\nline two' }))
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('DESCRIPTION:line one\\nline two')
  })
})
