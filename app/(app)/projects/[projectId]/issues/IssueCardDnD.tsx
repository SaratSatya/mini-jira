"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";

type Status = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

type Issue = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: Status;
  type: "TASK" | "BUG" | "STORY";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  storyPoints: number | null;
};

export default function IssueCardDnD({ issue }: { issue: Issue }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: issue.id,
  });

  const style: React.CSSProperties | undefined = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`border rounded p-3 cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-60" : ""
      }`}
    >
      <Link className="font-medium underline" href={`/projects/${issue.projectId}/issues/${issue.id}`}>
        {issue.title}
      </Link>

      <p className="text-xs opacity-70 mt-1">
        {issue.type} • {issue.priority}
        {issue.storyPoints != null ? ` • SP: ${issue.storyPoints}` : ""}
      </p>

      {issue.description ? (
        <p className="text-sm mt-2 opacity-90">{issue.description}</p>
      ) : null}

      <p className="text-xs opacity-60 mt-2">Drag me</p>
    </div>
  );
}
