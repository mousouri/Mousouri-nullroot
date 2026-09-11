"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Module-level scroll store — lets any component read Lenis velocity
 * (marquee) or pause scrolling (overlay) without prop drilling.
 */
export const scrollStore: {
  lenis: Lenis | null;
  velocity: number;
} = {
  lenis: null,
  velocity: 0,
};

export function stopScroll() {
  scrollStore.lenis?.stop();
  document.documentElement.classList.add("lenis-stopped");
}

export function startScroll() {
  scrollStore.lenis?.start();
  document.documentElement.classList.remove("lenis-stopped");
}

export function scrollToEl(target: string | HTMLElement) {
  const lenis = scrollStore.lenis;
  if (lenis) {
    lenis.scrollTo(target, {
      duration: 1.5,
      // hard-out quart — matches the site's decelerating motion language
      easing: (t: number) => 1 - Math.pow(1 - t, 4),
    });
  } else {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    el?.scrollIntoView({ behavior: "auto" });
  }
}

/**
 * Instant snap to the top of the document — used by route
 * transitions and NEXT_FILE swaps where the jump must be
 * invisible (screen covered) rather than animated.
 */
export function snapTop() {
  scrollStore.lenis?.scrollTo(0, { immediate: true });
  window.scrollTo(0, 0);
}

/**
 * Boots Lenis and hard-syncs it with the GSAP ticker so ScrollTrigger's
 * scrubbed timelines and Lenis inertia share one clock:
 *   gsap.ticker drives lenis.raf, ScrollTrigger.update fires on lenis scroll.
 * No-op when reduced-motion is on (native scroll, ScrollTrigger still works).
 */
export function useSmoothScroll(enabled: boolean, reducedMotion: boolean) {
  useEffect(() => {
    if (reducedMotion) return;

    const lenis = new Lenis({
      lerp: 0.1, // inertia strength — lower = floatier
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
    });
    scrollStore.lenis = lenis;

    const onScroll = (e: Lenis) => {
      scrollStore.velocity = e.velocity;
      ScrollTrigger.update();
    };
    lenis.on("scroll", onScroll);

    // one clock to rule them: gsap ticker (ms) → lenis.raf
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    if (!enabled) lenis.stop(); // frozen while preloader runs

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      scrollStore.lenis = null;
      scrollStore.velocity = 0;
    };
  }, [reducedMotion]);

  // gate: freeze until the preloader finishes
  useEffect(() => {
    if (reducedMotion) return;
    const lenis = scrollStore.lenis;
    if (!lenis) return;
    if (enabled) lenis.start();
    else lenis.stop();
  }, [enabled, reducedMotion]);
}
