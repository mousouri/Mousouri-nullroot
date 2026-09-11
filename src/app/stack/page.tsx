import type { Metadata } from "next";
import { StackScreen } from "@/components/pages/StackScreen";

export const metadata: Metadata = {
  title: "THE STACK — TECH.ARSENAL — MOUSOURI",
  description:
    "Tool levels, domain receipts and the idea bulb — what MOUSOURI runs, how deep, and what's compiling next.",
};

export default function StackRoute() {
  return <StackScreen />;
}
