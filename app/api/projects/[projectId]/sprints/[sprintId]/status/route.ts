import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/activity";


const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

const schema = z.object({
  status: z.enum(["PLANNED", "ACTIVE", "CLOSED"]),
});

const allowedTransitions: Record<string, string[]> = {
  PLANNED: ["ACTIVE"],
  ACTIVE: ["CLOSED"],
  CLOSED: [],
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string; sprintId: string }> }
) {
  const { projectId, sprintId } = await params;

  if (!objectId.safeParse(projectId).success || !objectId.safeParse(sprintId).success) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // @ts-expect-error session user extended
  const userId = session.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only ADMIN can change sprint status
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (membership.role !== "ADMIN") return NextResponse.json({ error: "Only ADMIN can change sprint status" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const sprint = await prisma.sprint.findFirst({
    where: { id: sprintId, projectId },
    select: { id: true, status: true },
  });
  if (!sprint) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const next = parsed.data.status;
  const current = sprint.status;

  if (!allowedTransitions[current].includes(next)) {
    return NextResponse.json(
      { error: `Invalid transition: ${current} -> ${next}` },
      { status: 400 }
    );
  }

  await prisma.sprint.update({
    where: { id: sprintId },
    data: { status: next },
  });

  await logActivity({
  projectId,
  actorId: userId,
  type: "SPRINT_STATUS_CHANGED",
  sprintId,
  meta: { from: current, to: next },
});


  return NextResponse.json({ ok: true });
}
