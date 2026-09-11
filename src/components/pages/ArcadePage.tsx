"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { EASE_OUT_EXPO, DUR } from "@/lib/motion";
import { GAMES } from "@/lib/data";
import type { GameMeta } from "@/lib/data";
import { readHi } from "@/lib/games";
import { useEnvironment } from "@/hooks/use-environment";
import { TROPHIES, useUnlocked } from "@/lib/achievements";
import { navigate } from "@/lib/router";
import { SnakeGame } from "@/components/arcade/SnakeGame";
import { BreachGame } from "@/components/arcade/BreachGame";
import { TypeRaidGame } from "@/components/arcade/TypeRaidGame";
import { PacketRunGame } from "@/components/arcade/PacketRunGame";
import { TraceBreakGame } from "@/components/arcade/TraceBreakGame";
import { PortKnockGame } from "@/components/arcade/PortKnockGame";
import { PhishHuntGame } from "@/components/arcade/PhishHuntGame";
import { StackSmashGame } from "@/components/arcade/StackSmashGame";
import { CryptBreakGame } from "@/components/arcade/CryptBreakGame";
import { KernelStormGame } from "@/components/arcade/KernelStormGame";
import { KlackGame } from "@/components/arcade/KlackGame";
import { VimQuestGame } from "@/components/arcade/VimQuestGame";
import { BotnetGrowGame } from "@/components/arcade/BotnetGrowGame";
import { HopExeGame } from "@/components/arcade/HopExeGame";

/* ============================================================
   ~/arcade — the coin-op wing. CRT power-on hero, three
   cabinets, and a terminal boot sequence before each game
   (because loading bars are for operating systems that care
   about feelings). Deep-linkable: #/arcade/snake boots
   straight into a cabinet.
   ============================================================ */

const BOOT_LINES = [
  "MOUNT /DEV/GAME0 ......... OK",
  "INTEGRITY CHECK .......... OK",
  "HI-SCORE TABLE ........... LOADED",
  "COIN MECHANISM ........... JAMMED (IGNORED)",
  "EXECUTING",
];

export function ArcadePage({
  game,
  onSelectGame,
}: {
  game?: string;
  onSelectGame: (id?: string) => void;
}) {
  const meta = useMemo<GameMeta | undefined>(() => GAMES.find((g) => g.id === game), [game]);
  const [boot, setBoot] = useState<{ id?: string; step: number }>({ step: BOOT_LINES.length });
  const { reducedMotion } = useEnvironment();

  // boot lines tick in whenever a new cabinet is selected (deferred setState
  // keeps the effect body pure — timers own the sequence, not the render)
  useEffect(() => {
    if (!meta) return;
    const start = window.setTimeout(() => setBoot({ id: meta.id, step: 0 }), 0);
    const timers = BOOT_LINES.map((_, i) =>
      window.setTimeout(() => setBoot({ id: meta.id, step: i + 1 }), 240 * (i + 1)),
    );
    return () => {
      window.clearTimeout(start);
      timers.forEach(window.clearTimeout);
    };
  }, [meta, reducedMotion]);

  const bootStep = boot.id === meta?.id ? boot.step : 0;
  const booted = !meta || reducedMotion || bootStep >= BOOT_LINES.length;

  return (
    <div className="pb-24">
      {/* hero — CRT power-on */}
      <div className="relative h-[38svh] min-h-[240px] w-full overflow-hidden border-b border-line md:h-[46svh]">
        <Image
          src="/images/arcade-hero.jpg"
          alt="Rows of CRT monitors glowing acid green in a dark arcade"
          fill
          priority
          sizes="100vw"
          className={`object-cover grayscale contrast-125 brightness-[0.62] ${reducedMotion ? "" : "crt-on"}`}
        />
        <div className="scanlines absolute inset-0 opacity-80" />
        <div className="absolute inset-0 flex flex-col items-start justify-end p-4 md:p-8">
          <motion.p
            className="font-mono text-[10px] tracking-[0.35em] text-acid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            ~/arcade — COIN-OP WING — {GAMES.length} CABINETS ONLINE
          </motion.p>
          <motion.h1
            className="mt-2 font-display leading-[0.85] tracking-wide text-paper"
            style={{ fontSize: "clamp(3.2rem, 12vw, 10rem)" }}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR.hero, ease: EASE_OUT_EXPO, delay: 0.35 }}
          >
            ARCADE<span className="text-stroke-acid">{"//EXE"}</span>
          </motion.h1>
        </div>
      </div>

      {/* cabinet select */}
      <div className="px-4 pt-10 md:px-8 md:pt-14">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {GAMES.map((g, i) => {
            const active = g.id === game;
            const hi = readHi(g.hiKey);
            return (
              <motion.button
                key={g.id}
                onClick={() => onSelectGame(active ? undefined : g.id)}
                data-cursor={active ? "RESET" : "INSERT"}
                className={`group relative border p-4 text-left transition-colors duration-200 md:p-5 ${
                  active
                    ? "border-acid bg-acid text-ink"
                    : "border-line bg-ink hover:border-line-strong"
                }`}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: DUR.base, ease: EASE_OUT_EXPO, delay: 0.3 + i * 0.08 }}
              >
                {/* cabinet marquee art — generated covers, hidden if missing */}
                <CoverArt id={g.id} title={g.title} active={active} />
                <div className="flex items-center justify-between">
                  <span
                    className={`font-mono text-[9px] tracking-[0.3em] ${
                      active ? "text-ink/70" : "text-acid"
                    }`}
                  >
                    {g.file}
                  </span>
                  <span
                    className={`font-mono text-[9px] tracking-[0.25em] ${
                      active ? "text-ink/60" : "text-dim"
                    }`}
                  >
                    {g.kind}
                  </span>
                </div>
                <h2 className="mt-3 font-display text-3xl tracking-wide md:text-4xl">
                  {g.title}
                </h2>
                <p
                  className={`mt-2 min-h-[2.5rem] font-mono text-[10px] leading-relaxed tracking-[0.15em] ${
                    active ? "text-ink/80" : "text-dim"
                  }`}
                >
                  {g.blurb}
                </p>
                <div
                  className={`mt-4 flex items-center justify-between border-t pt-3 font-mono text-[9px] tracking-[0.25em] ${
                    active ? "border-ink/20 text-ink/70" : "border-line text-dim"
                  }`}
                >
                  <span>
                    HI {hi > 0 ? hi : "——"} {g.hiUnit}
                  </span>
                  <span
                    className={`inline-block transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:translate-x-1 ${
                      active ? "" : "text-acid"
                    }`}
                  >
                    {active ? "■ RUNNING" : "INSERT COIN →"}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* boot sequence + game viewport */}
        <AnimatePresence mode="wait">
          {meta && (
            <motion.div
              key={meta.id}
              className="mt-8 border border-line"
              initial={{ clipPath: "inset(0 0 100% 0)" }}
              animate={{ clipPath: "inset(0 0 0% 0)" }}
              exit={{ clipPath: "inset(0 0 100% 0)" }}
              transition={{ duration: DUR.wipe, ease: [0.65, 0, 0.35, 1] }}
            >
              {/* cabinet top bar */}
              <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                <p className="font-mono text-[10px] tracking-[0.25em] text-dim">
                  /dev/game0 — <span className="text-acid">{meta.file}</span>
                </p>
                <div className="flex items-center gap-2 font-mono text-[9px] tracking-[0.25em] text-dim">
                  {meta.controls.map((c) => (
                    <span key={c} className="hidden border border-line px-1.5 py-0.5 sm:inline">
                      {c}
                    </span>
                  ))}
                  <button
                    onClick={() => onSelectGame(undefined)}
                    className="border border-line px-1.5 py-0.5 transition-colors hover:border-paper hover:text-paper"
                  >
                    [ EXIT ]
                  </button>
                </div>
              </div>

              <div className="p-4 md:p-6">
                {!booted ? (
                  <div className="mx-auto min-h-[300px] max-w-[560px] py-10 font-mono text-[11px] leading-loose tracking-[0.2em] text-dim">
                    {BOOT_LINES.slice(0, bootStep).map((l, i) => (
                      <p key={i} className={i === BOOT_LINES.length - 1 ? "text-acid" : ""}>
                        {l}
                        <span className="blink-block ml-1 inline-block h-3 w-2 translate-y-[2px] bg-acid" />
                      </p>
                    ))}
                  </div>
                ) : meta.id === "snake" ? (
                  <SnakeGame />
                ) : meta.id === "breach" ? (
                  <BreachGame />
                ) : meta.id === "packetrun" ? (
                  <PacketRunGame />
                ) : meta.id === "tracebreak" ? (
                  <TraceBreakGame />
                ) : meta.id === "portknock" ? (
                  <PortKnockGame />
                ) : meta.id === "phishhunt" ? (
                  <PhishHuntGame />
                ) : meta.id === "stacksmash" ? (
                  <StackSmashGame />
                ) : meta.id === "cryptbreak" ? (
                  <CryptBreakGame />
                ) : meta.id === "kernelstorm" ? (
                  <KernelStormGame />
                ) : meta.id === "klack" ? (
                  <KlackGame />
                ) : meta.id === "vimquest" ? (
                  <VimQuestGame />
                ) : meta.id === "botnetgrow" ? (
                  <BotnetGrowGame />
                ) : meta.id === "hopexe" ? (
                  <HopExeGame />
                ) : (
                  <TypeRaidGame />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-10 px-2 font-mono text-[10px] leading-relaxed tracking-[0.25em] text-dim/70">
          SCORES LIVE IN YOUR BROWSER — NO ACCOUNT, NO TRACKING, NO MERCY.
          BUILT IN CANVAS + REACT BECAUSE THE ARCADE DESERVED FIRST-PARTY CODE.
        </p>
      </div>

      <TrophyCabinet />
    </div>
  );
}

/* ---------- cabinet cover art — lazy, fail-safe ---------- */
function CoverArt({ id, title, active }: { id: string; title: string; active: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div
      className={`relative mb-4 aspect-[4/3] w-full overflow-hidden border ${
        active ? "border-ink/30" : "border-line"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/covers/${id}.jpg`}
        alt={`${title} cabinet art`}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover opacity-90 transition-opacity duration-300 group-hover:opacity-100"
      />
      <div className="scanlines pointer-events-none absolute inset-0 opacity-60" />
    </div>
  );
}

/* ---------- trophy cabinet ---------- */
function TrophyCabinet() {
  const unlocked = useUnlocked();
  const got = TROPHIES.filter((t) => unlocked.has(t.id)).length;
  return (
    <div className="px-4 pb-24 md:px-8">
      <div className="mt-12 border border-line">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="font-mono text-[10px] tracking-[0.3em] text-dim">
            TROPHY CABINET — <span className="text-acid">{got}/{TROPHIES.length}</span> UNLOCKED
          </p>
          <p className="hidden font-mono text-[9px] tracking-[0.25em] text-dim/60 sm:block">
            TERMINAL: 'achievements' — PROGRESS IS YOURS ALONE
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {TROPHIES.map((t, i) => {
            const has = unlocked.has(t.id);
            return (
              <div
                key={t.id}
                className={`border-line p-4 ${i % 2 === 1 ? "border-l" : ""} ${i >= 2 ? "border-t" : ""} md:border-t md:border-l`}
                title={t.secret && !has ? "classified" : t.desc}
              >
                <p className={`font-mono text-[10px] tracking-[0.2em] ${has ? "text-acid" : "text-dim/50"}`}>
                  {has ? "■" : "□"} {has || !t.secret ? t.name : "???"}
                </p>
                <p
                  className={`mt-2 font-mono text-[9px] leading-relaxed tracking-[0.12em] ${
                    has ? "text-paper/80" : "text-dim/40"
                  }`}
                >
                  {has || !t.secret ? t.desc : `UNLOCK THE OTHER ${TROPHIES.length - 1} TO READ THIS.`}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        data-cursor="SIGN"
        onClick={() => navigate({ page: "guestbook" })}
        className="mt-6 block w-full border border-line px-4 py-3 text-left font-mono text-[10px] tracking-[0.25em] text-dim transition-colors hover:border-acid hover:text-acid"
      >
        AFTER THE ARCADE — SIGN THE GUESTBOOK WALL →
      </button>
    </div>
  );
}
