import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/requireSession";
import { redirect } from "next/navigation";

function formatType(t: string) {
  return t.replaceAll("_", " ").toLowerCase();
}

export default async function ActivityPage({
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

  const logs = await prisma.activity.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      type: true,
      meta: true,
      createdAt: true,
      issueId: true,
      sprintId: true,
      actor: { select: { name: true, email: true } },
    },
  });

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Project Activity</h1>
        <Link className="underline" href={`/projects/${projectId}`}>
          Back
        </Link>
      </div>

      <div className="mt-6 space-y-2">
        {logs.length === 0 ? (
          <p className="text-sm opacity-70">No activity yet.</p>
        ) : (
          logs.map((a) => (
            <div key={a.id} className="border rounded p-3">
              <p className="text-sm opacity-70">
                {a.actor.name ?? a.actor.email} • {new Date(a.createdAt).toLocaleString()}
              </p>
              <p className="mt-1">
                <span className="font-medium">{formatType(a.type)}</span>
                {a.issueId ? (
                  <>
                    {" "}
                    • Issue:{" "}
                    <Link className="underline" href={`/projects/${projectId}/issues/${a.issueId}`}>
                      Open
                    </Link>
                  </>
                ) : null}
                {a.sprintId ? (
                  <>
                    {" "}
                    • Sprint:{" "}
                    <Link className="underline" href={`/projects/${projectId}/sprints/${a.sprintId}`}>
                      Open
                    </Link>
                  </>
                ) : null}
              </p>

              {a.meta ? (
                <pre className="mt-2 text-xs opacity-80 whitespace-pre-wrap">
                  {JSON.stringify(a.meta, null, 2)}
                </pre>
              ) : null}
            </div>
          ))
        )}
      </div>
    </main>
  );
}
