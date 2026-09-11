"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const GLYPHS = "!<>-_\\/[]{}=+*^?#@$%&";

interface QueueItem {
  to: string;
  start: number;
  end: number;
  char?: string;
}

interface ScrambleOptions {
  /** multiplier on decode tempo */
  speed?: number;
  /** decode on mount / when the caller's trigger flips */
  auto?: boolean;
  /** skip the theatre entirely (reduced motion) */
  reduced?: boolean;
  onComplete?: () => void;
}

/**
 * Scramble-decode text engine. Each character resolves at a pseudo-random
 * frame inside its window, so the word "lands" left-to-right but unevenly —
 * reads as decryption, not a loading bar. Spaces never scramble.
 *
 * The rAF loop lives inside `scramble()` (not an effect), so re-triggering
 * from a hover handler or a delayed timer simply re-arms the animation.
 */
export function useTextScramble(
  text: string,
  { speed = 1, auto = false, reduced = false, onComplete }: ScrambleOptions = {},
) {
  const [display, setDisplay] = useState("");
  const rafRef = useRef(0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const scramble = useCallback(() => {
    if (reduced) {
      setDisplay(text);
      onCompleteRef.current?.();
      return;
    }

    // per-character reveal window — deterministic-ish chaos
    const queue: QueueItem[] = text.split("").map((ch, i) => {
      if (ch === " ") {
        return { to: " ", start: i * 1.6, end: i * 1.6 + 1, char: " " };
      }
      const rand = Math.random();
      const start = i * 1.6 + 4 + Math.floor(rand * 10);
      return {
        to: ch,
        start,
        end: start + 6 + Math.floor(rand * 24),
      };
    });

    cancelAnimationFrame(rafRef.current);
    let frame = 0;

    const tick = () => {
      let out = "";
      let done = 0;
      frame += speed;

      for (const q of queue) {
        if (q.char === " ") {
          out += " ";
          done++;
          continue;
        }
        if (frame >= q.end) {
          done++;
          out += q.to;
        } else if (frame >= q.start) {
          // live glyph cycling — re-roll for the flicker
          if (!q.char || Math.random() < 0.28) {
            q.char = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          }
          out += q.char;
        }
      }

      setDisplay(out);

      if (done === queue.length) {
        setDisplay(text);
        onCompleteRef.current?.();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [text, reduced, speed]);

  // teardown
  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // auto-trigger (mount or when the caller un-gates it)
  useEffect(() => {
    if (!auto || reduced) return;
    const raf = requestAnimationFrame(() => scramble());
    return () => cancelAnimationFrame(raf);
  }, [auto, reduced, scramble]);

  return { display, scramble };
}
