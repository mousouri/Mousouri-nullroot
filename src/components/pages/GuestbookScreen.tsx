"use client";

import { useCallback, useEffect, useState } from "react";
import { navigate } from "@/lib/router";
import { PageShell } from "@/components/pages/PageShell";
import { readGuestbook, signGuestbook, type GuestEntry } from "@/lib/guestbook";
import { getTheme } from "@/lib/theme";
import { trackGuestbook } from "@/lib/achievements";
import { playSfx } from "@/lib/sound";

/* ============================================================
   ~/guestbook — the signature wall. sign.sh with a viewport.
   Entries live in localStorage: no account, no backend, no
   tracking — just names, messages, and the colorway you wore
   when you signed.
   ============================================================ */

const THEME_TAG: Record<string, string> = {
  acid: "ACD",
  matrix: "MTRX",
  amber: "AMBR",
  void: "VOID",
};

export function GuestbookScreen() {
  const [entries, setEntries] = useState<GuestEntry[]>([]);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [justSigned, setJustSigned] = useState(false);

  const refresh = useCallback(() => {
    setEntries(readGuestbook());
  }, []);

  useEffect(() => {
    const t = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(t);
  }, [refresh]);

  const submit = useCallback(() => {
    const err = signGuestbook(name, msg, getTheme());
    if (err) {
      setError(err);
      playSfx("err");
      return;
    }
    trackGuestbook();
    setError(null);
    setMsg("");
    setJustSigned(true);
    window.setTimeout(() => setJustSigned(false), 2600);
    refresh();
    playSfx("ok");
  }, [name, msg, refresh]);

  return (
    <PageShell crumb="~/guestbook — SIGN THE WALL">
      <div className="mx-auto max-w-4xl px-4 pb-24 pt-10 md:px-8">
        <div>
          <p className="font-mono text-[10px] tracking-[0.35em] text-acid">./sign.sh — NO ACCOUNT, NO BACKEND, NO TRACKING</p>
          <h1
            className="mt-2 font-display leading-[0.9] tracking-wide text-paper"
            style={{ fontSize: "clamp(2.6rem, 9vw, 6.5rem)" }}
          >
            GUEST<span className="text-stroke-acid">BOOK</span>
          </h1>
          <p className="mt-3 max-w-[52ch] font-mono text-[11px] leading-relaxed tracking-[0.15em] text-dim">
            A WALL FOR PASSERS-THROUGH. SIGNATURES LIVE IN YOUR BROWSER
            AND ARE STAMPED WITH THE COLORWAY YOU WORE. THE TERMINAL
            COMMAND <span className="text-acid">sign</span> DOES THE SAME THING, LOUDER.
          </p>
        </div>

        {/* sign form */}
        <div className="mt-8 border border-line bg-ink p-4 md:p-6">
          <p className="font-mono text-[9px] tracking-[0.3em] text-dim">$ ./sign.sh --name ?--message ?</p>
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_2fr]">
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              maxLength={24}
              placeholder="NAME / ALIAS"
              aria-label="Your name or alias"
              className="border border-line bg-transparent px-3 py-2.5 font-mono text-xs tracking-[0.15em] text-paper placeholder:text-dim/60 focus:border-acid focus:outline-none"
            />
            <input
              value={msg}
              onChange={(e) => {
                setMsg(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              maxLength={140}
              placeholder="SAY SOMETHING (140 CHARS MAX)"
              aria-label="Your message"
              className="border border-line bg-transparent px-3 py-2.5 font-mono text-xs tracking-[0.15em] text-paper placeholder:text-dim/60 focus:border-acid focus:outline-none"
            />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="font-mono text-[10px] tracking-[0.2em] text-dim">
              {error ? <span className="text-paper">{error}</span> : justSigned ? <span className="text-acid">SIGNED. THE WALL REMEMBERS.</span> : `${msg.length}/140`}
            </p>
            <button
              type="button"
              data-cursor="SIGN"
              onClick={submit}
              className="border border-acid px-4 py-2 font-mono text-[11px] tracking-[0.3em] text-acid transition-colors hover:bg-acid hover:text-ink"
            >
              [ EXECUTE SIGN ]
            </button>
          </div>
        </div>

        {/* the wall */}
        <div className="mt-8">
          <p className="font-mono text-[10px] tracking-[0.3em] text-dim">
            THE WALL — {entries.length} SIGNATURE{entries.length === 1 ? "" : "S"}
          </p>
          {entries.length === 0 ? (
            <div className="mt-4 border border-dashed border-line px-4 py-10 text-center font-mono text-[11px] tracking-[0.25em] text-dim">
              EMPTY. BE THE FIRST MARK ON THE WALL.
            </div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {entries.map((e, i) => (
                <div key={`${e.t}-${i}`} className="border border-line bg-ink p-3.5">
                  <div className="flex items-center justify-between font-mono text-[9px] tracking-[0.25em] text-dim">
                    <span className="text-acid">{e.n}</span>
                    <span>
                      {THEME_TAG[e.theme] ?? "ACD"} ·{" "}
                      {new Date(e.t).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-[11px] leading-relaxed tracking-[0.08em] text-paper/85">
                    {e.m}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* arcade crossover */}
        <button
          type="button"
          data-cursor="ARCADE"
          onClick={() => navigate({ page: "arcade" })}
          className="mt-10 block w-full border border-line px-4 py-3 text-left font-mono text-[10px] tracking-[0.25em] text-dim transition-colors hover:border-paper hover:text-paper"
        >
          DONE SIGNING? THE ARCADE IS NEXT DOOR — 14 CABINETS, ALL WASTE TIME EQUALLY →
        </button>
      </div>
    </PageShell>
  );
}
