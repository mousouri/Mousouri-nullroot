"use client";

import { useSyncExternalStore } from "react";

/* ============================================================
   Sound engine — every sound is synthesized with WebAudio at
   runtime: zero audio files, zero network payload. The palette
   is deliberately tiny and mechanical (blips, key clacks, one
   CRT boot hum) so it reads as equipment, not as music.

   Mute state persists to localStorage("nr-mute"). The AudioContext
   is created lazily and only speaks after the first user gesture
   (browser autoplay policy) — attempts before that are silent
   drops, never errors.
   ============================================================ */

let muted = false;
let prefsRead = false;
let ctx: AudioContext | null = null;
let noiseBuf: AudioBuffer | null = null;
const listeners = new Set<() => void>();
const lastPlayed = new Map<string, number>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function notify() {
  listeners.forEach((l) => l());
}

export function initSoundPrefs() {
  if (prefsRead) return;
  prefsRead = true;
  try {
    muted = window.localStorage.getItem("nr-mute") === "1";
  } catch {
    /* private mode — default (on) stays */
  }
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(m: boolean) {
  muted = m;
  try {
    window.localStorage.setItem("nr-mute", m ? "1" : "0");
  } catch {
    /* non-persistent is fine */
  }
  notify();
}

export function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}

export function useMuted(): boolean {
  return useSyncExternalStore(subscribe, isMuted, () => false);
}

/* ---------- context management ---------- */

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      // shared white-noise buffer — built once, reused by every noise voice
      const len = Math.floor(ctx.sampleRate * 0.5);
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    return ctx;
  } catch {
    return null;
  }
}

/** Unlock audio on the first real user gesture (autoplay policy). */
export function primeAudio() {
  const c = getCtx();
  if (c && c.state === "suspended") void c.resume();
}

/* ---------- voices ---------- */

const MIN_GAP_MS = 45;

function canPlay(tag: string): boolean {
  if (muted) return false;
  const c = getCtx();
  if (!c || c.state !== "running") return false;
  const now = performance.now();
  const last = lastPlayed.get(tag) ?? -Infinity;
  if (now - last < MIN_GAP_MS) return false;
  lastPlayed.set(tag, now);
  return true;
}

function tone(
  type: OscillatorType,
  f0: number,
  f1: number,
  dur: number,
  peak: number,
  delay = 0,
) {
  const c = ctx!;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t0);
  if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function hiss(
  dur: number,
  peak: number,
  filter: { type: BiquadFilterType; f0: number; f1?: number; q?: number },
  delay = 0,
) {
  const c = ctx!;
  const t0 = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noiseBuf!;
  const bq = c.createBiquadFilter();
  bq.type = filter.type;
  bq.frequency.setValueAtTime(filter.f0, t0);
  if (filter.f1) bq.frequency.exponentialRampToValueAtTime(filter.f1, t0 + dur);
  bq.Q.value = filter.q ?? 1;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(bq).connect(g).connect(c.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

/* ---------- public sfx ---------- */

export const sfx = {
  /** hover blip — short UI tick */
  blip() {
    if (!canPlay("blip")) return;
    tone("square", 1560, 1180, 0.045, 0.028);
  },

  /** pointer down — mechanical click */
  click() {
    if (!canPlay("click")) return;
    hiss(0.03, 0.09, { type: "bandpass", f0: 2600, q: 2 });
    tone("sine", 190, 150, 0.05, 0.05);
  },

  /** keyboard clack (terminal / palette / form inputs) */
  key() {
    if (!canPlay("key")) return;
    hiss(0.018, 0.06, { type: "highpass", f0: 3200 });
    tone("square", 340, 210, 0.03, 0.035);
  },

  /** route wipe — filtered noise whoosh */
  wipe() {
    if (!canPlay("wipe")) return;
    hiss(0.42, 0.07, { type: "lowpass", f0: 420, f1: 5200 });
    tone("sine", 90, 55, 0.35, 0.04);
  },

  /** CRT power-on hum (preloader) */
  boot() {
    if (!canPlay("boot")) return;
    tone("sawtooth", 52, 104, 0.7, 0.035);
    hiss(0.7, 0.03, { type: "lowpass", f0: 900, f1: 240 });
  },

  /** confirm — two-note ok (theme change, exec) */
  ok() {
    if (!canPlay("ok")) return;
    tone("square", 660, 660, 0.06, 0.04);
    tone("square", 990, 990, 0.09, 0.04, 0.07);
  },

  /** error / denied */
  err() {
    if (!canPlay("err")) return;
    tone("square", 150, 110, 0.09, 0.06);
    tone("square", 120, 90, 0.12, 0.06, 0.1);
  },

  /** game pickup — ascending blip (PACKET RUN bits) */
  pickup() {
    if (!canPlay("pickup")) return;
    tone("sine", 720, 1440, 0.09, 0.05);
  },

  /** game death — falling zap */
  zap() {
    if (!canPlay("zap")) return;
    tone("sawtooth", 880, 55, 0.3, 0.06);
    hiss(0.22, 0.05, { type: "lowpass", f0: 2200, f1: 200 });
  },
};

/** Fire a sound by name from non-React contexts. Never throws. */
export function playSfx(name: keyof typeof sfx) {
  try {
    sfx[name]();
  } catch {
    /* audio is a garnish, never a dependency */
  }
}
