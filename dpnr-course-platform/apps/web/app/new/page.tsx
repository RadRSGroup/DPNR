import Link from "next/link";
import { cookies } from "next/headers";
import Hero from "../../components/marketing/Hero";
import CoursesGrid from "../../components/marketing/CoursesGrid";
import Testimonials from "../../components/marketing/Testimonials";
import ShopStrip from "../../components/marketing/ShopStrip";
import Footer from "../../components/Footer";
import messages from "../../translations/messages.json";

export default async function NewLanding() {
  const locale = (await cookies()).get('NEXT_LOCALE')?.value === 'he' ? 'he' : 'en';
  const dict: any = (messages as any)[locale];
  const landing = dict.landing;
  const heroEn: any = (messages as any).en.landing; // Hero always in English
  return (
    <main>
      <Hero
        title={heroEn.hero_title}
        subtitle={heroEn.hero_sub}
        primary={{ href: "/dashboard", label: heroEn.cta_dashboard }}
        secondary={{ href: "/auth/login", label: heroEn.cta_login }}
        imageSrc="/hero-portal.png"
        stacked
      />

      {/* Band 1 */}
      <section className="w-full bg-background">
        <div className="mx-auto max-w-[1200px] px-6 py-24 md:py-32 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="font-semibold tracking-tight" style={{ fontSize: 'var(--fluid-h2)' }}>{landing.band1_title}</h2>
            <p className="mt-3 text-muted-foreground">{landing.band1_copy}</p>
            <div className="mt-6">
              <Link href="/auth/login" className="underline">{landing.sign_in}</Link>
            </div>
          </div>
          <div className="rounded-xl overflow-hidden aspect-[16/10]">
            <img src="/course-1.jpg" alt="Sign in" loading="lazy" className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      {/* Band 2 (inverted) */}
      <section className="w-full bg-black text-white">
        <div className="mx-auto max-w-[1200px] px-6 py-24 md:py-32 grid md:grid-cols-2 gap-10 items-center">
          <div className="order-last md:order-first">
            <h2 className="font-semibold tracking-tight" style={{ fontSize: 'var(--fluid-h2)' }}>{landing.band2_title}</h2>
            <p className="mt-3 text-white/70">{landing.band2_copy}</p>
            <div className="mt-6">
              <Link href="/library" className="underline">{landing.cta_browse_library}</Link>
            </div>
          </div>
          <div className="rounded-xl overflow-hidden aspect-[16/10]">
            <img src="/course-2.jpg" alt="Materials" loading="lazy" className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      {/* Dynamic courses preview */}
      <CoursesGrid />

      {/* Testimonials */}
      <Testimonials />

      {/* Shop preview */}
      <ShopStrip />

      {/* Band 3 */}
      <section className="w-full bg-background">
        <div className="mx-auto max-w-[1200px] px-6 py-24 md:py-32 text-center">
          <h2 className="font-semibold tracking-tight" style={{ fontSize: 'var(--fluid-h2)' }}>{landing.band3_title}</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">{landing.band3_copy}</p>
          <div className="mt-6 flex items-center justify-center gap-4">
            <Link href="/auth/register" className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground">{landing.cta_register}</Link>
            <Link href="/about" className="px-5 py-2.5 rounded-full border border-input hover:bg-muted">{landing.cta_about}</Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
