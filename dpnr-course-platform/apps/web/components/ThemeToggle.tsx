"use client";

import { useEffect, useState } from 'react';
import { Label } from './ui/label';
import Switch from './ui/switch';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  function applyTheme(next: 'light' | 'dark') {
    setTheme(next);
    const root = document.documentElement;
    if (next === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
    try { localStorage.setItem('theme', next); } catch {}
  }

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
      const initial = stored ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      applyTheme(initial);
    } catch {
      // Fallback to prefers-color-scheme without storage
      const initial = (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
      applyTheme(initial);
    }
  }, []);

  if (!mounted) return null;
  const isDark = theme === 'dark';
  return (
    <div className="flex items-center space-x-2 ml-4 select-none">
      <Switch
        id="dark-mode"
        aria-label="Toggle dark mode"
        checked={isDark}
        onCheckedChange={(v) => applyTheme(v ? 'dark' : 'light')}
      />
      <Label htmlFor="dark-mode">Dark Mode</Label>
    </div>
  );
}
