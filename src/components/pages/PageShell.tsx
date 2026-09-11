"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { useEnvironment } from "@/hooks/use-environment";
import { navigate, parentRoute, useRoute, type Route } from "@/lib/router";

/* ============================================================
   PageShell — the shared frame for every non-home page. These
   are real destinations now (own URL, own scroll, own palette),
   not overlays: the document scrolls, Lenis owns it, and the
   browser back button behaves natively. The shell keeps the
   file-path breadcrumb bar, palette flip (paper for case files
   and readers), ESC-to-parent and a [ BACK ] control.
   ============================================================ */

interface PageShellProps {
  /** file-path breadcrumb, e.g. ~/work/pothole-vision — CASE_FILE */
  crumb: string;
  /** paper = ink-on-light palette flip (case files, readers) */
  palette?: "ink" | "paper";
  /** where BACK/ESC lands; defaults to the route's parent */
  backTo?: Route;
  backLabel?: string;
  children: React.ReactNode;
}

export function PageShell({
  crumb,
  palette = "ink",
  backTo,
  backLabel = "BACK",
  children,
}: PageShellProps) {
  const route = useRoute();
  const backRef = useRef<HTMLButtonElement>(null);
  const { reducedMotion } = useEnvironment();
  const target = backTo ?? parentRoute(route);

  // ESC returns to the parent route + focus lands on the control
  useEffect(() => {
    backRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") navigate(target);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target]);

  const paper = palette === "paper";
  const border = paper ? "border-ink/20" : "border-line";
  const bg = paper ? "bg-paper text-ink" : "bg-ink text-paper";

  return (
    <div className={`relative z-10 min-h-screen ${bg}`}>
      {/* breadcrumb bar — sticky under the global nav (h-12) */}
      <header
        className={`sticky top-12 z-30 flex items-center justify-between border-b ${border} ${bg} px-4 py-3 md:px-8`}
      >
        <p
          className={`font-mono text-[10px] tracking-[0.25em] ${
            paper ? "text-ink/60" : "text-dim"
          }`}
        >
          {crumb}
        </p>
        <button
          ref={backRef}
          onClick={() => navigate(target)}
          data-cursor={backLabel}
          className={`border px-3 py-1 font-mono text-[10px] tracking-[0.25em] transition-colors duration-150 ${
            paper
              ? "border-ink text-ink hover:bg-ink hover:text-paper"
              : "border-paper text-paper hover:bg-paper hover:text-ink"
          }`}
        >
          [ {backLabel} ]
        </button>
      </header>

      <motion.div
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE_OUT_EXPO, delay: 0.05 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
