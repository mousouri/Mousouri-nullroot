"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EASE_SHARP, DUR } from "@/lib/motion";
import { useTextScramble } from "@/hooks/use-text-scramble";
import { playSfx } from "@/lib/sound";

const BOOT_LINES = [
  "> INIT KERNEL ................ OK",
  "> MOUNT /dev/portfolio ....... OK",
  "> LOAD THREAT FEED ........... OK",
  "> DECRYPT IDENTITY ........... OK",
];

const NAME = "MOUSOURI";

/**
 * Boot sequence preloader:
 * 1. terminal lines print (staggered)
 * 2. monospace % counter runs 0→100 on a rAF
 * 3. the site name scramble-resolves
 * 4. hard-edged double panel wipe out (ink panel, then paper panel,
 *    90ms offset) — no soft crossfade anywhere.
 * Reduced motion: 250ms fade, no theatre.
 */
export function Preloader({ onComplete }: { onComplete: () => void }) {
  const [pct, setPct] = useState(0);
  const [visibleLines, setVisibleLines] = useState(0);
  const [phase, setPhase] = useState<"run" | "exit">("run");
  const doneRef = useRef(false);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // CRT power-on hum — speaks only when a prior gesture unlocked audio
    playSfx("boot");
  }, []);

  const { display: nameDisplay, scramble } = useTextScramble(NAME, { reduced: false });

  useEffect(() => {
    if (reduced.current) {
      const t = window.setTimeout(() => onComplete(), 250);
      return () => window.clearTimeout(t);
    }

    // % counter — ease toward 100 so the last digits decelerate
    const start = performance.now();
    const DURATION = 1150;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      const eased = 1 - Math.pow(1 - t, 3);
      setPct(Math.round(eased * 100));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // boot lines
    const timers = BOOT_LINES.map((_, i) =>
      window.setTimeout(() => setVisibleLines(i + 1), 140 + i * 170),
    );

    // scramble the name once lines start printing
    const nameTimer = window.setTimeout(() => scramble(), 250);

    // exit
    const exitTimer = window.setTimeout(() => setPhase("exit"), DURATION + 250);

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(window.clearTimeout);
      window.clearTimeout(nameTimer);
      window.clearTimeout(exitTimer);
    };
  }, []);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete();
  };

  return (
    <AnimatePresence>
      {phase === "run" || phase === "exit" ? (
        <div className="fixed inset-0 z-[300]" aria-hidden={phase === "exit"}>
          {/* panel B — paper underlay, wipes second */}
          <motion.div
            className="absolute inset-0 bg-paper"
            initial={{ y: 0 }}
            animate={phase === "exit" ? { y: "-101%" } : { y: 0 }}
            transition={{ duration: DUR.wipe, ease: EASE_SHARP, delay: 0.09 }}
            style={{ pointerEvents: "none" }}
          />
          {/* panel A — ink, holds content, wipes first */}
          <motion.div
            className="absolute inset-0 bg-ink flex flex-col justify-between p-6 md:p-10"
            initial={{ y: 0 }}
            animate={phase === "exit" ? { y: "-101%" } : { y: 0 }}
            transition={{ duration: DUR.wipe, ease: EASE_SHARP }}
            onAnimationComplete={() => {
              if (phase === "exit") finish();
            }}
          >
            <div className="flex justify-between font-mono text-[10px] tracking-widest text-dim">
              <span>MOUSOURI.SYS — BOOTLOADER</span>
              <span>SECURE BOOT: VERIFIED</span>
            </div>

            {/* boot lines */}
            <div className="font-mono text-xs md:text-sm leading-loose">
              {BOOT_LINES.slice(0, visibleLines).map((line) => (
                <p key={line} className="text-dim">
                  {line}
                </p>
              ))}
            </div>

            <div className="flex items-end justify-between gap-6">
              {/* identity resolving from noise */}
              <div className="min-w-0">
                <p className="font-mono text-[10px] tracking-[0.3em] text-dim mb-2">
                  IDENTITY.MAP
                </p>
                <h1 className="font-display text-[13vw] md:text-[7vw] leading-none tracking-wide text-paper whitespace-nowrap overflow-hidden">
                  {nameDisplay || "\u00A0"}
                </h1>
              </div>
              {/* counter */}
              <p className="font-mono text-[16vw] md:text-[7vw] leading-none text-acid tabular-nums">
                {String(pct).padStart(3, "0")}%
              </p>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
