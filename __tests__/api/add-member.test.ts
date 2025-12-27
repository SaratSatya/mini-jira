import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/projects/[projectId]/members/route";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    projectMember: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    activity: {
      create: vi.fn(),
    },
  },
}));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");

const PROJECT_ID = "507f1f77bcf86cd799439011";
const ADMIN_ID = "507f1f77bcf86cd799439012";
const TARGET_ID = "507f1f77bcf86cd799439013";
const TARGET_EMAIL = "member@test.com";

describe("POST /api/projects/[projectId]/members", () => {
  beforeEach(() => vi.resetAllMocks());

  it("401 if no session", async () => {
    (getServerSession as any).mockResolvedValue(null);

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ email: TARGET_EMAIL, role: "MEMBER" }),
    });

    const res = await POST(req as any, { params: Promise.resolve({ projectId: PROJECT_ID }) });
    expect(res.status).toBe(401);
  });

  it("403 if not admin", async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: ADMIN_ID } });

    // route likely finds user by email first
    (prisma.user.findUnique as any).mockResolvedValue({ id: TARGET_ID, email: TARGET_EMAIL });

    // requester membership check => MEMBER (not admin)
    (prisma.projectMember.findUnique as any).mockImplementation(({ where }: any) => {
      const uid = where?.projectId_userId?.userId;
      if (uid === ADMIN_ID) return Promise.resolve({ role: "MEMBER" });
      return Promise.resolve(null);
    });

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ email: TARGET_EMAIL, role: "MEMBER" }),
    });

    const res = await POST(req as any, { params: Promise.resolve({ projectId: PROJECT_ID }) });
    expect(res.status).toBe(403);
  });

  it("201 if admin adds member", async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: ADMIN_ID } });

    // route likely checks user exists by email
    (prisma.user.findUnique as any).mockResolvedValue({ id: TARGET_ID, email: TARGET_EMAIL });

    // membership checks:
    // - requester must be ADMIN
    // - target must NOT already be a member
    (prisma.projectMember.findUnique as any).mockImplementation(({ where }: any) => {
      const uid = where?.projectId_userId?.userId;
      if (uid === ADMIN_ID) return Promise.resolve({ role: "ADMIN" }); // requester
      if (uid === TARGET_ID) return Promise.resolve(null);            // target not in project
      return Promise.resolve(null);
    });

    (prisma.projectMember.create as any).mockResolvedValue({ id: "pm1" });
    (prisma.activity.create as any).mockResolvedValue({});

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ email: TARGET_EMAIL, role: "MEMBER" }),
    });

    const res = await POST(req as any, { params: Promise.resolve({ projectId: PROJECT_ID }) });

    // if it fails again, uncomment:
    // console.log(res.status, await res.json().catch(() => null));

    expect(res.status).toBe(201);
    expect(prisma.projectMember.create).toHaveBeenCalled();
  });
});
