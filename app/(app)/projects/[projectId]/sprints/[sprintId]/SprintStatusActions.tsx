"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SprintStatusActions({
  projectId,
  sprintId,
  status,
  isAdmin,
}: {
  projectId: string;
  sprintId: string;
  status: "PLANNED" | "ACTIVE" | "CLOSED";
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function setStatus(next: "PLANNED" | "ACTIVE" | "CLOSED") {
    setLoading(true);

    const res = await fetch(`/api/projects/${projectId}/sprints/${sprintId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Failed to update sprint status");
      return;
    }

    router.refresh();
  }

  if (!isAdmin) return null;

  return (
    <div className="flex gap-2">
      {status === "PLANNED" ? (
        <button className="border rounded px-3 py-1" disabled={loading} onClick={() => setStatus("ACTIVE")}>
          {loading ? "Starting..." : "Start Sprint"}
        </button>
      ) : null}

      {status === "ACTIVE" ? (
        <button className="border rounded px-3 py-1" disabled={loading} onClick={() => setStatus("CLOSED")}>
          {loading ? "Closing..." : "Close Sprint"}
        </button>
      ) : null}

      {status === "CLOSED" ? (
        <span className="text-sm opacity-70">Sprint is closed</span>
      ) : null}
    </div>
  );
}
