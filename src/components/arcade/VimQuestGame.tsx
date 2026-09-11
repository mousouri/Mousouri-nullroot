"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEnvironment } from "@/hooks/use-environment";
import { readHi, writeHi } from "@/lib/games";
import { playSfx } from "@/lib/sound";

/* ============================================================
   VIM.QUEST — survival by modal editing. The buffer is a grid,
   the bugs are syntax errors crawling toward your cursor. Move
   with h j k l. x deletes an adjacent bug. dd purges your whole
   row (five-second cooldown). u freezes time — undoing reality
   costs twelve. One cursor. No insert mode. No escape.
   ============================================================ */

type Phase = "READY" | "RUN" | "PAUSE" | "DEAD";

interface Bug {
  x: number;
  y: number;
  glyph: "%" | "&" | "#";
  pts: number;
}

const COLS = 26;
const ROWS = 14;
const SPAWN_START = 2100;
const SPAWN_FLOOR = 760;
const SPAWN_SHRINK = 45; // ms per spawn
const BUG_STEP_START = 1500;
const BUG_STEP_FLOOR = 640;
const BUG_STEP_SHRINK = 28;

export function VimQuestGame() {
  const { isTouch } = useEnvironment();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const player = useRef({ x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) });
  const bugs = useRef<Bug[]>([]);
  const phase = useRef<Phase>("READY");
  const score = useRef(0);
  const scoreAcc = useRef(0);
  const spawnAcc = useRef(0);
  const bugAcc = useRef(0);
  const lastD = useRef(0);
  const pendingD = useRef(false);
  const cdX = useRef(0); // ready when performance.now() > value
  const cdDD = useRef(0);
  const cdU = useRef(0);
  const freezeUntil = useRef(0);
  const readout = useRef("~");
  const readoutAt = useRef(0);
  const elapsed = useRef(0);
  const acid = useRef("#d7ff3f");
  const isTouchRef = useRef(false);

  useEffect(() => {
    isTouchRef.current = isTouch;
  }, [isTouch]);

  const [hud, setHud] = useState<{
    score: number;
    phase: Phase;
    hi: number;
    record: boolean;
    time: number;
    bugCount: number;
  }>({ score: 0, phase: "READY", hi: 0, record: false, time: 0, bugCount: 0 });

  /* ---------- theme-reactive accent ---------- */
  useEffect(() => {
    const read = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue("--acid").trim();
      if (v) acid.current = v;
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);

  const say = useCallback((text: string) => {
    readout.current = text;
    readoutAt.current = performance.now();
  }, []);

  const reset = useCallback(() => {
    player.current = { x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) };
    bugs.current = [];
    score.current = 0;
    scoreAcc.current = 0;
    spawnAcc.current = 0;
    bugAcc.current = 0;
    elapsed.current = 0;
    pendingD.current = false;
    cdX.current = 0;
    cdDD.current = 0;
    cdU.current = 0;
    freezeUntil.current = 0;
    phase.current = "RUN";
    say("NORMAL MODE — hjkl MOVE · x DELETE · dd PURGE ROW · u FREEZE");
    setHud((h) => ({ ...h, score: 0, phase: "RUN", record: false, time: 0 }));
    playSfx("boot");
  }, [say]);

  const pause = useCallback(() => {
    if (phase.current === "RUN") phase.current = "PAUSE";
    else if (phase.current === "PAUSE") phase.current = "RUN";
    setHud((h) => ({ ...h, phase: phase.current }));
  }, []);

  const die = useCallback(() => {
    phase.current = "DEAD";
    playSfx("zap");
    const record = writeHi("nr-hi-vimquest", score.current);
    setHud((h) => ({ ...h, phase: "DEAD", hi: record ? score.current : h.hi, record }));
  }, []);

  /* ---------- commands ---------- */
  const move = useCallback(
    (dx: number, dy: number) => {
      if (phase.current === "READY" || phase.current === "DEAD") {
        reset();
        return;
      }
      if (phase.current !== "RUN") return;
      const p = player.current;
      p.x = Math.max(0, Math.min(COLS - 1, p.x + dx));
      p.y = Math.max(0, Math.min(ROWS - 1, p.y + dy));
      pendingD.current = false;
      playSfx("click");
      const here = bugs.current.findIndex((b) => b.x === p.x && b.y === p.y);
      if (here >= 0) die();
    },
    [reset, die],
  );

  const delChar = useCallback(() => {
    if (phase.current !== "RUN" || performance.now() < cdX.current) return;
    const p = player.current;
    const adj: Array<[number, number]> = [
      [p.x, p.y - 1],
      [p.x, p.y + 1],
      [p.x - 1, p.y],
      [p.x + 1, p.y],
    ];
    for (const [ax, ay] of adj) {
      const i = bugs.current.findIndex((b) => b.x === ax && b.y === ay);
      if (i >= 0) {
        const b = bugs.current[i];
        bugs.current.splice(i, 1);
        score.current += b.pts;
        cdX.current = performance.now() + 350;
        say(`x — deleted '${b.glyph}' at [${ax},${ay}]  +${b.pts}`);
        playSfx("pickup");
        return;
      }
    }
    cdX.current = performance.now() + 350;
    say("x — nothing adjacent to delete");
    playSfx("key");
  }, [say]);

  const delLine = useCallback(() => {
    if (phase.current !== "RUN") return;
    const now = performance.now();
    if (now < cdDD.current) {
      say(`dd cooling down — ${((cdDD.current - now) / 1000).toFixed(1)}s`);
      return;
    }
    const p = player.current;
    const killed = bugs.current.filter((b) => b.y === p.y);
    if (!killed.length) {
      say("dd — row already clean");
      playSfx("key");
      return;
    }
    bugs.current = bugs.current.filter((b) => b.y !== p.y);
    const pts = killed.reduce((a, b) => a + b.pts, 0);
    score.current += pts;
    cdDD.current = now + 5000;
    say(`:%d — purged ${killed.length} bug(s) on row ${p.y}  +${pts}`);
    playSfx("ok");
  }, [say]);

  const undoTime = useCallback(() => {
    if (phase.current !== "RUN") return;
    const now = performance.now();
    if (now < cdU.current) {
      say(`u cooling down — ${((cdU.current - now) / 1000).toFixed(1)}s`);
      return;
    }
    freezeUntil.current = now + 2000;
    cdU.current = now + 12000;
    say("u — timeline rolled back (bugs frozen 2s)");
    playSfx("ok");
  }, [say]);

  const pressD = useCallback(() => {
    if (phase.current !== "RUN") return;
    const now = performance.now();
    if (pendingD.current && now - lastD.current < 450) {
      pendingD.current = false;
      delLine();
    } else {
      pendingD.current = true;
      lastD.current = now;
      say("d- ...");
      playSfx("click");
    }
  }, [delLine, say]);

  /* ---------- input ---------- */
  useEffect(() => {
    const editable = (el: EventTarget | null) => {
      const e = el as HTMLElement | null;
      return !!e && (e.tagName === "INPUT" || e.tagName === "TEXTAREA" || !!e.isContentEditable);
    };
    const onKey = (e: KeyboardEvent) => {
      if (editable(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === "h" || k === "arrowleft") {
        e.preventDefault();
        move(-1, 0);
      } else if (k === "l" || k === "arrowright") {
        e.preventDefault();
        move(1, 0);
      } else if (k === "k" || k === "arrowup") {
        e.preventDefault();
        move(0, -1);
      } else if (k === "j" || k === "arrowdown") {
        e.preventDefault();
        move(0, 1);
      } else if (k === "x") {
        e.preventDefault();
        delChar();
      } else if (k === "d") {
        e.preventDefault();
        pressD();
      } else if (k === "u") {
        e.preventDefault();
        undoTime();
      } else if (k === " ") {
        e.preventDefault();
        pause();
      } else if (k === "r") {
        reset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, delChar, pressD, undoTime, pause, reset]);

  /* hi score on mount */
  useEffect(() => {
    const t = window.setTimeout(() => setHud((h) => ({ ...h, hi: readHi("nr-hi-vimquest") })), 0);
    return () => window.clearTimeout(t);
  }, []);

  /* ---------- loop ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = 0;

    const fit = () => {
      const w = wrap.clientWidth;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(w * dpr);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);

    const spawnBug = () => {
      const p = player.current;
      for (let tries = 0; tries < 24; tries++) {
        const edge = Math.floor(Math.random() * 4);
        let x = 0;
        let y = 0;
        if (edge === 0) {
          x = Math.floor(Math.random() * COLS);
          y = 0;
        } else if (edge === 1) {
          x = Math.floor(Math.random() * COLS);
          y = ROWS - 1;
        } else if (edge === 2) {
          x = 0;
          y = Math.floor(Math.random() * ROWS);
        } else {
          x = COLS - 1;
          y = Math.floor(Math.random() * ROWS);
        }
        const dist = Math.abs(x - p.x) + Math.abs(y - p.y);
        if (dist < 7) continue;
        const r = Math.random();
        const glyph: Bug["glyph"] = r < 0.5 ? "%" : r < 0.85 ? "&" : "#";
        const pts = glyph === "%" ? 15 : glyph === "&" ? 25 : 40;
        bugs.current.push({ x, y, glyph, pts });
        return;
      }
    };

    const stepBug = () => {
      const p = player.current;
      for (const b of bugs.current) {
        const dx = p.x - b.x;
        const dy = p.y - b.y;
        if (Math.abs(dx) >= Math.abs(dy)) b.x += Math.sign(dx);
        else b.y += Math.sign(dy);
      }
      /* collision with player */
      const hit = bugs.current.findIndex((b) => b.x === p.x && b.y === p.y);
      if (hit >= 0) die();
    };

    const step = (dt: number) => {
      const now = performance.now();
      elapsed.current += dt;
      scoreAcc.current += dt;
      if (scoreAcc.current >= 1000) {
        score.current += Math.floor(scoreAcc.current / 1000);
        scoreAcc.current %= 1000;
      }

      const frozen = now < freezeUntil.current;
      if (!frozen) {
        spawnAcc.current += dt;
        const spawnInt = Math.max(SPAWN_FLOOR, SPAWN_START - (elapsed.current / 1000) * SPAWN_SHRINK);
        while (spawnAcc.current >= spawnInt) {
          spawnAcc.current -= spawnInt;
          spawnBug();
        }

        bugAcc.current += dt;
        const bugInt = Math.max(BUG_STEP_FLOOR, BUG_STEP_START - (elapsed.current / 1000) * BUG_STEP_SHRINK);
        while (bugAcc.current >= bugInt) {
          bugAcc.current -= bugInt;
          stepBug();
          if (phase.current !== "RUN") return;
        }
      }
    };

    const draw = (now: number) => {
      const w = canvas.width;
      const acidCol = acid.current;
      const cell = w / COLS;
      const gridH = cell * ROWS;
      const oy = (w - gridH) / 2 - cell * 0.6; // leave room for the readout

      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, w, w);

      /* grid */
      ctx.strokeStyle = "rgba(242,240,234,0.06)";
      ctx.lineWidth = 1;
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * cell, oy);
        ctx.lineTo(c * cell, oy + gridH);
        ctx.stroke();
      }
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, oy + r * cell);
        ctx.lineTo(w, oy + r * cell);
        ctx.stroke();
      }

      /* line numbers — because it's vim */
      ctx.fillStyle = "rgba(242,240,234,0.18)";
      ctx.font = `${Math.floor(cell * 0.34)}px monospace`;
      ctx.textAlign = "left";
      for (let r = 0; r < ROWS; r += 2) {
        ctx.fillText(String(r + 1).padStart(2, "0"), w * 0.004, oy + r * cell + cell * 0.82);
      }

      /* bugs */
      const frozen = now < freezeUntil.current;
      ctx.font = `${Math.floor(cell * 0.62)}px monospace`;
      ctx.textAlign = "center";
      for (const b of bugs.current) {
        if (frozen && Math.floor(now / 200) % 2 === 0) {
          ctx.fillStyle = "rgba(242,240,234,0.35)";
        } else {
          ctx.fillStyle = b.glyph === "#" ? "rgba(242,240,234,0.95)" : "rgba(242,240,234,0.65)";
        }
        ctx.fillText(b.glyph, b.x * cell + cell / 2, oy + b.y * cell + cell * 0.78);
      }

      /* player cursor */
      const p = player.current;
      ctx.fillStyle = acidCol;
      ctx.fillRect(p.x * cell + cell * 0.12, oy + p.y * cell + cell * 0.08, cell * 0.76, cell * 0.8);
      ctx.fillStyle = "#0a0a0a";
      ctx.font = `${Math.floor(cell * 0.56)}px monospace`;
      ctx.fillText("@", p.x * cell + cell / 2, oy + p.y * cell + cell * 0.76);

      /* readout — the command line */
      const fresh = now - readoutAt.current < 2600;
      ctx.fillStyle = fresh ? acidCol : "rgba(242,240,234,0.35)";
      ctx.font = `${Math.floor(w * 0.016)}px monospace`;
      ctx.textAlign = "left";
      const prefix = fresh ? "" : readout.current;
      ctx.fillText(`${prefix}`, w * 0.02, oy + gridH + cell * 1.15);

      /* cooldowns */
      const cd = (until: number) => (now < until ? `${((until - now) / 1000).toFixed(1)}s` : "RDY");
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(242,240,234,0.45)";
      ctx.fillText(`x:${cd(cdX.current)}  dd:${cd(cdDD.current)}  u:${cd(cdU.current)}`, w * 0.98, oy + gridH + cell * 1.15);
    };

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (!last) last = t;
      const dt = Math.min(48, t - last);
      last = t;

      if (phase.current === "RUN") step(dt);

      setHud((h) => {
        const time = Math.floor(elapsed.current / 1000);
        const bugCount = bugs.current.length;
        if (h.score === score.current && h.phase === phase.current && h.time === time && h.bugCount === bugCount)
          return h;
        return { ...h, score: score.current, phase: phase.current, time, bugCount };
      });
      draw(t);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [die]);

  /* ---------- touch controls ---------- */
  const touchBtn =
    "border border-line px-3 py-2 font-mono text-[11px] tracking-[0.2em] text-paper transition-colors active:bg-acid active:text-ink";

  return (
    <div className="mx-auto w-full max-w-[560px]">
      {/* HUD */}
      <div className="flex items-center justify-between border border-line bg-ink px-3 py-2 font-mono text-[10px] tracking-[0.25em]">
        <span className="text-dim">
          DELS <span className="text-acid tabular-nums">{hud.score}</span>
        </span>
        <span className="text-dim">
          UPTIME <span className="text-paper tabular-nums">{hud.time}s</span>
        </span>
        <span className="text-dim">
          BUGS <span className="text-paper tabular-nums">{hud.bugCount}</span>
        </span>
        <span className="text-dim">
          HI <span className="text-paper tabular-nums">{hud.hi}</span>
        </span>
      </div>

      <div className="flex items-center justify-between border border-t-0 border-line bg-ink px-3 py-1.5 font-mono text-[9px] tracking-[0.25em]">
        <span className="text-acid">{hud.phase === "RUN" ? "NORMAL MODE" : "\u00a0"}</span>
        <span className={hud.phase === "RUN" ? "text-acid" : hud.phase === "DEAD" ? "text-paper" : "text-dim"}>
          {hud.phase === "RUN" ? "STATUS: EDITING" : hud.phase === "PAUSE" ? "STATUS: HELD" : hud.phase === "DEAD" ? "STATUS: CRASHED" : "STATUS: BOOT"}
        </span>
      </div>

      {/* screen */}
      <div ref={wrapRef} className="relative mt-2 aspect-square w-full border border-line">
        <canvas ref={canvasRef} className="scanlines block h-full w-full touch-none" aria-label="Vim Quest game screen" />
        {hud.phase === "READY" && (
          <Overlay onClick={reset}>
            <p className="font-display text-4xl tracking-wide text-paper md:text-5xl">VIM.QUEST</p>
            <p className="mt-3 max-w-[38ch] font-mono text-[10px] leading-relaxed tracking-[0.2em] text-dim">
              THE BUFFER IS OVERRUN. h j k l MOVE — x DELETES ADJACENT
              BUGS — dd PURGES YOUR ROW — u ROLLS THE TIMELINE BACK.
              SURVIVE THE EDIT SESSION.
            </p>
            <button
              type="button"
              data-cursor="RUN"
              className="mt-6 border border-acid px-4 py-2 font-mono text-[11px] tracking-[0.3em] text-acid transition-colors hover:bg-acid hover:text-ink"
            >
              [ EXECUTE ]
            </button>
          </Overlay>
        )}
        {hud.phase === "PAUSE" && (
          <Overlay>
            <p className="font-mono text-sm tracking-[0.4em] text-acid">SIGSTOP</p>
            <p className="mt-3 font-mono text-[10px] tracking-[0.3em] text-dim">SPACE TO RESUME</p>
          </Overlay>
        )}
        {hud.phase === "DEAD" && (
          <Overlay onClick={reset}>
            <p className="font-display text-4xl tracking-wide text-paper md:text-5xl">SEGFAULT</p>
            <p className="mt-2 font-mono text-[10px] leading-relaxed tracking-[0.2em] text-dim">
              a bug reached the cursor.
              <br />
              vim exited. nobody knows how.
            </p>
            <p className="mt-3 font-mono text-[11px] tracking-[0.25em] text-dim">
              DELS <span className="text-acid">{hud.score}</span> — SURVIVED{" "}
              <span className="text-paper">{hud.time}s</span>
            </p>
            <p className="mt-1 font-mono text-[11px] tracking-[0.25em] text-dim">
              HI <span className="text-paper">{hud.hi}</span>
              {hud.record && <span className="ml-2 text-acid">NEW RECORD</span>}
            </p>
            <button
              type="button"
              data-cursor="RETRY"
              className="mt-6 border border-acid px-4 py-2 font-mono text-[11px] tracking-[0.3em] text-acid transition-colors hover:bg-acid hover:text-ink"
            >
              [ REOPEN BUFFER ]
            </button>
          </Overlay>
        )}
      </div>

      {/* touch controls */}
      {isTouch && (
        <div className="mt-3 flex items-center justify-between">
          <div className="grid grid-cols-3 gap-1">
            <span />
            <button type="button" aria-label="up" className={touchBtn} onClick={() => move(0, -1)}>
              K ↑
            </button>
            <span />
            <button type="button" aria-label="left" className={touchBtn} onClick={() => move(-1, 0)}>
              H ←
            </button>
            <button type="button" aria-label="down" className={touchBtn} onClick={() => move(0, 1)}>
              J ↓
            </button>
            <button type="button" aria-label="right" className={touchBtn} onClick={() => move(1, 0)}>
              L →
            </button>
          </div>
          <div className="flex gap-1">
            <button type="button" className={touchBtn} onClick={delChar}>
              X
            </button>
            <button type="button" className={touchBtn} onClick={pressD}>
              DD
            </button>
            <button type="button" className={touchBtn} onClick={undoTime}>
              U
            </button>
          </div>
        </div>
      )}
      <p className="mt-2 font-mono text-[9px] tracking-[0.3em] text-dim/60">
        H J K L MOVE — X DELETE CHAR — DD DELETE ROW — U UNDO — SPACE PAUSE
      </p>
    </div>
  );
}

function Overlay({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-ink/85 p-4 text-center"
    >
      {children}
    </div>
  );
}
