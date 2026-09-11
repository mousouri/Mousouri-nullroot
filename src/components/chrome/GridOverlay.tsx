/**
 * Exposed-structure layer: fixed hairline grid + ruler ticks + static
 * coordinate labels. Purely decorative — pointer-events-none, z-0.
 * Server-safe (no hooks).
 */
const SIXTHS = [16.666, 33.333, 50, 66.666, 83.333];

export function GridOverlay() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      {/* vertical hairlines at every sixth of the viewport */}
      {SIXTHS.map((x) => (
        <div
          key={x}
          className="absolute top-0 bottom-0 w-px bg-line"
          style={{ left: `${x}%` }}
        />
      ))}

      {/* ruler ticks — top + bottom strips */}
      <div
        className="absolute top-0 right-0 left-0 h-2.5 opacity-60"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, var(--line) 0 1px, transparent 1px 80px)",
        }}
      />
      <div
        className="absolute right-0 bottom-0 left-0 h-2.5 opacity-60"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, var(--line) 0 1px, transparent 1px 80px)",
        }}
      />

      {/* static coordinate labels pinned to the grid lines */}
      <div className="absolute top-4 left-2.5 font-mono text-[9px] tracking-wider text-dim/70">
        x:0000
      </div>
      {SIXTHS.map((x) => (
        <div
          key={`label-${x}`}
          className="absolute top-4 hidden font-mono text-[9px] tracking-wider text-dim/70 md:block"
          style={{ left: `calc(${x}% + 4px)` }}
        >
          x:{String(Math.round(x * 10)).padStart(4, "0")}
        </div>
      ))}
    </div>
  );
}
