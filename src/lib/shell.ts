"use client";

import { useSyncExternalStore } from "react";
import { navigate } from "@/lib/router";
import { SOCIALS, EMAIL } from "@/lib/data";
import { cycleTheme, setTheme, getTheme, THEME_HINT, type ThemeName } from "@/lib/theme";
import { setMuted, isMuted } from "@/lib/sound";
import { trackCommand, trackGuestbook, trackFlag, hasFlag, TROPHIES, isUnlocked, trackAma, trackCoffee, trackSudo } from "@/lib/achievements";
import { AMA_ANSWERS } from "@/lib/data";
import { toggleLofi, isLofiPlaying } from "@/lib/lofi";
import { triggerSaver } from "@/lib/screensaver";
import { readGuestbook, signGuestbook } from "@/lib/guestbook";

/* ============================================================
   NR-SHELL — one command registry, two faces:
   · the ⌘K palette (browse + run)
   · the hidden terminal (` key — full shell with history)

   A command prints through io and may navigate. Everything is
   fire-and-forget; async commands print as they go.
   ============================================================ */

export type LineKind = "out" | "ok" | "err" | "dim" | "acid" | "cmd";

export interface ShellLine {
  text: string;
  kind: LineKind;
}

export interface ShellIO {
  /** print one line of output */
  print(text: string, kind?: LineKind): void;
  /** wipe the transcript (clear) */
  clear(): void;
  /** close the overlay (exit) */
  close(): void;
}

export interface ShellCommand {
  name: string;
  desc: string;
  usage?: string;
  /** hidden from help + palette listing (easter eggs) */
  hidden?: boolean;
  run(argv: string[], io: ShellIO): void | Promise<void>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const GOTO_ROUTES: Record<string, Parameters<typeof navigate>[0]> = {
  home: { page: "home" },
  work: { page: "work" },
  notes: { page: "notes" },
  arcade: { page: "arcade" },
  snake: { page: "arcade", game: "snake" },
  breach: { page: "arcade", game: "breach" },
  typeraid: { page: "arcade", game: "typeraid" },
  packetrun: { page: "arcade", game: "packetrun" },
  tracebreak: { page: "arcade", game: "tracebreak" },
  portknock: { page: "arcade", game: "portknock" },
  phishhunt: { page: "arcade", game: "phishhunt" },
  stacksmash: { page: "arcade", game: "stacksmash" },
  cryptbreak: { page: "arcade", game: "cryptbreak" },
  kernelstorm: { page: "arcade", game: "kernelstorm" },
  klack: { page: "arcade", game: "klack" },
  vimquest: { page: "arcade", game: "vimquest" },
  botnetgrow: { page: "arcade", game: "botnetgrow" },
  hopexe: { page: "arcade", game: "hopexe" },
  stack: { page: "stack" },
  now: { page: "now" },
  timeline: { page: "timeline" },
  ama: { page: "ama" },
  resume: { page: "resume" },
  guestbook: { page: "guestbook" },
  vault: { page: "vault" },
};

const GOTO_SECTIONS: Record<string, string> = {
  about: "#about",
  contact: "#contact",
};

function goto(target: string, io: ShellIO): void {
  const t = target.toLowerCase().replace(/^[/~#]/, "");
  if (GOTO_ROUTES[t]) {
    io.print(`→ ${t}`, "ok");
    io.close();
    navigate(GOTO_ROUTES[t]);
    return;
  }
  if (GOTO_SECTIONS[`#${t}`] ?? GOTO_SECTIONS[t]) {
    io.print(`→ ~/index#${t}`, "ok");
    io.close();
    // sections live on the home page — route there; the home page
    // consumes pending section (nav does the same for anchor links)
    import("@/lib/router").then((m) => {
      m.setPendingSection(GOTO_SECTIONS[t]);
      navigate({ page: "home" });
    });
    return;
  }
  io.print(`goto: no such target '${target}'`, "err");
  io.print(
    "try: home work notes arcade about stack now timeline ama resume contact + any cabinet id (snake, portknock, klack…)",
    "dim",
  );
}

const MANIFESTO = [
  "1. the grid is the brand. everything else is decoration.",
  "2. motion must earn its frames — no spin, no bounce, no fade-in-slowly.",
  "3. security is a verb. ship the repro steps.",
  "4. if the interface doesn't feel like equipment, it's cosplay.",
  "5. boring is a feature. loud is the interface.",
];

/* ---------- CTF: three fragments scattered across the site ----------
   FRAGMENT 01 — terminal:   ls -a  →  cat .flag   (base64)
   FRAGMENT 02 — the 404 page keeps it in the dim light  (hex)
   FRAGMENT 03 — the 'hack' easter egg leaks it          (base64)
   decode → concatenate → 'flag <answer>'. earns the VOID
   colorway, the CRYPTANALYST trophy, and a door: goto vault. */
const CTF_ANSWER = "nr{v0id_th3m3}";

const PLAN = [
  "[ ] finish the degree (allegedly in progress)",
  "[x] pwn the coursework",
  "[ ] first CVE with a name tag",
  "[ ] EA that survives a Monday open",
  "[ ] sleep schedule (stalled since 2023)",
];

export const COMMANDS: ShellCommand[] = [
  {
    name: "help",
    desc: "list every command",
    run(_argv, io) {
      io.print("AVAILABLE COMMANDS", "acid");
      COMMANDS.filter((c) => !c.hidden).forEach((c) => {
        io.print(`  ${c.name.padEnd(12)} ${c.desc}`, "out");
      });
      io.print("tip: 'goto <target>' understands routes and sections", "dim");
    },
  },
  {
    name: "goto",
    desc: "navigate — routes + sections",
    usage: "goto <target>",
    run(argv, io) {
      const t = argv[0];
      if (!t) {
        io.print("usage: goto <target>", "err");
        return;
      }
      goto(t, io);
    },
  },
  {
    name: "whoami",
    desc: "operator identity card",
    run(_argv, io) {
      io.print("root@mousouri — Dar es Salaam, TZ (UTC+3)", "out");
      io.print("comp-eng student · offensive security & bug bounty", "out");
      io.print("MQL5 algo trading · full-stack web · embedded", "out");
      io.print("clearance: NULL · motto: break it on purpose, then write it up", "dim");
    },
  },
  {
    name: "ls",
    desc: "list the site's filesystem (-a for hidden files)",
    run(argv, io) {
      const all = argv.some((a) => /^-{1,2}a/.test(a));
      if (all) {
        io.print(".  ..  .flag  .plan  work/  notes/  arcade/  stack/  now/  timeline/  ama/  resume/  guestbook/  manifesto.txt  socials.txt", "out");
        io.print(".flag — hidden things are usually the interesting ones", "dim");
      } else {
        io.print("work/  notes/  arcade/  stack/  now/  timeline/  ama/  resume/  manifesto.txt  .plan  socials.txt", "out");
      }
    },
  },
  {
    name: "cat",
    desc: "read a file (manifesto.txt, .plan, socials.txt)",
    usage: "cat <file>",
    run(argv, io) {
      const f = (argv[0] ?? "").toLowerCase();
      if (f === "manifesto.txt") return MANIFESTO.forEach((l) => io.print(l, "out"));
      if (f === ".plan" || f === "plan") return PLAN.forEach((l) => io.print(l, "out"));
      if (f === "socials.txt" || f === "socials") {
        SOCIALS.forEach((s) => io.print(`  ${s.label.padEnd(14)} ${s.handle}`, "out"));
        return;
      }
      if (!f) return io.print("usage: cat <file> — try manifesto.txt, .plan, socials.txt", "err");
      if (f === ".flag" || f === "flag") {
        io.print("-----BEGIN FLAG FRAGMENT 01/03-----", "acid");
        io.print("bnJ7djBpZF8=", "out");
        io.print("-----------------------------------", "acid");
        io.print("# base64. two more fragments where you'd least look.", "dim");
        io.print("# one sleeps in the 404's dim light. one leaks from 'hack'.", "dim");
        return;
      }
      io.print(`cat: ${f}: permission denied (buy me a coffee first)`, "err");
    },
  },
  {
    name: "theme",
    desc: "switch colorway — acid / matrix / amber",
    usage: "theme [name]",
    run(argv, io) {
      const arg = (argv[0] ?? "").toLowerCase();
      const valid: ThemeName[] = ["acid", "matrix", "amber", "void"];
      if (!arg) {
        io.print(`current: ${getTheme()}`, "out");
        valid.forEach((t) => io.print(`  ${t.padEnd(8)} ${THEME_HINT[t]}`, "dim"));
        return;
      }
      if (!valid.includes(arg as ThemeName)) {
        io.print(`theme: unknown colorway '${arg}' — acid | matrix | amber`, "err");
        return;
      }
      if (arg === "void" && !hasFlag()) {
        io.print("theme: VOID is earned, not given. three fragments are scattered.", "err");
        io.print("start with: ls -a", "dim");
        return;
      }
      setTheme(arg as ThemeName);
      io.print(`colorway → ${arg.toUpperCase()}. ${THEME_HINT[arg as ThemeName]}`, "ok");
    },
  },
  {
    name: "sound",
    desc: "toggle synthesized UI audio",
    usage: "sound <on|off>",
    run(argv, io) {
      const arg = (argv[0] ?? "").toLowerCase();
      if (arg === "on" || arg === "1") {
        setMuted(false);
        io.print("sound: ON — hover, click, wipe. subtle, we promise.", "ok");
      } else if (arg === "off" || arg === "0") {
        setMuted(true);
        io.print("sound: OFF — the machine respects your silence.", "ok");
      } else {
        io.print(`sound is ${isMuted() ? "OFF" : "ON"} — usage: sound on|off`, "out");
      }
    },
  },
  {
    name: "uptime",
    desc: "session uptime + kernel flattery",
    run(_argv, io) {
      const s = Math.floor(performance.now() / 1000);
      const mm = String(Math.floor(s / 60)).padStart(2, "0");
      const ss = String(s % 60).padStart(2, "0");
      io.print(`up ${mm}:${ss} · load average: 0.07 0.03 0.01 (very chill)`, "out");
    },
  },
  {
    name: "date",
    desc: "local terminal time (EAT)",
    run(_argv, io) {
      io.print(
        new Intl.DateTimeFormat("en-GB", {
          dateStyle: "full",
          timeStyle: "medium",
          timeZone: "Africa/Dar_es_Salaam",
        }).format(new Date()),
        "out",
      );
    },
  },
  {
    name: "pwd",
    desc: "print working route",
    run(_argv, io) {
      const p = window.location.pathname;
      io.print(`/home/mousouri${p === "/" ? "" : p}`, "out");
    },
  },
  {
    name: "ping",
    desc: "4 packets to localhost, theatrically",
    async run(_argv, io) {
      io.print("PING localhost (127.0.0.1) 56(84) bytes of data.", "dim");
      for (let i = 1; i <= 4; i++) {
        await sleep(320);
        io.print(`64 bytes from localhost: icmp_seq=${i} ttl=64 time=0.0${i * 3 + 1} ms`, "out");
      }
      io.print("--- localhost ping statistics --- 4 transmitted, 4 received, 0% loss", "dim");
    },
  },
  {
    name: "nmap",
    desc: "scan a target (it's fake, relax)",
    usage: "nmap [target]",
    async run(argv, io) {
      const target = argv[0] ?? "mousouri.dev";
      io.print(`Starting NRmap 7.96 — scanning ${target} (${target === "mousouri.dev" ? "127.0.0.1" : "10.0.0.13"})`, "dim");
      await sleep(420);
      io.print("PORT     STATE  SERVICE     VERSION", "out");
      const rows: Array<[string, string, string, string]> = [
        ["22/tcp", "open", "ssh", "OpenSSH 9.6 (protocol 2.0)"],
        ["80/tcp", "open", "http", "nginx (redirects politely)"],
        ["443/tcp", "open", "https", "next.js — self aware"],
        ["1337/tcp", "open", "ego", "runs on exposure"],
        ["3306/tcp", "filtered", "mysql", "knocked, no answer"],
      ];
      for (const r of rows) {
        await sleep(230);
        io.print(`${r[0].padEnd(9)}${r[1].padEnd(7)}${r[2].padEnd(12)}${r[3]}`, r[1] === "open" ? "out" : "dim");
      }
      await sleep(300);
      io.print(`NRmap done: 1 host up — ${rows.filter((r) => r[1] === "open").length} ports open in ${(1.8).toFixed(2)}s`, "ok");
    },
  },
  {
    name: "socials",
    desc: "where to find the operator",
    run(_argv, io) {
      SOCIALS.forEach((s) => io.print(`  ${s.label.padEnd(14)} ${s.handle}  →  ${s.href}`, "out"));
      io.print(`  EMAIL          ${EMAIL}`, "out");
    },
  },
  {
    name: "matrix",
    desc: "initiate the desert of the real",
    run(_argv, io) {
      io.print("wake up, neo…", "dim");
      io.print("the grid has you…", "dim");
      io.print("follow the green rabbit. (colorway → matrix)", "ok");
      setTheme("matrix");
    },
  },
  {
    name: "credits",
    desc: "stack behind the curtain",
    run(_argv, io) {
      io.print("next.js · react · tailwind 4 · gsap · lenis · framer-motion", "out");
      io.print("three.js / r3f · webaudio (this shell's voice) · prisma", "out");
      io.print("no templates were harmed. every pixel argued over.", "dim");
    },
  },
  {
    name: "clear",
    desc: "wipe the transcript",
    run(_argv, io) {
      io.clear();
    },
  },
  {
    name: "exit",
    desc: "close the shell",
    run(_argv, io) {
      io.print("logout", "dim");
      io.close();
    },
  },
  {
    name: "echo",
    desc: "repeat after you",
    run(argv, io) {
      io.print(argv.join(" ") || "", "out");
    },
  },
  {
    name: "sign",
    desc: "sign the guestbook wall",
    usage: "sign <name> <message...>",
    run(argv, io) {
      if (argv.length < 2) {
        io.print("usage: sign <name> <message...> — e.g. sign neo the spoon is a lie", "err");
        return;
      }
      const err = signGuestbook(argv[0], argv.slice(1).join(" "), getTheme());
      if (err) {
        io.print(err, "err");
        return;
      }
      trackGuestbook();
      io.print(`signed. the wall remembers you, ${argv[0]}.`, "ok");
      io.print("→ goto guestbook to see it up", "dim");
    },
  },
  {
    name: "guestbook",
    desc: "read the signature wall",
    run(_argv, io) {
      const entries = readGuestbook();
      if (!entries.length) {
        io.print("guestbook: empty. be the first — 'sign <name> <message>'", "dim");
        return;
      }
      io.print(`GUESTBOOK — ${entries.length} signature(s)`, "acid");
      entries.slice(0, 8).forEach((e) => {
        io.print(`  ${e.n} — ${e.m}`, "out");
      });
      io.print("add yours: 'sign <name> <message>' — or goto guestbook", "dim");
    },
  },
  {
    name: "achievements",
    desc: "trophy case — what you've unlocked",
    run(_argv, io) {
      const got = TROPHIES.filter((t) => isUnlocked(t.id));
      io.print(`TROPHY CASE — ${got.length}/${TROPHIES.length}`, "acid");
      TROPHIES.forEach((t) => {
        const has = isUnlocked(t.id);
        if (has) io.print(`  ■ ${t.name.padEnd(16)} ${t.desc}`, "out");
        else if (!t.secret) io.print(`  □ ${t.name.padEnd(16)} ${t.desc}`, "dim");
        else io.print(`  □ ???`, "dim");
      });
      if (got.length === TROPHIES.length) io.print(`all ${TROPHIES.length}. touch grass immediately.`, "ok");
    },
  },
  {
    name: "ask",
    desc: "transmit a question to the oracle",
    usage: "ask <question...>",
    async run(argv, io) {
      const q = argv.join(" ").trim();
      if (!q) {
        io.print("usage: ask <question...> — the oracle answers deterministically", "err");
        return;
      }
      io.print(`> ${q.slice(0, 64)}`, "cmd");
      for (const l of ["resolving…", "consulting the packets…", "answer pinned."]) {
        await sleep(240);
        io.print(l, "dim");
      }
      const h = [...q.toLowerCase()].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
      io.print(AMA_ANSWERS[h % AMA_ANSWERS.length], "acid");
      trackAma();
      io.print("→ the full oracle lives at goto ama", "dim");
    },
  },
  {
    name: "music",
    desc: "toggle LO-FI.WAV — the procedural status-bar radio",
    run(_argv, io) {
      const on = toggleLofi();
      io.print(
        on ? "LO-FI.WAV: ON — 72 BPM, zero streams, all oscillators." : "LO-FI.WAV: OFF — the room hums only with the fans.",
        on ? "ok" : "out",
      );
    },
  },
  {
    name: "screensaver",
    desc: "launch ROOT.SAVER on demand",
    hidden: true,
    run(_argv, io) {
      io.print("root.saver: engaging phosphor dreams…", "dim");
      io.close();
      triggerSaver();
    },
  },
  /* ---------- easter eggs ---------- */
  {
    name: "flag",
    desc: "submit what you assembled",
    usage: "flag <answer>",
    hidden: true,
    run(argv, io) {
      const attempt = argv.join("");
      if (!attempt) {
        io.print("flag: no answer supplied. three fragments are scattered across the site.", "err");
        io.print("start with: ls -a", "dim");
        return;
      }
      if (attempt === CTF_ANSWER) {
        trackFlag();
        io.print("   __   __ _  _   _  ___ ", "acid");
        io.print("   \\ \\ / /| \|/ | / \\| __|", "acid");
        io.print("    \\  V  / |  \\  / |  _|", "acid");
        io.print("     \\_/   | |\\ \/  |___|", "acid");
        io.print("> FLAG ACCEPTED — nr{v0id_th3m3}", "ok");
        io.print("> trophy unlocked: CRYPTANALYST", "ok");
        io.print("> colorway VOID unlocked — 'theme void' to wear it", "ok");
        io.print("> a door opened — 'goto vault'", "acid");
        return;
      }
      io.print(`flag: '${attempt.slice(0, 32)}' is not it. decode, concatenate, resubmit.`, "err");
    },
  },
  {
    name: "sudo",
    desc: "escalate (you are already root)",
    hidden: true,
    async run(argv, io) {
      const joined = argv.join(" ");
      trackSudo();
      if (/rm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)/.test(joined) || joined.includes("rm -rf")) {
        io.print("sudo: deleting the entire filesystem…", "err");
        const marks = ["/bin", "/etc", "/var", "/home/mousouri", "/portfolio", "/ego"];
        for (const m of marks) {
          await sleep(260);
          io.print(`removed '${m}'`, "dim");
        }
        await sleep(420);
        io.print("just kidding. rebooting for the theatrics…", "ok");
        await sleep(650);
        window.location.reload();
        return;
      }
      await sleep(300);
      io.print("sudo: identity already root. ego already sufficient.", "ok");
    },
  },
  {
    name: "vim",
    desc: "the inescapable editor",
    hidden: true,
    run(_argv, io) {
      io.print("vim: you are now trapped, like everyone before you.", "out");
      io.print("type :q! in your heart. there is no escape here either.", "dim");
    },
  },
  {
    name: "coffee",
    desc: "brew unit",
    hidden: true,
    run(_argv, io) {
      trackCoffee();
      io.print("     ( (", "acid");
      io.print("      ) )", "acid");
      io.print("   ........", "acid");
      io.print("   |      |]   brewing… error 418: I'm a teapot", "acid");
      io.print("   '------'", "acid");
      io.print("caffeinated status logged.", "dim");
    },
  },
  {
    name: "hack",
    desc: "definitely a real hollywood hack",
    hidden: true,
    async run(_argv, io) {
      const lines = [
        "BYPASSING MAINFRAME…",
        "ENHANCING…",
        "TYPING REALLY FAST…",
        "TWO PEOPLE ON ONE KEYBOARD…",
        "ACCESS GRANTED — welcome to the movie.",
        "leaked in transit — fragment 03/03: bTN9  (base64, naturally)",
      ];
      for (const l of lines) {
        await sleep(430);
        io.print(l, l.includes("GRANTED") ? "ok" : l.includes("fragment") ? "acid" : "out");
      }
    },
  },
];

/* ---------- dispatch ---------- */

export function commandNames(): ShellCommand[] {
  return COMMANDS.filter((c) => !c.hidden);
}

export function execCommand(raw: string, io: ShellIO): void {
  const line = raw.trim();
  if (!line) return;
  const [name, ...argv] = line.split(/\s+/);
  trackCommand();
  const cmd = COMMANDS.find(
    (c) => c.name === name.toLowerCase() || (name === "nrman" && c.name === "help"),
  );
  if (!cmd) {
    io.print(`nrsh: command not found: ${name} — try 'help'`, "err");
    return;
  }
  void cmd.run(argv, io);
}

/* ---------- overlay focus store (palette ↔ terminal stay exclusive) ---------- */

export type OverlayKind = "none" | "palette" | "terminal";

let overlay: OverlayKind = "none";
const overlayListeners = new Set<() => void>();

export function setOverlay(k: OverlayKind) {
  if (overlay === k) return;
  overlay = k;
  overlayListeners.forEach((l) => l());
}

export function getOverlay(): OverlayKind {
  return overlay;
}

export function useOverlay(): OverlayKind {
  return useSyncExternalStore(subscribeOverlay, getOverlay, () => "none" as OverlayKind);
}

function subscribeOverlay(cb: () => void) {
  overlayListeners.add(cb);
  return () => {
    overlayListeners.delete(cb);
  };
}

/** where a bare `goto` can head — used by the palette's route rows */
export const PALETTE_ROUTES: Array<{ label: string; target: string; hint: string }> = [
  { label: "goto home", target: "home", hint: "~/index — the hero" },
  { label: "goto work", target: "work", hint: "selected work index" },
  { label: "goto notes", target: "notes", hint: "writeups archive" },
  { label: "goto arcade", target: "arcade", hint: "coin-op wing" },
  { label: "goto about", target: "about", hint: "whoami, expanded" },
  { label: "goto stack", target: "stack", hint: "the full arsenal + idea bulb" },
  { label: "goto now", target: "now", hint: "the live page — building, reading, learning" },
  { label: "goto timeline", target: "timeline", hint: "the whole log, 2019 → now" },
  { label: "goto ama", target: "ama", hint: "ask the deterministic oracle" },
  { label: "goto resume", target: "resume", hint: "the printable résumé" },
  { label: "goto contact", target: "contact", hint: "open a channel" },
  { label: "goto snake", target: "snake", hint: "SNAKE.EXE" },
  { label: "goto breach", target: "breach", hint: "BREACH.EXE" },
  { label: "goto typeraid", target: "typeraid", hint: "TTY.RACER" },
  { label: "goto packetrun", target: "packetrun", hint: "PKT.RUN" },
  { label: "goto tracebreak", target: "tracebreak", hint: "TRACE.BREAK" },
  { label: "goto portknock", target: "portknock", hint: "PORT.KNOCK" },
  { label: "goto phishhunt", target: "phishhunt", hint: "PHISH.HUNT" },
  { label: "goto stacksmash", target: "stacksmash", hint: "STACK.SMASH" },
  { label: "goto cryptbreak", target: "cryptbreak", hint: "CRYPT.BREAK" },
  { label: "goto kernelstorm", target: "kernelstorm", hint: "KERNEL.STORM" },
  { label: "goto klack", target: "klack", hint: "KLACK" },
  { label: "goto vimquest", target: "vimquest", hint: "VIM.QUEST" },
  { label: "goto botnetgrow", target: "botnetgrow", hint: "BOTNET.GROW" },
  { label: "goto hopexe", target: "hopexe", hint: "HOP.EXE" },
  { label: "goto guestbook", target: "guestbook", hint: "sign the wall" },
];
