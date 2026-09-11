"use client";

import { useEffect, useState } from "react";
import { useCurrentToast, checkEnv, loadAchievements, trackDay } from "@/lib/achievements";
import { usePathname } from "next/navigation";
import { playSfx } from "@/lib/sound";

/* ============================================================
   AchievementSync + Toast — the passive half of the trophy
   engine. Mounted once in SiteChrome: it loads the unlocked
   set, stamps today's visit, tracks route changes, polls the
   environment every few seconds (hi-scores, mute, the wall
   clock), and renders unlock toasts bottom-right.
   ============================================================ */

export function AchievementSync() {
  const toast = useCurrentToast();
  const pathname = usePathname();
  const [shown, setShown] = useState<string | null>(null);

  /* boot: load + stamp the day + first env check */
  useEffect(() => {
    loadAchievements();
    trackDay();
    checkEnv();
    const iv = window.setInterval(checkEnv, 5000);
    return () => window.clearInterval(iv);
  }, []);

  /* route tracking (pathname is "" during prerender — guard) */
  useEffect(() => {
    if (!pathname) return;
    const seg = pathname.split("/").filter(Boolean);
    const page = seg[0] ?? "home";
    // dynamic sections map to their index page for trophy purposes
    const known = ["work", "notes", "arcade", "guestbook", "stack", "now", "timeline", "ama", "resume"];
    import("@/lib/achievements").then((m) => m.trackPage(known.includes(page) ? page : "home"));
  }, [pathname]);

  /* toast display lifecycle */
  useEffect(() => {
    if (toast && toast.id !== shown) {
      setShown(toast.id);
      playSfx("ok");
    }
    if (!toast && shown) setShown(null);
  }, [toast, shown]);

  if (!toast) return null;
  return (
    <div className="fixed bottom-10 right-3 z-[182] md:right-6">
      <div className="border border-acid bg-ink px-4 py-3 font-mono shadow-[6px_6px_0_0_rgba(0,0,0,0.6)]">
        <p className="text-[9px] tracking-[0.35em] text-dim">ACHIEVEMENT UNLOCKED</p>
        <p className="mt-1 font-display text-lg tracking-wide text-acid">{toast.name}</p>
        <p className="mt-0.5 max-w-[30ch] text-[10px] leading-relaxed tracking-[0.12em] text-paper/75">
          {toast.desc}
        </p>
      </div>
    </div>
  );
}
