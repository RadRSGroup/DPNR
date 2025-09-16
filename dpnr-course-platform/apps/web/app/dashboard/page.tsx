import { headers, cookies } from 'next/headers';

async function getMe() {
  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('host');
  const base = host ? `${proto}://${host}` : '';
  const res = await fetch(`${base}/api/me`, { cache: 'no-store' });
  if (!res.ok) return { user: null };
  return res.json();
}

export default async function DashboardPage() {
  const { user } = await getMe();
  const c = await cookies();
  const lang = c.get('NEXT_LOCALE')?.value === 'he' ? 'he' : 'en';
  const t = lang === 'he'
    ? {
        title: 'לוח בקרה',
        signedInPrefix: 'מחובר כ־',
        calendar: { title: 'לוח שנה', sub: 'מפגשים קרובים' },
        materials: { title: 'חומרים', sub: 'הורדות' },
        shop: { title: 'חנות', sub: 'דוגמת תשלום' },
        account: { title: 'חשבון', sub: 'ייצוא ומחיקה (GDPR)' },
      }
    : {
        title: 'Dashboard',
        signedInPrefix: 'Signed in as',
        calendar: { title: 'Calendar', sub: 'Upcoming sessions' },
        materials: { title: 'Materials', sub: 'Downloads' },
        shop: { title: 'Shop', sub: 'Checkout demo' },
        account: { title: 'Account', sub: 'GDPR export and delete' },
      };
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  return (
    <main className="p-8 max-w-5xl mx-auto" dir={dir}>
      <h1 className="text-2xl font-semibold mb-4">{t.title}</h1>
      {user ? (
        <div className="mb-6 text-sm text-gray-700">
          {t.signedInPrefix} {user.firstName} {user.lastName} · {user.email}
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        <a className="border rounded p-4 hover:bg-gray-50" href="/dashboard/calendar">
          <div className="font-medium mb-1">{t.calendar.title}</div>
          <div className="text-sm text-gray-600">{t.calendar.sub}</div>
        </a>
        <a className="border rounded p-4 hover:bg-gray-50" href="/dashboard/materials">
          <div className="font-medium mb-1">{t.materials.title}</div>
          <div className="text-sm text-gray-600">{t.materials.sub}</div>
        </a>
        <a className="border rounded p-4 hover:bg-gray-50" href="/dashboard/shop">
          <div className="font-medium mb-1">{t.shop.title}</div>
          <div className="text-sm text-gray-600">{t.shop.sub}</div>
        </a>
        <a className="border rounded p-4 hover:bg-gray-50" href="/dashboard/account">
          <div className="font-medium mb-1">{t.account.title}</div>
          <div className="text-sm text-gray-600">{t.account.sub}</div>
        </a>
      </div>
    </main>
  );
}
