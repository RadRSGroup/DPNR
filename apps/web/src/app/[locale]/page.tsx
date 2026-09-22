import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";

export default function Home() {
  const t = useTranslations("Landing");
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
        <div className="max-w-sm w-full text-center lg:text-start space-y-8">
          <div className="space-y-3">
            <p className="text-[var(--color-violet-400)] text-xs tracking-[0.2em] uppercase">DPNR</p>
            <div className="flex items-center gap-3 justify-center lg:justify-start">
              <h1 className="font-display text-5xl lg:text-6xl text-white">Your Human Operating System</h1>
              <span className="text-[10px] font-semibold tracking-widest uppercase text-[var(--color-amber-400)] border border-[var(--color-amber-400)]/40 rounded-full px-2 py-0.5 whitespace-nowrap">
                {t("beta")}
              </span>
            </div>
            <p className="font-display italic text-white/70 text-lg">{t("tagline")}</p>
            <p className="text-[var(--color-text-secondary)] text-sm max-w-xs mx-auto lg:mx-0">
              {t("subtitle")}
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/login"
              className="block w-full bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] active:scale-[0.98] text-white rounded-2xl py-4 text-base font-medium text-center shadow-[var(--shadow-glow-violet)] transition-all"
            >
              {t("signIn")}
            </Link>
          </div>

          <p className="text-[var(--color-text-tertiary)] text-sm">
            {t("newHere")}{" "}
            <Link href="/signup" className="text-[var(--color-violet-400)] hover:text-[var(--color-violet-300)]">
              {t("createAccount")}
            </Link>
          </p>

          <p className="text-[var(--color-text-tertiary)] text-xs">{t("footerTagline")}</p>
        </div>
      </div>
    </main>
  );
}
