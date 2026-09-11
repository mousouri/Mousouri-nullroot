# MOUSOURI — Brutalist Portfolio (Next.js)

Awwwards-tier experimental/brutalist **multi-page** portfolio.
Persona: computer engineering student / security researcher ("MOUSOURI").

## Pages (real App Router routes)

| Route | Page |
|-------|------|
| `/` | Home — hero, whoami, capabilities scan + OPEN THE STACK deep-dive CTA, work rail, notes, arcade teaser, contact |
| `/stack` | THE STACK — deep arsenal: per-domain tool level bars + receipts, CERT.WALL, IDEA.BULB brainstorming widget, currently-compiling queue |
| `/now` | NOW — the live page: what's building/compiling/reading, plus real machine readouts (local time, session uptime, your top arcade bank) |
| `/timeline` | THE LOG — 2019 → now as a commit-history rail with scroll reveals |
| `/ama` | ASK.BOX — deterministic oracle: question is hashed client-side, answer indexes a pool of opinions, log stays in your browser |
| `/resume` | RÉSUMÉ — one-pager with `DOWNLOAD.PDF` (prebuilt asset) and `PRINT` (dedicated print stylesheet) |
| `/work` | Full work index with photo covers |
| `/work/{id}` | Case file (paper palette): problem / build / outcome, stack manifest, exhibit gallery |
| `/notes` | Full notes archive |
| `/notes/{id}` | Note reader: sections + code blocks |
| `/arcade` | Arcade hub — CRT hero + 14 cabinets + trophy cabinet |
| `/arcade/{snake\|breach\|typeraid\|packetrun\|tracebreak\|portknock\|phishhunt\|stacksmash\|cryptbreak\|kernelstorm\|klack\|vimquest\|botnetgrow\|hopexe}` | Deep-link straight into a game |
| `/guestbook` | Signature wall — localStorage entries stamped with your colorway |
| `/vault` | Hidden room — opens only when you solve the site CTF |
| `/sitemap.xml`, `/robots.txt`, `/notes/rss.xml` | SEO plumbing, generated at build |
| anything else | Brutalist 404 — "KERNEL PANIC — ROUTE NOT MOUNTED" (it keeps a secret) |

Every screen is a true Next.js App Router destination with its own URL, SSR/SSG
pass and metadata (`generateStaticParams` prerenders all detail pages; unknown
ids return the 404). Client-side navigations play a site-wide ink panel wipe
(acid hairline + route label) — the router pushes underneath while the screen
is covered, and the panel's exit reveals the new page. Legacy `#/work/…` style
hash URLs are forwarded to their real routes once on load.

## Shared chrome (survives every route change)

Persistent in the root layout (`SiteChrome`): environment detection, Lenis
smooth scroll, custom cursor, grid/noise overlays, global nav, and the boot
preloader (plays once per hard load — never on client navigations).

## Games (`~/arcade`)

- **SNAKE.EXE** — canvas snake, speed ramps, walls kill, keyboard + touch d-pad, localStorage hi-score.
- **BREACH.EXE** — ICE-cracking puzzle: pick bytes row/col alternating, fill the buffer, match the daemons before the clock dies. Three difficulties; boards are generated solvable (daemons are subsequences of a real solution path).
- **TTY.RACER** — typing drill over real command lines; per-keystroke accuracy, WPM, grade ladder (SCRIPT KIDDIE → ROOT).
- **PKT.RUN** — you are the packet: firewalls descend, steer through the gaps, eat stray bits (+25), don't get dropped. Speed and gap width scale with survival; keyboard, drag steering and a hold-to-steer touch pad; theme-reactive canvas colors.
- **TRACE.BREAK** — breakout where the bricks are firewall rules: DENY slabs take two hits and crack visibly before falling. Downed rules drop chips — MLT (packet flood / multiball, cap 6), MTU (wide socket, 12s), RATE (packet throttle, 8s). Steer with mouse hover, arrows or touch drag; paddle-bounce angle follows hit offset and speed ramps toward a per-wave cap. Clear the wall → firewall rebuilds meaner (WAVE+1, +100, more DENY, holes punched). 3 sockets, `nr-hi-tracebreak`.
- **PORT.KNOCK** — whack-a-mole on a 4×4 server rack: ports flip OPEN (click before they close), honeypot TRAPs burn a shell and −25, clean knocks build a combo bonus, rare ROOT ports pay +50 and +2s. 45 seconds, 3 shells, combo ticks on the rack edge, `nr-hi-portknock`.
- **PHISH.HUNT** — legit-or-phish drill over 12 realistic inboxes, 5s per message: lookalike domains, CEO fraud, double extensions, real billing mail. Every verdict teaches the tell. 3 TRUST, combo multiplier, `nr-hi-phishhunt`.
- **STACK.SMASH** — buffer overflow as a stacking game: write each payload row as it slides past the stack. Keep alignment or the width narrows; perfect overwrites (+25) reclaim it. Miss the frame entirely → SEGMENTATION FAULT, core dumped. Camera scrolls as the payload grows; rows sway under load, `nr-hi-stacksmash`.
- **CRYPT.BREAK** — mastermind with a hex key (4 of `4 7 A C E F`, no repeats, 8 tries). FULL/PARTIAL pegs after each guess; the 4th symbol auto-commits; every unused try pays +250. Type on the keyboard or tap the palette, `nr-hi-cryptbreak`.
- **KERNEL.STORM** — missile command for the syscall layer: packets rain toward your 3 cores; click to intercept — every kill detonates in a square blast and CHAINS (chain ×N bonus). Splitting packets from wave 3, finite tubes per wave, unused tubes pay out. All cores flatlined → KERNEL PANIC, `nr-hi-kernelstorm`.
- **KLACK** — 4-lane rhythm at 112 BPM: generated 3-section chart (warm-up / offbeat / chaos), synthesized kick/hat/snare scheduled on the same clock as the notes, PERFECT/GOOD/OK windows, combo multiplier up to ×3, end-of-track grade S/A/B/C. Keys D F J K or tap the lanes, `nr-hi-klack`.
- **VIM.QUEST** — survival by modal editing: bugs (`% & #`) crawl toward your cursor on a numbered grid. h j k l move, `x` deletes an adjacent bug, `dd` purges your whole row (5s cooldown), `u` freezes time (12s cooldown). One cursor, no insert mode, `nr-hi-vimquest`.
- **BOTNET.GROW** — agar on a subnet: absorb idle hosts toward 100% saturation, dodge AV scanners (each contact scrubs 20% of your mass, drop under 1% → QUARANTINED). Bigger = slower. Camera follows, world scrolls, `nr-hi-botnetgrow`.
- **HOP.EXE** — frogger on a motherboard: cross 10 data-bus lanes of packets and long DMA trains, reach the DIMM slot before the 20s clock dies. +250 per crossing, waves get faster, 3 hoppers; swipe/tap on touch, `nr-hi-hopexe`.

## Shell, themes, sound, status bar

- **⌘K command palette** (`src/components/chrome/CommandShell.tsx`) — fuzzy filter over
  routes, games and shell commands; ↑↓/↵; free-form lines with arguments run as raw
  shell input (`theme matrix`, `sudo rm -rf /`).
- **Hidden terminal** (`src/components/chrome/Terminal.tsx`) — press `` ` `` / `~`
  anywhere (outside form fields) and a root shell drops in: `help`, `whoami`, `ls`,
  `cat manifesto.txt`, `goto <target>`, `theme <name>`, `sound on|off`, `nmap`, `ping`,
  `socials`, `matrix`, `uptime`, `ask <question>` (the oracle), `music` (lo-fi radio), plus
  easter eggs (`sudo rm -rf /` fakes a wipe and reboots the page, `vim`, `coffee`, `hack`,
  `screensaver`). Command history on ↑↓. The palette and terminal share one command engine
  (`src/lib/shell.ts`) and are mutually exclusive.
- **Colorway themes** (`src/lib/theme.ts`) — `ACD` chip in the nav cycles
  acid lime `#D7FF3F` → matrix green `#00FF66` → amber CRT `#FFB000`. A theme is one
  CSS variable swap on `<html data-theme>`, so the entire site (including game
  canvases) recolors live. Persisted in `localStorage("nr-theme")` and applied
  pre-paint by an inline script (no flash).
- **Sound FX** (`src/lib/sound.ts`) — every sound is synthesized with WebAudio at
  runtime (zero audio files): hover blips, mechanical clicks, key clacks, a wipe
  whoosh on route changes, CRT boot hum. `SND:ON/OFF` toggle in the nav persists to
  `localStorage("nr-mute")`; browsers only allow audio after the first interaction.
- **Status bar** (`src/components/chrome/StatusBar.tsx`) — tmux-style bottom statusline:
  working route, scrolling fake packet feed, **LO-FI.WAV radio toggle with animated EQ bars**,
  session uptime, next-CTF countdown, and touch-friendly `[ >_ ]` / `[ ⌘K ]` triggers.

## Achievements, guestbook, stack page, CTF, SEO

- **Trophy engine** (`src/lib/achievements.ts`) — 20 trophies tracked entirely in
  `localStorage`: hi-score milestones (FIRST BLOOD, GRAND SLAM, HIGH ROLLER), shell
  usage (SHELL SHOCKED), page tourism (CARTOGRAPHER, DEEP DIVE), colorway variety
  (CHAMELEON), mute (SILENT RUNNING), night sessions (NIGHT SHIFT), guestbook
  (GUEST OF HONOR), the hidden flag (CRYPTANALYST — secret), returning on 3 days
  (REGULAR) — plus the pass-4 set: IDEA GUY (strike the bulb ×10), ASK ME ANYTHING
  (first oracle question), AUDIOFILE (60s of LO-FI.WAV), CAFFEINATED (`coffee`),
  and the secret DREAM ON (let the screensaver fire), GOD MODE (konami code) and
  REBEL (`sudo` deletion attempts ×3). Unlock toasts slide in bottom-right; the
  terminal command `achievements` prints the case; the arcade page mounts the
  trophy cabinet.
- **Guestbook** (`/guestbook` + `src/lib/guestbook.ts`) — a signature wall with no
  backend: sign via the form or the terminal (`sign <name> <message>`), entries are
  sanitized, capped at 64 and stamped with the colorway you were wearing. Re-signing
  the same alias overwrites your old line.
- **Stack page** (`/stack` + `src/components/pages/StackScreen.tsx`) — the deep
  arsenal behind home's OPEN THE STACK button: per-domain tool readouts with
  proficiency bars and receipt lines, a CURRENTLY COMPILING learning queue, and
  IDEA.BULB — strike the filament (SVG bulb, theme-reactive glow, synthesized
  flicker/click sounds) to pull a random cross-domain project spark from a
  24-idea pool. Strike counter persists in `localStorage("nr-bulb-sparks")`.
  Terminal: `goto stack`. Nav: `02 STACK`.
- **Site CTF** — three fragments are hidden in plain sight: one in the filesystem
  (`ls -a` → `cat .flag`, base64), one on the 404 page (hex), one leaked by the
  `hack` command (base64). Decode, concatenate, `flag <answer>` → unlocks the VOID
  colorway (signal red, `theme void`), the CRYPTANALYST trophy, and `goto vault`.
  The vault page stays `noindex` and renders SEALED for anyone who hasn't earned it.
- **SEO pack** — `src/app/sitemap.ts` (every public route), `src/app/robots.ts`
  (vault + api disallowed), `/notes/rss.xml` (RSS 2.0 from the notes archive),
  OG/Twitter metadata + JSON-LD Person schema in `src/app/layout.tsx`, and a
  pre-rendered 1200×630 share card at `public/og.png`.

## Pass 4 — the live layer

- **LO-FI.WAV** (`src/lib/lofi.ts`) — a procedural lo-fi radio living in the status bar.
  Zero streams, zero audio files: a 72 BPM loop (Am7 → Fmaj7 → Cmaj7 → G6) rendered by the
  WebAudio graph — detuned triangle pads through a slow lowpass, sine bass, swung hats,
  soft kick/snare and constant vinyl crackle. Toggle from the status bar or `music`.
  Respects the global mute; listen time accrues to the AUDIOFILE trophy; the preference
  (`nr-lofi`) persists but never autoplays.
- **SYS.TELEMETRY** (`src/components/sections/Telemetry.tsx`) — a home-page section that
  watches your session live: uptime, input events, deepest scroll reach, measured FPS, a
  region guess derived from your timezone (no APIs — the clock leaks it anyway) and a 24h
  pulse strip of when you're most active. Nothing stored, nothing sent.
- **ROOT.SAVER** (`src/lib/screensaver.ts` + `src/components/chrome/Screensaver.tsx`) —
  idle 90 seconds and the machine starts dreaming: a phosphor starfield under a huge dim
  clock. Any input dismisses it (600ms arm-grace so triggering it never instantly kills
  it). Auto-idle is disabled for reduced-motion users; `screensaver` in the terminal
  triggers it on demand. First dream = DREAM ON trophy.
- **Konami code** — ↑↑↓↓←→←→BA anywhere: 10 seconds of GOD MODE (hue-spin + jitter +
  badge), one-time GOD MODE trophy.
- **ASK.BOX** (`/ama` + `src/components/pages/AmaScreen.tsx`) — the deterministic oracle.
  The question is hashed in your browser (`hash(q) % answers`), the hash indexes a pool of
  hard-earned opinions, and the log (`nr-ama-log`, cap 32) never leaves localStorage.
  Also available in the terminal: `ask <question>`.
- **RÉSUMÉ** (`/resume` + `public/resume/mousouri-resume.pdf`) — the one-pager is derived
  from the site's own data files and shipped two ways: a prebuilt ATS-safe PDF asset
  (single page, fonts embedded) and a print stylesheet that turns the page itself into a
  clean paper copy. Regenerate the PDF with `python3 scripts/make_resume_pdf.py`.
- **PWA offline** — `public/manifest.webmanifest` + `public/sw.js` (network-first for
  navigations, cache-first for immutable build assets) + generated icon set
  (`public/icons/`, `python3 scripts/make_pwa_icons.py`). Registered in `SiteChrome`;
  the site survives a dead network.
- **Cabinet cover art** — every arcade cabinet now wears AI-generated marquee art
  (`public/covers/*.jpg`, regenerate with `bun scripts/gen_covers.mjs <start> <count>`),
  layered under the site scanlines; cards fail soft if an image is missing.
- **CERT.WALL** — six certification ledger cards (issuer, year, HELD / IN PROGRESS) on
  the stack page, styled like stamped receipts.

## Stack

- Next.js (App Router) + TypeScript strict
- Tailwind CSS 4 — design tokens in `src/app/globals.css` `@theme`
- Framer Motion (components, shared-layout morphs, wipe overlay)
- GSAP + ScrollTrigger (pinning / scrubbing only)
- Lenis (smooth scroll, synced to GSAP ticker)
- React Three Fiber + drei (lazy 3D terrain in the ascent case file)
- Fonts via `next/font`: Anton (display), Space Grotesk (body), JetBrains Mono (system text)
- Imagery: `public/images/*.jpg` — AI-generated monochrome+acid covers, layered with the
  zero-payload generative CSS/SVG art system (`ProjectVisual` + `ProjectImage`)

## Run it

Requires Node.js 18.17+ (Bun also works).

```bash
npm install          # or: bun install

# database (only needed for the /api demo route; the UI runs without it)
cp .env.example .env
npx prisma generate
npm run db:push      # creates db/custom.db

npm run dev          # http://localhost:3000
```

Production: `npm run build` then `npm start` (serves the standalone build; Node, no Bun required).

## Deploy (Vercel)

Push to a Git repo and import — no special config. `output: "standalone"` is already set.
Remove/ignore `DATABASE_URL` if you don't need the demo API route.

## Customization map

| What | File |
|------|------|
| All content: projects, note bodies, capabilities, games metadata, socials | `src/lib/data.ts` (voice-written placeholders, clearly marked) |
| Route model + programmatic navigation (wipe-aware `navigate()`) | `src/lib/router.tsx` |
| Shell command engine (palette + terminal) | `src/lib/shell.ts` |
| Trophy engine (20 achievements + toasts) | `src/lib/achievements.ts` |
| Procedural lo-fi radio (WebAudio, no files) | `src/lib/lofi.ts` |
| Screensaver store (idle + arm-grace) | `src/lib/screensaver.ts` |
| AMA answers, certs, timeline, now content | `src/lib/data.ts` |
| Guestbook store (localStorage wall) | `src/lib/guestbook.ts` |
| Theme store (acid / matrix / amber + earned void) | `src/lib/theme.ts` |
| Sound engine + mute store (WebAudio synth) | `src/lib/sound.ts` |
| Route transition overlay (cover → push → exit reveal) | `src/lib/transition.tsx` |
| Boot-once store (preloader gating) | `src/lib/boot.ts` |
| Game logic (breach generator, typing corpus, hi-score helpers) | `src/lib/games.ts` |
| Motion tokens: easings, durations, uneven stagger, shared variants | `src/lib/motion.ts` |
| Design tokens: ink/paper/acid palette, hairlines, scanlines/grain, CRT power-on | `src/app/globals.css` |
| Shared page shell (breadcrumb bar, BACK/ESC, paper palette) | `src/components/pages/PageShell.tsx` |
| Route files + metadata + 404 | `src/app/` (`work/`, `notes/`, `arcade/`, `not-found.tsx`) |
| Screens bound to routes (data + shell wiring) | `src/components/pages/*Screen.tsx` |
| Games | `src/components/arcade/` |
| Home sections | `src/components/sections/` |
| Persistent chrome: preloader, cursor, grid, noise, nav, status bar, palette, terminal, sound bootstrap, screensaver | `src/components/chrome/` |
| Home telemetry section (SYS.TELEMETRY) | `src/components/sections/Telemetry.tsx` |
| PWA: manifest + service worker + icons | `public/manifest.webmanifest`, `public/sw.js`, `public/icons/` |
| Asset generators: résumé PDF, PWA icons, game covers | `scripts/make_resume_pdf.py`, `scripts/make_pwa_icons.py`, `scripts/gen_covers.mjs` |
| Card/visual system: ProjectCard, ProjectImage (photo+art layering), ProjectVisual (CSS/SVG art) | `src/components/work/` |

## Behavior notes

- Mobile/touch: custom cursor + magnetic hover off; pins degrade to in-view reveals; games get a d-pad (snake) and tap targets.
- `prefers-reduced-motion`: crossfades replace wipes/scramble/pins; navigation becomes an instant push; games remain fully playable (user-initiated motion).
- Browser back/forward behave natively (real history entries); scroll restores on back.
- Hi-scores live in `localStorage` (`nr-hi-*` keys) — no accounts, no tracking.
- Theme (`nr-theme`), sound (`nr-mute`), trophies (`nr-ach`), guestbook
  (`nr-guestbook`), CTF progress (`nr-flag`), lo-fi preference (`nr-lofi`), listen
  time (`nr-listen-ms`), bulb sparks (`nr-bulb-sparks`) and the AMA log (`nr-ama-log`)
  persist locally. Nothing leaves the browser.
- The service worker caches the shell after first load — a second visit works offline.
- There is a secret. `ls -a` is the first knock. The oldest input there is also a key.
- Known environment-only quirks during headless testing (fine on real hardware): CSS group-hover flips, clipboard permissions, `pointer: coarse` emulation.
