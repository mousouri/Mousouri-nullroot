"use client";

import { useSyncExternalStore } from "react";

/* ============================================================
   ROOT.SAVER — the idle screensaver store. 90 seconds without
   input and the machine starts dreaming: a phosphor starfield
   overlay (chrome/Screensaver.tsx renders the canvas). Any
   input dismisses it. Also triggerable on demand — the hidden
   terminal's `screensaver` command, or konami-adjacent moods.
   ============================================================ */

export const IDLE_MS = 90_000;
/* input arriving this soon after arming is a trailing event from the
   very action that armed us (e.g. Enter on `screensaver`) — ignore it */
const ARM_GRACE_MS = 600;

let active = false;
let armedAt = 0;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function isSaverActive(): boolean {
  return active;
}

export function useSaver(): boolean {
  return useSyncExternalStore(subscribe, isSaverActive, () => false);
}

export function triggerSaver() {
  if (active) return;
  active = true;
  armedAt = Date.now();
  notify();
}

export function dismissSaver() {
  if (!active) return;
  if (Date.now() - armedAt < ARM_GRACE_MS) return; // trailing input — ignore
  active = false;
  notify();
}
