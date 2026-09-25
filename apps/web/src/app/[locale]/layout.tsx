import type { Metadata } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import "../globals.css";
import GlobalMusicPlayer from "@/components/layout/GlobalMusicPlayer";
import TimeOnDpnrTracker from "@/components/layout/TimeOnDpnrTracker";

// All fonts are self-hosted from `src/fonts/` (variable .woff2 files built
// from google/fonts' OFL sources, subset to Latin + Hebrew — licences in
// `src/fonts/OFL.md`). They used to come from `next/font/google`, which
// downloads from Google at build time; Render's build started failing on
// those downloads (Session 65: "Module not found: Can't resolve
// '@vercel/turbopack-next/internal/font/google/font'" on Frank Ruhl Libre,
// twice in a row), so the build no longer depends on that network call.
const inter = localFont({ src: "../../fonts/Inter.woff2", weight: "100 900", variable: "--font-sans" });
const playfair = localFont({
  src: "../../fonts/PlayfairDisplay.woff2",
  weight: "400 900",
  variable: "--font-display",
  adjustFontFallback: "Times New Roman",
});
// Handwritten face for Pull a Card's question text, matching the designer's
// card reference. Latin-only (no Google handwritten face has legible Hebrew),
// so it's loaded for English only; Hebrew cards use `--font-display` instead
// (PullACard's `rtl:font-display`). Not preloaded: it's used by one widget
// only, so it loads when that widget renders instead of on every page. The
// other four stay preloaded for both locales (user's call, Session 65 —
// preload is static per font, not per visitor, so the alternative was
// picking one language to favour).
const handlee = localFont({ src: "../../fonts/Handlee.woff2", weight: "400", variable: "--font-hand", preload: false });

// Hebrew-capable pairing, chosen to echo the existing Inter/Playfair Display
// feel rather than match them glyph-for-glyph (Playfair has no Hebrew
// glyphs at all — see docs/HEBREW_LOCALIZATION_PLAN.md §5). Heebo is a
// clean, modern Hebrew+Latin sans (extends Roboto) standing in for Inter;
// Frank Ruhl Libre is a classic, literary Hebrew serif — the closest
// available analogue to Playfair's editorial elegance for headings.
// Deliberately reuse the SAME `--font-sans`/`--font-display` variable names
// as the Latin pair (only one of each is ever present in `fontVariables`
// below, so there's no collision) — every existing component that consumes
// `--font-display` via Tailwind's `font-display` utility keeps working
// unchanged for both locales instead of needing a per-component locale check.
const heebo = localFont({ src: "../../fonts/Heebo.woff2", weight: "100 900", variable: "--font-sans" });
const frankRuhlLibre = localFont({
  src: "../../fonts/FrankRuhlLibre.woff2",
  weight: "300 900",
  variable: "--font-display",
  adjustFontFallback: "Times New Roman",
});

// "Workshop Rooms" is deliberately reserved for the /rooms hub specifically,
// not top-level branding (see rooms/page.tsx's own doc comment) — this
// site-wide <title> had been left using it anyway since before the
// InnerOS/DPNR rebrand. Matches the wordmark signup/login already show
// ("DPNR" caption over an "InnerOS" title).
//
// Slice D: moved from a static `export const metadata` to `generateMetadata`
// so the title/description can be localized — a static export can't read
// the resolved `[locale]` param, `generateMetadata` can (it receives the
// same `params` this layout does).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Enables static rendering for this locale (next-intl requirement) — see
  // https://next-intl.dev/docs/getting-started/app-router#static-rendering
  setRequestLocale(locale);

  const dir = locale === "he" ? "rtl" : "ltr";
  const fontVariables =
    locale === "he"
      ? `${heebo.variable} ${frankRuhlLibre.variable} ${heebo.className}`
      : `${inter.variable} ${playfair.variable} ${handlee.variable} ${inter.className}`;

  return (
    <html lang={locale} dir={dir}>
      <body className={`${fontVariables} bg-[#0a0a0f] text-white min-h-screen`}>
        <NextIntlClientProvider>
          {children}
          {/* Outside every page so the music and the time count survive navigation (Session 70). */}
          <GlobalMusicPlayer />
          <TimeOnDpnrTracker />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
