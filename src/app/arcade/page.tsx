import type { Metadata } from "next";
import { ArcadeScreen } from "@/components/pages/ArcadeScreen";

export const metadata: Metadata = {
  title: "ARCADE — COIN-OP",
  description:
    "Three playable cabinets: SNAKE.EXE, BREACH.EXE (a packet-assembly ICE puzzle) and TTY.RACER. Hi-scores live in your browser.",
};

export default function ArcadeRoute() {
  return <ArcadeScreen />;
}
