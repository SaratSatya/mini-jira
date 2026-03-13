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
  const [error, setError] = useState<string | null>(null);

  async function onChange(next: string) {
    setValue(next);
    setLoading(true);
    setError(null);

    // ✅ Use the main PATCH route with assigneeId (auto-sets IN_PROGRESS)
    const res = await fetch(`/api/issues/${issueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigneeId: next ? next : null }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to assign");
      setValue(currentAssigneeId ?? ""); // revert dropdown
      return;
    }

    router.refresh();
  }

  return (
    <div className="border rounded p-3">
      <p className="font-medium">Assignee</p>

      <select
        className="border rounded p-2 mt-2 w-full bg-slate-950 text-slate-100"
        value={value}
        disabled={loading}
        onChange={(e) => onChange(e.target.value)}
      >
        <option className="bg-white text-black" value="">Unassigned</option>
        {members.map((m) => (
          <option className="bg-white text-black" key={m.userId} value={m.userId}>
            {m.name ?? m.email ?? m.userId}
          </option>
        ))}
      </select>

      {loading && <p className="text-xs opacity-70 mt-2">Saving...</p>}
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}
