"use client";

import { useSyncExternalStore } from "react";

/* ============================================================
   Boot store — the preloader plays once per hard load, then
   the flag lives at module level so client-side navigations
   never replay it. Lives outside React so the layout (which
   wraps every page) and any screen can read it cheaply.
   ============================================================ */

let booted = false;
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function setBooted(v: boolean) {
  if (booted === v) return;
  booted = v;
  listeners.forEach((l) => l());
}

export function useBooted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => booted,
    // Server snapshot: false — the preloader overlay ships in the SSR
    // HTML so nothing ever flashes before the boot sequence.
    () => false,
  );
}
