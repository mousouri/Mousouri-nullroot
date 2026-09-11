"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { requestNavigation } from "@/lib/transition";

/* ============================================================
   MOUSOURI route model — real pages now.

   Every screen is a true App Router destination (/work,
   /work/:id, /notes, /notes/:id, /arcade, /arcade/:game) with
   its own URL, SSR pass and metadata. This module is the thin
   vocabulary layer on top: it parses pathnames into a Route,
   maps Routes back to paths, and funnels every programmatic
   navigation through the site-wide wipe transition
   (lib/transition.tsx) so route changes keep the brutalist
   panel language instead of a browser jump.
   ============================================================ */

export type Route =
  | { page: "home" }
  | { page: "work" }
  | { page: "project"; id: string }
  | { page: "notes" }
  | { page: "note"; id: string }
  | { page: "arcade"; game?: string }
  | { page: "stack" }
  | { page: "now" }
  | { page: "timeline" }
  | { page: "ama" }
  | { page: "resume" }
  | { page: "guestbook" }
  | { page: "vault" }
  | { page: "station" };

export function parsePath(pathname: string): Route {
  const seg = pathname.split("/").filter(Boolean);
  switch (seg[0]) {
    case undefined:
      return { page: "home" };
    case "work":
      return seg[1] ? { page: "project", id: seg[1] } : { page: "work" };
    case "notes":
      return seg[1] ? { page: "note", id: seg[1] } : { page: "notes" };
    case "arcade":
      return { page: "arcade", game: seg[1] };
    case "stack":
      return { page: "stack" };
    case "now":
      return { page: "now" };
    case "timeline":
      return { page: "timeline" };
    case "ama":
      return { page: "ama" };
    case "resume":
      return { page: "resume" };
    case "guestbook":
      return { page: "guestbook" };
    case "vault":
      return { page: "vault" };
    case "station":
      return { page: "station" };
    default:
      return { page: "home" };
  }
}

export function routeToPath(r: Route): string {
  switch (r.page) {
    case "home":
      return "/";
    case "work":
      return "/work";
    case "project":
      return `/work/${r.id}`;
    case "notes":
      return "/notes";
    case "note":
      return `/notes/${r.id}`;
    case "arcade":
      return r.game ? `/arcade/${r.game}` : "/arcade";
    case "stack":
      return "/stack";
    case "now":
      return "/now";
    case "timeline":
      return "/timeline";
    case "ama":
      return "/ama";
    case "resume":
      return "/resume";
    case "guestbook":
      return "/guestbook";
    case "vault":
      return "/vault";
    case "station":
      return "/station";
  }
}

export function sameRoute(a: Route, b: Route): boolean {
  if (a.page !== b.page) return false;
  if (a.page === "project" && b.page === "project") return a.id === b.id;
  if (a.page === "note" && b.page === "note") return a.id === b.id;
  if (a.page === "arcade" && b.page === "arcade") return a.game === b.game;
  return true;
}

export function routeKey(r: Route): string {
  return routeToPath(r);
}

/** Label stamped on the wipe edge during transitions. */
export function routeLabel(r: Route): string {
  switch (r.page) {
    case "home":
      return "~/INDEX";
    case "work":
      return "~/WORK";
    case "project":
      return `~/WORK/${r.id.toUpperCase()}`;
    case "notes":
      return "~/NOTES";
    case "note":
      return `~/NOTES/${r.id.toUpperCase()}`;
    case "arcade":
      return r.game ? `~/ARCADE/${r.game.toUpperCase()}` : "~/ARCADE";
    case "stack":
      return "~/STACK";
    case "now":
      return "~/NOW";
    case "timeline":
      return "~/TIMELINE";
    case "ama":
      return "~/AMA";
    case "resume":
      return "~/RÉSUMÉ";
    case "guestbook":
      return "~/GUESTBOOK";
    case "vault":
      return "~/VAULT";
    case "station":
      return "~/STATION";
  }
}

/** The current route, derived from the real pathname. */
export function useRoute(): Route {
  const pathname = usePathname();
  return useMemo(() => parsePath(pathname), [pathname]);
}

/**
 * Programmatic navigation — plays the site-wide wipe, then pushes
 * a real history entry. All existing call sites (sections, cards,
 * rows) keep this exact signature.
 */
export function navigate(r: Route): void {
  requestNavigation(routeToPath(r));
}

/**
 * Where a page's BACK button should land. Detail pages fall back
 * to their index; everything else returns home.
 */
export function parentRoute(r: Route): Route {
  switch (r.page) {
    case "project":
      return { page: "work" };
    case "note":
      return { page: "notes" };
    case "arcade":
      return { page: "home" };
    default:
      return { page: "home" };
  }
}

/* ---------- pending in-page section (nav → home → scroll) ---------- */

let pendingSection: string | null = null;

/**
 * Nav anchors (#about, #stack, #contact) live on the home page.
 * When clicked from another page, remember the target so home can
 * scroll to it once the wipe lands.
 */
export function setPendingSection(selector: string): void {
  pendingSection = selector;
}

export function consumePendingSection(): string | null {
  const s = pendingSection;
  pendingSection = null;
  return s;
}
