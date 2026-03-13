import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/requireSession";
import { redirect } from "next/navigation";
import CommentBox from "./CommentBox";
import AssignAssignee from "./AssignAssignee";
import StatusActions from "./StatusActions";

const COMMENTS_PER_PAGE = 10;

export default async function IssueDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; issueId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { projectId, issueId } = await params;
  const { page } = await searchParams;

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
      assigneeId: true,
      assignee: { select: { id: true } },
    },
  });

  if (!issue) redirect(`/projects/${projectId}/issues`);

  // Get current user's role in this project
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true },
  });

  const currentUserRole = membership?.role ?? "MEMBER";

  const members =
    currentUserRole === "ADMIN"
      ? (
          await prisma.user.findMany({
            where: {
              id: {
                in: (
                  await prisma.projectMember.findMany({
                    where: {
                      projectId: issue.projectId,
                      role: "MEMBER",
                    },
                    select: { userId: true },
                  })
                ).map((m) => m.userId),
              },
            },
            select: { id: true, name: true, email: true },
          })
        ).map((u) => ({
          userId: u.id,
          name: u.name,
          email: u.email,
        }))
      : [];

  const commentPage = Math.max(Number.parseInt(page ?? "1", 10) || 1, 1);

  const totalComments = await prisma.comment.count({
    where: { issueId: issue.id },
  });

  const totalPages = Math.max(1, Math.ceil(totalComments / COMMENTS_PER_PAGE));
  const currentPage = Math.min(commentPage, totalPages);

  const comments = await prisma.comment.findMany({
    where: { issueId: issue.id },
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * COMMENTS_PER_PAGE,
    take: COMMENTS_PER_PAGE,
    select: {
      id: true,
      body: true,
      createdAt: true,
      author: { select: { name: true, email: true } },
    },
  });

  return (
    <main className="p-6 max-w-3xl mx-auto pb-16">
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
          <p className="mt-2 text-sm opacity-90 whitespace-pre-wrap">{issue.description}</p>
        </div>
      ) : null}

      {currentUserRole === "ADMIN" && (
        <div className="mt-6">
          <AssignAssignee
            issueId={issue.id}
            currentAssigneeId={issue.assignee?.id ?? null}
            members={members}
          />
        </div>
      )}

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
          {comments.length === 0 ? (
            <p className="text-sm opacity-70">No comments yet.</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="border rounded p-3">
                <p className="text-sm opacity-70">
                  {c.author.name ?? c.author.email} • {new Date(c.createdAt).toLocaleString()}
                </p>
                <p className="mt-2 whitespace-pre-wrap">{c.body}</p>
              </div>
            ))
          )}
        </div>

        {totalComments > COMMENTS_PER_PAGE ? (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="opacity-70">
              Showing {(currentPage - 1) * COMMENTS_PER_PAGE + 1}-
              {Math.min(currentPage * COMMENTS_PER_PAGE, totalComments)} of {totalComments}
            </span>
            <div className="flex gap-2">
              {currentPage > 1 ? (
                <Link
                  className="border rounded px-3 py-1"
                  href={`/projects/${projectId}/issues/${issueId}?page=${currentPage - 1}`}
                >
                  Previous
                </Link>
              ) : null}
              {currentPage < totalPages ? (
                <Link
                  className="border rounded px-3 py-1"
                  href={`/projects/${projectId}/issues/${issueId}?page=${currentPage + 1}`}
                >
                  Next
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
