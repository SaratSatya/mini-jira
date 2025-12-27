import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

const createSchema = z.object({
  name: z.string().min(2).max(60),
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
});

async function requireUserId() {
  const session = await getServerSession(authOptions);
  // @ts-expect-error session user extended
  const userId = session?.user?.id as string | undefined;
  return { session, userId };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  if (!objectId.safeParse(projectId).success) {
    return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
  }

  const { session, userId } = await requireUserId();
  if (!session || !userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sprints = await prisma.sprint.findMany({
    where: { projectId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, status: true, startDate: true, endDate: true, createdAt: true },
  });

  return NextResponse.json({ sprints });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  if (!objectId.safeParse(projectId).success) {
    return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
  }

  const { session, userId } = await requireUserId();
  if (!session || !userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only ADMIN can create sprint (simple rule)
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Only ADMIN can create sprints" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : null;
  const endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : null;

  const sprint = await prisma.sprint.create({
    data: {
      projectId,
      name: parsed.data.name,
      startDate,
      endDate,
      status: "PLANNED",
    },
    select: { id: true, name: true },
  });

  return NextResponse.json({ sprint }, { status: 201 });
}
