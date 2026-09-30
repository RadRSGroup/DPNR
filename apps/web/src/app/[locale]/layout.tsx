import type { Metadata } from "next";
import { preload } from "react-dom";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import "../globals.css";
import GlobalMusicPlayer from "@/components/layout/GlobalMusicPlayer";
import TimeOnDpnrTracker from "@/components/layout/TimeOnDpnrTracker";
import VisitGate from "@/components/layout/VisitGate";

// Fonts are declared in globals.css (@font-face, served from public/fonts).
// Only the current locale's pair is preloaded: next/font/local, used before
// Session 86, preloads per layout file, so every page preloaded all four
// faces whatever its language (the Session 65 trade-off). Hebrew pairing:
// Heebo (a Hebrew+Latin sans extending Roboto) stands in for Inter, Frank
// Ruhl Libre (a literary Hebrew serif) for Playfair Display, which has no
// Hebrew glyphs (docs/HEBREW_LOCALIZATION_PLAN.md §5). Handlee (Pull a Card,
// English only) is never preloaded: one widget uses it.
const PRELOADED_FONTS: Record<"en" | "he", string[]> = {
  en: ["/fonts/Inter-v1.woff2", "/fonts/PlayfairDisplay-v1.woff2"],
  he: ["/fonts/Heebo-v1.woff2", "/fonts/FrankRuhlLibre-v1.woff2"],
};

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
  const fontLocale = locale === "he" ? "he" : "en";
  // Fonts are always fetched in CORS mode, so the preload must be too or the
  // browser downloads the file twice.
  for (const href of PRELOADED_FONTS[fontLocale]) {
    preload(href, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  }

  return (
    <html lang={locale} dir={dir}>
      <body className={`fonts-${fontLocale} bg-[#0a0a0f] text-white min-h-screen`}>
        <NextIntlClientProvider>
          {children}
          {/* Outside every page so the music and the time count survive navigation (Session 70). */}
          <GlobalMusicPlayer />
          <TimeOnDpnrTracker />
          <VisitGate />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
