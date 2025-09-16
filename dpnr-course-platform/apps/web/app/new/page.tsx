import Link from "next/link";
import Hero from "../../components/marketing/Hero";
import CoursesGrid from "../../components/marketing/CoursesGrid";
import Testimonials from "../../components/marketing/Testimonials";

export default function NewLanding() {
  return (
    <main>
      <Hero
        title="You are the MOST Important Resource in the World."
        subtitle="Explore your inner world with DPNR."
        primary={{ href: "/dashboard", label: "Dashboard" }}
        secondary={{ href: "/auth/login", label: "Login" }}
        imageSrc="/hero-portal.png"
      />

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
          <div className="rounded-xl overflow-hidden aspect-[16/10]">
            <img src="/course-1.jpg" alt="Sign in" className="w-full h-full object-cover" />
          </div>
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
          <div className="rounded-xl overflow-hidden aspect-[16/10]">
            <img src="/course-2.jpg" alt="Materials" className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      {/* Dynamic courses preview */}
      <CoursesGrid />

      {/* Testimonials */}
      <Testimonials />

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
