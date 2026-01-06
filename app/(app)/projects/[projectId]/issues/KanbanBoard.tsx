"use client";

import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useMemo, useState } from "react";
import IssueCardDnD from "./IssueCardDnD";
import FilterBar from "./FilterBar";


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
  assigneeId:string | null;
  updatedAt:string;
};

const columns: { key: Status; title: string }[] = [
  { key: "TODO", title: "To Do" },
  { key: "IN_PROGRESS", title: "In Progress" },
  { key: "IN_REVIEW", title: "In Review" },
  { key: "DONE", title: "Done" },
];

export default function KanbanBoard({ initialIssues }: { initialIssues: Issue[] }) {
  const [query,setQuery]=useState("");
  const [priority,setPriority]=useState<"ALL" | "LOW" | 'MEDIUM' | 'HIGH' | 'URGENT'>("ALL");
  const [assigneeId,setAssigneeId]=useState<'ALL' | 'UNASSIGNED' | string>("ALL");
  const [sort,setSort]=useState<"UPDATED_DESC" | "UPDATED_ASC">("UPDATED_DESC");
  const [issues, setIssues] = useState<Issue[]>(initialIssues);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const assignees = useMemo(() => {
  const set = new Map<string, string>();
    for (const i of issues) {
        // we don't have name/email here; show shortened id
        if (i.assigneeId) set.set(i.assigneeId, i.assigneeId.slice(-6));
    }
  return Array.from(set.entries()).map(([id, label]) => ({ id, label: `User...${label}` }));
    }, [issues]);
    const filteredIssues = useMemo(() => {
  const q = query.trim().toLowerCase();

  let list = issues.filter((i) => {
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
    }, [issues, query, priority, assigneeId, sort]);

const grouped = useMemo(() => {
  const map: Record<Status, Issue[]> = { TODO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [] };
  for (const i of filteredIssues) map[i.status].push(i);
  return map;
}, [filteredIssues]);


  async function updateIssueStatus(issueId: string, next: Status) {
    const res = await fetch(`/api/issues/${issueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });

    if (!res.ok) throw new Error("Patch failed");
  }

  async function onDragEnd(event: DragEndEvent) {
    const activeId = event.active?.id as string | undefined;
    const overId = event.over?.id as string | undefined;

    // We will set droppable column ids as the status keys, so overId is a status
    if (!activeId || !overId) return;

    const nextStatus = overId as Status;
    const current = issues.find((i) => i.id === activeId);
    if (!current) return;
    if (current.status === nextStatus) return;

    // optimistic update
    const prevIssues = issues;
    setIssues((cur) =>
      cur.map((i) => (i.id === activeId ? { ...i, status: nextStatus } : i))
    );

    try {
      await updateIssueStatus(activeId, nextStatus);
    } catch {
      // rollback
      setIssues(prevIssues);
      alert("Failed to move issue. Reverted.");
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
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

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((col) => (
          <KanbanColumn key={col.key} id={col.key} title={col.title} issues={grouped[col.key]} />
        ))}
      </div>
    </DndContext>
  );
}

function KanbanColumn({
  id,
  title,
  issues,
}: {
  id: string;
  title: string;
  issues: Issue[];
}) {
  // Mark column as droppable by using it as a droppable container
  // We'll do that in a simple way in IssueCardDnD using @dnd-kit/core useDroppable
  return (
    <Card>
    <section className="border rounded p-3 min-h-[160px]" data-col={id}>
      <h2 className="font-medium">{title}</h2>
      <DroppableArea id={id}>
        <div className="mt-3 space-y-3">
          {issues.length === 0 ? (
            <p className="text-sm opacity-60">No issues</p>
          ) : (
            issues.map((issue) => <IssueCardDnD key={issue.id} issue={issue} />)
          )}
        </div>
      </DroppableArea>
    </section>
    </Card>
  );
}

import { useDroppable } from "@dnd-kit/core";
import { Card } from "@/app/components/ui/card";

function DroppableArea({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={isOver ? "rounded p-2 border" : "rounded p-2"}
    >
      {children}
    </div>
  );
}
