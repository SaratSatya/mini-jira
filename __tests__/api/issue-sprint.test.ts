import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "@/app/api/issues/[issueId]/sprint/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    issue: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    projectMember: {
      findUnique: vi.fn(),
    },
    sprint: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/activity", () => ({
  logActivity: vi.fn(),
}));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");

describe("PATCH /api/issues/[issueId]/sprint", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects MEMBER when trying to add issue to sprint", async () => {
    const userId = "507f1f77bcf86cd799439012";

    (getServerSession as any).mockResolvedValue({ user: { id: userId } });
    (prisma.issue.findFirst as any).mockResolvedValue({
      id: "507f1f77bcf86cd799439011",
      projectId: "507f1f77bcf86cd799439001",
    });
    (prisma.projectMember.findUnique as any).mockResolvedValue({ role: "MEMBER" });
    (prisma.issue.findUnique as any).mockResolvedValue({ sprintId: null });

    const req = new Request("http://localhost/api/issues/x/sprint", {
      method: "PATCH",
      body: JSON.stringify({ sprintId: "507f1f77bcf86cd799439099" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req as any, {
      params: Promise.resolve({ issueId: "507f1f77bcf86cd799439011" }),
    });

    expect(res.status).toBe(403);
    expect(prisma.issue.update).not.toHaveBeenCalled();
  });

  it("rejects MEMBER when trying to remove issue from sprint", async () => {
    const userId = "507f1f77bcf86cd799439012";

    (getServerSession as any).mockResolvedValue({ user: { id: userId } });
    (prisma.issue.findFirst as any).mockResolvedValue({
      id: "507f1f77bcf86cd799439011",
      projectId: "507f1f77bcf86cd799439001",
    });
    (prisma.projectMember.findUnique as any).mockResolvedValue({ role: "MEMBER" });
    (prisma.issue.findUnique as any).mockResolvedValue({
      sprintId: "507f1f77bcf86cd799439099",
    });

    const req = new Request("http://localhost/api/issues/x/sprint", {
      method: "PATCH",
      body: JSON.stringify({ sprintId: null }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req as any, {
      params: Promise.resolve({ issueId: "507f1f77bcf86cd799439011" }),
    });

    expect(res.status).toBe(403);
    expect(prisma.issue.update).not.toHaveBeenCalled();
  });

  it("allows ADMIN to remove issue from ACTIVE sprint", async () => {
    const adminUserId = "507f1f77bcf86cd799439012";

    (getServerSession as any).mockResolvedValue({ user: { id: adminUserId } });
    (prisma.issue.findFirst as any).mockResolvedValue({
      id: "507f1f77bcf86cd799439011",
      projectId: "507f1f77bcf86cd799439001",
    });
    (prisma.projectMember.findUnique as any).mockResolvedValue({ role: "ADMIN" });
    (prisma.issue.findUnique as any).mockResolvedValue({
      sprintId: "507f1f77bcf86cd799439099",
    });
    (prisma.sprint.findFirst as any).mockResolvedValue({ status: "ACTIVE" });
    (prisma.issue.update as any).mockResolvedValue({});

    const req = new Request("http://localhost/api/issues/x/sprint", {
      method: "PATCH",
      body: JSON.stringify({ sprintId: null }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req as any, {
      params: Promise.resolve({ issueId: "507f1f77bcf86cd799439011" }),
    });

    expect(res.status).toBe(200);
    expect(prisma.issue.update).toHaveBeenCalledWith({
      where: { id: "507f1f77bcf86cd799439011" },
      data: { sprintId: null },
    });
  });
});
