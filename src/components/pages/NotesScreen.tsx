"use client";

import { WRITEUPS } from "@/lib/data";
import { navigate } from "@/lib/router";
import { PageShell } from "@/components/pages/PageShell";
import { NotesIndex } from "@/components/pages/NotesIndex";

/* ~/notes — the full archive as a real page. */
export function NotesScreen() {
  return (
    <PageShell crumb="~/notes — ARCHIVE">
      <NotesIndex
        writeups={WRITEUPS}
        onOpen={(w) => navigate({ page: "note", id: w.id })}
      />
    </PageShell>
  );
}
