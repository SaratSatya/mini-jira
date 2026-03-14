# RBAC Authorization Map (Mini Jira)

This document maps where Role-Based Access Control (RBAC) is implemented in this codebase.

## 1) RBAC data model (source of truth)

RBAC starts in Prisma schema:

- `ProjectRole` enum defines roles: `ADMIN`, `MEMBER`.
- `ProjectMember` is the membership join model (`projectId`, `userId`, `role`).
- Unique key `@@unique([projectId, userId])` guarantees one role per user per project.

This is the core authorization table used by the APIs.

## 2) Authentication prerequisite (who is calling)

Most protected routes first resolve user identity from NextAuth session:

- `getServerSession(authOptions)` is used to authenticate requests.
- The user id is read from `session.user.id`.
- If no session/user id exists, route returns `401 Unauthorized`.

RBAC checks happen only after authentication passes.

## 3) Membership check (is caller in project)

Most project/issue routes require membership lookup:

```ts
const membership = await prisma.projectMember.findUnique({
  where: { projectId_userId: { projectId, userId } },
  select: { role: true },
});
```

If no membership is found, route returns `403 Forbidden`.

## 4) Role checks (what caller is allowed to do)

### Sprint creation: ADMIN only

`POST /api/projects/[projectId]/sprints`:

```ts
if (membership.role !== "ADMIN") {
  return NextResponse.json({ error: "Only ADMIN can create sprints" }, { status: 403 });
}
```

### Issue creation: ADMIN only

`POST /api/projects/[projectId]/issues`:

```ts
if (membership.role !== "ADMIN") {
  return NextResponse.json({ error: "Only ADMIN can create issues" }, { status: 403 });
}
```

### Issue assignee change: ADMIN only

`PATCH /api/issues/[issueId]`:

- If `assigneeId` is provided, non-admin is blocked.
- Assignee must be a `MEMBER` in the same project.

### Issue status transitions: split by role

`PATCH /api/issues/[issueId]`:

- Members can only mark **their own assigned** issue from `IN_PROGRESS` to `IN_REVIEW`.
- Admin can mark `IN_REVIEW` to `DONE`.

### Delete issue: ADMIN only + state rule

`DELETE /api/issues/[issueId]`:

- Only `ADMIN` can delete.
- Issue must already be in `DONE`.

### Sprint assignment/removal: ADMIN only

`PATCH /api/issues/[issueId]/sprint`:

- Add issue to sprint (`sprintId !== null`): ADMIN only, sprint must be `ACTIVE`.
- Remove issue from sprint (`sprintId === null`): ADMIN only, current sprint must be `ACTIVE`.

## 5) Authorization style used in codebase

This project uses **route-level RBAC guards**:

1. authenticate session,
2. load project membership,
3. enforce role + business state checks,
4. execute DB mutation.

This pattern appears consistently across issue and sprint APIs.

## 6) Verification via tests

RBAC behavior is validated in API unit tests, for example:

- `__tests__/api/create-issue.test.ts` verifies non-admin cannot create issues.
- `__tests__/api/issue-sprint.test.ts` verifies member add/remove sprint actions are rejected, admin remove is allowed.

## 7) End-to-end RBAC flow for one operation (example)

Example: member attempts to add issue to sprint

1. Route authenticates caller (`401` if missing).
2. Route confirms issue exists in a project the caller belongs to (`404` if not).
3. Route reads membership role.
4. Role check fails for `MEMBER`.
5. Route returns `403 Only ADMIN can add issues to a sprint`.

---

If you want, the next step can be extracting repeated membership/role checks into a reusable helper (e.g., `requireProjectRole`) to reduce duplication and make RBAC easier to audit.
