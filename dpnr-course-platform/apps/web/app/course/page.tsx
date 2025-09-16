import { headers } from 'next/headers';

async function getCourses() {
  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('host');
  const base = host ? `${proto}://${host}` : '';
  const res = await fetch(`${base}/api/courses`, { cache: 'no-store' });
  if (!res.ok) return { courses: [] as any[] };
  return res.json();
}

export default async function CoursePage() {
  const { courses } = await getCourses();
  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Courses</h1>
      {courses.length === 0 ? (
        <p>No courses available yet.</p>
      ) : (
        <div className="space-y-4">
          {courses.map((c: any) => (
            <div key={c.id} className="border rounded p-4">
              <h2 className="text-lg font-medium">{c.title}</h2>
              <p className="text-sm text-gray-700 mt-1">{c.description}</p>
              <div className="text-sm text-gray-600 mt-2">
                <span>Dates: {new Date(c.startDate).toLocaleDateString()} → {new Date(c.endDate).toLocaleDateString()}</span>
                <span className="ml-4">Capacity: {c.capacity}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
