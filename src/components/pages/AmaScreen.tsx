"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PageShell } from "@/components/pages/PageShell";
import { AMA_ANSWERS, AMA_LIMIT } from "@/lib/data";
import { trackAma } from "@/lib/achievements";
import { playSfx } from "@/lib/sound";
import { useEnvironment } from "@/hooks/use-environment";
import { EASE_OUT_EXPO } from "@/lib/motion";

/* ============================================================
   ~/ama — ASK.BOX. A deterministic oracle: the same question
   always hashes to the same answer. No server, no API, no
   telemetry — the log lives in your localStorage and nowhere
   else. Think of it as `fortune(1)` with opinions.
   ============================================================ */

const LOG_KEY = "nr-ama-log";

interface AmaEntry {
  q: string;
  a: string;
  ts: number;
}

function hashQuestion(q: string): number {
  return [...q.toLowerCase()].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
}

function readLog(): AmaEntry[] {
  try {
    const raw = window.localStorage.getItem(LOG_KEY);
    const arr = raw ? (JSON.parse(raw) as AmaEntry[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeLog(entries: AmaEntry[]) {
  try {
    window.localStorage.setItem(LOG_KEY, JSON.stringify(entries.slice(0, AMA_LIMIT)));
  } catch {
    /* private mode — the wall just doesn't persist */
  }
}

export function AmaScreen() {
  const { reducedMotion } = useEnvironment();
  const [q, setQ] = useState("");
  const [pending, setPending] = useState(false);
  const [latest, setLatest] = useState<AmaEntry | null>(null);
  const [log, setLog] = useState<AmaEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setLog(readLog()), 0);
    return () => window.clearTimeout(t);
  }, []);

  const transmit = useCallback(() => {
    const question = q.trim();
    if (!question || pending) return;
    setPending(true);
    playSfx("click");

    // small theatrical delay — the oracle is "thinking"
    window.setTimeout(() => {
      const a = AMA_ANSWERS[hashQuestion(question) % AMA_ANSWERS.length];
      const entry: AmaEntry = { q: question.slice(0, 160), a, ts: Date.now() };
      const next = [entry, ...readLog()];
      writeLog(next);
      setLog(next.slice(0, AMA_LIMIT));
      setLatest(entry);
      setQ("");
      setPending(false);
      playSfx("pickup");
      trackAma();
    }, reducedMotion ? 120 : 700);
  }, [q, pending, reducedMotion]);

  const clearLog = useCallback(() => {
    writeLog([]);
    setLog([]);
    setLatest(null);
    playSfx("err");
  }, []);

  return (
    <PageShell crumb="~/ama — THE ORACLE" backTo={{ page: "home" }} backLabel="HOME">
      <div className="mx-auto max-w-4xl px-4 pb-24 pt-10 md:px-8">
        {/* ---------- header ---------- */}
        <p className="font-mono text-[10px] tracking-[0.35em]" style={{ color: "var(--acid)" }}>
          DETERMINISTIC — SERVERLESS — SAME QUESTION, SAME ANSWER
        </p>
        <h1
          className="mt-2 font-display leading-[0.9] tracking-wide text-paper"
          style={{ fontSize: "clamp(2.6rem, 9vw, 6.5rem)" }}
        >
          ASK.<span className="text-stroke-acid">BOX</span>
        </h1>
        <p className="mt-4 max-w-[62ch] font-body text-sm leading-relaxed text-paper/75">
          A question box for the curious. There is no backend: your question is hashed, the hash
          indexes a pool of hard-earned opinions, and the log lives in your browser only. Ask
          about security, trading, embedded, career — the oracle does not do small talk.
        </p>

        {/* ---------- the box ---------- */}
        <section className="mt-8 border border-line bg-ink" aria-label="Ask the oracle">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <p className="font-mono text-[10px] tracking-[0.25em] text-dim">
              ORACLE v1.0 — /dev/question
            </p>
            <p className="font-mono text-[10px] tracking-[0.25em] text-dim tabular-nums">
              ANSWERED: <span style={{ color: "var(--acid)" }}>{String(log.length).padStart(2, "0")}</span>
            </p>
          </div>

          <div className="p-5 md:p-8">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                transmit();
              }}
              className="flex flex-col gap-3 md:flex-row"
            >
              <div className="flex flex-1 items-center gap-2 border border-line bg-ink px-3 focus-within:border-paper">
                <span className="font-mono text-[11px]" style={{ color: "var(--acid)" }}>
                  &gt;
                </span>
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  maxLength={160}
                  placeholder="type your question…"
                  className="w-full bg-transparent py-3 font-mono text-[12px] tracking-[0.08em] text-paper outline-none placeholder:text-dim/60"
                  aria-label="Your question"
                />
              </div>
              <button
                type="submit"
                disabled={pending || !q.trim()}
                data-cursor="SEND"
                className="border px-6 py-3 font-mono text-[11px] tracking-[0.3em] transition-colors duration-150 disabled:opacity-40"
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
                {pending ? "CONSULTING…" : "TRANSMIT →"}
              </button>
            </form>

            {/* latest answer */}
            <div className="mt-6 min-h-[120px] border border-line bg-ink p-4">
              <AnimatePresence mode="wait">
                {latest ? (
                  <motion.div
                    key={latest.ts}
                    initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
                  >
                    <p className="font-mono text-[11px] tracking-[0.12em] text-paper">
                      &gt; {latest.q}
                    </p>
                    <p
                      className="mt-3 border-l-2 pl-4 font-mono text-[12px] leading-relaxed tracking-[0.06em]"
                      style={{ borderColor: "var(--acid)", color: "var(--acid)" }}
                    >
                      {latest.a}
                    </p>
                    <p className="mt-3 font-mono text-[9px] tracking-[0.25em] text-dim">
                      ORACLE #{String(hashQuestion(latest.q) % AMA_ANSWERS.length + 1).padStart(2, "0")}/
                      {AMA_ANSWERS.length} · {new Date(latest.ts).toLocaleTimeString()}
                    </p>
                  </motion.div>
                ) : (
                  <motion.p
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-mono text-[11px] tracking-[0.2em] text-dim"
                  >
                    AWAITING TRANSMISSION — the oracle answers in caps and in full.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* ---------- the wall ---------- */}
        {log.length > 0 && (
          <section className="mt-6 border border-line bg-ink p-5 md:p-8" aria-label="Question log">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-mono text-[11px] tracking-wider text-paper">
                cat /var/log/questions.log
              </p>
              <button
                type="button"
                onClick={clearLog}
                data-cursor="WIPE"
                className="border border-line px-2 py-1 font-mono text-[9px] tracking-[0.25em] text-dim transition-colors hover:border-paper hover:text-paper"
              >
                [ CLEAR.LOG ]
              </button>
            </div>
            <div className="mt-4 flex max-h-[420px] flex-col gap-3 overflow-y-auto pr-1">
              {log.map((e) => (
                <div key={e.ts} className="border border-line bg-ink px-4 py-3">
                  <p className="font-mono text-[10px] tracking-[0.1em] text-paper">&gt; {e.q}</p>
                  <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-dim">{e.a}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 font-mono text-[9px] tracking-[0.2em] text-dim">
              LOG CAP {AMA_LIMIT} — STORED IN YOUR BROWSER (nr-ama-log), NEVER UPLOADED.
            </p>
          </section>
        )}

        {/* terminal cross-sell */}
        <p className="mt-6 font-mono text-[10px] tracking-[0.2em] text-dim">
          SHORTCUT — the hidden terminal (`) accepts <span style={{ color: "var(--acid)" }}>ask &lt;question&gt;</span> directly.
        </p>
      </div>
    </PageShell>
  );
}
