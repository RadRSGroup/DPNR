'use client'

interface Props {
  title: string
  date: string          // YYYY-MM-DD
  description?: string
}

function toGCalDate(d: string) {
  return d.replace(/-/g, '')
}

function buildGoogleUrl({ title, date, description = '' }: Props) {
  const start = toGCalDate(date)
  // All-day event: end = next day
  const endDate = new Date(date)
  endDate.setDate(endDate.getDate() + 1)
  const end = toGCalDate(endDate.toISOString().split('T')[0])
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${start}/${end}`,
    details: description,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function buildICS({ title, date, description = '' }: Props) {
  const start = toGCalDate(date)
  const endDate = new Date(date)
  endDate.setDate(endDate.getDate() + 1)
  const end = toGCalDate(endDate.toISOString().split('T')[0])
  const uid = `decision-room-${Date.now()}@dpnr.app`
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Decision Room//DPNR//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export function CalendarButtons({ title, date, description }: Props) {
  function downloadICS() {
    const content = buildICS({ title, date, description })
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'decision-checkin.ics'
    a.click()
    URL.revokeObjectURL(url)
  }

  const displayDate = new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="space-y-2">
      <p className="text-white/30 text-xs text-center">
        Add check-in reminder · {displayDate}
      </p>
      <div className="flex gap-2">
        <a
          href={buildGoogleUrl({ title, date, description })}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 text-xs transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M6 2v2M18 2v2M2 8h20M4 4h16a2 2 0 012 2v14a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Google Calendar
        </a>
        <button
          onClick={downloadICS}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 text-xs transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Apple / Outlook
        </button>
      </div>
    </div>
  )
}
