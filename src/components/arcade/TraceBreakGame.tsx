"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEnvironment } from "@/hooks/use-environment";
import { readHi, writeHi } from "@/lib/games";
import { playSfx } from "@/lib/sound";

/* ============================================================
   TRACE.BREAK — breakout, but the bricks are firewall rules.
   One packet, one socket (paddle), a wall of rules to break.
   DENY rules take two hits and crack before they fall. Downed
   rules drop chips: MLT (packet flood / multiball), MTU (wide
   socket), RATE (throttle the packet). Clear the wall and the
   firewall rebuilds meaner. Same architecture as PKT.RUN:
   state in refs, one rAF loop, normalized 0..1 coordinates,
   canvas reads the live theme so colorway switches repaint.
   ============================================================ */

type Phase = "READY" | "RUN" | "PAUSE" | "DEAD";
type PowerKind = "MLT" | "MTU" | "RATE";

interface Ball {
  x: number;
  y: number;
  vx: number; // normalized units per ms
  vy: number;
  stuck: boolean;
  trail: Array<{ x: number; y: number }>;
}

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  wasDeny: boolean;
  alive: boolean;
}

interface Drop {
  x: number;
  y: number;
  kind: PowerKind;
}

/* ---------- geometry constants (normalized space) ---------- */
const COLS = 10;
const ROWS = 5;
const FIELD_X = 0.05;
const FIELD_W = 0.9;
const GAP = 0.01;
const BRICK_W = (FIELD_W - (COLS - 1) * GAP) / COLS;
const BRICK_H = 0.042;
const WALL_TOP = 0.1;

const PADDLE_Y = 0.9;
const PADDLE_H = 0.016;
const PADDLE_W = 0.14;
const PADDLE_W_MTU = 0.21;

const BALL_S = 0.018; // full size; half = hitbox radius
const HS = BALL_S / 2;

const WAVE_BASE_SPEED = 0.00052; // units per ms — wave 1
const SPEED_PER_WAVE = 0.00006;
const SPEEDUP_PER_HIT = 1.012; // paddle bounce ramp
const SPEED_CAP_MULT = 1.55;

export function TraceBreakGame() {
  const { isTouch } = useEnvironment();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const paddle = useRef({ x: 0.5, w: PADDLE_W });
  const held = useRef({ left: false, right: false });
  const dragX = useRef<number | null>(null);
  const balls = useRef<Ball[]>([]);
  const bricks = useRef<Brick[]>([]);
  const drops = useRef<Drop[]>([]);
  const lives = useRef(3);
  const wave = useRef(1);
  const score = useRef(0);
  const speed = useRef(WAVE_BASE_SPEED);
  const phase = useRef<Phase>("READY");
  const mtuUntil = useRef(0);
  const rateUntil = useRef(0);
  const bannerTimer = useRef(0);
  const acid = useRef("#d7ff3f");
  const isTouchRef = useRef(false); // read inside the rAF loop w/o re-binding

  useEffect(() => {
    isTouchRef.current = isTouch;
  }, [isTouch]);

  const [hud, setHud] = useState<{
    score: number;
    wave: number;
    lives: number;
    phase: Phase;
    hi: number;
    record: boolean;
    banner: string;
  }>({
    score: 0,
    wave: 1,
    lives: 3,
    phase: "READY",
    hi: 0,
    record: false,
    banner: "",
  });

  const flash = useCallback((text: string) => {
    window.clearTimeout(bannerTimer.current);
    setHud((h) => ({ ...h, banner: text }));
    bannerTimer.current = window.setTimeout(
      () => setHud((h) => ({ ...h, banner: "" })),
      1800,
    );
  }, []);

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

  /* ---------- wall builder ---------- */
  const buildWall = useCallback((wv: number) => {
    const out: Brick[] = [];
    const denyBias = Math.min(0.85, 0.5 + wv * 0.09);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        // higher waves punch holes in the wall for variety
        if (wv > 1 && Math.random() < 0.07) continue;
        const deny = r < 2 && Math.random() < denyBias;
        out.push({
          x: FIELD_X + c * (BRICK_W + GAP),
          y: WALL_TOP + r * (BRICK_H + GAP),
          w: BRICK_W,
          h: BRICK_H,
          hp: deny ? 2 : 1,
          wasDeny: deny,
          alive: true,
        });
      }
    }
    bricks.current = out;
  }, []);

  const spawnStuck = useCallback((): Ball => {
    return {
      x: paddle.current.x,
      y: PADDLE_Y - PADDLE_H / 2 - HS,
      vx: 0,
      vy: 0,
      stuck: true,
      trail: [],
    };
  }, []);

  /* ---------- lifecycle ---------- */
  const reset = useCallback(() => {
    paddle.current = { x: 0.5, w: PADDLE_W };
    drops.current = [];
    lives.current = 3;
    wave.current = 1;
    score.current = 0;
    speed.current = WAVE_BASE_SPEED;
    mtuUntil.current = 0;
    rateUntil.current = 0;
    buildWall(1);
    balls.current = [spawnStuck()];
    phase.current = "RUN";
    setHud((h) => ({
      ...h,
      score: 0,
      wave: 1,
      lives: 3,
      phase: "RUN",
      record: false,
      banner: "",
    }));
  }, [buildWall, spawnStuck]);

  const launch = useCallback(() => {
    const b = balls.current.find((x) => x.stuck);
    if (!b) return;
    const a = (Math.random() * 0.7 - 0.35) * Math.PI; // ±35° off vertical
    b.vx = Math.sin(a) * speed.current;
    b.vy = -Math.cos(a) * speed.current;
    b.stuck = false;
    playSfx("blip");
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
        dragX.current = null; // keyboard takes over from mouse latch
        if (phase.current === "READY") reset();
      } else if (k === "arrowright" || k === "d") {
        e.preventDefault();
        held.current.right = true;
        dragX.current = null;
        if (phase.current === "READY") reset();
      } else if (k === " ") {
        e.preventDefault();
        if (phase.current === "READY" || phase.current === "DEAD") reset();
        else if (balls.current.some((b) => b.stuck)) launch();
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
  }, [reset, pause, launch]);

  /* pointer steering — mouse hovers steer, touch drags steer */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const toNorm = (clientX: number) => {
      const r = canvas.getBoundingClientRect();
      return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    };
    const down = (e: PointerEvent) => {
      dragX.current = toNorm(e.clientX);
      if (phase.current === "READY" || phase.current === "DEAD") reset();
      else if (balls.current.some((b) => b.stuck)) launch();
    };
    const move = (e: PointerEvent) => {
      // mouse steers on hover; touch/pen steer while held
      if (e.pointerType === "mouse" || dragX.current !== null) {
        dragX.current = toNorm(e.clientX);
      }
    };
    const up = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") dragX.current = null;
    };

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [reset, launch]);

  /* hi score on mount (deferred) */
  useEffect(() => {
    const t = window.setTimeout(
      () => setHud((h) => ({ ...h, hi: readHi("nr-hi-tracebreak") })),
      0,
    );
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(bannerTimer.current);
    };
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

    const waveSpeed = () =>
      WAVE_BASE_SPEED + (wave.current - 1) * SPEED_PER_WAVE;

    const applyPower = (kind: PowerKind) => {
      const now = performance.now();
      if (kind === "MTU") {
        mtuUntil.current = now + 12000;
      } else if (kind === "RATE") {
        rateUntil.current = now + 8000;
      } else {
        // MLT — packet flood: rotate clones off every live ball (cap 6)
        const src = balls.current.filter((b) => !b.stuck).slice(0, 3);
        for (const b of src) {
          if (balls.current.length >= 6) break;
          for (const ang of [-0.55, 0.55]) {
            if (balls.current.length >= 6) break;
            const cos = Math.cos(ang);
            const sin = Math.sin(ang);
            balls.current.push({
              x: b.x,
              y: b.y,
              vx: b.vx * cos - b.vy * sin,
              vy: b.vx * sin + b.vy * cos,
              stuck: false,
              trail: [],
            });
          }
        }
      }
    };

    const loseLife = () => {
      lives.current -= 1;
      drops.current = [];
      mtuUntil.current = 0;
      rateUntil.current = 0;
      if (lives.current > 0) {
        balls.current = [spawnStuck()];
        playSfx("err");
        flash(`SOCKET DOWN — ${lives.current} LEFT`);
        setHud((h) => ({ ...h, lives: lives.current }));
      } else {
        phase.current = "DEAD";
        playSfx("zap");
        const record = writeHi("nr-hi-tracebreak", score.current);
        setHud((h) => ({
          ...h,
          phase: "DEAD",
          lives: 0,
          hi: record ? score.current : h.hi,
          record,
        }));
      }
    };

    const step = (dt: number): void => {
      const now = performance.now();
      const mult = now < rateUntil.current ? 0.65 : 1;

      /* paddle */
      const P = paddle.current;
      P.w = now < mtuUntil.current ? PADDLE_W_MTU : PADDLE_W;
      if (dragX.current !== null) {
        P.x += (dragX.current - P.x) * Math.min(1, dt * 0.02);
        held.current.left = held.current.right = false;
      } else {
        // direct steering — 0.85 field-widths per second, crisp and readable
        if (held.current.left) P.x -= 0.00085 * dt;
        if (held.current.right) P.x += 0.00085 * dt;
      }
      P.x = Math.max(P.w / 2 + 0.01, Math.min(0.99 - P.w / 2, P.x));

      /* balls */
      for (const b of balls.current) {
        if (b.stuck) {
          b.x = P.x;
          b.y = PADDLE_Y - PADDLE_H / 2 - HS;
          continue;
        }
        b.x += b.vx * mult * dt;
        b.y += b.vy * mult * dt;

        /* side + top walls */
        if (b.x < HS) {
          b.x = HS;
          b.vx = Math.abs(b.vx);
          playSfx("blip");
        } else if (b.x > 1 - HS) {
          b.x = 1 - HS;
          b.vx = -Math.abs(b.vx);
          playSfx("blip");
        }
        if (b.y < HS + 0.01) {
          b.y = HS + 0.01;
          b.vy = Math.abs(b.vy);
          playSfx("blip");
        }

        /* paddle bounce — angle follows hit offset, speed ramps */
        if (
          b.vy > 0 &&
          b.y + HS >= PADDLE_Y - PADDLE_H / 2 &&
          b.y - HS <= PADDLE_Y + PADDLE_H / 2 &&
          b.x >= P.x - P.w / 2 - HS &&
          b.x <= P.x + P.w / 2 + HS
        ) {
          const rel = Math.max(-1, Math.min(1, (b.x - P.x) / (P.w / 2)));
          speed.current = Math.min(
            waveSpeed() * SPEED_CAP_MULT,
            speed.current * SPEEDUP_PER_HIT,
          );
          const vx = speed.current * rel * 1.15;
          const minVy = speed.current * 0.38;
          const vy = -Math.sqrt(Math.max(speed.current * speed.current - vx * vx, minVy * minVy));
          b.vx = vx;
          b.vy = vy;
          b.y = PADDLE_Y - PADDLE_H / 2 - HS - 0.001;
          playSfx("blip");
        }

        /* bricks */
        for (const br of bricks.current) {
          if (!br.alive) continue;
          if (
            b.x + HS > br.x &&
            b.x - HS < br.x + br.w &&
            b.y + HS > br.y &&
            b.y - HS < br.y + br.h
          ) {
            const overlapL = b.x + HS - br.x;
            const overlapR = br.x + br.w - (b.x - HS);
            const overlapT = b.y + HS - br.y;
            const overlapB = br.y + br.h - (b.y - HS);
            const minX = Math.min(overlapL, overlapR);
            const minY = Math.min(overlapT, overlapB);
            if (minX < minY) {
              b.vx = -b.vx;
              b.x += b.vx > 0 ? minX : -minX;
            } else {
              b.vy = -b.vy;
              b.y += b.vy > 0 ? minY : -minY;
            }
            br.hp -= 1;
            if (br.hp <= 0) {
              br.alive = false;
              score.current += br.wasDeny ? 30 : 10;
              playSfx("pickup");
              if (Math.random() < 0.22) {
                const kinds: PowerKind[] = ["MLT", "MTU", "RATE"];
                drops.current.push({
                  x: br.x + br.w / 2,
                  y: br.y + br.h / 2,
                  kind: kinds[Math.floor(Math.random() * kinds.length)],
                });
              }
            } else {
              playSfx("key");
            }
            break; // one brick per ball per frame
          }
        }
      }

      /* ball loss */
      const before = balls.current.length;
      balls.current = balls.current.filter((b) => b.y < 1.06);
      if (balls.current.length < before && balls.current.length === 0) {
        loseLife();
        if (phase.current === "DEAD") return;
      }

      /* drops */
      const catchable = P.w / 2 + HS;
      drops.current = drops.current.filter((d) => {
        d.y += 0.00022 * dt;
        if (d.y > 1.08) return false;
        if (
          d.y + HS >= PADDLE_Y - PADDLE_H / 2 &&
          d.y - HS <= PADDLE_Y + PADDLE_H / 2 &&
          Math.abs(d.x - P.x) <= catchable
        ) {
          score.current += 15;
          applyPower(d.kind);
          playSfx("pickup");
          return false;
        }
        return true;
      });

      /* trails */
      for (const b of balls.current) {
        if (b.stuck) continue;
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 10) b.trail.shift();
      }

      /* wave clear */
      if (bricks.current.every((br) => !br.alive) && phase.current === "RUN") {
        wave.current += 1;
        score.current += 100;
        speed.current = waveSpeed();
        buildWall(wave.current);
        balls.current = [spawnStuck()];
        drops.current = [];
        mtuUntil.current = 0;
        rateUntil.current = 0;
        playSfx("ok");
        flash(`FIREWALL REBUILT — WAVE ${wave.current}`);
        setHud((h) => ({ ...h, wave: wave.current, score: score.current }));
      }
    };

    const draw = () => {
      const w = canvas.width;
      const acidCol = acid.current;
      const now = performance.now();

      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, w, w);

      /* lane grid — hairlines */
      ctx.strokeStyle = "rgba(242,240,234,0.045)";
      ctx.lineWidth = Math.max(1, w / 720);
      for (let i = 1; i < 8; i++) {
        const x = (i / 8) * w;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, w);
        ctx.stroke();
      }

      /* uplink — dashed line behind the wall */
      ctx.strokeStyle = "rgba(242,240,234,0.18)";
      ctx.setLineDash([w * 0.01, w * 0.012]);
      ctx.beginPath();
      ctx.moveTo(0, w * 0.062);
      ctx.lineTo(w, w * 0.062);
      ctx.stroke();
      ctx.setLineDash([]);

      /* bricks */
      for (const br of bricks.current) {
        if (!br.alive) continue;
        const x = br.x * w;
        const y = br.y * w;
        const bw = br.w * w;
        const bh = br.h * w;
        const lw = Math.max(1.5, w * 0.004);
        if (br.hp >= 2) {
          // DENY rule — solid paper slab
          ctx.fillStyle = "rgba(242,240,234,0.92)";
          ctx.fillRect(x, y, bw, bh);
          ctx.fillStyle = "#0a0a0a";
          ctx.fillRect(x + bw * 0.42, y + bh * 0.35, bw * 0.16, bh * 0.3);
        } else {
          ctx.fillStyle = `rgba(${hexToRgb(acidCol)},0.12)`;
          ctx.fillRect(x, y, bw, bh);
          ctx.strokeStyle = acidCol;
          ctx.lineWidth = lw;
          ctx.strokeRect(x, y, bw, bh);
          if (br.wasDeny) {
            // cracked DENY — diagonal scar
            ctx.strokeStyle = "rgba(242,240,234,0.5)";
            ctx.beginPath();
            ctx.moveTo(x + bw * 0.25, y + bh);
            ctx.lineTo(x + bw * 0.7, y);
            ctx.stroke();
          }
        }
      }

      /* drops — falling chips */
      ctx.font = `${Math.floor(w * 0.02)}px monospace`;
      ctx.textAlign = "center";
      for (const d of drops.current) {
        const x = d.x * w;
        const y = d.y * w;
        const s = w * 0.026;
        ctx.fillStyle = acidCol;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(x - s * 0.18, y - s * 0.18, s * 0.36, s * 0.36);
        ctx.fillStyle = acidCol;
        ctx.fillText(d.kind, x, y + s * 1.4);
      }

      /* paddle — the socket */
      const P = paddle.current;
      const px = (P.x - P.w / 2) * w;
      const py = (PADDLE_Y - PADDLE_H / 2) * w;
      const pw = P.w * w;
      const ph = PADDLE_H * w;
      ctx.fillStyle = acidCol;
      ctx.fillRect(px, py, pw, ph);
      ctx.fillStyle = "#f2f0ea";
      const cap = Math.max(2, w * 0.006);
      ctx.fillRect(px, py, cap, ph);
      ctx.fillRect(px + pw - cap, py, cap, ph);

      /* balls + trails */
      const pulse = 0.75 + 0.25 * Math.sin(now / 140);
      for (const b of balls.current) {
        b.trail.forEach((t, i) => {
          const a = ((i + 1) / b.trail.length) * 0.2;
          const s = w * 0.014;
          ctx.fillStyle = `rgba(${hexToRgb(acidCol)},${a.toFixed(3)})`;
          ctx.fillRect(t.x * w - s / 2, t.y * w - s / 2, s, s);
        });
        const s = w * 0.018 * (b.stuck ? pulse : 1);
        ctx.fillStyle = acidCol;
        ctx.fillRect(b.x * w - s / 2, b.y * w - s / 2, s, s);
        ctx.fillStyle = "#0a0a0a";
        const c = s * 0.3;
        ctx.fillRect(b.x * w - c / 2, b.y * w - c / 2, c, c);
      }

      /* active effect chips — bottom-left readout */
      ctx.textAlign = "left";
      ctx.font = `${Math.floor(w * 0.018)}px monospace`;
      let chipY = w * 0.968;
      const mtuLeft = mtuUntil.current - now;
      const rateLeft = rateUntil.current - now;
      if (rateLeft > 0) {
        ctx.fillStyle = "rgba(242,240,234,0.6)";
        ctx.fillText(`RATE.LIMIT ${Math.ceil(rateLeft / 1000)}s`, w * 0.02, chipY);
        chipY -= w * 0.024;
      }
      if (mtuLeft > 0) {
        ctx.fillStyle = "rgba(242,240,234,0.6)";
        ctx.fillText(`MTU BOOST ${Math.ceil(mtuLeft / 1000)}s`, w * 0.02, chipY);
      }

      /* stuck hint */
      if (balls.current.some((b) => b.stuck) && phase.current === "RUN") {
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(242,240,234,0.5)";
        ctx.font = `${Math.floor(w * 0.018)}px monospace`;
        ctx.fillText(isTouchRef.current ? "TAP TO TRANSMIT" : "SPACE TO TRANSMIT", w / 2, w * 0.78);
      }
    };

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (!last) last = t;
      const dt = Math.min(48, t - last); // clamp tab-switch spikes
      last = t;

      if (phase.current === "RUN") step(dt);

      setHud((h) => {
        if (h.score === score.current && h.phase === phase.current) return h;
        return { ...h, score: score.current, phase: phase.current };
      });
      draw();
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [buildWall, spawnStuck, flash]);

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
          SOCKETS <span className="text-paper tabular-nums">{"■".repeat(hud.lives) || "—"}</span>
        </span>
        <span className="text-dim">
          HI <span className="text-paper tabular-nums">{hud.hi}</span>
        </span>
      </div>

      {/* banner strip */}
      <div className="flex items-center justify-between border border-t-0 border-line bg-ink px-3 py-1.5 font-mono text-[9px] tracking-[0.25em]">
        <span className="text-acid">{hud.banner || "\u00a0"}</span>
        <span className={hud.phase === "RUN" ? "text-acid" : hud.phase === "DEAD" ? "text-paper" : "text-dim"}>
          {hud.phase === "RUN"
            ? "STATUS: LIVE"
            : hud.phase === "PAUSE"
              ? "STATUS: HELD"
              : hud.phase === "DEAD"
                ? "STATUS: REFUSED"
                : "STATUS: BOOT"}
        </span>
      </div>

      {/* screen */}
      <div ref={wrapRef} className="relative mt-2 aspect-square w-full border border-line">
        <canvas
          ref={canvasRef}
          className="scanlines block h-full w-full touch-none"
          aria-label="Trace Break game screen"
        />
        {hud.phase === "READY" && (
          <Overlay onClick={reset}>
            <p className="font-display text-4xl tracking-wide text-paper md:text-5xl">TRACE.BREAK</p>
            <p className="mt-3 font-mono text-[10px] tracking-[0.3em] text-dim">
              {isTouch ? "TAP TO BOOT" : "SPACE OR CLICK TO BOOT"}
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
            <p className="mt-3 font-mono text-[10px] tracking-[0.3em] text-dim">SPACE TO RESUME</p>
          </Overlay>
        )}
        {hud.phase === "DEAD" && (
          <Overlay onClick={reset}>
            <p className="font-display text-4xl tracking-wide text-paper md:text-5xl">REFUSED</p>
            <p className="mt-2 font-mono text-[10px] tracking-[0.3em] text-dim">
              ALL SOCKETS DOWN — THE FIREWALL HOLDS
            </p>
            <p className="mt-3 font-mono text-[11px] tracking-[0.3em] text-dim">
              SCORE <span className="text-acid">{hud.score}</span> — HI{" "}
              <span className="text-paper">{hud.hi}</span>
              {hud.record && <span className="ml-2 text-acid">NEW RECORD</span>}
            </p>
            <button
              type="button"
              data-cursor="RETRY"
              className="mt-6 border border-acid px-4 py-2 font-mono text-[11px] tracking-[0.3em] text-acid transition-colors hover:bg-acid hover:text-ink"
            >
              [ RECONNECT ]
            </button>
          </Overlay>
        )}
      </div>
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

/* "#rrggbb" → "r,g,b" for rgba() compositing */
function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "215,255,63";
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}
