import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PROJECTS } from "@/lib/data";
import { ProjectScreen } from "@/components/pages/ProjectScreen";

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = PROJECTS.find((p) => p.id === id);
  return {
    title: project ? `${project.title} — CASE FILE` : "CASE FILE",
    description:
      project?.problem?.slice(0, 155) ?? "Case file from the MOUSOURI archive.",
  };
}

export default async function ProjectRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!PROJECTS.some((p) => p.id === id)) notFound();
  return <ProjectScreen id={id} />;
}
