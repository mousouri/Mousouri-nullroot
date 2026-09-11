"use client";

import { useEffect } from "react";
import {
  sfx,
  primeAudio,
  initSoundPrefs,
} from "@/lib/sound";
import { initTheme } from "@/lib/theme";
import { stopScroll, startScroll } from "@/hooks/use-smooth-scroll";
import { useOverlay } from "@/lib/shell";

/* ============================================================
   SoundFX + prefs bootstrap — an invisible chrome component:
   · initializes theme + sound prefs from localStorage on mount
   · primes the AudioContext on the first user gesture
   · delegates hover/click/key sounds globally (no per-component
     wiring — if it's interactive, it clicks)
   · locks page scroll while the palette/terminal is open
   ============================================================ */

const INTERACTIVE = "a, button, [role='button'], input[type='submit'], [data-snd]";

export function SoundFX() {
  const overlay = useOverlay();

  /* prefs + audio unlock */
  useEffect(() => {
    initSoundPrefs();
    initTheme();
    const prime = () => primeAudio();
    window.addEventListener("pointerdown", prime, { once: true, passive: true });
    window.addEventListener("keydown", prime, { once: true });
    return () => {
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
    };
  }, []);

  /* delegated interaction sounds */
  useEffect(() => {
    let lastHover: Element | null = null;

    const over = (e: PointerEvent) => {
      const t = (e.target as Element | null)?.closest?.(INTERACTIVE) ?? null;
      if (t && t !== lastHover) sfx.blip();
      lastHover = t;
    };

    const down = (e: PointerEvent) => {
      const t = (e.target as Element | null)?.closest?.(INTERACTIVE);
      if (t) sfx.click();
    };

    const key = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag !== "INPUT" && tag !== "TEXTAREA" && !el?.isContentEditable) return;
      if (e.key.length === 1 || e.key === "Backspace" || e.key === "Enter") sfx.key();
    };

    window.addEventListener("pointerover", over, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerover", over);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("keydown", key);
    };
  }, []);

  /* overlay scroll lock */
  useEffect(() => {
    if (overlay === "none") return;
    stopScroll();
    return () => startScroll();
  }, [overlay]);

  return null;
}
