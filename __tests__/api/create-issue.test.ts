import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/projects/[projectId]/issues/route";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    projectMember: { findUnique: vi.fn() },
    issue: { create: vi.fn() },
    activity: { create: vi.fn() },
  },
}));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");

describe("POST /api/projects/[projectId]/issues", () => {
  beforeEach(() => vi.resetAllMocks());

  it("401 if no session", async () => {
    (getServerSession as any).mockResolvedValue(null);

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ title: "X", type: "TASK", priority: "MEDIUM" }),
    });

    const res = await POST(req as any, { params: Promise.resolve({ projectId: "507f1f77bcf86cd799439011" }) });
    expect(res.status).toBe(401);
  });

  it("403 if not a project member", async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: "507f1f77bcf86cd799439012" } });
    (prisma.projectMember.findUnique as any).mockResolvedValue(null);

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ title: "Issue 1", type: "TASK", priority: "MEDIUM" }),
    });

    const res = await POST(req as any, { params: Promise.resolve({ projectId: "507f1f77bcf86cd799439011" }) });
    expect(res.status).toBe(403);
  });

  it("201 creates issue for member", async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: "507f1f77bcf86cd799439012" } });
    (prisma.projectMember.findUnique as any).mockResolvedValue({ role: "MEMBER" });
    (prisma.issue.create as any).mockResolvedValue({ id: "507f1f77bcf86cd799439099" });
    (prisma.activity.create as any).mockResolvedValue({});

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ title: "Issue 1", type: "TASK", priority: "MEDIUM" }),
    });

    const res = await POST(req as any, { params: Promise.resolve({ projectId: "507f1f77bcf86cd799439011" }) });
    expect(res.status).toBe(201);

    expect(prisma.issue.create).toHaveBeenCalled();
    expect(prisma.activity.create).toHaveBeenCalled();
  });
});
