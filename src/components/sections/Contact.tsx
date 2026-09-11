"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { EMAIL, SOCIALS } from "@/lib/data";
import { EASE_OUT_EXPO, DUR, crossfade, fadeRise } from "@/lib/motion";
import { useEnvironment } from "@/hooks/use-environment";
import { useClipboard } from "@/hooks/use-clipboard";
import { useMagnetic } from "@/hooks/use-magnetic";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * Contact — oversized LET'S TALK, copy-to-clipboard email with an acid
 * confirmation flash, magnetic social cells, and a terminal-style
 * transmit form whose focus states grow animated bracket accents.
 */
export function Contact() {
  const { reducedMotion, isTouch } = useEnvironment();
  const { copied, copy } = useClipboard();
  const row = reducedMotion ? crossfade : fadeRise;

  const emailMagnetic = useMagnetic<HTMLButtonElement>({
    enabled: !isTouch && !reducedMotion,
    strength: 0.25,
    radius: 130,
  });

  return (
    <section id="contact" className="relative px-4 pb-24 pt-24 md:px-8 md:pb-32 md:pt-36">
      <SectionHeading index="06" title="CONTACT" meta="nc -lvp 1337 --listen" />

      {/* oversized CTA */}
      <motion.h3
        className="mt-14 font-display leading-[0.88] tracking-wide md:mt-20"
        style={{ fontSize: "clamp(3.4rem, 14vw, 13rem)" }}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-10% 0px" }}
        variants={reducedMotion ? crossfade : { show: { transition: { staggerChildren: 0.12 } } }}
      >
        {["LET'S", "TALK →"].map((word, i) => (
          <span key={word} className="block overflow-hidden pb-[0.06em]">
            <motion.span
              className={`inline-block ${i === 1 ? "text-stroke" : "text-paper"}`}
              variants={
                reducedMotion
                  ? crossfade
                  : {
                      hidden: { y: "112%" },
                      show: { y: "0%", transition: { duration: DUR.hero, ease: EASE_OUT_EXPO } },
                    }
              }
            >
              {word}
            </motion.span>
          </span>
        ))}
      </motion.h3>

      {/* email — copy-to-clipboard */}
      <motion.div
        className="mt-12 md:mt-16"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        variants={row}
        custom={1}
      >
        <p className="mb-4 font-mono text-[10px] tracking-[0.3em] text-dim">
          CHANNEL_01 — DIRECT UPLINK (CLICK TO COPY)
        </p>
        <button
          ref={emailMagnetic}
          onClick={() => copy(EMAIL)}
          data-cursor={copied ? "COPIED" : "COPY"}
          className={`group relative inline-flex items-center gap-4 border px-5 py-4 font-mono text-base tracking-wider transition-colors duration-200 md:px-8 md:py-5 md:text-2xl ${
            copied ? "border-acid bg-acid text-ink" : "border-line-strong text-paper hover:border-acid"
          }`}
          aria-live="polite"
        >
          <span className={`h-2 w-2 ${copied ? "bg-ink" : "bg-acid"}`} />
          {EMAIL}
          <span
            className={`font-mono text-[10px] tracking-[0.25em] ${
              copied ? "text-ink" : "text-dim group-hover:text-acid"
            }`}
          >
            {copied ? "[ COPIED_TO_CLIPBOARD ]" : "[ COPY ]"}
          </span>
        </button>
      </motion.div>

      {/* socials — magnetic cells */}
      <motion.ul
        className="mt-12 grid grid-cols-2 gap-px border border-line bg-line md:mt-16 md:grid-cols-5"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-8% 0px" }}
        variants={reducedMotion ? crossfade : { show: { transition: { staggerChildren: 0.06 } } }}
      >
        {SOCIALS.map((s) => (
          <motion.li
            key={s.label}
            variants={reducedMotion ? crossfade : {
              hidden: { opacity: 0, y: 16 },
              show: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE_OUT_EXPO } },
            }}
          >
            <SocialCell {...s} magnetic={!isTouch && !reducedMotion} />
          </motion.li>
        ))}
      </motion.ul>

      {/* transmit form — terminal theatre */}
      <motion.div
        className="mt-14 max-w-2xl border border-line md:mt-20"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-8% 0px" }}
        variants={row}
        custom={2}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <span className="font-mono text-[10px] tracking-widest text-dim">
            OPEN A CHANNEL — /dev/tcp
          </span>
          <span className="flex gap-1.5">
            <span className="h-2 w-2 border border-line-strong" />
            <span className="h-2 w-2 border border-line-strong" />
            <span className="h-2 w-2 bg-acid" />
          </span>
        </div>
        <TransmitForm reduced={reducedMotion} />
      </motion.div>
    </section>
  );
}

/* ---------- social cell ---------- */

function SocialCell({
  label,
  handle,
  href,
  magnetic,
}: {
  label: string;
  handle: string;
  href: string;
  magnetic: boolean;
}) {
  const ref = useMagnetic<HTMLAnchorElement>({
    enabled: magnetic,
    strength: 0.3,
    radius: 90,
  });

  return (
    <a
      ref={ref}
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      data-cursor=""
      className="group block bg-ink p-4 transition-colors duration-150 hover:bg-acid md:p-5"
    >
      <p className="font-mono text-[10px] tracking-[0.25em] text-dim transition-colors duration-150 group-hover:text-ink/60">
        {label}
      </p>
      <p className="mt-2 font-mono text-xs font-bold tracking-wider text-paper transition-colors duration-150 group-hover:text-ink md:text-sm">
        {handle} ↗
      </p>
    </a>
  );
}

/* ---------- transmit form ---------- */

const TRANSMIT_LOG = [
  "> establishing channel ......... OK",
  "> encrypting payload .......... OK",
  "> transmitted — expect reply < 48h",
];

function TransmitForm({ reduced }: { reduced: boolean }) {
  const [log, setLog] = useState<string[]>([]);
  const timers = useRef<number[]>([]);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    setLog([]);
    // theatre: the "transmission" prints like a boot sequence
    TRANSMIT_LOG.forEach((line, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setLog((prev) => [...prev, line]);
          if (i === TRANSMIT_LOG.length - 1) {
            timers.current.push(window.setTimeout(() => setLog([]), 4200));
            (e.target as HTMLFormElement).reset?.();
          }
        }, 240 + i * 380),
      );
    });
  };

  return (
    <form onSubmit={submit} className="p-4 md:p-6">
      <Field label="HANDLE" name="name" placeholder="who_goes_there" reduced={reduced} />
      <Field
        label="RETURN CHANNEL"
        name="email"
        type="email"
        placeholder="you@somewhere.tz"
        required
        reduced={reduced}
      />
      <Field
        label="PAYLOAD"
        name="message"
        placeholder="describe the mission..."
        textarea
        required
        reduced={reduced}
      />

      <div className="mt-6 flex items-center justify-between gap-4">
        <button
          type="submit"
          data-cursor="SEND"
          className="border border-acid bg-acid px-5 py-3 font-mono text-[11px] font-bold tracking-[0.3em] text-ink transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0"
        >
          TRANSMIT &gt;&gt;
        </button>
        <p className="font-mono text-[9px] tracking-widest text-dim/70">
          NO SPAM. NO NEWSLETTERS. EVER.
        </p>
      </div>

      {/* transmission log */}
      <div className="mt-5 min-h-6 font-mono text-[11px] leading-relaxed" aria-live="polite">
        {log.map((line, i) => (
          <p key={i} className={line.includes("transmitted") ? "text-acid" : "text-dim"}>
            {line}
          </p>
        ))}
      </div>
    </form>
  );
}

/** Input with animated bracket focus accents on both ends. */
function Field({
  label,
  name,
  type = "text",
  placeholder,
  textarea = false,
  required = false,
  reduced,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  textarea?: boolean;
  required?: boolean;
  reduced: boolean;
}) {
  const shared =
    "peer w-full border-b border-line bg-transparent px-3 py-2.5 font-mono text-sm text-paper placeholder:text-dim/50 focus:border-acid focus:outline-none";
  return (
    <div className="relative mt-6">
      <label
        htmlFor={`f-${name}`}
        className="mb-1.5 block font-mono text-[9px] tracking-[0.3em] text-dim"
      >
        {label}
        {required && <span className="text-acid"> *</span>}
      </label>
      <div className="relative">
        {/* bracket accents — draw in on focus */}
        <span className="pointer-events-none absolute -left-1 top-0 h-[1.2em] w-2 border-b border-l border-acid opacity-0 transition-all duration-300 ease-[var(--ease-out-expo)] peer-focus:top-[-4px] peer-focus:opacity-100" />
        <span className="pointer-events-none absolute -right-1 top-0 h-[1.2em] w-2 border-b border-r border-acid opacity-0 transition-all duration-300 ease-[var(--ease-out-expo)] peer-focus:top-[-4px] peer-focus:opacity-100" />
        {textarea ? (
          <textarea id={`f-${name}`} name={name} rows={3} placeholder={placeholder} required className={`${shared} resize-none`} />
        ) : (
          <input id={`f-${name}`} name={name} type={type} placeholder={placeholder} required={required} className={shared} />
        )}
      </div>
    </div>
  );
}
