import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WRITEUPS } from "@/lib/data";
import { NoteScreen } from "@/components/pages/NoteScreen";

export function generateStaticParams() {
  return WRITEUPS.map((w) => ({ id: w.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const writeup = WRITEUPS.find((w) => w.id === id);
  return {
    title: writeup ? `${writeup.title} — READER` : "NOTE",
    description:
      writeup?.sections?.[0]?.paragraphs?.[0]?.slice(0, 155).replace(/\n/g, " ") ??
      "A note from the MOUSOURI archive.",
  };
}

export default async function NoteRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!WRITEUPS.some((w) => w.id === id)) notFound();
  return <NoteScreen id={id} />;
}
