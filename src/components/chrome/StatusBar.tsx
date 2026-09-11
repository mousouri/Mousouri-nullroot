"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useRoute } from "@/lib/router";
import { scrollStore } from "@/hooks/use-smooth-scroll";
import { setOverlay } from "@/lib/shell";
import { playSfx } from "@/lib/sound";
import { useLofi, toggleLofi } from "@/lib/lofi";

/* ============================================================
   STATUS BAR — a tmux-style statusline pinned to the viewport
   bottom. Left: working route. Middle: a scrolling fake packet
   feed (the machine is "busy"). Right: session uptime, next-CTF
   countdown, and the two overlay triggers (terminal / ⌘K) so
   touch users get them without a keyboard.
   ============================================================ */

const FEED = [
  "eth0 ▸ SYN 10.4.22.9:51344 → :443 ✓ 2.1ms",
  "TLS1.3 HS ✓ x25519 secp256r1",
  "eth0 ▸ ACK 443 → 51344 ✓ 1.8ms",
  "cron ▸ recon.daily OK (312 targets)",
  "ICMP echo 0.4ms — network feels smug",
  "MQTT ▸ sensors/fleet/07 publish ✓",
  "IDS ▸ 0 anomalies (boring is good)",
  "git ▸ push origin main — CI green",
  "DNS ▸ mousouri.dev A 76.76.21.21 TTL 60",
  "GPU ▸ terrain vertices fed, 60fps held",
  "fee ▸ market closed. EA is asleep.",
  "mail ▸ triage queue: 0 unread reports",
];

const BOOT_T = Date.now();
const CTF_T = new Date("2026-11-07T09:00:00+03:00").getTime();

function useUptime(): string {
  const [t, setT] = useState("00:00");
  useEffect(() => {
    const tick = () => {
      const s = Math.max(0, Math.floor((Date.now() - BOOT_T) / 1000));
      setT(`${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return t;
}

function useCtf(): string {
  const [label, setLabel] = useState("T-——");
  useEffect(() => {
    const tick = () => {
      const d = CTF_T - Date.now();
      if (d <= 0) {
        setLabel("LIVE");
        return;
      }
      const days = Math.floor(d / 86_400_000);
      const hrs = Math.floor((d % 86_400_000) / 3_600_000);
      setLabel(`T-${days}D ${String(hrs).padStart(2, "0")}H`);
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);
  return label;
}

function crumb(pathname: string, page: string): string {
  if (page === "home") return "~/mousouri — main( )";
  return `~/mousouri${pathname}`;
}

export function StatusBar() {
  const pathname = usePathname();
  const route = useRoute();
  const up = useUptime();
  const ctf = useCtf();
  const lofi = useLofi();

  const openTerm = () => {
    playSfx("ok");
    setOverlay("terminal");
  };
  const openPalette = () => {
    playSfx("ok");
    setOverlay("palette");
  };
  const toggleMusic = () => {
    const on = toggleLofi();
    playSfx("ok");
    void on;
  };

  const feed = [...FEED, ...FEED]; // duplicated for the -50% marquee loop

  return (
    <footer
      aria-label="System status"
      className="fixed right-0 bottom-0 left-0 z-[156] border-t border-line bg-ink/90 backdrop-blur-[2px]"
    >
      <div className="flex h-7 items-center gap-4 px-3 font-mono text-[9px] tracking-[0.14em] text-dim md:px-4">
        {/* working route */}
        <button
          onClick={() =>
            scrollStore.lenis ? scrollStore.lenis.scrollTo(0) : window.scrollTo(0, 0)
          }
          className="shrink-0 text-paper hover:text-acid"
          data-cursor=""
        >
          {crumb(pathname, route.page)}
        </button>

        {/* packet feed — hidden on narrow screens */}
        <div className="relative hidden min-w-0 flex-1 overflow-hidden sm:block" aria-hidden>
          <div className="feed-track flex w-max items-center gap-8 whitespace-nowrap">
            {feed.map((f, i) => (
              <span key={i} className={i % 2 ? "text-dim" : "text-paper/70"}>
                {f}
                <span className="ml-8 text-acid/60">·</span>
              </span>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-ink to-transparent" />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-3 md:gap-4">
          {/* LO-FI.WAV — procedural radio, zero streams */}
          <button
            onClick={toggleMusic}
            data-cursor={lofi ? "PAUSE" : "PLAY"}
            title="LO-FI.WAV — procedural status-bar radio (generated live, no files)"
            className={`flex items-center gap-1.5 ${lofi ? "text-acid" : "text-dim hover:text-paper"}`}
          >
            <span className="hidden sm:inline">LO-FI.WAV</span>
            <EqBars on={lofi} />
          </button>
          <span className="hidden lg:inline">
            UP <span className="tabular-nums text-paper">{up}</span>
          </span>
          <span className="hidden md:inline">
            CTF <span className="tabular-nums text-acid">{ctf}</span>
          </span>
          <button
            onClick={openTerm}
            data-cursor="SHELL"
            title="Hidden terminal (~)"
            className="text-paper hover:text-acid"
          >
            [ &gt;_ ]
          </button>
          <button
            onClick={openPalette}
            data-cursor="CMDS"
            title="Command palette (⌘K)"
            className="text-paper hover:text-acid"
          >
            [ ⌘K ]
          </button>
        </div>
      </div>
    </footer>
  );
}

/* equalizer bars — CSS animation runs only while playing */
function EqBars({ on }: { on: boolean }) {
  return (
    <span className={`eq ${on ? "eq-on" : ""}`} aria-hidden>
      <i />
      <i />
      <i />
    </span>
  );
}
