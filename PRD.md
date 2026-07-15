# PRD: ScrumBoard (Scrum-Specialized Project Management App)

## Overview

A Scrum-specialized project management board built for agile teams. The app supports the full Scrum workflow: a shared product backlog of user stories, multiple sprint lists each with their own sub-columns, and a global deployed list aggregating all shipped stories. Three distinct roles (Team Member, Product Owner, Scrum Master) enforce the right permissions for each participant.

**Stack:** Node.js + Express + SQLite (backend), vanilla HTML/CSS/JS (frontend),
bcrypt (password hashing), express-session (auth sessions).

---

## Roles & Permissions

### 1. Team Member / Developer

- Can be specialized by discipline (e.g., Backend, Frontend, UI/UX, QA, DevOps, etc.) — set on their profile
- Can move user stories across the columns within a sprint (Sprint Backlog → Under Development → Under Testing → Deployed)
- Can view the product backlog and all sprints
- Cannot add, edit, delete, or re-order user stories in the product backlog

### 2. Product Owner

- Full control over the Product Backlog: create, edit, delete, and re-order user stories
- Sets and edits story points on each user story
- Conducts backlog grooming after each sprint (reprioritize, split, or remove stories)
- Selects which user stories go into each sprint during sprint planning
- Cannot manage sprint workflow columns or meetings

### 3. Scrum Master

- Responsible for creating and managing sprint lists (open/close sprints)
- Facilitates and logs the four Scrum ceremonies:
  - **Daily Standup** — schedules, logs blockers/impediments raised
  - **Sprint Planning** — records sprint goal and capacity
  - **Sprint Review** — records demo notes and stakeholder feedback
  - **Sprint Retrospective** — records what went well, what didn't, action items
- Cannot modify user story content or story points

---

## Board Structure

### 1. Product Backlog (shared, one per project)

- A single ordered list visible to all team members
- Contains all user stories not yet assigned to a sprint
- Each user story card includes:
  - Title and description
  - Story points (set by Product Owner)
  - Priority order (drag-to-reorder by Product Owner)
  - Assignee(s) and their specialization tag
  - Status tag: `Unrefined` / `Ready`

### 2. Sprint Lists (one or more, created by Scrum Master)

Each sprint is a self-contained list block with the following fixed sub-columns:

| Sub-column            | Description                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------- |
| **Sprint Backlog**    | User stories committed to this sprint (pulled from Product Backlog by PO during planning) |
| **Under Development** | Stories actively being worked on                                                          |
| **Under Testing**     | Stories in QA / review                                                                    |
| **Deployed**          | Stories completed and deployed within this sprint                                         |

- Scrum Master can create multiple sprint lists (Sprint 1, Sprint 2, …)
- Each sprint has a **Sprint Goal**, **start date**, and **end date**
- Only the Scrum Master can open or close a sprint
- Closing a sprint locks its columns (read-only)

### 3. Deployed List (global, auto-aggregated)

- A read-only master list showing every user story marked "Deployed" across all sprint lists
- Grouped by sprint for traceability
- Visible to all roles

---

## Features

### Authentication

- Sign up (name, email, password, role selection, specialization if Team Member)
- Log in / log out
- Passwords hashed with bcrypt, never stored or logged in plaintext
- Role is stored server-side and enforced on every API call

### User Stories (Product Backlog)

- Product Owner can create a user story with title, description, story points, and priority
- Product Owner can edit or delete any user story in the backlog
- Product Owner can run a **Backlog Grooming** session: reorder, split stories, or update points
- Team members can view stories and see their assignees

### Sprint Management

- Scrum Master creates a new sprint (name, goal, start/end dates)
- Product Owner moves stories from Product Backlog → Sprint Backlog during sprint planning
- Team Members move stories through: Sprint Backlog → Under Development → Under Testing → Deployed
- Scrum Master closes a sprint, locking it and reflecting deployed stories in the global Deployed List

### Ceremonies (Scrum Master only)

- **Daily Standup log**: date, blockers/impediments noted per story or per member
- **Sprint Planning notes**: sprint goal, committed points, capacity notes
- **Sprint Review notes**: demo summary, stakeholder feedback
- **Retrospective board**: three columns — "Went Well", "Needs Improvement", "Action Items"

### Persistence

- All data stored in SQLite, scoped to a shared team project
- Role-based access enforced server-side on every mutation endpoint
- No user can perform actions outside their role's permissions

---

## UX Flow

1. Landing page → Sign Up (choose role + specialization) or Log In
2. On login → redirect to `/board` showing: Product Backlog | Sprint List(s) | Deployed
3. **Product Owner** sees edit/add controls on backlog cards; others see read-only
4. **Scrum Master** sees "+ New Sprint" button and ceremony log panels
5. **Team Members** see move-buttons on sprint sub-columns (no drag-and-drop)
6. Global Deployed list auto-updates as stories reach "Deployed" in any sprint
7. Log Out button in header → clears session → back to landing page

---

## Product Constraints

- Multi-project support — a user can create or be invited to multiple projects, each with its own independent board, backlog, and sprint lists
- No drag-and-drop; story movement via dropdown/button only
- No real-time sync; page refresh reflects latest state
- No comments, attachments, or file uploads on cards

## Development Constraints

- Must run locally with minimal setup (no complex build tooling)
- Must satisfy all 4 checklist items: AGENTS.md/CLAUDE.md, TDD (RED→GREEN→REFACTOR),
  documented security review with ≥1 vulnerability found & fixed, this PRD —
  TDD is enforced by a **CI agent** that runs the full test suite on every commit
  and blocks merging if any test is red
- Must pass all 3 manual review points: auth/login mechanism, DB mutation safety,
  no secrets committed (.env used for any keys)
- **Commit-as-Contract Development** — development is done page by page, not in bulk. Each page goes through the full agent pipeline before the next page begins:
  1. **Frontend agent** implements the UI for one page and commits
  2. **Backend agent** implements the API and data layer for that same page and commits
  3. **Security agent** reviews the committed page (frontend + backend) for vulnerabilities and commits any fixes
  4. **QA agent** writes and runs tests for that page and commits
  5. **CI agent** runs the full test suite on the commit and blocks the pipeline if any test is red; only a green build advances
  6. Only after all five steps are green does the next page begin
     This ensures each page is a self-contained, reviewed, and tested unit before the codebase grows further.
