"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEnvironment } from "@/hooks/use-environment";
import { readHi, writeHi } from "@/lib/games";

/* ============================================================
   SNAKE.EXE — the classic, rendered like a terminal process.
   Canvas keeps rendering dead-cheap (one fillRect pass per
   frame); game state lives in refs so the rAF loop never
   re-renders React. HUD state is mirrored sparsely.
   ============================================================ */

const SIZE = 22; // logical cells per side
const START_MS = 150; // ms per step
const MIN_MS = 70;
const STEP_SHRINK = 6; // speed up per food

type Phase = "READY" | "RUN" | "PAUSE" | "DEAD";
type Cell = { x: number; y: number };

export function SnakeGame() {
  const { isTouch } = useEnvironment();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const snake = useRef<Cell[]>([]);
  const dir = useRef<Cell>({ x: 1, y: 0 });
  const queued = useRef<Cell[]>([]); // buffered turns — feels arcade-crisp
  const food = useRef<Cell>({ x: 17, y: 11 });
  const acc = useRef(0);
  const lastT = useRef(0);
  const stepMs = useRef(START_MS);
  const phase = useRef<Phase>("READY");
  const score = useRef(0);
  const rand = useRef<() => number>(() => 0.5);

  const [hud, setHud] = useState({ score: 0, phase: "READY" as Phase, hi: 0, record: false });

  const reset = useCallback(() => {
    const mid = Math.floor(SIZE / 2);
    snake.current = [
      { x: mid - 2, y: mid },
      { x: mid - 3, y: mid },
      { x: mid - 4, y: mid },
    ];
    dir.current = { x: 1, y: 0 };
    queued.current = [];
    stepMs.current = START_MS;
    acc.current = 0;
    score.current = 0;
    rand.current = mulberryLocal(Date.now() & 0xffffffff);
    food.current = spawnFood(snake.current, rand.current);
    phase.current = "RUN";
    setHud((h) => ({ ...h, score: 0, phase: "RUN", record: false }));
  }, []);

  const turn = useCallback((x: number, y: number) => {
    // reject reverse + duplicates; queue up to 2 turns for input precision
    const last = queued.current.length ? queued.current[queued.current.length - 1] : dir.current;
    if (last.x === -x && last.y === -y) return;
    if (last.x === x && last.y === y) return;
    if (queued.current.length < 2) queued.current.push({ x, y });
    if (phase.current === "READY") reset();
    if (phase.current === "PAUSE") phase.current = "RUN";
  }, [reset]);

  /* ---------- input ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // never steer while the user is typing (terminal, palette, forms)
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable)
      )
        return;
      const k = e.key.toLowerCase();
      if (k === "arrowup" || k === "w") { e.preventDefault(); turn(0, -1); }
      else if (k === "arrowdown" || k === "s") { e.preventDefault(); turn(0, 1); }
      else if (k === "arrowleft" || k === "a") { e.preventDefault(); turn(-1, 0); }
      else if (k === "arrowright" || k === "d") { e.preventDefault(); turn(1, 0); }
      else if (k === " ") {
        e.preventDefault();
        if (phase.current === "RUN") phase.current = "PAUSE";
        else if (phase.current === "PAUSE") phase.current = "RUN";
        else if (phase.current === "READY" || phase.current === "DEAD") reset();
        setHud((h) => ({ ...h, phase: phase.current }));
      } else if (k === "r") reset();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [turn, reset]);

  /* hi score read once on mount (deferred — keeps mount effect side-effect free) */
  useEffect(() => {
    const t = window.setTimeout(() => setHud((h) => ({ ...h, hi: readHi("nr-hi-snake") })), 0);
    return () => window.clearTimeout(t);
  }, []);

  /* ---------- loop ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;

    const fit = () => {
      const w = wrap.clientWidth;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const px = Math.floor(w * dpr);
      canvas.width = px;
      canvas.height = px;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);

    const step = (): boolean => {
      // returns true when the run dies — walls kill, wrap would be mercy,
      // and mercy is not on brand
      if (queued.current.length) dir.current = queued.current.shift()!;
      const head = snake.current[0];
      const nx = head.x + dir.current.x;
      const ny = head.y + dir.current.y;

      if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) {
        phase.current = "DEAD";
        return true;
      }
      if (snake.current.some((c) => c.x === nx && c.y === ny)) {
        phase.current = "DEAD";
        return true;
      }

      snake.current.unshift({ x: nx, y: ny });
      if (nx === food.current.x && ny === food.current.y) {
        score.current += 10;
        stepMs.current = Math.max(MIN_MS, stepMs.current - STEP_SHRINK);
        food.current = spawnFood(snake.current, rand.current);
        setHud((h) => ({ ...h, score: score.current }));
      } else {
        snake.current.pop();
      }
      return false;
    };

    const draw = () => {
      const w = canvas.width;
      const cell = w / SIZE;
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, w, w);

      // hairline grid — the grid stays exposed, even in games
      ctx.strokeStyle = "rgba(242,240,234,0.05)";
      ctx.lineWidth = Math.max(1, w / SIZE / 24);
      for (let i = 1; i < SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cell, 0);
        ctx.lineTo(i * cell, w);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * cell);
        ctx.lineTo(w, i * cell);
        ctx.stroke();
      }

      // food — paper square with pulse
      const pulse = 0.72 + 0.28 * Math.sin(performance.now() / 180);
      ctx.fillStyle = "#f2f0ea";
      const fx = food.current.x * cell;
      const fy = food.current.y * cell;
      const inset = cell * (1 - 0.62 * pulse) / 2;
      ctx.fillRect(fx + inset, fy + inset, cell - inset * 2, cell - inset * 2);

      // snake — acid, head brighter, 2px brutalist gaps
      const gap = Math.max(1, cell / 12);
      snake.current.forEach((c, i) => {
        ctx.fillStyle = i === 0 ? "#e4ff6f" : "#d7ff3f";
        ctx.fillRect(
          c.x * cell + gap,
          c.y * cell + gap,
          cell - gap * 2,
          cell - gap * 2,
        );
        // tail fade — cheap depth without gradients
        if (i > snake.current.length - 5) {
          ctx.fillStyle = "rgba(10,10,10,0.55)";
          ctx.fillRect(c.x * cell + gap, c.y * cell + gap, cell - gap * 2, cell - gap * 2);
        }
      });
    };

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (!lastT.current) lastT.current = t;
      const dt = t - lastT.current;
      lastT.current = t;

      if (phase.current === "RUN") {
        acc.current += dt;
        while (acc.current >= stepMs.current) {
          acc.current -= stepMs.current;
          if (step()) {
            const record = writeHi("nr-hi-snake", score.current);
            setHud((h) => ({
              ...h,
              phase: "DEAD",
              hi: record ? score.current : h.hi,
              record,
            }));
            break;
          }
        }
      }
      draw();
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-[560px]">
      {/* HUD */}
      <div className="flex items-center justify-between border border-line bg-ink px-3 py-2 font-mono text-[10px] tracking-[0.25em]">
        <span className="text-dim">
          SCORE <span className="text-acid tabular-nums">{hud.score}</span>
        </span>
        <span className="text-dim">
          HI <span className="text-paper tabular-nums">{hud.hi}</span>
        </span>
        <span className={phaseStateClass(hud.phase)}>{phaseStateLabel(hud.phase)}</span>
      </div>

      {/* screen */}
      <div ref={wrapRef} className="relative mt-2 aspect-square w-full border border-line">
        <canvas ref={canvasRef} className="scanlines block h-full w-full" aria-label="Snake game screen" />
        {hud.phase === "READY" && (
          <Overlay>
            <p className="font-display text-4xl tracking-wide text-paper md:text-5xl">SNAKE.EXE</p>
            <p className="mt-3 font-mono text-[10px] tracking-[0.3em] text-dim">
              {isTouch ? "TAP A DIRECTION TO BOOT" : "PRESS AN ARROW KEY TO BOOT"}
            </p>
            <button
              onClick={reset}
              data-cursor="RUN"
              className="mt-6 border border-acid px-4 py-2 font-mono text-[11px] tracking-[0.3em] text-acid transition-colors hover:bg-acid hover:text-ink"
            >
              [ EXECUTE ]
            </button>
          </Overlay>
        )}
        {hud.phase === "PAUSE" && (
          <Overlay>
            <p className="font-mono text-sm tracking-[0.4em] text-acid">SIGSTOP</p>
            <p className="mt-3 font-mono text-[10px] tracking-[0.3em] text-dim">SPACE TO RESUME</p>
          </Overlay>
        )}
        {hud.phase === "DEAD" && (
          <Overlay>
            <p className="font-display text-4xl tracking-wide text-paper md:text-5xl">SEGFAULT</p>
            <p className="mt-3 font-mono text-[11px] tracking-[0.3em] text-dim">
              SCORE <span className="text-acid">{hud.score}</span> — HI{" "}
              <span className="text-paper">{hud.hi}</span>
              {hud.record && <span className="ml-2 text-acid">NEW RECORD</span>}
            </p>
            <button
              onClick={reset}
              data-cursor="RETRY"
              className="mt-6 border border-acid px-4 py-2 font-mono text-[11px] tracking-[0.3em] text-acid transition-colors hover:bg-acid hover:text-ink"
            >
              [ REBOOT ]
            </button>
          </Overlay>
        )}
      </div>

      {/* touch d-pad */}
      {isTouch && (
        <div className="mx-auto mt-4 grid w-44 grid-cols-3 grid-rows-3 gap-1.5">
          <span />
          <DPad label="↑" onPress={() => turn(0, -1)} />
          <span />
          <DPad label="←" onPress={() => turn(-1, 0)} />
          <DPad label="·" onPress={() => (phase.current === "RUN" ? (phase.current = "PAUSE") : reset())} />
          <DPad label="→" onPress={() => turn(1, 0)} />
          <span />
          <DPad label="↓" onPress={() => turn(0, 1)} />
          <span />
        </div>
      )}
    </div>
  );
}

function DPad({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button
      onClick={onPress}
      className="flex h-14 items-center justify-center border border-line bg-ink font-mono text-sm text-paper transition-colors active:bg-acid active:text-ink"
      aria-label={label}
    >
      {label}
    </button>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-ink/85 p-4 text-center">
      {children}
    </div>
  );
}

function phaseStateLabel(p: Phase): string {
  return p === "RUN" ? "STATUS: LIVE" : p === "PAUSE" ? "STATUS: HELD" : p === "DEAD" ? "STATUS: DEAD" : "STATUS: BOOT";
}
function phaseStateClass(p: Phase): string {
  return p === "RUN" ? "text-acid" : p === "DEAD" ? "text-paper" : "text-dim";
}

/* ---------- helpers ---------- */

function spawnFood(snake: Cell[], rand: () => number): Cell {
  // rejection sample — cheap and the board is sparse by nature
  for (let i = 0; i < 200; i++) {
    const c = {
      x: Math.floor(rand() * SIZE),
      y: Math.floor(rand() * SIZE),
    };
    if (!snake.some((s) => s.x === c.x && s.y === c.y)) return c;
  }
  return { x: 0, y: 0 };
}

function mulberryLocal(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
