import { mulberry32 } from "./motion";

/* ============================================================
   Game logic — pure functions, no React. Everything here is
   deterministic per seed so the board generator is testable
   and reproducible (same seed → same ICE).
   ============================================================ */

/* ---------- BREACH.EXE ---------- */

export const HEX_BYTES = ["1C", "55", "BD", "E9", "7A", "FF"] as const;

export interface Daemon {
  name: string;
  seq: string[];
}

export interface BreachConfig {
  size: number; // grid is size × size
  buffer: number;
  daemons: Daemon[];
  seconds: number;
  seed: number;
}

export const BREACH_LEVELS = {
  EASY: { buffer: 6, daemonCount: 2, daemonLen: 3, seconds: 60 },
  STANDARD: { buffer: 8, daemonCount: 3, daemonLen: 4, seconds: 50 },
  HARD: { buffer: 8, daemonCount: 3, daemonLen: 5, seconds: 40 },
} as const;

export type BreachLevelKey = keyof typeof BREACH_LEVELS;

/**
 * Builds a breach board that is guaranteed solvable:
 * 1. generate a legal solution path (alternate row/col moves)
 * 2. derive daemons as subsequences of that path's bytes
 * 3. fill remaining cells with noise bytes
 */
export function generateBreach(level: BreachLevelKey, seed: number): {
  grid: string[][];
  daemons: Daemon[];
  config: Omit<BreachConfig, "seed">;
} {
  const cfg = BREACH_LEVELS[level];
  const size = 6;
  const rand = mulberry32(seed);

  // -- 1. solution path: alternate row/col constraint, no cell reuse
  const used = new Set<string>();
  const path: Array<{ r: number; c: number }> = [];
  let phase: "row" | "col" = "row"; // first pick is any cell, then alternate
  let cr = Math.floor(rand() * size);
  let cc = Math.floor(rand() * size);
  used.add(`${cr}-${cc}`);
  path.push({ r: cr, c: cc });

  for (let step = 1; step < cfg.buffer; step++) {
    let guard = 0;
    // pick a fresh cell in the active line; fall back to any legal cell
    while (guard++ < 64) {
      const r = phase === "col" ? cr : Math.floor(rand() * size);
      const c = phase === "row" ? cc : Math.floor(rand() * size);
      if (!used.has(`${r}-${c}`)) {
        used.add(`${r}-${c}`);
        path.push({ r, c });
        cr = r;
        cc = c;
        break;
      }
    }
    // extremely unlikely guard overflow with size 6 — recycle head if hit
    if (path.length <= step) {
      const r = Math.floor(rand() * size);
      const c = Math.floor(rand() * size);
      used.add(`${r}-${c}`);
      path.push({ r, c });
      cr = r;
      cc = c;
    }
    phase = phase === "row" ? "col" : "row";
  }

  const pathBytes = path.map(() => HEX_BYTES[Math.floor(rand() * HEX_BYTES.length)]);

  // -- 2. daemons as subsequences of the path (so a solve exists)
  const daemons: Daemon[] = [];
  const names = ["DAEMON.ASP", "DAEMON.ICE", "DAEMON.WORM"];
  let cursor = Math.floor(rand() * 2);
  for (let d = 0; d < cfg.daemonCount; d++) {
    const len = Math.min(cfg.daemonLen + (level === "HARD" ? d : 0), cfg.buffer - cursor);
    const seq: string[] = [];
    for (let k = 0; k < len && cursor + k < pathBytes.length; k++) {
      seq.push(pathBytes[cursor + k]);
    }
    daemons.push({ name: names[d % names.length], seq });
    cursor += len - 1; // overlap by one byte — classic breach economy
  }

  // -- 3. fill the grid with path bytes at path cells + noise elsewhere
  const grid: string[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => HEX_BYTES[Math.floor(rand() * HEX_BYTES.length)]),
  );
  path.forEach((cell, i) => {
    grid[cell.r][cell.c] = pathBytes[i];
  });

  return {
    grid,
    daemons,
    config: { size, buffer: cfg.buffer, daemons, seconds: cfg.seconds },
  };
}

/** daemon complete when its byte sequence is a subsequence of the buffer */
export function daemonProgress(daemon: Daemon, buffer: string[]): number {
  let di = 0;
  for (const b of buffer) {
    if (b === daemon.seq[di]) di++;
    if (di === daemon.seq.length) break;
  }
  return di;
}

export function breachScore(level: BreachLevelKey, secondsLeft: number): number {
  const base = { EASY: 400, STANDARD: 800, HARD: 1400 }[level];
  return base + secondsLeft * 20;
}

/* ---------- TTY.RACER typing corpus ---------- */

export const TYPE_PROMPTS: string[] = [
  "nmap -sV --top-ports 1000 target.local -oA recon/",
  "git commit -m 'fix: the bug was the intern all along'",
  "ssh root@10.0.0.13 -i ~/.ssh/burner_ed25519",
  "grep -rn 'TODO: never' src/ --include='*.ts'",
  "hydra -l admin -P wordlist.txt 192.168.1.1 http-post-form",
  "python3 exploit.py --target staging --dry-run --verbose",
  "sudo tcpdump -i eth0 'port 443' -w capture.pcap",
  "curl -s -X DELETE api.dev/v1/users/8842 -H 'X-Bypass: 1'",
  "docker exec -it pwned-container /bin/bash -c 'whoami'",
  "findmnt | awk '/sda1/ {print $2}' && lsblk -f",
  "openssl s_client -connect mail.mousouri.dev:993 -quiet",
  "ping -c 4 localhost > /dev/null && echo 'network is fine, probably'",
  "tar -xzvf firmware_dump.bin.gz -C /opt/rev/squashfs-root",
  "ffprobe -show_streams signal.wav 2>&1 | grep -i sample_rate",
];

export interface TypeGrade {
  label: string;
  minWpm: number;
}

export function typeGrade(wpm: number, accuracy: number): string {
  if (accuracy < 0.8) return "KEYBOARD SMASH DETECTED";
  if (wpm >= 75) return "ROOT";
  if (wpm >= 60) return "OPERATOR";
  if (wpm >= 45) return "SUDOER";
  if (wpm >= 30) return "USER";
  return "SCRIPT KIDDIE";
}

/* ---------- shared hi-score helpers ---------- */

export function readHi(key: string): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(window.localStorage.getItem(key) ?? 0) || 0;
  } catch {
    return 0;
  }
}

export function writeHi(key: string, value: number): boolean {
  // returns true when a new record was set
  if (typeof window === "undefined") return false;
  try {
    const prev = readHi(key);
    if (value > prev) {
      window.localStorage.setItem(key, String(value));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
