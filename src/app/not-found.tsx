import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 — SEGFAULT",
};

/* Brutalist 404. Plain anchor: a full reload replays the boot
   sequence, which is the correct punishment for a dead link. */
export default function NotFound() {
  return (
    <main className="relative z-10 flex min-h-screen flex-col items-center justify-center bg-ink px-6 pt-12 text-center">
      <p className="font-mono text-[10px] tracking-[0.4em] text-dim">
        KERNEL PANIC — ROUTE NOT MOUNTED
      </p>
      <h1
        className="mt-4 font-display leading-[0.85] tracking-wide text-paper select-none"
        style={{ fontSize: "clamp(6rem, 26vw, 22rem)" }}
      >
        4<span className="text-acid">0</span>4
      </h1>
      <p className="mt-4 max-w-md font-mono text-xs leading-relaxed tracking-[0.2em] text-dim">
        THE FILE YOU ASKED FOR IS NOT IN THIS FILESYSTEM. IT MAY HAVE BEEN
        PATCHED, DELETED, OR NEVER EXISTED. SUSPICIOUS EITHER WAY.
      </p>
      {/* the 404 keeps a secret in its dim light — fragment 02/03 (hex) */}
      <p className="mt-6 select-all font-mono text-[10px] tracking-[0.5em] text-dim/35" title="it looks like hex. it is hex.">
        5f 74 68 33
      </p>
      <a
        href="/"
        className="mt-10 border border-acid px-6 py-3 font-mono text-[11px] tracking-[0.35em] text-acid transition-colors duration-200 hover:bg-acid hover:text-ink"
      >
        $ cd ~/home
      </a>
    </main>
  );
}
