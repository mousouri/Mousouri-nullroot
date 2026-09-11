"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PROJECTS } from "@/lib/data";
import type { Project } from "@/lib/data";
import { useEnvironment } from "@/hooks/use-environment";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProjectCard } from "@/components/work/ProjectCard";
import { navigate } from "@/lib/router";

gsap.registerPlugin(ScrollTrigger);

/**
 * Selected Work — two modes:
 *  Desktop (canPin): the section pins while a horizontal rail of case files
 *  scrubs left under the cursor (GSAP ScrollTrigger, invalidated on resize).
 *  Mobile / reduced: the same cards stack vertically with in-view reveals.
 */
export function Work({ onOpen }: { onOpen: (p: Project) => void }) {
  const { canPin } = useEnvironment();
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const railPctRef = useRef<HTMLSpanElement>(null);

  const openIndex = () => navigate({ page: "work" });

  useEffect(() => {
    const pin = pinRef.current;
    const track = trackRef.current;
    if (!pin || !track || !canPin) return;

    const ctx = gsap.context(() => {
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

      gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: pin,
          start: "top top",
          end: () => `+=${distance() + window.innerHeight * 0.4}`,
          pin: true,
          scrub: 0.7,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (railPctRef.current) {
              railPctRef.current.textContent = `${String(Math.round(self.progress * 100)).padStart(3, "0")}%`;
            }
          },
        },
      });
    }, pin);

    return () => ctx.revert();
  }, [canPin]);

  return (
    <section id="work" className="relative">
      <div className="px-4 md:px-8">
        <SectionHeading index="03" title="SELECTED WORK" meta="ls -la ~/work --sort=impact" />
      </div>

      {canPin && (
        <div className="flex items-center gap-3 px-4 pt-6 font-mono text-[10px] tracking-[0.25em] text-dim md:px-8">
          <span className="text-acid">[ RAIL MODE ]</span>
          SCROLL TO TRAVERSE — <span ref={railPctRef} className="text-acid tabular-nums">000%</span>
          <button
            onClick={openIndex}
            data-cursor="INDEX"
            className="u-draw ml-auto text-dim transition-colors hover:text-paper"
          >
            FULL INDEX →
          </button>
        </div>
      )}

      {/* pinned rail viewport (desktop) / plain wrapper (mobile) */}
      <div
        ref={pinRef}
        className={
          canPin
            ? "flex min-h-[100svh] items-center overflow-hidden py-24"
            : "px-4 py-16 md:px-8"
        }
      >
        <div
          ref={trackRef}
          className={
            canPin
              ? "flex w-max items-stretch gap-6 px-4 md:gap-10 md:px-8 will-change-transform"
              : "grid grid-cols-1 gap-8 sm:gap-10"
          }
        >
          {PROJECTS.map((p) => (
            <ProjectCard key={p.id} project={p} onOpen={onOpen} rail={canPin} />
          ))}

          {/* rail terminator — doubles as the archive door */}
          {canPin ? (
            <button
              onClick={openIndex}
              data-cursor="INDEX"
              className="group flex w-[60vw] flex-shrink-0 items-center justify-center lg:w-[28vw]"
            >
              <span className="rotate-90 font-mono text-[10px] tracking-[0.4em] whitespace-nowrap text-dim transition-colors duration-200 group-hover:text-acid lg:rotate-0">
                — OPEN FULL INDEX →
              </span>
            </button>
          ) : (
            <button
              onClick={openIndex}
              data-cursor="INDEX"
              className="mt-2 flex w-full items-center justify-between border border-line px-5 py-4 font-mono text-[10px] tracking-[0.3em] text-dim transition-colors duration-200 hover:border-acid hover:bg-acid hover:text-ink"
            >
              <span>ALL {PROJECTS.length} FILES — FULL INDEX</span>
              <span className="text-acid">→</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
