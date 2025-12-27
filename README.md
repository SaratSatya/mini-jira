# Mini Jira (Next.js + NextAuth + Prisma + MongoDB Atlas)

A lightweight Jira-like project management app: Projects, Members (RBAC), Issues, Kanban board with drag & drop, Sprints, Comments, and an Activity/Audit log.

## Live Demo
- Deployed URL: **<PASTE_VERCEL_URL_HERE>**
- (Optional) Demo credentials: **<email / password>**

---

## Features

### Auth
- Email + password authentication (NextAuth Credentials)
- OAuth ready (GitHub/Google) if configured
- Protected routes (server-side access checks)

### Projects & RBAC
- Create projects with unique project key (e.g., `MJ`)
- Project membership with roles:
  - `ADMIN`: can add members
  - `MEMBER`: standard access
- Members page (list project members)

### Issues (Core)
- Create, view, and manage issues
- Issue fields:
  - Status: `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`
  - Type: `TASK`, `BUG`, `STORY`
  - Priority: `LOW`, `MEDIUM`, `HIGH`, `URGENT`
  - Story points (optional)
- Assign assignee (only project members)

### Kanban Board
- Drag & drop issues between columns (optimistic UI + rollback on failure)
- Client-side:
  - Search by title
  - Filter by priority
  - Filter by assignee / unassigned
  - Sort by last updated (newest/oldest)

### Sprints
- Sprint lifecycle: `PLANNED → ACTIVE → CLOSED`
- Add/remove issues to sprint
- Prevent modifications to CLOSED sprints

### Comments
- Add comments on issue detail page

### Activity / Audit Log
- Tracks actions like:
  - Issue created
  - Status changed
  - Assignee changed
  - Comment added
  - Issue sprint changed
  - Sprint status changed
- Activity page per project: `/projects/:projectId/activity`

---

## Tech Stack
- **Next.js (App Router)**
- **NextAuth** (Credentials + OAuth-ready)
- **Prisma ORM**
- **MongoDB Atlas**
- **Vitest** for unit tests
- **GitHub Actions** CI (tests + coverage)

---

## Project Structure (high level)
- `app/` → UI routes + API routes
- `lib/` → Prisma client, auth helpers, activity logger, etc.
- `prisma/` → Prisma schema

---

## Environment Variables

Create `.env.local` in project root:

```env
# MongoDB Atlas
DATABASE_URL="mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority"

# NextAuth
NEXTAUTH_SECRET="<random_32byte_hex>"
NEXTAUTH_URL="http://localhost:3000"

# (Optional) OAuth providers
# GITHUB_CLIENT_ID=""
# GITHUB_CLIENT_SECRET=""
# GOOGLE_CLIENT_ID=""
# GOOGLE_CLIENT_SECRET=""
