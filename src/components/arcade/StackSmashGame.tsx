"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readHi, writeHi } from "@/lib/games";
import { playSfx } from "@/lib/sound";

/* ============================================================
   STACK.SMASH — buffer overflow as a stacking game. Every row
   of the payload slides across the frame; write it too far off
   and the stack loses alignment. Miss the frame entirely and
   you trample the return address: SEGFAULT, core dumped.
   Perfect overwrites reclaim width. How deep can the payload
   go before the canary dies?
   ============================================================ */

type Phase = "READY" | "RUN" | "PAUSE" | "DEAD";

interface Row {
  x: number;
  w: number;
  perfect: boolean;
  byte: string;
}

const BASE_W = 0.36;
const ROW_H = 0.034;
const START_SPEED = 0.00042;
const SPEED_PER_ROW = 0.000018;
const MAX_SPEED = 0.0011;
const GROUND_Y = 0.94;
const MAX_VISIBLE_ROWS = Math.floor((GROUND_Y - 0.1) / ROW_H);

const BYTE_NAMES = ["NOPSLED", "SHELL", "RET", "ARGV", "ENV", "GOT", "PLT", "HEAP"];

function hexByte(n: number): string {
  const h = "0123456789abcdef";
  const seed = (n * 2654435761) % 4294967296;
  return `0x${h[(seed >>> 4) & 15]}${h[(seed >>> 12) & 15]}${h[(seed >>> 20) & 15]}${h[seed & 15]}`;
}

export function StackSmashGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const tower = useRef<Row[]>([]);
  const mov = useRef({ x: 0.32, w: BASE_W, dir: 1 });
  const phase = useRef<Phase>("READY");
  const score = useRef(0);
  const speed = useRef(START_SPEED);
  const perfectStreak = useRef(0);
  const scroll = useRef(0);
  const flashMsg = useRef<{ text: string; at: number }>({ text: "", at: 0 });
  const acid = useRef("#d7ff3f");

  const [hud, setHud] = useState<{
    score: number;
    depth: number;
    phase: Phase;
    hi: number;
    record: boolean;
    streak: number;
  }>({ score: 0, depth: 0, phase: "READY", hi: 0, record: false, streak: 0 });

  /* ---------- theme-reactive accent ---------- */
  useEffect(() => {
    const read = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue("--acid").trim();
      if (v) acid.current = v;
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);

  const reset = useCallback(() => {
    tower.current = [{ x: (1 - BASE_W) / 2, w: BASE_W, perfect: false, byte: "0x90909090" }];
    mov.current = { x: (1 - BASE_W) / 2, w: BASE_W, dir: Math.random() < 0.5 ? 1 : -1 };
    score.current = 0;
    speed.current = START_SPEED;
    perfectStreak.current = 0;
    scroll.current = 0;
    phase.current = "RUN";
    setHud((h) => ({ ...h, score: 0, depth: 0, phase: "RUN", record: false, streak: 0 }));
    playSfx("boot");
  }, []);

  const pause = useCallback(() => {
    if (phase.current === "RUN") phase.current = "PAUSE";
    else if (phase.current === "PAUSE") phase.current = "RUN";
    setHud((h) => ({ ...h, phase: phase.current }));
  }, []);

  const die = useCallback(() => {
    phase.current = "DEAD";
    playSfx("zap");
    const record = writeHi("nr-hi-stacksmash", score.current);
    setHud((h) => ({ ...h, phase: "DEAD", hi: record ? score.current : h.hi, record }));
  }, []);

  /* ---------- write the byte ---------- */
  const smash = useCallback(() => {
    if (phase.current === "READY" || phase.current === "DEAD") {
      reset();
      return;
    }
    if (phase.current !== "RUN") return;
    const top = tower.current[tower.current.length - 1];
    const m = mov.current;
    const overlap = Math.min(m.x + m.w, top.x + top.w) - Math.max(m.x, top.x);

    if (overlap < 0.035) {
      // trampled the return address
      die();
      return;
    }

    const perfect = overlap >= top.w * 0.88;
    let streak = perfectStreak.current;
    if (perfect) {
      streak += 1;
      perfectStreak.current = streak;
      score.current += 25;
      flashMsg.current = { text: "PERFECT OVERWRITE +25", at: performance.now() };
      playSfx("ok");
    } else {
      streak = 0;
      perfectStreak.current = 0;
      score.current += 10;
      playSfx("pickup");
    }

    const newW = perfect ? Math.min(BASE_W, top.w + 0.028) : overlap;
    const newX = Math.max(m.x, top.x);
    tower.current.push({
      x: newX,
      w: newW,
      perfect,
      byte: hexByte(tower.current.length + 1),
    });
    score.current += 5;
    speed.current = Math.min(MAX_SPEED, speed.current + SPEED_PER_ROW);

    /* next slider keeps the last row's width */
    mov.current = { x: Math.random() * (1 - newW), w: newW, dir: Math.random() < 0.5 ? 1 : -1 };
    setHud((h) => ({ ...h, score: score.current, depth: tower.current.length - 1, streak }));
  }, [reset, die]);

  /* ---------- input ---------- */
  useEffect(() => {
    const editable = (el: EventTarget | null) => {
      const e = el as HTMLElement | null;
      return !!e && (e.tagName === "INPUT" || e.tagName === "TEXTAREA" || !!e.isContentEditable);
    };
    const onKey = (e: KeyboardEvent) => {
      if (editable(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === " " || k === "enter") {
        e.preventDefault();
        smash();
      } else if (k === "r") {
        reset();
      } else if (k === "p") {
        pause();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [smash, reset, pause]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const down = (e: PointerEvent) => {
      e.preventDefault();
      smash();
    };
    canvas.addEventListener("pointerdown", down);
    return () => canvas.removeEventListener("pointerdown", down);
  }, [smash]);

  /* hi score on mount */
  useEffect(() => {
    const t = window.setTimeout(() => setHud((h) => ({ ...h, hi: readHi("nr-hi-stacksmash") })), 0);
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
    let last = 0;

    const fit = () => {
      const w = wrap.clientWidth;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(w * dpr);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);

    const step = (dt: number) => {
      const m = mov.current;
      m.x += m.dir * speed.current * dt;
      if (m.x <= 0.02) {
        m.x = 0.02;
        m.dir = 1;
      } else if (m.x + m.w >= 0.98) {
        m.x = 0.98 - m.w;
        m.dir = -1;
      }
      // camera: keep the top of the tower in frame
      const rowsAbove = Math.max(0, tower.current.length - MAX_VISIBLE_ROWS);
      const target = rowsAbove * ROW_H;
      scroll.current += (target - scroll.current) * Math.min(1, dt * 0.008);
    };

    const draw = (now: number) => {
      const w = canvas.width;
      const acidCol = acid.current;

      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, w, w);

      /* memory grid */
      ctx.strokeStyle = "rgba(242,240,234,0.04)";
      ctx.lineWidth = Math.max(1, w / 720);
      for (let i = 1; i < 10; i++) {
        const y = (i / 10) * w;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      /* stack base — the buffer */
      const sy = GROUND_Y * w;

      /* tower rows (bottom → top), with progressive sway */
      const n = tower.current.length;
      for (let i = 0; i < n; i++) {
        const r = tower.current[i];
        const rowScreenY = sy - (i + 1 - scroll.current / ROW_H) * ROW_H * w;
        if (rowScreenY < -ROW_H * w || rowScreenY > w) continue;
        // sway: higher rows wobble more as the stack narrows
        const narrow = 1 - r.w / BASE_W;
        const swayAmp = (i / Math.max(1, n)) * narrow * w * 0.012;
        const sway = Math.sin(now / 320 + i * 0.55) * swayAmp;
        const x = (r.x * w) + sway;
        const rw = r.w * w;
        const rh = ROW_H * w - Math.max(1, w * 0.002);

        if (r.perfect) {
          ctx.fillStyle = "rgba(242,240,234,0.9)";
          ctx.fillRect(x, rowScreenY, rw, rh);
        } else {
          ctx.fillStyle = `rgba(${acidToRgb(acidCol)},0.16)`;
          ctx.fillRect(x, rowScreenY, rw, rh);
          ctx.strokeStyle = acidCol;
          ctx.lineWidth = Math.max(1.2, w * 0.003);
          ctx.strokeRect(x, rowScreenY, rw, rh);
        }
        /* byte label every 4 rows */
        if (i % 4 === 0 && rw > w * 0.12) {
          ctx.fillStyle = "rgba(242,240,234,0.4)";
          ctx.font = `${Math.floor(w * 0.014)}px monospace`;
          ctx.textAlign = "left";
          ctx.fillText(`${BYTE_NAMES[i % BYTE_NAMES.length]} ${r.byte}`, x + w * 0.006, rowScreenY - w * 0.004);
        }
      }

      /* moving slider row */
      if (phase.current === "RUN") {
        const m = mov.current;
        const topY = sy - (n - scroll.current / ROW_H) * ROW_H * w;
        ctx.fillStyle = acidCol;
        ctx.fillRect(m.x * w, topY, m.w * w, ROW_H * w - Math.max(1, w * 0.002));
        /* alignment guides vs the row below */
        const below = tower.current[tower.current.length - 1];
        if (below) {
          ctx.strokeStyle = "rgba(242,240,234,0.25)";
          ctx.setLineDash([w * 0.006, w * 0.008]);
          ctx.beginPath();
          ctx.moveTo(below.x * w, topY);
          ctx.lineTo(below.x * w, topY - w * 0.03);
          ctx.moveTo((below.x + below.w) * w, topY);
          ctx.lineTo((below.x + below.w) * w, topY - w * 0.03);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      /* stack canary — the line you must never cross */
      const canaryY = sy - (tower.current.length + 2 - scroll.current / ROW_H) * ROW_H * w;
      ctx.fillStyle = "rgba(242,240,234,0.7)";
      ctx.font = `${Math.floor(w * 0.013)}px monospace`;
      ctx.textAlign = "left";
      ctx.fillText("*** STACK CANARY — 0xDEADBEEF ***", w * 0.03, canaryY - w * 0.006);

      /* flash message */
      if (now - flashMsg.current.at < 900) {
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(242,240,234,0.85)";
        ctx.font = `${Math.floor(w * 0.02)}px monospace`;
        ctx.fillText(flashMsg.current.text, w / 2, w * 0.09);
      }

      /* depth ruler */
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(242,240,234,0.35)";
      ctx.font = `${Math.floor(w * 0.014)}px monospace`;
      ctx.fillText(`ESP ${String(tower.current.length - 1).padStart(3, "0")}`, w * 0.97, w * 0.05);
    };

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (!last) last = t;
      const dt = Math.min(48, t - last);
      last = t;

      if (phase.current === "RUN") step(dt);

      setHud((h) => {
        if (h.score === score.current && h.phase === phase.current) return h;
        return { ...h, score: score.current, phase: phase.current };
      });
      draw(t);
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
          DEPTH <span className="text-paper tabular-nums">{hud.depth} B</span>
        </span>
        <span className="text-dim">
          STREAK <span className="text-paper tabular-nums">{hud.streak > 0 ? `x${hud.streak}` : "—"}</span>
        </span>
        <span className="text-dim">
          HI <span className="text-paper tabular-nums">{hud.hi}</span>
        </span>
      </div>

      <div className="flex items-center justify-between border border-t-0 border-line bg-ink px-3 py-1.5 font-mono text-[9px] tracking-[0.25em]">
        <span className="text-acid">
          {hud.streak >= 3 ? "ALIGNED PAYLOAD — KEEP IT CLEAN" : "\u00a0"}
        </span>
        <span className={hud.phase === "RUN" ? "text-acid" : hud.phase === "DEAD" ? "text-paper" : "text-dim"}>
          {hud.phase === "RUN" ? "STATUS: WRITING" : hud.phase === "PAUSE" ? "STATUS: HELD" : hud.phase === "DEAD" ? "STATUS: CRASHED" : "STATUS: BOOT"}
        </span>
      </div>

      {/* screen */}
      <div ref={wrapRef} className="relative mt-2 aspect-square w-full border border-line">
        <canvas
          ref={canvasRef}
          className="scanlines block h-full w-full touch-none"
          aria-label="Stack Smash game screen"
        />
        {hud.phase === "READY" && (
          <Overlay onClick={reset}>
            <p className="font-display text-4xl tracking-wide text-paper md:text-5xl">STACK.SMASH</p>
            <p className="mt-3 max-w-[38ch] font-mono text-[10px] leading-relaxed tracking-[0.2em] text-dim">
              WRITE EACH PAYLOAD ROW AS IT SLIDES PAST. KEEP THE STACK
              ALIGNED — MISS THE FRAME AND THE RETURN ADDRESS DIES
              WITH YOU.
            </p>
            <button
              type="button"
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
            <p className="mt-3 font-mono text-[10px] tracking-[0.3em] text-dim">P TO RESUME</p>
          </Overlay>
        )}
        {hud.phase === "DEAD" && (
          <Overlay onClick={reset}>
            <p className="font-display text-4xl tracking-wide text-paper md:text-5xl">SEGFAULT</p>
            <p className="mt-2 font-mono text-[10px] leading-relaxed tracking-[0.2em] text-dim">
              segfault at 0xdeadbeef ip 0x0000ffff sp 0xfffec000
              <br />
              code 1 (SEGV_MAPERR) — core dumped
            </p>
            <p className="mt-3 font-mono text-[11px] tracking-[0.25em] text-dim">
              SCORE <span className="text-acid">{hud.score}</span> — DEPTH{" "}
              <span className="text-paper">{hud.depth} B</span>
            </p>
            <p className="mt-1 font-mono text-[11px] tracking-[0.25em] text-dim">
              HI <span className="text-paper">{hud.hi}</span>
              {hud.record && <span className="ml-2 text-acid">NEW RECORD</span>}
            </p>
            <button
              type="button"
              data-cursor="RETRY"
              className="mt-6 border border-acid px-4 py-2 font-mono text-[11px] tracking-[0.3em] text-acid transition-colors hover:bg-acid hover:text-ink"
            >
              [ RECOMPILE ]
            </button>
          </Overlay>
        )}
      </div>
      <p className="mt-2 font-mono text-[9px] tracking-[0.3em] text-dim/60">
        SPACE / TAP — WRITE BYTE — P PAUSE — R RESET
      </p>
    </div>
  );
}

function Overlay({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-ink/85 p-4 text-center"
    >
      {children}
    </div>
  );
}

function acidToRgb(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "215,255,63";
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}
