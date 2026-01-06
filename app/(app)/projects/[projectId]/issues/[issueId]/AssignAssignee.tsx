"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AssignAssignee({
  issueId,
  currentAssigneeId,
  members,
}: {
  issueId: string;
  currentAssigneeId: string | null;
  members: { userId: string; name: string | null; email: string | null }[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentAssigneeId ?? "");
  const [loading, setLoading] = useState(false);

  async function onChange(next: string) {
    setValue(next);
    setLoading(true);

    const res = await fetch(`/api/issues/${issueId}/assignee`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigneeId: next ? next : null }),
    });

    setLoading(false);

    if (!res.ok) {
      alert("Failed to assign");
      router.refresh();
      return;
    }

    router.refresh();
  }

  return (
    <div className="border rounded p-3">
      <p className="font-medium">Assignee</p>

      <select
        className="border rounded p-2 mt-2 w-full"
        value={value}
        disabled={loading}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Unassigned</option>
        {members.map((m) => (
          <option key={m.userId} value={m.userId}>
            {m.name ?? m.email ?? m.userId}
          </option>
        ))}
      </select>

      {loading ? <p className="text-xs opacity-70 mt-2">Saving...</p> : null}
    </div>
  );
}
