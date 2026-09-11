import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GAMES } from "@/lib/data";
import { ArcadeScreen } from "@/components/pages/ArcadeScreen";

export function generateStaticParams() {
  return GAMES.map((g) => ({ game: g.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ game: string }>;
}): Promise<Metadata> {
  const { game } = await params;
  const meta = GAMES.find((g) => g.id === game);
  return {
    title: meta ? `${meta.file} — COIN-OP` : "COIN-OP",
    description: meta?.blurb ?? "Insert coin. Avoid realities.",
  };
}

export default async function GameRoute({
  params,
}: {
  params: Promise<{ game: string }>;
}) {
  const { game } = await params;
  if (!GAMES.some((g) => g.id === game)) notFound();
  return <ArcadeScreen game={game} />;
}
