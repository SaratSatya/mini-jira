"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/app/components/ui/input";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, key: key.toUpperCase().trim(), description }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error ?? "Failed to create project");
      return;
    }

    router.push("/projects");
  }

  return (
    <main className="p-6 max-w-md mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">New Project</h1>
        <Link className="underline" href="/projects">
          Back
        </Link>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <Input
          className="w-full border p-2 rounded"
          placeholder="Project name (e.g. Mini Jira)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <Input
          className="w-full border p-2 rounded"
          placeholder="Project key (e.g. MJ)"
          value={key}
          onChange={(e) => setKey(e.target.value.replace(/\s/g, ""))}
        />

        <textarea
          className="w-full border p-2 rounded"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />

        {err ? <p className="text-sm text-red-500">{err}</p> : null}

        <button disabled={loading} className="w-full border rounded p-2">
          {loading ? "Creating..." : "Create"}
        </button>
      </form>

      <p className="mt-3 text-xs opacity-70">
        Key must be uppercase letters/numbers only (example: MJ, JIRA1).
      </p>
    </main>
  );
}
