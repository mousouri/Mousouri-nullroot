"use client";

import { motion } from "framer-motion";
import { WRITEUPS } from "@/lib/data";
import { EASE_OUT_EXPO, DUR, crossfade, fadeRise } from "@/lib/motion";
import { useEnvironment } from "@/hooks/use-environment";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { navigate } from "@/lib/router";

/**
 * Writeups / Notes — index-style list. Row hover flips the entire row to
 * acid with ink text (the accent used violently), titles scramble on
 * hover. Rows are anchors — real destinations are swapped in data.ts.
 */
export function Writeups() {
  const { reducedMotion } = useEnvironment();
  const row = reducedMotion ? crossfade : fadeRise;

  return (
    <section id="notes" className="relative px-4 py-24 md:px-8 md:py-36">
      <SectionHeading index="04" title="NOTES" meta="tail -f ~/notes/*.md" />

      <div className="mt-14 md:mt-20">
        {WRITEUPS.map((w, i) => (
          <motion.button
            key={w.id}
            onClick={() => navigate({ page: "note", id: w.id })}
            data-cursor="READ"
            className="group relative block w-full text-left border-t border-line last:border-b"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-8% 0px" }}
            custom={i}
            variants={row}
            aria-label={`${w.title} — ${w.tag}`}
          >
            <div className="relative grid grid-cols-12 items-baseline gap-x-4 gap-y-2 px-2 py-6 transition-colors duration-150 group-hover:bg-acid md:px-4 md:py-7">
              {/* index */}
              <span className="col-span-2 font-mono text-[11px] tracking-widest text-acid transition-colors duration-150 group-hover:text-ink md:col-span-1">
                {w.index}
              </span>

              {/* title — scramble on hover */}
              <h3 className="col-span-10 font-body text-lg leading-snug text-paper transition-colors duration-150 group-hover:text-ink md:col-span-6 md:text-2xl">
                <ScrambleText text={w.title} retrigger reduced={reducedMotion} />
              </h3>

              {/* tag */}
              <span className="col-span-4 font-mono text-[10px] tracking-widest text-dim transition-colors duration-150 group-hover:text-ink/70 md:col-span-2">
                {w.tag}
              </span>

              {/* date */}
              <span className="col-span-4 font-mono text-[10px] tracking-widest text-dim transition-colors duration-150 group-hover:text-ink/70 md:col-span-2">
                {w.date}
              </span>

              {/* read time + arrow */}
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

      <motion.div
        className="mt-8 flex flex-wrap items-center justify-between gap-4 px-2"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: DUR.base, ease: EASE_OUT_EXPO, delay: 0.2 }}
      >
        <p className="font-mono text-[10px] tracking-[0.25em] text-dim/70">
          FULL ARCHIVE ON REQUEST — SOME WRITEUPS WAIT ON DISCLOSURE WINDOWS.
        </p>
        <button
          onClick={() => navigate({ page: "notes" })}
          data-cursor="ARCHIVE"
          className="u-draw font-mono text-[10px] tracking-[0.25em] text-acid transition-colors hover:text-paper"
        >
          OPEN FULL ARCHIVE →
        </button>
      </motion.div>
    </section>
  );
}
