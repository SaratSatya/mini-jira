"use client";

import { useMemo, useState } from "react";
import IssueCard from "./IssueCard";
import FilterBar from "./FilterBar";
import { Card } from "@/app/components/ui/card";

type Status = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

type Issue = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: Status;
  type: "TASK" | "BUG" | "STORY";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  storyPoints: number | null;
  assigneeId: string | null;
  updatedAt: string;
};

interface Props {
  initialIssues: Issue[];
  currentUserRole: "ADMIN" | "MEMBER";
  currentUserId: string;
}

export default function KanbanBoard({
  initialIssues,
  currentUserRole,
  currentUserId,
}: Props) {
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<"ALL" | "LOW" | "MEDIUM" | "HIGH" | "URGENT">("ALL");
  const [assigneeId, setAssigneeId] = useState<"ALL" | "UNASSIGNED" | string>("ALL");
  const [sort, setSort] = useState<"UPDATED_DESC" | "UPDATED_ASC">("UPDATED_DESC");
  const [issues, setIssues] = useState<Issue[]>(initialIssues);

  const isAdmin = currentUserRole === "ADMIN";

  // Columns visible depend on role:
  // MEMBER: only TODO and their own IN_PROGRESS
  // ADMIN: all four columns
  const columns: { key: Status; title: string }[] = isAdmin
    ? [
        { key: "TODO", title: "To Do" },
        { key: "IN_PROGRESS", title: "In Progress" },
        { key: "IN_REVIEW", title: "In Review" },
        { key: "DONE", title: "Done" },
      ]
    : [
        { key: "TODO", title: "To Do" },
        { key: "IN_PROGRESS", title: "In Progress" },
      ];

  const assignees = useMemo(() => {
    const set = new Map<string, string>();
    for (const i of issues) {
      if (i.assigneeId) set.set(i.assigneeId, i.assigneeId.slice(-6));
    }
    return Array.from(set.entries()).map(([id, label]) => ({
      id,
      label: `User...${label}`,
    }));
  }, [issues]);

  const filteredIssues = useMemo(() => {
    const q = query.trim().toLowerCase();

    const list = issues.filter((i) => {
      // Members only see TODO (for everyone) and their own IN_PROGRESS
      if (!isAdmin) {
        if (i.status === "IN_REVIEW" || i.status === "DONE") return false;
        if (i.status === "IN_PROGRESS" && i.assigneeId !== currentUserId) return false;
      }

      if (q && !i.title.toLowerCase().includes(q)) return false;
      if (priority !== "ALL" && i.priority !== priority) return false;

      if (assigneeId === "UNASSIGNED") {
        if (i.assigneeId !== null) return false;
      } else if (assigneeId !== "ALL") {
        if (i.assigneeId !== assigneeId) return false;
      }

      return true;
    });

    list.sort((a, b) => {
      const ta = new Date(a.updatedAt).getTime();
      const tb = new Date(b.updatedAt).getTime();
      return sort === "UPDATED_DESC" ? tb - ta : ta - tb;
    });

    return list;
  }, [issues, query, priority, assigneeId, sort, isAdmin, currentUserId]);

  const grouped = useMemo(() => {
    const map: Record<Status, Issue[]> = {
      TODO: [],
      IN_PROGRESS: [],
      IN_REVIEW: [],
      DONE: [],
    };
    for (const i of filteredIssues) map[i.status].push(i);
    return map;
  }, [filteredIssues]);

  function handleIssueRemoved(issueId: string) {
    setIssues((cur) => cur.filter((i) => i.id !== issueId));
  }

  return (
    <div>
      <FilterBar
        query={query}
        setQuery={setQuery}
        priority={priority}
        setPriority={setPriority}
        assigneeId={assigneeId}
        setAssigneeId={setAssigneeId}
        sort={sort}
        setSort={setSort}
        assignees={assignees}
      />

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {columns.map((col) => (
          <KanbanColumn
            key={col.key}
            id={col.key}
            title={col.title}
            issues={grouped[col.key]}
            currentUserRole={currentUserRole}
            currentUserId={currentUserId}
            onIssueRemoved={handleIssueRemoved}
          />
        ))}
      </div>
    </div>
  );
}

function KanbanColumn({
  id,
  title,
  issues,
  currentUserRole,
  currentUserId,
  onIssueRemoved,
}: {
  id: string;
  title: string;
  issues: Issue[];
  currentUserRole: "ADMIN" | "MEMBER";
  currentUserId: string;
  onIssueRemoved: (id: string) => void;
}) {
  return (
    <Card>
      <section className="p-3 min-h-[200px]" data-col={id}>
        <h2 className="font-medium">{title}</h2>
        <div className="mt-3 space-y-3">
          {issues.length === 0 ? (
            <p className="text-sm opacity-60">No issues</p>
          ) : (
            issues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                currentUserRole={currentUserRole}
                currentUserId={currentUserId}
                onDeleted={() => onIssueRemoved(issue.id)}
              />
            ))
          )}
        </div>
      </section>
    </Card>
  );
}