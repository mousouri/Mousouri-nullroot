"use client";

import { motion } from "framer-motion";
import { PageShell } from "@/components/pages/PageShell";
import { TIMELINE } from "@/lib/data";
import { useEnvironment } from "@/hooks/use-environment";
import { EASE_OUT_EXPO } from "@/lib/motion";

/* ============================================================
   ~/timeline — the whole log, oldest first. 2019's blinking
   LED to this year's offsec grind, one rail, no myth-making.
   Every entry earned its tag the hard way.
   ============================================================ */

export function TimelineScreen() {
  const { reducedMotion } = useEnvironment();

  return (
    <PageShell crumb="~/timeline — THE WHOLE LOG" backTo={{ page: "home" }} backLabel="HOME">
      <div className="mx-auto max-w-4xl px-4 pb-24 pt-10 md:px-8">
        {/* ---------- header ---------- */}
        <p className="font-mono text-[10px] tracking-[0.35em]" style={{ color: "var(--acid)" }}>
          GIT LOG --ALL --ONline — A CAREER IN {TIMELINE.length} COMMITS
        </p>
        <h1
          className="mt-2 font-display leading-[0.9] tracking-wide text-paper"
          style={{ fontSize: "clamp(2.6rem, 9vw, 6.5rem)" }}
        >
          THE <span className="text-stroke-acid">LOG</span>
        </h1>
        <p className="mt-4 max-w-[62ch] font-body text-sm leading-relaxed text-paper/75">
          No &ldquo;passionate self-starter&rdquo; prose. Just the commit history: what shipped,
          what broke, what the lesson cost. Oldest first — scroll it like a terminal backlog.
        </p>

        {/* ---------- the rail ---------- */}
        <div className="relative mt-12">
          {/* the line itself */}
          <div
            className="absolute top-0 bottom-0 left-[7px] w-px md:left-[calc(9rem+8px)]"
            style={{ background: "var(--acid)", opacity: 0.55 }}
            aria-hidden
          />

          <div className="flex flex-col gap-10 md:gap-14">
            {TIMELINE.map((e, i) => (
              <motion.article
                key={`${e.year}-${e.tag}`}
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -18 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-8% 0px" }}
                transition={{ duration: 0.55, ease: EASE_OUT_EXPO, delay: 0.04 }}
                className="relative grid gap-2 pl-8 md:grid-cols-[9rem_1fr] md:gap-8 md:pl-0"
              >
                {/* node */}
                <span
                  className="absolute top-1.5 left-0 h-[15px] w-[15px] border-2 md:left-[calc(9rem+1px)] md:-translate-x-[7px]"
                  style={{ borderColor: "var(--acid)", background: "#0a0a0a" }}
                  aria-hidden
                />

                {/* year + tag */}
                <div className="md:text-right">
                  <p className="font-display text-3xl leading-none text-paper tabular-nums md:text-4xl">
                    {e.year}
                  </p>
                  <p className="mt-1 font-mono text-[10px] tracking-[0.3em]" style={{ color: "var(--acid)" }}>
                    [{e.tag}]
                  </p>
                </div>

                {/* body */}
                <div className="border border-line bg-ink p-4 md:p-6">
                  <h2 className="font-display text-xl tracking-wide text-paper md:text-2xl">
                    {e.title}
                  </h2>
                  <p className="mt-2 font-body text-sm leading-relaxed text-paper/75">{e.body}</p>
                  <p className="mt-3 font-mono text-[9px] tracking-[0.25em] text-dim">
                    commit {String(i + 1).padStart(2, "0")}/{TIMELINE.length} · verified · signed-off
                  </p>
                </div>
              </motion.article>
            ))}
          </div>

          {/* HEAD */}
          <div className="relative mt-12 pl-8 md:pl-0">
            <div className="md:grid md:grid-cols-[9rem_1fr] md:gap-8">
              <p className="font-mono text-[10px] tracking-[0.3em] text-dim md:text-right">
                HEAD → main
              </p>
              <p className="font-mono text-[11px] leading-relaxed tracking-[0.15em]" style={{ color: "var(--acid)" }}>
                the next commit is being written right now — see ~/now for the working tree.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
