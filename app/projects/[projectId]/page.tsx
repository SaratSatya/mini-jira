import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/requireSession";
import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectPage({ params }: PageProps) {
  const { projectId } = await params;

  const session = await requireSession();
  // @ts-expect-error added in auth.ts session callback
  const userId = session.user.id as string;

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      members: { some: { userId } },
    },
    select: {
      id: true,
      name: true,
      key: true,
      description: true,
    },
  });

  if (!project) redirect("/projects");

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {project.name}{" "}
          <span className="opacity-70 text-base">({project.key})</span>
        </h1>
        <Link className="underline" href="/projects">
          Back
        </Link>
      </div>

      {project.description && (
        <p className="mt-3">{project.description}</p>
      )}

      <div className="mt-8 border rounded p-4">
        <p className="font-medium">Next milestone:</p>

        <div className="mt-4 flex gap-3">
          <Link
            className="border rounded px-3 py-1"
            href={`/projects/${project.id}/issues`}
          >
            Issues
          </Link>
          <Link
            className="border rounded px-3 py-1"
            href={`/projects/${project.id}/issues/new`}
          >
            Create Issue
          </Link>
          <Link 
            className="border rounded px-3 py-1" 
            href={`/projects/${project.id}/members`}
          >
            Members
          </Link>
          <Link className="border rounded px-3 py-1" href={`/projects/${project.id}/sprints`}>
            Sprints
          </Link>
          <Link className="border rounded px-3 py-1" href={`/projects/${project.id}/activity`}>
            Activity
          </Link>

        </div>

        <ul className="list-disc pl-5 mt-4 text-sm">
          <li>Create Issues</li>
          <li>Issue list (filter by status)</li>
          <li>Basic Kanban columns</li>
        </ul>
      </div>
    </main>
  );
}
