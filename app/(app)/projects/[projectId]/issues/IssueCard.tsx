"use client";

import Link from "next/link";
import { useState } from "react";

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
  assigneeId: string | null;
};

interface Props {
  issue: Issue;
  currentUserRole: "ADMIN" | "MEMBER";
  currentUserId: string;
  onDeleted: () => void;
}

export default function IssueCard({
  issue,
  currentUserRole,
  onDeleted,
}: Props) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = currentUserRole === "ADMIN" && issue.status === "DONE";

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${issue.title}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/issues/${issue.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Delete failed");
        return;
      }
      onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="app-card p-3">
      <Link
        className="font-medium hover:underline"
        href={`/projects/${issue.projectId}/issues/${issue.id}`}
      >
        {issue.title}
      </Link>

      <p className="text-xs opacity-70 mt-1">
        {issue.type} • {issue.priority}
        {issue.storyPoints != null ? ` • SP: ${issue.storyPoints}` : ""}
      </p>

      {issue.description ? (
        <p className="text-sm mt-2 opacity-90 line-clamp-2">{issue.description}</p>
      ) : null}

      {canDelete && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="mt-2 text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "🗑️ Delete"}
        </button>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}