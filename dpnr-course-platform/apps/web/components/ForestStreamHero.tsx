'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  src?: string;
  alt?: string;
  priority?: boolean;
  className?: string;
  children?: React.ReactNode;
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

export default function ForestStreamHero({
  src = '/images/forest_stream.jpg',
  alt = 'Forest stream and tree roots',
  priority = false,
  className,
  children,
}: Props) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [translate, setTranslate] = useState(0);

  // Lightweight parallax for md+ screens only
  const enableParallax = useMemo(() => {
    if (prefersReducedMotion) return false;
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(min-width: 768px)').matches;
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!enableParallax) return;
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight || 1;
        // progress: element center relative to viewport (0 top, 1 bottom)
        const center = rect.top + rect.height / 2;
        const p = Math.max(0, Math.min(1, center / vh));
        // translate range ~[-14px..14px]
        setTranslate((0.5 - p) * 28);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [enableParallax]);

  return (
    <section
      ref={ref}
      className={[
        'relative w-full overflow-hidden rounded-2xl',
        // Height-based responsiveness avoids Tailwind aspect plugin dependency
        'min-h-[50vh] md:min-h-[60vh] lg:min-h-[70vh] xl:min-h-[75vh]',
        className,
      ].filter(Boolean).join(' ')}
      aria-label={alt}
    >
      {/* Background image */}
      <div
        className="absolute inset-0 will-change-transform"
        style={{ transform: `translateY(${enableParallax ? translate : 0}px)` }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="100vw"
          // Keep the trunk and roots visible by biasing the crop towards lower-left
          style={{ objectFit: 'cover', objectPosition: '35% 70%' }}
          placeholder="empty"
        />
      </div>

      {/* Readability gradient + subtle vignette */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-black/10 to-transparent" />
      <div className="pointer-events-none absolute inset-0 ring-1 ring-black/5" />

      {/* Content slot */}
      {children && (
        <div className="absolute inset-0 grid place-items-end md:place-items-center p-6">
          <div className="max-w-2xl text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
            {children}
          </div>
        </div>
      )}
    </section>
  );
}
