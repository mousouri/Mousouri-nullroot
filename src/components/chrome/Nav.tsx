"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EASE_OUT_EXPO, EASE_SHARP, DUR } from "@/lib/motion";
import { scrollToEl } from "@/hooks/use-smooth-scroll";
import { useRoute, navigate, setPendingSection, sameRoute, type Route } from "@/lib/router";
import { cycleTheme, useTheme, THEME_LABEL } from "@/lib/theme";
import { toggleMuted, useMuted, playSfx } from "@/lib/sound";

type NavLink = { n: string; label: string } &
  ({ href: string; route?: never } | { route: Route; href?: never });

const LINKS: NavLink[] = [
  { n: "01", label: "ABOUT", href: "#about" },
  { n: "02", label: "STACK", route: { page: "stack" } },
  { n: "03", label: "WORK", route: { page: "work" } },
  { n: "04", label: "NOTES", route: { page: "notes" } },
  { n: "05", label: "ARCADE", route: { page: "arcade" } },
  { n: "06", label: "NOW", route: { page: "now" } },
  { n: "07", label: "CONTACT", href: "#contact" },
];

function useClock() {
  const [time, setTime] = useState("--:--:--");
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Africa/Dar_es_Salaam",
    });
    const tick = () => setTime(fmt.format(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return time;
}

export function Nav() {
  const time = useClock();
  const route = useRoute();
  const [open, setOpen] = useState(false);
  const onHome = route.page === "home";
  const theme = useTheme();
  const muted = useMuted();

  const cycleColor = () => {
    cycleTheme();
    playSfx("ok");
  };

  const toggleSound = () => {
    const nowMuted = toggleMuted();
    if (!nowMuted) playSfx("ok"); // confirm the un-mute audibly
  };

  const go = (href: string) => {
    setOpen(false);
    if (onHome) {
      scrollToEl(href);
      return;
    }
    // on a takeover page: route home first, then scroll once landed
    setPendingSection(href);
    navigate({ page: "home" });
  };

  const goRoute = (r: Route) => {
    setOpen(false);
    navigate(r); // hashchange drives the wipe
  };

  const goHome = () => {
    setOpen(false);
    if (onHome) {
      scrollToEl("#top");
      return;
    }
    navigate({ page: "home" });
  };

  const isActive = (l: (typeof LINKS)[number]) => {
    if (!l.route) return false;
    // detail pages keep their parent section lit (/work/pothole → WORK)
    if (route.page === "project" && l.route.page === "work") return true;
    if (route.page === "note" && l.route.page === "notes") return true;
    return sameRoute(route, l.route);
  };

  return (
    <>
      <header className="fixed top-0 right-0 left-0 z-[100] border-b border-line bg-ink/85 backdrop-blur-[2px]">
        <div className="flex h-12 items-center justify-between px-4 md:px-8">
          {/* breadcrumb + status */}
          <button
            onClick={goHome}
            data-cursor=""
            className="flex items-center gap-2.5 font-mono text-[11px] tracking-widest text-paper"
          >
            <span className="pulse-dot inline-block h-1.5 w-1.5 bg-acid" />
            <span className="text-dim">~/</span>MOUSOURI
            <span className="hidden text-dim md:inline">
              {onHome ? "— main( )" : `— ${hashTrail(route)}`}
            </span>
          </button>

          {/* center links */}
          <nav className="hidden items-center gap-4.5 lg:gap-6 md:flex" aria-label="Primary">
            {LINKS.map((l) => (
              <button
                key={l.n}
                onClick={() => (l.route ? goRoute(l.route) : go(l.href))}
                data-cursor=""
                className={`u-draw font-mono text-[10px] tracking-[0.2em] transition-colors ${
                  isActive(l) ? "text-acid" : "text-dim hover:text-paper"
                }`}
              >
                <span className="text-acid">{l.n}</span> {l.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4 md:gap-5">
            {/* colorway cycle — acid / matrix / amber */}
            <button
              onClick={cycleColor}
              data-cursor="THEME"
              title="Cycle colorway (acid → matrix → amber)"
              className="border border-line px-1.5 py-0.5 font-mono text-[9px] tracking-[0.2em] text-acid transition-colors hover:border-acid hover:bg-acid hover:text-ink"
            >
              {THEME_LABEL[theme]}
            </button>
            {/* synthesized sound toggle */}
            <button
              onClick={toggleSound}
              data-cursor={muted ? "MUTE" : "UNMUTE"}
              title="Toggle synthesized UI audio"
              className={`hidden font-mono text-[9px] tracking-[0.2em] transition-colors sm:block ${
                muted ? "text-dim hover:text-paper" : "text-acid hover:text-paper"
              }`}
            >
              SND:{muted ? "OFF" : "ON"}
            </button>
            <p className="hidden font-mono text-[10px] tracking-widest text-dim lg:block">
              DSM, TZ <span className="text-acid tabular-nums">{time}</span>
            </p>
            {/* mobile menu trigger */}
            <button
              onClick={() => setOpen(true)}
              data-cursor=""
              className="font-mono text-[10px] tracking-[0.25em] text-paper md:hidden"
              aria-label="Open menu"
            >
              [ MENU ]
            </button>
          </div>
        </div>
      </header>

      {/* fullscreen mobile menu — hard panel drop */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[150] flex flex-col bg-ink md:hidden"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: DUR.wipe, ease: EASE_SHARP }}
          >
            <div className="flex h-12 items-center justify-between border-b border-line px-4">
              <span className="font-mono text-[11px] tracking-widest text-dim">NAV.INDEX</span>
              <button
                onClick={() => setOpen(false)}
                className="font-mono text-[10px] tracking-[0.25em] text-acid"
                aria-label="Close menu"
              >
                [ CLOSE ]
              </button>
            </div>
            <nav className="flex flex-1 flex-col justify-center gap-2 px-6" aria-label="Mobile">
              {LINKS.map((l, i) => (
                <motion.button
                  key={l.n}
                  onClick={() => (l.route ? goRoute(l.route) : go(l.href))}
                  className={`flex items-baseline gap-4 border-b border-line py-4 text-left ${
                    isActive(l) ? "text-acid" : ""
                  }`}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + i * 0.06, duration: DUR.base, ease: EASE_OUT_EXPO }}
                >
                  <span className="font-mono text-xs text-acid">{l.n}</span>
                  <span className="font-display text-5xl tracking-wide text-paper">{l.label}</span>
                </motion.button>
              ))}
            </nav>
            <p className="px-6 pb-8 font-mono text-[10px] tracking-widest text-dim">
              −6.7924 / 39.2083 — DSM, TZ
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ---------- helpers ---------- */

function hashTrail(r: ReturnType<typeof useRoute>): string {
  switch (r.page) {
    case "work":
      return "— work/";
    case "project":
      return `— work/${r.id}/`;
    case "notes":
      return "— notes/";
    case "note":
      return `— notes/${r.id}/`;
    case "arcade":
      return r.game ? `— arcade/${r.game}/` : "— arcade/";
    case "stack":
      return "— stack/";
    case "now":
      return "— now/";
    case "timeline":
      return "— timeline/";
    case "ama":
      return "— ama/";
    case "resume":
      return "— resume/";
    default:
      return "— main( )";
  }
}
