'use client'

interface Props {
  title: string
  date: string          // YYYY-MM-DD
  description?: string
}

function buildGoogleUrl({ title, date, description = '' }: Props) {
  const start = date.replace(/-/g, '')
  const endDate = new Date(date)
  endDate.setDate(endDate.getDate() + 1)
  const end = endDate.toISOString().split('T')[0].replace(/-/g, '')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${start}/${end}`,
    details: description,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function buildICSUrl({ title, date, description = '' }: Props) {
  const params = new URLSearchParams({ title, date, description })
  return `/api/calendar/ics?${params.toString()}`
}

export function CalendarButtons({ title, date, description = '' }: Props) {
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
        <a
          href={buildICSUrl({ title, date, description })}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 text-xs transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M6 2v2M18 2v2M2 8h20M4 4h16a2 2 0 012 2v14a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Apple / Outlook
        </a>
      </div>
    </div>
  )
}
