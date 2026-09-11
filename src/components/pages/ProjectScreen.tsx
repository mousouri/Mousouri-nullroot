"use client";

import { PROJECTS } from "@/lib/data";
import { navigate } from "@/lib/router";
import { PageShell } from "@/components/pages/PageShell";
import { ProjectPage } from "@/components/pages/ProjectPage";

/* ~/work/[id] — the case file, paper palette, as a real page. */
export function ProjectScreen({ id }: { id: string }) {
  const project = PROJECTS.find((p) => p.id === id) ?? PROJECTS[0];

  return (
    <PageShell
      crumb={`~/work/${project.id} — CASE_FILE`}
      palette="paper"
      backTo={{ page: "work" }}
      backLabel="INDEX"
    >
      <ProjectPage
        project={project}
        allProjects={PROJECTS}
        onOpen={(p) => navigate({ page: "project", id: p.id })}
      />
    </PageShell>
  );
}
