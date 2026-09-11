"use client";

import { PageShell } from "@/components/pages/PageShell";
import { CAPABILITIES, CERTS, TIMELINE, SOCIALS, EMAIL } from "@/lib/data";
import { playSfx } from "@/lib/sound";

/* ============================================================
   ~/resume — the one-pager. Two exits: DOWNLOAD.PDF serves the
   prebuilt ReportLab artifact from /resume/, PRINT opens the
   browser's print-to-PDF path against a dedicated print
   stylesheet. Everything on the page is derivable from the
   site's own data files — the résumé can never drift.
   ============================================================ */

export function ResumeScreen() {
  return (
    <PageShell crumb="~/resume — ONE PAGE, NO FLUFF" backTo={{ page: "home" }} backLabel="HOME">
      <div className="mx-auto max-w-4xl px-4 pb-24 pt-10 md:px-8">
        {/* ---------- header + actions ---------- */}
        <p className="font-mono text-[10px] tracking-[0.35em]" style={{ color: "var(--acid)" }}>
          MOUSOURI — COMPUTER ENGINEERING × OFFENSIVE SECURITY
        </p>
        <h1
          className="mt-2 font-display leading-[0.9] tracking-wide text-paper"
          style={{ fontSize: "clamp(2.6rem, 9vw, 6.5rem)" }}
        >
          RÉ<span className="text-stroke-acid">SUMÉ</span>
        </h1>

        <div className="mt-6 flex flex-wrap gap-3 print:hidden">
          <a
            href="/resume/mousouri-resume.pdf"
            download
            data-cursor="PDF"
            onClick={() => playSfx("ok")}
            className="border px-5 py-2.5 font-mono text-[10px] tracking-[0.3em] transition-colors duration-150"
            style={{ borderColor: "var(--acid)", color: "var(--acid)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--acid)";
              e.currentTarget.style.color = "var(--ink)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--acid)";
            }}
          >
            ↓ DOWNLOAD.PDF
          </a>
          <button
            type="button"
            data-cursor="PRINT"
            onClick={() => {
              playSfx("ok");
              window.print();
            }}
            className="border border-line px-5 py-2.5 font-mono text-[10px] tracking-[0.3em] text-dim transition-colors hover:border-paper hover:text-paper"
          >
            ⎙ PRINT / SAVE AS PDF
          </button>
          <p className="self-center font-mono text-[9px] tracking-[0.2em] text-dim">
            BOTH ROUTES PRODUCE THE SAME ONE-PAGER.
          </p>
        </div>

        {/* ---------- the sheet ---------- */}
        <article className="resume-sheet mt-8 border border-line bg-ink p-6 md:p-10">
          {/* identity */}
          <header className="border-b border-line pb-5">
            <p className="font-display text-3xl tracking-wide text-paper md:text-4xl">MOUSOURI</p>
            <p className="mt-1 font-mono text-[11px] tracking-[0.2em] text-dim">
              Computer Engineering Student · Independent Security Researcher · MQL5 Algo Developer
            </p>
            <p className="mt-1 font-mono text-[10px] tracking-[0.15em]" style={{ color: "var(--acid)" }}>
              {EMAIL} · Dar es Salaam, Tanzania (UTC+3) · remote-friendly
            </p>
          </header>

          {/* summary */}
          <section className="mt-5">
            <p className="font-mono text-[10px] tracking-[0.3em] text-dim">// SUMMARY</p>
            <p className="mt-2 font-body text-sm leading-relaxed text-paper/85">
              Final-year computer engineering student working the overlap of offensive security,
              automation and hardware. Web-first vulnerability research against bug-bounty
              programs with reports written for triagers — repro steps first, drama never. Builds
              Expert Advisors with real risk models, full-stack web tooling in
              React/TypeScript/Next.js, and embedded fleets on ESP32/Raspberry Pi. The through
              line: break it on purpose, then write it up.
            </p>
          </section>

          {/* domains */}
          <section className="mt-5">
            <p className="font-mono text-[10px] tracking-[0.3em] text-dim">// DOMAINS</p>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              {CAPABILITIES.map((c) => (
                <div key={c.id} className="border border-line px-4 py-3">
                  <p className="font-mono text-[11px] tracking-[0.12em] text-paper">{c.title}</p>
                  <p className="mt-1 font-mono text-[9px] leading-relaxed tracking-[0.08em] text-dim">
                    {c.tags.join(" · ")}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* timeline highlights */}
          <section className="mt-5">
            <p className="font-mono text-[10px] tracking-[0.3em] text-dim">// SELECTED LOG</p>
            <div className="mt-2 flex flex-col divide-y divide-line border border-line">
              {TIMELINE.filter((t) => ["SEC/GRIND", "ALGO", "HW/CV", "WEB"].includes(t.tag)).map(
                (t) => (
                  <div key={t.title} className="flex flex-col gap-0.5 px-4 py-2.5 md:flex-row md:items-baseline md:gap-4">
                    <p className="w-20 shrink-0 font-mono text-[10px] tabular-nums" style={{ color: "var(--acid)" }}>
                      {t.year}
                    </p>
                    <p className="font-mono text-[11px] tracking-[0.1em] text-paper">{t.title}</p>
                  </div>
                ),
              )}
            </div>
          </section>

          {/* certs */}
          <section className="mt-5">
            <p className="font-mono text-[10px] tracking-[0.3em] text-dim">// CERTIFICATIONS</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {CERTS.map((c) => (
                <span
                  key={c.id}
                  className="border border-line px-3 py-1.5 font-mono text-[10px] tracking-[0.12em] text-paper"
                >
                  {c.name} <span className="text-dim">— {c.issuer} {c.year}</span>
                  {c.status === "IN PROGRESS" && (
                    <span className="ml-1" style={{ color: "var(--acid)" }}>·IN PROGRESS</span>
                  )}
                </span>
              ))}
            </div>
          </section>

          {/* links */}
          <section className="mt-5 border-t border-line pt-4">
            <p className="font-mono text-[10px] tracking-[0.3em] text-dim">// VERIFY + CONTACT</p>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
              {SOCIALS.map((s) => (
                <p key={s.label} className="font-mono text-[10px] tracking-[0.12em] text-paper">
                  {s.label} <span className="text-dim">{s.handle}</span>
                </p>
              ))}
            </div>
            <p className="mt-3 font-mono text-[9px] tracking-[0.2em] text-dim">
              REFERENCES: THE SITE ITSELF — 14-GAME ARCADE, TROPHY ENGINE, CTF, ZERO CONSOLE ERRORS.
            </p>
          </section>
        </article>
      </div>
    </PageShell>
  );
}
