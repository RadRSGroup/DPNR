"use client";

import { useMemo } from 'react';

type Event = { date: string; title: string };

export function Calendar({ events = [] as Event[] }: { events?: Event[] }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const eventMap = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const ev of events) {
      const key = ev.date.slice(0, 10);
      const arr = map.get(key) || [];
      arr.push(ev);
      map.set(key, arr);
    }
    return map;
  }, [events]);

  const cells = [] as { day?: number; dateStr?: string; events?: Event[] }[];
  for (let i = 0; i < startWeekday; i++) cells.push({});
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = date.toISOString().slice(0, 10);
    cells.push({ day, dateStr, events: eventMap.get(dateStr) });
  }

  const monthName = today.toLocaleString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold">{monthName}</h2>
      </div>
      <div className="grid grid-cols-7 gap-2 text-sm text-gray-600 mb-1">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
          <div key={d} className="text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {cells.map((cell, idx) => (
          <div key={idx} className="min-h-[80px] border rounded p-1">
            {cell.day && (
              <div className="text-xs text-gray-500 mb-1">{cell.day}</div>
            )}
            <div className="space-y-1">
              {cell.events?.slice(0,3).map((ev, i) => (
                <div key={i} className="text-xs bg-violet-100 text-violet-800 rounded px-1 truncate" title={ev.title}>
                  {ev.title}
                </div>
              ))}
              {(cell.events && cell.events.length > 3) && (
                <div className="text-[10px] text-gray-500">+{cell.events.length - 3} more</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

