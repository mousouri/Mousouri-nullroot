"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";

/**
 * ASCENT — the one real 3D moment. A wireframe terrain that literally
 * ascends toward the back (ridge amplitude ramps with depth), an acid
 * monolith pinned to the ridge, fog for depth. Deliberately cheap:
 * one mesh + one box, basic materials, no post-processing, DPR capped.
 * Reduced motion renders a single static frame (frameloop="demand").
 */

function ridgeHeight(x: number, y: number): number {
  // y is the plane's local depth axis; the far edge (y → +13) climbs
  const t = THREE.MathUtils.clamp((y - 1) / 12, 0, 1);
  const ridge = t * t * 7.5;
  const rolling = Math.sin(x * 0.55 + y * 0.35) * Math.cos(x * 0.21 - y * 0.6) * (0.35 + t);
  const detail = Math.sin(x * 1.7) * Math.sin(y * 1.9) * 0.16;
  return ridge + rolling + detail;
}

function Terrain() {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    // extra width so the mesh edge never shows on 21:9 hero boxes
    const g = new THREE.PlaneGeometry(46, 30, 96, 80);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      pos.setZ(i, ridgeHeight(pos.getX(i), pos.getY(i)));
    }
    g.rotateX(-Math.PI / 2); // lay flat; local +y becomes world -z (far)
    g.computeVertexNormals();
    return g;
  }, []);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.035; // patient drift
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, -1.2, 0]}>
      <meshBasicMaterial wireframe color="#52524a" />
    </mesh>
  );
}

function Monolith() {
  const ref = useRef<THREE.Mesh>(null);
  const baseY = ridgeHeight(0, 9) - 1.2 + 1.55;

  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.18;
    ref.current.position.y = baseY + Math.sin(clock.elapsedTime * 0.7) * 0.14;
  });

  return (
    <mesh ref={ref} position={[0, baseY, -9]}>
      <boxGeometry args={[0.7, 3.1, 0.7]} />
      <meshBasicMaterial color="#d7ff3f" wireframe />
    </mesh>
  );
}

export default function AscentScene() {
  return (
    <div className="relative h-full w-full" aria-label="Interactive 3D ascent scene">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 2.4, 8.5], fov: 52 }}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        frameloop={typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "demand" : "always"}
        onCreated={({ scene }) => {
          scene.background = new THREE.Color(0x0a0a0a);
          scene.fog = new THREE.Fog(0x0a0a0a, 9, 24);
        }}
      >
        <Terrain />
        <Monolith />
      </Canvas>

      {/* scene chrome */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3">
        <div className="flex justify-between font-mono text-[9px] tracking-[0.25em] text-paper/60">
          <span>SCENE: ASCENT — LIVE WEBGL</span>
          <span className="text-acid">R3F/THREE</span>
        </div>
        <div className="flex justify-between font-mono text-[9px] tracking-[0.25em] text-paper/60">
          <span>TERRAIN.ROT: 0.035 RAD/S</span>
          <span>MONOLITH.ID: 0xD7FF3F</span>
        </div>
      </div>
    </div>
  );
}
