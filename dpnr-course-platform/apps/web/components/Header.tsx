"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "./ui/button";
import { ThemeToggle } from "./ThemeToggle";
import messages from "../translations/messages.json";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
    } catch (e) {
      router.push("/");
    }
  }

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function splitPath(path: string) {
    const parts = (path || '/').split('/').filter(Boolean);
    if (parts.length === 0) return { locale: null as string | null, rest: '/' };
    const first = parts[0];
    if (first === 'en' || first === 'he') {
      const rest = '/' + parts.slice(1).join('/');
      return { locale: first, rest: rest === '/' ? '/' : rest };
    }
    return { locale: null as string | null, rest: path || '/' };
  }
  const { locale: currentLocale, rest } = splitPath(pathname || '/');
  const [locale, setLocale] = useState<string>(currentLocale || 'en');
  const prefix = currentLocale ? `/${locale}` : '';
  useEffect(() => {
    try {
      const match = document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]+)/);
      const cookieLoc = match ? decodeURIComponent(match[1]) : null;
      setLocale(cookieLoc === 'he' ? 'he' : (currentLocale || 'en'));
    } catch {}
  }, [currentLocale]);
  const labels = (messages as any)[locale]?.header || (messages as any).en.header;
  function isLocalizable(path: string) {
    // Only keep same-path navigation for known public routes
    const allowed = new Set(['/','/about','/course','/library','/shop','/new']);
    return allowed.has(path);
  }
  function changeLocale(next: string) {
    try { document.cookie = `NEXT_LOCALE=${next}; Path=/; Max-Age=31536000`; } catch {}
    if (isLocalizable(rest)) {
      const target = `/${next}${rest === '/' ? '' : rest}`;
      router.push(target);
    } else {
      // Stay on current route (e.g., /dashboard, /auth/*). UI may localize later via provider.
      router.refresh();
    }
  }

  // Prevent hydration mismatch by not rendering dynamic content until mounted
  const isDashboard = mounted && pathname?.startsWith("/dashboard");

  return (
    <header className="fixed top-0 inset-x-0 z-50 w-full border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-5xl mx-auto flex items-center justify-between py-3 px-4">
        <a href="/" className="font-semibold text-primary">DPNR</a>
        <nav className="flex items-center gap-2">
          <a href={`${prefix}/about`} className="text-sm px-2 py-1 rounded hover:bg-muted">{labels.about}</a>
          <a href={`${prefix}/course`} className="text-sm px-2 py-1 rounded hover:bg-muted">{labels.course}</a>
          <a href={`${prefix}/library`} className="text-sm px-2 py-1 rounded hover:bg-muted">{labels.library}</a>
          <a href={`${prefix}/shop`} className="text-sm px-2 py-1 rounded hover:bg-muted">{labels.shop}</a>
          <a href={`/dashboard`} className="text-sm px-2 py-1 rounded hover:bg-muted">{labels.dashboard}</a>
          {mounted ? (
            isDashboard ? (
              <Button variant="outline" onClick={logout}>{labels.logout}</Button>
            ) : (
              <a href="/auth/login" className="text-sm px-2 py-1 rounded hover:bg-gray-100">{labels.login}</a>
            )
          ) : (
            <a href="/auth/login" className="text-sm px-2 py-1 rounded hover:bg-gray-100">{labels.login}</a>
          )}
          <div className="ml-2">
            <select
              aria-label="Language"
              value={locale}
              onChange={(e) => changeLocale(e.target.value)}
              className="text-sm border rounded px-2 py-1 bg-background"
            >
              {locale === 'he' ? (
                <>
                  <option value="he">עברית</option>
                  <option value="en">English</option>
                </>
              ) : (
                <>
                  <option value="en">English</option>
                  <option value="he">עברית</option>
                </>
              )}
            </select>
          </div>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
