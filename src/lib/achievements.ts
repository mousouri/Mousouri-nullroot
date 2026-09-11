"use client";

import { useSyncExternalStore } from "react";
import { GAMES } from "@/lib/data";
import { readHi } from "@/lib/games";

/* ============================================================
   ACHIEVEMENTS — twelve trophies, zero servers. The engine
   watches localStorage (hi-scores, command count, visited
   pages, colorways tried, guestbook, the hidden flag) plus the
   wall clock, and unlocks toasts as conditions come true.
   Pure client, pure localStorage — same rules as the arcade.
   ============================================================ */

export interface Trophy {
  id: string;
  name: string;
  desc: string;
  secret?: boolean;
  test: () => boolean;
}

/* ---------- tiny localStorage helpers ---------- */
function lsGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function lsSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode — trophies just don't persist */
  }
}
function lsJson<T>(key: string, fallback: T): T {
  try {
    const raw = lsGet(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function lsAdd(key: string, value: string): string[] {
  const arr = lsJson<string[]>(key, []);
  if (!arr.includes(value)) arr.push(value);
  lsSet(key, JSON.stringify(arr));
  return arr;
}

/* ---------- tracking stores (raw localStorage) ---------- */
export function trackCommand() {
  const n = Number(lsGet("nr-cmds") ?? 0) + 1;
  lsSet("nr-cmds", String(n));
  checkEnv();
}
export function trackPage(page: string) {
  lsAdd("nr-pages", page);
  checkEnv();
}
export function trackTheme(name: string) {
  lsAdd("nr-themes", name);
  checkEnv();
}
export function trackMute() {
  checkEnv();
}
export function trackDay() {
  const day = new Date().toISOString().slice(0, 10);
  lsAdd("nr-days", day);
  checkEnv();
}
export function trackGuestbook() {
  checkEnv();
}
export function trackFlag() {
  lsSet("nr-flag", "1");
  checkEnv();
}
export function hasFlag(): boolean {
  return lsGet("nr-flag") === "1";
}
/* ---------- pass-4 trackers (new surfaces, same rules) ---------- */
export function trackAma() {
  const n = Number(lsGet("nr-ama") ?? 0) + 1;
  lsSet("nr-ama", String(n));
  checkEnv();
}
/** cumulative listening time — the lo-fi engine flushes every few bars */
export function addListenMs(ms: number) {
  const total = Number(lsGet("nr-listen-ms") ?? 0) + Math.max(0, Math.floor(ms));
  lsSet("nr-listen-ms", String(total));
  checkEnv();
}
export function trackSaver() {
  lsSet("nr-saver", "1");
  checkEnv();
}
export function trackGod() {
  lsSet("nr-god", "1");
  checkEnv();
}
export function trackCoffee() {
  lsSet("nr-coffee", "1");
  checkEnv();
}
export function trackSudo() {
  const n = Number(lsGet("nr-sudo") ?? 0) + 1;
  lsSet("nr-sudo", String(n));
  checkEnv();
}
export function trackSparks() {
  checkEnv();
}

/* ---------- the twenty ---------- */
const HI_THRESHOLD = 2000;
const DEEP_PAGES = ["stack", "now", "timeline", "ama", "resume"];
const LISTEN_THRESHOLD_MS = 60_000;

export const TROPHIES: Trophy[] = [
  {
    id: "first-blood",
    name: "FIRST BLOOD",
    desc: "Bank a score in any cabinet.",
    test: () => GAMES.some((g) => readHi(g.hiKey) > 0),
  },
  {
    id: "grand-slam",
    name: "GRAND SLAM",
    desc: "Bank a score in every cabinet in the arcade.",
    test: () => GAMES.every((g) => readHi(g.hiKey) > 0),
  },
  {
    id: "high-roller",
    name: "HIGH ROLLER",
    desc: `Bank ${HI_THRESHOLD}+ points in a single cabinet.`,
    test: () => GAMES.some((g) => readHi(g.hiKey) >= HI_THRESHOLD),
  },
  {
    id: "shell-shocked",
    name: "SHELL SHOCKED",
    desc: "Run 10 commands in the NR-SHELL.",
    test: () => Number(lsGet("nr-cmds") ?? 0) >= 10,
  },
  {
    id: "cartographer",
    name: "CARTOGRAPHER",
    desc: "Visit every page on the site.",
    test: () => {
      const pages = lsJson<string[]>("nr-pages", []);
      return ["home", "work", "notes", "arcade", "guestbook"].every((p) => pages.includes(p));
    },
  },
  {
    id: "chameleon",
    name: "CHAMELEON",
    desc: "Try all three colorways.",
    test: () => {
      const themes = lsJson<string[]>("nr-themes", []);
      return ["acid", "matrix", "amber"].every((t) => themes.includes(t));
    },
  },
  {
    id: "silent-running",
    name: "SILENT RUNNING",
    desc: "Mute the machine. It respects your silence.",
    test: () => lsGet("nr-mute") === "1",
  },
  {
    id: "night-shift",
    name: "NIGHT SHIFT",
    desc: "Be here between midnight and 5am. Touch grass after.",
    test: () => {
      const h = new Date().getHours();
      return h < 5;
    },
  },
  {
    id: "guest-of-honor",
    name: "GUEST OF HONOR",
    desc: "Sign the guestbook.",
    test: () => lsJson<unknown[]>("nr-guestbook", []).length > 0,
  },
  {
    id: "cryptanalyst",
    name: "CRYPTANALYST",
    desc: "Find what was hidden. Assemble what was scattered.",
    secret: true,
    test: () => lsGet("nr-flag") === "1",
  },
  {
    id: "regular",
    name: "REGULAR",
    desc: "Come back on three different days.",
    test: () => lsJson<string[]>("nr-days", []).length >= 3,
  },
  /* ---------- pass 4 — eight more, same energy ---------- */
  {
    id: "idea-guy",
    name: "IDEA GUY",
    desc: "Strike the IDEA.BULB ten times. The filament remembers.",
    test: () => Number(lsGet("nr-bulb-sparks") ?? 0) >= 10,
  },
  {
    id: "deep-dive",
    name: "DEEP DIVE",
    desc: "Visit now, timeline, ama, resume and the stack page.",
    test: () => {
      const pages = lsJson<string[]>("nr-pages", []);
      return DEEP_PAGES.every((p) => pages.includes(p));
    },
  },
  {
    id: "ask-me",
    name: "ASK ME ANYTHING",
    desc: "Transmit a question to the oracle.",
    test: () => Number(lsGet("nr-ama") ?? 0) >= 1,
  },
  {
    id: "audiofile",
    name: "AUDIOFILE",
    desc: `Listen to LO-FI.WAV for ${LISTEN_THRESHOLD_MS / 1000} seconds. It's generated, not streamed.`,
    test: () => Number(lsGet("nr-listen-ms") ?? 0) >= LISTEN_THRESHOLD_MS,
  },
  {
    id: "dream-on",
    name: "DREAM ON",
    desc: "Let the machine idle long enough to dream.",
    secret: true,
    test: () => lsGet("nr-saver") === "1",
  },
  {
    id: "god-mode",
    name: "GOD MODE",
    desc: "The old code. The oldest input there is.",
    secret: true,
    test: () => lsGet("nr-god") === "1",
  },
  {
    id: "caffeinated",
    name: "CAFFEINATED",
    desc: "Brew unit invoked. Error 418 accepted.",
    test: () => lsGet("nr-coffee") === "1",
  },
  {
    id: "rebel",
    name: "REBEL",
    desc: "Attempt filesystem deletion three times. persistence appreciated.",
    secret: true,
    test: () => Number(lsGet("nr-sudo") ?? 0) >= 3,
  },
  {
    id: "completionist",
    name: "COMPLETIONIST",
    desc: "Unlock every other trophy. There is nothing left to prove.",
    secret: true,
    test: () => TROPHIES.filter((t) => t.id !== "completionist").every((t) => unlocked.has(t.id)),
  },
];

/* ---------- store ---------- */
let unlocked = new Set<string>();
let toast: Trophy | null = null;
let toastTimer = 0;
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

export function loadAchievements() {
  unlocked = new Set(lsJson<string[]>("nr-ach", []));
  notify();
}

function persist() {
  lsSet("nr-ach", JSON.stringify([...unlocked]));
}

function showToast(t: Trophy) {
  toast = t;
  notify();
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast = null;
    notify();
  }, 3600);
}

export function unlock(id: string): boolean {
  if (unlocked.has(id)) return false;
  const t = TROPHIES.find((x) => x.id === id);
  if (!t) return false;
  unlocked.add(id);
  persist();
  showToast(t);
  return true;
}

export function unlockMany(ids: string[]): string | null {
  let first: string | null = null;
  for (const id of ids) {
    if (unlock(id) && !first) first = id;
  }
  return first;
}

/** Evaluate every env-based trophy; unlock whatever qualifies. */
export function checkEnv() {
  if (typeof window === "undefined") return;
  const newly: string[] = [];
  for (const t of TROPHIES) {
    if (t.id === "completionist") continue;
    if (!unlocked.has(t.id) && t.test()) newly.push(t.id);
  }
  unlockMany(newly);
  // completionist last — it depends on the others' state
  const comp = TROPHIES.find((t) => t.id === "completionist");
  if (comp && !unlocked.has(comp.id) && comp.test()) unlock(comp.id);
}

export function isUnlocked(id: string): boolean {
  return unlocked.has(id);
}

export function useUnlocked(): Set<string> {
  return useSyncExternalStore(subscribe, () => unlocked, () => new Set<string>());
}

export function useCurrentToast(): Trophy | null {
  return useSyncExternalStore(
    subscribe,
    () => toast,
    () => null,
  );
}
