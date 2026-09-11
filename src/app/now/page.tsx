import type { Metadata } from "next";
import { NowScreen } from "@/components/pages/NowScreen";

export const metadata: Metadata = {
  title: "NOW — THE LIVE PAGE",
  description:
    "What MOUSOURI is building, compiling and reading right now — the page that stays honest between deployments.",
};

export default function NowRoute() {
  return <NowScreen />;
}
