"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";

export default function CommentBox({
  issueId,
  projectId,
}: {
  issueId: string;
  projectId: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const trimmed = body.trim();
    if (!trimmed) {
      setErr("Comment cannot be empty");
      return;
    }

    setLoading(true);

    const res = await fetch(`/api/issues/${issueId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: trimmed, projectId }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error ?? "Failed to add comment");
      return;
    }

    setBody("");
    router.refresh(); // ✅ show the new comment instantly
  }

  return (
    <form onSubmit={addComment} className="space-y-2">
      <textarea
        className="w-full border rounded p-2"
        rows={3}
        placeholder="Write a comment..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {err ? <p className="text-sm text-red-500">{err}</p> : null}
      <Button disabled={loading} className="border rounded px-3 py-1">
        {loading ? "Posting..." : "Post comment"}
      </Button>
    </form>
  );
}
