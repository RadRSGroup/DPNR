import { cookies } from 'next/headers';
import messages from '../../translations/messages.json';

type Item = { img: string; title: string; blurb: string; href: string };

export default async function ShopStrip() {
  const locale = (await cookies()).get('NEXT_LOCALE')?.value === 'he' ? 'he' : 'en';
  const dict: any = (messages as any)[locale];
  const t = dict.shopStrip || {};
  const items: Item[] = [
    { img: '/shop-1.jpg', title: t.item1_title || 'Leadership Workbook', blurb: t.item1_blurb || 'Exercises and frameworks', href: '/shop' },
    { img: '/shop-2.jpg', title: t.item2_title || 'Mindfulness Journal', blurb: t.item2_blurb || 'Daily prompts', href: '/shop' },
    { img: '/shop-3.jpg', title: t.item3_title || 'Productivity Planner', blurb: t.item3_blurb || '90‑day planning system', href: '/shop' },
  ];
  return (
    <section className="w-full bg-gray-50">
      <div className="mx-auto max-w-[1200px] px-6 py-16 md:py-24">
        <div className="text-center mb-10">
          <h2 className="font-semibold tracking-tight" style={{ fontSize: 'var(--fluid-h2)' }}>{t.title || 'Featured materials'}</h2>
          <p className="mt-3 text-muted-foreground">{t.subtitle || 'Enhance learning with curated resources'}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((it, i) => (
            <a key={i} href={it.href} className="group bg-white rounded-lg overflow-hidden shadow border">
              <div className="aspect-[4/3] w-full overflow-hidden">
                <img src={it.img} alt={it.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition" />
              </div>
              <div className="p-4">
                <div className="font-medium">{it.title}</div>
                <div className="text-sm text-muted-foreground">{it.blurb}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
