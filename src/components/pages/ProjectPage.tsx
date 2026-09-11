"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { EASE_OUT_EXPO, DUR } from "@/lib/motion";
import { snapTop } from "@/lib/transition";
import type { Project } from "@/lib/data";
import { ProjectVisual } from "@/components/work/ProjectVisual";
import { ProjectImage } from "@/components/work/ProjectImage";

// 3D is code-split: three.js only hits the wire when an ascent-type
// case file actually opens. No SSR — WebGL is client-only by nature.
const AscentScene = dynamic(() => import("@/components/work/AscentScene"), {
  ssr: false,
  loading: () => null,
});

/* ============================================================
   ProjectPage — the case file as a real destination (~/work/id).
   Paper palette flip makes it feel physically different from
   the site. The hero box keeps the shared layoutId so opening
   from the home rail still morphs card → hero. Inner content
   is keyed by project id so NEXT_FILE swaps with a clean
   re-reveal instead of a jarring text change.
   ============================================================ */

export function ProjectPage({
  project,
  allProjects,
  onOpen,
}: {
  project: Project;
  allProjects: Project[];
  onOpen: (p: Project) => void;
}) {
  const idx = allProjects.findIndex((p) => p.id === project.id);
  const next = allProjects[(idx + 1) % allProjects.length];
  const rootRef = useRef<HTMLDivElement>(null);

  // NEXT_FILE swaps content in place — snap the document back to the top
  useEffect(() => {
    snapTop();
  }, [project.id]);

  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 22 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: DUR.base, ease: EASE_OUT_EXPO, delay },
  });

  return (
    <motion.div
      ref={rootRef}
      key={project.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
      className="px-4 pb-16 pt-8 md:px-8 md:pt-12"
    >
      {/* title + status */}
      <motion.div {...rise(0.25)} className="flex flex-wrap items-end justify-between gap-4">
        <h1
          className="font-display leading-[0.9] tracking-wide text-ink"
          style={{ fontSize: "clamp(2.6rem, 8vw, 7rem)" }}
        >
          {project.title}
        </h1>
        <span className="mb-2 inline-block bg-ink px-2 py-1 font-mono text-[10px] font-bold tracking-[0.25em] text-acid">
          {project.statusLabel}
        </span>
      </motion.div>

      {/* hero visual — the morph target; photo + generative art, or live 3D */}
      <motion.div {...rise(0.3)} className="mt-8 border border-ink/25 md:mt-10">
        <motion.div
          layoutId={`pv-${project.id}`}
          transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
          className="relative aspect-[16/9] w-full overflow-hidden bg-ink md:aspect-[21/9]"
        >
          {project.has3D ? (
            <AscentScene />
          ) : project.image ? (
            <ProjectImage
              src={project.image}
              alt={project.imageAlt ?? project.title}
              kind={project.visual}
              priority
              sizes="(max-width: 767px) 100vw, 90vw"
            />
          ) : (
            <ProjectVisual kind={project.visual} />
          )}
        </motion.div>
      </motion.div>

      {/* meta table */}
      <motion.dl
        {...rise(0.4)}
        className="mt-8 grid grid-cols-2 gap-px border border-ink/25 bg-ink/25 md:grid-cols-4"
      >
        {[
          ["YEAR", project.year],
          ["ROLE", project.role],
          ["STATUS", project.status],
          ["OUTCOME", project.metric],
        ].map(([k, v]) => (
          <div key={k} className="bg-paper p-4">
            <dt className="font-mono text-[9px] tracking-[0.3em] text-ink/50">{k}</dt>
            <dd className="mt-1.5 font-mono text-xs font-bold tracking-wider text-ink">{v}</dd>
          </div>
        ))}
      </motion.dl>

      {/* narrative — problem / build / outcome */}
      <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7 lg:col-start-1">
          {(
            [
              ["THE PROBLEM", project.problem],
              ["THE BUILD", project.build],
              ["THE OUTCOME", project.outcome],
            ] as const
          ).map(([label, body], i) => (
            <motion.section key={label} {...rise(0.45 + i * 0.08)} className="mb-10 last:mb-0">
              <p className="mb-3 flex items-center gap-3 font-mono text-[10px] tracking-[0.3em] text-ink/60">
                <span className="text-ink">{String(i + 1).padStart(2, "0")}</span>
                <span className="h-px w-8 bg-ink/40" />
                {label}
              </p>
              <p className="max-w-prose font-body text-base leading-relaxed text-ink/85">
                {body}
              </p>
            </motion.section>
          ))}
        </div>

        {/* stack rail */}
        <motion.aside {...rise(0.55)} className="lg:col-span-4 lg:col-start-9">
          <p className="mb-3 font-mono text-[10px] tracking-[0.3em] text-ink/60">STACK MANIFEST</p>
          <ul className="flex flex-wrap gap-2">
            {project.stack.map((s) => (
              <li
                key={s}
                className="border border-ink/40 px-2.5 py-1 font-mono text-[10px] tracking-wider text-ink"
              >
                {s}
              </li>
            ))}
          </ul>
          <div className="mt-6 border border-ink/25 p-4">
            <p className="font-mono text-[9px] leading-relaxed tracking-wider text-ink/60">
              THIS FILE IS A PLACEHOLDER CASE STUDY. METRICS AND ENTITIES ARE
              REPRESENTATIVE — SWAP lib/data.ts FOR REAL PAYLOADS.
            </p>
          </div>

          {/* gallery strip — the cover art and photo side by side */}
          {project.image && (
            <div className="mt-6 border border-ink/25">
              <p className="border-b border-ink/20 px-3 py-2 font-mono text-[9px] tracking-[0.3em] text-ink/60">
                EXHIBIT_A — RAW FEED
              </p>
              <div className="aspect-square w-full">
                <ProjectImage
                  src={project.image}
                  alt={project.imageAlt ?? project.title}
                  sizes="(max-width: 1023px) 100vw, 30vw"
                />
              </div>
            </div>
          )}
        </motion.aside>
      </div>

      {/* next file */}
      <motion.button
        {...rise(0.6)}
        onClick={() => onOpen(next)}
        data-cursor="NEXT"
        className="group mt-16 flex w-full items-center justify-between border border-ink/30 p-5 text-left transition-colors duration-200 hover:bg-ink hover:text-paper md:p-7"
      >
        <span className="font-mono text-[10px] tracking-[0.3em] text-ink/60 group-hover:text-paper/60">
          NEXT_FILE — {next.index}
        </span>
        <span className="font-display text-2xl tracking-wide md:text-4xl">{next.title}</span>
        <span className="font-mono text-lg text-ink group-hover:text-acid">→</span>
      </motion.button>
    </motion.div>
  );
}
