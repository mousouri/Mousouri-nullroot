"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/pages/PageShell";
import { navigate } from "@/lib/router";
import { setTheme, getTheme, THEME_HINT } from "@/lib/theme";
import { hasFlag } from "@/lib/achievements";

/* ============================================================
   ~/vault — the door that only opens for people who read.
   Unlocked by assembling the three CTF fragments and submitting
   the flag in the hidden terminal. Wears the VOID colorway.
   If you found this by typing URLs: respect, wrong door.
   ============================================================ */

export function VaultScreen() {
  const [earned, setEarned] = useState<boolean | null>(null);
  const [wearing, setWearing] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setEarned(hasFlag()), 0);
    return () => window.clearTimeout(t);
  }, []);

  if (earned === false) {
    return (
      <PageShell crumb="~/vault — SEALED">
        <div className="flex min-h-[70svh] flex-col items-center justify-center px-6 pb-24 text-center">
          <p className="font-mono text-[10px] tracking-[0.4em] text-dim">ACCESS DENIED</p>
          <h1 className="mt-4 font-display text-6xl tracking-wide text-paper md:text-8xl">SEALED</h1>
          <p className="mt-4 max-w-[46ch] font-mono text-[11px] leading-relaxed tracking-[0.2em] text-dim">
            THE VAULT KNOWS YOU HAVEN&apos;T EARNED IT YET. THREE FRAGMENTS
            ARE SCATTERED ACROSS THE SITE. THE HIDDEN TERMINAL (`)
            KNOWS THE FIRST ONE.
          </p>
          <p className="mt-2 font-mono text-[10px] tracking-[0.3em] text-dim/60">start with: ls -a</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell crumb="~/vault — OPEN" palette="ink">
      <div className="mx-auto max-w-4xl px-4 pb-24 pt-10 md:px-8">
        <p className="font-mono text-[10px] tracking-[0.35em]" style={{ color: "var(--acid)" }}>
          FLAG ACCEPTED — DOOR UNLOCKED — NOTHING INSIDE BUT HONOR
        </p>
        <h1
          className="mt-2 font-display leading-[0.9] tracking-wide text-paper"
          style={{ fontSize: "clamp(2.6rem, 9vw, 6.5rem)" }}
        >
          THE <span className="text-stroke-acid">VAULT</span>
        </h1>

        <pre className="mt-8 overflow-x-auto border border-line bg-ink p-4 font-mono text-[10px] leading-relaxed" style={{ color: "var(--acid)" }}>
{`      __   __ _  _   _  ___
      \\ \\ / /| \\|/ | / \\| __|
       \\  V  / |  \\  / |  _|
        \\_/   | |\\ \\/  |___|

  you assembled what was scattered:
  · bnJ7djBpZF8=  (base64, hidden in the filesystem)
  · 5f746833      (hex, in the 404's dim light)
  · bTN9          (base64, leaked by 'hack')

  nr{v0id_th3m3} — the void theme is yours.`}
        </pre>

        <div className="mt-8 border border-line bg-ink p-4 md:p-6">
          <p className="font-mono text-[9px] tracking-[0.3em] text-dim">
            THE VOID COLORWAY — {THEME_HINT.void.toUpperCase()}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              data-cursor="WEAR IT"
              onClick={() => {
                setTheme("void");
                setWearing(getTheme() === "void");
              }}
              className="border px-4 py-2 font-mono text-[11px] tracking-[0.3em] transition-colors"
              style={{ borderColor: "var(--acid)", color: "var(--acid)" }}
            >
              [ WEAR VOID ]
            </button>
            {wearing && (
              <span className="font-mono text-[10px] tracking-[0.25em] text-dim">
                wearing it. the whole site is red now. you did that.
              </span>
            )}
          </div>
          <p className="mt-4 max-w-[52ch] font-mono text-[10px] leading-relaxed tracking-[0.15em] text-dim">
            THIS COLORWAY IS NOT IN THE NAV CYCLE AND NEVER WILL BE.
            IT IS EARNED BY READING, DECODING, AND SUBMITTING — THE
            THREE THINGS SECURITY WORK IS ACTUALLY MADE OF.
          </p>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <button
            type="button"
            data-cursor="ARCADE"
            onClick={() => navigate({ page: "arcade" })}
            className="border border-line px-4 py-3 text-left font-mono text-[10px] tracking-[0.25em] text-dim transition-colors hover:border-paper hover:text-paper"
          >
            THE ARCADE — 14 CABINETS, ALL WASTE TIME EQUALLY →
          </button>
          <button
            type="button"
            data-cursor="SIGN"
            onClick={() => navigate({ page: "guestbook" })}
            className="border border-line px-4 py-3 text-left font-mono text-[10px] tracking-[0.25em] text-dim transition-colors hover:border-paper hover:text-paper"
          >
            THE GUESTBOOK — SIGN IT LIKE A GHOST →
          </button>
        </div>
      </div>
    </PageShell>
  );
}
