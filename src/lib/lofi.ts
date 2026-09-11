"use client";

import { useSyncExternalStore } from "react";
import { isMuted, primeAudio } from "@/lib/sound";
import { addListenMs } from "@/lib/achievements";

/* ============================================================
   LO-FI.WAV — a procedural lo-fi radio that lives in the
   status bar. Zero streams, zero files: a 4-bar chord loop
   (Am7 → Fmaj7 → Cmaj7 → G6) rendered live by the WebAudio
   graph — detuned triangle pads through a slow lowpass,
   sine bass, a swung hat, a soft kick/snare and a constant
   vinyl crackle. 72 BPM. The mute switch silences it like
   every other voice on the site.

   Listen time accrues to the AUDIOFILE trophy (60s).
   The preference persists (nr-lofi) but never autoplays —
   browsers decide when audio may start, and we respect that.
   ============================================================ */

const BPM = 72;
const SPB = 60 / BPM; // seconds per beat
const BAR = SPB * 4;

type Chord = { root: number; notes: number[]; bass: number };
/* frequencies — A minor world, all voiced low and warm */
const PROGRESSION: Chord[] = [
  { root: 110.0, bass: 55.0, notes: [220.0, 261.63, 329.63, 392.0] }, // Am7
  { root: 87.31, bass: 43.65, notes: [174.61, 220.0, 261.63, 329.63] }, // Fmaj7
  { root: 65.41, bass: 65.41, notes: [196.0, 261.63, 329.63, 392.0] }, // Cmaj7
  { root: 98.0, bass: 49.0, notes: [196.0, 246.94, 293.66, 392.0] }, // G6
];

let playing = false;
let startedOnce = false;
let master: GainNode | null = null;
let crackleSrc: AudioBufferSourceNode | null = null;
let padFilter: BiquadFilterNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let ctx: AudioContext | null = null;
let schedTimer = 0;
let nextTime = 0;
let step = 0; // 16th-note grid position across the 4-bar loop
let listenAccum = 0;
let listenMark = 0;
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

export function isLofiPlaying(): boolean {
  return playing;
}

export function useLofi(): boolean {
  return useSyncExternalStore(subscribe, isLofiPlaying, () => false);
}

export function lofiEverStarted(): boolean {
  try {
    return window.localStorage.getItem("nr-lofi") === "1";
  } catch {
    return false;
  }
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      // shared noise buffer for hats / snare / crackle
      const len = ctx.sampleRate;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      // persistent graph: master → destination, pads share a lowpass
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      padFilter = ctx.createBiquadFilter();
      padFilter.type = "lowpass";
      padFilter.frequency.value = 950;
      padFilter.Q.value = 0.6;
      padFilter.connect(master);
      // vinyl crackle — continuous, very quiet, bandpassed noise
      crackleSrc = ctx.createBufferSource();
      crackleSrc.buffer = noiseBuf;
      crackleSrc.loop = true;
      const cq = ctx.createBiquadFilter();
      cq.type = "bandpass";
      cq.frequency.value = 3200;
      cq.Q.value = 0.4;
      const cg = ctx.createGain();
      cg.gain.value = 0.0045;
      crackleSrc.connect(cq).connect(cg).connect(master);
      crackleSrc.start();
    }
    return ctx;
  } catch {
    return null;
  }
}

/* ---------- voices ---------- */

function pad(freq: number, t0: number, dur: number) {
  if (!ctx || !padFilter) return;
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = freq;
  osc.detune.value = (Math.random() - 0.5) * 12;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(0.05, t0 + dur * 0.35); // slow swell
  g.gain.linearRampToValueAtTime(0.0001, t0 + dur + 0.9); // long tail
  osc.connect(g).connect(padFilter);
  osc.start(t0);
  osc.stop(t0 + dur + 1.0);
}

function bass(freq: number, t0: number) {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.11, t0 + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + SPB * 1.6);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + SPB * 1.7);
}

function kick(t0: number) {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(115, t0);
  osc.frequency.exponentialRampToValueAtTime(42, t0 + 0.11);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.16, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + 0.26);
}

function hat(t0: number, v: number) {
  if (!ctx || !master || !noiseBuf) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const bq = ctx.createBiquadFilter();
  bq.type = "highpass";
  bq.frequency.value = 6800;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.028 * v, t0 + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
  src.connect(bq).connect(g).connect(master);
  src.start(t0);
  src.stop(t0 + 0.07);
}

function snare(t0: number) {
  if (!ctx || !master || !noiseBuf) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const bq = ctx.createBiquadFilter();
  bq.type = "bandpass";
  bq.frequency.value = 1900;
  bq.Q.value = 0.9;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.07, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.17);
  src.connect(bq).connect(g).connect(master);
  src.start(t0);
  src.stop(t0 + 0.19);
}

/* crackle pops — the record is old, deal with it */
function pop(t0: number) {
  if (!ctx || !master || !noiseBuf) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.03, t0 + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.03);
  src.connect(g).connect(master);
  src.start(t0);
  src.stop(t0 + 0.04);
}

/* ---------- scheduler ---------- */

const LOOP_STEPS = 64; // 4 bars × 16 sixteenths

function scheduleStep(s: number, t0: number) {
  const chord = PROGRESSION[Math.floor(s / 16) % 4];
  const posInBar = s % 16; // 0..15 sixteenths within the bar
  const swing = posInBar % 2 === 1 ? SPB * 0.055 : 0; // light swing on off-16ths

  if (posInBar === 0) {
    chord.notes.forEach((f) => pad(f, t0, BAR * 0.92));
    bass(chord.bass, t0);
    kick(t0);
    if (Math.random() < 0.18) pop(t0 + BAR * (0.3 + Math.random() * 0.6));
  }
  if (posInBar === 8) bass(chord.bass * 1.5, t0); // fifth, one octave feel
  if (posInBar === 4 || posInBar === 12) snare(t0 + swing);
  if (posInBar === 0 || posInBar === 8) kick(t0 + swing);
  if (posInBar === 14 && Math.random() < 0.25) kick(t0); // lazy ghost kick
  if (posInBar % 2 === 0) hat(t0 + swing, posInBar % 4 === 0 ? 1 : 0.55);
  // sparse melody — one high note occasionally, like remembering something
  if (posInBar === 6 && Math.random() < 0.3) pad(chord.notes[3] * 2, t0, SPB * 1.2);
  if (posInBar === 10 && Math.random() < 0.2) pad(chord.notes[2] * 2, t0, SPB * 0.8);
}

function tick() {
  if (!ctx || !playing) return;
  // respect the global mute — gain eases to 0, clock keeps running
  const target = isMuted() ? 0 : 0.5;
  master?.gain.setTargetAtTime(target, ctx.currentTime, 0.12);
  const lookahead = ctx.currentTime + 0.18;
  while (nextTime < lookahead) {
    scheduleStep(step % LOOP_STEPS, nextTime);
    step++;
    nextTime += SPB / 4;
  }
  // listen-time accounting → trophy engine every ~10s of playback
  const now = performance.now();
  listenAccum += now - listenMark;
  listenMark = now;
  if (listenAccum >= 10_000) {
    addListenMs(listenAccum);
    listenAccum = 0;
  }
}

export function startLofi() {
  if (playing) return;
  const c = getCtx();
  if (!c) return;
  primeAudio();
  void c.resume();
  playing = true;
  startedOnce = true;
  try {
    window.localStorage.setItem("nr-lofi", "1");
  } catch {
    /* non-persistent is fine */
  }
  nextTime = c.currentTime + 0.06;
  listenMark = performance.now();
  schedTimer = window.setInterval(tick, 50);
  notify();
}

export function stopLofi() {
  if (!playing) return;
  playing = false;
  window.clearInterval(schedTimer);
  // flush remaining listen time
  if (listenMark) {
    listenAccum += performance.now() - listenMark;
    listenMark = 0;
  }
  if (listenAccum > 0) {
    addListenMs(listenAccum);
    listenAccum = 0;
  }
  // ease the master down; the last pad tail fades out naturally
  if (ctx && master) master.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
  notify();
}

export function toggleLofi(): boolean {
  if (playing) stopLofi();
  else startLofi();
  return playing;
}

/** status-bar hint: user previously enabled the radio */
export function lofiResumeHint(): boolean {
  return startedOnce || lofiEverStarted();
}
