import type { Metadata } from "next";
import { VaultScreen } from "@/components/pages/VaultScreen";

export const metadata: Metadata = {
  title: "VAULT — EARNED ACCESS",
  description: "A door that only opens for people who read.",
  robots: { index: false, follow: false }, // the vault stays off the map
};

export default function VaultRoute() {
  return <VaultScreen />;
}
