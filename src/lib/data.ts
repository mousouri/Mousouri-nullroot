/* ============================================================
   MOUSOURI — content model. All copy is intentional placeholder
   written in the site voice; swap per-project without touching
   components.
   ============================================================ */

export type VisualKind = "pothole" | "ascent" | "duka" | "cve" | "ea";

export interface Project {
  id: string;
  index: string; // display ordinal, e.g. "001"
  title: string;
  kind: string; // short classifier shown in meta rows
  year: string;
  role: string;
  status: string;
  statusLabel: string; // accent badge text
  metric: string; // hero outcome stat
  tags: string[];
  stack: string[];
  problem: string;
  build: string;
  outcome: string;
  visual: VisualKind;
  image?: string; // photographic cover (generated, monochrome + acid)
  imageAlt?: string;
  has3D?: boolean;
}

export const PROJECTS: Project[] = [
  {
    id: "pothole-vision",
    index: "001",
    title: "POTHOLE_VISION",
    kind: "FINAL YEAR PROJECT",
    year: "2025",
    role: "SOLO ENGINEER",
    status: "DEFENDED",
    statusLabel: "DEFENDED — 91% mAP",
    metric: "91.3% mAP@0.5",
    tags: ["COMPUTER VISION", "EMBEDDED", "MQTT"],
    stack: ["YOLOV8", "OPENCV", "RASPBERRY PI 4", "MQTT", "NEXT.JS", "SQLITE"],
    problem:
      "Municipal road crews triage repairs from complaint hotlines and handwritten logs, which means a pothole can outlive a president before anyone maps it. The brief was blunt: detect, geotag and report road surface failures automatically, using hardware cheap enough to bolt onto anything with wheels. Depth estimation mattered — a crack is cosmetic, a 20cm crater eats suspension.",
    build:
      "A Raspberry Pi 4 with a wide-angle camera runs a YOLOv8n detector fine-tuned on 4,200 locally-labelled frames of Dar roads — labelled by me, on a bus, with a broken trackpad. Detections are paired with GPS + IMU depth heuristics, pushed over MQTT, and land in a Next.js dashboard that plots severity heat-maps per ward. The whole pipeline runs offline-first because field connectivity is a rumor.",
    visual: "pothole",
    image: "/images/proj-pothole.jpg",
    imageAlt: "Cracked asphalt with potholes, overlaid with acid-green detection boxes",
    outcome:
      "91.3% mAP@0.5 on a held-out set, detection-to-report latency under 30 seconds, and a final review where the external examiner asked whether it was for sale. The rig survived 400km of actual roads; only one SD card was harmed in the making of this dataset.",
  },
  {
    id: "ascent-exe",
    index: "002",
    title: "ASCENT.EXE",
    kind: "WEBGL EXPERIENCE",
    year: "2024",
    role: "DESIGN + BUILD",
    status: "LIVE",
    statusLabel: "LIVE — 60FPS",
    metric: "60fps mobile",
    tags: ["WEBGL", "3D", "CREATIVE CODE"],
    stack: ["REACT THREE FIBER", "THREE.JS", "GLSL", "DREI"],
    problem:
      "Flat portfolio pages were starting to feel like résumés in Comic Sans — technically fine, spiritually dead. I wanted one moment of real 3D that earns the scroll instead of decorating it: an ascent-themed scene where the camera physically climbs, because 'career trajectory' deserved better than an arrow icon.",
    build:
      "React Three Fiber driving a wireframe terrain displaced by layered GLSL noise, with scroll velocity fed straight into the camera rig so climbing feels earned, not scripted. A single acid monolith anchors the composition — everything else is hairline geometry and fog. Shaders stay dumb-cheap: one displacement pass, no post-processing chain.",
    visual: "ascent",
    image: "/images/proj-ascent.jpg",
    imageAlt: "Wireframe terrain of acid-green grid lines climbing into black fog with a monolith",
    outcome:
      "Holds 60fps on mid-range mobile with a capped DPR, became the case-study hero you can open right now, and taught me that the fastest triangle is the one you never draw.",
    has3D: true,
  },
  {
    id: "duka-schema",
    index: "003",
    title: "DUKA_SCHEMA",
    kind: "CLIENT E-COMMERCE",
    year: "2024",
    role: "FULL-STACK DEV",
    status: "SHIPPING",
    statusLabel: "SHIPPING — 300+ SKUs",
    metric: "orders in minutes",
    tags: ["NEXT.JS", "FINTECH", "CLIENT WORK"],
    stack: ["NEXT.JS", "TYPESCRIPT", "PRISMA", "M-PESA API", "TAILWIND"],
    visual: "duka",
    image: "/images/proj-duka.jpg",
    imageAlt: "Night flash photo of a Kariakoo electronics shop, shelves lit like a control panel",
    problem:
      "A family-run electronics duka in Kariakoo was running an entire business through WhatsApp threads and a carbon-copy receipt book. Stock lived in one notebook — the one that never leaves the counter, except when it does. Orders took hours to reconcile and Wednesdays were, quote, 'a forgetting festival'.",
    build:
      "Next.js + TypeScript storefront with a Prisma inventory model of 300+ SKUs, migrated from the notebook over one long weekend. Payments ride M-Pesa STK push from sandbox to live, and the admin panel was designed phone-first because the owner's office is a countertop. Low-bandwidth mode included — the site renders fine on 3G and bad decisions.",
    outcome:
      "Order turnaround dropped from hours to minutes, stock errors basically vanished, and the notebook is now a historical artifact. The owner sends me glitches at 1am, which is the purest form of client satisfaction.",
  },
  {
    id: "cve-idor",
    index: "004",
    title: "CVE-2025-[REDACTED]",
    kind: "SECURITY RESEARCH",
    year: "2025",
    role: "INDEPENDENT RESEARCHER",
    status: "DISCLOSED",
    statusLabel: "DISCLOSED & PAID",
    metric: "P2 in 9 hours",
    tags: ["BUG BOUNTY", "IDOR", "DISCLOSURE"],
    stack: ["BURP SUITE", "PYTHON", "OWASP AMASS", "PATIENCE"],
    visual: "cve",
    image: "/images/proj-cve.jpg",
    imageAlt: "CRT terminal close-up, phosphor-green request headers burning out of the dark",
    problem:
      "Recon on a public bug-bounty program surfaced a billing endpoint with a suspicious pattern: sequential tenant IDs and responses that never asked who was asking. The hypothesis was boring, the blast radius wasn't — object-level authorization is where apps go to confess their secrets.",
    build:
      "A methodical fifteen minutes: swap the tenant ID, confirm cross-tenant read, chain it through a permissive invite flow to role escalation, then full account takeover. Wrote the report like a math proof — repro steps, impact model, curl one-liners the triager could run before coffee. No data exfiltrated beyond my own test accounts, because being right and being arrested are different achievements.",
    outcome:
      "Triaged P2 within nine hours, patched in six days, bounty paid, and a writeup published post-fix with the program's blessing. The kind of disclosure cycle that restores a little faith in the industry.",
  },
  {
    id: "ea-scalper",
    index: "005",
    title: "EA_SCALPER_V2",
    kind: "ALGO TRADING",
    year: "2024 — NOW",
    role: "QUANT DEV",
    status: "FORWARD-TEST",
    statusLabel: "FORWARD-TEST — DD 4.1%",
    metric: "+14.8% / 9mo",
    tags: ["MQL5", "QUANT", "RISK MODELS"],
    stack: ["MQL5", "PYTHON", "VECTORBT", "METATRADER 5"],
    visual: "ea",
    image: "/images/proj-ea.jpg",
    imageAlt: "Brutalist candlestick chart, acid-green bodies on black",
    problem:
      "Retail Expert Advisors have a business model: sell the dream, martingale the reality, blame the broker. I wanted one that survives contact with prop-firm rules — hard daily drawdown caps, no revenge trading, no religious faith in indicators. If it can't explain its own risk in one sentence, it doesn't get an account.",
    build:
      "MQL5 EA with a London/NY session filter, ATR-scaled position sizing, a daily drawdown breaker that flattens everything and locks the terminal, and a news blackout window because spreads during NFP are theft. Backtested in Python over six years of tick data with realistic spread/slippage modeling — vectorbt, not vibes.",
    outcome:
      "+14.8% over nine months of forward testing on demo with 4.1% max drawdown — respectable, boring, and still not a money printer. By design. V3 is exploring session-based volatility asymmetry; the shill version will never ship.",
  },
];

/* ---------- writeups / notes ---------- */

export interface NoteSection {
  heading: string;
  paragraphs: string[];
  code?: { lang: string; content: string };
}

export interface Writeup {
  id: string;
  index: string;
  title: string;
  tag: string;
  date: string;
  readTime: string;
  image?: string;
  imageAlt?: string;
  sections: NoteSection[];
}

export const WRITEUPS: Writeup[] = [
  {
    id: "idor-ato",
    index: "N.001",
    title: "IDOR to ATO in fifteen minutes flat",
    tag: "WRITEUP/WEB",
    date: "2025-06-14",
    readTime: "8 MIN",
    image: "/images/note-cover-1.jpg",
    imageAlt: "Printed packet diagram with acid-green highlighter marks",
    sections: [
      {
        heading: "01 — RECON",
        paragraphs: [
          "The program scope said wildcard domain, which in bounty language means: bring a shovel. I ran subdomain enumeration, screenshot mass-canvas, and started reading JavaScript bundles the way other people read horoscopes — looking for messages that were clearly meant for someone else. Burp's logger caught a billing endpoint returning tenant-scoped invoices, and the request had exactly one parameter standing between me and someone else's paperwork: an ID. Sequential. Unauthenticated. Beautiful in the way a knife on the floor is beautiful.",
          "Authorization bugs don't announce themselves with error banners. The server answered 200 OK for a tenant ID two numbers off from mine, and that quiet 200 told me nobody downstream ever asked the question 'who is asking?'. The whole architecture had decided to trust the client. Deciding to trust the client is a design choice; getting bounties for it is a career.",
        ],
      },
      {
        heading: "02 — THE CHAIN",
        paragraphs: [
          "A cross-tenant read is a P3 with good manners. I wanted the report to matter, so I kept pulling the thread: the same object-level trust ran through an invite endpoint, which accepted an operator role parameter without checking the inviter's tenant. Chain it — read their invoice IDs, invite myself to their workspace as an operator, log in as staff. Full account takeover, no exploit framework, one curl command repeated with escalating confidence.",
          "The discipline part nobody writes up: I did all of this against accounts I controlled. Two tenants, both mine, both provisioned with synthetic data. The blast radius was measured in hypotheticals. A finding you can't demonstrate safely is just a confession.",
        ],
        code: {
          lang: "http",
          content: [
            "GET /api/v2/invites?tenant=8842 HTTP/2",
            "Authorization: Bearer <my-own-token>",
            "{ \"role\": \"operator\" }  ← server: 200 OK, no questions asked",
            "",
            "# tenant 8842 is not mine. tenant 8841 was. nobody checked.",
          ].join("\n"),
        },
      },
      {
        heading: "03 — THE REPORT MATH",
        paragraphs: [
          "Triagers read reports the way pilots run checklists: repro first, impact second, essay never. Mine was forty lines — steps, curl one-liners, a two-sentence impact model, and an explicit statement of what I did NOT touch. It triaged P2 inside nine hours, patched inside six, and the bounty cleared the week after. The writeup you're reading shipped post-fix with the program's blessing.",
          "The lesson I keep re-learning: authorization is a question the server must ask on every request, not a promise the client makes on login. Any endpoint whose security depends on the client keeping quiet is a vulnerability on a timer.",
        ],
      },
    ],
  },
  {
    id: "router-rev",
    index: "N.002",
    title: "Your router is an undocumented IoT device — mine talked to strangers",
    tag: "WRITEUP/REV",
    date: "2025-03-02",
    readTime: "12 MIN",
    image: "/images/note-cover-2.jpg",
    imageAlt: "Router circuit board with antennas under acid-green edge light",
    sections: [
      {
        heading: "01 — THE SHELF",
        paragraphs: [
          "It came free with an ISP contract, which means it cost exactly what it's worth. Consumer routers ship with the same threat model as a vending machine: physically yours, digitally someone else's. Mine ran firmware last compiled when I was still using it as a doorstop, and the admin panel had the aesthetic confidence of a 2009 university project. I wanted to know what it did on the wire when nobody was watching — because everything phones home; the interesting question is who it calls.",
        ],
      },
      {
        heading: "02 — FIRMWARE 101",
        paragraphs: [
          "Dumping was embarrassingly easy: the firmware image sat on the vendor's support portal, unencrypted, behind a URL pattern a person could guess. binwalk found a SquashFS filesystem, strings found everything else. The device runs a busybox build with a hardcoded support account, a UPnP service bound to the WAN side (a party trick), and a scheduled task that POSTs device stats to an analytics endpoint every six hours — over plain HTTP, with a serial number in the payload.",
          "None of this is exotic. That's the point. Reverse engineering at this level is 10% cleverness and 90% reading output directories with patience. The scariest bugs aren't the ones that hide; they're the ones that have been sitting in plain sight since before you owned the device.",
        ],
        code: {
          lang: "bash",
          content: [
            "$ binwalk -e fw.bin            # → squashfs-root/",
            "$ strings squashfs-root/bin/httpd | grep -i 'stats'",
            "  → http://telemetry.vendor.tz/v1/report?sn=%s&uptime=%d",
            "$ # plain HTTP. serial in clear. every six hours. forever.",
          ].join("\n"),
        },
      },
      {
        heading: "03 — HARDENING, THE HONEST KIND",
        paragraphs: [
          "Reported to the vendor's security contact, which turned out to be a support inbox with a hero complex. Acknowledged in eleven days, patched in never — the telemetry endpoint quietly moved to HTTPS in the next firmware, the hardcoded account didn't. Mitigations on my side: the router now lives in a VLAN that can only talk outbound to a DNS sinkhole and an NTP server, UPnP is dead at the firewall, and the admin interface is reachable from exactly one wired port.",
          "The takeaway isn't 'this vendor is evil' — it's that the networking aisle is full of undocumented IoT devices wearing productivity costumes. Inventory what's on your LAN, watch what it calls, and assume the default configuration was chosen to minimize support tickets, not attack surface. Because it was.",
        ],
      },
    ],
  },
  {
    id: "monday-liquidity",
    index: "N.003",
    title: "Why your EA dies on the Monday open: session liquidity notes",
    tag: "NOTES/TRADING",
    date: "2024-11-20",
    readTime: "6 MIN",
    image: "/images/proj-ea.jpg",
    imageAlt: "Candlestick chart rendered as acid bars on black",
    sections: [
      {
        heading: "01 — THE CORPSE RUN",
        paragraphs: [
          "Every backtest looks immortal until it meets a Sunday 23:00 spread. Retail EAs die on the Monday open for the same reason tourists die on matatu routes: they assumed the road would behave like the map. Between Friday close and Monday open, liquidity thins out, spreads widen 5–15x, and your ATR-based stop is suddenly a suggestion. My first scalp EA made a 40% annualized backtest and lost it all in three weekend gaps — each one teaching the same tuition-paying lesson.",
        ],
      },
      {
        heading: "02 — SESSION STRUCTURE",
        paragraphs: [
          "London and the London/NY overlap are the only sessions where the pairs I trade behave like the textbook: tight spreads, honest liquidity, mean reversion that actually reverts. Sydney is a rumor. Tokyo has character but moves in memes. The open of each session has a personality too — the first fifteen minutes of London is where the previous day's unfinished business gets executed violently, and where breakout strategies go to be farmed.",
          "So the EA now has a session gate, not a filter: outside London/NY it doesn't reduce size, it does not exist. Positions still open across the transition are flattened ten minutes before rollover because swaps and spread games eat scalpers alive. Boring? Genuinely. Profitable? Less exciting than my first backtest and considerably more than my first account.",
        ],
        code: {
          lang: "mql5",
          content: [
            "bool tradable() {",
            "   MqlDateTime t; TimeToStruct(TimeGMT(), t);",
            "   int h = t.hour; // server=GMT, verified against broker, twice",
            "   return (h >= 7 && h < 16)      // london",
            "       || (h >= 12 && h < 17)     // overlap",
            "       && !news_blackout_active();",
            "}",
          ].join("\n"),
        },
      },
      {
        heading: "03 — RULES THAT SURVIVED",
        paragraphs: [
          "After nine months of forward testing, three rules have earned permanence. One: no new positions inside thirty minutes of scheduled news, because spreads during NFP are legalized theft. Two: the daily drawdown breaker flattens everything and locks the terminal — not a warning, a circuit breaker with no override, because revenge trading is the retail trader's version of touch typing on a broken keyboard. Three: if a week's data disagrees with the backtest's assumptions, the assumptions get audited before the size gets increased.",
          "None of this makes the strategy a money printer. That's the whole point — a strategy that survives contact with Monday is the only kind worth running.",
        ],
      },
    ],
  },
  {
    id: "dsp-analyzer",
    index: "N.004",
    title: "DSP homework, but make it a spectrum analyzer",
    tag: "NOTES/DSP",
    date: "2024-08-09",
    readTime: "5 MIN",
    image: "/images/note-cover-3.jpg",
    imageAlt: "Oscilloscope trace glowing acid green in a dark room",
    sections: [
      {
        heading: "01 — THE ASSIGNMENT",
        paragraphs: [
          "The course asked for a written FFT exercise: given a signal, produce magnitude bins, discuss leakage. I did the assignment, got the marks, and then rebuilt it as a browser-based spectrum analyzer because a waterfall of a real microphone tells you more in ten seconds than a semester ofprinted bin tables. Engineering coursework is a map; hardware is the terrain. The gap between the two is where the actual learning lives.",
        ],
      },
      {
        heading: "02 — FFT OR DIE",
        paragraphs: [
          "The core is unglamorous: capture 1024 samples at 48kHz, apply a Hann window (because rectangular windows lie — spectral leakage turned every tone into a doorstep), run a radix-2 FFT, convert magnitude to dB, paint bins. The interesting engineering is everything around the core: ring buffers so audio callbacks never block, decimation for a zoomable frequency axis, and peak-hold decay so the display has the physics of an analog CRT instead of the epilepsy of a stock ticker.",
        ],
        code: {
          lang: "ts",
          content: [
            "const win = hann(N);",
            "const re = x.map((v, i) => v * win[i]);   // window first, always",
            "fft(re, im);                              // in-place radix-2",
            "const db = 20 * Math.log10(Math.hypot(re, im) / N + 1e-9);",
          ].join("\n"),
        },
      },
      {
        heading: "03 — WHAT IT TAUGHT",
        paragraphs: [
          "Three lessons transferred directly into everything else I build. One: windows matter — truncating data without shaping it is analyzing your truncation, not your signal, and the same crime in trading is called backtest bias. Two: latency budgets are design constraints, not optimization problems to bolt on later. Three: the visualization IS the product; a correct analyzer nobody can read is a wrong answer at human speed.",
          "The analyzer now lives on a spare Pi with a cheap MEMS mic, watching my room's noise floor. It caught my fridge compressor failing two weeks before it died. DSP homework: 1. Appliance: 0.",
        ],
      },
    ],
  },
];

/* ---------- arcade / games ---------- */

export interface GameMeta {
  id:
    | "snake"
    | "breach"
    | "typeraid"
    | "packetrun"
    | "tracebreak"
    | "portknock"
    | "phishhunt"
    | "stacksmash"
    | "cryptbreak"
    | "kernelstorm"
    | "klack"
    | "vimquest"
    | "botnetgrow"
    | "hopexe";
  file: string; // executable-style name
  title: string;
  kind: string;
  blurb: string;
  controls: string[];
  hiKey: string; // localStorage key for high score
  hiUnit: string;
}

export const GAMES: GameMeta[] = [
  {
    id: "snake",
    file: "SNAKE.EXE",
    title: "WORM",
    kind: "ARCADE/CLASSIC",
    blurb:
      "The one that ran on everything since 1976. Eat, grow, avoid yourself — now with more acid.",
    controls: ["ARROWS / WASD — STEER", "SPACE — PAUSE", "R — RESET"],
    hiKey: "nr-hi-snake",
    hiUnit: "PTS",
  },
  {
    id: "breach",
    file: "BREACH.EXE",
    title: "BREACH PROTOCOL",
    kind: "PUZZLE/OPSEC",
    blurb:
      "Crack the ICE: pick hex bytes row/col alternating, fill the buffer, match the daemons before the clock dies.",
    controls: ["MOUSE / TAP — SELECT", "X — ABORT RUN"],
    hiKey: "nr-hi-breach",
    hiUnit: "PTS",
  },
  {
    id: "typeraid",
    file: "TTY.RACER",
    title: "TTY RACER",
    kind: "SKILL/SPEED",
    blurb:
      "Type real terminal commands against the clock. Wrong keys are logged, echoed, and judged.",
    controls: ["KEYBOARD — REQUIRED", "ENTER — COMMIT LINE"],
    hiKey: "nr-hi-typeraid",
    hiUnit: "WPM",
  },
  {
    id: "packetrun",
    file: "PKT.RUN",
    title: "PACKET RUN",
    kind: "ARCADE/DODGE",
    blurb:
      "You are the packet. Slip every firewall, eat the stray bits, refuse to be dropped. Speed only ever negotiates upward.",
    controls: ["← / → or A/D — STEER", "TOUCH — DRAG", "SPACE — PAUSE", "R — RESET"],
    hiKey: "nr-hi-packetrun",
    hiUnit: "PTS",
  },
  {
    id: "tracebreak",
    file: "TRACE.BREAK",
    title: "TRACE BREAK",
    kind: "ARCADE/BREAKOUT",
    blurb:
      "One packet against a wall of firewall rules. DENY rules take two hits and hold a grudge. Catch MLT / MTU / RATE chips to flood, widen, or throttle.",
    controls: ["← / → / MOUSE — STEER", "SPACE — LAUNCH / PAUSE", "R — RESET"],
    hiKey: "nr-hi-tracebreak",
    hiUnit: "PTS",
  },
  {
    id: "portknock",
    file: "PORT.KNOCK",
    title: "PORT KNOCK",
    kind: "ARCADE/REFLEX",
    blurb:
      "Whack-a-mole on a server rack: knock ports while they're open, chain combos, and never touch the honeypots. 45 seconds, three shells.",
    controls: ["MOUSE / TAP — KNOCK", "SPACE — PAUSE", "R — RESET"],
    hiKey: "nr-hi-portknock",
    hiUnit: "PTS",
  },
  {
    id: "phishhunt",
    file: "PHISH.HUNT",
    title: "PHISH HUNT",
    kind: "SKILL/OPSEC",
    blurb:
      "Twelve messages, five seconds each: legit or phish? Every verdict teaches the tell. Three burned trusts and the inbox wins.",
    controls: ["A / ← — LEGIT", "D / → — PHISH", "SPACE — CONTINUE"],
    hiKey: "nr-hi-phishhunt",
    hiUnit: "PTS",
  },
  {
    id: "stacksmash",
    file: "STACK.SMASH",
    title: "STACK SMASH",
    kind: "SKILL/TIMING",
    blurb:
      "Buffer overflow as a stacking game. Write each payload row as it slides past — miss the frame and the return address dies with you.",
    controls: ["SPACE / TAP — WRITE BYTE", "P — PAUSE", "R — RESET"],
    hiKey: "nr-hi-stacksmash",
    hiUnit: "B",
  },
  {
    id: "cryptbreak",
    file: "CRYPT.BREAK",
    title: "CRYPT BREAK",
    kind: "PUZZLE/CRYPTO",
    blurb:
      "Mastermind with a hex key. Eight attempts, FULL and PARTIAL feedback, every unused try pays out. Type fast, think faster.",
    controls: ["4 7 A C E F — TYPE", "BACKSPACE — UNDO", "AUTO-COMMIT ON 4TH"],
    hiKey: "nr-hi-cryptbreak",
    hiUnit: "PTS",
  },
  {
    id: "kernelstorm",
    file: "KERNEL.STORM",
    title: "KERNEL STORM",
    kind: "ARCADE/DEFENSE",
    blurb:
      "Missile command for the syscall layer. Intercept falling packets mid-air — every kill detonates and chains. Protect the three cores.",
    controls: ["MOUSE — AIM", "CLICK / TAP — INTERCEPT", "SPACE — PAUSE"],
    hiKey: "nr-hi-kernelstorm",
    hiUnit: "PTS",
  },
  {
    id: "klack",
    file: "KLACK",
    title: "KLACK",
    kind: "RHYTHM/4K",
    blurb:
      "Four lanes, synthesized drums on the same clock as the chart. Hit the block when it crosses the line — PERFECT wins the combo.",
    controls: ["D F J K — LANES", "SPACE — PAUSE", "TAP LANES ON TOUCH"],
    hiKey: "nr-hi-klack",
    hiUnit: "PTS",
  },
  {
    id: "vimquest",
    file: "VIM.QUEST",
    title: "VIM QUEST",
    kind: "SURVIVAL/MODAL",
    blurb:
      "The buffer is overrun. hjkl move, x deletes adjacent bugs, dd purges your row, u rolls the timeline back. No insert mode. No escape.",
    controls: ["H J K L — MOVE", "X — DELETE CHAR", "DD — DELETE ROW", "U — UNDO"],
    hiKey: "nr-hi-vimquest",
    hiUnit: "DELS",
  },
  {
    id: "botnetgrow",
    file: "BOTNET.GROW",
    title: "BOTNET GROW",
    kind: "ARCADE/AGAR",
    blurb:
      "Absorb idle hosts toward 100% saturation. The AV scanners scrub 20% of your mass per contact — under 1% means quarantine.",
    controls: ["MOUSE / DRAG — STEER", "SPACE — PAUSE", "R — RESET"],
    hiKey: "nr-hi-botnetgrow",
    hiUnit: "PTS",
  },
  {
    id: "hopexe",
    file: "HOP.EXE",
    title: "HOP",
    kind: "ARCADE/CROSSING",
    blurb:
      "Frogger on a motherboard. Cross ten lanes of data bus — packets sting, DMA trains don't brake — and reach the DIMM slot.",
    controls: ["ARROWS / WASD — HOP", "SWIPE ON TOUCH", "SPACE — PAUSE"],
    hiKey: "nr-hi-hopexe",
    hiUnit: "PTS",
  },
];

/* ---------- capabilities (pinned scan section) ---------- */

export interface Capability {
  id: string;
  command: string;
  title: string;
  blurb: string;
  tags: string[];
}

export const CAPABILITIES: Capability[] = [
  {
    id: "sec",
    command: "root@mousouri:~$ sec --offensive",
    title: "OFFENSIVE SECURITY & BUG BOUNTY",
    blurb:
      "Web-first vulnerability research: authorization gaps, injection, business-logic abuse. Recon automation and methodical testing against Bugcrowd / HackerOne-style programs, with reports triagers actually enjoy reading — repro steps first, drama never.",
    tags: ["IDOR/AUTHZ", "XSS", "API TESTING", "RECON", "BURP SUITE", "NUCLEI"],
  },
  {
    id: "algo",
    command: "root@mousouri:~$ algo --trading",
    title: "ALGORITHMIC TRADING & MQL5",
    blurb:
      "Expert Advisors with actual risk models: session filters, volatility-scaled sizing, hard drawdown breakers. Backtested in Python over years of tick data, forward-tested on demo before a single shilling goes live. Boring by design.",
    tags: ["MQL5", "METATRADER 5", "VECTORBT", "RISK MODELS", "PROP-FIRM RULES"],
  },
  {
    id: "web",
    command: "root@mousouri:~$ web --fullstack",
    title: "FULL-STACK WEB",
    blurb:
      "React / TypeScript / Next.js by default. Prisma for data, Tailwind for speed, websockets when the interface needs a pulse. Ships to Vercel with Lighthouse receipts and no unexplained re-renders.",
    tags: ["REACT", "TYPESCRIPT", "NEXT.JS", "PRISMA", "TAILWIND", "WEBSOCKETS"],
  },
  {
    id: "hw",
    command: "root@mousouri:~$ hw --embedded",
    title: "EMBEDDED & AUTOMATION",
    blurb:
      "Microcontrollers to PLCs: sensor rigs, MQTT fleets, and the digital signal processing in between. Equally comfortable probing an oscilloscope and annotating a SCADA diagram — the physical world is just I/O with weather.",
    tags: ["ARDUINO", "ESP32", "RASPBERRY PI", "PLC", "MQTT", "DSP"],
  },
];

/* ---------- stack page (~/stack) — deep arsenal + idea bulb ---------- */

export interface StackTool {
  name: string;
  level: number; // 0..100 proficiency readout
  note: string; // one-line field note
}

export interface StackDomain {
  code: string; // panel id, e.g. "SEC/0x01"
  tools: StackTool[];
  proof: string; // receipts line
}

export const STACK_DETAIL: Record<string, StackDomain> = {
  sec: {
    code: "SEC/0x01",
    tools: [
      { name: "BURP SUITE", level: 90, note: "repeater is home — extensions loaded" },
      { name: "NMAP", level: 88, note: "switches from memory, timing mindful" },
      { name: "NUCLEI", level: 85, note: "custom templates for the weird edges" },
      { name: "PYTHON", level: 86, note: "recon pipelines that run themselves" },
      { name: "FFUF", level: 84, note: "filtered fuzzing — noise is a bug" },
      { name: "HTTPX / DNSX", level: 80, note: "asset triage at scan speed" },
    ],
    proof: "receipts: reports triagers actually read — repro steps first, drama never",
  },
  algo: {
    code: "ALGO/0x02",
    tools: [
      { name: "METATRADER 5", level: 90, note: "tester, optimizer, live — daily drivers" },
      { name: "MQL5", level: 88, note: "EAs with hard drawdown breakers" },
      { name: "PANDAS", level: 84, note: "tick data without the tears" },
      { name: "PYTHON + VECTORBT", level: 82, note: "backtests over years of ticks" },
      { name: "RISK MODELS", level: 80, note: "volatility-scaled sizing, session filters" },
    ],
    proof: "receipts: every EA forward-tested on demo before a single shilling goes live",
  },
  web: {
    code: "WEB/0x03",
    tools: [
      { name: "TYPESCRIPT", level: 90, note: "strict mode or nothing" },
      { name: "REACT", level: 90, note: "refs, rAF, zero mystery re-renders" },
      { name: "NEXT.JS", level: 88, note: "this site is the live demo" },
      { name: "TAILWIND", level: 86, note: "utilities only, no dead CSS" },
      { name: "PRISMA", level: 80, note: "schema-first, migrations stay clean" },
      { name: "WEBSOCKETS", level: 78, note: "interfaces with a pulse" },
    ],
    proof: "receipts: a 14-cabinet arcade + this portfolio — all client-side, zero console errors",
  },
  hw: {
    code: "HW/0x04",
    tools: [
      { name: "ARDUINO", level: 88, note: "where the whole journey started" },
      { name: "ESP32", level: 86, note: "MQTT fleets on cheap silicon" },
      { name: "RASPBERRY PI", level: 84, note: "POTHOLE_VISION's brain" },
      { name: "MQTT", level: 82, note: "QoS levels argued seriously" },
      { name: "DSP", level: 72, note: "oscilloscope-comfortable, filter-curious" },
      { name: "PLC / SCADA", level: 70, note: "coursework rigs + lab hours" },
    ],
    proof: "receipts: 91.3% mAP@0.5 pothole detector on a Pi 4 — defended",
  },
};

export const LEARNING: Array<{ what: string; pct: number; why: string }> = [
  { what: "KERNEL EXPLOITATION", pct: 35, why: "because userspace got polite" },
  { what: "GLSL SHADERS", pct: 40, why: "the arcade deserves particles" },
  { what: "RUST (FOR TOOLS)", pct: 45, why: "rewriting the recon pipeline, but angrier" },
  { what: "WEBASSEMBLY", pct: 30, why: "browser-side fuzzing, someday" },
];

export interface BulbIdea {
  tag: string;
  title: string;
  body: string;
}

/* IDEA.BULB pool — cross-domain sparks the bulb can strike */
export const BULB_IDEAS: BulbIdea[] = [
  { tag: "SEC × WEB", title: "IDOR CANARY", body: "A browser extension that tags every request with a per-role marker and flags the moment an object ID crosses a privilege boundary. Finds authz bugs while you browse — not after the report." },
  { tag: "ALGO", title: "NEWS-VOL EA", body: "An MT5 EA whose main feature is refusing to trade: it halts everything when an economic-calendar shock window opens. Boring by design, profitable by omission." },
  { tag: "HW × CV", title: "MANHOLE_VISION", body: "POTHOLE_VISION's sibling — same Pi 4 rig, new class: unsealed manholes and flooded drains. The municipal pipeline already exists; feed it." },
  { tag: "SEC", title: "RECON DIFF", body: "A cron job that snapshots a program's attack surface weekly and diffs it. New subdomain, new JS bundle, new API route — you get the alert before the crowd does." },
  { tag: "WEB", title: "TERMINAL PORTFOLIO KIT", body: "Open-source the engine running this site: command palette, hidden terminal, wipe transitions. Let other devs dress their portfolios as equipment." },
  { tag: "ALGO × WEB", title: "PROPFIRM GAUNTLET", body: "A web app that stress-tests EAs against prop-firm rules — daily drawdown, consistency checks, news windows — before you pay for the challenge." },
  { tag: "SEC × AI", title: "PHISH CORPUS TRAINER", body: "Grow PHISH.HUNT into a trainable corpus: paste a suspicious email, get a tell-by-tell autopsy. Study tool for blue teams, scored like the arcade." },
  { tag: "HW", title: "MQTT CANARY", body: "A decoy sensor fleet publishing fake telemetry. If anyone touches it you get a push notification — and a new enemy." },
  { tag: "ALGO × WEB", title: "EATEST.FM", body: "Publish EA performance as static pages with tamper-evident hashes. No screenshots, no Excel — receipts or silence." },
  { tag: "SEC", title: "BURP TAB ZERO", body: "A Burp extension that ranks proxy history by exploitability heuristics instead of timestamp. The interesting request is never request #1." },
  { tag: "HW × SEC", title: "RADIO SCOOP", body: "Cheap SDR plus an ESP32: log the neighbourhood's wireless noise floor and alert on anomalies. The antenna is an attack surface too." },
  { tag: "WEB", title: "GITBLAME.WTF", body: "Paste a repo, get a heat map of the files that break the most. Blame the code, not the intern." },
  { tag: "ALGO", title: "SESSION CLOCK", body: "A desktop widget that only un-greys the trading terminal during your backtested edge windows. Discipline, shipped as UX." },
  { tag: "SEC × HW", title: "BADUSB VACCINE", body: "A USB device that replays rubber-ducky payloads inside a sandbox and writes the detections. Teach the endpoint to flinch." },
  { tag: "WEB × SEC", title: "WRITEUP STENCIL", body: "A structured generator for bounty reports: impact, repro, remediation — linted before the triager ever sees it. Fewer 'cannot reproduce' replies." },
  { tag: "HW × CV", title: "SIGNAL SENTRY", body: "A road-sign health detector: rusted, occluded, knocked over. Same YOLO pipeline, civic twist, portfolio gold." },
  { tag: "ALGO × SEC", title: "BUGHUNTING P&L", body: "Track bounty hunting like a trading book: hours spent, severity hit-rate, expected value per program. KPI the hustle." },
  { tag: "WEB", title: "ASCII WEATHER", body: "A status-bar weather readout in pure ASCII, like this site's tmux bar. Forecasts deserve the bandwidth." },
  { tag: "SEC", title: "PAYLOAD MUSEUM", body: "A curated, versioned gallery of XSS payloads that still work, with browser support matrices. Archive the classics." },
  { tag: "HW", title: "POWER POLLSTER", body: "An ESP32 wall meter that logs voltage sags and correlates them with the lights flickering. Evidence for the landlord." },
  { tag: "ALGO", title: "TICK ARCHIVE TZ", body: "A free tick-data mirror for exotic pairs, seeded from demo accounts. The data desert ends here." },
  { tag: "WEB × SEC", title: "CSP LINTER", body: "Paste a Content-Security-Policy, get the bypasses explained line by line. Security headers deserve a spellcheck." },
  { tag: "HW × ALGO", title: "MARKET LED WALL", body: "A physical ticker wall — ESP32 matrix showing your EA's equity curve in room lighting. Loses money, but aesthetically." },
  { tag: "SEC", title: "JOHN THE RIPPER UI", body: "A brutalist web frontend for hash-cracking sessions with live progress as a terminal readout. Cracking as theatre." },
];

/* ---------- cert wall (~/stack) ---------- */

export interface Cert {
  id: string; // fake cert hash — brutalist flavor
  name: string;
  issuer: string;
  year: string;
  status: "HELD" | "IN PROGRESS";
}

export const CERTS: Cert[] = [
  { id: "NR-9F2A", name: "OSCP", issuer: "OffSec", year: "2026", status: "IN PROGRESS" },
  { id: "NR-71C4", name: "eJPT", issuer: "INE Security", year: "2024", status: "HELD" },
  { id: "NR-C03B", name: "COMPTIA SECURITY+", issuer: "CompTIA", year: "2024", status: "HELD" },
  { id: "NR-88D7", name: "HTB CDA — WEB", issuer: "HackTheBox Academy", year: "2025", status: "HELD" },
  { id: "NR-1E55", name: "CCNA", issuer: "Cisco NetAcad", year: "2023", status: "HELD" },
  { id: "NR-B29E", name: "PRACTICAL JS REVERSING", issuer: "Maldev Academy", year: "2026", status: "IN PROGRESS" },
];

/* ---------- timeline (~/timeline — the whole log, oldest first) ---------- */

export interface TimelineEntry {
  year: string;
  tag: string; // machine tag, e.g. "BOOT"
  title: string;
  body: string;
}

export const TIMELINE: TimelineEntry[] = [
  {
    year: "2019",
    tag: "BOOT",
    title: "FIRST CONTACT — ARDUINO UNO",
    body: "A blinking LED should not feel like a superpower. It did. Dismantled every toy with a battery in the house before enrolling into computer engineering proper.",
  },
  {
    year: "2021",
    tag: "SYS",
    title: "LINUX AS A PERSONALITY",
    body: "Arch on the daily driver, dotfiles in git, window manager configured instead of sleeping. Learned C properly by breaking it — segfaults as a teaching style.",
  },
  {
    year: "2022",
    tag: "SEC/INIT",
    title: "CTF TEAM DEBUT",
    body: "First local CTF. Placed mid-table with two web challenges solved and one entire night lost to a crypto rabbit hole. Hooked permanently — web exploitation became the default language.",
  },
  {
    year: "2023",
    tag: "SEC/GRIND",
    title: "BUG BOUNTY — FIRST VALID REPORT",
    body: "An IDOR on a government-adjacent portal, found on a Saturday, triaged on a Monday. The moment 'repro steps first, drama never' became the house style. Security+ and eJPT banked in the same season.",
  },
  {
    year: "2023",
    tag: "HW",
    title: "EMBEDDED GOES PUBLIC",
    body: "MQTT sensor fleet for a campus lab — 12 ESP32 nodes, zero cable budgets, one very annoyed facilities department. Learned that physical I/O is just networking with weather.",
  },
  {
    year: "2024",
    tag: "ALGO",
    title: "MQL5 — FIRST SURVIVOR EA",
    body: "After four dead EAs, one lived: session-filtered, volatility-scaled, hard drawdown breaker. Forward-tested on demo for 90 days before a shilling went live. Boring by design — the point.",
  },
  {
    year: "2024",
    tag: "HW/CV",
    title: "POTHOLE_VISION — 91.3% mAP",
    body: "Raspberry Pi 4 + YOLO + Dar es Salaam roads. Defended the project, shipped the writeup, and confirmed that the most interesting datasets are the ones outside your window.",
  },
  {
    year: "2025",
    tag: "WEB",
    title: "FULL-STACK DEFAULT",
    body: "React/TypeScript/Next.js became the delivery vehicle for everything else — recon dashboards, EA analytics, this portfolio with its 14-cabinet arcade. Zero-console-error as a standard, not a goal.",
  },
  {
    year: "2026",
    tag: "NOW",
    title: "DEGREE TAIL + OFFSEC TRACK",
    body: "Final-year modules on autopilot, OSCP prep in the margins, kernel exploitation on the weekend queue. The plan is unchanged: break it on purpose, then write it up.",
  },
];

/* ---------- now (~/now — the live page) ---------- */

export const NOW = {
  building: [
    "THIS SITE — pass 4: telemetry, a lo-fi engine, screensaver, resume, AMA. The portfolio eats its own roadmap.",
    "RECON DIFF — cron'd attack-surface snapshots for bounty targets, alerts before the crowd wakes up.",
  ],
  reading: [
    { what: "PRACTICAL BINARY ANALYSIS", meta: "by Dennis Yurichev — 60% in, ARM chapters next" },
    { what: "DESIGNING DATA-INTENSIVE APPLICATIONS", meta: "2nd pass — this time with margin notes" },
    { what: "THE WEB APPLICATION HACKER'S HANDBOOK", meta: "comfort read. still correct 15 years later." },
  ],
  focus: "OSCP-style boxes on weekends · EA forward-test window · final-year project draft",
  location: "DAR ES SALAAM, TZ (UTC+3)",
};

/* ---------- ama (~/ama — the oracle runs client-side) ---------- */

/* deterministic oracle: hash(question) % ANSWERS.length —
   same question, same answer, zero servers involved. */
export const AMA_ANSWERS: string[] = [
  "REPRO FIRST. If you can't replay it, you can't report it — and I can't help you.",
  "Read the source. When that fails, read the traffic. The truth is always in the packets.",
  "Start with nmap, end with a writeup. Everything in between is just patience.",
  "The boring answer is usually the correct one: update, restart, read the changelog.",
  "That depends. Does it have a threat model, or just vibes?",
  "I'd automate it. If the script takes longer than the task, the task is the wrong task.",
  "Backtest it. If it only works when you're watching, it doesn't work.",
  "Fix the drawdown first. Profits are an opinion; risk is a fact.",
  "One terminal, two monitors, three coffee strengths. That's the whole stack.",
  "Learn networking before frameworks. The web is just TCP wearing makeup.",
  "Use the debugger. printf() is a phase you're allowed to graduate from.",
  "Disclosed, coordinated, documented. Never dropped in a Discord first.",
  "The best recon tool is a calendar — you're competing with people who quit on week two.",
  "Ship something ugly that works. Ugly can be refactored; imaginary cannot.",
  "Firmware, then radio, then the cloud. Attacks flow downhill to hardware.",
  "Touch grass. The bug will still be there in an hour, and you'll type better.",
];

export const AMA_LIMIT = 32;

/* ---------- marquee ---------- */

export const EXPLORING_ITEMS = [
  "KERNEL EXPLOITATION",
  "FPGAs",
  "GLSL SHADERS",
  "QUANT DATA",
  "WASM SANDBOXES",
  "DETECTION ENGINEERING",
  "LORA MESHES",
  "FIRMWARE DUMPS",
];

export const FOOTER_ITEMS = [
  "OPEN FOR COLLAB",
  "CTF TEAMS",
  "BUG BOUNTY",
  "FREELANCE",
  "COFFEE CONTRACTS",
  "PROP-FIRM GRIND",
];

/* ---------- contact ---------- */

export const EMAIL = "root@mousouri.dev";

export interface Social {
  label: string;
  handle: string;
  href: string;
}

export const SOCIALS: Social[] = [
  { label: "GITHUB", handle: "@mousouri", href: "https://github.com/mousouri" },
  { label: "X / TWITTER", handle: "@mousouri_dev", href: "https://x.com/mousouri_dev" },
  { label: "HACKERONE", handle: "h1/mousouri", href: "https://hackerone.com/mousouri" },
  { label: "BUGCROWD", handle: "bc/mousouri", href: "https://bugcrowd.com/mousouri" },
  { label: "LINKEDIN", handle: "/in/mousouri", href: "https://linkedin.com/in/mousouri" },
];

export const HERO_COORDS = "LAT −6.7924 / LON 39.2083";
