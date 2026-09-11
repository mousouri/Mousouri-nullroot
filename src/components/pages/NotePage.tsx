"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { Writeup } from "@/lib/data";
import { EASE_OUT_EXPO, DUR } from "@/lib/motion";
import { snapTop } from "@/lib/transition";
import { ProjectImage } from "@/components/work/ProjectImage";

/* ============================================================
   NotePage — ~/notes/id — the reader. Paper palette, huge
   display title, meta strip, cover image with a clip reveal,
   then numbered sections in printed-output style. Code blocks
   are inverted islands (ink on paper) with an acid spine.
   ============================================================ */

export function NotePage({
  writeup,
  allWriteups,
  onOpen,
}: {
  writeup: Writeup;
  allWriteups: Writeup[];
  onOpen: (w: Writeup) => void;
}) {
  const idx = allWriteups.findIndex((w) => w.id === writeup.id);
  const next = allWriteups[(idx + 1) % allWriteups.length];
  const rootRef = useRef<HTMLElement>(null);

  // NEXT_FILE swaps content in place — snap the document back to the top
  useEffect(() => {
    snapTop();
  }, [writeup.id]);

  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 22 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: DUR.base, ease: EASE_OUT_EXPO, delay },
  });

  return (
    <motion.article
      ref={rootRef}
      key={writeup.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
      className="px-4 pb-16 pt-8 md:px-8 md:pt-12"
    >
      {/* title block */}
      <motion.header {...rise(0.2)}>
        <p className="font-mono text-[10px] tracking-[0.3em] text-ink/60">
          {writeup.index} — {writeup.tag} — {writeup.date} — {writeup.readTime}
        </p>
        <h1 className="mt-3 max-w-5xl font-display text-4xl leading-[0.95] tracking-wide text-ink md:text-6xl">
          {writeup.title}
        </h1>
      </motion.header>

      {/* cover */}
      {writeup.image && (
        <div className="mt-8 border border-ink/25 md:mt-10">
          <div className="aspect-[16/9] w-full md:aspect-[21/9]">
            <ProjectImage
              src={writeup.image}
              alt={writeup.imageAlt ?? writeup.title}
              priority
              sizes="(max-width: 767px) 100vw, 90vw"
              reveal
            />
          </div>
        </div>
      )}

      {/* body sections */}
      <div className="mx-auto mt-12 max-w-3xl">
        {writeup.sections.map((s, i) => (
          <motion.section key={s.heading} {...rise(0.3 + i * 0.06)} className="mb-12 last:mb-0">
            <p className="mb-4 flex items-center gap-3 font-mono text-[10px] tracking-[0.3em] text-ink/60">
              <span className="text-ink">{String(i + 1).padStart(2, "0")}</span>
              <span className="h-px w-8 bg-ink/40" />
              {s.heading.replace(/^\d+\s*—\s*/, "")}
            </p>

            {s.paragraphs.map((p, j) => (
              <p
                key={j}
                className="mb-5 max-w-prose font-body text-base leading-relaxed text-ink/85 last:mb-0"
              >
                {p}
              </p>
            ))}

            {s.code && (
              <div className="mt-6 border border-ink/30">
                <div className="flex items-center justify-between border-b border-ink/20 bg-ink px-3 py-1.5">
                  <span className="font-mono text-[9px] tracking-[0.3em] text-paper/70">
                    {s.code.lang.toUpperCase()} — EXCERPT
                  </span>
                  <span className="flex gap-1.5">
                    <span className="h-1.5 w-1.5 border border-paper/40" />
                    <span className="h-1.5 w-1.5 bg-acid" />
                  </span>
                </div>
                <pre className="overflow-x-auto bg-ink p-4 font-mono text-[11px] leading-relaxed text-paper/90 md:text-xs">
                  <code>{s.code.content}</code>
                </pre>
              </div>
            )}
          </motion.section>
        ))}

        {/* EOF marker styled as terminal output, not a sign-off */}
        <div className="mt-14 border-t border-ink/20 pt-4 font-mono text-[10px] tracking-[0.3em] text-ink/50">
          <span className="text-ink">root@mousouri:~$</span> cat {writeup.id}.md | wc -l — EOF
        </div>
      </div>

      {/* next note */}
      <motion.button
        {...rise(0.5)}
        onClick={() => onOpen(next)}
        data-cursor="NEXT"
        className="group mx-auto mt-12 flex w-full max-w-3xl items-center justify-between border border-ink/30 p-5 text-left transition-colors duration-200 hover:bg-ink hover:text-paper md:p-6"
      >
        <span className="font-mono text-[10px] tracking-[0.3em] text-ink/60 group-hover:text-paper/60">
          NEXT_FILE — {next.index}
        </span>
        <span className="max-w-[60%] truncate font-body text-lg group-hover:text-paper md:text-xl">
          {next.title}
        </span>
        <span className="font-mono text-lg text-ink group-hover:text-acid">→</span>
      </motion.button>
    </motion.article>
  );
}
