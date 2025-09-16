import { cookies } from 'next/headers';
import messages from '../../translations/messages.json';

export default async function Testimonials() {
  const locale = (await cookies()).get('NEXT_LOCALE')?.value === 'he' ? 'he' : 'en';
  const dict: any = (messages as any)[locale];
  const title: string = dict.testimonials?.title || 'What learners say';
  const subtitle: string = dict.testimonials?.subtitle || 'Short, honest notes from recent cohorts';
  const role: string = dict.testimonials?.role || 'Learner';
  const items = [
    { name: 'Dana', role, img: '/user-dana.jpg', quote: 'The sessions were focused and practical. I saw results fast.' },
    { name: 'Eli', role, img: '/user-eli.jpg', quote: 'Clear structure and great materials. Highly recommended.' },
    { name: 'Noa', role, img: '/user-noa.jpg', quote: 'Exactly the push I needed to level up.' },
  ];
  return (
    <section className="w-full bg-background">
      <div className="mx-auto max-w-[1200px] px-6 py-16 md:py-24">
        <div className="text-center mb-10">
          <h2 className="font-semibold tracking-tight" style={{ fontSize: 'var(--fluid-h2)' }}>{title}</h2>
          <p className="mt-3 text-muted-foreground">{subtitle}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((t, i) => (
            <div key={i} className="rounded-xl p-6 bg-white/70 dark:bg-white/5 backdrop-blur border">
              <div className="flex items-center gap-3 mb-3">
                <img src={t.img} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-200">“{t.quote}”</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
