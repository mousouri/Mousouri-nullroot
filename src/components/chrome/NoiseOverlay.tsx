/**
 * Texture layer: film grain (SVG turbulence, tiled + stepped drift) and
 * CRT scanlines. One fixed pointer-events-none pair covering everything,
 * including the preloader and overlays — texture never gets "turn off".
 * Server-safe (no hooks).
 */
export function NoiseOverlay() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[400]">
      <div className="grain grain-shift absolute inset-0 opacity-[0.05]" />
      <div className="scanlines absolute inset-0" />
    </div>
  );
}
