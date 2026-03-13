"use client";

import { Input } from "@/app/components/ui/input";

type AssigneeOption = { id: string; label: string };

export default function FilterBar({
  query,
  setQuery,
  priority,
  setPriority,
  assigneeId,
  setAssigneeId,
  sort,
  setSort,
  assignees,
}: {
  query: string;
  setQuery: (v: string) => void;

  priority: "ALL" | "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  setPriority: (v: "ALL" | "LOW" | "MEDIUM" | "HIGH" | "URGENT") => void;

  assigneeId: "ALL" | "UNASSIGNED" | string;
  setAssigneeId: (v: "ALL" | "UNASSIGNED" | string) => void;

  sort: "UPDATED_DESC" | "UPDATED_ASC";
  setSort: (v: "UPDATED_DESC" | "UPDATED_ASC") => void;

  assignees: AssigneeOption[];
}) {
  return (
    <div className="mt-4 app-card p-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <Input
        className="border rounded p-2 w-full md:w-80"
        placeholder="Search by title..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <select
          className="app-select"
          value={priority}
          onChange={(e) => setPriority(e.target.value as "ALL" | "LOW" | "MEDIUM" | "HIGH" | "URGENT")}
        >
          <option value="ALL">All priorities</option>
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
          <option value="URGENT">URGENT</option>
        </select>

        <select
          className="app-select"
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value as "ALL" | "UNASSIGNED" | string)}
        >
          <option value="ALL">All assignees</option>
          <option value="UNASSIGNED">Unassigned</option>
          {assignees.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>

        <select
          className="app-select"
          value={sort}
          onChange={(e) => setSort(e.target.value as "UPDATED_DESC" | "UPDATED_ASC")}
        >
          <option value="UPDATED_DESC">Updated: Newest</option>
          <option value="UPDATED_ASC">Updated: Oldest</option>
        </select>
      </div>
    </div>
  );
}
