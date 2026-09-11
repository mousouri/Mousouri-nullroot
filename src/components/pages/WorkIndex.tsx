"use client";

import { motion } from "framer-motion";
import type { Project } from "@/lib/data";
import { EASE_OUT_EXPO, DUR, crossfade } from "@/lib/motion";
import { useEnvironment } from "@/hooks/use-environment";
import { ProjectImage } from "@/components/work/ProjectImage";
import { ProjectVisual } from "@/components/work/ProjectVisual";

/* ============================================================
   ~/work — full archive index. Every case file with its photo
   cover. Rows stagger in with uneven delays; hover decodes the
   photo and slides the accent metadata rail in.
   ============================================================ */

export function WorkIndex({
  projects,
  onOpen,
}: {
  projects: Project[];
  onOpen: (p: Project) => void;
}) {
  const { reducedMotion } = useEnvironment();
  const rise = reducedMotion ? crossfade : undefined;

  return (
    <div className="px-4 pb-24 pt-10 md:px-8 md:pt-14">
      {/* masthead */}
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
          WORK
          <span className="text-stroke-acid">_INDEX</span>
        </h1>
        <p className="mb-2 font-mono text-[10px] tracking-[0.3em] text-dim">
          {projects.length} FILES INDEXED — 2024→NOW — DSM, TZ
          <br />
          <span className="text-acid">SORT=IMPACT — FULL ARCHIVE</span>
        </p>
      </motion.div>

      {/* rows */}
      <div className="mt-12">
        {projects.map((p, i) => (
          <motion.button
            key={p.id}
            onClick={() => onOpen(p)}
            data-cursor="OPEN"
            className="group relative block w-full border-t border-line text-left last:border-b"
            initial={rise ? "hidden" : { opacity: 0, y: 44, clipPath: "inset(0 0 8% 0)" }}
            whileInView={
              rise ? "show" : { opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)" }
            }
            viewport={{ once: true, margin: "-6% 0px" }}
            variants={
              rise
                ? rise
                : undefined
            }
            transition={
              rise
                ? undefined
                : { duration: DUR.slow, ease: EASE_OUT_EXPO, delay: (i % 3) * 0.08 }
            }
            aria-label={`Open case file ${p.index}: ${p.title}`}
          >
            <div className="grid grid-cols-12 gap-x-4 gap-y-3 px-2 py-6 transition-colors duration-150 group-hover:bg-paper/[0.02] md:px-4 md:py-8">
              {/* index + year */}
              <div className="col-span-4 flex items-start gap-3 md:col-span-2">
                <span className="font-mono text-[11px] tracking-widest text-acid">
                  {p.index}
                </span>
                <span className="font-mono text-[10px] tracking-widest text-dim">
                  {p.year}
                </span>
              </div>

              {/* cover — decodes on hover */}
              <div className="col-span-8 aspect-[16/9] w-full overflow-hidden border border-line md:col-span-5 md:aspect-[4/3]">
                <div className="h-full w-full transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.03]">
                  {p.image ? (
                    <ProjectImage
                      src={p.image}
                      alt={p.imageAlt ?? p.title}
                      kind={p.visual}
                      sizes="(max-width: 767px) 90vw, 40vw"
                    />
                  ) : (
                    <ProjectVisual kind={p.visual} />
                  )}
                </div>
              </div>

              {/* title + meta */}
              <div className="col-span-12 flex flex-col justify-between md:col-span-5">
                <div>
                  <h2 className="font-display text-3xl tracking-wide text-paper transition-colors duration-200 group-hover:text-acid md:text-5xl">
                    {p.title}
                  </h2>
                  <p className="mt-2 font-mono text-[10px] tracking-[0.25em] text-dim">
                    {p.kind} — {p.role}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between gap-4">
                  <span className="inline-block bg-ink px-2 py-1 font-mono text-[9px] font-bold tracking-[0.2em] text-acid ring-1 ring-acid/40">
                    {p.statusLabel}
                  </span>
                  <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] text-dim transition-colors duration-200 group-hover:text-paper">
                    OPEN_FILE
                    <span className="inline-block text-acid transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:translate-x-1.5">
                      →
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* accent rail — draws along the top edge on hover */}
            <span className="absolute left-0 top-0 h-[2px] w-full origin-left scale-x-0 bg-acid transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-x-100" />
          </motion.button>
        ))}
      </div>

      <p className="mt-8 px-2 font-mono text-[10px] tracking-[0.25em] text-dim/70">
        NDA WORK NOT LISTED — ASK ABOUT THE REDACTED DRAWER.
      </p>
    </div>
  );
}

