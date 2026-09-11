"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readHi, writeHi } from "@/lib/games";
import { playSfx } from "@/lib/sound";

/* ============================================================
   CRYPT.BREAK — mastermind with a hex key. The machine holds a
   four-symbol key built from 4 7 A C E F (no repeats). You have
   eight attempts. After each, the terminal reports FULL matches
   (right symbol, right slot) and PARTIAL matches (right symbol,
   wrong slot). Crack it fast — every unused attempt is bounty.
   ============================================================ */

const SYMBOLS = ["4", "7", "A", "C", "E", "F"] as const;
const KEY_LEN = 4;
const MAX_TRIES = 8;

type Phase = "READY" | "RUN" | "WON" | "LOST";

interface Attempt {
  guess: string[];
  full: number;
  part: number;
}

function feedback(guess: string[], code: string[]): { full: number; part: number } {
  let full = 0;
  const gCount = new Map<string, number>();
  const cCount = new Map<string, number>();
  for (let i = 0; i < KEY_LEN; i++) {
    if (guess[i] === code[i]) full += 1;
    else {
      gCount.set(guess[i], (gCount.get(guess[i]) ?? 0) + 1);
      cCount.set(code[i], (cCount.get(code[i]) ?? 0) + 1);
    }
  }
  let part = 0;
  gCount.forEach((n, sym) => {
    part += Math.min(n, cCount.get(sym) ?? 0);
  });
  return { full, part };
}

function makeCode(): string[] {
  const pool = [...SYMBOLS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, KEY_LEN);
}

export function CryptBreakGame() {
  const [phase, setPhase] = useState<Phase>("READY");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [current, setCurrent] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [hi, setHi] = useState(0);
  const [record, setRecord] = useState(false);
  const [reveal, setReveal] = useState<string[]>([]);
  const code = useRef<string[]>(makeCode());

  /* hi score on mount */
  useEffect(() => {
    const t = window.setTimeout(() => setHi(readHi("nr-hi-cryptbreak")), 0);
    return () => window.clearTimeout(t);
  }, []);

  const start = useCallback(() => {
    code.current = makeCode();
    setAttempts([]);
    setCurrent([]);
    setScore(0);
    setRecord(false);
    setReveal([]);
    setPhase("RUN");
    playSfx("boot");
  }, []);

  const submit = useCallback(
    (guess: string[]) => {
      const { full, part } = feedback(guess, code.current);
      const next = [...attempts, { guess, full, part }];
      setAttempts(next);
      setCurrent([]);
      playSfx(full === KEY_LEN ? "ok" : "key");

      if (full === KEY_LEN) {
        const left = MAX_TRIES - next.length;
        const earned = 500 + left * 250;
        setScore(earned);
        const rec = writeHi("nr-hi-cryptbreak", earned);
        setRecord(rec);
        setHi((h) => (rec ? earned : h));
        setReveal(code.current);
        setPhase("WON");
        return;
      }
      if (next.length >= MAX_TRIES) {
        setReveal(code.current);
        setPhase("LOST");
        playSfx("zap");
      }
    },
    [attempts],
  );

  const push = useCallback(
    (sym: string) => {
      if (phase !== "RUN") return;
      setCurrent((c) => {
        if (c.length >= KEY_LEN) return c;
        const nc = [...c, sym];
        if (nc.length === KEY_LEN) {
          // auto-submit on the fourth symbol — speed is the game
          window.setTimeout(() => submit(nc), 120);
        }
        return nc;
      });
      playSfx("click");
    },
    [phase, submit],
  );

  const back = useCallback(() => {
    if (phase !== "RUN") return;
    setCurrent((c) => c.slice(0, -1));
    playSfx("click");
  }, [phase]);

  /* keyboard: symbol keys, backspace */
  useEffect(() => {
    const editable = (el: EventTarget | null) => {
      const e = el as HTMLElement | null;
      return !!e && (e.tagName === "INPUT" || e.tagName === "TEXTAREA" || !!e.isContentEditable);
    };
    const onKey = (e: KeyboardEvent) => {
      if (editable(e.target)) return;
      const k = e.key.toUpperCase();
      if (phase === "READY" || phase === "WON" || phase === "LOST") {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          start();
        }
        return;
      }
      if ((SYMBOLS as readonly string[]).includes(k)) {
        e.preventDefault();
        push(k);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, push, back, start]);

  const triesLeft = MAX_TRIES - attempts.length;

  return (
    <div className="mx-auto w-full max-w-[560px]">
      {/* HUD */}
      <div className="flex items-center justify-between border border-line bg-ink px-3 py-2 font-mono text-[10px] tracking-[0.25em]">
        <span className="text-dim">
          KEY <span className="text-acid">****</span>
        </span>
        <span className="text-dim">
          TRIES <span className="text-paper tabular-nums">{Math.max(0, triesLeft)}/{MAX_TRIES}</span>
        </span>
        <span className="text-dim">
          HI <span className="text-paper tabular-nums">{hi}</span>
        </span>
      </div>

      <div className="mt-2 border border-line p-4 md:p-6">
        {phase === "READY" && (
          <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
            <p className="font-display text-4xl tracking-wide text-paper md:text-5xl">CRYPT.BREAK</p>
            <p className="mt-3 max-w-[40ch] font-mono text-[10px] leading-relaxed tracking-[0.2em] text-dim">
              A FOUR-SYMBOL HEX KEY. EIGHT ATTEMPTS. FULL = RIGHT
              SYMBOL, RIGHT SLOT. PARTIAL = RIGHT SYMBOL, WRONG SLOT.
              EVERY UNUSED TRY PAYS OUT.
            </p>
            <button
              type="button"
              data-cursor="RUN"
              onClick={start}
              className="mt-6 border border-acid px-4 py-2 font-mono text-[11px] tracking-[0.3em] text-acid transition-colors hover:bg-acid hover:text-ink"
            >
              [ EXECUTE ]
            </button>
          </div>
        )}

        {phase !== "READY" && (
          <div>
            {/* attempt log */}
            <div className="min-h-[240px] space-y-1.5 font-mono text-[11px]">
              {attempts.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border border-line bg-ink px-2 py-1.5"
                >
                  <span className="text-dim">{String(i + 1).padStart(2, "0")}</span>
                  <span className="tracking-[0.4em] text-paper">{a.guess.join(" ")}</span>
                  <span className="flex items-center gap-1.5">
                    {Array.from({ length: a.full }).map((_, k) => (
                      <span key={`f${k}`} className="inline-block h-2.5 w-2.5 bg-acid" />
                    ))}
                    {Array.from({ length: a.part }).map((_, k) => (
                      <span key={`p${k}`} className="inline-block h-2.5 w-2.5 border border-dim" />
                    ))}
                    <span className="ml-1 text-[9px] text-dim">
                      {a.full}F {a.part}P
                    </span>
                  </span>
                </div>
              ))}

              {/* current input row */}
              {phase === "RUN" && (
                <div className="flex items-center justify-between border border-acid px-2 py-1.5">
                  <span className="text-dim">{String(attempts.length + 1).padStart(2, "0")}</span>
                  <span className="tracking-[0.4em]">
                    {Array.from({ length: KEY_LEN }).map((_, i) => (
                      <span key={i} className={current[i] ? "text-acid" : "text-dim/50"}>
                        {current[i] ?? "_"}
                        {i < KEY_LEN - 1 ? " " : ""}
                      </span>
                    ))}
                  </span>
                  <button
                    type="button"
                    data-cursor="DEL"
                    onClick={back}
                    className="border border-line px-1.5 py-0.5 text-[9px] text-dim transition-colors hover:border-paper hover:text-paper"
                  >
                    DEL
                  </button>
                </div>
              )}

              {reveal.length > 0 && (
                <div className="flex items-center justify-between border border-line px-2 py-1.5">
                  <span className="text-dim">KEY</span>
                  <span className="tracking-[0.4em] text-acid">{reveal.join(" ")}</span>
                  <span className="text-[9px] text-dim">LOCKOUT</span>
                </div>
              )}
            </div>

            {/* symbol palette */}
            {phase === "RUN" && (
              <div className="mt-4 grid grid-cols-6 gap-2">
                {SYMBOLS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    data-cursor={s}
                    onClick={() => push(s)}
                    className="border border-line py-2.5 font-mono text-sm text-paper transition-colors hover:border-acid hover:bg-acid hover:text-ink"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {(phase === "WON" || phase === "LOST") && (
              <div className="mt-4 text-center">
                <p className={`font-display text-3xl tracking-wide md:text-4xl ${phase === "WON" ? "text-acid" : "text-paper"}`}>
                  {phase === "WON" ? "KEY CRACKED" : "LOCKOUT"}
                </p>
                <p className="mt-2 font-mono text-[10px] tracking-[0.25em] text-dim">
                  {phase === "WON" ? `KEY ${reveal.join(" ")} — BOUNTY ${score}` : `THE VAULT HELD — KEY WAS ${reveal.join(" ")}`}
                </p>
                <p className="mt-1 font-mono text-[11px] tracking-[0.25em] text-dim">
                  HI <span className="text-paper">{hi}</span>
                  {record && <span className="ml-2 text-acid">NEW RECORD</span>}
                </p>
                <button
                  type="button"
                  data-cursor="RETRY"
                  onClick={start}
                  className="mt-5 border border-acid px-4 py-2 font-mono text-[11px] tracking-[0.3em] text-acid transition-colors hover:bg-acid hover:text-ink"
                >
                  [ NEW KEY ]
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <p className="mt-2 font-mono text-[9px] tracking-[0.3em] text-dim/60">
        CLICK SYMBOLS OR TYPE 4 / 7 / A / C / E / F — BACKSPACE UNDO — 4TH SYMBOL AUTO-COMMITS
      </p>
    </div>
  );
}
