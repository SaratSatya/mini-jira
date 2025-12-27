"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewSprintForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    setLoading(true);
    const res = await fetch(`/api/projects/${projectId}/sprints`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, startDate, endDate }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error ?? "Failed");
      return;
    }

    setName("");
    setStartDate("");
    setEndDate("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="border rounded p-3 space-y-2">
      <p className="font-medium">Create Sprint</p>

      <input className="w-full border rounded p-2" placeholder="Sprint name" value={name} onChange={(e) => setName(e.target.value)} />

      <div className="grid grid-cols-2 gap-2">
        <input className="w-full border rounded p-2" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input className="w-full border rounded p-2" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>

      {err ? <p className="text-sm text-red-500">{err}</p> : null}

      <button disabled={loading} className="border rounded px-3 py-2">
        {loading ? "Creating..." : "Create"}
      </button>
    </form>
  );
}
