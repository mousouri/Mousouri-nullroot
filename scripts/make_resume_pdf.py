#!/usr/bin/env python3
"""NULLROOT résumé — one-page ATS-safe PDF asset for /resume.
Follows pdf skill briefs/resume.md: single column, FreeSerif, 1.5cm margins,
9pt hard floor, >=85% page fill. Accent from palette.generate (minimal mode)."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ── fonts (registered TTFs only) ──
FD = "/usr/share/fonts/truetype/freefont"
pdfmetrics.registerFont(TTFont("FreeSerif", f"{FD}/FreeSerif.ttf"))
pdfmetrics.registerFont(TTFont("FreeSerif-Bold", f"{FD}/FreeSerifBold.ttf"))
pdfmetrics.registerFont(TTFont("FreeSerif-Italic", f"{FD}/FreeSerifItalic.ttf"))
pdfmetrics.registerFont(TTFont("FreeSerif-BoldItalic", f"{FD}/FreeSerifBoldItalic.ttf"))
registerFontFamily("FreeSerif", normal="FreeSerif", bold="FreeSerif-Bold",
                   italic="FreeSerif-Italic", boldItalic="FreeSerif-BoldItalic")

# ── palette (pdf.py palette.generate --mode minimal) ──
ACCENT = colors.HexColor("#23748f")
TEXT = colors.HexColor("#1e2022")
MUTED = colors.HexColor("#777d83")

S = {
    "name": ParagraphStyle("Name", fontName="FreeSerif", fontSize=24, leading=28,
                            alignment=TA_CENTER, textColor=TEXT, spaceAfter=2),
    "contact": ParagraphStyle("Contact", fontName="FreeSerif", fontSize=10, leading=13,
                               alignment=TA_CENTER, textColor=MUTED, spaceAfter=4),
    "section": ParagraphStyle("Section", fontName="FreeSerif", fontSize=13, leading=16,
                               spaceBefore=6, spaceAfter=3, textColor=ACCENT),
    "title": ParagraphStyle("Title", fontName="FreeSerif", fontSize=11, leading=14,
                             spaceAfter=1, textColor=TEXT),
    "meta": ParagraphStyle("Meta", fontName="FreeSerif", fontSize=10, leading=13,
                            textColor=MUTED, spaceAfter=3),
    "bullet": ParagraphStyle("Bullet", fontName="FreeSerif", fontSize=10, leading=13.2,
                              leftIndent=14, textColor=TEXT, spaceBefore=0.5, spaceAfter=0.5),
    "body": ParagraphStyle("Body", fontName="FreeSerif", fontSize=10, leading=13.2,
                            textColor=TEXT, spaceAfter=2),
}

def section(title):
    return [Paragraph(f"<b>{title}</b>", S["section"]),
            HRFlowable(width="100%", thickness=0.8, color=ACCENT, spaceBefore=0, spaceAfter=6)]

def entry(title, meta, bullets):
    out = [Paragraph(f"<b>{title}</b>", S["title"]), Paragraph(meta, S["meta"])]
    for b in bullets:
        out.append(Paragraph(f"• {b}", S["bullet"]))
    out.append(Spacer(1, 2))
    return out

doc = SimpleDocTemplate(
    "public/resume/nullroot-resume.pdf", pagesize=A4,
    leftMargin=1.5 * cm, rightMargin=1.5 * cm, topMargin=1.5 * cm, bottomMargin=1.5 * cm,
    title="NULLROOT — Computer Engineering x Offensive Security (Résumé)",
    author="NULLROOT", creator="Z.ai",
    subject="One-page résumé: offensive security, MQL5 algo trading, full-stack web, embedded systems.",
)

story = []

# header
story.append(Paragraph("<b>NULLROOT</b>", S["name"]))
story.append(Paragraph(
    "root@nullroot.dev  |  Dar es Salaam, Tanzania (UTC+3)  |  github.com/nullroot  |  hackerone.com/nullroot",
    S["contact"]))
story.append(Paragraph(
    "Computer engineering student · independent security researcher · MQL5 algo developer · full-stack web · embedded",
    S["contact"]))

# summary
story.extend(section("PROFESSIONAL SUMMARY"))
story.append(Paragraph(
    "Final-year computer engineering student working the overlap of offensive security, automation and hardware. "
    "Web-first vulnerability research against bug-bounty programs, with reports written for triagers — repro steps "
    "first, drama never. Builds Expert Advisors with real risk models, full-stack web tooling in React/TypeScript/"
    "Next.js, and embedded fleets on ESP32 and Raspberry Pi. The through line: break it on purpose, then write it up.",
    S["body"]))

# experience
story.extend(section("SELECTED WORK & RESEARCH"))
story.extend(entry(
    "Independent Security Researcher (Bug Bounty)", "Self-directed  |  2023 - Present  |  Remote",
    [
        "Discovered and reported authorization gaps (IDOR), injection and business-logic flaws across web and API targets; first valid report triaged and resolved within one business week.",
        "Recon automation in Python: weekly attack-surface snapshots with diff alerts on new subdomains, JS bundles and API routes.",
        "Custom Nuclei templates for edge-case classes; Burp Suite as the daily driver, extensions configured for repeater-heavy workflows.",
    ]))
story.extend(entry(
    "Algorithmic Trading Developer (MQL5)", "Self-directed  |  2024 - Present  |  Remote",
    [
        "Shipped MetaTrader 5 Expert Advisors with volatility-scaled sizing, session filters and hard drawdown breakers; four retired prototypes before one survivor passed a 90-day forward test on demo.",
        "Backtesting pipeline in Python (pandas, vectorbt) over years of tick data; strategy changes gated by out-of-sample results, not screenshots.",
    ]))
story.extend(entry(
    "Embedded & Full-Stack Developer", "Freelance / academic projects  |  2022 - Present  |  Dar es Salaam",
    [
        "POTHOLE_VISION: Raspberry Pi 4 + YOLO road-defect detector, 91.3% mAP@0.5 — defended as a final-year project and shipped as a public writeup.",
        "MQTT sensor fleet of 12 ESP32 nodes deployed for a campus lab; QoS tuning, OTA updates and a monitoring dashboard that stayed boring on purpose.",
        "Full-stack delivery in Next.js/TypeScript/Prisma, including this portfolio: a 14-cabinet browser arcade, trophy engine and a site-wide CTF, all client-side with zero console errors.",
    ]))

# education
story.extend(section("EDUCATION"))
story.append(Paragraph("<b>B.Sc. Computer Engineering</b>", S["title"]))
story.append(Paragraph("University of Dar es Salaam  |  final year, expected 2026", S["meta"]))
story.append(Paragraph(
    "Focus: digital systems, networking and signal processing. Coursework on autopilot; the real curriculum runs on a Pi cluster.",
    S["body"]))

# certifications
story.extend(section("CERTIFICATIONS"))
story.append(Paragraph(
    "• eJPT — INE Security, 2024 &nbsp;&nbsp;• CompTIA Security+ — 2024 &nbsp;&nbsp;• CCNA — Cisco NetAcad, 2023",
    S["body"]))
story.append(Paragraph(
    "• HackTheBox CDA (Web) — 2025 &nbsp;&nbsp;• OSCP — in progress, 2026 &nbsp;&nbsp;• Practical JS Reversing — in progress, 2026",
    S["body"]))

# skills
story.extend(section("TECHNICAL SKILLS"))
for cat, vals in [
    ("Offensive security", "Burp Suite, Nmap, Nuclei, ffuf, httpx/dnsx, Python recon pipelines, IDOR/authz, XSS, API testing"),
    ("Trading & data", "MQL5, MetaTrader 5, pandas, vectorbt, backtest design, risk models"),
    ("Web", "TypeScript, React, Next.js, Tailwind, Prisma, WebSockets, Playwright/E2E"),
    ("Embedded & tooling", "C, Arduino, ESP32, Raspberry Pi, MQTT, Git, Linux (Arch daily driver), DSP fundamentals"),
]:
    story.append(Paragraph(f"<b>{cat}:</b>  {vals}", S["body"]))

story.append(HRFlowable(width="100%", thickness=0.8, color=ACCENT, spaceBefore=4, spaceAfter=3))
story.append(Paragraph(
    "Verification: everything above runs live at nullroot.dev — arcade, writeups, telemetry. References on request.",
    S["body"]))

doc.build(story)
print("resume pdf built")
