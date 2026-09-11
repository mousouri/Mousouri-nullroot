"use client";

import { navigate } from "@/lib/router";
import { PageShell } from "@/components/pages/PageShell";
import { ArcadePage } from "@/components/pages/ArcadePage";

/* ~/arcade (+ /arcade/[game]) — the coin-op wing as a real page. */
export function ArcadeScreen({ game }: { game?: string }) {
  return (
    <PageShell crumb={game ? `~/arcade/${game} — COIN-OP` : "~/arcade — COIN-OP"}>
      <ArcadePage
        game={game}
        onSelectGame={(id) => navigate({ page: "arcade", game: id })}
      />
    </PageShell>
  );
}
