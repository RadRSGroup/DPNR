import Image from "next/image";
import Reveal from "./Reveal";

type CTA = { href: string; label: string };

export default function Hero({
  title,
  subtitle,
  primary,
  secondary,
  imageSrc,
  invert = false,
}: {
  title: string;
  subtitle?: string;
  primary?: CTA;
  secondary?: CTA;
  imageSrc?: string;
  invert?: boolean;
}) {
  return (
    <section className="relative w-full bg-black text-white">
      <div className="mx-auto max-w-[1200px] px-6 py-[18vh]">
        <div className={`grid md:grid-cols-5 gap-10 items-center ${invert ? "md:[&>*:first-child]:order-2" : ""}`}>
          <Reveal className="md:col-span-2">
            <div className="text-center">
              <h1 className="font-semibold tracking-tight" style={{ fontSize: "var(--fluid-h1)" }}>{title}</h1>
              {subtitle && (
                <p className="mt-4 text-white/80 max-w-2xl md:max-w-none mx-auto md:mx-0">{subtitle}</p>
              )}
              {(primary || secondary) && (
                <div className="mt-8 flex items-center justify-center gap-4">
                  {primary && (
                    <a href={primary.href} className="px-5 py-2.5 rounded-full bg-white text-black hover:opacity-90">{primary.label}</a>
                  )}
                  {secondary && (
                    <a href={secondary.href} className="px-5 py-2.5 rounded-full border border-white/40 hover:bg-white/10">{secondary.label}</a>
                  )}
                </div>
              )}
            </div>
          </Reveal>
          <Reveal delay={100} className="md:col-span-3">
            <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden bg-white/10">
              {imageSrc && (
                <Image src={imageSrc} alt="Hero" fill priority sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
