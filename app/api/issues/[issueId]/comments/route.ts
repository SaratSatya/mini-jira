import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/activity";


const schema = z.object({
  body: z.string().min(1).max(2000),
  projectId: z.string(), // used for membership check (extra safety)
});

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

export async function POST(
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
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { projectId, body: commentBody } = parsed.data;

  // Verify issue belongs to project and user is a member
  const issue = await prisma.issue.findFirst({
    where: {
      id: issueId,
      projectId,
      project: { members: { some: { userId } } },
    },
    select: { id: true },
  });

  if (!issue) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.comment.create({
    data: {
      issueId,
      authorId: userId,
      body: commentBody,
    },
  });
  await logActivity({
  projectId,
  actorId: userId,
  type: "ISSUE_COMMENT_ADDED",
  issueId,
  meta: { preview: commentBody.slice(0, 80) },
});


  return NextResponse.json({ ok: true }, { status: 201 });
}
