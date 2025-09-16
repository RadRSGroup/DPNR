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

export default async function CoursesGrid() {
  const { courses } = await getCourses();
  if (!courses?.length) return null;
  return (
    <section className="w-full bg-background">
      <div className="mx-auto max-w-[1200px] px-6 py-24 md:py-32">
        <div className="text-center mb-12">
          <h2 className="font-semibold tracking-tight" style={{ fontSize: 'var(--fluid-h2)' }}>Our Courses</h2>
          <p className="mt-3 text-muted-foreground">Hands-on sessions designed for real outcomes</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((c: any) => (
            <a key={c.id} href="/course" className="group bg-white rounded-lg overflow-hidden shadow-md border transition duration-300 hover:-translate-y-1">
              <div className="p-5">
                <h3 className="font-medium text-lg group-hover:text-primary">{c.title}</h3>
                <p className="mt-1 text-sm text-gray-600 line-clamp-3">{c.description}</p>
                <div className="mt-3 text-xs text-gray-500">
                  {new Date(c.startDate).toLocaleDateString()} – {new Date(c.endDate).toLocaleDateString()}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
