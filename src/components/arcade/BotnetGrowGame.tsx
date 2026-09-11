"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEnvironment } from "@/hooks/use-environment";
import { readHi, writeHi } from "@/lib/games";
import { playSfx } from "@/lib/sound";

/* ============================================================
   BOTNET.GROW — agar with a botnet accent. You are a stray
   process on a subnet. Absorb idle hosts to grow your footprint
   toward 100% saturation. The AV scanners patrol the wire —
   touch one and it scrubs mass off you. Drop under 1% and you
   are quarantined. Big botnets are slow botnets. Plan routes.
   ============================================================ */

type Phase = "READY" | "RUN" | "PAUSE" | "DEAD" | "WON";

interface Host {
  x: number;
  y: number;
  golden: boolean;
}
interface AV {
  x: number;
  y: number;
  tx: number;
  ty: number;
  r: number;
}

const WORLD = 1.4; // world is WORLD × WORLD units
const VIEW = 0.72; // viewport shows VIEW world units across
const START_MASS = 3;
const GOAL_MASS = 100;
const HOST_COUNT = 80;
const AV_COUNT = 3;

function randWorld(margin = 0.05) {
  return margin + Math.random() * (WORLD - margin * 2);
}

export function BotnetGrowGame() {
  const { isTouch } = useEnvironment();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const player = useRef({ x: WORLD / 2, y: WORLD / 2, mass: START_MASS, invuln: 0 });
  const hosts = useRef<Host[]>([]);
  const avs = useRef<AV[]>([]);
  const steer = useRef<{ x: number; y: number } | null>(null);
  const phase = useRef<Phase>("READY");
  const peak = useRef(START_MASS);
  const flashMsg = useRef<{ text: string; at: number }>({ text: "", at: 0 });
  const acid = useRef("#d7ff3f");
  const isTouchRef = useRef(false);

  useEffect(() => {
    isTouchRef.current = isTouch;
  }, [isTouch]);

  const [hud, setHud] = useState<{
    sat: number;
    peak: number;
    score: number;
    phase: Phase;
    hi: number;
    record: boolean;
  }>({ sat: START_MASS, peak: START_MASS, score: 0, phase: "READY", hi: 0, record: false });

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
    player.current = { x: WORLD / 2, y: WORLD / 2, mass: START_MASS, invuln: 0 };
    hosts.current = Array.from({ length: HOST_COUNT }, () => ({
      x: randWorld(),
      y: randWorld(),
      golden: Math.random() < 0.06,
    }));
    avs.current = Array.from({ length: AV_COUNT }, () => {
      const a = {
        x: randWorld(0.2),
        y: randWorld(0.2),
        tx: randWorld(0.2),
        ty: randWorld(0.2),
        r: 0.036,
      };
      return a;
    });
    peak.current = START_MASS;
    phase.current = "RUN";
    setHud((h) => ({ ...h, sat: START_MASS, peak: START_MASS, score: 0, phase: "RUN", record: false }));
    playSfx("boot");
  }, []);

  const pause = useCallback(() => {
    if (phase.current === "RUN") phase.current = "PAUSE";
    else if (phase.current === "PAUSE") phase.current = "RUN";
    setHud((h) => ({ ...h, phase: h.phase === "PAUSE" ? "RUN" : h.phase }));
  }, []);

  const die = useCallback(() => {
    phase.current = "DEAD";
    playSfx("zap");
    const score = Math.floor(peak.current * 10);
    const record = writeHi("nr-hi-botnetgrow", score);
    setHud((h) => ({ ...h, phase: "DEAD", score, hi: record ? score : h.hi, record }));
  }, []);

  const win = useCallback(() => {
    phase.current = "WON";
    playSfx("ok");
    const score = Math.floor(100 * 10);
    const record = writeHi("nr-hi-botnetgrow", score);
    setHud((h) => ({ ...h, phase: "WON", score, hi: record ? score : h.hi, record }));
  }, []);

  /* ---------- input ---------- */
  useEffect(() => {
    const editable = (el: EventTarget | null) => {
      const e = el as HTMLElement | null;
      return !!e && (e.tagName === "INPUT" || e.tagName === "TEXTAREA" || !!e.isContentEditable);
    };
    const onKey = (e: KeyboardEvent) => {
      if (editable(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === " ") {
        e.preventDefault();
        if (phase.current === "READY" || phase.current === "DEAD" || phase.current === "WON") reset();
        else pause();
      } else if (k === "r") {
        reset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reset, pause]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const toWorld = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      // screen → world offset relative to player-centered camera
      const scale = r.width / VIEW;
      const camX = Math.max(VIEW / 2, Math.min(WORLD - VIEW / 2, player.current.x));
      const camY = Math.max(VIEW / 2, Math.min(WORLD - VIEW / 2, player.current.y));
      return {
        x: camX + (e.clientX - r.left - r.width / 2) / scale,
        y: camY + (e.clientY - r.top - r.height / 2) / scale,
      };
    };
    const down = (e: PointerEvent) => {
      if (phase.current === "READY" || phase.current === "DEAD" || phase.current === "WON") {
        reset();
        return;
      }
      steer.current = toWorld(e);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === "mouse" || steer.current) steer.current = toWorld(e);
    };
    const up = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") steer.current = null;
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [reset]);

  /* hi score on mount */
  useEffect(() => {
    const t = window.setTimeout(() => setHud((h) => ({ ...h, hi: readHi("nr-hi-botnetgrow") })), 0);
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

    const radius = () => 0.016 + Math.sqrt(player.current.mass) * 0.011;
    const speed = () => Math.max(0.00017, 0.00040 * Math.pow(0.03 / radius(), 0.4));

    const step = (dt: number) => {
      const p = player.current;
      const now = performance.now();
      if (now < p.invuln) p.invuln = p.invuln; // noop keeps ref live in closure

      /* steering — seek the pointer */
      if (steer.current) {
        const dx = steer.current.x - p.x;
        const dy = steer.current.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d > 0.01) {
          const sp = speed() * dt;
          p.x += (dx / d) * sp;
          p.y += (dy / d) * sp;
        }
      }
      const r = radius();
      p.x = Math.max(r, Math.min(WORLD - r, p.x));
      p.y = Math.max(r, Math.min(WORLD - r, p.y));

      /* hosts — absorb */
      hosts.current = hosts.current.filter((hst) => {
        if (Math.hypot(hst.x - p.x, hst.y - p.y) < r) {
          p.mass += hst.golden ? 4 : 1.2;
          peak.current = Math.max(peak.current, p.mass);
          if (hst.golden) {
            flashMsg.current = { text: "ROOT HOST +4% MASS", at: now };
            playSfx("ok");
          } else {
            playSfx("pickup");
          }
          return false;
        }
        return true;
      });
      while (hosts.current.length < HOST_COUNT) {
        hosts.current.push({ x: randWorld(), y: randWorld(), golden: Math.random() < 0.06 });
      }

      /* AVs — patrol, scrub on contact */
      for (const av of avs.current) {
        const dx = av.tx - av.x;
        const dy = av.ty - av.y;
        const d = Math.hypot(dx, dy);
        if (d < 0.02) {
          av.tx = randWorld(0.08);
          av.ty = randWorld(0.08);
        } else {
          const sp = 0.00026 * dt;
          av.x += (dx / d) * sp;
          av.y += (dy / d) * sp;
        }
        if (now >= p.invuln && Math.hypot(av.x - p.x, av.y - p.y) < av.r + r) {
          p.mass = Math.max(0.4, p.mass * 0.8);
          p.invuln = now + 1500;
          flashMsg.current = { text: "AV SCAN — 20% MASS SCRUBBED", at: now };
          playSfx("err");
          /* knock away from the scanner */
          const kx = p.x - av.x;
          const ky = p.y - av.y;
          const kd = Math.max(0.001, Math.hypot(kx, ky));
          p.x += (kx / kd) * 0.05;
          p.y += (ky / kd) * 0.05;
        }
      }

      if (p.mass < 1) {
        die();
        return;
      }
      if (p.mass >= GOAL_MASS) {
        win();
        return;
      }
    };

    const draw = (now: number) => {
      const w = canvas.width;
      const acidCol = acid.current;
      const scale = w / VIEW;
      const p = player.current;
      const camX = Math.max(VIEW / 2, Math.min(WORLD - VIEW / 2, p.x));
      const camY = Math.max(VIEW / 2, Math.min(WORLD - VIEW / 2, p.y));
      const ox = (camX - VIEW / 2) * scale;
      const oy = (camY - VIEW / 2) * scale;
      const sx = (wx: number) => wx * scale - ox;
      const sy = (wy: number) => wy * scale - oy;

      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, w, w);

      /* subnet grid */
      ctx.strokeStyle = "rgba(242,240,234,0.05)";
      ctx.lineWidth = 1;
      const gridStep = 0.1 * scale;
      const gx0 = -(ox % gridStep);
      for (let x = gx0; x < w; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, w);
        ctx.stroke();
      }
      const gy0 = -(oy % gridStep);
      for (let y = gy0; y < w; y += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      /* world bounds */
      ctx.strokeStyle = "rgba(242,240,234,0.25)";
      ctx.lineWidth = Math.max(1.5, w * 0.004);
      ctx.strokeRect(sx(0), sy(0), WORLD * scale, WORLD * scale);

      /* idle hosts */
      for (const hst of hosts.current) {
        const hx = sx(hst.x);
        const hy = sy(hst.y);
        if (hx < -10 || hx > w + 10 || hy < -10 || hy > w + 10) continue;
        const s = hst.golden ? w * 0.014 : w * 0.008;
        ctx.fillStyle = hst.golden ? "rgba(242,240,234,0.95)" : "rgba(242,240,234,0.35)";
        ctx.fillRect(hx - s / 2, hy - s / 2, s, s);
      }

      /* AV scanners — paper rings with an X */
      for (const av of avs.current) {
        const ax = sx(av.x);
        const ay = sy(av.y);
        const ar = av.r * scale;
        ctx.strokeStyle = "rgba(242,240,234,0.85)";
        ctx.lineWidth = Math.max(1.5, w * 0.004);
        ctx.beginPath();
        ctx.arc(ax, ay, ar, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ax - ar * 0.5, ay - ar * 0.5);
        ctx.lineTo(ax + ar * 0.5, ay + ar * 0.5);
        ctx.moveTo(ax + ar * 0.5, ay - ar * 0.5);
        ctx.lineTo(ax - ar * 0.5, ay + ar * 0.5);
        ctx.stroke();
        /* faint scan radius */
        ctx.strokeStyle = "rgba(242,240,234,0.1)";
        ctx.beginPath();
        ctx.arc(ax, ay, ar * 1.7, 0, Math.PI * 2);
        ctx.stroke();
      }

      /* player node */
      const pr = radius() * scale;
      const px = sx(p.x);
      const py = sy(p.y);
      const blink = now < p.invuln && Math.floor(now / 120) % 2 === 0;
      ctx.fillStyle = blink ? "rgba(242,240,234,0.5)" : acidCol;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0a0a0a";
      ctx.font = `${Math.floor(w * 0.016)}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText(`${Math.floor(p.mass)}%`, px, py + w * 0.006);

      /* flash message */
      if (now - flashMsg.current.at < 1100) {
        ctx.fillStyle = "rgba(242,240,234,0.85)";
        ctx.font = `${Math.floor(w * 0.018)}px monospace`;
        ctx.fillText(flashMsg.current.text, w / 2, w * 0.09);
      }

      /* saturation bar */
      const frac = Math.min(1, p.mass / GOAL_MASS);
      ctx.fillStyle = "rgba(242,240,234,0.14)";
      ctx.fillRect(0, w - w * 0.014, w, w * 0.014);
      ctx.fillStyle = acidCol;
      ctx.fillRect(0, w - w * 0.014, w * frac, w * 0.014);
    };

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (!last) last = t;
      const dt = Math.min(48, t - last);
      last = t;

      if (phase.current === "RUN") step(dt);

      setHud((h) => {
        const sat = Math.floor(player.current.mass);
        if (h.sat === sat && h.phase === phase.current) return h;
        return { ...h, sat, peak: Math.floor(peak.current), phase: phase.current };
      });
      draw(t);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [die, win]);

  return (
    <div className="mx-auto w-full max-w-[560px]">
      {/* HUD */}
      <div className="flex items-center justify-between border border-line bg-ink px-3 py-2 font-mono text-[10px] tracking-[0.25em]">
        <span className="text-dim">
          SATURATION <span className="text-acid tabular-nums">{hud.sat}%</span>
        </span>
        <span className="text-dim">
          PEAK <span className="text-paper tabular-nums">{hud.peak}%</span>
        </span>
        <span className="text-dim">
          SCORE <span className="text-acid tabular-nums">{hud.score}</span>
        </span>
        <span className="text-dim">
          HI <span className="text-paper tabular-nums">{hud.hi}</span>
        </span>
      </div>

      <div className="flex items-center justify-between border border-t-0 border-line bg-ink px-3 py-1.5 font-mono text-[9px] tracking-[0.25em]">
        <span className="text-acid">{hud.sat < 10 ? "GROW OR GET QUARANTINED" : "\u00a0"}</span>
        <span className={hud.phase === "RUN" ? "text-acid" : "text-dim"}>
          {hud.phase === "RUN" ? "STATUS: SPREADING" : hud.phase === "PAUSE" ? "STATUS: HELD" : "STATUS: BOOT"}
        </span>
      </div>

      {/* screen */}
      <div ref={wrapRef} className="relative mt-2 aspect-square w-full border border-line">
        <canvas ref={canvasRef} className="scanlines block h-full w-full touch-none" aria-label="Botnet Grow game screen" />
        {hud.phase === "READY" && (
          <Overlay onClick={reset}>
            <p className="font-display text-4xl tracking-wide text-paper md:text-5xl">BOTNET.GROW</p>
            <p className="mt-3 max-w-[38ch] font-mono text-[10px] leading-relaxed tracking-[0.2em] text-dim">
              ABSORB IDLE HOSTS TOWARD 100% SATURATION. AVOID THE AV
              SCANNERS — THEY SCRUB 20% OF YOUR MASS PER CONTACT.
              UNDER 1% MEANS QUARANTINE.
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
            <p className="font-display text-4xl tracking-wide text-paper md:text-5xl">QUARANTINED</p>
            <p className="mt-2 font-mono text-[10px] leading-relaxed tracking-[0.2em] text-dim">
              mass below 1% — the EDR walked your process
              <br />
              off the wire and into the report queue
            </p>
            <p className="mt-3 font-mono text-[11px] tracking-[0.25em] text-dim">
              PEAK SATURATION <span className="text-acid">{hud.peak}%</span>
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
              [ RESPAWN ]
            </button>
          </Overlay>
        )}
        {hud.phase === "WON" && (
          <Overlay onClick={reset}>
            <p className="font-display text-4xl tracking-wide text-acid md:text-5xl">OWNED</p>
            <p className="mt-2 font-mono text-[10px] leading-relaxed tracking-[0.2em] text-dim">
              100% SATURATION — the subnet signs your name now
              <br />
              (this is a game. touch grass.)
            </p>
            <p className="mt-3 font-mono text-[11px] tracking-[0.25em] text-dim">
              HI <span className="text-paper">{hud.hi}</span>
              {hud.record && <span className="ml-2 text-acid">NEW RECORD</span>}
            </p>
            <button
              type="button"
              data-cursor="RETRY"
              className="mt-6 border border-acid px-4 py-2 font-mono text-[11px] tracking-[0.3em] text-acid transition-colors hover:bg-acid hover:text-ink"
            >
              [ NEXT SUBNET ]
            </button>
          </Overlay>
        )}
      </div>
      <p className="mt-2 font-mono text-[9px] tracking-[0.3em] text-dim/60">
        {isTouch ? "DRAG TO STEER — SPACE PAUSE" : "MOUSE STEERS — SPACE PAUSE — R RESET"}
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
