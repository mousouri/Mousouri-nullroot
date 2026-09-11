"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEnvironment } from "@/hooks/use-environment";
import { readHi, writeHi } from "@/lib/games";
import { playSfx } from "@/lib/sound";

/* ============================================================
   PORT.KNOCK — whack-a-mole on a server rack. Ports flip OPEN:
   knock them before they close. Some racks hide honeypots —
   knocking those trips the tripwire and burns a shell. Chain
   clean knocks for combo bonus. 45 seconds on the clock.
   ============================================================ */

type Phase = "READY" | "RUN" | "PAUSE" | "DEAD";
type SlotState = "CLOSED" | "OPEN" | "TRAP";

interface Slot {
  state: SlotState;
  until: number; // performance.now() deadline
  born: number;
  golden: boolean;
  port: string;
  flash: number; // hit-flash timestamp
}

const ROUND_MS = 45_000;
const GRID = 4;
const PORTS = [
  "22", "80", "443", "1337",
  "3000", "3306", "5432", "8080",
  "53", "993", "587", "1900",
  "2222", "6379", "27017", "4444",
];

const TRAP_CHANCE = 0.16;
const GOLDEN_CHANCE = 0.05;

export function PortKnockGame() {
  const { isTouch } = useEnvironment();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const slots = useRef<Slot[]>(
    PORTS.map((port) => ({
      state: "CLOSED" as SlotState,
      until: 0,
      born: 0,
      golden: false,
      port,
      flash: 0,
    })),
  );
  const phase = useRef<Phase>("READY");
  const score = useRef(0);
  const combo = useRef(0);
  const bestCombo = useRef(0);
  const hits = useRef(0);
  const misses = useRef(0);
  const trapHits = useRef(0);
  const shells = useRef(3);
  const timeLeft = useRef(ROUND_MS);
  const spawnAcc = useRef(0);
  const bannerTimer = useRef(0);
  const acid = useRef("#d7ff3f");

  const [hud, setHud] = useState<{
    score: number;
    time: number;
    shells: number;
    combo: number;
    phase: Phase;
    hi: number;
    record: boolean;
    banner: string;
    acc: number;
    bestCombo: number;
  }>({ score: 0, time: ROUND_MS, shells: 3, combo: 0, phase: "READY", hi: 0, record: false, banner: "", acc: 0, bestCombo: 0 });

  const flash = useCallback((text: string) => {
    window.clearTimeout(bannerTimer.current);
    setHud((h) => ({ ...h, banner: text }));
    bannerTimer.current = window.setTimeout(() => setHud((h) => ({ ...h, banner: "" })), 1800);
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

  /* ---------- lifecycle ---------- */
  const reset = useCallback(() => {
    slots.current.forEach((s) => {
      s.state = "CLOSED";
      s.until = 0;
      s.golden = false;
      s.flash = 0;
    });
    score.current = 0;
    combo.current = 0;
    bestCombo.current = 0;
    hits.current = 0;
    misses.current = 0;
    trapHits.current = 0;
    shells.current = 3;
    timeLeft.current = ROUND_MS;
    spawnAcc.current = 0;
    phase.current = "RUN";
    setHud((h) => ({ ...h, score: 0, time: ROUND_MS, shells: 3, combo: 0, phase: "RUN", record: false, banner: "" }));
  }, []);

  const pause = useCallback(() => {
    if (phase.current === "RUN") phase.current = "PAUSE";
    else if (phase.current === "PAUSE") phase.current = "RUN";
    setHud((h) => ({ ...h, phase: phase.current }));
  }, []);

  /* ---------- knock ---------- */
  const knock = useCallback(
    (idx: number) => {
      const s = slots.current[idx];
      if (!s || s.state === "CLOSED") {
        // whiff — spammers lose combo and bleed points
        combo.current = 0;
        score.current = Math.max(0, score.current - 5);
        playSfx("click");
        return;
      }
      if (s.state === "TRAP") {
        s.state = "CLOSED";
        s.flash = performance.now();
        combo.current = 0;
        trapHits.current += 1;
        score.current = Math.max(0, score.current - 25);
        shells.current -= 1;
        playSfx("err");
        flash("HONEYPOT TRIPPED — TRIPWIRE LOGGED");
        setHud((h) => ({ ...h, shells: shells.current, combo: 0 }));
        if (shells.current <= 0) {
          phase.current = "DEAD";
          playSfx("zap");
          const record = writeHi("nr-hi-portknock", score.current);
          setHud((h) => ({ ...h, phase: "DEAD", hi: record ? score.current : h.hi, record }));
        }
        return;
      }
      // OPEN port — clean knock
      const wasGolden = s.golden;
      s.state = "CLOSED";
      s.flash = performance.now();
      combo.current += 1;
      bestCombo.current = Math.max(bestCombo.current, combo.current);
      hits.current += 1;
      const gain = (wasGolden ? 50 : 10) + Math.min(40, (combo.current - 1) * 2);
      score.current += gain;
      if (wasGolden) {
        timeLeft.current = Math.min(ROUND_MS, timeLeft.current + 2000);
        flash("ROOT PORT — +50 & 2s BACK ON THE CLOCK");
      }
      playSfx("pickup");
    },
    [flash],
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
      if (k === " ") {
        e.preventDefault();
        if (phase.current === "READY" || phase.current === "DEAD") reset();
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
    const down = (e: PointerEvent) => {
      if (phase.current === "READY" || phase.current === "DEAD") {
        reset();
        return;
      }
      if (phase.current !== "RUN") return;
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      const c = Math.floor(x * GRID);
      const row = Math.floor(y * GRID);
      if (c < 0 || c >= GRID || row < 0 || row >= GRID) return;
      knock(row * GRID + c);
    };
    canvas.addEventListener("pointerdown", down);
    return () => canvas.removeEventListener("pointerdown", down);
  }, [reset, knock]);

  /* hi score on mount */
  useEffect(() => {
    const t = window.setTimeout(() => setHud((h) => ({ ...h, hi: readHi("nr-hi-portknock") })), 0);
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

    const endRun = () => {
      phase.current = "DEAD";
      playSfx("ok");
      const record = writeHi("nr-hi-portknock", score.current);
      setHud((h) => ({ ...h, phase: "DEAD", hi: record ? score.current : h.hi, record }));
    };

    const spawn = (elapsed: number) => {
      const open = slots.current.filter((s) => s.state === "OPEN").length;
      const maxOpen = 2 + Math.floor(elapsed / 15000); // 2 → 5 over the round
      if (open >= maxOpen) return;
      const closed = slots.current.filter((s) => s.state === "CLOSED");
      if (!closed.length) return;
      const s = closed[Math.floor(Math.random() * closed.length)];
      if (Math.random() < TRAP_CHANCE) {
        s.state = "TRAP";
        s.until = performance.now() + 1600;
      } else {
        s.state = "OPEN";
        s.golden = Math.random() < GOLDEN_CHANCE;
        s.until = performance.now() + Math.max(640, 1450 - elapsed * 14);
      }
      s.born = performance.now();
    };

    const step = (dt: number) => {
      const now = performance.now();
      const elapsed = ROUND_MS - timeLeft.current;
      timeLeft.current -= dt;

      spawnAcc.current += dt;
      const interval = Math.max(300, 780 - elapsed * 10);
      while (spawnAcc.current >= interval) {
        spawnAcc.current -= interval;
        spawn(elapsed);
      }

      for (const s of slots.current) {
        if (s.state === "CLOSED") continue;
        if (now >= s.until) {
          if (s.state === "OPEN") {
            misses.current += 1;
            combo.current = 0;
            setHud((h) => ({ ...h, combo: 0 }));
          }
          s.state = "CLOSED";
        }
      }

      if (timeLeft.current <= 0) {
        timeLeft.current = 0;
        endRun();
      }
    };

    const draw = () => {
      const w = canvas.width;
      const acidCol = acid.current;
      const now = performance.now();

      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, w, w);

      /* rack frame + labels */
      const pad = w * 0.03;
      const cell = (w - pad * 2) / GRID;
      const gap = cell * 0.08;

      for (let i = 0; i < GRID * GRID; i++) {
        const s = slots.current[i];
        const cx = pad + (i % GRID) * cell;
        const cy = pad + Math.floor(i / GRID) * cell;
        const x = cx + gap;
        const y = cy + gap;
        const cw = cell - gap * 2;
        const ch = cell - gap * 2;

        if (s.state === "OPEN" || s.state === "TRAP") {
          const frac = Math.max(0, Math.min(1, (s.until - now) / (s.state === "TRAP" ? 1600 : 1400)));
          const pop = s.state === "TRAP" ? 1 : 0.92 + 0.08 * Math.sin(now / 90);
          const size = cw * pop;
          const ox = x + (cw - size) / 2;
          const oy = y + (ch - size) / 2;

          if (s.state === "TRAP") {
            ctx.fillStyle = "rgba(242,240,234,0.92)";
            ctx.fillRect(ox, oy, size, size);
            ctx.fillStyle = "#0a0a0a";
            ctx.font = `${Math.floor(cell * 0.2)}px monospace`;
            ctx.textAlign = "center";
            ctx.fillText("TRAP", ox + size / 2, oy + size * 0.62);
          } else {
            ctx.fillStyle = s.golden ? "rgba(242,240,234,0.94)" : acidCol;
            ctx.fillRect(ox, oy, size, size);
            ctx.fillStyle = "#0a0a0a";
            ctx.font = `${Math.floor(cell * (s.golden ? 0.24 : 0.3))}px monospace`;
            ctx.textAlign = "center";
            ctx.fillText(s.golden ? "ROOT" : `:${s.port}`, ox + size / 2, oy + size * 0.6);
            /* expiry ring */
            ctx.strokeStyle = s.golden ? "#0a0a0a" : acidCol;
            ctx.lineWidth = Math.max(1.5, w * 0.004);
            ctx.beginPath();
            ctx.arc(ox + size / 2, oy + size / 2, size * 0.42, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
            ctx.stroke();
          }
        } else {
          /* closed — dark slot */
          ctx.fillStyle = "rgba(242,240,234,0.05)";
          ctx.fillRect(x, y, cw, ch);
          ctx.strokeStyle = "rgba(242,240,234,0.14)";
          ctx.lineWidth = Math.max(1, w * 0.002);
          ctx.strokeRect(x, y, cw, ch);
          ctx.fillStyle = "rgba(242,240,234,0.28)";
          ctx.font = `${Math.floor(cell * 0.16)}px monospace`;
          ctx.textAlign = "center";
          ctx.fillText(`:${s.port}`, x + cw / 2, y + ch * 0.62);
        }

        /* hit flash */
        if (now - s.flash < 140) {
          ctx.fillStyle = `rgba(${acidCol === "#d7ff3f" ? "215,255,63" : "255,255,255"},${(0.5 * (1 - (now - s.flash) / 140)).toFixed(2)})`;
          ctx.fillRect(x, y, cw, ch);
        }
      }

      /* combo meter — right edge ticks */
      const comboTicks = Math.min(10, Math.ceil(combo.current / 2));
      ctx.textAlign = "left";
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = i < comboTicks ? acidCol : "rgba(242,240,234,0.12)";
        ctx.fillRect(w - pad - w * 0.012, w * 0.08 + i * w * 0.03, w * 0.008, w * 0.02);
      }

      /* hint */
      const elapsedHint = ROUND_MS - timeLeft.current;
      if (phase.current === "RUN" && elapsedHint < 2600) {
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(242,240,234,0.5)";
        ctx.font = `${Math.floor(w * 0.02)}px monospace`;
        ctx.fillText("KNOCK THE OPEN PORTS — AVOID THE HONEY", w / 2, w * 0.975);
      }
    };

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (!last) last = t;
      const dt = Math.min(48, t - last);
      last = t;

      if (phase.current === "RUN") step(dt);

      setHud((h) => {
        const time = Math.ceil(timeLeft.current / 1000);
        const total = hits.current + misses.current + trapHits.current;
        const acc = total ? Math.round((hits.current / total) * 100) : 0;
        if (h.score === score.current && h.time === time && h.phase === phase.current && h.acc === acc)
          return h;
        return { ...h, score: score.current, time, phase: phase.current, acc, bestCombo: bestCombo.current };
      });
      draw();
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [reset, flash]);

  return (
    <div className="mx-auto w-full max-w-[560px]">
      {/* HUD */}
      <div className="flex items-center justify-between border border-line bg-ink px-3 py-2 font-mono text-[10px] tracking-[0.25em]">
        <span className="text-dim">
          SCORE <span className="text-acid tabular-nums">{hud.score}</span>
        </span>
        <span className="text-dim">
          T-{String(hud.time).padStart(2, "0")}s
        </span>
        <span className="text-dim">
          SHELLS <span className="text-paper tabular-nums">{"■".repeat(hud.shells) || "—"}</span>
        </span>
        <span className="text-dim">
          COMBO <span className="text-paper tabular-nums">x{hud.combo}</span>
        </span>
        <span className="text-dim">
          HI <span className="text-paper tabular-nums">{hud.hi}</span>
        </span>
      </div>

      <div className="flex items-center justify-between border border-t-0 border-line bg-ink px-3 py-1.5 font-mono text-[9px] tracking-[0.25em]">
        <span className="text-acid">{hud.banner || "\u00a0"}</span>
        <span className={hud.phase === "RUN" ? "text-acid" : hud.phase === "DEAD" ? "text-paper" : "text-dim"}>
          {hud.phase === "RUN" ? "STATUS: KNOCKING" : hud.phase === "PAUSE" ? "STATUS: HELD" : hud.phase === "DEAD" ? "STATUS: CLOSED" : "STATUS: BOOT"}
        </span>
      </div>

      {/* screen */}
      <div ref={wrapRef} className="relative mt-2 aspect-square w-full border border-line">
        <canvas
          ref={canvasRef}
          className="scanlines block h-full w-full touch-none cursor-crosshair"
          aria-label="Port Knock game screen"
        />
        {hud.phase === "READY" && (
          <Overlay onClick={reset}>
            <p className="font-display text-4xl tracking-wide text-paper md:text-5xl">PORT.KNOCK</p>
            <p className="mt-3 max-w-[36ch] font-mono text-[10px] leading-relaxed tracking-[0.2em] text-dim">
              45S ON THE CLOCK. KNOCK OPEN PORTS, CHAIN COMBOS, AND DO NOT
              TOUCH THE HONEYPOTS — THEY LOG EVERYTHING.
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
            <p className="font-display text-4xl tracking-wide text-paper md:text-5xl">
              {hud.shells <= 0 ? "TRIPPED" : "UPLINK CLOSED"}
            </p>
            <p className="mt-2 font-mono text-[10px] tracking-[0.3em] text-dim">
              {hud.shells <= 0 ? "ALL SHELLS BURNED — IDS HAS YOUR FACE" : "SCAN WINDOW EXPIRED"}
            </p>
            <p className="mt-3 font-mono text-[11px] tracking-[0.25em] text-dim">
              SCORE <span className="text-acid">{hud.score}</span> — ACC <span className="text-paper">{hud.acc}%</span> — BEST
              COMBO <span className="text-paper">x{hud.bestCombo}</span>
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
              [ RESCAN ]
            </button>
          </Overlay>
        )}
      </div>
      <p className="mt-2 hidden font-mono text-[9px] tracking-[0.3em] text-dim/60 sm:block">
        {isTouch ? "TAP CELLS — SPACE PAUSE" : "CLICK CELLS — SPACE PAUSE — R RESET"}
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
