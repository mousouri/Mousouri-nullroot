import type { Metadata } from "next";
import { WorkScreen } from "@/components/pages/WorkScreen";

export const metadata: Metadata = {
  title: "WORK — FULL INDEX",
  description:
    "Selected case files: pothole-detection CV, WebGL ascent, M-Pesa commerce, disclosed IDOR, MQL5 execution systems.",
};

export default function WorkPage() {
  return <WorkScreen />;
}
