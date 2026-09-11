import { WRITEUPS } from "@/lib/data";

/* RSS for the notes archive — /notes/rss.xml. Static output,
   regenerated with each build, zero runtime cost. */
const BASE = "https://mousouri.dev";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET() {
  const items = WRITEUPS.map((n) => {
    const blurb = n.sections[0]?.paragraphs[0]?.slice(0, 220) ?? n.title;
    return `    <item>
      <title>${esc(n.title)}</title>
      <link>${BASE}/notes/${n.id}</link>
      <guid isPermaLink="true">${BASE}/notes/${n.id}</guid>
      <pubDate>${new Date(n.date).toUTCString()}</pubDate>
      <category>${esc(n.tag)}</category>
      <description>${esc(blurb)}…</description>
    </item>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>MOUSOURI — notes &amp; writeups</title>
    <link>${BASE}/notes</link>
    <description>Security writeups, reverse engineering notes, DSP homework and trading postmortems from Dar es Salaam.</description>
    <language>en</language>
    <lastBuildDate>${new Date(WRITEUPS[0]?.date ?? Date.now()).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
