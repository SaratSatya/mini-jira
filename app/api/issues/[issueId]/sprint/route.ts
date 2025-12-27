import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/activity";


const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

const schema = z.object({
  sprintId: z.string().nullable(), // null = remove from sprint
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ issueId: string }> }
) {
  const { issueId } = await params;

  if (!objectId.safeParse(issueId).success) {
    return NextResponse.json({ error: "Invalid issueId" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // @ts-expect-error session user extended
  const userId = session.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Issue must belong to a project where requester is a member
  const issue = await prisma.issue.findFirst({
    where: {
      id: issueId,
      project: { members: { some: { userId } } },
    },
    select: { id: true, projectId: true },
  });

  if (!issue) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // after you verify `issue` exists
  const current = await prisma.issue.findUnique({
      where: { id: issueId },
      select: { sprintId: true },
  });

  const sprintId = parsed.data.sprintId;

// ✅ if removing from sprint, block if current sprint is CLOSED
  if (sprintId === null && current?.sprintId) {
    const currentSprint = await prisma.sprint.findFirst({
      where: { id: current.sprintId, projectId: issue.projectId },
      select: { status: true },
    });

    if (currentSprint?.status === "CLOSED") {
      return NextResponse.json({ error: "Cannot modify a CLOSED sprint" }, { status: 400 });
    }
  }

// ✅ if adding to sprint, validate sprint exists + not CLOSED
  if (sprintId !== null) {
    if (!objectId.safeParse(sprintId).success) {
      return NextResponse.json({ error: "Invalid sprintId" }, { status: 400 });
    }
    const sprint = await prisma.sprint.findFirst({
      where: { id: sprintId, projectId: issue.projectId },
      select: { status: true },
    });

    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found for this project" }, { status: 404 });
    }
    if (sprint.status === "CLOSED") {
      return NextResponse.json({ error: "Cannot modify a CLOSED sprint" }, { status: 400 });
    }
  }

  await prisma.issue.update({
    where: { id: issueId },
    data: { sprintId },
  });

  await logActivity({
    projectId: issue.projectId,
    actorId: userId,
    type: "ISSUE_SPRINT_CHANGED",
    issueId,
    sprintId: sprintId ?? current?.sprintId ?? null,
    meta: { from: current?.sprintId ?? null, to: sprintId },
  });



  return NextResponse.json({ ok: true });
}
