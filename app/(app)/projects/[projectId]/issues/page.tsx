import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/requireSession";
import { redirect } from "next/navigation";
import KanbanBoard from "./KanbanBoard";

export default async function ProjectIssuesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const session = await requireSession();
  // @ts-expect-error session user extended
  const userId = session.user.id as string;

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      members: { some: { userId } },
    },
    select: { id: true, name: true, key: true },
  });

  if (!project) redirect("/projects");

  // Get current user's role
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true },
  });

  const currentUserRole = membership?.role ?? "MEMBER";

  const issues = await prisma.issue.findMany({
    where: { projectId: project.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      projectId: true,
      title: true,
      description: true,
      status: true,
      type: true,
      priority: true,
      storyPoints: true,
      assigneeId: true,
      updatedAt: true,
    },
  });

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            Issues — {project.name}{" "}
            <span className="opacity-70">({project.key})</span>
          </h1>
        </div>

        <div className="flex gap-2">
          {currentUserRole === "ADMIN" ? (
            <Link
              className="border rounded px-3 py-1"
              href={`/projects/${project.id}/issues/new`}
            >
              Create Issue
            </Link>
          ) : null}
          <Link
            className="border rounded px-3 py-1"
            href={`/projects/${project.id}`}
          >
            Back
          </Link>
        </div>
      </div>

      <KanbanBoard
        initialIssues={issues.map((i) => ({
          ...i,
          updatedAt: i.updatedAt.toISOString(),
        }))}
        currentUserRole={currentUserRole}
        currentUserId={userId}
      />
    </main>
  );
}