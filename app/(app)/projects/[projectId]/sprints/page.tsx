import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/requireSession";
import { redirect } from "next/navigation";
import NewSprintForm from "./NewSprintForm";

export default async function SprintsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const session = await requireSession();
  // @ts-expect-error session user extended
  const userId = session.user.id as string;

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true },
  });

  if (!membership) redirect("/projects");

  const sprints = await prisma.sprint.findMany({
    where: { projectId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, status: true, startDate: true, endDate: true },
  });

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sprints</h1>
        <Link className="underline" href={`/projects/${projectId}`}>Back</Link>
      </div>

      <div className="mt-6 space-y-3">
        {membership.role === "ADMIN" ? <NewSprintForm projectId={projectId} /> : <p className="text-sm opacity-70">Only ADMIN can create sprints.</p>}

        <div className="border rounded p-3">
          <p className="font-medium">All sprints</p>

          <div className="mt-3 space-y-2">
            {sprints.length === 0 ? (
              <p className="text-sm opacity-70">No sprints yet.</p>
            ) : (
              sprints.map((s) => (
                <Link
                  key={s.id}
                  href={`/projects/${projectId}/sprints/${s.id}`}
                  className="block border rounded p-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-sm opacity-70">{s.status}</p>
                    </div>
                    <span className="text-sm underline">Open</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
