import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "@/app/api/issues/[issueId]/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    issue: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    projectMember: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/activity", () => ({
  logActivity: vi.fn(),
}));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");

describe("PATCH /api/issues/[issueId]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 if no session", async () => {
    (getServerSession as any).mockResolvedValue(null);

    const req = new Request("http://localhost/api/issues/x", {
      method: "PATCH",
      body: JSON.stringify({ status: "DONE" }),
    });

    const res = await PATCH(req as any, {
      params: Promise.resolve({ issueId: "507f1f77bcf86cd799439011" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 if issue not found", async () => {
    (getServerSession as any).mockResolvedValue({
      user: { id: "507f1f77bcf86cd799439012" },
    });
    (prisma.issue.findFirst as any).mockResolvedValue(null);

    const req = new Request("http://localhost/api/issues/x", {
      method: "PATCH",
      body: JSON.stringify({ status: "DONE" }),
    });

    const res = await PATCH(req as any, {
      params: Promise.resolve({ issueId: "507f1f77bcf86cd799439011" }),
    });
    expect(res.status).toBe(404);
  });

  it("allows only assignee to mark IN_PROGRESS as IN_REVIEW", async () => {
    const userId = "507f1f77bcf86cd799439012";
    (getServerSession as any).mockResolvedValue({ user: { id: userId } });
    (prisma.issue.findFirst as any).mockResolvedValue({
      id: "507f1f77bcf86cd799439011",
      projectId: "507f1f77bcf86cd799439001",
      status: "IN_PROGRESS",
      assigneeId: userId,
    });
    (prisma.projectMember.findUnique as any).mockResolvedValue({ role: "MEMBER" });
    (prisma.issue.update as any).mockResolvedValue({});

    const req = new Request("http://localhost/api/issues/x", {
      method: "PATCH",
      body: JSON.stringify({ status: "IN_REVIEW" }),
    });

    const res = await PATCH(req as any, {
      params: Promise.resolve({ issueId: "507f1f77bcf86cd799439011" }),
    });
    expect(res.status).toBe(200);

    expect(prisma.issue.update).toHaveBeenCalledWith({
      where: { id: "507f1f77bcf86cd799439011" },
      data: { status: "IN_REVIEW" },
    });
    (prisma.projectMember.findUnique as any)
      .mockResolvedValueOnce({ role: "ADMIN" })
      .mockResolvedValueOnce({ role: "ADMIN" });

    const req = new Request("http://localhost/api/issues/x", {
      method: "PATCH",
      body: JSON.stringify({ assigneeId: targetAdminId }),
    });

    const res = await PATCH(req as any, {
      params: Promise.resolve({ issueId: "507f1f77bcf86cd799439011" }),
    });

    expect(res.status).toBe(400);
    expect(prisma.issue.update).not.toHaveBeenCalled();
  });

  it("rejects admin from marking IN_PROGRESS as IN_REVIEW even when assigned", async () => {
    const adminUserId = "507f1f77bcf86cd799439012";
    (getServerSession as any).mockResolvedValue({ user: { id: adminUserId } });
    (prisma.issue.findFirst as any).mockResolvedValue({
      id: "507f1f77bcf86cd799439011",
      projectId: "507f1f77bcf86cd799439001",
      status: "IN_PROGRESS",
      assigneeId: adminUserId,
    });
    (prisma.projectMember.findUnique as any).mockResolvedValue({ role: "ADMIN" });

    const req = new Request("http://localhost/api/issues/x", {
      method: "PATCH",
      body: JSON.stringify({ status: "IN_REVIEW" }),
    });

    const res = await PATCH(req as any, {
      params: Promise.resolve({ issueId: "507f1f77bcf86cd799439011" }),
    });

    expect(res.status).toBe(403);
    expect(prisma.issue.update).not.toHaveBeenCalled();
  });

  it("rejects assigning an issue to an admin", async () => {
    const adminUserId = "507f1f77bcf86cd799439012";
    const targetAdminId = "507f1f77bcf86cd799439099";

    (getServerSession as any).mockResolvedValue({ user: { id: adminUserId } });
    (prisma.issue.findFirst as any).mockResolvedValue({
      id: "507f1f77bcf86cd799439011",
      projectId: "507f1f77bcf86cd799439001",
      status: "TODO",
      assigneeId: null,
    });
    (prisma.projectMember.findUnique as any)
      .mockResolvedValueOnce({ role: "ADMIN" })
      .mockResolvedValueOnce({ role: "ADMIN" });

    const req = new Request("http://localhost/api/issues/x", {
      method: "PATCH",
      body: JSON.stringify({ assigneeId: targetAdminId }),
    });

    const res = await PATCH(req as any, {
      params: Promise.resolve({ issueId: "507f1f77bcf86cd799439011" }),
    });

    expect(res.status).toBe(400);
    expect(prisma.issue.update).not.toHaveBeenCalled();
  });
});
