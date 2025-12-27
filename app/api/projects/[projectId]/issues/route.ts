import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/activity";


const createIssueSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(2000).optional().or(z.literal("")),
  type: z.enum(["TASK", "BUG", "STORY"]).default("TASK"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  storyPoints: z
    .union([z.number().int().min(0).max(100), z.string()])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (typeof v === "number") return v;
      const trimmed = v.trim();
      if (!trimmed) return undefined;
      const n = Number(trimmed);
      return Number.isFinite(n) ? Math.trunc(n) : undefined;
    }),
});

async function getUserIdOr401() {
  const session = await getServerSession(authOptions);
  if (!session)
    return {
      userId: null,
      res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };

  // @ts-expect-error session user extended in auth callbacks
  const userId = session.user.id as string | undefined;
  if (!userId)
    return {
      userId: null,
      res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };

  return { userId, res: null };
}

/* ---------------- GET ---------------- */

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params; // ✅ FIX

   if (!projectId || projectId === "undefined") {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  const { userId, res } = await getUserIdOr401();
  if (res) return res;

  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId },
    },
    select: { role: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const issues = await prisma.issue.findMany({
    where: { projectId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      type: true,
      priority: true,
      storyPoints: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ issues });
}

/* ---------------- POST ---------------- */


export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params; // ✅ FIX

   if (!projectId || projectId === "undefined") {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  const { userId, res } = await getUserIdOr401();
  if (res) return res;

  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId },
    },
    select: { role: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createIssueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { title, description, type, priority, storyPoints } = parsed.data;

  const issue = await prisma.issue.create({
    data: {
      projectId,
      title,
      description: description || null,
      type,
      priority,
      storyPoints: storyPoints ?? null,
      reporterId: userId!,
    },
    select: { id: true },
  });
  await logActivity({
  projectId,
  actorId: userId!,
  type: "ISSUE_CREATED",
  issueId: issue.id,
  meta: { title },
});


  return NextResponse.json({ issue }, { status: 201 });
}
