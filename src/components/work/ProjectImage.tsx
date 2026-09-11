"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { EASE_OUT_EXPO, DUR } from "@/lib/motion";
import type { VisualKind } from "@/lib/data";
import { ProjectVisual } from "./ProjectVisual";

/* ============================================================
   ProjectImage — the photographic layer of the visual system.
   Photos live BASE, generative CSS art sits ON TOP as an
   overlay (mix-blend-screen keeps the acid annotations), and
   a scanline sheet ties both into the CRT language.
   Hover "decodes" the frame: art dissolves, photo blooms to
   full color. No plain scale hover anywhere.
   ============================================================ */

interface ProjectImageProps {
  src: string;
  alt: string;
  /** generative art layered on top (omit for plain photos) */
  kind?: VisualKind;
  sizes?: string;
  priority?: boolean;
  className?: string;
  /** animate in with a clip wipe on mount (heroes) */
  reveal?: boolean;
}

export function ProjectImage({
  src,
  alt,
  kind,
  sizes = "100vw",
  priority = false,
  className = "",
  reveal = false,
}: ProjectImageProps) {
  const frame = (
    <div
      className={`group/img relative h-full w-full overflow-hidden bg-ink ${className}`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover grayscale contrast-125 brightness-[0.72] transition-[filter] duration-700 ease-[var(--ease-out-expo)] group-hover:grayscale-0 group-hover:brightness-100"
      />

      {/* generative art overlay — dissolves on decode */}
      {kind && (
        <div className="absolute inset-0 opacity-60 mix-blend-screen transition-opacity duration-700 ease-[var(--ease-out-expo)] group-hover:opacity-0">
          <ProjectVisual kind={kind} />
        </div>
      )}

      {/* scanlines unify photo + art */}
      <div className="scanlines pointer-events-none absolute inset-0 opacity-70" />

      {/* decode readout */}
      <span className="absolute bottom-2 right-2 z-10 font-mono text-[8px] tracking-[0.3em] text-acid opacity-80">
        {kind ? "IMG//RAW — HOVER TO DECODE" : "IMG//RAW"}
      </span>
    </div>
  );

  if (!reveal) return frame;

  return (
    <motion.div
      className="h-full w-full"
      initial={{ clipPath: "inset(0 0 100% 0)" }}
      animate={{ clipPath: "inset(0 0 0% 0)" }}
      transition={{ duration: DUR.slow, ease: EASE_OUT_EXPO, delay: 0.15 }}
    >
      {frame}
    </motion.div>
  );
}
