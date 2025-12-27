"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddIssueToSprint({
  sprintId,
  backlogIssues,
  disabled
}: {
  sprintId: string;
  backlogIssues: { id: string; title: string }[];
  disabled?:boolean
}) {
  const router = useRouter();
  const [issueId, setIssueId] = useState(backlogIssues[0]?.id ?? "");
  const [loading, setLoading] = useState(false);

  async function add() {
    if (!issueId) return;

    setLoading(true);
    const res = await fetch(`/api/issues/${issueId}/sprint`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sprintId }),
    });
    setLoading(false);

    if (!res.ok) {
      alert("Failed to add issue to sprint");
      return;
    }

    router.refresh();
  }

  return (
    <div className="border rounded p-3">
      <p className="font-medium">Add issue to sprint</p>

      {backlogIssues.length === 0 ? (
        <p className="text-sm opacity-70 mt-2">No backlog issues available.</p>
      ) : (
        <div className="flex gap-2 mt-2">
          <select
            className="border rounded p-2 flex-1"
            value={issueId}
            onChange={(e) => setIssueId(e.target.value)}
            disabled={loading || disabled}
          >
            {backlogIssues.map((i) => (
              <option key={i.id} value={i.id}>
                {i.title}
              </option>
            ))}
          </select>

          <button className="border rounded px-3 py-2" onClick={add} disabled={loading || disabled}>
            {loading ? "Adding..." : "Add"}
          </button>
        </div>
      )}
    </div>
  );
}
