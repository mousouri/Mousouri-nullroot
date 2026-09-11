"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CAPABILITIES } from "@/lib/data";
import { navigate } from "@/lib/router";
import { EASE_OUT_EXPO, DUR } from "@/lib/motion";
import { useEnvironment } from "@/hooks/use-environment";
import { SectionHeading } from "@/components/ui/SectionHeading";

gsap.registerPlugin(ScrollTrigger);

/**
 * Capabilities — pinned scan choreography (desktop, motion allowed):
 * the section pins for ~260vh while each domain block un-masks
 * (clip-path inset scrub) in strict sequence, like a terminal scanning
 * entries. A live progress readout tracks timeline progress.
 * Mobile / reduced-motion: plain whileInView reveals, no pinning.
 */
export function Capabilities() {
  const { canPin } = useEnvironment();
  const sectionRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || !canPin) return;

    const ctx = gsap.context(() => {
      const blocks = gsap.utils.toArray<HTMLElement>("[data-cap-block]", el);

      const tl = gsap.timeline({
        defaults: { ease: "none" }, // scrubbing owns the easing
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: "+=260%",
          pin: true,
          scrub: 0.6, // small catch-up smoothing, keeps inertia feel
          anticipatePin: 1,
          onUpdate: (self) => {
            if (pctRef.current) {
              pctRef.current.textContent = `${String(Math.round(self.progress * 100)).padStart(3, "0")}%`;
            }
          },
        },
      });

      blocks.forEach((block) => {
        // un-mask: clip wipes down-out, sequential — the core scrub moment
        tl.fromTo(
          block,
          { clipPath: "inset(0 0 100% 0)", y: 28 },
          {
            clipPath: "inset(0 0 0% 0)",
            y: 0,
            duration: 1,
          },
          ">-0.35", // slight overlap so the scan feels continuous
        );
        // command line accent flash as each block resolves
        tl.fromTo(
          block.querySelector("[data-cap-cmd]"),
          { color: "var(--acid)" },
          { color: "var(--paper)", duration: 0.5 },
          "<0.4",
        );
      });

      // hold the last block on screen briefly before unpinning
      tl.to({}, { duration: 0.4 });
    }, el);

    return () => ctx.revert();
  }, [canPin]);

  return (
    <section id="stack" ref={sectionRef} className="relative px-4 py-24 md:px-8 md:py-36">
      <SectionHeading index="02" title="CAPABILITIES" meta="./scan --domains --verbose" />

      {/* progress readout — desktop pinned mode only */}
      {canPin && (
        <div className="mt-6 flex items-center gap-3 font-mono text-[10px] tracking-[0.25em] text-dim">
          <span className="inline-block h-1.5 w-1.5 animate-none bg-acid" />
          SCANNING DOMAINS — <span ref={pctRef} className="text-acid tabular-nums">000%</span>
          <span className="text-dim/60" ref={progressRef} />
        </div>
      )}

      <div className="mt-12 grid grid-cols-1 gap-px border border-line bg-line md:mt-16 lg:grid-cols-2">
        {CAPABILITIES.map((cap, i) => (
          <motion.article
            key={cap.id}
            data-cap-block
            className="group relative bg-ink p-6 md:p-9"
            // non-pinned (mobile / reduced) gets plain in-view reveals;
            // pinned desktop blocks are driven by the ScrollTrigger scrub
            initial={canPin ? false : { opacity: 0, y: 28 }}
            whileInView={canPin ? undefined : { opacity: 1, y: 0 }}
            viewport={canPin ? undefined : { once: true, margin: "-8% 0px" }}
            transition={canPin ? undefined : { duration: DUR.slow, ease: EASE_OUT_EXPO, delay: (i % 2) * 0.08 }}
          >
            <div className="mb-5 flex items-baseline justify-between gap-4">
              <p
                data-cap-cmd
                className="font-mono text-[11px] tracking-wider text-paper md:text-xs"
              >
                {cap.command}
              </p>
              <span className="font-mono text-[10px] text-dim">[{String(i + 1).padStart(2, "0")}]</span>
            </div>

            <h3 className="font-display text-3xl tracking-wide text-paper md:text-4xl">
              {cap.title}
            </h3>

            <p className="mt-4 max-w-md font-body text-sm leading-relaxed text-paper/75">
              {cap.blurb}
            </p>

            <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2">
              {cap.tags.map((tag) => (
                <li
                  key={tag}
                  className="font-mono text-[10px] tracking-widest text-dim transition-colors duration-150 hover:text-acid"
                >
                  <span className="text-acid/60">·</span> {tag}
                </li>
              ))}
            </ul>

            {/* hover: accent rail slides in */}
            <span className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-acid transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-x-100" />
          </motion.article>
        ))}
      </div>

      {/* deep-dive CTA — the full stack lives on its own page now */}
      <button
        type="button"
        onClick={() => navigate({ page: "stack" })}
        data-cursor="OPEN"
        className="group -mt-px flex w-full items-center justify-between gap-4 border border-line bg-ink px-5 py-6 text-left transition-colors duration-200 hover:bg-acid md:px-8 md:py-7"
        aria-label="Open the full stack page"
      >
        <span className="font-mono text-[9px] leading-relaxed tracking-[0.25em] text-dim transition-colors duration-200 group-hover:text-ink/70 md:text-[10px]">
          DEEP DIVE — TOOL LEVELS · RECEIPTS · THE IDEA BULB
        </span>
        <span className="flex shrink-0 items-center gap-2 font-display text-xl tracking-wide text-paper transition-colors duration-200 group-hover:text-ink md:text-3xl">
          OPEN THE STACK
          <span className="inline-block transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
            ↗
          </span>
        </span>
      </button>
    </section>
  );
}
