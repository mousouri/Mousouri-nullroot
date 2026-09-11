import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

/* NULLROOT arcade covers — batch 1: generate a slice of covers.
   Usage: node scripts/gen_covers.mjs <startIndex> <count> */
const OUT = 'public/covers';
fs.mkdirSync(OUT, { recursive: true });

const STYLE = 'brutalist terminal arcade cabinet art, solid black background, monochrome electric lime green #d7ff3f artwork only, CRT scanlines, heavy grid lines, high contrast, minimal, retro 1980s hacker computer graphics, no photorealism, no gradients, vector poster style, high quality';

const GAMES = [
  ['snake', 'a pixelated snake made of glowing square segments crawling through a grid maze, long tail of blocks'],
  ['breach', 'a firewall wall of hex dump characters being broken open, cracks of light through the grid, scattered brackets and symbols'],
  ['typeraid', 'falling words and letters raining over a keyboard, a blinking text cursor target, typed characters dissolving into pixels'],
  ['packetrun', 'an isometric runner lane of glowing data packets hopping over gaps in a circuit board path'],
  ['tracebreak', 'a brick breaker wall made of redacted document blocks and port numbers, a ball bouncing leaving light trails, a paddle bar at the bottom'],
  ['portknock', 'a tall server rack with rows of square ports, some glowing open, some crossed out, a big knocker hand silhouette tapping one port'],
  ['phishhunt', 'a fishing hook made of circuit traces dangling an email envelope as bait, warning brackets around it'],
  ['stacksmash', 'a tower of memory blocks collapsing, a canary bird cage line under the stack, falling bytes as debris'],
  ['cryptbreak', 'a padlock with a hex cipher wheel face, four empty slots underneath, floating hex digits'],
  ['kernelstorm', 'projectile streaks falling from the sky toward three glowing computer cores on the ground, interceptor explosion rings'],
  ['klack', 'four lanes of falling notes over a mechanical keyboard seen from above, WASD keycaps highlighted'],
  ['vimquest', 'a terminal screen grid with line numbers, cursor block, and the letters h j k l as four directional arrows, small bug glyphs'],
  ['botnetgrow', 'a growing blob network of connected computer nodes absorbing smaller scattered machines, network graph radiating outward'],
  ['hopexe', 'a frogger-style road of lanes, a packet frog hopping across lanes of scrolling binary data, safe zone at top'],
];

const start = Number(process.argv[2] ?? 0);
const count = Number(process.argv[3] ?? 7);
const slice = GAMES.slice(start, start + count);

const zai = await ZAI.create();

for (const [id, motif] of slice) {
  const out = `${OUT}/${id}.png`;
  if (fs.existsSync(out) && fs.statSync(out).size > 20000) {
    console.log(`SKIP ${id} (exists)`);
    continue;
  }
  let ok = false;
  for (let attempt = 1; attempt <= 2 && !ok; attempt++) {
    try {
      const res = await zai.images.generations.create({
        prompt: `${motif}, ${STYLE}`,
        size: '1024x1024',
      });
      const b64 = res?.data?.[0]?.base64;
      if (!b64) throw new Error('empty base64');
      fs.writeFileSync(out, Buffer.from(b64, 'base64'));
      console.log(`OK ${id} (${Math.round(b64.length / 1024)}KB b64)`);
      ok = true;
    } catch (e) {
      console.log(`ERR ${id} attempt ${attempt}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}
console.log('BATCH DONE');
