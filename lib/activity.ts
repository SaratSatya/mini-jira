import { prisma } from "@/lib/prisma";

export async function logActivity(input: {
  projectId: string;
  actorId: string;
  type:
    | "ISSUE_CREATED"
    | "ISSUE_STATUS_CHANGED"
    | "ISSUE_ASSIGNEE_CHANGED"
    | "ISSUE_COMMENT_ADDED"
    | "ISSUE_SPRINT_CHANGED"
    | "SPRINT_STATUS_CHANGED";
  issueId?: string | null;
  sprintId?: string | null;
  meta?: any;
}) {
  await prisma.activity.create({
    data: {
      projectId: input.projectId,
      actorId: input.actorId,
      type: input.type as any,
      issueId: input.issueId ?? null,
      sprintId: input.sprintId ?? null,
      meta: input.meta ?? null,
    },
  });
}
