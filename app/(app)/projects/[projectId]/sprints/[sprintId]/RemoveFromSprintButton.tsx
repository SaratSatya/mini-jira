"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/app/components/ui/button";

export default function RemoveFromSprintButton({
  issueId,
  disabled,
}: {
  issueId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function remove() {
    setLoading(true);
    const res = await fetch(`/api/issues/${issueId}/sprint`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sprintId: null }),
    });
    setLoading(false);

    if (!res.ok) {
      alert("Failed to remove from sprint");
      return;
    }

    router.refresh();
  }

  return (
    <Button variant="ghost" className="text-sm py-1" onClick={remove} disabled={loading || disabled}>
      {loading ? "Removing..." : "Remove"}
    </Button>
  );
}
