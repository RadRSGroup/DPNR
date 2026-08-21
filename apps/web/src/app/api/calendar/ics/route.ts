import { NextRequest } from 'next/server'

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
    `SUMMARY:${title.replace(/[,;\\]/g, c => `\\${c}`)}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n').replace(/[,;\\]/g, c => `\\${c}`)}`,
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
