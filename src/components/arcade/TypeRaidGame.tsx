"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { TYPE_PROMPTS, readHi, typeGrade, writeHi } from "@/lib/games";

/* ============================================================
   TTY.RACER — type real command lines against the clock.
   Keystroke accounting is manual (not textarea metrics) so
   accuracy reflects actual keys, not backspace forgiveness.
   Five prompts per run; WPM = (chars/5)/min; grade maps to
   the persona's rank ladder (SCRIPT KIDDIE → ROOT).
   ============================================================ */

const PROMPTS_PER_RUN = 5;

type Status = "IDLE" | "RUN" | "DONE";

interface RunStats {
  wpm: number;
  accuracy: number;
  errors: number;
  grade: string;
}

export function TypeRaidGame() {
  const [status, setStatus] = useState<Status>("IDLE");
  const [promptIdx, setPromptIdx] = useState(0);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [typed, setTyped] = useState("");
  const [keystrokes, setKeystrokes] = useState(0);
  const [errors, setErrors] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [stats, setStats] = useState<RunStats | null>(null);
  const [hi, setHi] = useState(0);
  const [record, setRecord] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setHi(readHi("nr-hi-typeraid")), 0);
    return () => window.clearTimeout(t);
  }, []);

  /* live elapsed clock while running */
  useEffect(() => {
    if (status !== "RUN") return;
    const id = window.setInterval(() => {
      if (startedAt) setElapsed((performance.now() - startedAt) / 1000);
    }, 100);
    return () => window.clearInterval(id);
  }, [startedAt, status]);

  const samplePrompts = useCallback(() => {
    // shuffle a copy, take N — non-repeating within a run
    const pool = [...TYPE_PROMPTS];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, PROMPTS_PER_RUN);
  }, []);

  const start = useCallback(() => {
    setPrompts(samplePrompts());
    setPromptIdx(0);
    setTyped("");
    setKeystrokes(0);
    setErrors(0);
    setStartedAt(null);
    setElapsed(0);
    setStats(null);
    setRecord(false);
    setStatus("RUN");
    window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 80);
  }, [samplePrompts]);

  const finish = useCallback(
    (totalChars: number, totalKeystrokes: number, totalErrors: number, totalMs: number) => {
      const minutes = Math.max(totalMs / 1000 / 60, 1 / 60);
      const wpm = Math.round(totalChars / 5 / minutes);
      const accuracy = totalKeystrokes ? 1 - totalErrors / totalKeystrokes : 1;
      const grade = typeGrade(wpm, accuracy);
      const rec = writeHi("nr-hi-typeraid", wpm);
      setHi(readHi("nr-hi-typeraid"));
      setRecord(rec);
      setStats({ wpm, accuracy: Math.max(0, accuracy), errors: totalErrors, grade });
      setStatus("DONE");
    },
    [],
  );

  const commitLine = useCallback(
    (v?: string) => {
      const target = prompts[promptIdx];
      if (!target) return;
      const typedNow = v ?? typed;
      const chars = typedNow.length;
      const ms = startedAt ? performance.now() - startedAt : 0;

      // penalize uncommitted remainder as errors — brutal, on brand
      let e = errors;
      if (typedNow !== target) e += Math.max(1, target.length - typedNow.length);
      const nextErrors = e;

      if (promptIdx + 1 >= PROMPTS_PER_RUN) {
        const prevChars = prompts.slice(0, promptIdx).reduce((a, p) => a + p.length, 0);
        finish(prevChars + chars, keystrokes + chars, nextErrors, ms);
      } else {
        setPromptIdx((i) => i + 1);
        setTyped("");
        setErrors(nextErrors);
        setStartedAt(performance.now());
        window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 40);
      }
    },
    [errors, finish, keystrokes, promptIdx, prompts, startedAt, typed],
  );

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      const target = prompts[promptIdx] ?? "";
      if (status !== "RUN" || !target) return;
      if (!startedAt) setStartedAt(performance.now());

      // count this change's keystrokes + detect an error keystroke
      const added = v.length > typed.length;
      if (added) {
        setKeystrokes((k) => k + 1);
        const pos = v.length - 1;
        if (v[pos] !== target[pos]) {
          setErrors((n) => n + 1);
          setShake(true);
          window.setTimeout(() => setShake(false), 140);
        }
      }
      setTyped(v);

      // line committed when fully typed — Enter also commits early
      if (v === target) commitLine(v);
    },
    [commitLine, prompts, promptIdx, startedAt, status, typed],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commitLine();
      }
    },
    [commitLine],
  );

  const target = prompts[promptIdx] ?? "";

  const liveWpm = useMemo(() => {
    if (!startedAt || status !== "RUN") return 0;
    const minutes = Math.max(elapsed / 60, 1 / 60);
    return Math.round(typed.length / 5 / minutes);
  }, [elapsed, startedAt, status, typed.length]);

  if (status === "IDLE") {
    return (
      <Shell>
        <p className="font-display text-4xl tracking-wide text-paper md:text-5xl">TTY.RACER</p>
        <p className="mt-3 max-w-md font-mono text-[10px] leading-relaxed tracking-[0.25em] text-dim">
          {PROMPTS_PER_RUN} REAL COMMAND LINES. ACCURACY IS MEASURED PER KEYSTROKE —
          BACKSPACE DOES NOT FORGIVE, IT ONLY AMNESIAS.
        </p>
        <p className="mt-4 font-mono text-[10px] tracking-[0.3em] text-dim">
          HI <span className="text-acid tabular-nums">{hi}</span> WPM
        </p>
        <StartButton onClick={start} />
      </Shell>
    );
  }

  if (status === "DONE" && stats) {
    return (
      <Shell>
        <p className="font-mono text-[10px] tracking-[0.3em] text-dim">RUN COMPLETE — GRADED</p>
        <p className="mt-2 font-display text-6xl tracking-wide text-acid md:text-8xl">
          {stats.wpm}
          <span className="text-2xl text-paper md:text-4xl"> WPM</span>
        </p>
        <p className="mt-4 font-mono text-[11px] tracking-[0.3em] text-dim">
          ACC <span className="text-paper">{(stats.accuracy * 100).toFixed(1)}%</span> — ERR{" "}
          <span className="text-paper">{stats.errors}</span>
        </p>
        <motion.p
          className="mt-6 inline-block border border-acid px-4 py-2 font-mono text-sm font-bold tracking-[0.35em] text-acid"
          initial={{ letterSpacing: "0.6em", opacity: 0 }}
          animate={{ letterSpacing: "0.25em", opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
        >
          {stats.grade}
        </motion.p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <StartButton onClick={start} label="[ RUN AGAIN ]" />
          <button
            onClick={() => setStatus("IDLE")}
            className="border border-line px-4 py-2 font-mono text-[11px] tracking-[0.3em] text-dim transition-colors hover:border-paper hover:text-paper"
          >
            [ EXIT ]
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[720px]">
      {/* HUD */}
      <div className="flex items-center justify-between border border-line px-3 py-2 font-mono text-[10px] tracking-[0.25em]">
        <span className="text-dim">
          LINE <span className="text-paper tabular-nums">{promptIdx + 1}/{PROMPTS_PER_RUN}</span>
        </span>
        <span className="text-dim">
          WPM <span className="text-acid tabular-nums">{liveWpm}</span>
        </span>
        <span className="text-dim">
          ERR <span className="text-paper tabular-nums">{errors}</span>
        </span>
        <span className="text-dim">
          HI <span className="text-acid tabular-nums">{hi}</span>
        </span>
      </div>

      {/* prompt — typed chars flip acid, cursor blinks, future text dims */}
      <div
        className={`scanlines relative mt-2 min-h-[7.5rem] border border-line bg-ink p-4 font-mono text-sm leading-loose md:text-base ${
          shake ? "border-acid" : ""
        }`}
        onClick={() => inputRef.current?.focus({ preventScroll: true })}
        role="textbox"
        aria-label="Typing prompt"
      >
        <p className="mb-2 text-[9px] tracking-[0.3em] text-dim/70">
          root@mousouri:~$ — TYPE THE LINE, ENTER COMMITS EARLY
        </p>
        <p className="break-all">
          <span className="text-acid">{typed}</span>
          <span
            className={`ml-px inline-block h-[1.1em] w-[7px] translate-y-[3px] bg-acid ${
              typed.length >= target.length ? "opacity-0" : "animate-[blink_1s_steps(1)_infinite]"
            }`}
          />
          <span className="text-dim">{target.slice(typed.length)}</span>
        </p>
        <input
          ref={inputRef}
          value={typed}
          onChange={onChange}
          onKeyDown={onKeyDown}
          className="absolute h-0 w-0 opacity-0"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Type the command here"
        />
      </div>

      <p className="mt-3 text-center font-mono text-[10px] tracking-[0.3em] text-dim/70">
        CLICK THE SCREEN IF THE KEYBOARD GOES DEAF
      </p>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col items-center border border-line bg-ink px-6 py-10 text-center">
      {children}
    </div>
  );
}

function StartButton({ onClick, label = "[ EXECUTE ]" }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      data-cursor="RUN"
      className="mt-6 border border-acid px-5 py-2.5 font-mono text-[11px] tracking-[0.3em] text-acid transition-colors hover:bg-acid hover:text-ink"
    >
      {label}
    </button>
  );
}
