import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/requireSession";
import NewIssueForm from "./NewIssueForm";

export default async function NewIssuePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const session = await requireSession();
  // @ts-expect-error session user extended
  const userId = session.user.id as string;

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true },
  });

  if (!membership) {
    redirect("/projects");
  }

  if (membership.role !== "ADMIN") {
    redirect(`/projects/${projectId}/issues`);
  }

  return <NewIssueForm projectId={projectId} />;
}
