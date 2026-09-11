"use client";

import { useEffect, useRef } from "react";
import { useBooted } from "@/lib/boot";
import { getOverlay } from "@/lib/shell";
import { IDLE_MS, useSaver, triggerSaver, dismissSaver } from "@/lib/screensaver";
import { trackSaver, trackGod } from "@/lib/achievements";

/* ============================================================
   ROOT.SAVER — idle at 90s and the machine starts dreaming.
   A phosphor starfield drifts under a huge dim clock; any
   input wakes it. Auto-idle is disabled for reduced-motion
   users (manual `screensaver` still works — static stars).

   This component also owns the site's oldest easter egg:
   the konami code. ↑↑↓↓←→←→BA → 10 seconds of GOD MODE.
   ============================================================ */

const KONAMI = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a",
];

export function Screensaver() {
  const booted = useBooted();
  const active = useSaver();
  const konamiBuf = useRef<string[]>([]);
  const godTimer = useRef<number | null>(null);

  /* ---------- idle engine + konami listener ---------- */
  useEffect(() => {
    if (!booted) return;
    let idleTimer = 0;
    let reduced = false;

    const armIdle = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        // never fire under an overlay, in a hidden tab, or for reduced motion
        if (reduced || getOverlay() !== "none" || document.visibilityState !== "visible") {
          armIdle();
          return;
        }
        triggerSaver();
      }, IDLE_MS);
    };
    armIdle();

    const onActivity = () => {
      if (activeRef.current) dismissSaver();
      armIdle();
    };
    const onKey = (e: KeyboardEvent) => {
      // konami buffer — checked before the generic activity handler
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      konamiBuf.current.push(key);
      if (konamiBuf.current.length > KONAMI.length) konamiBuf.current.shift();
      if (konamiBuf.current.join(",") === KONAMI.join(",")) {
        konamiBuf.current = [];
        document.documentElement.classList.add("godmode");
        trackGod();
        if (godTimer.current) window.clearTimeout(godTimer.current);
        godTimer.current = window.setTimeout(() => {
          document.documentElement.classList.remove("godmode");
        }, 10_000);
      }
      onActivity();
    };

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced = mq.matches;
    const onMq = () => {
      reduced = mq.matches;
    };
    mq.addEventListener?.("change", onMq);

    const opts: AddEventListenerOptions = { passive: true };
    window.addEventListener("pointermove", onActivity, opts);
    window.addEventListener("pointerdown", onActivity, opts);
    window.addEventListener("wheel", onActivity, opts);
    window.addEventListener("touchstart", onActivity, opts);
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(idleTimer);
      if (godTimer.current) window.clearTimeout(godTimer.current);
      mq.removeEventListener?.("change", onMq);
      window.removeEventListener("pointermove", onActivity);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("wheel", onActivity);
      window.removeEventListener("touchstart", onActivity);
      window.removeEventListener("keydown", onKey);
    };
  }, [booted]);

  const activeRef = useRef(active);
  activeRef.current = active;

  /* ---------- the dream overlay ---------- */
  if (!active) return null;
  return <SaverCanvas />;
}

function SaverCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    trackSaver(); // first dream counts — the trophy engine dedupes
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    let acid = "#b8ff2e";
    const readAcid = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue("--acid").trim();
      if (v) acid = v;
    };
    readAcid();

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const N = 150;
    const stars = Array.from({ length: N }, () => ({
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: Math.random() * 0.9 + 0.1,
    }));

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    const themeOb = new MutationObserver(readAcid);
    themeOb.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    let t = 0;
    const draw = () => {
      t += 1;
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;

      // phosphor stars — slow warp outward
      for (const s of stars) {
        if (!reduced) s.z -= 0.0016;
        if (s.z <= 0.02) {
          s.x = (Math.random() - 0.5) * 2;
          s.y = (Math.random() - 0.5) * 2;
          s.z = 1;
        }
        const px = cx + (s.x / s.z) * cx * 0.9;
        const py = cy + (s.y / s.z) * cy * 0.9;
        const size = Math.max(0.5, (1 - s.z) * 2.4);
        ctx.fillStyle = acid;
        ctx.globalAlpha = Math.min(1, (1 - s.z) * 1.4) * 0.85;
        ctx.fillRect(px, py, size, size);
      }
      ctx.globalAlpha = 1;

      // scanline hum
      ctx.fillStyle = "rgba(255,255,255,0.02)";
      ctx.fillRect(0, ((t * 2) % (h + 120)) - 120, w, 90);

      raf = requestAnimationFrame(draw);
    };
    draw();

    const clockEl = document.getElementById("saver-clock");
    const clockIv = window.setInterval(() => {
      if (clockEl) {
        clockEl.textContent = new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(new Date());
      }
    }, 1000);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(clockIv);
      window.removeEventListener("resize", resize);
      themeOb.disconnect();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[168] cursor-none bg-[#050505]"
      data-cursor=""
      onPointerDown={() => dismissSaver()}
      aria-label="Screensaver — any input dismisses"
    >
      <canvas ref={canvasRef} className="absolute inset-0 opacity-70" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
        <p
          id="saver-clock"
          className="font-display text-[22vw] leading-none text-paper/10 tabular-nums select-none md:text-[16vw]"
        >
          --:--:--
        </p>
        <p className="font-mono text-[10px] tracking-[0.5em] text-dim">
          ROOT.SAVER — ANY INPUT WAKES THE MACHINE
        </p>
      </div>
    </div>
  );
}
