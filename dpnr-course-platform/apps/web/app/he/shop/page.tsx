"use client";

import { useEffect, useState } from 'react';

type Product = { id: string; name: string; price: number; description: string };
type CartItem = { productId: string; quantity: number; product: Product };

const PRODUCTS: Product[] = [
  { id: 'cmfl2eeha000012b6nc9oxk5z', name: 'DPNR Development Fundamentals Textbook', price: 89, description: 'מדריך מלא ליסודות הפיתוח' },
  { id: 'cmfl2eehc000112b6tpej6yss', name: 'Advanced Development Patterns Textbook', price: 119, description: 'תבניות מתקדמות ושיטות עבודה מומלצות' },
  { id: 'cmfl2eehd000212b65ve4sncp', name: 'DPNR Practice Exercises Workbook', price: 49, description: 'תרגולים מעשיים לחיזוק הידע' },
  { id: 'cmfl2eehe000312b69c0d7fj1', name: 'Project Laboratory Workbook', price: 59, description: 'תרגולים בסביבת פרויקטים אמיתית' },
];

export default function ShopPageHE() {
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

  async function csrf() {
    try { const r = await fetch('/api/csrf'); if (r.ok) { const d = await r.json(); return d.token as string; } } catch {}
    return undefined;
  }
  async function me() {
    try { const r = await fetch('/api/auth/me', { credentials: 'same-origin' }); setAuthed(r.ok && (await r.json()).user != null); } catch { setAuthed(false); }
  }
  useEffect(() => { csrf(); me(); }, []);

  function add(p: Product, q = 1) {
    setCart((prev) => {
      const i = prev.find((x) => x.productId === p.id);
      return i ? prev.map((x) => x.productId === p.id ? { ...x, quantity: x.quantity + q } : x) : [...prev, { productId: p.id, quantity: q, product: p }];
    });
    setOpen(false);
  }
  function setQty(id: string, q: number) { if (q <= 0) rem(id); else setCart((prev) => prev.map((x) => x.productId === id ? { ...x, quantity: q } : x)); }
  function rem(id: string) { setCart((prev) => prev.filter((x) => x.productId !== id)); }
  function total() { return cart.reduce((t, x) => t + x.product.price * x.quantity, 0); }
  function count() { return cart.reduce((t, x) => t + x.quantity, 0); }

  async function checkout() {
    if (!cart.length) { setErr('העגלה ריקה'); return; }
    setErr(null); setMsg(null); setBusy(true);
    try {
      const token = (await csrf()) || document.cookie.split('; ').find((c) => c.startsWith('csrf_token='))?.split('=')[1];
      const items = cart.map((i) => ({ productId: i.productId, quantity: i.quantity }));
      const res = await fetch('/api/shop/checkout', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'x-csrf-token': token } : {}) },
        body: JSON.stringify({ items, customerName: 'לקוח בדיקה', customerEmail: 'test@example.com', customerPhone: '050-1234567' })
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || `Checkout failed (${res.status})`);
      const data = await res.json();
      if (data.success && data.redirectUrl) { setMsg('נוצר תשלום! מעביר לעמוד תשלום...'); setTimeout(() => { window.location.href = data.redirectUrl; }, 800); }
      else throw new Error('Invalid response');
    } catch (e:any) { setErr(e?.message || 'התשלום נכשל'); }
    finally { setBusy(false); }
  }

  return (
    <main className="p-8 max-w-6xl mx-auto" dir="rtl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-2">חנות חומרי הקורס</h1>
          <p className="text-gray-600">רכישת ספרי לימוד וחוברות עבודה</p>
        </div>
        <div className="relative">
          <button id="cart-button" onClick={() => setOpen(!open)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">🛒 עגלה ({count()}) <span className="text-sm">₪{total()}</span></button>
          {open && (
            <div id="cart-dropdown" className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-10">
              <div className="p-4">
                <h3 className="font-semibold mb-3">עגלה</h3>
                {cart.length === 0 ? (
                  <p className="text-gray-500 text-sm">העגלה ריקה</p>
                ) : (
                  <div className="space-y-3">
                    {cart.map((it) => (
                      <div key={it.productId} className="flex items-center justify-between text-sm">
                        <div className="flex-1 text-right">
                          <div className="font-medium truncate">{it.product.name}</div>
                          <div className="text-gray-500">₪{it.product.price} ליחידה</div>
                        </div>
                        <div className="flex items-center gap-2 mr-3">
                          <button onClick={() => setQty(it.productId, it.quantity - 1)} className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 text-gray-600">-</button>
                          <span className="w-8 text-center">{it.quantity}</span>
                          <button onClick={() => setQty(it.productId, it.quantity + 1)} className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 text-gray-600">+</button>
                          <button onClick={() => rem(it.productId)} className="ml-2 text-red-500 hover:text-red-700">✕</button>
                        </div>
                      </div>
                    ))}
                    <div className="border-t pt-3 mt-3">
                      <div className="flex justify-between font-semibold"><span>סה"כ: ₪{total()}</span></div>
                      <button onClick={checkout} disabled={busy || cart.length === 0} className="w-full mt-3 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">{busy ? 'מעבד...' : 'לקופה'}</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {authed === false && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded mb-4">יש להתחבר כדי להשלים רכישה. ניתן לעיין במוצרים ולהוסיף לעגלה ללא התחברות.</div>
      )}
      {authed === true && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-4">אתם מחוברים – ניתן להשלים רכישה.</div>
      )}
      {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">{msg}</div>}
      {err && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{err}</div>}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 max-w-4xl">
        {PRODUCTS.map((p) => (
          <div key={p.id} className="border rounded-lg p-6 bg-white shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 text-right">
                <h3 className="font-semibold text-lg mb-2">{p.name}</h3>
                <p className="text-gray-600 text-sm mb-3">{p.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 justify-end">
              <div className="text-2xl font-bold text-blue-600">₪{p.price}</div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">כמות:</label>
                <select id={`qty-${p.id}`} defaultValue="1" className="border rounded px-2 py-1 text-sm w-16">
                  {[1,2,3,4,5].map(n => (<option key={n} value={n}>{n}</option>))}
                </select>
              </div>
              <button onClick={() => { const s = document.getElementById(`qty-${p.id}`) as HTMLSelectElement; add(p, parseInt(s.value)); }} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">הוסף לעגלה</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
