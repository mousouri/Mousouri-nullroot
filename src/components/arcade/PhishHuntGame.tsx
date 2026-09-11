"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readHi, writeHi } from "@/lib/games";
import { playSfx } from "@/lib/sound";

/* ============================================================
   PHISH.HUNT — the inbox is a minefield. Twelve messages, five
   seconds each: LEGIT or PHISH? Right calls build combo; wrong
   calls (or hesitating) burn TRUST. Every verdict comes with
   the tell — the lesson is the loot.
   ============================================================ */

type Phase = "READY" | "CARD" | "VERDICT" | "OVER";
type Verdict = "PHISH" | "LEGIT";

interface MailItem {
  from: string;
  subject: string;
  body: string;
  phish: boolean;
  tell: string;
}

const CORPUS: MailItem[] = [
  {
    from: "security@paypa1-verify.com",
    subject: "URGENT: Account limited — verify NOW",
    body: "Dear Customer,\n\nYour account has been limited due to unusual activity. Click http://paypa1-verify.com/login within 24h or PERMANENT suspension.",
    phish: true,
    tell: "Lookalike domain (paypa1 with a 1), generic greeting, threat + countdown. Classic trifecta.",
  },
  {
    from: "no-reply@github.com",
    subject: "[mousouri] workflow failed: ci.yml",
    body: "The 'build' workflow run #412 failed on main.\n\nRun: github.com/mousouri/portfolio/actions/runs/412\n\nYou're receiving this because you watch this repo.",
    phish: false,
    tell: "Sender matches the service, no link spoofing, no urgency theater — automated notification behavior.",
  },
  {
    from: "hr-payroll@company-careers.net",
    subject: "Job offer — no interview needed!!",
    body: "Congratulations! You were selected for a $4,500/week remote position. Fill the attached form with your ID + bank details to begin.",
    phish: true,
    tell: "'Too good to be true' salary, no interview, and an attachment asking for PII. That's the whole scam.",
  },
  {
    from: "billing@aws.amazon.com",
    subject: "Your AWS invoice is available",
    body: "Your invoice for April is ready.\n\nAmount due: $12.47\nAccount: 4412-XXXX-7890\n\nView in the AWS Billing console.",
    phish: false,
    tell: "Masked account number, sane amount, points to the console (not a link) — real billing mail behaves like this.",
  },
  {
    from: "ceo@company.com",
    subject: "quick favor — gift cards",
    body: "Are you at your desk? I'm in a meeting, can't talk. Need 5x $200 Apple gift cards for client gifts ASAP. I'll reimburse you today. Keep this between us.",
    phish: true,
    tell: "CEO fraud: authority + urgency + secrecy + gift cards. Even a real CEO's address could be spoofed — verify out-of-band.",
  },
  {
    from: "newsletter@undredable.dev",
    subject: "Issue #42: This week in web security",
    body: "This week: one new CSP gotcha, three writeups worth your coffee, and why your bundler is lying about tree-shaking. Unsubscribe anytime.",
    phish: false,
    tell: "You (allegedly) subscribed, no attachments, no credential asks, one-click unsubscribe. Newsletter, not nettrap.",
  },
  {
    from: "support@apple-id.co.helpdesk-reset.net",
    subject: "Your Apple ID was used to sign in",
    body: "New sign-in from Windows PC. If this wasn't you, reset your password immediately at apple-id.co.helpdesk-reset.net/unlock",
    phish: true,
    tell: "Real Apple mail comes from apple.com — the whole domain here is a maze of dashes. Fake urgency link.",
  },
  {
    from: "no-reply@youtube.com",
    subject: "Someone commented on your video",
    body: "GLM_Master left a comment: 'the ffmpeg tutorial saved my week, thanks!'\n\nReply or view on YouTube.",
    phish: false,
    tell: "Plausible notification, no link in body, no ask. Comments are moderated on-platform.",
  },
  {
    from: "it-helpdesk@company.com.co",
    subject: "Password expires today",
    body: "Your password expires today. Change it now: company-sso.com.co/reset?id=you\n\nFailure to comply = locked account.",
    phish: true,
    tell: "The domain is company.com.CO — a country TLD bolted on. The SSO link points elsewhere too. Expiry scare is the hook.",
  },
  {
    from: "orders@kariakoo-electronics.co.tz",
    subject: "Your order #2291 has shipped",
    body: "Karibu! Your order (2x RPi 4, camera module) shipped via bus parcel. Tracking: KE-2291-DSM. Expected delivery 2 days.",
    phish: false,
    tell: "Local domain matches the shop, order details are specific and plausible, no payment or credential request.",
  },
  {
    from: "crypto-signals@t-mail.cc",
    subject: "500% returns — EA bot leak, last slots",
    body: "Insider algo leaked! 500% monthly returns guaranteed. Send 0.05 BTC to license, slots close in 2 hours. DM for wallet address.",
    phish: true,
    tell: "Guaranteed returns don't exist. Crypto payment = irreversible. Countdown = manufactured scarcity. Burn it.",
  },
  {
    from: "no-reply@hackerone.com",
    subject: "Your report #33812 was triaged",
    body: "Your report was triaged as P2 and a bounty has been added to your balance.\n\nCheck your HackerOne dashboard for details.",
    phish: false,
    tell: "Expected event (you filed a report), sender domain matches, points to dashboard not a direct link.",
  },
  {
    from: "dhl-express@parcel-track.info",
    subject: "Customs fee required — package held",
    body: "Your package is held at customs. Pay the $1.99 clearance fee: parcel-track.info/pay\n\n(You don't remember ordering anything? Exactly.)",
    phish: true,
    tell: "parcel-track.INFO isn't DHL, and $1.99 'customs' pages exist to harvest cards. Tiny fee, big harvest.",
  },
  {
    from: "calendar-notification@google.com",
    subject: "Invitation: standup@ Mon 10:00",
    body: "You've been invited to 'Eng Standup' by ops-team.\n\nMon, 10:00–10:15. 3 rooms, no attachments.\n\nRespond in Google Calendar.",
    phish: false,
    tell: "Legit calendar flow, no spooky links, no ask. Boring in all the right ways.",
  },
  {
    from: "admin@company.com",
    subject: "Re: Invoice #7712 — ATTACHMENT",
    body: "See attached Invoice_7712.pdf.exe for the updated totals. Password for the zip is 1234. Open it before accounting closes today.",
    phish: true,
    tell: "PDF.EXE — a double extension. Password-protected archives dodge scanners. Urgency on top. Triple flag.",
  },
  {
    from: "security@yourbank.com",
    subject: "We detected a new login",
    body: "New sign-in on Chrome from Dar es Salaam, TZ at 14:02.\n\nIf this was you, no action needed. If not, visit your bank app (not this email) to secure your account.",
    phish: false,
    tell: "No link, tells you to use the official app instead, specific device/time context. Banks do this right when they do.",
  },
];

const ROUND_COUNT = 12;
const CARD_MS = 5000;
const VERDICT_MS = 2600;

function sampleRound(): MailItem[] {
  const pool = [...CORPUS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, ROUND_COUNT);
}

export function PhishHuntGame() {
  const [phase, setPhase] = useState<Phase>("READY");
  const [round, setRound] = useState<MailItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [trust, setTrust] = useState(3);
  const [right, setRight] = useState(0);
  const [hi, setHi] = useState(0);
  const [record, setRecord] = useState(false);
  const [remaining, setRemaining] = useState(CARD_MS);
  const [last, setLast] = useState<{ ok: boolean; timedOut: boolean; item: MailItem } | null>(null);

  const item = round[idx];
  const itemRef = useRef<MailItem | null>(null);
  const phaseRef = useRef<Phase>("READY");

  /* mirror state into refs inside effects (never during render) */
  useEffect(() => {
    itemRef.current = item ?? null;
  }, [item]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  /* hi score on mount */
  useEffect(() => {
    const t = window.setTimeout(() => setHi(readHi("nr-hi-phishhunt")), 0);
    return () => window.clearTimeout(t);
  }, []);

  const finish = useCallback((finalScore: number) => {
    const rec = writeHi("nr-hi-phishhunt", finalScore);
    setRecord(rec);
    setHi((h) => (rec ? finalScore : h));
    setPhase("OVER");
    playSfx(rec ? "ok" : "click");
  }, []);

  const start = useCallback(() => {
    setRound(sampleRound());
    setIdx(0);
    setScore(0);
    setCombo(0);
    setTrust(3);
    setRight(0);
    setRecord(false);
    setRemaining(CARD_MS);
    setLast(null);
    setPhase("CARD");
    playSfx("boot");
  }, []);

  const answer = useCallback(
    (pick: Verdict) => {
      if (phaseRef.current !== "CARD") return;
      const it = itemRef.current;
      if (!it) return;
      const ok = (pick === "PHISH") === it.phish;
      if (ok) {
        setRight((r) => r + 1);
        setCombo((c) => {
          const nc = c + 1;
          setScore((s) => s + 100 + Math.min(80, (nc - 1) * 10));
          return nc;
        });
        playSfx("pickup");
      } else {
        setCombo(0);
        setTrust((t) => {
          const nt = t - 1;
          return nt;
        });
        playSfx("err");
      }
      setLast({ ok, timedOut: false, item: it });
      setPhase("VERDICT");
    },
    [],
  );

  /* per-phase timers: card countdown + verdict auto-advance */
  useEffect(() => {
    if (phase === "CARD") {
      const started = performance.now();
      const iv = window.setInterval(() => {
        const left = CARD_MS - (performance.now() - started);
        setRemaining(Math.max(0, left));
        if (left <= 0) {
          window.clearInterval(iv);
          // timeout = wrong call, trust burns
          setCombo(0);
          setTrust((t) => t - 1);
          setLast({ ok: false, timedOut: true, item: itemRef.current! });
          setPhase("VERDICT");
          playSfx("err");
        }
      }, 100);
      return () => window.clearInterval(iv);
    }
    if (phase === "VERDICT") {
      const t = window.setTimeout(() => {
        const trustDead = trust <= 0;
        const wasLast = idx + 1 >= ROUND_COUNT;
        if (trustDead || wasLast) {
          finish(score);
        } else {
          setIdx((i) => i + 1);
          setRemaining(CARD_MS);
          setPhase("CARD");
        }
      }, VERDICT_MS);
      return () => window.clearTimeout(t);
    }
  }, [phase, idx, trust, score, finish]);

  /* keyboard: A/← legit, D/→ phish, space/enter continue */
  useEffect(() => {
    const editable = (el: EventTarget | null) => {
      const e = el as HTMLElement | null;
      return !!e && (e.tagName === "INPUT" || e.tagName === "TEXTAREA" || !!e.isContentEditable);
    };
    const onKey = (e: KeyboardEvent) => {
      if (editable(e.target)) return;
      const k = e.key.toLowerCase();
      if (phase === "READY" || phase === "OVER") {
        if (k === " " || k === "enter") {
          e.preventDefault();
          start();
        }
        return;
      }
      if (phase === "CARD") {
        if (k === "a" || k === "arrowleft") {
          e.preventDefault();
          answer("LEGIT");
        } else if (k === "d" || k === "arrowright") {
          e.preventDefault();
          answer("PHISH");
        }
      } else if (phase === "VERDICT" && (k === " " || k === "enter")) {
        e.preventDefault();
        const trustDead = trust <= 0;
        const wasLast = idx + 1 >= ROUND_COUNT;
        if (trustDead || wasLast) finish(score);
        else {
          setIdx((i) => i + 1);
          setRemaining(CARD_MS);
          setPhase("CARD");
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, answer, start, trust, idx, score, finish]);

  const accuracy = ROUND_COUNT ? Math.round((right / Math.max(1, Math.min(ROUND_COUNT, idx + (phase === "OVER" ? 1 : 0)))) * 100) : 0;
  const timeFrac = remaining / CARD_MS;

  return (
    <div className="mx-auto w-full max-w-[560px]">
      {/* HUD */}
      <div className="flex items-center justify-between border border-line bg-ink px-3 py-2 font-mono text-[10px] tracking-[0.25em]">
        <span className="text-dim">
          SCORE <span className="text-acid tabular-nums">{score}</span>
        </span>
        <span className="text-dim">
          MAIL <span className="text-paper tabular-nums">{Math.min(ROUND_COUNT, idx + 1)}/{ROUND_COUNT}</span>
        </span>
        <span className="text-dim">
          TRUST <span className="text-paper tabular-nums">{"■".repeat(Math.max(0, trust)) || "—"}</span>
        </span>
        <span className="text-dim">
          COMBO <span className="text-paper tabular-nums">x{combo}</span>
        </span>
        <span className="text-dim">
          HI <span className="text-paper tabular-nums">{hi}</span>
        </span>
      </div>

      {/* timer bar */}
      <div className="h-1.5 w-full border border-t-0 border-line bg-ink">
        <div
          className={`h-full ${timeFrac < 0.3 ? "bg-paper" : "bg-acid"} transition-[width] duration-100 ease-linear`}
          style={{ width: phase === "CARD" ? `${timeFrac * 100}%` : "0%" }}
        />
      </div>

      <div className="relative mt-2 min-h-[420px] border border-line p-4 md:p-6">
        {phase === "READY" && (
          <div className="flex min-h-[380px] flex-col items-center justify-center text-center">
            <p className="font-display text-4xl tracking-wide text-paper md:text-5xl">PHISH.HUNT</p>
            <p className="mt-3 max-w-[40ch] font-mono text-[10px] leading-relaxed tracking-[0.2em] text-dim">
              12 MESSAGES. 5 SECONDS EACH. CALL THEM LEGIT OR PHISH —
              EVERY VERDICT TEACHES THE TELL. THREE BURNED TRUSTS AND
              THE INBOX WINS.
            </p>
            <button
              type="button"
              data-cursor="RUN"
              onClick={start}
              className="mt-6 border border-acid px-4 py-2 font-mono text-[11px] tracking-[0.3em] text-acid transition-colors hover:bg-acid hover:text-ink"
            >
              [ OPEN INBOX ]
            </button>
          </div>
        )}

        {phase === "CARD" && item && (
          <div>
            <p className="font-mono text-[9px] tracking-[0.3em] text-dim">INBOUND MESSAGE — JUDGE IT</p>
            <div className="mt-3 border border-line bg-ink p-3 font-mono text-[11px] leading-relaxed">
              <p className="truncate">
                <span className="text-dim">FROM </span>
                <span className="text-acid">{item.from}</span>
              </p>
              <p className="mt-1 truncate text-paper">
                <span className="text-dim">SUBJ </span>
                {item.subject}
              </p>
              <div className="mt-3 whitespace-pre-line border-t border-line pt-3 text-[10px] text-paper/80">
                {item.body}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                data-cursor="LEGIT"
                onClick={() => answer("LEGIT")}
                className="border border-line py-3 font-mono text-xs tracking-[0.3em] text-paper transition-colors hover:border-acid hover:bg-acid hover:text-ink"
              >
                LEGIT<span className="ml-2 hidden text-dim sm:inline">[A/←]</span>
              </button>
              <button
                type="button"
                data-cursor="PHISH"
                onClick={() => answer("PHISH")}
                className="border border-line py-3 font-mono text-xs tracking-[0.3em] text-paper transition-colors hover:border-acid hover:bg-acid hover:text-ink"
              >
                PHISH<span className="ml-2 hidden text-dim sm:inline">[D/→]</span>
              </button>
            </div>
          </div>
        )}

        {phase === "VERDICT" && last && (
          <div className="flex min-h-[380px] flex-col items-center justify-center text-center">
            <p className={`font-display text-4xl tracking-wide md:text-5xl ${last.ok ? "text-acid" : "text-paper"}`}>
              {last.ok ? "GOOD CALL" : last.timedOut ? "TOO SLOW" : "HOOKED"}
            </p>
            <p className="mt-2 font-mono text-[10px] tracking-[0.25em] text-dim">
              IT WAS {last.item.phish ? "PHISH" : "LEGIT"}
            </p>
            <div className="mt-4 max-w-[46ch] border border-line bg-ink p-3 font-mono text-[10px] leading-relaxed tracking-[0.12em] text-paper/80">
              <span className="text-acid">TELL — </span>
              {last.item.tell}
            </div>
            <p className="mt-4 font-mono text-[9px] tracking-[0.3em] text-dim">
              {trust <= 0 ? "TRUST EXHAUSTED" : idx + 1 >= ROUND_COUNT ? "INBOX CLEARED" : "NEXT →"}
            </p>
          </div>
        )}

        {phase === "OVER" && (
          <div className="flex min-h-[380px] flex-col items-center justify-center text-center">
            <p className="font-display text-4xl tracking-wide text-paper md:text-5xl">
              {trust <= 0 ? "PWNED" : "INBOX CLEARED"}
            </p>
            <p className="mt-2 font-mono text-[10px] tracking-[0.3em] text-dim">
              {trust <= 0 ? "THREE BURNED TRUSTS — CHECK YOUR PRIVILEGES" : "ALL TWELVE JUDGED"}
            </p>
            <p className="mt-3 font-mono text-[11px] tracking-[0.25em] text-dim">
              SCORE <span className="text-acid">{score}</span> — CALLS RIGHT{" "}
              <span className="text-paper">{right}</span> — ACC <span className="text-paper">{accuracy}%</span>
            </p>
            <p className="mt-1 font-mono text-[11px] tracking-[0.25em] text-dim">
              HI <span className="text-paper">{hi}</span>
              {record && <span className="ml-2 text-acid">NEW RECORD</span>}
            </p>
            <button
              type="button"
              data-cursor="RETRY"
              onClick={start}
              className="mt-6 border border-acid px-4 py-2 font-mono text-[11px] tracking-[0.3em] text-acid transition-colors hover:bg-acid hover:text-ink"
            >
              [ REOPEN INBOX ]
            </button>
          </div>
        )}
      </div>
      <p className="mt-2 font-mono text-[9px] tracking-[0.3em] text-dim/60">
        A/← LEGIT — D/→ PHISH — SPACE CONTINUE
      </p>
    </div>
  );
}
