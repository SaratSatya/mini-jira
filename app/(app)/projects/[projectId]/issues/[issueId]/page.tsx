import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/requireSession";
import { redirect } from "next/navigation";
import CommentBox from "./CommentBox";
import AssignAssignee from "./AssignAssignee";
import StatusActions from "./StatusActions";

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; issueId: string }>;
}) {
  const { projectId, issueId } = await params;

  const session = await requireSession();
  // @ts-expect-error session user extended
  const userId = session.user.id as string;

  const issue = await prisma.issue.findFirst({
    where: {
      id: issueId,
      projectId,
      project: { members: { some: { userId } } },
    },
    select: {
      id: true,
      projectId: true,
      title: true,
      description: true,
      status: true,
      type: true,
      priority: true,
      storyPoints: true,
      createdAt: true,
      updatedAt: true,
      assigneeId: true,
      reporter: { select: { name: true, email: true } },
      comments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          body: true,
          createdAt: true,
          author: { select: { name: true, email: true } },
        },
      },
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  if (!issue) redirect(`/projects/${projectId}/issues`);

  // Get current user's role in this project
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true },
  });

  const currentUserRole = membership?.role ?? "MEMBER";

  const memberships = await prisma.projectMember.findMany({
    where: { projectId: issue.projectId },
    select: { userId: true },
  });

  const users = await prisma.user.findMany({
    where: { id: { in: memberships.map((m) => m.userId) } },
    select: { id: true, name: true, email: true },
  });

  const members = users.map((u) => ({
    userId: u.id,
    name: u.name,
    email: u.email,
  }));

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{issue.title}</h1>
        <Link className="underline" href={`/projects/${projectId}/issues`}>
          Back
        </Link>
      </div>

      <p className="text-sm opacity-70 mt-2">
        {issue.type} • {issue.priority} • {issue.status}
        {issue.storyPoints != null ? ` • SP: ${issue.storyPoints}` : ""}
      </p>

      {issue.description ? (
        <div className="mt-4 border rounded p-3">
          <p className="font-medium">Description</p>
          <p className="mt-2 text-sm opacity-90 whitespace-pre-wrap">
            {issue.description}
          </p>
        </div>
      ) : null}

      {/* Assignee — only rendered for ADMIN */}
      {currentUserRole === "ADMIN" && (
        <div className="mt-6">
          <AssignAssignee
            issueId={issue.id}
            currentAssigneeId={issue.assignee?.id ?? null}
            members={members}
          />
        </div>
      )}

      {/* Status action buttons — role-conditional */}
      <StatusActions
        issueId={issue.id}
        projectId={issue.projectId}
        status={issue.status}
        currentUserRole={currentUserRole}
        currentUserId={userId}
        assigneeId={issue.assigneeId}
      />

      <div className="mt-6">
        <p className="font-medium">Comments</p>
        <div className="mt-3">
          <CommentBox issueId={issue.id} projectId={issue.projectId} />
        </div>
        <div className="mt-4 space-y-3">
          {issue.comments.length === 0 ? (
            <p className="text-sm opacity-70">No comments yet.</p>
          ) : (
            issue.comments.map((c) => (
              <div key={c.id} className="border rounded p-3">
                <p className="text-sm opacity-70">
                  {c.author.name ?? c.author.email} •{" "}
                  {new Date(c.createdAt).toLocaleString()}
                </p>
                <p className="mt-2 whitespace-pre-wrap">{c.body}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}