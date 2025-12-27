import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/activity";


const patchSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]),
});

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ issueId: string }> } // ✅ params is a Promise in your Next version
) {
  const { issueId } = await params; // ✅ FIX (this removes the error)
  const parsedId = objectIdSchema.safeParse(issueId);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid issueId" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // @ts-expect-error - session user extended in auth callbacks
  const userId = session.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Access control: user must be a member of the project for this issue
  const issue = await prisma.issue.findFirst({
    where: {
      id: issueId,
      project: {
        members: { some: { userId } },
      },
    },
    select: { id: true, projectId:true,status:true},
  });

  if (!issue) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.issue.update({
    where: { id: issueId },
    data: { status: parsed.data.status },
  });
  await logActivity({
  projectId: issue.projectId,
  actorId: userId!,
  type: "ISSUE_STATUS_CHANGED",
  issueId: issueId,
  meta: { from: issue.status, to: parsed.data.status },
  });


  return NextResponse.json({ ok: true });
}
