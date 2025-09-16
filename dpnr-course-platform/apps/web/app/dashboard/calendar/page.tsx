import { Calendar } from "../../../components/Calendar";

const demoEvents = [
  { date: new Date().toISOString(), title: "Orientation" },
  { date: new Date(Date.now() + 86400000 * 3).toISOString(), title: "Workshop A" },
  { date: new Date(Date.now() + 86400000 * 5).toISOString(), title: "Workshop B" },
  { date: new Date(Date.now() + 86400000 * 5).toISOString(), title: "Office Hours" },
];

export default function CalendarPage() {
  return (
    <main className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Calendar</h1>
      <Calendar events={demoEvents} />
    </main>
  );
}
