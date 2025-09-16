"use client";

import { useEffect, useState } from 'react';

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
}

const PRODUCTS: Product[] = [
  {
    id: 'cmfl2eeha000012b6nc9oxk5z',
    name: 'DPNR Development Fundamentals Textbook',
    price: 89,
    description: 'Complete guide to development fundamentals'
  },
  {
    id: 'cmfl2eehc000112b6tpej6yss',
    name: 'Advanced Development Patterns Textbook',
    price: 119,
    description: 'Advanced patterns and best practices'
  },
  {
    id: 'cmfl2eehd000212b65ve4sncp',
    name: 'DPNR Practice Exercises Workbook',
    price: 49,
    description: 'Hands-on practice exercises'
  },
  {
    id: 'cmfl2eehe000312b69c0d7fj1',
    name: 'Project Laboratory Workbook',
    price: 59,
    description: 'Real-world project exercises'
  }
];

export default function ShopPage() {
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function ensureCsrf() {
    try { await fetch('/api/csrf'); } catch {}
  }

  useEffect(() => { ensureCsrf(); }, []);

  async function checkout(product: Product) {
    setMsg(null); setErr(null); setBusy(product.id);
    try {
      await ensureCsrf();
      const token = document.cookie.split('; ').find((c) => c.startsWith('csrf_token='))?.split('=')[1];

      const res = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-csrf-token': token } : {}),
        },
        body: JSON.stringify({
          items: [{
            productId: product.id,
            quantity: 1
          }],
          customerName: "Test Customer",
          customerEmail: "test@example.com",
          customerPhone: "050-1234567"
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Checkout failed (${res.status})`);
      }

      const data = await res.json();

      if (data.success && data.redirectUrl) {
        setMsg(`Payment session created! Redirecting to Tranzila...`);
        // Redirect to Tranzila payment page
        window.location.href = data.redirectUrl;
      } else {
        throw new Error('Invalid response from checkout');
      }
    } catch (e: any) {
      setErr(e?.message || 'Checkout failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">DPNR Course Materials</h1>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">{msg}</div>}
      {err && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{err}</div>}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 max-w-4xl">
        {PRODUCTS.map((product) => (
          <div key={product.id} className="border rounded-lg p-6 bg-white shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                <p className="text-gray-600 text-sm mb-3">{product.description}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-blue-600">
                ₪{product.price}
              </div>
              <button
                disabled={busy === product.id}
                onClick={() => checkout(product)}
                className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {busy === product.id ? 'Processing...' : 'Buy Now'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-sm text-gray-500">
        <p>💳 Payments processed securely through Tranzila</p>
        <p>🇮🇱 Israeli Shekel (ILS) pricing</p>
      </div>
    </main>
  );
}
