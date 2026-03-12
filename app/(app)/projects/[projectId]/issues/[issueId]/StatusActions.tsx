"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Status = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

type HoveredAction = "complete" | "done" | "delete" | null;

interface Props {
  issueId: string;
  projectId: string;
  status: Status;
  currentUserRole: "ADMIN" | "MEMBER";
  currentUserId: string;
  assigneeId: string | null;
}

export default function StatusActions({
  issueId,
  projectId,
  status,
  currentUserRole,
  currentUserId,
  assigneeId,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredAction, setHoveredAction] = useState<HoveredAction>(null);

  const isAssignee = assigneeId === currentUserId;
  const isAdmin = currentUserRole === "ADMIN";

  // Show "Mark as Complete" to assignee, and also to admins for IN_PROGRESS for reliability.
  const showMarkComplete = status === "IN_PROGRESS" && (isAssignee || isAdmin);

  // "Mark as Done" — shown only to admin when status is IN_REVIEW
  const showMarkDone = isAdmin && status === "IN_REVIEW";

  // "Delete Issue" — shown only to admin when status is DONE
  const showDelete = isAdmin && status === "DONE";

  async function handleStatusChange(newStatus: Status) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to update status");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this issue? This cannot be undone."
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/issues/${issueId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to delete issue");
        return;
      }
      router.push(`/projects/${projectId}/issues`);
    } finally {
      setLoading(false);
    }
  }

  if (!showMarkComplete && !showMarkDone && !showDelete) return null;

  return (
    <div className="mt-6 flex flex-col gap-2">
      {showMarkComplete && (
        <button
          onClick={() => handleStatusChange("IN_REVIEW")}
          disabled={loading}
          onMouseEnter={() => setHoveredAction("complete")}
          onMouseLeave={() => setHoveredAction(null)}
          style={{
            backgroundColor: hoveredAction === "complete" ? "#dcfce7" : "#020817",
            color: hoveredAction === "complete" ? "#14532d" : "#f8fafc",
          }}
          className="border rounded px-4 py-2 font-medium disabled:opacity-50 transition-colors"
        >
          {loading ? "Updating..." : "✅ Mark as Complete"}
        </button>
      )}

      {showMarkDone && (
        <button
          onClick={() => handleStatusChange("DONE")}
          disabled={loading}
          onMouseEnter={() => setHoveredAction("done")}
          onMouseLeave={() => setHoveredAction(null)}
          style={{
            backgroundColor: hoveredAction === "done" ? "#dbeafe" : "#020817",
            color: hoveredAction === "done" ? "#1e3a8a" : "#f8fafc",
          }}
          className="border rounded px-4 py-2 font-medium disabled:opacity-50 transition-colors"
        >
          {loading ? "Updating..." : "🏁 Mark as Done"}
        </button>
      )}

      {showDelete && (
        <button
          onClick={handleDelete}
          disabled={loading}
          onMouseEnter={() => setHoveredAction("delete")}
          onMouseLeave={() => setHoveredAction(null)}
          style={{
            backgroundColor: hoveredAction === "delete" ? "#fee2e2" : "#020817",
            color: hoveredAction === "delete" ? "#b91c1c" : "#ef4444",
          }}
          className="border rounded px-4 py-2 font-medium disabled:opacity-50 transition-colors"
        >
          {loading ? "Deleting..." : "🗑️ Delete Issue"}
        </button>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
