import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-display" });

// "Workshop Rooms" is deliberately reserved for the /rooms hub specifically,
// not top-level branding (see rooms/page.tsx's own doc comment) — this
// site-wide <title> had been left using it anyway since before the
// InnerOS/DPNR rebrand. Matches the wordmark signup/login already show
// ("DPNR" caption over an "InnerOS" title).
export const metadata: Metadata = {
  title: "InnerOS — DPNR",
  description: "Your personal Human Operating System — reflect, decide, and grow with DPNR.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} ${inter.className} bg-[#0a0a0f] text-white min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
