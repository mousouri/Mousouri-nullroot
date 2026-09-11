"use client";

import { useEffect } from "react";
import { EnvironmentProvider, useEnvironment } from "@/hooks/use-environment";
import { useSmoothScroll } from "@/hooks/use-smooth-scroll";
import { useBooted, setBooted } from "@/lib/boot";
import { TransitionProvider } from "@/lib/transition";
import { GridOverlay } from "@/components/chrome/GridOverlay";
import { NoiseOverlay } from "@/components/chrome/NoiseOverlay";
import { CustomCursor } from "@/components/chrome/CustomCursor";
import { Nav } from "@/components/chrome/Nav";
import { Preloader } from "@/components/chrome/Preloader";
import { StatusBar } from "@/components/chrome/StatusBar";
import { SoundFX } from "@/components/chrome/SoundFX";
import { CommandShell } from "@/components/chrome/CommandShell";
import { Terminal } from "@/components/chrome/Terminal";
import { AchievementSync } from "@/components/chrome/AchievementToast";
import { Screensaver } from "@/components/chrome/Screensaver";

/* ============================================================
   SiteChrome — the persistent shell that lives in the root
   layout and survives every route change. Everything that must
   never remount belongs here: environment detection, Lenis,
   the preloader (once per hard load), grid/noise/cursor chrome
   and the global nav. Pages mount inside, already dressed.
   ============================================================ */

export function SiteChrome({ children }: { children: React.ReactNode }) {
  // The provider must sit above the shell that consumes it.
  return (
    <EnvironmentProvider>
      <Shell>{children}</Shell>
    </EnvironmentProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { ready, isTouch, reducedMotion } = useEnvironment();
  const booted = useBooted();

  // Lenis runs globally on every page; frozen while the preloader plays.
  useSmoothScroll(booted, reducedMotion);

  const showCursor = ready && !isTouch && !reducedMotion;

  // Scroll lock during boot (belt to Lenis's suspenders).
  useEffect(() => {
    document.documentElement.classList.toggle("boot-locked", !booted);
    return () => document.documentElement.classList.remove("boot-locked");
  }, [booted]);

  // PWA — offline support. Prod-only asset; registration is a no-op in dev.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const t = window.setTimeout(() => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* offline is a garnish — never a dependency */
      });
    }, 1200);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <TransitionProvider>
      {/* prefs bootstrap: theme + sound + delegated SFX listeners */}
      <SoundFX />

      <GridOverlay />
      {showCursor && <CustomCursor />}
      <NoiseOverlay />
      <Nav />
      <StatusBar />

      {children}

      {/* NR-SHELL overlays — exclusive via lib/shell focus store */}
      <CommandShell />
      <Terminal />

      {/* trophy engine — passive tracking + unlock toasts */}
      <AchievementSync />

      {/* ROOT.SAVER — idle 90s → phosphor dreams (+ konami lives here) */}
      <Screensaver />

      {!booted && <Preloader onComplete={() => setBooted(true)} />}
    </TransitionProvider>
  );
}
