"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddMemberForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setErr("Email is required");
      return;
    }

    setLoading(true);
    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmed, role }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error ?? "Failed to add member");
      return;
    }

    setEmail("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="border rounded p-3 space-y-2">
      <p className="font-medium">Add member</p>

      <input
        className="w-full border rounded p-2"
        placeholder="user@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <div className="flex gap-2 items-center">
        <select
          className="border rounded p-2"
          value={role}
          onChange={(e) => setRole(e.target.value as any)}
        >
          <option value="MEMBER">MEMBER</option>
          <option value="ADMIN">ADMIN</option>
        </select>

        <button disabled={loading} className="border rounded px-3 py-2">
          {loading ? "Adding..." : "Add"}
        </button>
      </div>

      {err ? <p className="text-sm text-red-500">{err}</p> : null}
      <p className="text-xs opacity-70">
        Note: user must have registered/logged-in at least once (so they exist in DB).
      </p>
    </form>
  );
}
