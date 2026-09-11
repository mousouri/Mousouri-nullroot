"use client";

import { WRITEUPS } from "@/lib/data";
import { navigate } from "@/lib/router";
import { PageShell } from "@/components/pages/PageShell";
import { NotePage } from "@/components/pages/NotePage";

/* ~/notes/[id] — the reader, paper palette, as a real page. */
export function NoteScreen({ id }: { id: string }) {
  const writeup = WRITEUPS.find((w) => w.id === id) ?? WRITEUPS[0];

  return (
    <PageShell
      crumb={`~/notes/${writeup.id} — READER`}
      palette="paper"
      backTo={{ page: "notes" }}
      backLabel="ARCHIVE"
    >
      <NotePage
        writeup={writeup}
        allWriteups={WRITEUPS}
        onOpen={(w) => navigate({ page: "note", id: w.id })}
      />
    </PageShell>
  );
}
