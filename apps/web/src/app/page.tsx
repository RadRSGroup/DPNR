import Link from "next/link";
import Image from "next/image";

/**
 * Simplified, brand-recognizable marks for the disabled OAuth buttons below.
 * Not tied to any real provider integration — Cognito has no OAuth identity
 * provider configured (removed in Session 7 once already, as dead UI). These
 * exist purely to show the layout is ready the moment real federation lands.
 */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M23.49 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.44a5.5 5.5 0 0 1-2.39 3.6v3h3.86c2.26-2.08 3.58-5.15 3.58-8.79Z" fill="#4285F4" />
      <path d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.86-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.28v3.11A12 12 0 0 0 12 24Z" fill="#34A853" />
      <path d="M5.27 14.3a7.2 7.2 0 0 1 0-4.6V6.59H1.28a12 12 0 0 0 0 10.82l3.99-3.11Z" fill="#FBBC05" />
      <path d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.28 6.59l3.99 3.11C6.22 6.86 8.87 4.75 12 4.75Z" fill="#EA4335" />
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M16.365 1.43c0 1.14-.462 2.15-1.213 2.95-.826.88-2.021 1.55-3.09 1.46-.132-1.1.44-2.24 1.19-3.02.82-.86 2.24-1.5 3.113-1.39Zm3.96 16.94c-.52 1.19-.77 1.72-1.44 2.77-.94 1.47-2.27 3.31-3.92 3.32-1.46.02-1.84-.95-3.83-.94-1.99.01-2.41.96-3.87.94-1.65-.02-2.9-1.67-3.85-3.14C1 18.6-.06 14.72.85 12.06c.63-1.86 2.11-2.99 3.5-2.99 1.38 0 2.25 1.02 3.4 1.02 1.11 0 1.8-1.02 3.4-1.02 1.24 0 2.55.68 3.48 1.85-3.06 1.68-2.56 6.06.36 7.45.24.12-.13-.28.32.99Z" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="relative min-h-screen bg-[var(--color-bg-base)] lg:flex overflow-hidden">
      {/* Scenery — top band on mobile, full-height right pane on desktop. Fades
          into the flat page background on the edge that meets the copy panel,
          never on a colored/photo background, so the edge can't seam-mismatch. */}
      <div className="relative h-64 lg:h-auto lg:w-1/2 lg:order-2">
        <Image
          src="/images/decision/decision-room-hero.webp"
          alt=""
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b lg:bg-gradient-to-l from-transparent to-[var(--color-bg-base)]" />
      </div>

      {/* Copy + auth panel */}
      <div className="relative z-10 flex-1 lg:w-1/2 lg:order-1 flex flex-col items-center justify-center px-6 lg:px-16 py-14 lg:py-0">
        <div className="max-w-sm w-full text-center lg:text-left space-y-8">
          <div className="space-y-3">
            <p className="text-[var(--color-violet-400)] text-xs tracking-[0.2em] uppercase">DPNR</p>
            <div className="flex items-center gap-3 justify-center lg:justify-start">
              <h1 className="font-display text-5xl lg:text-6xl text-white">InnerOS</h1>
              <span className="text-[10px] font-semibold tracking-widest uppercase text-[var(--color-amber-400)] border border-[var(--color-amber-400)]/40 rounded-full px-2 py-0.5 whitespace-nowrap">
                Beta
              </span>
            </div>
            <p className="font-display italic text-white/70 text-lg">Your personal Human Operating System.</p>
            <p className="text-[var(--color-text-secondary)] text-sm max-w-xs mx-auto lg:mx-0">
              Reflect, decide, and grow — one conversation at a time.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/login"
              className="block w-full bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] active:scale-[0.98] text-white rounded-2xl py-4 text-base font-medium text-center shadow-[var(--shadow-glow-violet)] transition-all"
            >
              Sign In
            </Link>

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-[var(--color-border-glass)]" />
              <span className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-wide">or</span>
              <div className="h-px flex-1 bg-[var(--color-border-glass)]" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                disabled
                title="Coming soon"
                className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-border-glass)] bg-white/[0.03] py-3.5 text-sm text-white/40 cursor-not-allowed"
              >
                <GoogleIcon className="w-4 h-4 opacity-50" />
                Google
              </button>
              <button
                disabled
                title="Coming soon"
                className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-border-glass)] bg-white/[0.03] py-3.5 text-sm text-white/40 cursor-not-allowed"
              >
                <AppleIcon className="w-4 h-4 opacity-50" />
                Apple
              </button>
            </div>
            <p className="text-[var(--color-text-tertiary)] text-[11px]">Google &amp; Apple sign-in — coming soon</p>
          </div>

          <p className="text-[var(--color-text-tertiary)] text-sm">
            New here?{" "}
            <Link href="/signup" className="text-[var(--color-violet-400)] hover:text-[var(--color-violet-300)]">
              Create an account
            </Link>
          </p>

          <p className="text-[var(--color-text-tertiary)] text-xs">Private · Encrypted · AI-assisted</p>
        </div>
      </div>
    </main>
  );
}
