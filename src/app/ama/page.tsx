import type { Metadata } from "next";
import { AmaScreen } from "@/components/pages/AmaScreen";

export const metadata: Metadata = {
  title: "ASK.BOX — THE DETERMINISTIC ORACLE",
  description:
    "Ask the MOUSOURI oracle anything about security, trading, embedded and shipping. Serverless — the answer is hashed, not streamed.",
};

export default function AmaRoute() {
  return <AmaScreen />;
}
