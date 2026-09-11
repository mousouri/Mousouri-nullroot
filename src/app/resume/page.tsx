import type { Metadata } from "next";
import { ResumeScreen } from "@/components/pages/ResumeScreen";

export const metadata: Metadata = {
  title: "RÉSUMÉ — ONE PAGE, NO FLUFF",
  description:
    "The MOUSOURI one-pager: offensive security, MQL5 algo trading, full-stack web, embedded. Download the PDF or print it directly.",
};

export default function ResumeRoute() {
  return <ResumeScreen />;
}
