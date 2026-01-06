import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/requireSession";
import SignOutButton from "@/app/components/SignOutButton";

export default async function ProjectsPage() {
  const session = await requireSession();
  // @ts-expect-error added in auth.ts session callback
  const userId = session.user.id as string;

  const projects = await prisma.project.findMany({
    where: { members: { some: { userId } } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, key: true, description: true },
  });

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <div className="flex gap-2">
          <Link className="border rounded px-3 py-1" href="/projects/new">
            New Project
          </Link>
          <SignOutButton />
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {projects.length === 0 ? (
          <p>No projects yet. Create one.</p>
        ) : (
          projects.map((p) => (
            <div key={p.id} className="border rounded p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {p.name} <span className="text-sm opacity-70">({p.key})</span>
                  </p>
                  {p.description ? (
                    <p className="text-sm mt-1 opacity-80">{p.description}</p>
                  ) : null}
                </div>

                <Link className="underline text-sm" href={`/projects/${p.id}`}>
                  Open
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
