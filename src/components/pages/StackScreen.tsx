"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/pages/PageShell";
import { CAPABILITIES, STACK_DETAIL, LEARNING, BULB_IDEAS, CERTS, type BulbIdea } from "@/lib/data";
import { navigate, setPendingSection } from "@/lib/router";
import { playSfx } from "@/lib/sound";
import { useEnvironment } from "@/hooks/use-environment";
import { EASE_OUT_EXPO } from "@/lib/motion";

/* ============================================================
   ~/stack — TECH.ARSENAL. The home page keeps the scan teaser;
   this page is the deep dive: per-domain tool readouts with
   proficiency bars, receipts, the currently-compiling queue,
   and IDEA.BULB — a filament you strike for cross-domain
   project sparks. Everything theme-reactive via CSS vars.
   ============================================================ */

const SPARKS_KEY = "nr-bulb-sparks";

export function StackScreen() {
  const { reducedMotion } = useEnvironment();
  const [lit, setLit] = useState(false);
  const [warming, setWarming] = useState(false);
  const [idea, setIdea] = useState<BulbIdea | null>(null);
  const [sparks, setSparks] = useState(0);
  const lastRef = useRef(-1);
  const timerRef = useRef<number | null>(null);

  // sparks counter persists — the bulb remembers every idea
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        const v = Number(window.localStorage.getItem(SPARKS_KEY) ?? "0");
        if (Number.isFinite(v) && v > 0) setSparks(v);
      } catch {
        /* private mode — counter starts fresh */
      }
    }, 0);
    return () => {
      window.clearTimeout(t);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const strike = useCallback(() => {
    if (warming) return;
    playSfx("click");
    setWarming(true);
    const warmMs = reducedMotion ? 120 : 900;
    timerRef.current = window.setTimeout(() => {
      setWarming(false);
      setLit(true);
      let idx = Math.floor(Math.random() * BULB_IDEAS.length);
      if (idx === lastRef.current) idx = (idx + 1) % BULB_IDEAS.length;
      lastRef.current = idx;
      setIdea(BULB_IDEAS[idx]);
      setSparks((s) => {
        const n = s + 1;
        try {
          window.localStorage.setItem(SPARKS_KEY, String(n));
        } catch {
          /* non-persistent is fine */
        }
        return n;
      });
      playSfx("pickup"); // ascending blip — the idea arrives
    }, warmMs);
  }, [warming, reducedMotion]);

  const toolCount = CAPABILITIES.reduce(
    (n, c) => n + (STACK_DETAIL[c.id]?.tools.length ?? 0),
    0,
  );

  return (
    <PageShell crumb="~/stack — TECH.ARSENAL" backTo={{ page: "home" }} backLabel="HOME">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-10 md:px-8">
        {/* ---------- header ---------- */}
        <p className="font-mono text-[10px] tracking-[0.35em]" style={{ color: "var(--acid)" }}>
          FOUR DOMAINS — DEEP DETAIL — NO VAPORWARE
        </p>
        <h1
          className="mt-2 font-display leading-[0.9] tracking-wide text-paper"
          style={{ fontSize: "clamp(2.6rem, 9vw, 6.5rem)" }}
        >
          THE <span className="text-stroke-acid">STACK</span>
        </h1>
        <p className="mt-4 max-w-[60ch] font-body text-sm leading-relaxed text-paper/75">
          The home page scans the domains. This page is the instrument panel: every tool with a
          proficiency readout and a field note, every claim with a receipt line — plus the
          brainstorming bulb at the bottom, for when the stack needs to collide with itself.
        </p>

        {/* readout strip */}
        <div className="mt-8 grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-4">
          {[
            ["DOMAINS", String(CAPABILITIES.length).padStart(2, "0")],
            ["TOOLS TRACKED", String(toolCount).padStart(2, "0")],
            ["IDEA POOL", String(BULB_IDEAS.length).padStart(2, "0")],
            ["SPARKS STRUCK", String(sparks).padStart(3, "0")],
          ].map(([k, v]) => (
            <div key={k} className="bg-ink p-4">
              <p className="font-mono text-[9px] tracking-[0.3em] text-dim">{k}</p>
              <p className="mt-1 font-display text-3xl text-paper tabular-nums">{v}</p>
            </div>
          ))}
        </div>

        {/* ---------- domain panels ---------- */}
        <div className="mt-10 flex flex-col gap-px border border-line bg-line">
          {CAPABILITIES.map((cap) => {
            const detail = STACK_DETAIL[cap.id];
            if (!detail) return null;
            return (
              <article key={cap.id} className="bg-ink p-5 md:p-9">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <p className="font-mono text-[11px] tracking-wider text-paper md:text-xs">
                    {cap.command}
                  </p>
                  <span className="font-mono text-[10px] tracking-[0.25em] text-dim">
                    [{detail.code}]
                  </span>
                </div>

                <h2 className="mt-4 font-display text-3xl tracking-wide text-paper md:text-4xl">
                  {cap.title}
                </h2>
                <p className="mt-3 max-w-[62ch] font-body text-sm leading-relaxed text-paper/75">
                  {cap.blurb}
                </p>

                {/* tool readouts — level bars wipe in on scroll */}
                <div className="mt-7 grid gap-x-10 gap-y-5 md:grid-cols-2">
                  {detail.tools.map((tool, i) => (
                    <div key={tool.name}>
                      <div className="flex items-baseline justify-between gap-4">
                        <p className="font-mono text-[11px] tracking-[0.15em] text-paper">
                          {tool.name}
                        </p>
                        <p className="font-mono text-[10px] text-dim tabular-nums">
                          {String(tool.level).padStart(3, "0")}%
                        </p>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full bg-line">
                        <motion.div
                          className="h-full"
                          style={{ background: "var(--acid)" }}
                          initial={reducedMotion ? false : { width: 0 }}
                          whileInView={{ width: `${tool.level}%` }}
                          viewport={{ once: true, margin: "-6% 0px" }}
                          transition={{
                            duration: 0.8,
                            ease: EASE_OUT_EXPO,
                            delay: (i % 3) * 0.08,
                          }}
                        />
                      </div>
                      <p className="mt-1 font-mono text-[9px] tracking-[0.12em] text-dim">
                        · {tool.note}
                      </p>
                    </div>
                  ))}
                </div>

                <p
                  className="mt-7 border-l-2 pl-4 font-mono text-[10px] leading-relaxed tracking-[0.12em]"
                  style={{ borderColor: "var(--acid)", color: "var(--acid)" }}
                >
                  {detail.proof}
                </p>
              </article>
            );
          })}
        </div>

        {/* ---------- CERT.WALL ---------- */}
        <section className="mt-10 border border-line bg-ink p-5 md:p-9" aria-label="Certification wall">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="font-mono text-[11px] tracking-wider text-paper">
              root@mousouri:~$ ls /certs --verbose
            </p>
            <span className="font-mono text-[10px] tracking-[0.25em] text-dim">
              [{CERTS.filter((c) => c.status === "HELD").length} HELD · {CERTS.filter((c) => c.status === "IN PROGRESS").length} IN PROGRESS]
            </span>
          </div>
          <h2 className="mt-4 font-display text-3xl tracking-wide text-paper md:text-4xl">
            CERT.WALL
          </h2>
          <p className="mt-3 max-w-[62ch] font-body text-sm leading-relaxed text-paper/75">
            Paper is not proof — but it is a receipt. Each cert on the wall has a ledger id and a
            status; the in-progress ones are public on purpose, so the next writeup can point at
            them and say: done.
          </p>

          <div className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {CERTS.map((c, i) => (
              <motion.div
                key={c.id}
                initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-6% 0px" }}
                transition={{ duration: 0.45, ease: EASE_OUT_EXPO, delay: (i % 3) * 0.07 }}
                className="group bg-ink p-4 transition-colors duration-200 hover:bg-line/40"
                data-cursor="CERT"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-lg leading-tight tracking-wide text-paper md:text-xl">
                    {c.name}
                  </p>
                  <span
                    className="shrink-0 border px-1.5 py-0.5 font-mono text-[8px] tracking-[0.2em]"
                    style={
                      c.status === "HELD"
                        ? { borderColor: "var(--acid)", color: "var(--acid)" }
                        : { borderColor: "var(--dim)", color: "var(--dim)" }
                    }
                  >
                    {c.status}
                  </span>
                </div>
                <p className="mt-1.5 font-mono text-[10px] tracking-[0.12em] text-dim">
                  {c.issuer} · {c.year}
                </p>
                <p className="mt-2 font-mono text-[9px] tracking-[0.25em] text-dim/70">
                  LEDGER {c.id} — VERIFIED BY THE WALL ITSELF
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ---------- IDEA.BULB ---------- */}
        <section className="mt-10 border border-line bg-ink" aria-label="IDEA.BULB brainstorming widget">
          <div className="flex items-center justify-between border-b border-line px-5 py-3 md:px-8">
            <p className="font-mono text-[10px] tracking-[0.25em] text-dim">
              IDEA.BULB — ./brainstorm --init
            </p>
            <p className="font-mono text-[10px] tracking-[0.25em] text-dim tabular-nums">
              SPARKS: <span style={{ color: "var(--acid)" }}>{String(sparks).padStart(3, "0")}</span>
            </p>
          </div>

          <div className="grid items-center gap-8 p-6 md:grid-cols-[auto_1fr] md:gap-12 md:p-10">
            {/* the bulb */}
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={strike}
                data-cursor="STRIKE"
                aria-label="Strike the idea bulb"
                className={`rounded-none p-2 transition-transform duration-150 active:scale-95 ${
                  warming ? "bulb-flicker" : ""
                }`}
              >
                <BulbSvg lit={lit} />
              </button>
              <p className="font-mono text-[9px] tracking-[0.3em] text-dim">
                {warming ? "WARMING UP…" : lit ? "FILAMENT LIVE" : "CLICK TO STRIKE"}
              </p>
            </div>

            {/* the idea output */}
            <div className="min-h-[190px]">
              <AnimatePresence mode="wait">
                {idea ? (
                  <motion.div
                    key={idea.title}
                    initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
                  >
                    <p
                      className="font-mono text-[10px] tracking-[0.35em]"
                      style={{ color: "var(--acid)" }}
                    >
                      SPARK · {idea.tag}
                    </p>
                    <h3 className="mt-2 font-display text-3xl tracking-wide text-paper md:text-4xl">
                      {idea.title}
                    </h3>
                    <p className="mt-3 max-w-[58ch] font-body text-sm leading-relaxed text-paper/75">
                      {idea.body}
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <p className="font-mono text-[10px] tracking-[0.35em] text-dim">
                      NO IDEA LOADED
                    </p>
                    <h3 className="mt-2 font-display text-3xl tracking-wide text-paper/40 md:text-4xl">
                      A COLD FILAMENT
                    </h3>
                    <p className="mt-3 max-w-[58ch] font-body text-sm leading-relaxed text-paper/50">
                      Strike the bulb. It cross-references the four domains above and throws a
                      project spark — security, trading, web and hardware, colliding on purpose.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-6 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={strike}
                  disabled={warming}
                  className="border px-5 py-2.5 font-mono text-[10px] tracking-[0.25em] transition-colors duration-150 disabled:opacity-50"
                  style={{ borderColor: "var(--acid)", color: "var(--acid)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--acid)";
                    e.currentTarget.style.color = "var(--ink)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--acid)";
                  }}
                >
                  {warming ? "· · ·" : lit ? "NEXT IDEA" : "STRIKE THE BULB"}
                </button>
                <p className="font-mono text-[9px] tracking-[0.2em] text-dim">
                  {BULB_IDEAS.length} SPARKS IN THE POOL — ZERO REPEATS IN A ROW
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- currently compiling ---------- */}
        <section className="mt-10 border border-line bg-ink p-5 md:p-9" aria-label="Currently learning">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="font-mono text-[11px] tracking-wider text-paper">
              root@mousouri:~$ make -j4 future
            </p>
            <span className="font-mono text-[10px] tracking-[0.25em] text-dim">[COMPILING]</span>
          </div>
          <h2 className="mt-4 font-display text-3xl tracking-wide text-paper md:text-4xl">
            CURRENTLY COMPILING
          </h2>
          <p className="mt-3 max-w-[62ch] font-body text-sm leading-relaxed text-paper/75">
            The learning queue never hits 100 — that is the point. Each line is in progress, with
            the honest reason it made the queue at all.
          </p>

          <div className="mt-7 grid gap-x-10 gap-y-5 md:grid-cols-2">
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

        {/* ---------- bottom CTA ---------- */}
        <div className="mt-10 grid gap-px border border-line bg-line md:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate({ page: "work" })}
            data-cursor="WORK"
            className="group bg-ink p-7 text-left transition-colors duration-200 hover:bg-acid md:p-9"
          >
            <p className="font-mono text-[10px] tracking-[0.3em] text-dim group-hover:text-ink/70">
              THEORY → PRACTICE
            </p>
            <p className="mt-2 font-display text-2xl tracking-wide text-paper group-hover:text-ink md:text-3xl">
              OPEN THE WORK ↗
            </p>
          </button>
          <button
            type="button"
            onClick={() => {
              setPendingSection("#contact");
              navigate({ page: "home" });
            }}
            data-cursor="CONTACT"
            className="group bg-ink p-7 text-left transition-colors duration-200 hover:bg-acid md:p-9"
          >
            <p className="font-mono text-[10px] tracking-[0.3em] text-dim group-hover:text-ink/70">
              REMOTE SESSIONS WELCOME
            </p>
            <p className="mt-2 font-display text-2xl tracking-wide text-paper group-hover:text-ink md:text-3xl">
              OPEN A CHANNEL ↗
            </p>
          </button>
        </div>
      </div>
    </PageShell>
  );
}

/* ---------- the bulb itself — pure SVG, theme-reactive ---------- */

function BulbSvg({ lit }: { lit: boolean }) {
  return (
    <svg
      viewBox="0 0 140 200"
      className={`h-44 w-32 md:h-56 md:w-40 ${lit ? "bulb-lit" : ""}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="bulbGlow" cx="50%" cy="44%" r="58%">
          <stop offset="0%" stopColor="var(--acid)" stopOpacity="0.55" />
          <stop offset="60%" stopColor="var(--acid)" stopOpacity="0.14" />
          <stop offset="100%" stopColor="var(--acid)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* rays — only when lit */}
      <g
        stroke="var(--acid)"
        strokeWidth="2.5"
        strokeLinecap="round"
        className={lit ? "opacity-90 transition-opacity duration-500" : "opacity-0 transition-opacity duration-300"}
      >
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * Math.PI) / 4 - Math.PI / 2;
          return (
            <line
              key={i}
              x1={70 + Math.cos(a) * 56}
              y1={74 + Math.sin(a) * 56}
              x2={70 + Math.cos(a) * 70}
              y2={74 + Math.sin(a) * 70}
            />
          );
        })}
      </g>

      {/* glass dome */}
      <circle
        cx="70"
        cy="74"
        r="46"
        fill={lit ? "url(#bulbGlow)" : "none"}
        stroke="currentColor"
        strokeWidth="2.5"
        className={lit ? "text-acid" : "text-dim"}
      />

      {/* filament */}
      <path
        d="M52 104 V84 Q52 62 61 62 Q70 62 70 74 Q70 62 79 62 Q88 62 88 84 V104"
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        stroke="currentColor"
        className={lit ? "text-acid" : "text-dim/60"}
      />

      {/* screw base */}
      <g stroke="currentColor" className={lit ? "text-acid" : "text-dim"} strokeWidth="2.5" strokeLinecap="round">
        <line x1="58" y1="118" x2="82" y2="118" />
        <line x1="56" y1="128" x2="84" y2="128" />
        <line x1="56" y1="138" x2="84" y2="138" />
        <line x1="58" y1="148" x2="82" y2="148" />
        <line x1="66" y1="158" x2="74" y2="158" strokeWidth="4" />
      </g>
    </svg>
  );
}
