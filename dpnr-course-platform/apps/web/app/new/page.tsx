import Link from "next/link";

export default function NewLanding() {
  return (
    <main>
      {/* Full‑bleed black hero */}
      <section className="relative w-full bg-black text-white">
        <div className="mx-auto max-w-[1200px] px-6 py-[18vh] text-center">
          <h1 className="font-semibold tracking-tight" style={{ fontSize: 'var(--fluid-h1)' }}>
            You are the MOST Important Resource in the World.
                  </h1>
          <p className="mt-4 text-white/80 max-w-2xl mx-auto">
            Explore your Inner world with DPNR.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/dashboard" className="px-5 py-2.5 rounded-full bg-white text-black hover:opacity-90">Dashboard</Link>
            <Link href="/auth/login" className="px-5 py-2.5 rounded-full border border-white/40 hover:bg-white/10">Login</Link>
          </div>
        </div>
      </section>

      {/* Band 1 */}
      <section className="w-full bg-background">
        <div className="mx-auto max-w-[1200px] px-6 py-24 md:py-32 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="font-semibold tracking-tight" style={{ fontSize: 'var(--fluid-h2)' }}>Secure, simple sign‑in</h2>
            <p className="mt-3 text-muted-foreground">Claim your seat and begin your transformation.</p>
            <div className="mt-6">
              <Link href="/auth/login" className="underline">Sign in</Link>
            </div>
          </div>
          <div className="rounded-xl bg-muted aspect-[16/10]" />
        </div>
      </section>

      {/* Band 2 (inverted) */}
      <section className="w-full bg-black text-white">
        <div className="mx-auto max-w-[1200px] px-6 py-24 md:py-32 grid md:grid-cols-2 gap-10 items-center">
          <div className="order-last md:order-first">
            <h2 className="font-semibold tracking-tight" style={{ fontSize: 'var(--fluid-h2)' }}>Course Materials</h2>
            <p className="mt-3 text-white/70">What is DPNR?</p>
            <div className="mt-6">
              <Link href="/library" className="underline">Browse library</Link>
            </div>
          </div>
          <div className="rounded-xl bg-white/10 aspect-[16/10]" />
        </div>
      </section>

      {/* Band 3 */}
      <section className="w-full bg-background">
        <div className="mx-auto max-w-[1200px] px-6 py-24 md:py-32 text-center">
          <h2 className="font-semibold tracking-tight" style={{ fontSize: 'var(--fluid-h2)' }}>Get started</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">Create an account, enroll, and access course materials.</p>
          <div className="mt-6 flex items-center justify-center gap-4">
            <Link href="/auth/register" className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground">Register</Link>
            <Link href="/about" className="px-5 py-2.5 rounded-full border border-input hover:bg-muted">About</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

