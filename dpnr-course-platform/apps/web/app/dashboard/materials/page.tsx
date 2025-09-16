"use client";

import { useEffect, useState } from 'react';

type Material = { id: string; title: string; type: string; isPublic: boolean };

export default function MaterialsPage() {
  const [courseId, setCourseId] = useState("");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function ensureCsrf() {
    try { await fetch('/api/csrf'); } catch {}
  }

  async function fetchMaterials() {
    setError(null);
    if (!courseId) return;
    const res = await fetch(`/api/materials/${courseId}`, { cache: 'no-store' });
    if (!res.ok) {
      setError('Could not load materials');
      return;
    }
    const data = await res.json();
    setMaterials(data.materials || []);
  }

  async function download(id: string) {
    await ensureCsrf();
    const token = document.cookie.split('; ').find((c) => c.startsWith('csrf_token='))?.split('=')[1];
    const res = await fetch(`/api/materials/download/${id}`, {
      headers: token ? { 'x-csrf-token': token } : undefined,
    });
    if (!res.ok) { setError('Download not permitted'); return; }
    const data = await res.json();
    window.open(data.url, '_blank');
  }

  useEffect(() => { ensureCsrf(); }, []);

  return (
    <main className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Materials</h1>
      <div className="flex gap-2 mb-4">
        <input className="border rounded px-2 py-1" placeholder="Enter course ID" value={courseId} onChange={(e) => setCourseId(e.target.value)} />
        <button className="px-3 py-1 rounded bg-violet-600 text-white" onClick={fetchMaterials}>Load</button>
      </div>
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
      {materials.length === 0 ? (
        <p>Enter a course ID to list materials.</p>
      ) : (
        <ul className="space-y-2">
          {materials.map((m) => (
            <li key={m.id} className="flex items-center justify-between border rounded p-2">
              <div>
                <div className="font-medium">{m.title}</div>
                <div className="text-xs text-gray-600">{m.type} {m.isPublic ? '(Public)' : '(Enrolled only)'}</div>
              </div>
              <button className="px-3 py-1 rounded border" onClick={() => download(m.id)}>Download</button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
