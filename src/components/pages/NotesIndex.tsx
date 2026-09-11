"use client";

import { motion } from "framer-motion";
import type { Writeup } from "@/lib/data";
import { EASE_OUT_EXPO, DUR, crossfade } from "@/lib/motion";
import { useEnvironment } from "@/hooks/use-environment";
import { ScrambleText } from "@/components/ui/ScrambleText";
import Image from "next/image";

/* ============================================================
   ~/notes — the full archive. Same acid row-flip language as
   the home preview, plus a floating cover thumbnail that
   slides in on hover (desktop) and always-visible thumbs on
   touch widths.
   ============================================================ */

export function NotesIndex({
  writeups,
  onOpen,
}: {
  writeups: Writeup[];
  onOpen: (w: Writeup) => void;
}) {
  const { reducedMotion, isTouch } = useEnvironment();
  const row = reducedMotion ? crossfade : undefined;

  return (
    <div className="px-4 pb-24 pt-10 md:px-8 md:pt-14">
      <motion.div
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR.slow, ease: EASE_OUT_EXPO, delay: 0.2 }}
        className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-6"
      >
        <h1
          className="font-display leading-[0.88] tracking-wide text-paper"
          style={{ fontSize: "clamp(3rem, 10vw, 8.5rem)" }}
        >
          NOTES
          <span className="text-stroke-acid">.TXT</span>
        </h1>
        <p className="mb-2 font-mono text-[10px] leading-relaxed tracking-[0.3em] text-dim">
          FULL ARCHIVE — {writeups.length} FILES
          <br />
          <span className="text-acid">tail -f ~/notes/*.md</span>
        </p>
      </motion.div>

      <div className="mt-12">
        {writeups.map((w, i) => (
          <motion.button
            key={w.id}
            onClick={() => onOpen(w)}
            data-cursor="READ"
            className="group relative block w-full border-t border-line text-left last:border-b"
            initial={row ? "hidden" : { opacity: 0, y: 34 }}
            whileInView={row ? "show" : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-8% 0px" }}
            variants={row}
            transition={row ? undefined : { duration: DUR.base, ease: EASE_OUT_EXPO, delay: (i % 3) * 0.06 }}
            aria-label={`Read ${w.title}`}
          >
            <div className="relative grid grid-cols-12 items-center gap-x-4 gap-y-3 px-2 py-6 transition-colors duration-150 group-hover:bg-acid md:px-4 md:py-7">
              <span className="col-span-3 font-mono text-[11px] tracking-widest text-acid transition-colors duration-150 group-hover:text-ink md:col-span-1">
                {w.index}
              </span>

              <h2 className="col-span-9 font-body text-lg leading-snug text-paper transition-colors duration-150 group-hover:text-ink md:col-span-5 md:text-2xl">
                <ScrambleText text={w.title} retrigger reduced={reducedMotion} />
              </h2>

              {/* cover thumb — slides in on hover (desktop), static on touch */}
              <div
                className={`relative col-span-4 hidden h-16 w-24 overflow-hidden border border-line md:col-span-2 md:block ${
                  isTouch ? "" : "translate-x-3 opacity-0 transition-all duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-0 group-hover:opacity-100"
                }`}
              >
                {w.image && (
                  <Image
                    src={w.image}
                    alt={w.imageAlt ?? w.title}
                    fill
                    sizes="96px"
                    className="object-cover grayscale contrast-125"
                  />
                )}
              </div>

              <span className="col-span-4 font-mono text-[10px] tracking-widest text-dim transition-colors duration-150 group-hover:text-ink/70 md:col-span-1">
                {w.tag}
              </span>

              <span className="col-span-4 font-mono text-[10px] tracking-widest text-dim transition-colors duration-150 group-hover:text-ink/70 md:col-span-2">
                {w.date}
              </span>

              <span className="col-span-4 flex items-baseline justify-end gap-3 font-mono text-[10px] tracking-widest text-dim transition-colors duration-150 group-hover:text-ink md:col-span-1">
                {w.readTime}
                <span className="inline-block text-acid transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:translate-x-1.5 group-hover:text-ink">
                  →
                </span>
              </span>
            </div>
          </motion.button>
        ))}
      </div>

      <p className="mt-8 px-2 font-mono text-[10px] tracking-[0.25em] text-dim/70">
        SOME WRITEUPS WAIT ON DISCLOSURE WINDOWS — THE QUEUE IS LONGER THAN THE BLOG.
      </p>
    </div>
  );
}
