import type { Metadata } from "next";
import { TimelineScreen } from "@/components/pages/TimelineScreen";

export const metadata: Metadata = {
  title: "THE LOG — 2019 → NOW",
  description:
    "The commit history of a security career: first LED to bug bounty, EAs, POTHOLE_VISION and the 14-cabinet arcade.",
};

export default function TimelineRoute() {
  return <TimelineScreen />;
}
