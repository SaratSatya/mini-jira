import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/activity";


const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

const schema = z.object({
  assigneeId: z.string().nullable(), // null = unassign
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ issueId: string }> }
) {
  const { issueId } = await params;

  if (!objectIdSchema.safeParse(issueId).success) {
    return NextResponse.json({ error: "Invalid issueId" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // @ts-expect-error session user extended
  const userId = session.user.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const issue = await prisma.issue.findFirst({
    where: {
      id: issueId,
      project: { members: { some: { userId } } }, // requester must be a member
    },
    select: { id: true, projectId: true },
  });

  if (!issue) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const assigneeId = parsed.data.assigneeId;

  if (assigneeId !== null) {
    if (!objectIdSchema.safeParse(assigneeId).success) {
      return NextResponse.json({ error: "Invalid assigneeId" }, { status: 400 });
    }

    // assignee must be a member of the same project
    const isMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: issue.projectId, userId: assigneeId } },
      select: { userId: true },
    });

    if (!isMember) {
      return NextResponse.json({ error: "Assignee must be a project member" }, { status: 400 });
    }
  }

  const current = await prisma.issue.findUnique({
  where: { id: issueId },
  select: { assigneeId: true },
  });


  await prisma.issue.update({
    where: { id: issueId },
    data: { assigneeId },
  });

  await logActivity({
  projectId: issue.projectId,
  actorId: userId,
  type: "ISSUE_ASSIGNEE_CHANGED",
  issueId,
  meta: { from: current?.assigneeId ?? null, to: assigneeId },
});


  return NextResponse.json({ ok: true });
}
