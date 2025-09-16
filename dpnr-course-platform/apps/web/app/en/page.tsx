import Link from 'next/link';
import t from '../../messages/en.json';

export default function LandingEN() {
  const m = t.landing;
  return (
    <main>
      <section className="relative w-full bg-black text-white">
        <div className="mx-auto max-w-[1200px] px-6 py-[18vh] text-center">
          <h1 className="font-semibold tracking-tight" style={{ fontSize: 'var(--fluid-h1)' }}>{m.hero.title}</h1>
          <p className="mt-4 text-white/80 max-w-2xl mx-auto content-mixed">{m.hero.subtitle}</p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/dashboard" className="px-5 py-2.5 rounded-full bg-white text-black hover:opacity-90">{m.hero.ctaPrimary}</Link>
            <Link href="/auth/login" className="px-5 py-2.5 rounded-full border border-white/40 hover:bg-white/10">{m.hero.ctaSecondary}</Link>
          </div>
        </div>
      </section>
      <section className="w-full bg-background">
        <div className="mx-auto max-w-[1200px] px-6 py-24 md:py-32 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="font-semibold tracking-tight" style={{ fontSize: 'var(--fluid-h2)' }}>{m.band1.title}</h2>
            <p className="mt-3 text-muted-foreground content-mixed">{m.band1.copy}</p>
            <div className="mt-6"><Link href="/auth/login" className="underline">{m.band1.link}</Link></div>
          </div>
          <div className="rounded-xl bg-muted aspect-[16/10]" />
        </div>
      </section>
      <section className="w-full bg-black text-white">
        <div className="mx-auto max-w-[1200px] px-6 py-24 md:py-32 grid md:grid-cols-2 gap-10 items-center">
          <div className="order-last md:order-first">
            <h2 className="font-semibold tracking-tight" style={{ fontSize: 'var(--fluid-h2)' }}>{m.band2.title}</h2>
            <p className="mt-3 text-white/70 content-mixed">{m.band2.copy}</p>
            <div className="mt-6"><Link href="/library" className="underline">{m.band2.link}</Link></div>
          </div>
          <div className="rounded-xl bg-white/10 aspect-[16/10]" />
        </div>
      </section>
      <section className="w-full bg-background">
        <div className="mx-auto max-w-[1200px] px-6 py-24 md:py-32 text-center">
          <h2 className="font-semibold tracking-tight" style={{ fontSize: 'var(--fluid-h2)' }}>{m.band3.title}</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto content-mixed">{m.band3.copy}</p>
          <div className="mt-6 flex items-center justify-center gap-4">
            <Link href="/auth/register" className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground">{m.band3.ctaPrimary}</Link>
            <Link href="/about" className="px-5 py-2.5 rounded-full border border-input hover:bg-muted">{m.band3.ctaSecondary}</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

