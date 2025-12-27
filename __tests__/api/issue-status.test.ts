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
    activity:{
      create:vi.fn(),
    }
  },
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

    const res = await PATCH(req as any, { params: Promise.resolve({ issueId: "507f1f77bcf86cd799439011" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 if issue not found", async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: "507f1f77bcf86cd799439012" } });
    (prisma.issue.findFirst as any).mockResolvedValue(null);

    const req = new Request("http://localhost/api/issues/x", {
      method: "PATCH",
      body: JSON.stringify({ status: "DONE" }),
    });

    const res = await PATCH(req as any, { params: Promise.resolve({ issueId: "507f1f77bcf86cd799439011" }) });
    expect(res.status).toBe(404);
  });

  it("updates status when authorized + member", async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: "507f1f77bcf86cd799439012" } });
    (prisma.issue.findFirst as any).mockResolvedValue({ id: "507f1f77bcf86cd799439011", projectId: "p1", status: "TODO" });
    (prisma.issue.update as any).mockResolvedValue({});
    (prisma.activity.create as any).mockResolvedValue({});


    const req = new Request("http://localhost/api/issues/x", {
      method: "PATCH",
      body: JSON.stringify({ status: "DONE" }),
    });

    const res = await PATCH(req as any, { params: Promise.resolve({ issueId: "507f1f77bcf86cd799439011" }) });
    expect(res.status).toBe(200);

    expect(prisma.issue.update).toHaveBeenCalledWith({
      where: { id: "507f1f77bcf86cd799439011" },
      data: { status: "DONE" },
    });
  });
});
