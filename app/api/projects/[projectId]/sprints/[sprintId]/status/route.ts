import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

const bodySchema = z.object({
  status: z.enum(["ACTIVE", "CLOSED"]),
  // Frontend sends this as true after the admin confirms the popup warning
  confirmCloseWithIncomplete: z.boolean().optional().default(false),
});

async function requireUserId() {
  const session = await getServerSession(authOptions);
  // @ts-expect-error session user extended
  const userId = session?.user?.id as string | undefined;
  return { session, userId };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string; sprintId: string }> }
) {
  const { projectId, sprintId } = await params;

  if (!objectId.safeParse(projectId).success || !objectId.safeParse(sprintId).success) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { session, userId } = await requireUserId();
  if (!session || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only ADMIN can change sprint status
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true },
  });

  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (membership.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only ADMIN can change sprint status" },
      { status: 403 }
    );
  }

  const sprint = await prisma.sprint.findFirst({
    where: { id: sprintId, projectId },
    select: { id: true, status: true },
  });

  if (!sprint) return NextResponse.json({ error: "Sprint not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { status: newStatus, confirmCloseWithIncomplete } = parsed.data;

  // ── Validate transitions ────��─────────────────────────────────────────────
  if (sprint.status === "CLOSED") {
    return NextResponse.json({ error: "Sprint is already closed" }, { status: 400 });
  }
  if (newStatus === "ACTIVE" && sprint.status !== "PLANNED") {
    return NextResponse.json(
      { error: "Only PLANNED sprints can be started" },
      { status: 400 }
    );
  }

  // ── Closing: check for incomplete issues ─────────────────────────────────
  if (newStatus === "CLOSED") {
    const incompleteIssues = await prisma.issue.findMany({
      where: {
        sprintId,
        status: { not: "DONE" },
      },
      select: { id: true, title: true, status: true },
    });

    if (incompleteIssues.length > 0 && !confirmCloseWithIncomplete) {
      // Return 409 with the list so the frontend can show the confirmation popup
      return NextResponse.json(
        {
          requiresConfirmation: true,
          incompleteCount: incompleteIssues.length,
          message: `This sprint has ${incompleteIssues.length} incomplete issue(s). Closing will remove them from the sprint. Confirm to proceed.`,
        },
        { status: 409 }
      );
    }

    // Admin confirmed → detach incomplete issues from sprint (set sprintId to null)
    if (incompleteIssues.length > 0) {
      await prisma.issue.updateMany({
        where: { sprintId, status: { not: "DONE" } },
        data: { sprintId: null },
      });
    }
  }

  // ── Apply status update ───────────────────────────────────────────────────
  await prisma.sprint.update({
    where: { id: sprintId },
    data: {
      status: newStatus,
      ...(newStatus === "ACTIVE" ? { startDate: new Date() } : {}),
      ...(newStatus === "CLOSED" ? { endDate: new Date() } : {}),
    },
  });

  await logActivity({
    projectId,
    actorId: userId,
    type: "SPRINT_STATUS_CHANGED",
    sprintId,
    meta: { from: sprint.status, to: newStatus },
  });

  return NextResponse.json({ ok: true });
}