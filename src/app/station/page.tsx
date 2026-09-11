import type { Metadata } from "next";
import { StationScreen } from "@/components/pages/StationScreen";

export const metadata: Metadata = {
  title: "STATION — LO-FI.WAV",
  description:
    "A procedural radio, synthesized live in the browser. Zero streams, zero files.",
};

export default function StationRoute() {
  return <StationScreen />;
}
