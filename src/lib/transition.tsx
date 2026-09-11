"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { EASE_OUT_EXPO, EASE_SHARP, DUR } from "@/lib/motion";
import { scrollStore } from "@/hooks/use-smooth-scroll";
import { playSfx } from "@/lib/sound";
import { parsePath, routeLabel } from "@/lib/router";

/* ============================================================
   Site-wide route transition.

   Every navigation runs the same brutalist wipe the old
   takeovers owned: an ink panel sweeps up from the bottom
   (acid hairline + route label riding its edge), the router
   pushes the real destination underneath while the screen is
   covered, then the panel keeps travelling upward — its EXIT
   animation is the reveal. One continuous upward gesture.

   Phases: idle → cover → (push under cover) → idle(=exit runs)
   Re-clicking mid-flight retargets or re-covers seamlessly:
   AnimatePresence promotes the exiting panel back to the tree.
   ============================================================ */

type Phase = "idle" | "cover";

interface TransitionState {
  phase: Phase;
  target: string | null;
}

let state: TransitionState = { phase: "idle", target: null };
const listeners = new Set<() => void>();

function setState(next: TransitionState) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Router handle, registered by the provider once hydrated. */
let routerRef: ReturnType<typeof useRouter> | null = null;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Entry point for every programmatic navigation on the site.
 * - idle           → cover the screen, push underneath, exit reveals
 * - already moving → retarget (rapid clicks stay one continuous wipe)
 * - reduced motion → push immediately, no theatre
 * - same path      → snap to top (the "logo" click)
 */
export function requestNavigation(path: string): void {
  if (typeof window === "undefined") return;

  if (!routerRef) {
    // Pre-hydration safety net — no wipe possible yet.
    window.location.href = path;
    return;
  }

  const current = window.location.pathname;
  if (path === current && state.phase === "idle") {
    scrollStore.lenis?.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
    return;
  }

  if (prefersReducedMotion()) {
    routerRef.push(path);
    window.scrollTo(0, 0);
    return;
  }

  setState({ phase: "cover", target: path });
}

/** Snap the document to the top invisibly (NEXT_FILE swaps). */
export function snapTop(): void {
  scrollStore.lenis?.scrollTo(0, { immediate: true });
  window.scrollTo(0, 0);
}

/* ---------- timing ---------- */

const COVER_MS = DUR.wipe * 1000; // matches the preloader's wipe duration
const PAINT_GRACE_MS = 140; // let the new page commit before revealing

export function TransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [, force] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    routerRef = router;
    return () => {
      routerRef = null;
    };
  }, [router]);

  // Re-render on store changes
  useEffect(() => subscribe(() => force((n) => n + 1)), []);

  // One-shot: legacy hash URLs (#/work/…) forward to the real route.
  useEffect(() => {
    const h = window.location.hash;
    if (h.startsWith("#/")) router.replace(h.slice(1));
  }, [router]);

  // cover → push → reveal timeline
  useEffect(() => {
    if (state.phase !== "cover" || !state.target) return;
    const target = state.target;
    let cancelled = false;
    const timers: number[] = [];

    // the panel owns a sound now — one whoosh per wipe
    playSfx("wipe");

    timers.push(
      window.setTimeout(() => {
        if (cancelled) return;
        router.push(target);
        // Screen is covered — park the document at the top so the new
        // page is always entered from its start.
        scrollStore.lenis?.scrollTo(0, { immediate: true });
        window.scrollTo(0, 0);
        // Two frames (new tree committed) + a grace beat, then drop the
        // panel — its exit animation reveals the new page.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            timers.push(
              window.setTimeout(() => {
                if (!cancelled) setState({ phase: "idle", target: null });
              }, PAINT_GRACE_MS),
            );
          }),
        );
      }, COVER_MS - 40),
    );

    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [state.phase, state.target, router, pathname]);

  // Safety valve — if the timeline stalls, never stay covered.
  useEffect(() => {
    if (state.phase === "idle") return;
    const t = window.setTimeout(
      () => setState({ phase: "idle", target: null }),
      2600,
    );
    return () => window.clearTimeout(t);
  }, [state.phase, state.target]);

  const route = state.target ? parsePath(state.target) : null;

  return (
    <>
      {children}

      <AnimatePresence>
        {state.phase === "cover" && (
          <motion.div
            key="route-wipe"
            className="pointer-events-none fixed inset-0 z-[160] bg-ink"
            initial={{ clipPath: "inset(100% 0 0 0)" }}
            animate={{ clipPath: "inset(0% 0 0 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: COVER_MS / 1000, ease: EASE_SHARP }}
          >
            {/* acid edge riding the wipe */}
            <motion.div
              className="absolute top-0 right-0 left-0 h-[3px] bg-acid"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
            {/* route label stamped on the panel */}
            <motion.div
              className="absolute top-[38%] left-1/2 -translate-x-1/2 border border-acid bg-ink px-4 py-2 font-mono text-[10px] tracking-[0.4em] whitespace-nowrap text-acid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: EASE_OUT_EXPO, delay: 0.18 }}
            >
              {route ? routeLabel(route) : "~/…"}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
