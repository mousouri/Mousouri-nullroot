"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { gsap } from "gsap";

interface MagneticOptions {
  /** 0..1 — how far the element chases the cursor */
  strength?: number;
  /** px radius around the element where the pull is active */
  radius?: number;
  enabled?: boolean;
}

/**
 * Magnetic hover: element eases toward the cursor while the pointer is
 * within `radius`, springs back on leave. Uses gsap.quickTo for jitter-free
 * per-frame writes instead of re-rendering on mousemove.
 *
 * Center math: getBoundingClientRect() includes the live transform, so we
 * subtract the current gsap x/y before measuring — keeps the pull stable
 * while the element is displaced.
 *
 * Disabled automatically for touch + reduced-motion (callers pass the flag).
 */
export function useMagnetic<T extends HTMLElement>({
  strength = 0.35,
  radius = 110,
  enabled = true,
}: MagneticOptions = {}): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    const xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });

    let raf = 0;
    let px = 0;
    let py = 0;

    const apply = () => {
      raf = 0;
      const curX = Number(gsap.getProperty(el, "x")) || 0;
      const curY = Number(gsap.getProperty(el, "y")) || 0;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2 - curX;
      const cy = rect.top + rect.height / 2 - curY;

      const dx = px - cx;
      const dy = py - cy;
      const dist = Math.hypot(dx, dy);

      if (dist < radius) {
        const falloff = 1 - dist / radius; // ease the pull near the edge
        xTo(dx * strength * falloff);
        yTo(dy * strength * falloff);
      } else {
        xTo(0);
        yTo(0);
      }
    };

    const onMove = (e: MouseEvent) => {
      px = e.clientX;
      py = e.clientY;
      if (!raf) raf = requestAnimationFrame(apply);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (raf) cancelAnimationFrame(raf);
      gsap.killTweensOf(el);
      gsap.set(el, { x: 0, y: 0 });
    };
  }, [strength, radius, enabled]);

  return ref;
}
