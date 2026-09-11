"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEnvironment } from "@/hooks/use-environment";
import { readHi, writeHi } from "@/lib/games";
import { isMuted, playSfx } from "@/lib/sound";

/* ============================================================
   KLACK — four lanes, one metronome, zero mercy. The chart is
   generated, the drums are synthesized live (kick / hat / snare
   ride the same clock as the notes), and the keys are the
   classic D F J K. Hit windows: PERFECT 60ms, GOOD 130ms, OK
   200ms. Misses murder the combo. Survive the track, get graded.
   ============================================================ */

type Phase = "READY" | "RUN" | "PAUSE" | "OVER";
type Judge = "PERFECT" | "GOOD" | "OK" | "MISS";

interface Note {
  t: number; // ms from song start
  lane: number;
  hit: boolean;
  judged: Judge | null;
}

const BPM = 112;
const BEAT = 60000 / BPM;
const SECTIONS = [
  { beats: 20, kind: "warmup" as const },
  { beats: 24, kind: "offbeat" as const },
  { beats: 28, kind: "chaos" as const },
];
const APPROACH = 1800; // ms of fall time
const HIT_Y = 0.82;
const LANES = 4;
const KEYS = ["d", "f", "j", "k"];
const KEY_LABELS = ["D", "F", "J", "K"];

function buildChart(): { notes: Note[]; songEnd: number } {
  const notes: Note[] = [];
  let beat = 0;
  const lanes: number[] = [0, 1, 2, 3];
  let laneIdx = 0;
  for (const sec of SECTIONS) {
    for (let b = 0; b < sec.beats; b++) {
      if (sec.kind === "warmup") {
        notes.push({ t: beat * BEAT, lane: lanes[laneIdx % 4], hit: false, judged: null });
        laneIdx += b % 2 === 0 ? 1 : 2;
      } else if (sec.kind === "offbeat") {
        notes.push({ t: beat * BEAT, lane: lanes[laneIdx % 4], hit: false, judged: null });
        notes.push({ t: (beat + 0.5) * BEAT, lane: lanes[(laneIdx + 2) % 4], hit: false, judged: null });
        laneIdx += 1;
      } else {
        const l = Math.floor(Math.random() * 4);
        notes.push({ t: beat * BEAT, lane: l, hit: false, judged: null });
        if (Math.random() < 0.3) {
          notes.push({ t: beat * BEAT, lane: (l + 1 + Math.floor(Math.random() * 3)) % 4, hit: false, judged: null });
        }
        if (Math.random() < 0.4) {
          notes.push({ t: (beat + 0.5) * BEAT, lane: Math.floor(Math.random() * 4), hit: false, judged: null });
        }
      }
      beat += 1;
    }
  }
  notes.sort((a, b) => a.t - b.t);
  return { notes, songEnd: beat * BEAT + 1200 };
}

/* ---------- tiny synth (kick / hat / snare on the shared clock) ---------- */
function scheduleDrum(
  ctx: AudioContext,
  out: GainNode,
  kind: "kick" | "hat" | "snare",
  when: number,
  noiseBuf: AudioBuffer,
) {
  const g = ctx.createGain();
  g.connect(out);
  if (kind === "kick") {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(150, when);
    o.frequency.exponentialRampToValueAtTime(48, when + 0.11);
    g.gain.setValueAtTime(0.5, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.14);
    o.connect(g);
    o.start(when);
    o.stop(when + 0.16);
  } else {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = kind === "hat" ? "highpass" : "bandpass";
    f.frequency.value = kind === "hat" ? 7000 : 1800;
    const dur = kind === "hat" ? 0.035 : 0.09;
    g.gain.setValueAtTime(kind === "hat" ? 0.09 : 0.22, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    src.connect(f);
    f.connect(g);
    src.start(when);
    src.stop(when + dur + 0.02);
  }
}

export function KlackGame() {
  const { isTouch } = useEnvironment();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const chart = useRef<Note[]>([]);
  const songEnd = useRef(0);
  const phase = useRef<Phase>("READY");
  const startPerf = useRef(0);
  const audioRef = useRef<{ ctx: AudioContext; gain: GainNode; noise: AudioBuffer } | null>(null);
  const scheduledUpTo = useRef(0); // beat index for drums
  const score = useRef(0);
  const combo = useRef(0);
  const bestCombo = useRef(0);
  const counts = useRef({ PERFECT: 0, GOOD: 0, OK: 0, MISS: 0 });
  const laneFlash = useRef<number[]>([0, 0, 0, 0]);
  const judgeFlash = useRef<{ j: Judge; at: number }>({ j: "PERFECT", at: 0 });
  const isTouchRef = useRef(false);
  const acid = useRef("#d7ff3f");

  useEffect(() => {
    isTouchRef.current = isTouch;
  }, [isTouch]);

  const [hud, setHud] = useState<{
    score: number;
    combo: number;
    phase: Phase;
    hi: number;
    record: boolean;
    bestCombo: number;
    counts: { PERFECT: number; GOOD: number; OK: number; MISS: number };
  }>({
    score: 0,
    combo: 0,
    phase: "READY",
    hi: 0,
    record: false,
    bestCombo: 0,
    counts: { PERFECT: 0, GOOD: 0, OK: 0, MISS: 0 },
  });

  /* ---------- theme-reactive accent ---------- */
  useEffect(() => {
    const read = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue("--acid").trim();
      if (v) acid.current = v;
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);

  const songPos = () => performance.now() - startPerf.current;

  const reset = useCallback(() => {
    const c = buildChart();
    chart.current = c.notes;
    songEnd.current = c.songEnd;
    scheduledUpTo.current = 0;
    score.current = 0;
    combo.current = 0;
    bestCombo.current = 0;
    counts.current = { PERFECT: 0, GOOD: 0, OK: 0, MISS: 0 };
    phase.current = "RUN";
    startPerf.current = performance.now() + 400; // 400ms lead-in
    setHud((h) => ({ ...h, score: 0, combo: 0, phase: "RUN", record: false }));
    playSfx("boot");
  }, []);

  const pause = useCallback(() => {
    if (phase.current === "RUN") {
      phase.current = "PAUSE";
      audioRef.current?.ctx.suspend().catch(() => {});
    } else if (phase.current === "PAUSE") {
      phase.current = "RUN";
      audioRef.current?.ctx.resume().catch(() => {});
    }
    setHud((h) => ({ ...h, phase: phase.current }));
  }, []);

  const finish = useCallback(() => {
    phase.current = "OVER";
    audioRef.current?.ctx.suspend().catch(() => {});
    playSfx("ok");
    const record = writeHi("nr-hi-klack", score.current);
    setHud((h) => ({
      ...h,
      phase: "OVER",
      hi: record ? score.current : h.hi,
      record,
      bestCombo: bestCombo.current,
      counts: { ...counts.current },
    }));
  }, []);

  /* ---------- hit a lane ---------- */
  const hit = useCallback((lane: number) => {
    if (phase.current !== "RUN") return;
    const pos = songPos();
    let best: Note | null = null;
    let bestAbs = Infinity;
    for (const n of chart.current) {
      if (n.hit || n.lane !== lane) continue;
      const d = Math.abs(n.t - pos);
      if (d < bestAbs) {
        bestAbs = d;
        best = n;
      }
      if (n.t - pos > 400) break;
    }
    laneFlash.current[lane] = performance.now();
    if (!best || bestAbs > 200) return; // empty swing — no penalty, no credit
    const j: Judge = bestAbs <= 60 ? "PERFECT" : bestAbs <= 130 ? "GOOD" : "OK";
    /* immutable note update — the compiler keeps hook-captured data frozen */
    chart.current = chart.current.map((n) => (n === best ? { ...n, hit: true, judged: j } : n));
    counts.current[j] += 1;
    combo.current += 1;
    bestCombo.current = Math.max(bestCombo.current, combo.current);
    const mult = Math.min(3, 1 + combo.current / 20);
    const base = j === "PERFECT" ? 100 : j === "GOOD" ? 50 : 20;
    score.current += Math.round(base * mult);
    judgeFlash.current = { j, at: performance.now() };
    playSfx("blip");
  }, []);

  /* ---------- input ---------- */
  useEffect(() => {
    const editable = (el: EventTarget | null) => {
      const e = el as HTMLElement | null;
      return !!e && (e.tagName === "INPUT" || e.tagName === "TEXTAREA" || !!e.isContentEditable);
    };
    const onKey = (e: KeyboardEvent) => {
      if (editable(e.target)) return;
      const k = e.key.toLowerCase();
      if (phase.current === "READY" || phase.current === "OVER") {
        if (k === " " || k === "enter") {
          e.preventDefault();
          reset();
        }
        return;
      }
      const lane = KEYS.indexOf(k);
      if (lane >= 0) {
        e.preventDefault();
        hit(lane);
      } else if (k === " ") {
        e.preventDefault();
        pause();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hit, pause, reset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const down = (e: PointerEvent) => {
      if (phase.current === "READY" || phase.current === "OVER") {
        reset();
        return;
      }
      const r = canvas.getBoundingClientRect();
      const lane = Math.floor(((e.clientX - r.left) / r.width) * LANES);
      if (lane >= 0 && lane < LANES) hit(lane);
    };
    canvas.addEventListener("pointerdown", down);
    return () => canvas.removeEventListener("pointerdown", down);
  }, [hit, reset]);

  /* hi score on mount */
  useEffect(() => {
    const t = window.setTimeout(() => setHud((h) => ({ ...h, hi: readHi("nr-hi-klack") })), 0);
    return () => window.clearTimeout(t);
  }, []);

  /* ---------- loop: drums scheduling + note judging + draw ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    let raf = 0;
    let last = 0;

    const fit = () => {
      const w = wrap.clientWidth;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(w * dpr);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);

    const totalBeats = SECTIONS.reduce((a, s) => a + s.beats, 0);

    const scheduleDrums = () => {
      const a = audioRef.current;
      if (!a || isMuted()) return;
      const pos = songPos();
      // schedule any beat whose drum time falls within the next 350ms
      while (scheduledUpTo.current < totalBeats) {
        const b = scheduledUpTo.current;
        const beatTime = b * BEAT;
        if (beatTime > pos + 350) break;
        const when = a.ctx.currentTime + Math.max(0.01, (beatTime - pos) / 1000);
        if (beatTime >= -50) {
          scheduleDrum(a.ctx, a.gain, "kick", when, a.noise);
          if (b % 2 === 1) scheduleDrum(a.ctx, a.gain, "snare", when, a.noise);
          scheduleDrum(a.ctx, a.gain, "hat", when + BEAT / 2000, a.noise);
        }
        scheduledUpTo.current = b + 1;
      }
    };

    const judgeMisses = () => {
      if (phase.current !== "RUN") return;
      const pos = songPos();
      for (const n of chart.current) {
        if (n.hit) continue;
        if (n.t < pos - 200) {
          n.hit = true;
          n.judged = "MISS";
          counts.current.MISS += 1;
          combo.current = 0;
          judgeFlash.current = { j: "MISS", at: performance.now() };
        } else if (n.t > pos + 250) break;
      }
    };

    const draw = (now: number) => {
      const w = canvas.width;
      const acidCol = acid.current;
      const pos = phase.current === "READY" ? -4000 : songPos();

      ctx2d.fillStyle = "#0a0a0a";
      ctx2d.fillRect(0, 0, w, w);

      /* lanes */
      const lw = w / LANES;
      for (let i = 1; i < LANES; i++) {
        ctx2d.strokeStyle = "rgba(242,240,234,0.09)";
        ctx2d.lineWidth = Math.max(1, w / 720);
        ctx2d.beginPath();
        ctx2d.moveTo(i * lw, 0);
        ctx2d.lineTo(i * lw, w);
        ctx2d.stroke();
      }

      /* hit line */
      ctx2d.strokeStyle = "rgba(242,240,234,0.55)";
      ctx2d.setLineDash([w * 0.012, w * 0.01]);
      ctx2d.lineWidth = Math.max(1.5, w * 0.003);
      ctx2d.beginPath();
      ctx2d.moveTo(0, HIT_Y * w);
      ctx2d.lineTo(w, HIT_Y * w);
      ctx2d.stroke();
      ctx2d.setLineDash([]);

      /* key labels at the bottom of each lane */
      ctx2d.font = `${Math.floor(w * 0.02)}px monospace`;
      ctx2d.textAlign = "center";
      for (let i = 0; i < LANES; i++) {
        ctx2d.fillStyle = "rgba(242,240,234,0.3)";
        ctx2d.fillText(KEY_LABELS[i], i * lw + lw / 2, w * 0.965);
      }

      /* notes */
      for (const n of chart.current) {
        if (n.hit) continue;
        const dy = n.t - pos;
        if (dy > APPROACH + 100 || dy < -250) continue;
        const y = HIT_Y - (dy / APPROACH) * HIT_Y;
        const pad = lw * 0.14;
        const s = lw - pad * 2;
        const x = n.lane * lw + pad;
        ctx2d.fillStyle = acidCol;
        ctx2d.fillRect(x, y * w - s / 2, s, s * 0.6);
        ctx2d.fillStyle = "#0a0a0a";
        ctx2d.fillRect(x + s * 0.38, y * w - s * 0.06, s * 0.24, s * 0.12);
      }

      /* lane hit flashes */
      for (let i = 0; i < LANES; i++) {
        const at = laneFlash.current[i];
        if (now - at < 120) {
          ctx2d.fillStyle = `rgba(${acidToRgb(acidCol)},${(0.35 * (1 - (now - at) / 120)).toFixed(3)})`;
          ctx2d.fillRect(i * lw, HIT_Y * w - w * 0.05, lw, w * 0.06);
        }
      }

      /* judgement + combo */
      if (now - judgeFlash.current.at < 500) {
        const j = judgeFlash.current.j;
        ctx2d.fillStyle =
          j === "PERFECT" ? acidCol : j === "MISS" ? "rgba(242,240,234,0.8)" : "rgba(242,240,234,0.65)";
        ctx2d.font = `${Math.floor(w * 0.026)}px monospace`;
        ctx2d.fillText(j, w / 2, w * 0.2);
      }
      if (combo.current > 2 && phase.current === "RUN") {
        ctx2d.fillStyle = "rgba(242,240,234,0.9)";
        ctx2d.font = `${Math.floor(w * 0.06)}px monospace`;
        ctx2d.fillText(String(combo.current), w / 2, w * 0.34);
        ctx2d.font = `${Math.floor(w * 0.014)}px monospace`;
        ctx2d.fillStyle = "rgba(242,240,234,0.4)";
        ctx2d.fillText("COMBO", w / 2, w * 0.38);
      }

      /* progress hairline */
      if (phase.current === "RUN" || phase.current === "PAUSE") {
        const frac = Math.max(0, Math.min(1, pos / songEnd.current));
        ctx2d.fillStyle = acidCol;
        ctx2d.fillRect(0, 0, w * frac, Math.max(2, w * 0.006));
      }

      /* lead-in countdown */
      if (phase.current === "RUN" && pos < 0) {
        ctx2d.fillStyle = "rgba(242,240,234,0.7)";
        ctx2d.font = `${Math.floor(w * 0.05)}px monospace`;
        ctx2d.fillText(String(Math.ceil(-pos / 500)), w / 2, w * 0.5);
      }
    };

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (!last) last = t;
      const dt = Math.min(48, t - last);
      last = t;

      if (phase.current === "RUN") {
        scheduleDrums();
        judgeMisses();
        if (songPos() > songEnd.current) finish();
      }

      setHud((h) => {
        if (h.score === score.current && h.combo === combo.current && h.phase === phase.current) return h;
        return { ...h, score: score.current, combo: combo.current, phase: phase.current };
      });
      draw(t);
      void dt;
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      audioRef.current?.ctx.close().catch(() => {});
      audioRef.current = null;
    };
  }, [finish]);

  /* lazily spin up the synth on first boot (user gesture — allowed) */
  const boot = useCallback(() => {
    if (!audioRef.current) {
      try {
        const ctx = new AudioContext();
        const gain = ctx.createGain();
        gain.gain.value = 0.9;
        gain.connect(ctx.destination);
        const noise = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
        const data = noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        audioRef.current = { ctx, gain, noise };
      } catch {
        /* no audio — the chart still plays silently */
      }
    }
    void audioRef.current?.ctx.resume().catch(() => {});
  }, []);

  /* wrap reset to also boot audio */
  const start = useCallback(() => {
    boot();
    reset();
  }, [boot, reset]);

  const accuracy = (() => {
    const c = hud.counts;
    const total = c.PERFECT + c.GOOD + c.OK + c.MISS;
    if (!total) return 0;
    return (c.PERFECT + c.GOOD * 0.6 + c.OK * 0.3) / total;
  })();
  const grade = accuracy >= 0.95 ? "S" : accuracy >= 0.85 ? "A" : accuracy >= 0.7 ? "B" : "C";

  return (
    <div className="mx-auto w-full max-w-[560px]">
      {/* HUD */}
      <div className="flex items-center justify-between border border-line bg-ink px-3 py-2 font-mono text-[10px] tracking-[0.25em]">
        <span className="text-dim">
          SCORE <span className="text-acid tabular-nums">{hud.score}</span>
        </span>
        <span className="text-dim">
          COMBO <span className="text-paper tabular-nums">x{hud.combo}</span>
        </span>
        <span className="text-dim">
          BPM <span className="text-paper tabular-nums">{BPM}</span>
        </span>
        <span className="text-dim">
          HI <span className="text-paper tabular-nums">{hud.hi}</span>
        </span>
      </div>

      <div className="flex items-center justify-between border border-t-0 border-line bg-ink px-3 py-1.5 font-mono text-[9px] tracking-[0.25em]">
        <span className="text-acid">
          {hud.phase === "RUN" && hud.combo > 0 && hud.combo % 10 === 0 ? "LOCKED IN — DON'T BLINK" : "\u00a0"}
        </span>
        <span className={hud.phase === "RUN" ? "text-acid" : hud.phase === "OVER" ? "text-paper" : "text-dim"}>
          {hud.phase === "RUN" ? "STATUS: LIVE" : hud.phase === "PAUSE" ? "STATUS: HELD" : hud.phase === "OVER" ? "STATUS: TRACK END" : "STATUS: BOOT"}
        </span>
      </div>

      {/* screen */}
      <div ref={wrapRef} className="relative mt-2 aspect-square w-full border border-line">
        <canvas ref={canvasRef} className="scanlines block h-full w-full touch-none" aria-label="Klack game screen" />
        {hud.phase === "READY" && (
          <Overlay onClick={start}>
            <p className="font-display text-4xl tracking-wide text-paper md:text-5xl">KLACK</p>
            <p className="mt-3 max-w-[38ch] font-mono text-[10px] leading-relaxed tracking-[0.2em] text-dim">
              FOUR LANES. SYNTHESIZED DRUMS ON THE SAME CLOCK AS THE
              CHART. HIT THE KEY WHEN THE BLOCK CROSSES THE LINE —
              PERFECT WINS THE COMBO.
            </p>
            <button
              type="button"
              data-cursor="RUN"
              className="mt-6 border border-acid px-4 py-2 font-mono text-[11px] tracking-[0.3em] text-acid transition-colors hover:bg-acid hover:text-ink"
            >
              [ EXECUTE ]
            </button>
          </Overlay>
        )}
        {hud.phase === "PAUSE" && (
          <Overlay onClick={pause}>
            <p className="font-mono text-sm tracking-[0.4em] text-acid">SIGSTOP</p>
            <p className="mt-3 font-mono text-[10px] tracking-[0.3em] text-dim">SPACE TO RESUME</p>
          </Overlay>
        )}
        {hud.phase === "OVER" && (
          <Overlay onClick={start}>
            <p className="font-display text-4xl tracking-wide text-paper md:text-5xl">TRACK END</p>
            <p className="mt-2 font-mono text-[10px] tracking-[0.3em] text-dim">GRADE</p>
            <p className="font-display text-6xl text-acid">{grade}</p>
            <p className="mt-2 font-mono text-[11px] tracking-[0.2em] text-dim">
              SCORE <span className="text-acid">{hud.score}</span> — BEST COMBO{" "}
              <span className="text-paper">x{hud.bestCombo}</span>
            </p>
            <p className="mt-1 font-mono text-[10px] tracking-[0.2em] text-dim">
              P {hud.counts.PERFECT} · G {hud.counts.GOOD} · OK {hud.counts.OK} · MISS {hud.counts.MISS}
            </p>
            <p className="mt-1 font-mono text-[11px] tracking-[0.25em] text-dim">
              HI <span className="text-paper">{hud.hi}</span>
              {hud.record && <span className="ml-2 text-acid">NEW RECORD</span>}
            </p>
            <button
              type="button"
              data-cursor="RETRY"
              className="mt-5 border border-acid px-4 py-2 font-mono text-[11px] tracking-[0.3em] text-acid transition-colors hover:bg-acid hover:text-ink"
            >
              [ ENCORE ]
            </button>
          </Overlay>
        )}
      </div>
      <p className="mt-2 font-mono text-[9px] tracking-[0.3em] text-dim/60">
        {isTouch ? "TAP THE LANE ON THE BEAT" : "D F J K — HIT LANES — SPACE PAUSE"}
      </p>
    </div>
  );
}

function Overlay({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-ink/85 p-4 text-center"
    >
      {children}
    </div>
  );
}

function acidToRgb(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "215,255,63";
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}
