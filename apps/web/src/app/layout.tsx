import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Workshop Rooms — DPNR",
  description: "Map your decision. Hear yourself clearly.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#0a0a0f] text-white min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
