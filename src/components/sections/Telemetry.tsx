"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useEnvironment } from "@/hooks/use-environment";
import { EASE_OUT_EXPO } from "@/lib/motion";

/* ============================================================
   SYS.TELEMETRY — the site watching itself, politely. Every
   number below is YOUR session, computed on YOUR device:
   uptime, input count, scroll depth, frame rate, a region
   guess derived from the timezone you leak anyway, and a 24
   hour pulse strip of when you're most alive on the page.
   Nothing is stored, nothing is sent — the log IS the page.
   ============================================================ */

const BOOT_T = Date.now();

/* timezone → human region label (client-side party trick) */
function regionGuess(): { tz: string; label: string; lang: string } {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UNKNOWN/ZONE";
    const lang = navigator.language || "??";
    const area = tz.split("/")[0].toUpperCase();
    const specials: Record<string, string> = {
      "AFRICA/DAR_ES_SALAAM": "DAR ES SALAAM — HOMETOWN SIGNAL",
      "AFRICA/NAIROBI": "NAIROBI — NEIGHBOUR LINK",
      "AFRICA/KAMPALA": "KAMPALA — NEIGHBOUR LINK",
    };
    const areas: Record<string, string> = {
      AFRICA: "EAST AFRICA GRID",
      EUROPE: "EUROPEAN UPLINK",
      AMERICA: "AMERICAS RELAY",
      ASIA: "ASIA BACKBONE",
      AUSTRALIA: "OCEANIA NODE",
      ATLANTIC: "MID-ATLANTIC DRIFT",
      PACIFIC: "PACIFIC ISLAND HOP",
      INDIAN: "INDIAN OCEAN RIDGE",
      UTC: "UTC — EVERYWHERE AND NOWHERE",
    };
    return {
      tz,
      lang,
      label: specials[tz] ?? areas[area] ?? `${area} — UNMAPPED NODE`,
    };
  } catch {
    return { tz: "UNKNOWN", label: "OFF-GRID", lang: "??" };
  }
}

export function Telemetry() {
  const { reducedMotion } = useEnvironment();
  const [mounted, setMounted] = useState(false);
  const [uptime, setUptime] = useState("00:00");
  const [interactions, setInteractions] = useState(0);
  const [depth, setDepth] = useState(0);
  const [fps, setFps] = useState(60);
  const [pulse, setPulse] = useState<number[]>(() => Array(24).fill(0));
  const [region, setRegion] = useState<{ tz: string; label: string; lang: string } | null>(null);

  const clicks = useRef(0);
  const depthRef = useRef(0);
  const hour = new Date().getHours();

  useEffect(() => {
    // deferred boot: satisfies SSR + the no-setState-in-effect rule
    const t = window.setTimeout(() => {
      setMounted(true);
      setRegion(regionGuess());
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  /* inputs → counter (ref, never re-renders) + pulse bucket */
  useEffect(() => {
    if (!mounted) return;
    const bump = () => {
      clicks.current += 1;
    };
    const opts: AddEventListenerOptions = { passive: true };
    window.addEventListener("pointerdown", bump, opts);
    window.addEventListener("keydown", bump, opts);
    return () => {
      window.removeEventListener("pointerdown", bump);
      window.removeEventListener("keydown", bump);
    };
  }, [mounted]);

  /* scroll depth — deepest reach this session */
  useEffect(() => {
    if (!mounted) return;
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      if (max > 0) {
        const d = Math.min(100, Math.round(((window.scrollY + window.innerHeight) / (max + window.innerHeight)) * 100));
        if (d > depthRef.current) depthRef.current = d;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [mounted]);

  /* 1s readout loop — mirrors refs into render state */
  useEffect(() => {
    if (!mounted) return;
    const iv = window.setInterval(() => {
      const s = Math.max(0, Math.floor((Date.now() - BOOT_T) / 1000));
      setUptime(`${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`);
      setInteractions(clicks.current);
      setDepth(depthRef.current);
      setPulse((p) => {
        const next = [...p];
        next[hour] = clicks.current;
        return next;
      });
    }, 1000);
    return () => window.clearInterval(iv);
  }, [mounted, hour]);

  /* fps — measured, not advertised */
  useEffect(() => {
    if (!mounted || reducedMotion) return;
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      frames++;
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mounted, reducedMotion]);

  const maxPulse = Math.max(1, ...pulse);

  return (
    <section id="telemetry" className="relative border-t border-line bg-ink" aria-label="Live session telemetry">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="font-mono text-[11px] tracking-wider text-paper md:text-xs">
            root@mousouri:~$ tail -f /var/log/you.log
          </p>
          <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.25em]" style={{ color: "var(--acid)" }}>
            <span className="pulse-dot inline-block h-1.5 w-1.5" style={{ background: "var(--acid)" }} />
            LIVE
          </span>
        </div>
        <h2 className="mt-3 font-display text-4xl tracking-wide text-paper md:text-6xl">
          SYS<span className="text-stroke-acid">.</span>TELEMETRY
        </h2>
        <p className="mt-4 max-w-[64ch] font-body text-sm leading-relaxed text-paper/75">
          The machine watches itself — and you, politely. Every number below is your own session,
          computed on your own device while the page is open. Nothing is stored, nothing is sent
          anywhere; when you close the tab, the log ceases to exist. Surveillance theater, in the
          nicest possible way.
        </p>

        {/* stat cards */}
        <div className="mt-8 grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-4">
          {[
            ["SESSION", uptime],
            ["INPUT EVENTS", String(interactions).padStart(3, "0")],
            ["SCROLL REACH", `${depth}%`],
            ["FRAME RATE", reducedMotion ? "CALM" : `${fps} FPS`],
          ].map(([k, v], i) => (
            <motion.div
              key={k}
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-6% 0px" }}
              transition={{ duration: 0.45, ease: EASE_OUT_EXPO, delay: i * 0.05 }}
              className="bg-ink p-4 md:p-5"
            >
              <p className="font-mono text-[9px] tracking-[0.3em] text-dim">{k}</p>
              <p className="mt-1 font-display text-3xl text-paper tabular-nums md:text-4xl">{v}</p>
            </motion.div>
          ))}
        </div>

        {/* region + pulse */}
        <div className="mt-px grid gap-px border-x border-b border-line bg-line md:grid-cols-[1fr_1.4fr]">
          {/* region guess */}
          <div className="bg-ink p-4 md:p-5">
            <p className="font-mono text-[9px] tracking-[0.3em] text-dim">REGION.GUESS — DERIVED FROM YOUR CLOCK</p>
            <p className="mt-2 font-display text-xl leading-tight text-paper md:text-2xl">
              {region ? region.label : "RESOLVING…"}
            </p>
            <p className="mt-2 font-mono text-[10px] tracking-[0.15em] text-dim">
              TZ {region?.tz ?? "…"} · LANG {region?.lang ?? "…"}
            </p>
            <p className="mt-3 font-mono text-[9px] leading-relaxed tracking-[0.12em] text-dim/70">
              no geolocation API, no IP lookup — your timezone simply announces itself. this site
              just says it back to you.
            </p>
          </div>

          {/* 24h pulse strip */}
          <div className="bg-ink p-4 md:p-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-mono text-[9px] tracking-[0.3em] text-dim">SESSION PULSE — 24H CLOCK</p>
              <p className="font-mono text-[9px] tracking-[0.2em] text-dim">
                HOUR <span style={{ color: "var(--acid)" }}>{String(hour).padStart(2, "0")}</span>
              </p>
            </div>
            <div className="mt-3 flex h-16 items-end gap-[3px]">
              {pulse.map((v, i) => (
                <div key={i} className="relative flex-1">
                  <div
                    className="w-full transition-all duration-500"
                    style={{
                      height: `${Math.max(2, (v / maxPulse) * 60)}px`,
                      background: i === hour ? "var(--acid)" : "var(--line-strong)",
                      opacity: i === hour ? 1 : 0.8,
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex justify-between font-mono text-[8px] tracking-[0.2em] text-dim/70">
              <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
