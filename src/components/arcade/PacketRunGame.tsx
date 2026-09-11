"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEnvironment } from "@/hooks/use-environment";
import { readHi, writeHi } from "@/lib/games";
import { playSfx } from "@/lib/sound";

/* ============================================================
   PKT.RUN — you are the packet. Firewalls descend, you slip
   the gaps, stray bits are worth eating. Same architecture as
   SNAKE.EXE: game state in refs, one fillRect-ish pass per
   frame, HUD mirrored sparsely. Colors read the live theme
   (--acid) so a colorway switch recolors the run mid-flight.
   ============================================================ */

type Phase = "READY" | "RUN" | "PAUSE" | "DEAD";

interface Wall {
  y: number;
  gapX: number;
  gapW: number;
  passed: boolean;
}

interface Bit {
  x: number;
  y: number;
  taken: boolean;
}

export function PacketRunGame() {
  const { isTouch } = useEnvironment();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const player = useRef({ x: 0.5, vx: 0 }); // x normalized 0..1
  const held = useRef({ left: false, right: false });
  const dragX = useRef<number | null>(null); // normalized pointer target
  const walls = useRef<Wall[]>([]);
  const bits = useRef<Bit[]>([]);
  const dist = useRef(0); // total scrolled px (logical)
  const nextSpawn = useRef(0);
  const speed = useRef(0);
  const phase = useRef<Phase>("READY");
  const score = useRef(0);
  const passedCount = useRef(0);
  const trail = useRef<Array<{ x: number; y: number }>>([]);
  const acid = useRef("#d7ff3f");

  const [hud, setHud] = useState({
    score: 0,
    lv: 1,
    phase: "READY" as Phase,
    hi: 0,
    record: false,
  });

  /* ---------- theme-reactive accent ---------- */
  useEffect(() => {
    const read = () => {
      const v = getComputedStyle(document.documentElement)
        .getPropertyValue("--acid")
        .trim();
      if (v) acid.current = v;
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);

  /* ---------- lifecycle ---------- */
  const reset = useCallback(() => {
    player.current = { x: 0.5, vx: 0 };
    walls.current = [];
    bits.current = [];
    trail.current = [];
    dist.current = 0;
    nextSpawn.current = 0.18; // first firewall arrives quickly
    speed.current = 0.00022;
    passedCount.current = 0;
    score.current = 0;
    phase.current = "RUN";
    setHud((h) => ({ ...h, score: 0, lv: 1, phase: "RUN", record: false }));
  }, []);

  const pause = useCallback(() => {
    if (phase.current === "RUN") phase.current = "PAUSE";
    else if (phase.current === "PAUSE") phase.current = "RUN";
    setHud((h) => ({ ...h, phase: phase.current }));
  }, []);

  /* ---------- input ---------- */
  useEffect(() => {
    const editable = (el: EventTarget | null) => {
      const e = el as HTMLElement | null;
      return (
        !!e &&
        (e.tagName === "INPUT" || e.tagName === "TEXTAREA" || !!e.isContentEditable)
      );
    };

    const onKey = (e: KeyboardEvent) => {
      if (editable(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "a") {
        e.preventDefault();
        held.current.left = true;
        if (phase.current === "READY") reset();
      } else if (k === "arrowright" || k === "d") {
        e.preventDefault();
        held.current.right = true;
        if (phase.current === "READY") reset();
      } else if (k === " ") {
        e.preventDefault();
        if (phase.current === "READY" || phase.current === "DEAD") reset();
        else pause();
      } else if (k === "r") {
        reset();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "a") held.current.left = false;
      if (k === "arrowright" || k === "d") held.current.right = false;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [reset, pause]);

  /* touch drag steering on the canvas itself */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isTouch) return;

    const toNorm = (clientX: number) => {
      const r = canvas.getBoundingClientRect();
      return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    };
    const down = (e: PointerEvent) => {
      dragX.current = toNorm(e.clientX);
      if (phase.current === "READY" || phase.current === "DEAD") reset();
    };
    const move = (e: PointerEvent) => {
      if (dragX.current !== null) dragX.current = toNorm(e.clientX);
    };
    const up = () => {
      dragX.current = null;
    };

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [isTouch, reset]);

  /* hi score on mount (deferred) */
  useEffect(() => {
    const t = window.setTimeout(
      () => setHud((h) => ({ ...h, hi: readHi("nr-hi-packetrun") })),
      0,
    );
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

    const spawnWall = () => {
      const gapW = Math.max(0.16, 0.30 - passedCount.current * 0.004); // narrows with skill
      const gapX = 0.06 + Math.random() * (0.88 - gapW);
      walls.current.push({ y: -0.03, gapX, gapW, passed: false });
      // ~55% of gaps carry a data bit, floating midway to the next wall
      if (Math.random() < 0.55) {
        bits.current.push({ x: gapX + gapW / 2, y: -0.03 - 0.16, taken: false });
      }
    };

    const step = (dt: number): boolean => {
      // returns true when the run dies
      const W = 1; // normalized space — everything lives in 0..1
      void W;

      /* speed ramps with walls passed (LV 1..9) */
      speed.current = Math.min(0.00062, 0.00022 + passedCount.current * 0.000022);
      const dy = speed.current * dt;

      dist.current += dy;
      nextSpawn.current -= dy;
      if (nextSpawn.current <= 0) {
        spawnWall();
        nextSpawn.current = 0.26; // vertical distance between firewalls
      }

      /* steering */
      const p = player.current;
      const accel = 0.0000042 * dt;
      if (dragX.current !== null) {
        p.x += (dragX.current - p.x) * Math.min(1, dt * 0.014);
        p.vx = 0;
      } else {
        if (held.current.left) p.vx -= accel;
        if (held.current.right) p.vx += accel;
        if (!held.current.left && !held.current.right) p.vx *= 0.86;
        p.vx = Math.max(-0.0011, Math.min(0.0011, p.vx));
        p.x += p.vx * dt;
      }
      p.x = Math.max(0.035, Math.min(0.965, p.x));

      /* scroll walls + bits */
      for (const w of walls.current) w.y += dy;
      for (const b of bits.current) b.y += dy;

      /* collisions */
      const S = 0.055; // packet hitbox (normalized)
      const py = 0.84;
      const px = p.x;

      for (const w of walls.current) {
        if (!w.passed && w.y > py) {
          w.passed = true;
          passedCount.current += 1;
          score.current += 10;
          continue;
        }
        // only test when the packet overlaps the wall line
        if (Math.abs(w.y - py) < S * 0.55) {
          if (px - S / 2 < w.gapX || px + S / 2 > w.gapX + w.gapW) {
            phase.current = "DEAD";
            playSfx("zap");
            return true;
          }
        }
      }

      for (const b of bits.current) {
        if (!b.taken && Math.abs(b.y - py) < S && Math.abs(b.x - px) < S * 0.9) {
          b.taken = true;
          score.current += 25;
          playSfx("pickup");
        }
      }

      /* cleanup off-screen */
      walls.current = walls.current.filter((w) => w.y < 1.1);
      bits.current = bits.current.filter((b) => b.y < 1.15 && !b.taken);

      /* trail */
      trail.current.push({ x: px, y: py });
      if (trail.current.length > 14) trail.current.shift();

      return false;
    };

    const draw = () => {
      const w = canvas.width;
      const acidCol = acid.current;

      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, w, w);

      /* lane grid — vertical hairlines */
      ctx.strokeStyle = "rgba(242,240,234,0.045)";
      ctx.lineWidth = Math.max(1, w / 720);
      for (let i = 1; i < 8; i++) {
        const x = (i / 8) * w;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, w);
        ctx.stroke();
      }

      /* destination line — the bottom edge is home */
      ctx.strokeStyle = "rgba(242,240,234,0.25)";
      ctx.setLineDash([w * 0.012, w * 0.012]);
      ctx.beginPath();
      ctx.moveTo(0, w * 0.94);
      ctx.lineTo(w, w * 0.94);
      ctx.stroke();
      ctx.setLineDash([]);

      /* firewalls — paper line, acid gap teeth */
      const lw = Math.max(2, w * 0.008);
      for (const wall of walls.current) {
        const y = wall.y * w;
        const gx = wall.gapX * w;
        const gw = wall.gapW * w;
        ctx.fillStyle = "rgba(242,240,234,0.85)";
        ctx.fillRect(0, y - lw / 2, gx, lw);
        ctx.fillRect(gx + gw, y - lw / 2, w - gx - gw, lw);
        ctx.fillStyle = acidCol;
        ctx.fillRect(gx - lw, y - lw * 1.4, lw * 2, lw * 2.8);
        ctx.fillRect(gx + gw - lw, y - lw * 1.4, lw * 2, lw * 2.8);
      }

      /* data bits — pulsing acid squares */
      const pulse = 0.7 + 0.3 * Math.sin(performance.now() / 150);
      for (const b of bits.current) {
        const s = w * 0.028 * pulse;
        ctx.fillStyle = acidCol;
        ctx.fillRect(b.x * w - s / 2, b.y * w - s / 2, s, s);
      }

      /* trail — fading ghosts */
      trail.current.forEach((t, i) => {
        const a = (i / trail.current.length) * 0.22;
        const s = w * 0.03;
        ctx.fillStyle = `rgba(${hexToRgb(acidCol)},${a.toFixed(3)})`;
        ctx.fillRect(t.x * w - s / 2, t.y * w - s / 2, s, s);
      });

      /* the packet — acid diamond */
      const p = player.current;
      const cx = p.x * w;
      const cy = 0.84 * w;
      const r = w * 0.032;
      ctx.fillStyle = acidCol;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      ctx.fill();
      /* core */
      ctx.fillStyle = "#0a0a0a";
      const cr = r * 0.32;
      ctx.fillRect(cx - cr / 2, cy - cr / 2, cr, cr);
    };

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (!last) last = t;
      const dt = Math.min(48, t - last); // clamp tab-switch spikes
      last = t;

      if (phase.current === "RUN") {
        if (step(dt)) {
          const record = writeHi("nr-hi-packetrun", score.current);
          setHud((h) => ({
            ...h,
            phase: "DEAD",
            score: score.current,
            lv: Math.min(9, 1 + Math.floor(passedCount.current / 4)),
            hi: record ? score.current : h.hi,
            record,
          }));
        } else {
          const lv = Math.min(9, 1 + Math.floor(passedCount.current / 4));
          setHud((h) =>
            h.score === score.current && h.lv === lv
              ? h
              : { ...h, score: score.current, lv },
          );
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
          LV <span className="text-paper tabular-nums">{hud.lv}</span>
        </span>
        <span className="text-dim">
          HI <span className="text-paper tabular-nums">{hud.hi}</span>
        </span>
        <span
          className={
            hud.phase === "RUN"
              ? "text-acid"
              : hud.phase === "DEAD"
                ? "text-paper"
                : "text-dim"
          }
        >
          {hud.phase === "RUN"
            ? "STATUS: LIVE"
            : hud.phase === "PAUSE"
              ? "STATUS: HELD"
              : hud.phase === "DEAD"
                ? "STATUS: DROPPED"
                : "STATUS: BOOT"}
        </span>
      </div>

      {/* screen */}
      <div ref={wrapRef} className="relative mt-2 aspect-square w-full border border-line">
        <canvas
          ref={canvasRef}
          className="scanlines block h-full w-full touch-none"
          aria-label="Packet Run game screen"
        />
        {hud.phase === "READY" && (
          <Overlay>
            <p className="font-display text-4xl tracking-wide text-paper md:text-5xl">PKT.RUN</p>
            <p className="mt-3 font-mono text-[10px] tracking-[0.3em] text-dim">
              {isTouch ? "TOUCH AND DRAG TO BOOT" : "HOLD ← / → TO BOOT"}
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
            <p className="font-display text-4xl tracking-wide text-paper md:text-5xl">DROPPED</p>
            <p className="mt-2 font-mono text-[10px] tracking-[0.3em] text-dim">
              TTL EXPIRED — THE FIREWALL SENDS ITS REGARDS
            </p>
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
              [ RESEND ]
            </button>
          </Overlay>
        )}
      </div>

      {/* touch steer pad — hold to move */}
      {isTouch && (
        <div className="mx-auto mt-4 grid w-56 grid-cols-3 gap-1.5">
          <button
            onPointerDown={() => {
              held.current.left = true;
              if (phase.current === "READY" || phase.current === "DEAD") reset();
            }}
            onPointerUp={() => (held.current.left = false)}
            onPointerLeave={() => (held.current.left = false)}
            className="flex h-14 items-center justify-center border border-line bg-ink font-mono text-sm text-paper transition-colors active:bg-acid active:text-ink"
            aria-label="Steer left"
          >
            ◀
          </button>
          <button
            onPointerDown={() => {
              if (phase.current === "READY" || phase.current === "DEAD") reset();
              else pause();
            }}
            className="flex h-14 items-center justify-center border border-line bg-ink font-mono text-sm text-paper transition-colors active:bg-acid active:text-ink"
            aria-label="Pause or reboot"
          >
            ·
          </button>
          <button
            onPointerDown={() => {
              held.current.right = true;
              if (phase.current === "READY" || phase.current === "DEAD") reset();
            }}
            onPointerUp={() => (held.current.right = false)}
            onPointerLeave={() => (held.current.right = false)}
            className="flex h-14 items-center justify-center border border-line bg-ink font-mono text-sm text-paper transition-colors active:bg-acid active:text-ink"
            aria-label="Steer right"
          >
            ▶
          </button>
        </div>
      )}
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-ink/85 p-4 text-center">
      {children}
    </div>
  );
}

/* "#rrggbb" → "r,g,b" for rgba() compositing */
function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "215,255,63";
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}
