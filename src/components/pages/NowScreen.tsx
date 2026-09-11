"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PageShell } from "@/components/pages/PageShell";
import { NOW, LEARNING, GAMES } from "@/lib/data";
import { navigate } from "@/lib/router";
import { readHi } from "@/lib/games";
import { useTheme, THEME_LABEL } from "@/lib/theme";
import { useEnvironment } from "@/hooks/use-environment";
import { EASE_OUT_EXPO } from "@/lib/motion";

/* ============================================================
   ~/now — the live page. A public answer to "what are you
   actually up to?": what's building, what's compiling, what's
   on the nightstand — plus real machine readouts (local time,
   session uptime, your own best arcade score).
   Inspired by nownownow.com — the page every serious operator
   keeps honest.
   ============================================================ */

const BOOT_T = Date.now();

function useUptime(): string {
  const [t, setT] = useState("00:00");
  useEffect(() => {
    const tick = () => {
      const s = Math.max(0, Math.floor((Date.now() - BOOT_T) / 1000));
      setT(`${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return t;
}

function useLocalTime(): string {
  const [t, setT] = useState("--:--:--");
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const tick = () => setT(fmt.format(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return t;
}

export function NowScreen() {
  const up = useUptime();
  const clock = useLocalTime();
  const theme = useTheme();
  const { reducedMotion } = useEnvironment();

  // your best arcade bank — read client-side only (localStorage)
  const [best, setBest] = useState<{ name: string; score: number } | null>(null);
  useEffect(() => {
    const t = window.setTimeout(() => {
      let top: { name: string; score: number } | null = null;
      for (const g of GAMES) {
        const s = readHi(g.hiKey);
        if (s > (top?.score ?? 0)) top = { name: g.file, score: s };
      }
      setBest(top);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <PageShell crumb="~/now — THE LIVE PAGE" backTo={{ page: "home" }} backLabel="HOME">
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-10 md:px-8">
        {/* ---------- header ---------- */}
        <p className="font-mono text-[10px] tracking-[0.35em]" style={{ color: "var(--acid)" }}>
          WHAT THE MACHINE IS ON — UPDATED WHEN IT ISN&apos;T
        </p>
        <h1
          className="mt-2 font-display leading-[0.9] tracking-wide text-paper"
          style={{ fontSize: "clamp(2.6rem, 9vw, 6.5rem)" }}
        >
          RIGHT <span className="text-stroke-acid">NOW</span>
        </h1>
        <p className="mt-4 max-w-[62ch] font-body text-sm leading-relaxed text-paper/75">
          Portfolios freeze. This page doesn&apos;t. It answers the question recruiters,
          collaborators and curious terminal people actually have: what are you building,
          learning and reading this month — with the receipts attached.
        </p>

        {/* ---------- live readout strip ---------- */}
        <div className="mt-8 grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-4">
          {[
            ["LOCAL TIME", clock],
            ["SESSION UPTIME", up],
            ["WEARING", THEME_LABEL[theme]],
            ["YOUR TOP BANK", best ? `${best.score}` : "—"],
          ].map(([k, v]) => (
            <div key={k} className="bg-ink p-4">
              <p className="font-mono text-[9px] tracking-[0.3em] text-dim">{k}</p>
              <p className="mt-1 truncate font-display text-2xl text-paper tabular-nums md:text-3xl">
                {v}
              </p>
              {k === "YOUR TOP BANK" && best && (
                <p className="mt-0.5 truncate font-mono text-[9px] tracking-[0.15em] text-dim">
                  {best.name}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* ---------- building ---------- */}
        <section className="mt-10 border border-line bg-ink p-5 md:p-9" aria-label="Currently building">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="font-mono text-[11px] tracking-wider text-paper">
              root@mousouri:~$ ps aux | grep BUILDING
            </p>
            <span className="font-mono text-[10px] tracking-[0.25em] text-dim">[2 PROCESSES]</span>
          </div>
          <h2 className="mt-4 font-display text-3xl tracking-wide text-paper md:text-4xl">
            ON THE BENCH
          </h2>
          <div className="mt-5 flex flex-col gap-4">
            {NOW.building.map((b, i) => (
              <div key={i} className="border-l-2 pl-4" style={{ borderColor: "var(--acid)" }}>
                <p className="font-mono text-[10px] tracking-[0.3em]" style={{ color: "var(--acid)" }}>
                  PID {String(1000 + i * 137)}
                </p>
                <p className="mt-1 font-body text-sm leading-relaxed text-paper/85">{b}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- compiling (shared LEARNING queue) ---------- */}
        <section className="mt-6 border border-line bg-ink p-5 md:p-9" aria-label="Currently learning">
          <p className="font-mono text-[11px] tracking-wider text-paper">
            root@mousouri:~$ make -j4 future
          </p>
          <h2 className="mt-4 font-display text-3xl tracking-wide text-paper md:text-4xl">
            COMPILING
          </h2>
          <div className="mt-5 grid gap-x-10 gap-y-5 md:grid-cols-2">
            {LEARNING.map((l, i) => (
              <div key={l.what}>
                <div className="flex items-baseline justify-between gap-4">
                  <p className="font-mono text-[11px] tracking-[0.15em] text-paper">{l.what}</p>
                  <p className="font-mono text-[10px] text-dim tabular-nums">
                    {String(l.pct).padStart(3, "0")}%
                  </p>
                </div>
                <div className="mt-1.5 h-1.5 w-full bg-line">
                  <motion.div
                    className="h-full"
                    style={{ background: "var(--acid)" }}
                    initial={reducedMotion ? false : { width: 0 }}
                    whileInView={{ width: `${l.pct}%` }}
                    viewport={{ once: true, margin: "-6% 0px" }}
                    transition={{ duration: 0.8, ease: EASE_OUT_EXPO, delay: (i % 3) * 0.08 }}
                  />
                </div>
                <p className="mt-1 font-mono text-[9px] tracking-[0.12em] text-dim">· {l.why}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- reading ---------- */}
        <section className="mt-6 border border-line bg-ink p-5 md:p-9" aria-label="Reading list">
          <p className="font-mono text-[11px] tracking-wider text-paper">
            root@mousouri:~$ cat ~/reading/queue.txt
          </p>
          <h2 className="mt-4 font-display text-3xl tracking-wide text-paper md:text-4xl">
            ON THE NIGHTSTAND
          </h2>
          <div className="mt-5 flex flex-col divide-y divide-line border border-line">
            {NOW.reading.map((r) => (
              <div key={r.what} className="flex flex-col gap-1 bg-ink px-4 py-3 md:flex-row md:items-baseline md:justify-between">
                <p className="font-mono text-[11px] tracking-[0.15em] text-paper">{r.what}</p>
                <p className="font-mono text-[10px] tracking-[0.1em] text-dim">{r.meta}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 border-l-2 pl-4 font-mono text-[10px] leading-relaxed tracking-[0.12em] text-dim"
            style={{ borderColor: "var(--acid)" }}
          >
            FOCUS LINE — {NOW.focus}
          </p>
        </section>

        {/* ---------- bottom CTA ---------- */}
        <div className="mt-10 grid gap-px border border-line bg-line md:grid-cols-3">
          <button
            type="button"
            onClick={() => navigate({ page: "stack" })}
            data-cursor="STACK"
            className="group bg-ink p-6 text-left transition-colors duration-200 hover:bg-acid md:p-7"
          >
            <p className="font-mono text-[10px] tracking-[0.3em] text-dim group-hover:text-ink/70">
              THE TOOLS BEHIND THE PROCESS
            </p>
            <p className="mt-2 font-display text-xl tracking-wide text-paper group-hover:text-ink md:text-2xl">
              OPEN THE STACK ↗
            </p>
          </button>
          <button
            type="button"
            onClick={() => navigate({ page: "timeline" })}
            data-cursor="LOG"
            className="group bg-ink p-6 text-left transition-colors duration-200 hover:bg-acid md:p-7"
          >
            <p className="font-mono text-[10px] tracking-[0.3em] text-dim group-hover:text-ink/70">
              HOW IT GOT HERE
            </p>
            <p className="mt-2 font-display text-xl tracking-wide text-paper group-hover:text-ink md:text-2xl">
              READ THE LOG ↗
            </p>
          </button>
          <button
            type="button"
            onClick={() => navigate({ page: "arcade" })}
            data-cursor="ARCADE"
            className="group bg-ink p-6 text-left transition-colors duration-200 hover:bg-acid md:p-7"
          >
            <p className="font-mono text-[10px] tracking-[0.3em] text-dim group-hover:text-ink/70">
              PROCRASTINATION, ENGINEERED
            </p>
            <p className="mt-2 font-display text-xl tracking-wide text-paper group-hover:text-ink md:text-2xl">
              ENTER THE ARCADE ↗
            </p>
          </button>
        </div>
      </div>
    </PageShell>
  );
}
