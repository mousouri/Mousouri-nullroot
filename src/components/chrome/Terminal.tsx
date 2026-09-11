"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EASE_SHARP, DUR } from "@/lib/motion";
import {
  execCommand,
  setOverlay,
  useOverlay,
  type ShellIO,
  type ShellLine,
} from "@/lib/shell";
import { stopScroll, startScroll } from "@/hooks/use-smooth-scroll";
import { playSfx } from "@/lib/sound";

/* ============================================================
   HIDDEN TERMINAL — press ` / ~ anywhere and a root shell
   drops from under the nav. Real command engine (lib/shell),
   command history on ↑↓, transcript scrolls, blinking block
   cursor. ESC or `exit` closes. The one place the persona
   stops cosplaying.
   ============================================================ */

const BANNER: ShellLine[] = [
  { text: "NR-SHELL v2.6 — persistent, unprivileged, dramatic", kind: "acid" },
  { text: "type 'help' for the command index. '~' or ESC to leave.", kind: "dim" },
];

export function Terminal() {
  const overlay = useOverlay();
  const open = overlay === "terminal";
  const [lines, setLines] = useState<ShellLine[]>(BANNER);
  const [value, setValue] = useState("");
  const [histIdx, setHistIdx] = useState(-1);
  const history = useRef<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* hotkey: backquote toggles — but only from a non-editable target.
     Inside the shell (or any form field) ` just types; ESC / exit / CLOSE. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "`" && e.key !== "~") return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      const typing =
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!el?.isContentEditable;
      if (typing) return;
      e.preventDefault();
      setOverlay(open ? "none" : "terminal");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  /* scroll lock + focus + greet once per session */
  useEffect(() => {
    if (!open) return;
    stopScroll();
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => {
      window.clearTimeout(t);
      startScroll();
    };
  }, [open]);

  /* keep transcript pinned to the newest line */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, open]);

  const io: ShellIO = useMemo(
    () => ({
      print: (text, kind = "out") =>
        setLines((prev) => [...prev.slice(-260), { text, kind }]),
      clear: () => setLines([]),
      close: () => setOverlay("none"),
    }),
    [],
  );

  const submit = () => {
    const raw = value;
    setValue("");
    setHistIdx(-1);
    if (raw.trim()) history.current.push(raw);
    setLines((prev) => [...prev, { text: `root@mousouri:~$ ${raw}`, kind: "cmd" }]);
    execCommand(raw, io);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOverlay("none");
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const h = history.current;
      if (!h.length) return;
      const next = histIdx < 0 ? h.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(next);
      setValue(h[next]);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const h = history.current;
      if (histIdx < 0) return;
      const next = histIdx + 1;
      if (next >= h.length) {
        setHistIdx(-1);
        setValue("");
      } else {
        setHistIdx(next);
        setValue(h[next]);
      }
    }
  };

  const color = (k: ShellLine["kind"]) =>
    k === "acid"
      ? "text-acid"
      : k === "ok"
        ? "text-acid/90"
        : k === "err"
          ? "text-paper"
          : k === "dim"
            ? "text-dim"
            : k === "cmd"
              ? "text-paper/60"
              : "text-paper/85";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="term"
          role="dialog"
          aria-label="Hidden terminal"
          className="fixed top-12 right-0 left-0 z-[155] border-b-2 border-acid bg-ink shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
          initial={{ y: "-100%" }}
          animate={{ y: 0 }}
          exit={{ y: "-100%" }}
          transition={{ duration: DUR.fast + 0.14, ease: EASE_SHARP }}
        >
          {/* titlebar */}
          <div className="flex items-center justify-between border-b border-line px-4 py-2">
            <p className="font-mono text-[10px] tracking-[0.3em] text-dim">
              root@mousouri — /bin/nrsh
            </p>
            <div className="flex items-center gap-4">
              <span className="hidden font-mono text-[9px] tracking-[0.25em] text-dim sm:inline">
                ↑↓ HISTORY · ESC CLOSE
              </span>
              <button
                onClick={() => setOverlay("none")}
                className="font-mono text-[10px] tracking-[0.25em] text-acid hover:text-paper"
              >
                [ CLOSE ]
              </button>
            </div>
          </div>

          {/* transcript */}
          <div
            ref={scrollRef}
            className="h-[42vh] overflow-y-auto px-4 py-3 md:px-6"
            data-lenis-prevent
            onClick={() => inputRef.current?.focus()}
          >
            {lines.map((l, i) => (
              <p
                key={i}
                className={`font-mono text-[11px] leading-[1.7] break-words md:text-xs ${color(
                  l.kind,
                )}`}
              >
                {l.text || "\u00A0"}
              </p>
            ))}
          </div>

          {/* prompt */}
          <div className="flex items-center gap-3 border-t border-line px-4 py-3 md:px-6">
            <span className="shrink-0 font-mono text-xs text-acid">root@mousouri:~$</span>
            <input
              ref={inputRef}
              data-nrshell="in"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onKeyDown}
              spellCheck={false}
              autoComplete="off"
              aria-label="Terminal input"
              className="w-full bg-transparent font-mono text-xs text-paper caret-acid outline-none md:text-sm"
            />
            <span className="blink-block hidden font-mono text-xs text-acid sm:inline">
              █
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
