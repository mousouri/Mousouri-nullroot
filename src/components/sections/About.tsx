"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { EASE_OUT_EXPO, DUR, clipReveal, crossfade, fadeRise } from "@/lib/motion";
import { useEnvironment } from "@/hooks/use-environment";
import { SectionHeading } from "@/components/ui/SectionHeading";

const META_ROWS: Array<[string, string]> = [
  ["IDENT", "[REDACTED] — goes by MOUSOURI"],
  ["EDU", "COMPUTER ENGINEERING — NTA LVL 6"],
  ["BASE", "DAR ES SALAAM, TZ"],
  ["FOCUS", "OFFSEC / ALGO / EMBEDDED"],
  ["STATUS", "LEARNING. ALWAYS."],
];

const INTERESTS = [
  "INDUSTRIAL_AUTOMATION",
  "CYBERSECURITY",
  "MOBILE_DEV",
  "DIGITAL_SIGNALS",
  "CTFs",
  "REVERSE_ENGINEERING",
  "WEBGL",
];

/**
 * About — a whoami block, not a corporate paragraph.
 * Bio reads like printed output; metadata card sits off-grid (offset down)
 * with staggered row ticks; interests render as `ls` output tags.
 */
export function About() {
  const { reducedMotion } = useEnvironment();
  const wipe = reducedMotion ? crossfade : clipReveal;

  return (
    <section id="about" className="relative px-4 py-24 md:px-8 md:py-36">
      <SectionHeading index="01" title="WHOAMI" meta="cat ~/profile.txt" />

      <div className="mt-14 grid grid-cols-1 gap-12 md:mt-20 lg:grid-cols-12 lg:gap-8">
        {/* bio — printed output framing */}
        <div className="lg:col-span-7">
          <motion.p
            className="mb-2 font-mono text-xs text-acid"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
          >
            mousouri@dev:~$ cat about.txt
          </motion.p>

          <motion.div
            className="border-l border-line-strong pl-5"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-12% 0px" }}
            variants={wipe}
          >
            <p className="font-body text-base leading-relaxed text-paper/90 md:text-lg">
              I&apos;m a computer engineering student (NTA Level 6) based in Dar es Salaam
              who treats every system like a puzzle with the screws hiding on the bottom.
              By day I study the formal stuff — digital signal processing, industrial
              automation, embedded design. By night I pick at web applications, chase
              bug bounties, and reverse-engineer whatever binary wanders too close.
            </p>
            <p className="mt-5 font-body text-base leading-relaxed text-paper/90 md:text-lg">
              Somewhere between those two worlds I started writing trading algorithms —
              first as a curiosity, then as MQL5 Expert Advisors with real risk models
              and the scars to prove it. The through-line is simple: I like systems that
              talk back, and I like being the person who understands them better than
              the manual does.
            </p>
          </motion.div>

          {/* interests as directory listing */}
          <div className="mt-10">
            <p className="mb-3 font-mono text-xs text-acid">mousouri@dev:~$ ls interests/</p>
            <ul className="flex flex-wrap gap-2">
              {INTERESTS.map((tag, i) => (
                <motion.li
                  key={tag}
                  className="border border-line px-2.5 py-1 font-mono text-[10px] tracking-wider text-dim transition-colors duration-150 hover:border-acid hover:bg-acid hover:text-ink"
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  custom={i}
                  variants={reducedMotion ? crossfade : fadeRise}
                >
                  {tag}
                </motion.li>
              ))}
            </ul>
          </div>
        </div>

        {/* metadata card — offset off-grid on purpose */}
        <motion.div
          className="lg:col-span-5 lg:mt-24"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-10% 0px" }}
          variants={wipe}
        >
          <div className="border border-line">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="font-mono text-[10px] tracking-widest text-dim">
                profile.sys — v2.4
              </span>
              <span className="flex gap-1.5">
                <span className="h-2 w-2 border border-line-strong" />
                <span className="h-2 w-2 border border-line-strong" />
                <span className="h-2 w-2 bg-acid" />
              </span>
            </div>
            {/* subject photo — surveillance-cam framing, decodes on hover */}
            <div className="group relative aspect-[4/3] w-full overflow-hidden border-b border-line">
              <Image
                src="/images/portrait.jpg"
                alt="Hooded figure at a CRT terminal, face lost in shadow"
                fill
                sizes="(max-width: 1023px) 90vw, 38vw"
                className="object-cover grayscale contrast-125 brightness-90 transition-[filter] duration-700 ease-[var(--ease-out-expo)] group-hover:grayscale-0 group-hover:brightness-100"
              />
              <div className="scanlines pointer-events-none absolute inset-0 opacity-70" />
              <span className="absolute left-2 top-2 bg-acid px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-[0.25em] text-ink">
                CAM_02 — SUBJECT
              </span>
              <span className="absolute bottom-2 right-2 font-mono text-[8px] tracking-[0.3em] text-acid opacity-80">
                REC 24FPS — IDENT UNVERIFIED
              </span>
            </div>
            <dl>
              {META_ROWS.map(([k, v], i) => (
                <motion.div
                  key={k}
                  className={`flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:items-baseline sm:justify-between ${
                    i < META_ROWS.length - 1 ? "border-b border-line" : ""
                  }`}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: DUR.base,
                    ease: EASE_OUT_EXPO,
                    delay: 0.25 + i * 0.08,
                  }}
                >
                  <dt className="font-mono text-[10px] tracking-[0.25em] text-dim">{k}:</dt>
                  <dd className="font-mono text-xs tracking-wider text-paper sm:text-right">
                    {k === "STATUS" ? (
                      <span className="text-acid">{v}</span>
                    ) : (
                      v
                    )}
                  </dd>
                </motion.div>
              ))}
            </dl>
            <div className="border-t border-line px-4 py-2.5">
              <p className="font-mono text-[9px] tracking-[0.25em] text-dim/70">
                ENCRYPTION: OPEN — NO SECRETS, ONLY PUZZLES
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
