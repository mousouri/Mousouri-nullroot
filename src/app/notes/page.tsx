import type { Metadata } from "next";
import { NotesScreen } from "@/components/pages/NotesScreen";

export const metadata: Metadata = {
  title: "NOTES — ARCHIVE",
  description:
    "Security writeups and engineering notes: IDOR chains, router firmware dumping, and other disclosed research.",
};

export default function NotesPage() {
  return <NotesScreen />;
}
