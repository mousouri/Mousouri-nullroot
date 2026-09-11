"use client";

import { motion } from "framer-motion";
import { EASE_OUT_EXPO, DUR, charDelay } from "@/lib/motion";
import { useEnvironment } from "@/hooks/use-environment";

interface SectionHeadingProps {
  index: string; // "01"
  title: string; // "WHOAMI"
  meta: string; // "cat ~/profile.txt"
  id?: string;
  dark?: boolean; // paper background variant (detail pages)
}

/**
 * Shared section header: hairline rule draws in, index chip ticks,
 * title words rise with variable stagger, right-aligned mono metadata.
 *
 * ⚠️ The `whileInView` trigger lives on the h2 — NOT on the word spans.
 * The words start translated 110% inside overflow-hidden masks; if the
 * trigger sat on a translated child its intersection rect would be
 * clipped to zero and the reveal would never fire. The h2 is static,
 * so it intersects, and variants propagate down to each word.
 */
export function SectionHeading({ index, title, meta, id, dark = false }: SectionHeadingProps) {
  const { reducedMotion } = useEnvironment();
  const words = title.split(" ");
  const ink = dark ? "text-ink" : "text-paper";
  const line = dark ? "bg-ink/25" : "bg-line-strong";

  const wordVariants = reducedMotion
    ? {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { duration: 0.35 } },
      }
    : {
        hidden: { y: "110%" },
        show: (i: number) => ({
          y: "0%",
          transition: { duration: DUR.hero, ease: EASE_OUT_EXPO, delay: charDelay(i, 41) },
        }),
      };

  return (
    <div id={id} className="scroll-mt-20">
      <motion.div
        className={`h-px w-full origin-left ${line}`}
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: "-10% 0px" }}
        transition={{ duration: DUR.slow, ease: EASE_OUT_EXPO }}
      />
      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 px-1">
        <div className="flex items-baseline gap-4">
          <motion.span
            className={`font-mono text-xs tracking-widest text-acid`}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.25 }}
          >
            {index}
            {"//"}
          </motion.span>
          <motion.h2
            className="font-display leading-none tracking-wide"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-10% 0px" }}
          >
            {words.map((w, i) => (
              <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                <motion.span
                  className={`inline-block ${ink} text-5xl md:text-7xl lg:text-8xl`}
                  custom={i}
                  variants={wordVariants}
                >
                  {w}
                  {i < words.length - 1 ? "\u00A0" : ""}
                </motion.span>
              </span>
            ))}
          </motion.h2>
        </div>
        <motion.p
          className="font-mono text-[10px] tracking-[0.25em] text-dim"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          {meta}
        </motion.p>
      </div>
    </div>
  );
}
