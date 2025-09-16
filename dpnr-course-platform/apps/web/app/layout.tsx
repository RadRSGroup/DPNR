import "./globals.css";
import Header from "../components/Header";
import React from "react";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = 'en';
  const dir = 'ltr';
  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <head>
        <title>DPNR Course Platform</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{__html:`(function(){try{var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var e=document.documentElement; if((t==='dark')||(!t&&d)){e.classList.add('dark');} }catch(e){}})();`}} />
      </head>
      <body className="min-h-screen">
        <Header />
        <div className="w-full pt-16">
          {children}
        </div>
      </body>
    </html>
  );
}
