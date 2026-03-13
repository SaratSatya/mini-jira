"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";

export default function NewIssueForm({ projectId }: { projectId: string }) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"TASK" | "BUG" | "STORY">("TASK");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [storyPoints, setStoryPoints] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const res = await fetch(`/api/projects/${projectId}/issues`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, type, priority, storyPoints }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error ?? "Failed to create issue");
      return;
    }

    router.push(`/projects/${projectId}/issues`);
  }

  return (
    <main className="p-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Create Issue</h1>
        <Link className="underline" href={`/projects/${projectId}`}>
          Back
        </Link>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <Input
          className="w-full border p-2 rounded"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="w-full border p-2 rounded"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm opacity-70">Type</label>
            <select
              className="w-full border rounded p-2 bg-slate-950 text-slate-100"
              value={type}
              onChange={(e) => setType(e.target.value as "TASK" | "BUG" | "STORY")}
            >
              <option className="bg-white text-black" value="TASK">TASK</option>
              <option className="bg-white text-black" value="BUG">BUG</option>
              <option className="bg-white text-black" value="STORY">STORY</option>
            </select>
          </div>

          <div>
            <label className="text-sm opacity-70">Priority</label>
            <select
              className="w-full border rounded p-2 bg-slate-950 text-slate-100"
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as "LOW" | "MEDIUM" | "HIGH" | "URGENT")
              }
            >
              <option className="bg-white text-black" value="LOW">LOW</option>
              <option className="bg-white text-black" value="MEDIUM">MEDIUM</option>
              <option className="bg-white text-black" value="HIGH">HIGH</option>
              <option className="bg-white text-black" value="URGENT">URGENT</option>
            </select>
          </div>
        </div>

        <Input
          className="w-full border p-2 rounded"
          placeholder="Story points (optional)"
          value={storyPoints}
          onChange={(e) => setStoryPoints(e.target.value)}
        />

        {err ? <p className="text-sm text-red-500">{err}</p> : null}

        <Button disabled={loading} className="w-full border rounded p-2">
          {loading ? "Creating..." : "Create"}
        </Button>
      </form>
    </main>
  );
}
