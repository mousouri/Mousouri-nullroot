"use client";

import { useEffect, useRef } from "react";
import { PageShell } from "@/components/pages/PageShell";
import {
  useLofi,
  useStationId,
  startLofi,
  toggleLofi,
  setStation,
  getAnalyser,
  STATION_LIST,
  type StationId,
} from "@/lib/lofi";
import { playSfx } from "@/lib/sound";

/* ============================================================
   ~/station — the full-page home for LO-FI.WAV. Same zero-file
   WebAudio engine that runs in the status bar, just with room
   to breathe: a live bar visualizer read straight off the
   engine's AnalyserNode, and three switchable synthesized
   stations instead of one fixed loop.
   ============================================================ */

export function StationScreen() {
  const playing = useLofi();
  const stationId = useStationId();

  // arriving here is itself a user gesture (a nav click, a "goto station"
  // command) — good enough for the autoplay policy, so the station opens
  // playing instead of making you press play twice.
  useEffect(() => {
    startLofi();
  }, []);

  const press = () => {
    toggleLofi();
    playSfx("ok");
  };

  const pick = (id: StationId) => {
    if (id === stationId) return;
    setStation(id);
    playSfx("ok");
  };

  const active = STATION_LIST.find((s) => s.id === stationId) ?? STATION_LIST[0];

  return (
    <PageShell crumb="~/station — LO-FI.WAV" backTo={{ page: "home" }} backLabel="HOME">
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-10 md:px-8">
        {/* ---------- header ---------- */}
        <p className="font-mono text-[10px] tracking-[0.35em]" style={{ color: "var(--acid)" }}>
          PROCEDURAL RADIO — ZERO STREAMS, ZERO FILES
        </p>
        <h1
          className="mt-2 font-display leading-[0.9] tracking-wide text-paper"
          style={{ fontSize: "clamp(2.6rem, 9vw, 6.5rem)" }}
        >
          THE <span className="text-stroke-acid">STATION</span>
        </h1>
        <p className="mt-4 max-w-[62ch] font-body text-sm leading-relaxed text-paper/75">
          Every note here is rendered live by the WebAudio graph in your tab right now — no
          audio file, no stream, no CDN. Three stations, one synthesizer.
        </p>

        {/* ---------- visualizer ---------- */}
        <div className="mt-8 border border-line bg-ink p-4 md:p-6">
          <Visualizer playing={playing} />

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate font-display text-2xl tracking-wide text-paper md:text-3xl">
                {active.label}
              </p>
              <p className="mt-1 font-mono text-[10px] tracking-[0.15em] text-dim">
                {active.chordNames.join(" → ")} · {active.bpm} BPM
              </p>
            </div>
            <button
              onClick={press}
              data-cursor={playing ? "PAUSE" : "PLAY"}
              className={`shrink-0 border px-6 py-3 font-mono text-[11px] tracking-[0.3em] transition-colors duration-150 ${
                playing
                  ? "border-acid bg-acid text-ink"
                  : "border-paper text-paper hover:bg-paper hover:text-ink"
              }`}
            >
              [ {playing ? "PAUSE" : "PLAY"} ]
            </button>
          </div>
        </div>

        {/* ---------- station switcher ---------- */}
        <div className="mt-6 grid gap-px border border-line bg-line md:grid-cols-3">
          {STATION_LIST.map((s) => {
            const isActive = s.id === stationId;
            return (
              <button
                key={s.id}
                onClick={() => pick(s.id)}
                data-cursor="TUNE"
                className={`group p-5 text-left transition-colors duration-150 md:p-6 ${
                  isActive ? "bg-acid" : "bg-ink hover:bg-paper/5"
                }`}
              >
                <p
                  className={`font-mono text-[9px] tracking-[0.3em] ${
                    isActive ? "text-ink/70" : "text-dim"
                  }`}
                >
                  {isActive ? "NOW TUNED" : "TUNE IN"}
                </p>
                <p
                  className={`mt-2 font-display text-xl tracking-wide md:text-2xl ${
                    isActive ? "text-ink" : "text-paper"
                  }`}
                >
                  {s.label}
                </p>
                <p
                  className={`mt-2 font-body text-xs leading-relaxed ${
                    isActive ? "text-ink/80" : "text-paper/65"
                  }`}
                >
                  {s.desc}
                </p>
                <p
                  className={`mt-3 font-mono text-[9px] tracking-[0.15em] ${
                    isActive ? "text-ink/60" : "text-dim"
                  }`}
                >
                  {s.chordNames.join(" · ")} · {s.bpm} BPM · {s.drums ? "WITH KIT" : "NO DRUMS"}
                </p>
              </button>
            );
          })}
        </div>

        {/* ---------- footer note ---------- */}
        <p className="mt-6 border-l-2 pl-4 font-mono text-[10px] leading-relaxed tracking-[0.12em] text-dim" style={{ borderColor: "var(--acid)" }}>
          NO MP3, NO STREAM — every pad, bassline and hat is an oscillator started this second.
          Stick around 60s and the AUDIOFILE trophy unlocks. The mute switch silences it like
          every other voice on the site.
        </p>
      </div>
    </PageShell>
  );
}

/* ---------- visualizer ---------- */

function Visualizer({ playing }: { playing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const c2d = canvas.getContext("2d");
    if (!c2d) return;

    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = wrap.clientWidth * dpr;
      canvas.height = wrap.clientHeight * dpr;
      c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);

    const bars = 40;
    let raf = 0;

    const draw = () => {
      raf = window.requestAnimationFrame(draw);
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      c2d.clearRect(0, 0, w, h);

      const analyser = playing ? getAnalyser() : null;
      const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
      if (analyser && data) analyser.getByteFrequencyData(data);

      const gap = 3;
      const bw = (w - gap * (bars - 1)) / bars;
      const acid = getComputedStyle(document.documentElement).getPropertyValue("--acid").trim() || "#c8ff3d";

      for (let i = 0; i < bars; i++) {
        let v: number;
        if (data) {
          // low bins carry most of this synth's energy — bias sampling toward them
          const idx = Math.floor((i / bars) ** 1.6 * (data.length * 0.6));
          v = data[Math.min(idx, data.length - 1)] / 255;
        } else {
          v = 0;
        }
        const idleFloor = playing ? 0.04 : 0.02;
        const bh = Math.max(h * idleFloor, v * h * 0.95);
        const x = i * (bw + gap);
        c2d.fillStyle = playing ? acid : "rgba(255,255,255,0.14)";
        c2d.fillRect(x, h - bh, bw, bh);
      }
    };
    draw();

    return () => {
      window.cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [playing]);

  return (
    <div ref={wrapRef} className="relative h-[220px] w-full md:h-[280px]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="font-mono text-[10px] tracking-[0.3em] text-dim">
            [ SIGNAL IDLE — PRESS PLAY ]
          </p>
        </div>
      )}
    </div>
  );
}
