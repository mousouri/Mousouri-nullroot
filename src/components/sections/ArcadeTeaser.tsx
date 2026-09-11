"use client";

import { motion } from "framer-motion";
import { GAMES } from "@/lib/data";
import { EASE_OUT_EXPO, DUR, crossfade, fadeRise } from "@/lib/motion";
import { useEnvironment } from "@/hooks/use-environment";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { navigate } from "@/lib/router";
import { readHi } from "@/lib/games";

/**
 * Arcade teaser — the coin-op wing's storefront. Rows echo the
 * notes acid-flip language; each row boots straight into its
 * cabinet (#/arcade/{id}).
 */
export function ArcadeTeaser() {
  const { reducedMotion } = useEnvironment();
  const row = reducedMotion ? crossfade : fadeRise;

  return (
    <section id="arcade" className="relative px-4 py-24 md:px-8 md:py-36">
      <SectionHeading index="05" title="ARCADE" meta="~/arcade — 3 cabinets online" />

      <div className="mt-14 md:mt-20">
        {GAMES.map((g, i) => {
          const hi = readHi(g.hiKey);
          return (
            <motion.button
              key={g.id}
              onClick={() => navigate({ page: "arcade", game: g.id })}
              data-cursor="INSERT"
              className="group relative block w-full border-t border-line text-left last:border-b"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-8% 0px" }}
              custom={i}
              variants={row}
              aria-label={`Play ${g.title}`}
            >
              <div className="relative grid grid-cols-12 items-baseline gap-x-4 gap-y-2 px-2 py-6 transition-colors duration-150 group-hover:bg-acid md:px-4 md:py-7">
                <span className="col-span-2 font-mono text-[11px] tracking-widest text-acid transition-colors duration-150 group-hover:text-ink md:col-span-1">
                  {String(i + 1).padStart(2, "0")}
                </span>

                <h3 className="col-span-10 font-display text-3xl tracking-wide text-paper transition-colors duration-150 group-hover:text-ink md:col-span-5 md:text-5xl">
                  <ScrambleText text={g.file} retrigger reduced={reducedMotion} />
                </h3>

                <span className="col-span-4 font-mono text-[10px] tracking-widest text-dim transition-colors duration-150 group-hover:text-ink/70 md:col-span-2">
                  {g.kind}
                </span>

                <span className="col-span-8 font-mono text-[10px] tracking-widest text-dim transition-colors duration-150 group-hover:text-ink/70 md:col-span-3">
                  {hi > 0 ? `HI ${hi} ${g.hiUnit}` : "NO SCORE ON RECORD"}
                </span>

                <span className="col-span-12 flex items-baseline justify-end gap-3 font-mono text-[10px] tracking-widest text-dim transition-colors duration-150 group-hover:text-ink md:col-span-1">
                  <span className="inline-block text-acid transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:translate-x-1.5 group-hover:text-ink">
                    →
                  </span>
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      <motion.p
        className="mt-8 px-2 font-mono text-[10px] leading-relaxed tracking-[0.25em] text-dim/70"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: DUR.base, ease: EASE_OUT_EXPO, delay: 0.2 }}
      >
        SIDE PROJECTS THAT TAUGHT ME CANVAS, GAME LOOPS, AND STATE MACHINES —
        SCORES LIVE IN YOUR BROWSER, PRIDE LIVES IN THE HALL OF FAME.
      </motion.p>
    </section>
  );
}
