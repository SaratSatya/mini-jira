"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/app/components/ui/button";

type Status = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

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

  const isAssignee = assigneeId === currentUserId;
  const isAdmin = currentUserRole === "ADMIN";

  // "Mark as Complete" — shown only for the assigned member on IN_PROGRESS issues
  const showMarkComplete = status === "IN_PROGRESS" && isAssignee && !isAdmin;

  // "Mark as Done" — shown only to admin when status is IN_REVIEW
  const showMarkDone = isAdmin && status === "IN_REVIEW";
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
        <Button onClick={() => handleStatusChange("IN_REVIEW")} disabled={loading} variant="primary">
          {loading ? "Updating..." : "✅ Mark as Complete"}
        </Button>
      )}

      {showMarkDone && (
        <Button onClick={() => handleStatusChange("DONE")} disabled={loading} variant="primary">
          {loading ? "Updating..." : "🏁 Mark as Done"}
        </Button>
      )}

      {showDelete && (
        <Button onClick={handleDelete} disabled={loading} variant="danger">
          {loading ? "Deleting..." : "🗑️ Delete Issue"}
        </Button>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
