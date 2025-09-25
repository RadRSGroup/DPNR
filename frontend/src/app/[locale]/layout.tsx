import type { Metadata } from "next";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AuthProvider } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { localeDirections, Locale } from "@/i18n/config";

type Props = {
  children: React.ReactNode;
  params: Promise<{locale: Locale}>;
};

export const metadata: Metadata = {
  title: "DPNR - פיתוח אישי ומקצועי",
  description: "פלטפורמת לימוד מתקדמת לפיתוח אישי ומקצועי עם DPNR",
  keywords: ["פיתוח אישי", "פיתוח מקצועי", "קורסים", "הדרכה", "DPNR"],
  authors: [{ name: "DPNR" }],
  robots: "index, follow",
  openGraph: {
    title: "DPNR - פיתוח אישי ומקצועי",
    description: "פלטפורמת לימוד מתקדמת לפיתוח אישי ומקצועי",
    type: "website",
    locale: "he_IL",
    alternateLocale: "en_US",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default async function LocaleLayout({ children, params }: Props) {
  // Providing all messages to the client
  // side is the easiest way to get started
  const { locale } = await params;
  const messages = await getMessages({ locale });
  const direction = localeDirections[locale];

  return (
    <html lang={locale} dir={direction}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <Layout locale={locale}>
              {children}
            </Layout>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}