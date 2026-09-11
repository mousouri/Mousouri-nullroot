import type { Metadata } from "next";
import { GuestbookScreen } from "@/components/pages/GuestbookScreen";

export const metadata: Metadata = {
  title: "GUESTBOOK — SIGN THE WALL",
  description:
    "The MOUSOURI signature wall. No account, no backend, no tracking — sign it here or via the hidden terminal.",
};

export default function GuestbookRoute() {
  return <GuestbookScreen />;
}
