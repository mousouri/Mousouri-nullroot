"use client";

import { useCallback, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useBooted } from "@/lib/boot";
import { scrollToEl } from "@/hooks/use-smooth-scroll";
import { consumePendingSection } from "@/lib/router";
import type { Project, Writeup } from "@/lib/data";
import { navigate } from "@/lib/router";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Capabilities } from "@/components/sections/Capabilities";
import { Marquee } from "@/components/sections/Marquee";
import { Work } from "@/components/sections/Work";
import { Writeups } from "@/components/sections/Writeups";
import { ArcadeTeaser } from "@/components/sections/ArcadeTeaser";
import { Telemetry } from "@/components/sections/Telemetry";
import { Contact } from "@/components/sections/Contact";
import { Footer } from "@/components/sections/Footer";

gsap.registerPlugin(ScrollTrigger);

/* ============================================================
   Home — the index page. A real route (/) among real routes:
   /work, /work/[id], /notes, /notes/[id], /arcade, /arcade/[game].
   All cross-page chrome (nav, cursor, grid, Lenis, preloader,
   wipe transitions) lives in SiteChrome in the root layout, so
   this file is purely content + home-owned orchestration.
   ============================================================ */

export default function Home() {
  const booted = useBooted();

  const openProject = useCallback((p: Project) => navigate({ page: "project", id: p.id }), []);
  const openNote = useCallback((w: Writeup) => navigate({ page: "note", id: w.id }), []);
  const openGame = useCallback(
    (id?: string) => navigate(id ? { page: "arcade", game: id } : { page: "arcade" }),
    [],
  );

  // fonts reshape the grid — refresh ScrollTrigger once they land
  useEffect(() => {
    if (!booted) return;
    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh).catch(() => {});
    const t = window.setTimeout(refresh, 400);
    return () => window.clearTimeout(t);
  }, [booted]);

  // nav anchors clicked from another page land here after the wipe
  useEffect(() => {
    if (!booted) return;
    const sel = consumePendingSection();
    if (sel) {
      const t = window.setTimeout(() => scrollToEl(sel), 140);
      return () => window.clearTimeout(t);
    }
  }, [booted]);

  return (
    <div className="relative z-10 flex min-h-screen flex-col" aria-label="Home">
      <main>
        <Hero booted={booted} />
        <About />
        <Marquee />
        <Capabilities />
        <Work onOpen={openProject} />
        <Writeups />
        <ArcadeTeaser />
        <Telemetry />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
