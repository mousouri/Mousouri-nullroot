import type { MetadataRoute } from "next";
import { PROJECTS, WRITEUPS, GAMES } from "@/lib/data";

/* One URL per screen. The vault is deliberately absent — it is
   earned, not indexed. Base URL is the persona domain; swap for
   the real deployment host without touching anything else. */
const BASE = "https://mousouri.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const statics: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${BASE}/work`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/stack`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/now`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/timeline`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/ama`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/resume`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/notes`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/arcade`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/guestbook`, changeFrequency: "daily", priority: 0.5 },
  ];

  const projects: MetadataRoute.Sitemap = PROJECTS.map((p) => ({
    url: `${BASE}/work/${p.id}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const notes: MetadataRoute.Sitemap = WRITEUPS.map((n) => ({
    url: `${BASE}/notes/${n.id}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const games: MetadataRoute.Sitemap = GAMES.map((g) => ({
    url: `${BASE}/arcade/${g.id}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...statics, ...projects, ...notes, ...games];
}
