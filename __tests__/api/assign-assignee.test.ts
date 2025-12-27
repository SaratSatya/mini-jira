import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "@/app/api/issues/[issueId]/assignee/route";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    issue: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    projectMember: { findUnique: vi.fn() },
    activity: { create: vi.fn() },
  },
}));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");

describe("PATCH /api/issues/[issueId]/assignee", () => {
  beforeEach(() => vi.resetAllMocks());

  it("401 if no session", async () => {
    (getServerSession as any).mockResolvedValue(null);

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ assigneeId: "507f1f77bcf86cd799439013" }),
    });

    const res = await PATCH(req as any, { params: Promise.resolve({ issueId: "507f1f77bcf86cd799439011" }) });
    expect(res.status).toBe(401);
  });

  it("404 if issue not found (or not member)", async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: "507f1f77bcf86cd799439012" } });
    (prisma.issue.findFirst as any).mockResolvedValue(null);

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ assigneeId: "507f1f77bcf86cd799439013" }),
    });

    const res = await PATCH(req as any, { params: Promise.resolve({ issueId: "507f1f77bcf86cd799439011" }) });
    expect(res.status).toBe(404);
  });

  it("200 updates assignee + logs", async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: "507f1f77bcf86cd799439012" } });
    (prisma.issue.findFirst as any).mockResolvedValue({ id: "507f1f77bcf86cd799439011", projectId: "p1" });
    (prisma.issue.findUnique as any).mockResolvedValue({ assigneeId: null });
    (prisma.issue.update as any).mockResolvedValue({});
    (prisma.activity.create as any).mockResolvedValue({});
    (prisma.projectMember.findUnique as any).mockResolvedValue({ role: "MEMBER" });

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ assigneeId: "507f1f77bcf86cd799439013" }),
    });

    const res = await PATCH(req as any, { params: Promise.resolve({ issueId: "507f1f77bcf86cd799439011" }) });
    expect(res.status).toBe(200);

    expect(prisma.issue.update).toHaveBeenCalledWith({
      where: { id: "507f1f77bcf86cd799439011" },
      data: { assigneeId: "507f1f77bcf86cd799439013" },
    });
    expect(prisma.activity.create).toHaveBeenCalled();
  });
});
