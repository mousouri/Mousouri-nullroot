"use client";

import { motion } from "framer-motion";
import { EASE_OUT_EXPO, DUR, crossfade } from "@/lib/motion";
import { useEnvironment } from "@/hooks/use-environment";
import { FooterMarquee } from "@/components/sections/Marquee";
import { HERO_COORDS } from "@/lib/data";

/**
 * Footer — status marquee, outlined wordmark that fills on hover,
 * and a meta strip (coords / stack / local time). Sticks to the bottom
 * of the viewport via the page-level flex column.
 */
export function Footer() {
  const { reducedMotion } = useEnvironment();

  return (
    <footer className="relative mt-auto border-t border-line">
      <FooterMarquee />

      <div className="px-4 pb-10 pt-14 md:px-8 md:pt-20">
        {/* giant outline wordmark */}
        <motion.p
          className="text-stroke hover:text-paper cursor-default text-center font-display leading-none tracking-wide transition-colors duration-500 select-none"
          style={{ fontSize: "clamp(3rem, 17vw, 16rem)" }}
          initial={reducedMotion ? "hidden" : { opacity: 0, y: 40 }}
          whileInView={reducedMotion ? "show" : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-6% 0px" }}
          variants={reducedMotion ? crossfade : undefined}
          transition={{ duration: DUR.slow, ease: EASE_OUT_EXPO }}
          aria-hidden
        >
          MOUSOURI
        </motion.p>

        {/* meta strip */}
        <div className="mt-12 grid grid-cols-1 gap-3 border-t border-line pt-6 font-mono text-[10px] tracking-[0.25em] text-dim md:grid-cols-3">
          <p>© 2026 MOUSOURI — NO RIGHTS RESERVED. TAKE WHAT YOU NEED.</p>
          <p className="md:text-center">{HERO_COORDS} — DSM, TZ</p>
          <p className="md:text-right">NEXT.JS × GSAP × R3F — BUILT LOUD</p>
        </div>
      </div>
    </footer>
  );
}
