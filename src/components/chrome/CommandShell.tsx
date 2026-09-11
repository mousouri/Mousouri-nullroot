"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EASE_SHARP, DUR } from "@/lib/motion";
import {
  execCommand,
  commandNames,
  PALETTE_ROUTES,
  setOverlay,
  getOverlay,
  useOverlay,
  type ShellIO,
  type ShellLine,
} from "@/lib/shell";
import { stopScroll, startScroll } from "@/hooks/use-smooth-scroll";
import { playSfx } from "@/lib/sound";

/* ============================================================
   ⌘K COMMAND PALETTE — the polite face of NR-SHELL.
   ⌘K / Ctrl+K opens. Type to filter; ↑↓ to select; ↵ runs the
   row. Free-form input with a space (e.g. `theme matrix`,
   `sudo rm -rf /`) is executed as a raw shell line. Output
   renders inline until you type again. ESC closes.

   State lives in PalettePanel, which only mounts while open —
   every open is a fresh transcript, no reset effects needed.
   ============================================================ */

type Row = { key: string; head: string; desc: string };

export function CommandShell() {
  const overlay = useOverlay();
  const open = overlay === "palette";

  /* global hotkey — owns ⌘K / Ctrl+K */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOverlay(getOverlay() === "palette" ? "none" : "palette");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* page scroll stops while the palette is up */
  useEffect(() => {
    if (!open) return;
    stopScroll();
    return () => startScroll();
  }, [open]);

  return (
    <AnimatePresence>{open && <PalettePanel key="palette" />}</AnimatePresence>
  );
}

function PalettePanel() {
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const [out, setOut] = useState<ShellLine[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /* focus on mount (open) */
  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, []);

  const rows: Row[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const routeRows: Row[] = PALETTE_ROUTES.map((r) => ({
      key: `r:${r.target}`,
      head: r.label,
      desc: r.hint,
    }));
    const cmdRows: Row[] = commandNames().map((c) => ({
      key: `c:${c.name}`,
      head: c.name,
      desc: c.usage ? `${c.desc} — ${c.usage}` : c.desc,
    }));
    const all = [...routeRows, ...cmdRows];
    if (!q) return all.slice(0, 12);
    return all
      .filter((r) => (r.head + " " + r.desc).toLowerCase().includes(q))
      .slice(0, 10);
  }, [query]);

  const io: ShellIO = useMemo(
    () => ({
      print: (text, kind = "out") =>
        setOut((prev) => [...(prev ?? []), { text, kind }]),
      clear: () => setOut([]),
      close: () => setOverlay("none"),
    }),
    [],
  );

  const runRow = useCallback(
    (row: Row) => {
      playSfx("ok");
      const target = row.key.startsWith("r:") ? row.key.slice(2) : row.head;
      setOut([{ text: `$ ${target}`, kind: "acid" }]);
      setQuery("");
      execCommand(target, io);
    },
    [io],
  );

  const runRaw = useCallback(
    (raw: string) => {
      playSfx("ok");
      setOut([{ text: `$ ${raw}`, kind: "acid" }]);
      execCommand(raw, io);
    },
    [io],
  );

  /* keep the selected row visible */
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${sel}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [sel, rows]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (out) {
      // output mode: any key returns to browse; esc leaves entirely
      if (e.key === "Escape") {
        e.preventDefault();
        setOverlay("none");
        return;
      }
      if (e.key === "Enter") e.preventDefault();
      setOut(null);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOverlay("none");
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(rows.length - 1, s + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(0, s - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (query.includes(" ") || (rows.length === 0 && query.trim())) {
        runRaw(query);
        return;
      }
      const row = rows[sel];
      if (row) runRow(row);
    }
  };

  return (
    <>
      {/* click-away scrim */}
      <motion.button
        key="pal-scrim"
        aria-label="Close palette"
        className="fixed inset-0 z-[154] cursor-default bg-ink/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={() => setOverlay("none")}
      />
      <motion.div
        key="palette"
        role="dialog"
        aria-label="Command palette"
        className="fixed top-[12vh] left-1/2 z-[155] w-[min(680px,94vw)] -translate-x-1/2 border border-line-strong bg-ink shadow-[0_0_0_1px_rgba(215,255,63,0.12)]"
        initial={{ clipPath: "inset(0 0 100% 0)", opacity: 0.4 }}
        animate={{ clipPath: "inset(0 0 0% 0)", opacity: 1 }}
        exit={{ clipPath: "inset(0 0 100% 0)", opacity: 0.6 }}
        transition={{ duration: DUR.fast + 0.12, ease: EASE_SHARP }}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <p className="font-mono text-[10px] tracking-[0.3em] text-dim">NR://PALETTE</p>
          <button
            onClick={() => setOverlay("none")}
            className="font-mono text-[10px] tracking-[0.25em] text-acid hover:text-paper"
          >
            [ ESC ]
          </button>
        </div>

        {/* input */}
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <span className="font-mono text-xs text-acid">$</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSel(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="type a command or target…"
            spellCheck={false}
            autoComplete="off"
            className="w-full bg-transparent font-mono text-sm text-paper caret-acid outline-none placeholder:text-dim/60"
          />
        </div>

        {/* body: output mode or browse mode */}
        {out ? (
          <div className="max-h-[46vh] overflow-y-auto px-4 py-3" data-lenis-prevent>
            {out.map((l, i) => (
              <p
                key={i}
                className={`font-mono text-xs leading-relaxed whitespace-pre-wrap ${
                  l.kind === "acid"
                    ? "text-acid"
                    : l.kind === "ok"
                      ? "text-acid/90"
                      : l.kind === "err"
                        ? "text-paper"
                        : l.kind === "dim"
                          ? "text-dim"
                          : "text-paper/85"
                }`}
              >
                {l.text || "\u00A0"}
              </p>
            ))}
            <p className="mt-3 border-t border-line pt-2 font-mono text-[9px] tracking-[0.25em] text-dim">
              ↵ BACK · ESC CLOSE
            </p>
          </div>
        ) : (
          <div
            ref={listRef}
            className="max-h-[46vh] overflow-y-auto py-1"
            data-lenis-prevent
          >
            {rows.length === 0 && (
              <p className="px-4 py-6 font-mono text-xs text-dim">
                no match. ESC to close — or type it with args and pray.
              </p>
            )}
            {rows.map((r, i) => (
              <button
                key={r.key}
                data-idx={i}
                onMouseEnter={() => setSel(i)}
                onClick={() => runRow(r)}
                className={`flex w-full items-baseline justify-between gap-4 px-4 py-2.5 text-left ${
                  i === sel ? "bg-acid text-ink" : "text-paper"
                }`}
              >
                <span className="font-mono text-xs tracking-wide">
                  <span className={i === sel ? "text-ink" : "text-acid"}>$</span> {r.head}
                </span>
                <span
                  className={`truncate font-mono text-[10px] tracking-wider ${
                    i === sel ? "text-ink/70" : "text-dim"
                  }`}
                >
                  {r.desc}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* footer hints */}
        <div className="flex items-center justify-between border-t border-line px-4 py-2 font-mono text-[9px] tracking-[0.25em] text-dim">
          <span>↑↓ SELECT · ↵ RUN</span>
          <span className="hidden sm:inline">
            FREE-FORM: `theme matrix` · `goto work`
          </span>
          <span>NR-SHELL v2.6</span>
        </div>
      </motion.div>
    </>
  );
}
