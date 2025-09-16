"use client";

import { useEffect, useState } from 'react';

export default function AccountPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function ensureCsrf() {
    try { await fetch('/api/csrf'); } catch {}
  }

  useEffect(() => { ensureCsrf(); }, []);

  async function exportData() {
    setError(null); setMessage(null); setBusy(true);
    try {
      const res = await fetch('/api/gdpr/export');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'gdpr-export.json'; a.click();
      URL.revokeObjectURL(url);
      setMessage('Export downloaded');
    } catch (e: any) {
      setError(e?.message || 'Export failed');
    } finally { setBusy(false); }
  }

  async function deleteAccount() {
    setError(null); setMessage(null);
    const confirm1 = window.confirm('This will permanently delete your account and related data. Continue?');
    if (!confirm1) return;
    const confirm2 = window.prompt('Type DELETE to confirm');
    if (confirm2 !== 'DELETE') return;
    setBusy(true);
    try {
      await ensureCsrf();
      const token = document.cookie.split('; ').find((c) => c.startsWith('csrf_token='))?.split('=')[1];
      const res = await fetch('/api/gdpr/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-csrf-token': token } : {}),
        },
        body: JSON.stringify({ confirm: true })
      });
      if (!res.ok) throw new Error('Delete failed');
      setMessage('Account deleted. You will be signed out.');
      setTimeout(() => { window.location.href = '/'; }, 1200);
    } catch (e: any) {
      setError(e?.message || 'Delete failed');
    } finally { setBusy(false); }
  }

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Account</h1>
      {message && <p className="text-green-700 text-sm mb-2">{message}</p>}
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
      <div className="space-y-4">
        <button disabled={busy} className="px-3 py-1 rounded border" onClick={exportData}>Download my data</button>
        <div className="pt-4 border-t">
          <button disabled={busy} className="px-3 py-1 rounded bg-red-600 text-white" onClick={deleteAccount}>Delete my account</button>
          <p className="text-xs text-gray-600 mt-1">This action is irreversible.</p>
        </div>
      </div>
    </main>
  );
}

