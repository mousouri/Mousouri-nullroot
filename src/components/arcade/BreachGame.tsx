"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EASE_OUT_EXPO } from "@/lib/motion";
import {
  BREACH_LEVELS,
  breachScore,
  daemonProgress,
  generateBreach,
  readHi,
  writeHi,
} from "@/lib/games";
import type { BreachLevelKey } from "@/lib/games";

/* ============================================================
   BREACH.EXE — grid ICE-cracking. Pick bytes alternating
   column → row; the buffer holds one shot. Daemons are
   guaranteed solvable (generated as subsequences of a real
   solution path — see lib/games.ts), the noise bytes are what
   make it a game instead of a typing exercise.
   ============================================================ */

type Status = "LEVELS" | "RUN" | "WIN" | "FAIL";

interface RunState {
  grid: string[][];
  daemons: { name: string; seq: string[] }[];
  bufferCap: number;
  seconds: number;
}

export function BreachGame() {
  const [level, setLevel] = useState<BreachLevelKey>("STANDARD");
  const [status, setStatus] = useState<Status>("LEVELS");
  const [run, setRun] = useState<RunState | null>(null);
  const [buffer, setBuffer] = useState<string[]>([]);
  const [used, setUsed] = useState<Set<string>>(new Set());
  const [last, setLast] = useState<{ r: number; c: number } | null>(null);
  const [wantCol, setWantCol] = useState(false); // next pick in same column?
  const [timeLeft, setTimeLeft] = useState(0);
  const [failReason, setFailReason] = useState("");
  const [hi, setHi] = useState(0);
  const [record, setRecord] = useState(false);
  const [score, setScore] = useState(0);
  const seedRef = useRef(1);

  useEffect(() => {
    const t = window.setTimeout(() => setHi(readHi("nr-hi-breach")), 0);
    return () => window.clearTimeout(t);
  }, []);

  /* countdown — 100ms ticks, dies with status change */
  useEffect(() => {
    if (status !== "RUN") return;
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 0.1) {
          window.clearInterval(id);
          setFailReason("CLOCK DIED — ICE HELD");
          setStatus("FAIL");
          return 0;
        }
        return Math.max(0, t - 0.1);
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [status]);

  const start = useCallback(
    (lv: BreachLevelKey) => {
      seedRef.current = (Date.now() & 0xffffffff) >>> 0;
      const { grid, daemons, config } = generateBreach(lv, seedRef.current);
      setLevel(lv); // HUD + scoring must track the played level
      setRun({ grid, daemons, bufferCap: config.buffer, seconds: config.seconds });
      setBuffer([]);
      setUsed(new Set());
      setLast(null);
      setWantCol(false);
      setTimeLeft(config.seconds);
      setScore(0);
      setRecord(false);
      setFailReason("");
      setStatus("RUN");
    },
    [],
  );

  const pick = useCallback(
    (r: number, c: number) => {
      if (!run || status !== "RUN") return;
      if (used.has(`${r}-${c}`)) return;
      if (last && (wantCol ? c !== last.c : r !== last.r)) return;

      const nb = [...buffer, run.grid[r][c]];
      const nu = new Set(used);
      nu.add(`${r}-${c}`);

      const allDone = run.daemons.every((d) => daemonProgress(d, nb) === d.seq.length);
      if (allDone) {
        const s = breachScore(level, Math.round(timeLeft));
        const rec = writeHi("nr-hi-breach", s);
        setScore(s);
        setHi(readHi("nr-hi-breach"));
        setRecord(rec);
        setStatus("WIN");
        setBuffer(nb);
        setUsed(nu);
        setLast({ r, c });
        setWantCol(!wantCol);
        return;
      }
      if (nb.length >= run.bufferCap) {
        setFailReason("BUFFER FULL — TRACE COMPLETE");
        setStatus("FAIL");
        setBuffer(nb);
        setUsed(nu);
        setLast({ r, c });
        setWantCol(!wantCol);
        return;
      }

      setBuffer(nb);
      setUsed(nu);
      setLast({ r, c });
      setWantCol(!wantCol);
    },
    [buffer, last, level, run, status, timeLeft, used, wantCol],
  );

  /* selectable cells for the current phase */
  const canPick = useMemo(() => {
    return (r: number, c: number): boolean => {
      if (!run || status !== "RUN") return false;
      if (used.has(`${r}-${c}`)) return false;
      if (!last) return true;
      return wantCol ? c === last.c : r === last.r;
    };
  }, [last, run, status, used, wantCol]);

  if (status === "LEVELS" || !run) {
    return (
      <div className="mx-auto w-full max-w-[560px]">
        <p className="font-mono text-[10px] tracking-[0.3em] text-dim">
          SELECT ICE DENSITY — HI SCORE <span className="text-acid tabular-nums">{hi}</span>
        </p>
        <div className="mt-4 space-y-2">
          {(Object.keys(BREACH_LEVELS) as BreachLevelKey[]).map((lv) => (
            <button
              key={lv}
              onClick={() => start(lv)}
              data-cursor="RUN"
              className="group flex w-full items-center justify-between border border-line bg-ink px-4 py-4 text-left transition-colors duration-150 hover:border-acid hover:bg-acid"
            >
              <span className="font-display text-2xl tracking-wide text-paper group-hover:text-ink">
                {lv}
              </span>
              <span className="font-mono text-[9px] tracking-[0.25em] text-dim group-hover:text-ink/70">
                {BREACH_LEVELS[lv].daemonCount} DAEMONS — BUF {BREACH_LEVELS[lv].buffer} —{" "}
                {BREACH_LEVELS[lv].seconds}S
              </span>
            </button>
          ))}
        </div>
        <p className="mt-4 font-mono text-[10px] leading-relaxed tracking-[0.2em] text-dim/70">
          RULE: FIRST BYTE — ANYWHERE. AFTER THAT THE PICK ALTERNATES COLUMN → ROW. NO CELL
          REUSE. FILL THE BUFFER, CLOSE THE DAEMONS, BEAT THE CLOCK.
        </p>
      </div>
    );
  }

  const timePct = (timeLeft / run.seconds) * 100;

  return (
    <div className="mx-auto w-full max-w-[640px]">
      {/* HUD */}
      <div className="flex items-center justify-between border border-line px-3 py-2 font-mono text-[10px] tracking-[0.25em]">
        <span className="text-dim">
          LVL <span className="text-paper">{level}</span>
        </span>
        <span className="text-dim">
          TIME{" "}
          <span className={`tabular-nums ${timePct < 25 ? "text-acid" : "text-paper"}`}>
            {timeLeft.toFixed(1)}
          </span>
        </span>
        <span className="text-dim">
          HI <span className="text-acid tabular-nums">{hi}</span>
        </span>
      </div>

      {/* timer bar */}
      <div className="mt-2 h-[3px] w-full bg-line">
        <div
          className="h-full bg-acid transition-[width] duration-100 ease-linear"
          style={{ width: `${timePct}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[auto_1fr]">
        {/* grid */}
        <div className="mx-auto grid w-full max-w-[420px] grid-cols-6 gap-1.5">
          {run.grid.map((row, r) =>
            row.map((byte, c) => {
              const active = canPick(r, c);
              const isActiveLine =
                last !== null && (wantCol ? c === last.c : r === last.r);
              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => pick(r, c)}
                  disabled={!active}
                  className={[
                    "aspect-square border font-mono text-xs font-bold transition-all duration-150 md:text-sm",
                    active
                      ? "border-acid text-acid hover:bg-acid hover:text-ink"
                      : isActiveLine
                        ? "border-line text-dim/60"
                        : "border-line/60 text-dim/40",
                    used.has(`${r}-${c}`) ? "bg-paper/10 text-paper/30 line-through" : "",
                  ].join(" ")}
                  aria-label={`Byte ${byte} at row ${r + 1} column ${c + 1}${active ? ", selectable" : ""}`}
                >
                  {byte}
                </button>
              );
            }),
          )}
        </div>

        {/* buffer + daemons */}
        <div className="space-y-4">
          <div>
            <p className="font-mono text-[9px] tracking-[0.3em] text-dim">BUFFER</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Array.from({ length: run.bufferCap }).map((_, i) => (
                <span
                  key={i}
                  className={`flex h-9 w-9 items-center justify-center border font-mono text-xs font-bold ${
                    buffer[i]
                      ? "border-acid bg-acid text-ink"
                      : "border-line text-dim/50"
                  }`}
                >
                  {buffer[i] ?? "··"}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="font-mono text-[9px] tracking-[0.3em] text-dim">DAEMONS</p>
            <div className="mt-2 space-y-2">
              {run.daemons.map((d) => {
                const prog = daemonProgress(d, buffer);
                const done = prog === d.seq.length;
                return (
                  <div
                    key={d.name}
                    className={`flex items-center justify-between border px-3 py-2 ${
                      done ? "border-acid bg-acid/10" : "border-line"
                    }`}
                  >
                    <span
                      className={`font-mono text-[9px] tracking-[0.25em] ${
                        done ? "text-acid" : "text-dim"
                      }`}
                    >
                      {d.name}
                    </span>
                    <span className="flex gap-1">
                      {d.seq.map((b, i) => (
                        <span
                          key={i}
                          className={`flex h-6 w-6 items-center justify-center font-mono text-[10px] font-bold ${
                            done
                              ? "bg-acid text-ink"
                              : i < prog
                                ? "bg-paper/20 text-paper"
                                : "border border-line text-dim"
                          }`}
                        >
                          {b}
                        </span>
                      ))}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* abort / result overlays */}
      <AnimatePresence>
        {status !== "RUN" && (
          <motion.div
            className="fixed inset-0 z-[130] flex flex-col items-center justify-center bg-ink/90 p-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {status === "WIN" ? (
              <>
                <motion.p
                  className="font-display text-5xl tracking-wide text-acid md:text-7xl"
                  initial={{ letterSpacing: "0.6em", opacity: 0 }}
                  animate={{ letterSpacing: "0.1em", opacity: 1 }}
                  transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
                >
                  ACCESS GRANTED
                </motion.p>
                <p className="mt-4 font-mono text-[11px] tracking-[0.3em] text-dim">
                  SCORE <span className="text-acid">{score}</span>
                  {record && <span className="ml-2 text-acid">— NEW RECORD</span>}
                </p>
              </>
            ) : (
              <>
                <p className="font-display text-4xl tracking-wide text-paper md:text-6xl">
                  TRACE DETECTED
                </p>
                <p className="mt-4 font-mono text-[11px] tracking-[0.3em] text-dim">
                  {failReason} — SCORE <span className="text-paper">0</span>
                </p>
              </>
            )}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => start(level)}
                data-cursor="RUN"
                className="border border-acid px-4 py-2 font-mono text-[11px] tracking-[0.3em] text-acid transition-colors hover:bg-acid hover:text-ink"
              >
                [ RUN AGAIN ]
              </button>
              <button
                onClick={() => setStatus("LEVELS")}
                className="border border-line px-4 py-2 font-mono text-[11px] tracking-[0.3em] text-dim transition-colors hover:border-paper hover:text-paper"
              >
                [ CHANGE ICE ]
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setStatus("LEVELS")}
        className="mx-auto mt-4 block border border-line px-3 py-1.5 font-mono text-[10px] tracking-[0.3em] text-dim transition-colors hover:border-paper hover:text-paper"
      >
        [ X — ABORT RUN ]
      </button>
    </div>
  );
}
