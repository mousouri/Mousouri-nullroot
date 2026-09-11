"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  charRise,
  charDelay,
  EASE_OUT_EXPO,
  DUR,
  fadeRise,
  crossfade,
} from "@/lib/motion";
import { useEnvironment } from "@/hooks/use-environment";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { Typewriter } from "@/components/ui/Typewriter";
import { HERO_COORDS } from "@/lib/data";

gsap.registerPlugin(ScrollTrigger);

const WORDMARK = "MOUSOURI";

/**
 * Hero — typography, grid and motion only, no imagery.
 * Sequence (gated on `booted`, i.e. the preloader wipe):
 *   1. SVG grid lines draw in (pathLength 0→1, staggered)
 *   2. "+" registration markers pop
 *   3. wordmark characters rise with deliberately uneven delays
 *   4. tagline scramble-decodes (re-triggerable on hover)
 *   5. terminal lines type themselves
 *   6. metadata ticks in last
 * Scroll: content parallax drift + fade (desktop, motion allowed).
 */
export function Hero({ booted }: { booted: boolean }) {
  const { reducedMotion, canPin } = useEnvironment();
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // scroll-linked parallax drift on the whole hero stack
  useEffect(() => {
    const el = sectionRef.current;
    const content = contentRef.current;
    if (!el || !content || !canPin) return;
    const ctx = gsap.context(() => {
      gsap.to(content, {
        yPercent: -14,
        opacity: 0.25,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }, el);
    return () => ctx.revert();
  }, [canPin]);

  const meta = reducedMotion ? crossfade : fadeRise;
  const anim = booted ? "show" : "hidden";

  return (
    <section
      id="top"
      ref={sectionRef}
      className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden px-4 pt-24 pb-16 md:px-8"
    >
      {/* ---- SVG exposed grid, drawing itself in ---- */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        {/* verticals */}
        {[16.666, 33.333, 50, 66.666, 83.333].map((x, i) => (
          <motion.line
            key={`v${x}`}
            x1={x}
            y1={0}
            x2={x}
            y2={100}
            stroke="var(--line-strong)"
            strokeWidth={0.08}
            initial={{ pathLength: 0 }}
            animate={booted ? { pathLength: 1 } : { pathLength: 0 }}
            transition={{ duration: DUR.hero + 0.4, ease: EASE_OUT_EXPO, delay: 0.1 + i * 0.07 }}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {/* horizontals */}
        {[24, 78].map((y, i) => (
          <motion.line
            key={`h${y}`}
            x1={0}
            y1={y}
            x2={100}
            y2={y}
            stroke="var(--line)"
            strokeWidth={0.08}
            initial={{ pathLength: 0 }}
            animate={booted ? { pathLength: 1 } : { pathLength: 0 }}
            transition={{ duration: DUR.hero, ease: EASE_OUT_EXPO, delay: 0.35 + i * 0.1 }}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {/* registration markers */}
        {[
          [16.666, 24],
          [50, 24],
          [83.333, 24],
          [33.333, 78],
          [66.666, 78],
        ].map(([x, y], i) => (
          <motion.text
            key={`m${x}-${y}`}
            x={x}
            y={y}
            fill="var(--acid)"
            fontSize={1.6}
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="var(--font-jbmono)"
            initial={{ opacity: 0, scale: 0 }}
            animate={booted ? { opacity: 0.9, scale: 1 } : { opacity: 0, scale: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT_EXPO, delay: 0.9 + i * 0.08 }}
          >
            +
          </motion.text>
        ))}
      </svg>

      {/* ---- content stack ---- */}
      <div ref={contentRef} className="relative">
        {/* metadata top row */}
        <motion.div
          className="mb-6 flex flex-wrap gap-x-8 gap-y-1 font-mono text-[10px] tracking-[0.25em] text-dim md:mb-10 md:pl-[16.666%]"
          initial="hidden"
          animate={anim}
          variants={meta}
          custom={5}
        >
          <span>SYS.BOOT: COMPLETE</span>
          <span>{HERO_COORDS}</span>
          <span className="hidden md:inline">BUILD: 2.4.1 — STABLE</span>
        </motion.div>

        {/* oversized wordmark — variable per-char delay, overflow-clipped */}
        <h1
          className="font-display leading-[0.86] tracking-[0.01em] text-paper select-none"
          style={{ fontSize: "clamp(4.2rem, 15.5vw, 15.5rem)" }}
          aria-label={WORDMARK}
        >
          {WORDMARK.split("").map((ch, i) => (
            <span key={i} className="inline-block overflow-hidden pb-[0.06em] align-bottom">
              <motion.span
                className="inline-block will-change-transform"
                initial="hidden"
                animate={anim}
                custom={i}
                variants={reducedMotion ? crossfade : charRise}
              >
                {ch}
              </motion.span>
            </span>
          ))}
          {/* hostile accent: terminal block cursor parked at the end */}
          <motion.span
            className="blink-block ml-3 inline-block h-[0.72em] w-[0.14em] translate-y-[0.04em] bg-acid align-baseline"
            initial={{ opacity: 0 }}
            animate={booted ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: reducedMotion ? 0 : 1.15 }}
          />
        </h1>

        {/* tagline — scramble-decode, re-triggerable */}
        <motion.p
          className="mt-5 font-mono text-sm tracking-[0.3em] text-acid md:mt-7 md:text-lg"
          initial={{ opacity: 0 }}
          animate={booted ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: reducedMotion ? 0 : 0.95, duration: 0.3 }}
        >
          <ScrambleText
            text="BREAKING THINGS ON PURPOSE"
            auto
            retrigger
            reduced={reducedMotion || !booted}
            delay={reducedMotion ? 0 : 1050}
          />
        </motion.p>

        {/* terminal subline — types itself */}
        <motion.div
          className="mt-8 max-w-xl border border-line bg-ink/60 p-4 md:mt-12 md:ml-[16.666%]"
          initial="hidden"
          animate={anim}
          variants={meta}
          custom={3}
        >
          <p className="mb-2 font-mono text-[9px] tracking-[0.3em] text-dim">
            GUEST@MOUSOURI — BASH — 80×24
          </p>
          <Typewriter
            lines={[
              "whoami --public",
              "computer_engineer (NTA-6) · security_researcher · algo_trader",
            ]}
            startDelay={reducedMotion ? 0 : 1500}
            reduced={reducedMotion || !booted}
            className="font-mono text-[11px] leading-relaxed text-paper/90 md:text-xs"
          />
        </motion.div>

        {/* bottom row — scroll cue + system readout */}
        <motion.div
          className="mt-10 flex items-center justify-between font-mono text-[10px] tracking-[0.25em] text-dim md:mt-16"
          initial="hidden"
          animate={anim}
          variants={meta}
          custom={6}
        >
          <span className="flex items-center gap-2">
            <span className="text-acid">[</span> SCROLL TO EXPLORE{" "}
            <motion.span
              className="inline-block text-acid"
              animate={reducedMotion ? {} : { y: [0, 4, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            >
              ↓
            </motion.span>
            <span className="text-acid">]</span>
          </span>
          <span className="hidden sm:block">PORT:3000 — LOCAL MIRROR</span>
        </motion.div>
      </div>

      {/* corner file path breadcrumb */}
      <motion.p
        className="absolute right-4 bottom-4 hidden font-mono text-[9px] tracking-wider text-dim/70 lg:block"
        initial={{ opacity: 0 }}
        animate={booted ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 1.6 }}
      >
        /home/mousouri/index — last commit: today
      </motion.p>
    </section>
  );
}
