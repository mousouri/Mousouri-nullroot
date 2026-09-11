"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readHi, writeHi } from "@/lib/games";
import { playSfx } from "@/lib/sound";

/* ============================================================
   KERNEL.STORM — missile command for the syscall layer. Packets
   rain toward your three cores; intercept from the launcher and
   detonate mid-air. Every kill explodes too — chain the sky.
   Ammo is finite per wave. When the last core dies, the kernel
   panics and takes your score with it.
   ============================================================ */

type Phase = "READY" | "RUN" | "PAUSE" | "WAVEEND" | "DEAD";

interface Packet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: Array<{ x: number; y: number }>;
}
interface Boom {
  x: number;
  y: number;
  r: number;
  maxR: number;
  born: number;
  chain: number;
  dead: boolean;
}
interface Shot {
  x: number;
  y: number;
  tx: number;
  ty: number;
}

const CORE_X = [0.18, 0.5, 0.82];
const CORE_Y = 0.9;
const CORE_R = 0.032;
const LAUNCHER = { x: 0.5, y: 0.965 };
const AMMO_PER_WAVE = 12;

export function KernelStormGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const packets = useRef<Packet[]>([]);
  const booms = useRef<Boom[]>([]);
  const shots = useRef<Shot[]>([]);
  const cores = useRef([true, true, true]);
  const phase = useRef<Phase>("READY");
  const wave = useRef(1);
  const score = useRef(0);
  const ammo = useRef(AMMO_PER_WAVE);
  const aim = useRef({ x: 0.5, y: 0.4 });
  const waveClearAt = useRef(0);
  const bannerTimer = useRef(0);
  const acid = useRef("#d7ff3f");

  const [hud, setHud] = useState<{
    score: number;
    wave: number;
    ammo: number;
    phase: Phase;
    hi: number;
    record: boolean;
    banner: string;
    cores: number;
  }>({ score: 0, wave: 1, ammo: AMMO_PER_WAVE, phase: "READY", hi: 0, record: false, banner: "", cores: 3 });

  const flash = useCallback((text: string) => {
    window.clearTimeout(bannerTimer.current);
    setHud((h) => ({ ...h, banner: text }));
    bannerTimer.current = window.setTimeout(() => setHud((h) => ({ ...h, banner: "" })), 1600);
  }, []);

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

  /* ---------- waves ---------- */
  const spawnWave = useCallback((wv: number) => {
    const count = Math.min(22, 3 + wv * 2);
    const speed = 0.00005 + wv * 0.000011;
    const out: Packet[] = [];
    for (let i = 0; i < count; i++) {
      const targetX = CORE_X[Math.floor(Math.random() * 3)] + (Math.random() - 0.5) * 0.16;
      const startX = Math.random();
      const totalY = CORE_Y;
      const vy = speed * (0.85 + Math.random() * 0.4);
      const t = totalY / vy;
      out.push({
        x: startX,
        y: -0.02 - Math.random() * 0.12,
        vx: (targetX - startX) / t,
        vy,
        trail: [],
      });
    }
    packets.current = out;
    ammo.current = AMMO_PER_WAVE;
  }, []);

  const reset = useCallback(() => {
    packets.current = [];
    booms.current = [];
    shots.current = [];
    cores.current = [true, true, true];
    wave.current = 1;
    score.current = 0;
    spawnWave(1);
    phase.current = "RUN";
    setHud((h) => ({ ...h, score: 0, wave: 1, ammo: AMMO_PER_WAVE, phase: "RUN", record: false, banner: "", cores: 3 }));
  }, [spawnWave]);

  const pause = useCallback(() => {
    if (phase.current === "RUN") phase.current = "PAUSE";
    else if (phase.current === "PAUSE") phase.current = "RUN";
    setHud((h) => ({ ...h, phase: phase.current }));
  }, []);

  const fire = useCallback(
    (tx: number, ty: number) => {
      if (phase.current === "READY" || phase.current === "DEAD") {
        reset();
        return;
      }
      if (phase.current === "WAVEEND") {
        wave.current += 1;
        spawnWave(wave.current);
        phase.current = "RUN";
        setHud((h) => ({ ...h, wave: wave.current, ammo: AMMO_PER_WAVE, phase: "RUN" }));
        return;
      }
      if (phase.current !== "RUN") return;
      if (ammo.current <= 0) {
        flash("TUBES DRY — WAIT FOR THE WAVE TO BREAK");
        playSfx("err");
        return;
      }
      ammo.current -= 1;
      shots.current.push({ x: LAUNCHER.x, y: LAUNCHER.y, tx, ty: Math.min(ty, 0.85) });
      playSfx("blip");
    },
    [reset, spawnWave, flash],
  );

  /* ---------- input ---------- */
  useEffect(() => {
    const editable = (el: EventTarget | null) => {
      const e = el as HTMLElement | null;
      return !!e && (e.tagName === "INPUT" || e.tagName === "TEXTAREA" || !!e.isContentEditable);
    };
    const onKey = (e: KeyboardEvent) => {
      if (editable(e.target)) return;
      if (e.key === " ") {
        e.preventDefault();
        if (phase.current === "RUN" || phase.current === "PAUSE") pause();
        else fire(aim.current.x, aim.current.y);
      } else if (e.key.toLowerCase() === "r") {
        reset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pause, fire, reset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const move = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      aim.current = {
        x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
        y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
      };
    };
    const down = (e: PointerEvent) => {
      move(e);
      fire(aim.current.x, aim.current.y);
    };
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerdown", down);
    return () => {
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerdown", down);
    };
  }, [fire]);

  /* hi score on mount */
  useEffect(() => {
    const t = window.setTimeout(() => setHud((h) => ({ ...h, hi: readHi("nr-hi-kernelstorm") })), 0);
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

    const explode = (x: number, y: number, chain: number) => {
      booms.current.push({ x, y, r: 0.004, maxR: 0.085, born: performance.now(), chain, dead: false });
    };

    const killCore = (i: number) => {
      cores.current[i] = false;
      playSfx("zap");
      flash(`CORE ${i + 1} FLATTENED`);
      setHud((h) => ({ ...h, cores: cores.current.filter(Boolean).length }));
      if (cores.current.every((c) => !c)) {
        phase.current = "DEAD";
        const record = writeHi("nr-hi-kernelstorm", score.current);
        setHud((h) => ({ ...h, phase: "DEAD", hi: record ? score.current : h.hi, record }));
      }
    };

    const step = (dt: number) => {
      const now = performance.now();

      /* interceptor shots */
      shots.current = shots.current.filter((s) => {
        const dx = s.tx - s.x;
        const dy = s.ty - s.y;
        const dist = Math.hypot(dx, dy);
        const stepLen = 0.0016 * dt;
        if (dist <= stepLen) {
          explode(s.tx, s.ty, 1);
          playSfx("click");
          return false;
        }
        s.x += (dx / dist) * stepLen;
        s.y += (dy / dist) * stepLen;
        return true;
      });

      /* explosions grow, then fade; kill packets inside */
      for (const b of booms.current) {
        const age = now - b.born;
        b.r = age < 380 ? 0.004 + (b.maxR * age) / 380 : b.maxR * Math.max(0, 1 - (age - 380) / 620);
        if (age > 1000) b.dead = true;
      }
      booms.current = booms.current.filter((b) => !b.dead);

      /* packets fall; check booms + cores */
      const survivors: Packet[] = [];
      for (const p of packets.current) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 12) p.trail.shift();

        let killed = false;
        for (const b of booms.current) {
          if (Math.hypot(p.x - b.x, p.y - b.y) <= b.r) {
            const chain = b.chain + 1;
            score.current += 15 + (chain - 1) * 10;
            explode(p.x, p.y, chain);
            playSfx("pickup");
            /* splitting packets — wave 3+ spreads the storm */
            if (wave.current >= 3 && p.y > 0.3 && p.y < 0.5 && Math.random() < 0.3) {
              for (const spread of [-0.00003, 0.00003]) {
                survivors.push({
                  x: p.x,
                  y: p.y,
                  vx: p.vx + spread,
                  vy: p.vy * 0.9,
                  trail: [],
                });
              }
            }
            killed = true;
            break;
          }
        }
        if (killed) continue;

        /* reached the ground — core check */
        if (p.y >= CORE_Y) {
          let hit = -1;
          CORE_X.forEach((cx, i) => {
            if (cores.current[i] && Math.abs(p.x - cx) < CORE_R) hit = i;
          });
          if (hit >= 0) killCore(hit);
          playSfx("key");
          continue;
        }
        if (p.y < 1.1) survivors.push(p);
      }
      packets.current = survivors;

      /* wave clear */
      if (
        phase.current === "RUN" &&
        packets.current.length === 0 &&
        shots.current.length === 0 &&
        booms.current.length === 0
      ) {
        if (!waveClearAt.current) {
          waveClearAt.current = now;
          const bonus = ammo.current * 5 + wave.current * 50;
          score.current += bonus;
          phase.current = "WAVEEND";
          flash(`WAVE ${wave.current} HELD — +${bonus} — CLICK FOR WAVE ${wave.current + 1}`);
          playSfx("ok");
          setHud((h) => ({ ...h, score: score.current, phase: "WAVEEND" }));
        }
      } else {
        waveClearAt.current = 0;
      }
    };

    const draw = (now: number) => {
      const w = canvas.width;
      const acidCol = acid.current;

      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, w, w);

      /* ground */
      ctx.fillStyle = "rgba(242,240,234,0.08)";
      ctx.fillRect(0, CORE_Y * w + w * 0.045, w, w);

      /* skyline hairlines */
      ctx.strokeStyle = "rgba(242,240,234,0.05)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 12; i++) {
        const x = (i / 12) * w;
        ctx.beginPath();
        ctx.moveTo(x, CORE_Y * w + w * 0.045);
        ctx.lineTo(x, w);
        ctx.stroke();
      }

      /* cores */
      CORE_X.forEach((cx, i) => {
        const s = w * CORE_R * 2;
        if (cores.current[i]) {
          ctx.fillStyle = acidCol;
          ctx.fillRect(cx * w - s / 2, CORE_Y * w - s / 2 + w * 0.02, s, s * 0.72);
          ctx.fillStyle = "#0a0a0a";
          ctx.fillRect(cx * w - s * 0.15, CORE_Y * w - s * 0.15 + w * 0.02, s * 0.3, s * 0.3);
        } else {
          ctx.strokeStyle = "rgba(242,240,234,0.4)";
          ctx.lineWidth = Math.max(1.5, w * 0.004);
          ctx.strokeRect(cx * w - s / 2, CORE_Y * w - s / 2 + w * 0.02, s, s * 0.72);
        }
      });

      /* launcher */
      ctx.fillStyle = "rgba(242,240,234,0.85)";
      ctx.fillRect(LAUNCHER.x * w - w * 0.012, LAUNCHER.y * w, w * 0.024, w * 0.03);

      /* packets + trails */
      for (const p of packets.current) {
        p.trail.forEach((tp, i) => {
          const a = ((i + 1) / p.trail.length) * 0.25;
          const s = w * 0.006;
          ctx.fillStyle = `rgba(242,240,234,${a.toFixed(3)})`;
          ctx.fillRect(tp.x * w - s / 2, tp.y * w - s / 2, s, s);
        });
        const s = w * 0.013;
        ctx.fillStyle = "rgba(242,240,234,0.92)";
        ctx.fillRect(p.x * w - s / 2, p.y * w - s / 2, s, s);
      }

      /* interceptor shots */
      ctx.strokeStyle = acidCol;
      ctx.lineWidth = Math.max(1.5, w * 0.003);
      for (const s of shots.current) {
        ctx.beginPath();
        ctx.moveTo(s.x * w, s.y * w);
        ctx.lineTo(s.tx * w, s.ty * w);
        ctx.stroke();
        ctx.fillStyle = acidCol;
        const s2 = w * 0.008;
        ctx.fillRect(s.x * w - s2 / 2, s.y * w - s2 / 2, s2, s2);
      }

      /* explosions — square rings (brutalist blast radius) */
      for (const b of booms.current) {
        const half = b.r * w;
        const alpha = Math.min(1, b.r / (b.maxR * 0.5));
        ctx.strokeStyle = `rgba(${acidToRgb(acidCol)},${(alpha * 0.9).toFixed(3)})`;
        ctx.lineWidth = Math.max(1.5, w * 0.004);
        ctx.strokeRect(b.x * w - half, b.y * w - half, half * 2, half * 2);
        ctx.strokeStyle = `rgba(242,240,234,${(alpha * 0.5).toFixed(3)})`;
        const half2 = half * 0.55;
        ctx.strokeRect(b.x * w - half2, b.y * w - half2, half2 * 2, half2 * 2);
        if (b.chain > 1) {
          ctx.fillStyle = `rgba(242,240,234,${alpha.toFixed(3)})`;
          ctx.font = `${Math.floor(w * 0.014)}px monospace`;
          ctx.textAlign = "center";
          ctx.fillText(`x${b.chain}`, b.x * w, b.y * w - half - w * 0.012);
        }
      }

      /* aim reticle */
      if (phase.current === "RUN") {
        const { x, y } = aim.current;
        ctx.strokeStyle = acidCol;
        ctx.lineWidth = Math.max(1, w * 0.002);
        const r = w * 0.016;
        ctx.strokeRect(x * w - r, y * w - r, r * 2, r * 2);
        ctx.beginPath();
        ctx.moveTo(x * w - r * 1.7, y * w);
        ctx.lineTo(x * w - r, y * w);
        ctx.moveTo(x * w + r, y * w);
        ctx.lineTo(x * w + r * 1.7, y * w);
        ctx.stroke();
      }

      /* wave banner between waves */
      if (phase.current === "WAVEEND") {
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(242,240,234,0.65)";
        ctx.font = `${Math.floor(w * 0.02)}px monospace`;
        ctx.fillText("SECTOR HELD — CLICK TO CALL THE NEXT WAVE", w / 2, w * 0.5);
      }
    };

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (!last) last = t;
      const dt = Math.min(48, t - last);
      last = t;

      if (phase.current === "RUN") step(dt);

      setHud((h) => {
        if (h.score === score.current && h.ammo === ammo.current && h.phase === phase.current) return h;
        return { ...h, score: score.current, ammo: ammo.current, phase: phase.current };
      });
      draw(t);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [flash]);

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
          TUBES <span className="text-paper tabular-nums">{hud.ammo}</span>
        </span>
        <span className="text-dim">
          CORES <span className="text-paper tabular-nums">{"■".repeat(hud.cores) || "—"}</span>
        </span>
        <span className="text-dim">
          HI <span className="text-paper tabular-nums">{hud.hi}</span>
        </span>
      </div>

      <div className="flex items-center justify-between border border-t-0 border-line bg-ink px-3 py-1.5 font-mono text-[9px] tracking-[0.25em]">
        <span className="text-acid">{hud.banner || "\u00a0"}</span>
        <span className={hud.phase === "RUN" ? "text-acid" : hud.phase === "DEAD" ? "text-paper" : "text-dim"}>
          {hud.phase === "RUN"
            ? "STATUS: STORM"
            : hud.phase === "PAUSE"
              ? "STATUS: HELD"
              : hud.phase === "WAVEEND"
                ? "STATUS: HELD"
                : hud.phase === "DEAD"
                  ? "STATUS: PANIC"
                  : "STATUS: BOOT"}
        </span>
      </div>

      {/* screen */}
      <div ref={wrapRef} className="relative mt-2 aspect-square w-full border border-line">
        <canvas
          ref={canvasRef}
          className="scanlines block h-full w-full touch-none cursor-crosshair"
          aria-label="Kernel Storm game screen"
        />
        {hud.phase === "READY" && (
          <Overlay onClick={reset}>
            <p className="font-display text-4xl tracking-wide text-paper md:text-5xl">KERNEL.STORM</p>
            <p className="mt-3 max-w-[38ch] font-mono text-[10px] leading-relaxed tracking-[0.2em] text-dim">
              PACKETS FALL. INTERCEPT THEM MID-AIR — EVERY KILL
              DETONATES AND CHAINS. PROTECT ALL THREE CORES. AMMO
              RESETS EACH WAVE; WASTED TUBES ARE BONUS SCORE.
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
            <p className="font-display text-4xl tracking-wide text-paper md:text-5xl">KERNEL PANIC</p>
            <p className="mt-2 font-mono text-[10px] leading-relaxed tracking-[0.2em] text-dim">
              [ 3.0.0-mousouri ] end Kernel panic — not syncing:
              attempted to kill init
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
              [ REBOOT ]
            </button>
          </Overlay>
        )}
      </div>
      <p className="mt-2 font-mono text-[9px] tracking-[0.3em] text-dim/60">
        CLICK / TAP — INTERCEPT AT POINT — SPACE PAUSE — R RESET
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
