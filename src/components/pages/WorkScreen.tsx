"use client";

import { PROJECTS } from "@/lib/data";
import { navigate } from "@/lib/router";
import { PageShell } from "@/components/pages/PageShell";
import { WorkIndex } from "@/components/pages/WorkIndex";

/* ~/work — the full archive as a real page. */
export function WorkScreen() {
  return (
    <PageShell crumb="~/work — FULL INDEX">
      <WorkIndex
        projects={PROJECTS}
        onOpen={(p) => navigate({ page: "project", id: p.id })}
      />
    </PageShell>
  );
}
