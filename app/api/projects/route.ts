import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/requireSession";

const createSchema = z.object({
  name: z.string().min(2).max(50),
  key: z
    .string()
    .min(2)
    .max(10)
    .regex(/^[A-Z0-9]+$/, "Key must be uppercase letters/numbers (e.g. MJ, JIRA1)"),
  description: z.string().max(500).optional().or(z.literal("")),
});

export async function GET() {
  const session = await requireSession();

  // @ts-expect-error added in auth.ts session callback
  const userId = session.user.id as string;

  // fetch projects where user is a member
  const projects = await prisma.project.findMany({
    where: {
      members: { some: { userId } },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      key: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  const session = await requireSession();
  // @ts-expect-error added in auth.ts session callback
  const userId = session.user.id as string;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { name, key, description } = parsed.data;

  // Create project + add creator as ADMIN member in one transaction
  try {
    const project = await prisma.project.create({
      data: {
        name,
        key,
        description: description || null,
        createdById: userId,
        members: {
          create: {
            userId,
            role: "ADMIN",
          },
        },
      },
      select: { id: true, name: true, key: true },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (e: any) {
    // common failure: duplicate key
    return NextResponse.json(
      { error: "Project key already exists. Try another key." },
      { status: 409 }
    );
  }
}
