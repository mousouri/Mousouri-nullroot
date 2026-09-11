"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEnvironment } from "@/hooks/use-environment";
import { readHi, writeHi } from "@/lib/games";
import { playSfx } from "@/lib/sound";

/* ============================================================
   HOP.EXE — frogger, but the road is a motherboard. Hop across
   ten data-bus lanes packed with packets and DMA trains, reach
   the DIMM slot at the top, and the clock gets meaner. Three
   hoppers. Every touch is a bus error with your name on it.
   ============================================================ */

type Phase = "READY" | "RUN" | "PAUSE" | "DEAD";

interface Vehicle {
  x: number; // cell units (float)
  len: number; // cells
  dma: boolean;
}

const COLS = 13;
const ROWS = 12; // 0 = goal, 1..10 = traffic, 11 = start
const CELL = 1 / COLS;
const LANE_SPEEDS = [0, 0.9, 0.7, 1.3, 0.6, 1.0, 0.8, 1.5, 0.7, 1.1, 0.9, 0]; // cells/sec
const LANE_DIRS = [0, -1, 1, -1, 1, -1, 1, -1, 1, -1, 1, 0];
const LANE_DMA = [false, false, false, true, false, false, false, true, false, false, true, false];
const RUN_MS = 20000;

export function HopExeGame() {
  const { isTouch } = useEnvironment();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const lanes = useRef<Vehicle[][]>([]);
  const player = useRef({ col: 6, row: 11 });
  const phase = useRef<Phase>("READY");
  const wave = useRef(1);
  const score = useRef(0);
  const hoppers = useRef(3);
  const runLeft = useRef(RUN_MS);
  const deathAt = useRef(0);
  const acid = useRef("#d7ff3f");
  const swipe = useRef<{ x: number; y: number; t: number } | null>(null);

  const [hud, setHud] = useState<{
    score: number;
    wave: number;
    hoppers: number;
    time: number;
    phase: Phase;
    hi: number;
    record: boolean;
  }>({ score: 0, wave: 1, hoppers: 3, time: 20, phase: "READY", hi: 0, record: false });

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

  const buildLanes = useCallback(() => {
    lanes.current = Array.from({ length: ROWS }, (_, row) => {
      if (!LANE_DIRS[row]) return [];
      const dma = LANE_DMA[row];
      const out: Vehicle[] = [];
      const gapMin = dma ? 4.5 : 2.6;
      let x = -Math.random() * 3;
      while (x < COLS + 2) {
        const len = dma ? 3 + Math.floor(Math.random() * 2) : 1;
        out.push({ x, len, dma });
        x += len + gapMin + Math.random() * 2.4;
      }
      return out;
    });
  }, []);

  const respawn = useCallback(() => {
    player.current = { col: 6, row: 11 };
    runLeft.current = RUN_MS;
  }, []);

  const reset = useCallback(() => {
    buildLanes();
    wave.current = 1;
    score.current = 0;
    hoppers.current = 3;
    respawn();
    phase.current = "RUN";
    setHud((h) => ({ ...h, score: 0, wave: 1, hoppers: 3, time: 20, phase: "RUN", record: false }));
    playSfx("boot");
  }, [buildLanes, respawn]);

  const pause = useCallback(() => {
    if (phase.current === "RUN") phase.current = "PAUSE";
    else if (phase.current === "PAUSE") phase.current = "RUN";
    setHud((h) => ({ ...h, phase: h.phase === "PAUSE" ? "RUN" : h.phase }));
  }, []);

  const loseHopper = useCallback(() => {
    hoppers.current -= 1;
    playSfx("err");
    deathAt.current = performance.now();
    if (hoppers.current <= 0) {
      phase.current = "DEAD";
      const record = writeHi("nr-hi-hopexe", score.current);
      setHud((h) => ({ ...h, phase: "DEAD", hoppers: 0, hi: record ? score.current : h.hi, record }));
    } else {
      respawn();
    }
  }, [respawn]);

  /* ---------- hop ---------- */
  const hop = useCallback(
    (dx: number, dy: number) => {
      if (phase.current === "READY" || phase.current === "DEAD") {
        reset();
        return;
      }
      if (phase.current !== "RUN") return;
      const p = player.current;
      const nc = Math.max(0, Math.min(COLS - 1, p.col + dx));
      const nr = Math.max(0, Math.min(ROWS - 1, p.row + dy));
      if (nc === p.col && nr === p.row) return;
      p.col = nc;
      p.row = nr;
      playSfx("click");

      if (nr === 0) {
        /* reached the DIMM — score and next wave */
        score.current += 250 + (wave.current - 1) * 50;
        wave.current += 1;
        playSfx("ok");
        respawn();
      }
    },
    [reset, respawn],
  );

  /* ---------- input ---------- */
  useEffect(() => {
    const editable = (el: EventTarget | null) => {
      const e = el as HTMLElement | null;
      return !!e && (e.tagName === "INPUT" || e.tagName === "TEXTAREA" || !!e.isContentEditable);
    };
    const onKey = (e: KeyboardEvent) => {
      if (editable(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === "arrowup" || k === "w") {
        e.preventDefault();
        hop(0, -1);
      } else if (k === "arrowdown" || k === "s") {
        e.preventDefault();
        hop(0, 1);
      } else if (k === "arrowleft" || k === "a") {
        e.preventDefault();
        hop(-1, 0);
      } else if (k === "arrowright" || k === "d") {
        e.preventDefault();
        hop(1, 0);
      } else if (k === " ") {
        e.preventDefault();
        pause();
      } else if (k === "r") {
        reset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hop, pause, reset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const down = (e: PointerEvent) => {
      swipe.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    };
    const up = (e: PointerEvent) => {
      const s = swipe.current;
      swipe.current = null;
      if (!s) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 18) {
        hop(0, -1); // tap = hop forward
        return;
      }
      if (Math.abs(dx) > Math.abs(dy)) hop(dx > 0 ? 1 : -1, 0);
      else hop(0, dy > 0 ? 1 : -1);
    };
    canvas.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
    };
  }, [hop]);

  /* hi score on mount */
  useEffect(() => {
    const t = window.setTimeout(() => setHud((h) => ({ ...h, hi: readHi("nr-hi-hopexe") })), 0);
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
      const speedMult = Math.min(1.8, 1 + (wave.current - 1) * 0.08);
      runLeft.current -= dt;
      if (runLeft.current <= 0) {
        loseHopper();
        return;
      }

      /* move traffic */
      for (let row = 1; row <= 10; row++) {
        const dir = LANE_DIRS[row];
        const dma = LANE_DMA[row];
        for (const v of lanes.current[row]) {
          v.x += dir * LANE_SPEEDS[row] * speedMult * (dt / 1000);
        }
        /* wrap */
        for (const v of lanes.current[row]) {
          if (dir > 0 && v.x > COLS + 1) v.x = -v.len - Math.random() * 2;
          if (dir < 0 && v.x < -v.len - 1) v.x = COLS + Math.random() * 2;
        }
        void dma;
      }

      /* collision */
      const p = player.current;
      if (p.row >= 1 && p.row <= 10) {
        for (const v of lanes.current[p.row]) {
          const hit = p.col + 0.82 > v.x && p.col + 0.18 < v.x + v.len;
          if (hit) {
            loseHopper();
            return;
          }
        }
      }
    };

    const draw = (now: number) => {
      const w = canvas.width;
      const acidCol = acid.current;
      const cell = w / COLS;
      const oy = w * 0.015;
      const p = player.current;

      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, w, w);

      /* rows */
      for (let row = 0; row < ROWS; row++) {
        const y = oy + row * cell;
        if (row === 0) {
          /* DIMM slot — the goal */
          ctx.fillStyle = "rgba(242,240,234,0.07)";
          ctx.fillRect(0, y, w, cell);
          ctx.strokeStyle = "rgba(242,240,234,0.3)";
          ctx.setLineDash([cell * 0.3, cell * 0.2]);
          ctx.lineWidth = Math.max(1, w * 0.002);
          ctx.beginPath();
          ctx.moveTo(0, y + cell);
          ctx.lineTo(w, y + cell);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = "rgba(242,240,234,0.35)";
          ctx.font = `${Math.floor(cell * 0.3)}px monospace`;
          ctx.textAlign = "left";
          ctx.fillText("DIMM SLOT 0 — REBOOT ME HOME", w * 0.015, y + cell * 0.62);
        } else if (row === 11) {
          /* CPU socket — home pad */
          ctx.fillStyle = "rgba(215,255,63,0.06)";
          ctx.fillRect(0, y, w, cell);
          ctx.fillStyle = "rgba(242,240,234,0.3)";
          ctx.font = `${Math.floor(cell * 0.26)}px monospace`;
          ctx.textAlign = "left";
          ctx.fillText("SOCKET", w * 0.015, y + cell * 0.6);
        } else {
          /* traffic lane */
          if (row % 2 === 0) {
            ctx.fillStyle = "rgba(242,240,234,0.025)";
            ctx.fillRect(0, y, w, cell);
          }
        }
      }

      /* vehicles */
      for (let row = 1; row <= 10; row++) {
        const y = oy + row * cell;
        for (const v of lanes.current[row]) {
          const vx = v.x * cell;
          const vw = v.len * cell;
          const vh = cell * 0.72;
          const vy = y + (cell - vh) / 2;
          if (v.dma) {
            ctx.fillStyle = "rgba(242,240,234,0.85)";
            ctx.fillRect(vx, vy, vw, vh);
            ctx.fillStyle = "#0a0a0a";
            ctx.font = `${Math.floor(cell * 0.3)}px monospace`;
            ctx.textAlign = "center";
            ctx.fillText("DMA", vx + vw / 2, vy + vh * 0.66);
          } else {
            ctx.fillStyle = `rgba(${acidToRgb(acidCol)},0.9)`;
            ctx.fillRect(vx, vy, vw, vh);
            ctx.fillStyle = "#0a0a0a";
            const notch = Math.max(2, cell * 0.1);
            ctx.fillRect(vx + vw * 0.3, vy + vh / 2 - notch / 2, vw * 0.4, notch);
          }
        }
      }

      /* player */
      const px = p.col * cell;
      const py = oy + p.row * cell;
      const pad = cell * 0.16;
      const dying = now - deathAt.current < 260 && hoppers.current > 0;
      ctx.fillStyle = dying ? "rgba(242,240,234,0.9)" : acidCol;
      if (dying && Math.floor(now / 90) % 2 === 0) ctx.fillStyle = "rgba(242,240,234,0.3)";
      ctx.fillRect(px + pad, py + pad, cell - pad * 2, cell - pad * 2);
      ctx.fillStyle = "#0a0a0a";
      ctx.font = `${Math.floor(cell * 0.42)}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText("∩", px + cell / 2, py + cell * 0.7);

      /* timer bar */
      const frac = Math.max(0, runLeft.current / RUN_MS);
      ctx.fillStyle = "rgba(242,240,234,0.14)";
      ctx.fillRect(0, w - w * 0.012, w, w * 0.012);
      ctx.fillStyle = frac < 0.3 ? "rgba(242,240,234,0.9)" : acidCol;
      ctx.fillRect(0, w - w * 0.012, w * frac, w * 0.012);
    };

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (!last) last = t;
      const dt = Math.min(48, t - last);
      last = t;

      if (phase.current === "RUN") step(dt);

      setHud((h) => {
        const time = Math.ceil(Math.max(0, runLeft.current) / 1000);
        if (h.score === score.current && h.time === time && h.hoppers === hoppers.current && h.phase === phase.current)
          return h;
        return { ...h, score: score.current, time, hoppers: hoppers.current, phase: phase.current };
      });
      draw(t);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [loseHopper]);

  return (
    <div className="mx-auto w-full max-w-[560px]">
      {/* HUD */}
      <div className="flex items-center justify-between border border-line bg-ink px-3 py-2 font-mono text-[10px] tracking-[0.25em]">
        <span className="text-dim">
          SCORE <span className="text-acid tabular-nums">{hud.score}</span>
        </span>
        <span className="text-dim">
          WAVE <span className="text-paper tabular-nums">{hud.wave}</span>
        </span>
        <span className="text-dim">
          HOPPERS <span className="text-paper tabular-nums">{"■".repeat(hud.hoppers) || "—"}</span>
        </span>
        <span className="text-dim">
          CLK <span className="text-paper tabular-nums">{hud.time}s</span>
        </span>
        <span className="text-dim">
          HI <span className="text-paper tabular-nums">{hud.hi}</span>
        </span>
      </div>

      <div className="flex items-center justify-between border border-t-0 border-line bg-ink px-3 py-1.5 font-mono text-[9px] tracking-[0.25em]">
        <span className="text-acid">{hud.phase === "RUN" ? "REACH THE DIMM SLOT" : "\u00a0"}</span>
        <span className={hud.phase === "RUN" ? "text-acid" : hud.phase === "DEAD" ? "text-paper" : "text-dim"}>
          {hud.phase === "RUN" ? "STATUS: ON BUS" : hud.phase === "PAUSE" ? "STATUS: HELD" : hud.phase === "DEAD" ? "STATUS: BUS ERROR" : "STATUS: BOOT"}
        </span>
      </div>

      {/* screen */}
      <div ref={wrapRef} className="relative mt-2 aspect-square w-full border border-line">
        <canvas ref={canvasRef} className="scanlines block h-full w-full touch-none" aria-label="Hop EXE game screen" />
        {hud.phase === "READY" && (
          <Overlay onClick={reset}>
            <p className="font-display text-4xl tracking-wide text-paper md:text-5xl">HOP.EXE</p>
            <p className="mt-3 max-w-[38ch] font-mono text-[10px] leading-relaxed tracking-[0.2em] text-dim">
              CROSS TEN LANES OF DATA BUS. PACKETS STING, DMA TRAINS
              DO NOT BRAKE. REACH THE DIMM SLOT BEFORE THE CLOCK
              RUNS DRY.
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
          <Overlay onClick={pause}>
            <p className="font-mono text-sm tracking-[0.4em] text-acid">SIGSTOP</p>
            <p className="mt-3 font-mono text-[10px] tracking-[0.3em] text-dim">SPACE TO RESUME</p>
          </Overlay>
        )}
        {hud.phase === "DEAD" && (
          <Overlay onClick={reset}>
            <p className="font-display text-4xl tracking-wide text-paper md:text-5xl">BUS ERROR</p>
            <p className="mt-2 font-mono text-[10px] leading-relaxed tracking-[0.2em] text-dim">
              SIGBUS at hop 0x{hud.wave.toString(16)} — the packet
              <br />
              was real. the right-of-way was not.
            </p>
            <p className="mt-3 font-mono text-[11px] tracking-[0.25em] text-dim">
              SCORE <span className="text-acid">{hud.score}</span> — WAVE{" "}
              <span className="text-paper">{hud.wave}</span>
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
              [ RESOCKET ]
            </button>
          </Overlay>
        )}
      </div>
      <p className="mt-2 font-mono text-[9px] tracking-[0.3em] text-dim/60">
        {isTouch ? "SWIPE TO HOP — TAP = FORWARD" : "ARROWS / WASD — HOP — SPACE PAUSE — R RESET"}
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
