import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const patchSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  assigneeId: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
});

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

async function getSessionUserId() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  // @ts-expect-error - session user extended in auth callbacks
  return (session.user?.id as string | undefined) ?? null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ issueId: string }> }
) {
  const { issueId } = await params;
  if (!objectIdSchema.safeParse(issueId).success) {
    return NextResponse.json({ error: "Invalid issueId" }, { status: 400 });
  }

  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Fetch the issue + caller's role in one go
  const issue = await prisma.issue.findFirst({
    where: {
      id: issueId,
      project: { members: { some: { userId } } },
    },
    select: {
      id: true,
      projectId: true,
      status: true,
      assigneeId: true,
    },
  });

  if (!issue) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: issue.projectId, userId } },
    select: { role: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isAdmin = membership.role === "ADMIN";
  const { assigneeId, status } = parsed.data;

  // ── Assignee change: ADMIN only ──────────────────────────────────────────
  if (assigneeId !== undefined) {
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only ADMIN can assign issues" },
        { status: 403 }
      );
    }

    // When assigning → auto-move to IN_PROGRESS
    // When unassigning (null) → move back to TODO
    const newStatus = assigneeId !== null ? "IN_PROGRESS" : "TODO";

    await prisma.issue.update({
      where: { id: issueId },
      data: { assigneeId, status: newStatus },
    });

    await logActivity({
      projectId: issue.projectId,
      actorId: userId,
      type: "ISSUE_ASSIGNEE_CHANGED",
      issueId,
      meta: { assigneeId, newStatus },
    });

    if (issue.status !== newStatus) {
      await logActivity({
        projectId: issue.projectId,
        actorId: userId,
        type: "ISSUE_STATUS_CHANGED",
        issueId,
        meta: { from: issue.status, to: newStatus },
      });
    }

    return NextResponse.json({ ok: true });
  }

  // ── Status change: role-gated ─────────────────────────────────────────────
  if (status !== undefined) {
    // IN_PROGRESS -> IN_REVIEW can only be done by the current assignee
    if (status === "IN_REVIEW") {
      if (issue.status !== "IN_PROGRESS") {
        return NextResponse.json(
          { error: "Issue must be IN_PROGRESS before moving to IN_REVIEW" },
          { status: 403 }
        );
      }
      if (issue.assigneeId !== userId) {
        return NextResponse.json(
          { error: "Only the assigned user can mark this issue as IN_REVIEW" },
          { status: 403 }
        );
      }
    }

    // MEMBER can only move their own assigned issue -> IN_REVIEW
    if (!isAdmin) {
      if (issue.assigneeId !== userId) {
        return NextResponse.json(
          { error: "You can only update issues assigned to you" },
          { status: 403 }
        );
      }
      if (issue.status !== "IN_PROGRESS" || status !== "IN_REVIEW") {
        return NextResponse.json(
          { error: "Members can only mark their IN_PROGRESS issue as IN_REVIEW" },
          { status: 403 }
        );
      }
    }

    // ADMIN can only move IN_REVIEW -> DONE
    if (isAdmin && status === "DONE" && issue.status !== "IN_REVIEW") {
      return NextResponse.json(
        { error: "Admin can only mark IN_REVIEW issues as DONE" },
        { status: 403 }
      );
    }

    await prisma.issue.update({
      where: { id: issueId },
      data: { status },
    });

    await logActivity({
      projectId: issue.projectId,
      actorId: userId,
      type: "ISSUE_STATUS_CHANGED",
      issueId,
      meta: { from: issue.status, to: status },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
}

// ── DELETE: only allowed when status is DONE ─────────────────────────────────
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ issueId: string }> }
) {
  const { issueId } = await params;
  if (!objectIdSchema.safeParse(issueId).success) {
    return NextResponse.json({ error: "Invalid issueId" }, { status: 400 });
  }

  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const issue = await prisma.issue.findFirst({
    where: {
      id: issueId,
      project: { members: { some: { userId } } },
    },
    select: { id: true, projectId: true, status: true },
  });

  if (!issue) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: issue.projectId, userId } },
    select: { role: true },
  });

  if (!membership || membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Only ADMIN can delete issues" }, { status: 403 });
  }

  if (issue.status !== "DONE") {
    return NextResponse.json(
      { error: "Issues can only be deleted when they are in DONE status" },
      { status: 400 }
    );
  }

  // Delete dependent records first (Activity has no onDelete cascade in schema)
  await prisma.activity.deleteMany({ where: { issueId } });
  await prisma.issue.delete({ where: { id: issueId } });

  return NextResponse.json({ ok: true });
}