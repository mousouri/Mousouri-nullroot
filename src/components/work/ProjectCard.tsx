"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { EASE_OUT_EXPO, DUR } from "@/lib/motion";
import type { Project } from "@/lib/data";
import { ProjectVisual } from "./ProjectVisual";
import { ProjectImage } from "./ProjectImage";

// gsap has no native cubic-bezier parsing without CustomEase — expo.out is
// the same deceleration family as EASE_OUT_EXPO for the JS-driven tweens.
const GSAP_EXPO = "expo.out";

interface ProjectCardProps {
  project: Project;
  onOpen: (p: Project) => void;
  /** rail mode: fixed card width; stack mode: full width */
  rail?: boolean;
}

/**
 * Case-study card. Hover does not scale — it distorts: a perspective tilt
 * driven by cursor position, the visual counter-parallaxes, the accent
 * metric bar slides in and the index number flips to outline. The visual
 * wrapper carries the shared layoutId used by the detail-overlay morph.
 */
export function ProjectCard({ project, onOpen, rail = false }: ProjectCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const onMove = (e: React.MouseEvent) => {
    if (reduced) return;
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5; // -0.5..0.5
    const ny = (e.clientY - r.top) / r.height - 0.5;

    // tilt: small, intentional, never cartoonish
    gsap.to(el, {
      rotationY: nx * 4,
      rotationX: -ny * 3,
      transformPerspective: 900,
      skewX: nx * -1.5, // the "misprint" distortion
      duration: 0.5,
      ease: "power2.out",
    });
    // counter-parallax on the art layer
    if (visualRef.current) {
      gsap.to(visualRef.current, {
        x: nx * -10,
        y: ny * -10,
        duration: 0.6,
        ease: "power2.out",
      });
    }
  };

  const onLeave = () => {
    if (reduced) return;
    if (cardRef.current) {
      gsap.to(cardRef.current, {
        rotationY: 0,
        rotationX: 0,
        skewX: 0,
        duration: 0.7,
        ease: GSAP_EXPO,
      });
    }
    if (visualRef.current) {
      gsap.to(visualRef.current, { x: 0, y: 0, duration: 0.7, ease: GSAP_EXPO });
    }
  };

  return (
    <motion.article
      ref={cardRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={() => onOpen(project)}
      data-cursor="VIEW"
      className={`group relative border border-line bg-ink transition-colors duration-200 hover:border-line-strong ${
        rail ? "w-[82vw] flex-shrink-0 sm:w-[26rem] lg:w-[34vw] xl:w-[30rem]" : "w-full"
      }`}
      initial={{ clipPath: "inset(0 0 12% 0)", opacity: 0, y: 34 }}
      whileInView={{ clipPath: "inset(0 0 0% 0)", opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-6% 0px" }}
      transition={{ duration: DUR.slow, ease: EASE_OUT_EXPO }}
      style={{ transformStyle: "preserve-3d", willChange: "transform" }}
      role="button"
      tabIndex={0}
      aria-label={`Open case study: ${project.title}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(project);
        }
      }}
    >
      {/* header row */}
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="font-mono text-[10px] tracking-[0.25em] text-dim">
          FILE_{project.index}
        </span>
        <span className="font-mono text-[10px] tracking-[0.25em] text-dim">
          {project.kind} — {project.year}
        </span>
      </div>

      {/* visual — shared morph target; photo base + generative art overlay */}
      <div className="overflow-hidden border-b border-line">
        <div ref={visualRef} className="aspect-[4/3] w-full will-change-transform">
          <motion.div
            layoutId={`pv-${project.id}`}
            className="h-full w-full border-b-0 border-line bg-ink transition-colors duration-300 group-hover:bg-[#0d0d0b]"
            transition={{ duration: DUR.wipe, ease: [0.65, 0, 0.35, 1] }}
          >
            {project.image ? (
              <ProjectImage
                src={project.image}
                alt={project.imageAlt ?? project.title}
                kind={project.visual}
                sizes="(max-width: 640px) 82vw, 30rem"
              />
            ) : (
              <ProjectVisual kind={project.visual} />
            )}
          </motion.div>
        </div>
      </div>

      {/* body */}
      <div className="p-4 md:p-5">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="font-display text-2xl tracking-wide text-paper md:text-3xl">
            {project.title}
          </h3>
          <span className="font-mono text-[10px] text-acid opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            {project.statusLabel}
          </span>
        </div>

        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {project.tags.map((t) => (
            <li key={t} className="font-mono text-[10px] tracking-widest text-dim">
              {t}
            </li>
          ))}
        </ul>

        {/* accent rail + CTA */}
        <div className="mt-5 flex items-center justify-between">
          <span className="h-0.5 w-10 origin-left scale-x-50 bg-acid transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-x-150" />
          <span className="font-mono text-[10px] tracking-[0.3em] text-dim transition-colors duration-200 group-hover:text-acid">
            OPEN_FILE →
          </span>
        </div>
      </div>
    </motion.article>
  );
}
