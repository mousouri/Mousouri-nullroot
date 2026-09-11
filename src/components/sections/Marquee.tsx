"use client";

import { useEffect, useRef } from "react";
import { EXPLORING_ITEMS, FOOTER_ITEMS } from "@/lib/data";
import { useEnvironment } from "@/hooks/use-environment";
import { scrollStore } from "@/hooks/use-smooth-scroll";

interface MarqueeProps {
  items?: string[];
  reverse?: boolean;
  label?: string;
  outlined?: boolean;
}

/**
 * Infinite marquee with scroll-velocity coupling: base crawl speed is
 * amplified by |lenis.velocity| with exponential decay, so a hard scroll
 * whips the text and it settles back. When Lenis is absent the store just
 * reports zero velocity → constant crawl. Static under reduced motion.
 */
export function Marquee({
  items = EXPLORING_ITEMS,
  reverse = false,
  label,
  outlined = false,
}: MarqueeProps) {
  const { reducedMotion } = useEnvironment();
  const trackRef = useRef<HTMLDivElement>(null);
  const content = [...items, ...items]; // duplicated for seamless wrap

  useEffect(() => {
    if (reducedMotion) return;
    const track = trackRef.current;
    if (!track) return;

    let x = 0;
    let vel = 0;
    let raf = 0;
    let last = performance.now();
    const dir = reverse ? 1 : -1;

    const loop = (now: number) => {
      const dt = Math.min(64, now - last) / 1000;
      last = now;

      // velocity coupling: raw lenis velocity decays fast (tau ≈ 220ms)
      vel = Math.max(Math.abs(scrollStore.velocity) * 26, vel * Math.exp(-dt / 0.22));
      const speed = 60 + vel; // px/s
      const half = track.scrollWidth / 2 || 1;
      x = (x + dir * speed * dt) % half;
      if (x > 0) x -= half; // keep in [-half, 0)
      track.style.transform = `translate3d(${x}px, 0, 0)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion, reverse]);

  return (
    <div className="relative overflow-hidden border-y border-line py-3.5 md:py-5">
      {label && (
        <span className="absolute left-4 top-1/2 z-10 -translate-y-1/2 bg-ink px-2 font-mono text-[9px] tracking-[0.3em] text-acid">
          {label}
        </span>
      )}
      <div
        ref={trackRef}
        className="flex w-max items-center whitespace-nowrap will-change-transform"
      >
        {content.map((item, i) => (
          <span key={i} className="flex items-center">
            <span
              className={`px-6 font-display text-2xl tracking-wide md:px-10 md:text-4xl ${
                outlined ? "text-stroke" : "text-paper"
              }`}
            >
              {item}
            </span>
            <span className="font-mono text-sm text-acid md:text-base">{"//"}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Footer variant reuses the same engine with different copy. */
export function FooterMarquee() {
  return <Marquee items={FOOTER_ITEMS} outlined reverse label="STATUS:" />;
}
