import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER"]).optional(), // default MEMBER
});

async function getUserIdOr401() {
  const session = await getServerSession(authOptions);
  if (!session) return { userId: null, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  // @ts-expect-error session user extended in auth callbacks
  const userId = session.user?.id as string | undefined;
  if (!userId) return { userId: null, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  return { userId, res: null };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  if (!objectIdSchema.safeParse(projectId).success) {
    return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
  }

  const { userId, res } = await getUserIdOr401();
  if (res) return res;

  // Must be a member to view
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: userId! } },
    select: { role: true },
  });

  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const memberships = await prisma.projectMember.findMany({
    where: { projectId },
    orderBy: { role: "asc" },
    select: {
      userId: true,
      role: true,
    },
  });

  const users = await prisma.user.findMany({
    where: { id: { in: memberships.map((m) => m.userId) } },
    select: { id: true, name: true, email: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  return NextResponse.json({
    members: memberships.map((m) => {
      const u = userMap.get(m.userId);
      return {
        role: m.role,
        userId: m.userId,
        name: u?.name ?? null,
        email: u?.email ?? null,
      };
    }),
  });


}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  if (!objectIdSchema.safeParse(projectId).success) {
    return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
  }

  const { userId, res } = await getUserIdOr401();
  if (res) return res;

  // Only ADMIN can add members
  const myMembership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: userId! } },
    select: { role: true },
  });

  if (!myMembership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (myMembership.role !== "ADMIN") return NextResponse.json({ error: "Only ADMIN can add members" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const email = parsed.data.email.toLowerCase().trim();
  const role = parsed.data.role ?? "MEMBER";

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: "User not found. Ask them to register/login once, then add again." },
      { status: 404 }
    );
  }

  try {
    await prisma.projectMember.create({
      data: {
        projectId,
        userId: user.id,
        role,
      },
    });
  } catch {
    return NextResponse.json({ error: "User is already a member" }, { status: 409 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
