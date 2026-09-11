"use client";

import { useEffect, useRef, useState } from "react";

type CursorMode = "default" | "bracket" | string; // string = label text

const LERP = 0.18;

/**
 * Custom cursor: lerp-trailing crosshair with a live coordinate readout
 * (x:0128 y:0044), morphing into a bracket [ ] over generic hoverables
 * or an acid label box over elements that declare data-cursor="VIEW".
 *
 * Perf: positions are written straight to the DOM via transforms in one
 * rAF — React re-renders only on mode changes.
 * Rendered only for fine pointers with motion allowed (parent gates it).
 */
export function CustomCursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const coordRef = useRef<HTMLSpanElement>(null);
  const [mode, setMode] = useState<CursorMode>("default");
  const [down, setDown] = useState(false);
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);

  useEffect(() => {
    document.documentElement.classList.add("custom-cursor");

    let raf = 0;
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let cx = tx;
    let cy = ty;

    const loop = () => {
      cx += (tx - cx) * LERP;
      cy += (ty - cy) * LERP;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;
      }
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${tx}px, ${ty}px, 0) translate(-50%, -50%)`;
      }
      if (coordRef.current) {
        coordRef.current.textContent = `x:${String(Math.round(tx)).padStart(4, "0")} y:${String(
          Math.round(ty),
        ).padStart(4, "0")}`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!visibleRef.current) {
        visibleRef.current = true;
        setVisible(true);
      }
    };

    // event delegation: any [data-cursor] descendant drives the mode
    const onOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest?.("[data-cursor]");
      if (target) {
        const val = target.getAttribute("data-cursor") ?? "";
        setMode(val === "" ? "bracket" : val);
      } else {
        setMode("default");
      }
    };
    const onDown = () => setDown(true);
    const onUp = () => setDown(false);
    const onLeave = () => {
      visibleRef.current = false;
      setVisible(false);
    };
    const onEnter = () => {
      visibleRef.current = true;
      setVisible(true);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseover", onOver, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.documentElement.addEventListener("mouseleave", onLeave);
    document.documentElement.addEventListener("mouseenter", onEnter);

    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove("custom-cursor");
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      document.documentElement.removeEventListener("mouseenter", onEnter);
    }
  }, []);

  const bracket = mode === "bracket";
  const label = mode !== "default" && mode !== "bracket" ? mode : null;
  const corner = "absolute bg-acid transition-all duration-200";

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[500]"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.2s" }}
    >
      {/* crosshair ring — blend-difference so it reads on ink AND paper */}
      <div
        ref={ringRef}
        className="absolute top-0 left-0 mix-blend-difference"
        style={{
          width: 0,
          height: 0,
          transition: "scale 0.25s var(--ease-out-expo)",
          scale: down ? "0.7" : "1",
        }}
      >
        {/* crosshair hairlines (hidden when morphed) */}
        <span
          className="absolute bg-paper"
          style={{
            width: bracket || label ? 0 : 26,
            height: 1,
            left: -13,
            top: 0,
            transition: "width 0.25s var(--ease-out-expo)",
          }}
        />
        <span
          className="absolute bg-paper"
          style={{
            width: 1,
            height: bracket || label ? 0 : 26,
            left: 0,
            top: -13,
            transition: "height 0.25s var(--ease-out-expo)",
          }}
        />

        {/* bracket corners */}
        {[
          "left-[-14px] top-[-14px] border-l border-t",
          "right-[-14px] top-[-14px] border-r border-t",
          "left-[-14px] bottom-[-14px] border-l border-b",
          "right-[-14px] bottom-[-14px] border-r border-b",
        ].map((pos) => (
          <span
            key={pos}
            className={`${corner} ${pos} border-acid`}
            style={{
              width: bracket ? 10 : label ? 0 : 5,
              height: bracket ? 10 : label ? 0 : 5,
              opacity: bracket ? 1 : label ? 0 : 0.9,
            }}
          />
        ))}

        {/* label chip — acid block, ink text */}
        <span
          className="absolute left-5 top-4 whitespace-nowrap bg-acid px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-widest text-ink"
          style={{
            opacity: label ? 1 : 0,
            transform: `translateY(${label ? 0 : 6}px)`,
            transition: "opacity 0.2s var(--ease-sharp), transform 0.2s var(--ease-sharp)",
          }}
        >
          {label ?? ""}
        </span>

        {/* coordinate readout */}
        <span
          ref={coordRef}
          className="absolute left-4 top-5 font-mono text-[9px] tracking-wider text-dim whitespace-nowrap"
          style={{ opacity: bracket || label ? 0 : 0.9 }}
        />
      </div>

      {/* exact dot */}
      <div ref={dotRef} className="absolute top-0 left-0" style={{ width: 0, height: 0 }}>
        <span className="absolute block h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 bg-acid" />
      </div>
    </div>
  );
}
