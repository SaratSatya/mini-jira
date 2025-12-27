import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/requireSession";
import { redirect } from "next/navigation";
import AddMemberForm from "./AddMemberForm";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const session = await requireSession();
  // @ts-expect-error session user extended
  const userId = session.user.id as string;

  const myMembership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true },
  });

  if (!myMembership) redirect("/projects");
  const memberships = await prisma.projectMember.findMany({
      where: { projectId },
      orderBy: { role: "asc" },
      select: { userId: true, role: true },
  });

  const users = await prisma.user.findMany({
    where: { id: { in: memberships.map((m) => m.userId) } },
    select: { id: true, name: true, email: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  const members = memberships.map((m) => ({
    role: m.role,
    userId: m.userId,
    name: userMap.get(m.userId)?.name ?? null,
    email: userMap.get(m.userId)?.email ?? null,
  }));


  return (
    <main className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Project Members</h1>
        <Link className="underline" href={`/projects/${projectId}`}>
          Back
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {myMembership.role === "ADMIN" ? (
          <AddMemberForm projectId={projectId} />
        ) : (
          <p className="text-sm opacity-70">
            Only ADMIN can add members.
          </p>
        )}

        <div className="border rounded p-3">
          <p className="font-medium">Members</p>

          <div className="mt-3 space-y-2">
            {members.map((m) => (
              <div key={m.userId} className="border rounded p-2 flex items-center justify-between">
                <div>
                   <p className="font-medium">{m.name ?? m.email ?? m.userId}</p>
                   <p className="text-sm opacity-70">{m.email}</p>
                </div>
                <span className="text-sm">{m.role}</span>
            </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
