"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Issue = {
  id: string;
  projectId:string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  type: "TASK" | "BUG" | "STORY";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  storyPoints: number | null;
};

const statuses: Issue["status"][] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

export default function IssueCard({ issue }: { issue: Issue }) {
  const router = useRouter();
  const [status, setStatus] = useState<Issue["status"]>(issue.status);
  const [loading, setLoading] = useState(false);

  async function updateStatus(next: Issue["status"]) {
    const prev = status;
    setStatus(next);
    setLoading(true);

    const res = await fetch(`/api/issues/${issue.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });

    setLoading(false);

    if (!res.ok) {
      setStatus(prev);
      alert("Failed to update status");
      return;
    }

    // ✅ Force server component page to re-fetch data and re-group
    router.refresh();
  }

  return (
    <div className="border rounded p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
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
        </div>

        <div className="flex flex-col gap-2 items-end">
          <select
            className="border rounded p-1 text-sm"
            value={status}
            onChange={(e) => updateStatus(e.target.value as Issue["status"])}
            disabled={loading}
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {loading ? <span className="text-xs opacity-70">Saving...</span> : null}
        </div>
      </div>
    </div>
  );
}
