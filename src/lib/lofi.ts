"use client";

import { useSyncExternalStore } from "react";
import { isMuted, primeAudio } from "@/lib/sound";
import { addListenMs } from "@/lib/achievements";

/* ============================================================
   LO-FI.WAV — a procedural radio that lives in the status bar
   and gets a full page at /station. Zero streams, zero files:
   every station is a 4-bar chord loop rendered live by the
   WebAudio graph — detuned pads through a lowpass, sine bass,
   an optional swung kit and a constant vinyl/tape crackle.

   Multiple stations share one scheduler; switching just swaps
   the progression/BPM/timbre config the next tick reads from,
   and resets the bar grid so the new loop starts clean.

   Listen time accrues to the AUDIOFILE trophy (60s), summed
   across stations. The preference persists (nr-lofi,
   nr-lofi-station) but never autoplays — browsers decide when
   audio may start, and we respect that.
   ============================================================ */

type Chord = { root: number; notes: number[]; bass: number };

export type StationId = "lofi" | "synthwave" | "ambient";

type StationConfig = {
  label: string;
  desc: string;
  bpm: number;
  waveform: OscillatorType;
  drums: boolean;
  padGain: number;
  padCutoff: number;
  crackle: number;
  chordNames: string[];
  progression: Chord[];
};

const STATION_CONFIGS: Record<StationId, StationConfig> = {
  lofi: {
    label: "LO-FI.WAV",
    desc: "Dusty triangle pads over a swung kit — the original status-bar loop.",
    bpm: 72,
    waveform: "triangle",
    drums: true,
    padGain: 0.05,
    padCutoff: 950,
    crackle: 0.0045,
    chordNames: ["Am7", "Fmaj7", "Cmaj7", "G6"],
    progression: [
      { root: 110.0, bass: 55.0, notes: [220.0, 261.63, 329.63, 392.0] },
      { root: 87.31, bass: 43.65, notes: [174.61, 220.0, 261.63, 329.63] },
      { root: 65.41, bass: 65.41, notes: [196.0, 261.63, 329.63, 392.0] },
      { root: 98.0, bass: 49.0, notes: [196.0, 246.94, 293.66, 392.0] },
    ],
  },
  synthwave: {
    label: "OUTRUN.WAV",
    desc: "Sawtooth pads, a driving beat, minor-key nostalgia at 100 BPM.",
    bpm: 100,
    waveform: "sawtooth",
    drums: true,
    padGain: 0.038,
    padCutoff: 1400,
    crackle: 0.002,
    chordNames: ["Am", "G", "F", "E"],
    progression: [
      { root: 110.0, bass: 55.0, notes: [220.0, 261.63, 329.63, 440.0] }, // Am
      { root: 98.0, bass: 49.0, notes: [196.0, 246.94, 293.66, 392.0] }, // G
      { root: 87.31, bass: 43.65, notes: [174.61, 220.0, 261.63, 349.23] }, // F
      { root: 82.41, bass: 41.2, notes: [164.81, 207.65, 246.94, 329.63] }, // E
    ],
  },
  ambient: {
    label: "DRIFT.WAV",
    desc: "No drums, just slow pad swells and tape hiss — a room tone to think in.",
    bpm: 50,
    waveform: "sine",
    drums: false,
    padGain: 0.062,
    padCutoff: 700,
    crackle: 0.007,
    chordNames: ["Cmaj7", "Ebmaj7", "Fm7", "Gm7"],
    progression: [
      { root: 65.41, bass: 32.7, notes: [130.81, 164.81, 196.0, 246.94] },
      { root: 77.78, bass: 38.89, notes: [155.56, 196.0, 233.08, 293.66] },
      { root: 87.31, bass: 43.65, notes: [174.61, 207.65, 261.63, 311.13] },
      { root: 98.0, bass: 49.0, notes: [196.0, 233.08, 293.66, 349.23] },
    ],
  },
};

export const STATION_LIST: Array<Omit<StationConfig, "progression"> & { id: StationId }> = (
  Object.keys(STATION_CONFIGS) as StationId[]
).map((id) => {
  const { progression, ...meta } = STATION_CONFIGS[id]; // UI never needs the raw chord data
  return { id, ...meta };
});

let playing = false;
let startedOnce = false;
let currentStationId: StationId | null = null;
let master: GainNode | null = null;
let analyser: AnalyserNode | null = null;
let crackleSrc: AudioBufferSourceNode | null = null;
let crackleGain: GainNode | null = null;
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

/* ---------- station selection ---------- */

function ensureStationLoaded() {
  if (currentStationId) return;
  currentStationId = "lofi";
  try {
    const saved = window.localStorage.getItem("nr-lofi-station");
    if (saved && saved in STATION_CONFIGS) currentStationId = saved as StationId;
  } catch {
    /* non-persistent is fine */
  }
}

export function getStationId(): StationId {
  ensureStationLoaded();
  return currentStationId!;
}

export function useStationId(): StationId {
  return useSyncExternalStore(subscribe, getStationId, () => "lofi");
}

/** Retunes the shared filter/crackle to the current station's timbre. */
function applyStationAudioParams() {
  ensureStationLoaded();
  if (!ctx || !padFilter || !crackleGain) return;
  const cfg = STATION_CONFIGS[currentStationId!];
  padFilter.frequency.setTargetAtTime(cfg.padCutoff, ctx.currentTime, 0.25);
  crackleGain.gain.setTargetAtTime(cfg.crackle, ctx.currentTime, 0.4);
}

export function setStation(id: StationId) {
  ensureStationLoaded();
  if (id === currentStationId) return;
  currentStationId = id;
  try {
    window.localStorage.setItem("nr-lofi-station", id);
  } catch {
    /* non-persistent is fine */
  }
  applyStationAudioParams();
  if (playing && ctx) {
    // reset the grid so the new progression starts clean on the next tick
    step = 0;
    nextTime = ctx.currentTime + 0.06;
  }
  notify();
}

/** Live frequency-domain analyser for a visualizer — only real once playback has started. */
export function getAnalyser(): AnalyserNode | null {
  return analyser;
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
      // persistent graph: master → destination (+ analyser tap), pads share a lowpass
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      master.connect(analyser);
      padFilter = ctx.createBiquadFilter();
      padFilter.type = "lowpass";
      padFilter.Q.value = 0.6;
      padFilter.connect(master);
      // vinyl/tape crackle — continuous, very quiet, bandpassed noise
      crackleSrc = ctx.createBufferSource();
      crackleSrc.buffer = noiseBuf;
      crackleSrc.loop = true;
      const cq = ctx.createBiquadFilter();
      cq.type = "bandpass";
      cq.frequency.value = 3200;
      cq.Q.value = 0.4;
      crackleGain = ctx.createGain();
      crackleSrc.connect(cq).connect(crackleGain).connect(master);
      crackleSrc.start();
      applyStationAudioParams();
    }
    return ctx;
  } catch {
    return null;
  }
}

/* ---------- voices ---------- */

function pad(freq: number, t0: number, dur: number, waveform: OscillatorType, gainPeak: number) {
  if (!ctx || !padFilter) return;
  const osc = ctx.createOscillator();
  osc.type = waveform;
  osc.frequency.value = freq;
  osc.detune.value = (Math.random() - 0.5) * 12;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gainPeak, t0 + dur * 0.35); // slow swell
  g.gain.linearRampToValueAtTime(0.0001, t0 + dur + 0.9); // long tail
  osc.connect(g).connect(padFilter);
  osc.start(t0);
  osc.stop(t0 + dur + 1.0);
}

function bass(freq: number, t0: number, spb: number) {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.11, t0 + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + spb * 1.6);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + spb * 1.7);
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
function pop(t0: number, crackle: number) {
  if (!ctx || !master || !noiseBuf) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const g = ctx.createGain();
  const peak = crackle * 6.667; // matches the original 0.0045 crackle → 0.03 pop ratio
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.03);
  src.connect(g).connect(master);
  src.start(t0);
  src.stop(t0 + 0.04);
}

/* ---------- scheduler ---------- */

const LOOP_STEPS = 64; // 4 bars × 16 sixteenths

function scheduleStep(s: number, t0: number, cfg: StationConfig, spb: number, bar: number) {
  const chord = cfg.progression[Math.floor(s / 16) % 4];
  const posInBar = s % 16; // 0..15 sixteenths within the bar
  const swing = posInBar % 2 === 1 ? spb * 0.055 : 0; // light swing on off-16ths

  if (posInBar === 0) {
    chord.notes.forEach((f) => pad(f, t0, bar * 0.92, cfg.waveform, cfg.padGain));
    bass(chord.bass, t0, spb);
    if (cfg.drums) kick(t0);
    if (Math.random() < 0.18) pop(t0 + bar * (0.3 + Math.random() * 0.6), cfg.crackle);
  }
  if (posInBar === 8) bass(chord.bass * 1.5, t0, spb); // fifth, one octave feel
  if (cfg.drums && (posInBar === 4 || posInBar === 12)) snare(t0 + swing);
  if (cfg.drums && (posInBar === 0 || posInBar === 8)) kick(t0 + swing);
  if (cfg.drums && posInBar === 14 && Math.random() < 0.25) kick(t0); // lazy ghost kick
  if (cfg.drums && posInBar % 2 === 0) hat(t0 + swing, posInBar % 4 === 0 ? 1 : 0.55);
  // sparse melody — one high note occasionally, like remembering something
  if (posInBar === 6 && Math.random() < 0.3)
    pad(chord.notes[3] * 2, t0, spb * 1.2, cfg.waveform, cfg.padGain);
  if (posInBar === 10 && Math.random() < 0.2)
    pad(chord.notes[2] * 2, t0, spb * 0.8, cfg.waveform, cfg.padGain);
}

function tick() {
  if (!ctx || !playing) return;
  // respect the global mute — gain eases to 0, clock keeps running
  const target = isMuted() ? 0 : 0.5;
  master?.gain.setTargetAtTime(target, ctx.currentTime, 0.12);
  const cfg = STATION_CONFIGS[getStationId()];
  const spb = 60 / cfg.bpm;
  const bar = spb * 4;
  const lookahead = ctx.currentTime + 0.18;
  while (nextTime < lookahead) {
    scheduleStep(step % LOOP_STEPS, nextTime, cfg, spb, bar);
    step++;
    nextTime += spb / 4;
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
  ensureStationLoaded();
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
