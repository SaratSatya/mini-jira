import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/requireSession";
import { redirect } from "next/navigation";
import AddIssueToSprint from "./AddIssueToSprint";
import RemoveFromSprintButton from "./RemoveFromSprintButton";
import SprintStatusActions from "./SprintStatusActions";


type Status = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

export default async function SprintDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; sprintId: string }>;
}) {
  const { projectId, sprintId } = await params;

  const session = await requireSession();
  // @ts-expect-error session user extended
  const userId = session.user.id as string;

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true },
  });
  if (!membership) redirect("/projects");

  const sprint = await prisma.sprint.findFirst({
    where: { id: sprintId, projectId },
    select: { id: true, name: true, status: true, startDate: true, endDate: true },
  });
  if (!sprint) redirect(`/projects/${projectId}/sprints`);

  const sprintIssues = await prisma.issue.findMany({
    where: { projectId, sprintId: sprint.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      type: true,
      storyPoints: true,
    },
  });

  const backlogIssues = await prisma.issue.findMany({
    where: { projectId, OR:[{sprintId:null},{sprintId:{isSet:false}}] 
  },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true },
  });

  const spByStatus: Record<Status, number> = {
    TODO: 0,
    IN_PROGRESS: 0,
    IN_REVIEW: 0,
    DONE: 0,
  };

  for (const i of sprintIssues) {
    const sp = i.storyPoints ?? 0;
    spByStatus[i.status as Status] += sp;
  }

  const totalSp =
    spByStatus.TODO + spByStatus.IN_PROGRESS + spByStatus.IN_REVIEW + spByStatus.DONE;

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{sprint.name}</h1>
          <p className="text-sm opacity-70 mt-1">
            Status: {sprint.status}
            {sprint.startDate ? ` • Start: ${new Date(sprint.startDate).toLocaleDateString()}` : ""}
            {sprint.endDate ? ` • End: ${new Date(sprint.endDate).toLocaleDateString()}` : ""}
          </p>
        </div>

        <Link className="underline" href={`/projects/${projectId}/sprints`}>
          Back
        </Link>
        <SprintStatusActions
            projectId={projectId}
            sprintId={sprint.id}
            status={sprint.status}
            isAdmin={membership.role === "ADMIN"}
          />

      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-3">
          <p className="font-medium">Sprint Metrics (Story Points)</p>
          <div className="mt-2 text-sm space-y-1">
            <p>TODO: {spByStatus.TODO}</p>
            <p>IN_PROGRESS: {spByStatus.IN_PROGRESS}</p>
            <p>IN_REVIEW: {spByStatus.IN_REVIEW}</p>
            <p>DONE: {spByStatus.DONE}</p>
            <p className="mt-2 font-medium">Total: {totalSp}</p>
          </div>
        </div>

        <AddIssueToSprint sprintId={sprint.id} backlogIssues={backlogIssues} disabled={sprint.status==='CLOSED'} />
      </div>

      <div className="mt-6 border rounded p-3">
        <p className="font-medium">Issues in this Sprint</p>

        <div className="mt-3 space-y-2">
          {sprintIssues.length === 0 ? (
            <p className="text-sm opacity-70">No issues added yet.</p>
          ) : (
            sprintIssues.map((i) => (
              <div key={i.id} className="border rounded p-2 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{i.title}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {i.type} • {i.priority} • {i.status}
                    {i.storyPoints != null ? ` • SP: ${i.storyPoints}` : ""}
                  </p>
                </div>

                <div className="flex gap-2 items-center">
                  <Link className="underline text-sm" href={`/projects/${projectId}/issues/${i.id}`}>
                    Open
                  </Link>
                  <RemoveFromSprintButton issueId={i.id} disabled={sprint.status==='CLOSED'} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
