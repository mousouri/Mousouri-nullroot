"use client";

import { useEffect, useRef, useState } from "react";

interface TypewriterProps {
  lines: string[];
  /** ms before typing starts */
  startDelay?: number;
  /** base ms per char; jitter ±60% is applied per tick */
  speed?: number;
  className?: string;
  reduced?: boolean;
  /** show the `$ ` prompt prefix */
  prompt?: boolean;
}

interface TypeTick {
  line: number;
  char: number;
  done: boolean;
}

/**
 * Terminal-style typing with irregular cadence (never metronomic).
 *
 * Single source of truth: a {line, char} tick. The visible rows are always
 * DERIVED from that tick on render — no incremental array patching, so a
 * stale closure or double-mounted loop can never leave phantom rows behind.
 * The effect keys on the joined line text, not the array identity, so an
 * inline `lines={[...]}` literal in the parent can't restart the sequence.
 */
export function Typewriter({
  lines,
  startDelay = 0,
  speed = 34,
  className,
  reduced = false,
  prompt = true,
}: TypewriterProps) {
  const [tick, setTick] = useState<TypeTick>({ line: 0, char: 0, done: reduced });
  const timer = useRef(0);
  const linesKey = lines.join("\u0001");

  useEffect(() => {
    if (reduced) return; // reduced renders the final lines directly
    let line = 0;
    let char = 0;
    let cancelled = false;
    let id = 0;

    const step = () => {
      if (cancelled) return;
      char += 1;
      if (char > lines[line].length) {
        line += 1;
        if (line >= lines.length) {
          setTick({ line, char: 0, done: true });
          return;
        }
        char = 0; // pause beat between lines
        setTick({ line, char, done: false });
        id = window.setTimeout(step, 260);
        return;
      }
      setTick({ line, char, done: false });
      // irregular cadence — terminals and humans both stutter
      const jitter = 0.4 + Math.random() * 1.2;
      id = window.setTimeout(step, speed * jitter);
    };

    id = window.setTimeout(() => {
      if (cancelled) return;
      setTick({ line: 0, char: 0, done: false });
      step();
    }, startDelay);

    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [linesKey, startDelay, speed, reduced]);

  const visibleCount = reduced ? lines.length : Math.min(tick.line + 1, lines.length);

  return (
    <div className={className} aria-label={lines.join(" ")}>
      {lines.slice(0, visibleCount).map((l, i) => {
        const text = reduced ? l : i < tick.line ? l : l.slice(0, tick.char);
        const isLast = i === visibleCount - 1;
        return (
          <p key={i} className="flex items-start whitespace-pre-wrap">
            {prompt && <span className="mr-2 shrink-0 text-acid">$</span>}
            <span>{text}</span>
            {isLast && (
              <span
                className={`blink-block ml-1 mt-[0.15em] inline-block h-[1em] w-[0.55ch] shrink-0 bg-acid ${
                  tick.done ? "opacity-60" : ""
                }`}
              />
            )}
          </p>
        );
      })}
    </div>
  );
}
