"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { mulberry32 } from "@/lib/motion";
import type { VisualKind } from "@/lib/data";

/**
 * Zero-payload CSS/SVG art per project — no stock imagery anywhere.
 * Each visual is deterministic (seeded PRNG) so SSR and client agree.
 * The container is the morph target shared with the detail overlay
 * (layoutId lives on the wrapper in ProjectCard).
 */
export function ProjectVisual({ kind }: { kind: VisualKind }) {
  switch (kind) {
    case "pothole":
      return <PotholeArt />;
    case "ascent":
      return <AscentArt />;
    case "duka":
      return <DukaArt />;
    case "cve":
      return <CveArt />;
    case "ea":
      return <EaArt />;
  }
}

/* ---- 001: pothole detection — dotted field + detection bounding box ---- */
function PotholeArt() {
  const dots = useMemo(() => {
    const rand = mulberry32(101);
    return Array.from({ length: 26 }, () => ({
      x: 6 + rand() * 88,
      y: 8 + rand() * 84,
      s: 2 + rand() * 5,
    }));
  }, []);

  return (
    <div className="dotfield relative h-full w-full">
      {dots.map((d, i) => (
        <span
          key={i}
          className="absolute bg-paper/50"
          style={{ left: `${d.x}%`, top: `${d.y}%`, width: d.s, height: d.s }}
        />
      ))}
      {/* main detection box */}
      <div className="absolute left-[38%] top-[30%] h-[38%] w-[44%] border border-acid">
        <span className="absolute -top-5 left-0 bg-acid px-1 font-mono text-[9px] font-bold text-ink">
          POTHOLE 0.94
        </span>
        {/* corner ticks */}
        <span className="absolute -left-px -top-px h-2.5 w-2.5 border-l-2 border-t-2 border-acid" />
        <span className="absolute -right-px -top-px h-2.5 w-2.5 border-r-2 border-t-2 border-acid" />
        <span className="absolute -bottom-px -left-px h-2.5 w-2.5 border-b-2 border-l-2 border-acid" />
        <span className="absolute -bottom-px -right-px h-2.5 w-2.5 border-b-2 border-r-2 border-acid" />
      </div>
      {/* secondary detections */}
      <div className="absolute left-[12%] top-[58%] h-[16%] w-[20%] border border-paper/60" />
      <span className="absolute left-[12%] top-[52%] font-mono text-[8px] text-paper/60">
        0.51
      </span>
      <span className="absolute right-2 bottom-2 font-mono text-[8px] tracking-wider text-dim">
        FPS:24 — RPI4/CAM0
      </span>
    </div>
  );
}

/* ---- 002: ascent — SVG wireframe ridge ---- */
function AscentArt() {
  return (
    <div className="relative h-full w-full">
      <svg viewBox="0 0 400 300" preserveAspectRatio="none" className="h-full w-full">
        {/* ridge lines receding to a peak — the "ascent" */}
        {[
          { y: 250, peak: 120, o: 0.14 },
          { y: 230, peak: 105, o: 0.22 },
          { y: 210, peak: 90, o: 0.34 },
          { y: 190, peak: 74, o: 0.5 },
          { y: 172, peak: 58, o: 0.72 },
        ].map((r, i) => (
          <MotionPolyline
            key={i}
            y={r.y}
            peak={r.peak}
            opacity={r.o}
            delay={i * 0.12}
          />
        ))}
        <line x1="0" y1="270" x2="400" y2="270" stroke="var(--line-strong)" strokeWidth="1" />
      </svg>
      {/* the monolith */}
      <div className="absolute left-1/2 top-[16%] h-[34%] w-[7%] -translate-x-1/2 border border-acid bg-ink/40">
        <span className="absolute inset-1 border border-acid/40" />
      </div>
      <span className="absolute left-2 top-2 font-mono text-[8px] tracking-wider text-dim">
        SCENE:ASCENT — CAM.Y+CLIMB
      </span>
    </div>
  );
}

// helper: ridge polylines draw themselves when scrolled into view
function MotionPolyline({
  y,
  peak,
  opacity,
  delay,
}: {
  y: number;
  peak: number;
  opacity: number;
  delay: number;
}) {
  return (
    <motion.polyline
      points={`0,${y} 60,${y - 18} 110,${peak + 60} 170,${peak + 22} 220,${peak} 280,${peak + 34} 340,${y - 10} 400,${y - 4}`}
      fill="none"
      stroke="var(--paper)"
      strokeOpacity={opacity}
      strokeWidth="1"
      initial={{ pathLength: 0 }}
      whileInView={{ pathLength: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1.4, delay, ease: [0.16, 1, 0.3, 1] }}
    />
  );
}

/* ---- 003: duka — inventory grid, one tile inverted ---- */
function DukaArt() {
  const items = useMemo(() => {
    const rand = mulberry32(303);
    const names = ["RJ45-KIT", "LED 9W", "SAW BLADE", "EXT.CABLE", "SOLDER 50G", "MULTIMETER", "TAPE 25M", "FUSE PK", "HAMMER", "DRILL BIT", "GLUE 30G", "WIRE 10M"];
    return names.map((n) => ({
      n,
      p: `${(rand() * 40 + 2).toFixed(2)}K`,
    }));
  }, []);

  return (
    <div className="grid h-full w-full grid-cols-4 grid-rows-3 gap-px bg-line p-px">
      {items.map((it, i) => (
        <div
          key={it.n}
          className={`flex flex-col justify-between p-1.5 ${
            i === 5 ? "bg-acid text-ink" : "bg-ink text-paper/70"
          }`}
        >
          <span className="font-mono text-[7px] tracking-wider md:text-[8px]">{it.n}</span>
          <span className="font-mono text-[8px] font-bold md:text-[10px]">{it.p}</span>
        </div>
      ))}
    </div>
  );
}

/* ---- 004: cve — barcode + severity badge ---- */
function CveArt() {
  const bars = useMemo(() => {
    const rand = mulberry32(404);
    return Array.from({ length: 56 }, () => ({
      w: rand() > 0.7 ? 4 : rand() > 0.4 ? 2 : 1,
      o: 0.25 + rand() * 0.75,
    }));
  }, []);

  return (
    <div className="relative flex h-full w-full flex-col justify-between p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[9px] tracking-widest text-dim">REPORT — TRIAGE</p>
          <p className="mt-1 font-mono text-sm font-bold tracking-wider text-paper">
            IDOR → ATO CHAIN
          </p>
        </div>
        <span className="border border-acid px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-widest text-acid">
          SEV:HIGH — P2
        </span>
      </div>
      {/* barcode */}
      <div className="flex h-1/2 items-end gap-[3px]">
        {bars.map((b, i) => (
          <span key={i} className="w-full bg-paper" style={{ height: "100%", opacity: b.o, width: b.w }} />
        ))}
      </div>
      <div className="flex justify-between font-mono text-[8px] tracking-widest text-dim">
        <span>BUGCROWD/PROGRAM-[REDACTED]</span>
        <span className="text-acid">BOUNTY:PAID</span>
      </div>
    </div>
  );
}

/* ---- 005: EA — candlestick strip ---- */
function EaArt() {
  const candles = useMemo(() => {
    const rand = mulberry32(505);
    const arr: Array<{ up: boolean; body: number; low: number }> = [];
    let base = 50;
    for (let i = 0; i < 28; i++) {
      const up = rand() > 0.42;
      const body = 6 + rand() * 16;
      base += up ? rand() * 5 : -rand() * 4.4; // gentle upward drift
      base = Math.max(20, Math.min(78, base));
      arr.push({ up, body, low: base });
    }
    return arr;
  }, []);

  return (
    <div className="relative h-full w-full">
      {/* gridlines */}
      {[25, 50, 75].map((y) => (
        <div key={y} className="absolute left-0 right-0 h-px bg-line" style={{ top: `${y}%` }} />
      ))}
      <div className="absolute inset-x-4 top-[12%] bottom-[18%] flex items-end gap-[3px]">
        {candles.map((c, i) => (
          <div key={i} className="relative h-full flex-1">
            {/* wick */}
            <span
              className={`absolute left-1/2 w-px -translate-x-1/2 ${c.up ? "bg-acid/70" : "bg-paper/30"}`}
              style={{ bottom: `${c.low}%`, height: `${c.body + 8}%` }}
            />
            {/* body */}
            <span
              className={`absolute left-0 w-full ${c.up ? "bg-acid" : "bg-paper/25"}`}
              style={{ bottom: `${c.low + 4}%`, height: `${c.body}%` }}
            />
          </div>
        ))}
      </div>
      <div className="absolute inset-x-4 bottom-2 flex justify-between font-mono text-[8px] tracking-widest text-dim">
        <span>EURUSD — M5</span>
        <span className="text-acid">DD 4.1% — ALIVE</span>
      </div>
    </div>
  );
}
