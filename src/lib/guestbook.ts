"use client";

/* ============================================================
   GUESTBOOK — a signature wall that lives in your browser.
   No accounts, no backend: entries persist to localStorage and
   get stamped with the colorway you were wearing when you
   signed. Same deal as the arcade hi-scores.
   ============================================================ */

export interface GuestEntry {
  n: string; // name
  m: string; // message
  t: number; // signed at (epoch ms)
  theme: string; // colorway at signing time
}

const KEY = "nr-guestbook";
const MAX_ENTRIES = 64;

function lsGet(): GuestEntry[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as GuestEntry[]) : [];
  } catch {
    return [];
  }
}

function lsSet(entries: GuestEntry[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    /* non-persistent is fine */
  }
}

/** sanitize: strip control chars, collapse whitespace, clamp length */
function clean(input: string, max: number): string {
  return input
    .replace(/[\u0000-\u001f\u007f<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function readGuestbook(): GuestEntry[] {
  if (typeof window === "undefined") return [];
  return lsGet().reverse(); // newest first for display
}

export function guestbookCount(): number {
  if (typeof window === "undefined") return 0;
  return lsGet().length;
}

/**
 * Sign the wall. Returns an error string, or null on success.
 * The caller supplies the current theme so the entry is stamped.
 */
export function signGuestbook(name: string, message: string, theme: string): string | null {
  if (typeof window === "undefined") return "guestbook: unavailable";
  const n = clean(name, 24);
  const m = clean(message, 140);
  if (!n) return "guestbook: a name is required (any alias works)";
  if (!m) return "guestbook: a message is required (say something)";
  const entries = lsGet();
  // one signature per name — signing again overwrites your old line
  const existing = entries.findIndex((e) => e.n.toLowerCase() === n.toLowerCase());
  const entry: GuestEntry = { n, m, t: Date.now(), theme };
  if (existing >= 0) entries[existing] = entry;
  else entries.push(entry);
  lsSet(entries);
  return null;
}
