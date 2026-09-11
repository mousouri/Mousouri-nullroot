"use client";

import { useEffect, useRef } from "react";
import { useInView } from "framer-motion";
import { useTextScramble } from "@/hooks/use-text-scramble";

interface ScrambleTextProps {
  text: string;
  className?: string;
  /** decode when scrolled into view */
  auto?: boolean;
  /** re-decode on hover */
  retrigger?: boolean;
  reduced?: boolean;
  /** ms before auto decode fires */
  delay?: number;
  onComplete?: () => void;
}

/**
 * Renders text through the scramble-decode engine.
 * `auto` + `retrigger` cover both trigger modes from the motion spec.
 */
export function ScrambleText({
  text,
  className,
  auto = false,
  retrigger = false,
  reduced = false,
  delay = 0,
  onComplete,
}: ScrambleTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-8% 0px" });
  const { display, scramble } = useTextScramble(text, { reduced, onComplete });

  useEffect(() => {
    if (!auto || reduced || !inView) return;
    if (delay > 0) {
      const t = window.setTimeout(() => scramble(), delay);
      return () => window.clearTimeout(t);
    }
    // rAF hop keeps the first paint of the animation out of the effect body
    const raf = requestAnimationFrame(() => scramble());
    return () => cancelAnimationFrame(raf);
  }, [auto, reduced, inView, delay, scramble]);

  return (
    <span
      ref={ref}
      className={className}
      onMouseEnter={retrigger && !reduced ? scramble : undefined}
      aria-label={text}
    >
      {/* aria-label carries the real string; glyphs are decoration.
          auto mode: hidden until decode starts; manual mode: real text
          is always visible, hover merely re-scrambles it. */}
      {reduced ? text : display || (auto ? "\u00A0" : text)}
    </span>
  );
}
