# Project Timelogger — Full Redesign Spec

**Date:** 2026-03-21
**Status:** Approved

---

## Overview

A professional project time-logging application. Users register/login, create projects, track time spent on them using a stopwatch, and view analytics. The app is deployed as two separate Vercel projects (frontend + backend) with Neon as the managed PostgreSQL database.

---

## 1. Architecture & Deployment

### Two Vercel Deployments

**Backend (`backend/`):**
- Express.js app deployed as a Vercel serverless function via `vercel.json`
- CORS is handled **exclusively in `app.js` Express middleware** using `process.env.FRONTEND_URL` — environment variables are not interpolated in `vercel.json` header values, so CORS origin restriction must be done in code, not in config
- `vercel.json` handles routing only (routes all requests to `app.js`)
- For local dev, the Express CORS middleware already handles `OPTIONS` preflight requests via an explicit `if (req.method === 'OPTIONS') return res.sendStatus(200)` guard (already present in `app.js`)

**Frontend (`frontend/`):**
- Next.js 15 app, standard Vercel deployment
- All hardcoded `http://localhost:3000` API references replaced with `NEXT_PUBLIC_API_URL` environment variable

### Environment Variables

**Backend:**
- `DATABASE_URL` — Neon PostgreSQL connection string (replaces hardcoded `pg-promise` connection string in `models/index.js`)
- `FRONTEND_URL` — deployed frontend URL, used in Express CORS middleware
- `JWT_SECRET` — secret for signing JWT tokens

**Frontend:**
- `NEXT_PUBLIC_API_URL` — deployed backend URL

### Backend `vercel.json`
```json
{
  "version": 2,
  "builds": [{ "src": "app.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "app.js" }]
}
```

CORS headers are set in the Express middleware in `app.js`:
```js
app.use((req, res, next) => {
  const origin = process.env.FRONTEND_URL || '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
```

### New Backend Dependencies
- `bcrypt` (v5.x) — password hashing
- `jsonwebtoken` (v9.x) — JWT sign/verify
- `cors` package is NOT needed — manual middleware above handles it

---

## 2. Database Schema (Neon PostgreSQL)

### Migration Strategy
This is a clean migration to Neon. The existing local `tasks` table is **not migrated** — only the schema structure is ported and renamed. A single DDL script (`backend/db/schema.sql`) is run once against the Neon database. No migration tooling (e.g., `node-pg-migrate`) is used in this phase.

`pg-promise` is retained as the DB client. `DATABASE_URL` env var replaces the hardcoded connection string in `models/index.js`.

### Schema

```sql
-- Users
CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,          -- bcrypt hash
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Projects (renamed from tasks)
CREATE TABLE projects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'paused', 'completed')),
  goal_seconds INT CHECK (goal_seconds > 0),
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Individual time sessions
CREATE TABLE time_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at   TIMESTAMPTZ,
  duration   INT CHECK (duration >= 0), -- seconds; NULL while session is open
  CHECK (ended_at IS NULL OR ended_at >= started_at)
);

-- Tags (per user)
CREATE TABLE tags (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name    TEXT NOT NULL,
  UNIQUE(user_id, name)
);

-- Project-Tag join table
CREATE TABLE project_tags (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tag_id     UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, tag_id)
);

-- Indexes
CREATE INDEX ON time_logs(project_id);
CREATE INDEX ON time_logs(user_id);
CREATE INDEX ON time_logs(started_at);
CREATE INDEX ON projects(user_id);
```

### Elapsed Time
Total elapsed time per project = `SELECT COALESCE(SUM(duration), 0) FROM time_logs WHERE project_id = $1 AND duration IS NOT NULL`. There is no `time_elapsed` column on `projects`. The stopwatch on the frontend tracks the current running session in state; each play→pause saves a `time_log` entry.

### user_id on time_logs
`time_logs` includes a direct `user_id` column for fast ownership checks on `PUT /time-logs/:id` without requiring a JOIN through `projects`.

---

## 3. Backend API

### Ownership Enforcement
All protected routes (under JWT middleware) must verify `req.user.id` matches the owning user of the resource. For projects: `WHERE id = $id AND user_id = $req.user.id`. For time_logs: use the `user_id` column directly.

### Standard Error Response Format
All error responses use:
```json
{ "error": "<human-readable message>" }
```
Common HTTP status codes:
- `400` — validation error (missing fields, invalid values)
- `401` — missing or invalid JWT
- `403` — resource exists but belongs to another user
- `404` — resource not found
- `409` — conflict (e.g., duplicate email on register)
- `500` — unexpected server error

### Auth (`/auth`) — public

**`POST /auth/register`**
- Body: `{ email: string, password: string }`
- Response `201`: `{ token: string, user: { id: string, email: string } }`
- Errors: `400` (missing fields), `409` (email already exists)

**`POST /auth/login`**
- Body: `{ email: string, password: string }`
- Response `200`: `{ token: string, user: { id: string, email: string } }`
- Errors: `400` (missing fields), `401` (invalid credentials)

JWT expiry: `7d`. No refresh tokens in this phase.

### Projects (`/projects`) — JWT required

**`GET /projects`**
- Query: `?search=`, `?tag=`, `?status=`
- Response `200`: Array of project objects:
  ```json
  [
    {
      "id": "uuid",
      "name": "string",
      "status": "active|paused|completed",
      "goal_seconds": null,
      "created_at": "iso8601",
      "total_elapsed": 3600,
      "tags": [{ "id": "uuid", "name": "string" }]
    }
  ]
  ```
  `total_elapsed` is `SUM(duration)` from `time_logs` for the project (0 if no logs).

**`POST /projects`**
- Body: `{ name: string, goal_seconds?: number }`
- Response `201`:
  ```json
  { "id": "uuid", "name": "string", "status": "active", "goal_seconds": null, "created_at": "iso8601", "total_elapsed": 0, "tags": [] }
  ```

**`PUT /projects/:id`**
- Body: `{ name?: string, status?: string, goal_seconds?: number }`
- Response `200`: Updated project object (same shape as above)
- Errors: `403` (not owner), `404` (not found)

**`DELETE /projects/:id`**
- Response `204`: No body
- Errors: `403`, `404`

### Time Logs (`/time-logs`) — JWT required

**Route ordering note:** The export route (`GET /projects/export`) must be registered **before** the parameterised `GET /projects/:id` route in Express to prevent `"export"` being matched as an ID.

**`POST /time-logs`** — start a session
- Body: `{ project_id: string, started_at: string (ISO 8601) }`
- Response `201`:
  ```json
  { "id": "uuid", "project_id": "uuid", "started_at": "iso8601", "ended_at": null, "duration": null }
  ```
  The returned `id` is used by the frontend to call `PUT /time-logs/:id` when pausing.
- Errors: `403` (project not owned by user), `404` (project not found)

**`PUT /time-logs/:id`** — end a session
- Body: `{ ended_at: string (ISO 8601), duration: number (seconds >= 0) }`
- Response `200`:
  ```json
  { "id": "uuid", "project_id": "uuid", "started_at": "iso8601", "ended_at": "iso8601", "duration": 120 }
  ```
- Errors: `403`, `404`

**`GET /time-logs`**
- Query: `?project_id=`, `?from=` (ISO 8601), `?to=` (ISO 8601)
- Response `200`: Array of time log objects (same shape as PUT response)

**`DELETE /time-logs`** — reset (clear all sessions for a project)
- Query: `?project_id=` (required)
- Auth: JWT required; verifies the project belongs to `req.user.id`
- Deletes all `time_logs` rows for the given project
- Response `204`: No body
- Errors: `400` (missing `project_id`), `403` (project not owned by user), `404` (project not found)

### Tags (`/tags`) — JWT required

**`GET /tags`** — Response `200`: `[{ "id": "uuid", "name": "string" }]`

**`POST /tags`** — Body: `{ name: string }` — Response `201`: `{ "id": "uuid", "name": "string" }`

**`DELETE /tags/:id`** — Delete tag globally from user's tag list — Response `204`

**`POST /projects/:id/tags`** — Body: `{ tag_id: string }` — Response `200`: Updated project object

**`DELETE /projects/:id/tags/:tag_id`** — Response `204`

### Export

**`GET /projects/export`**
- Query: `?format=csv` (only `csv` supported in this phase)
- Scope: authenticated user's projects only
- Response: CSV download with columns: `name, status, total_elapsed_seconds, total_elapsed_formatted, goal_seconds, created_at`
- One row per project; no per-session detail rows

---

## 4. Frontend UI & Components

### Pages / Routes

| Route | Protected | Description |
|-------|-----------|-------------|
| `/login` | No | Email + password login. Redirects to `/` on success. |
| `/register` | No | Registration form. Redirects to `/` on success. |
| `/` | Yes | Dashboard. Redirects to `/login` if no JWT. |
| `/reports` | Yes | Analytics. Redirects to `/login` if no JWT. |

### Auth State
- JWT stored in `localStorage` (deliberate tradeoff: simple, XSS risk acknowledged; `httpOnly` cookie approach deferred to a future phase)
- On app load, read token from `localStorage`; if missing or expired (check `exp` claim), redirect to `/login`
- All API calls include `Authorization: Bearer <token>` header

### Dashboard Layout

**Navbar:**
- App name + stopwatch icon (left)
- Dark/light mode toggle (right)
- User email (right)
- Logout button (clears `localStorage`, redirects to `/login`)
- Export CSV button

**Stats bar** (below navbar):
- Total projects count
- Total time tracked today (browser-local timezone)
- Total time tracked this week (browser-local timezone, week starts Monday)
- Computed client-side from the `time_logs` data returned by `GET /time-logs`

**Empty state:**
- Shown when `projectsArray.length === 0`
- Centered illustration + "No projects yet. Create your first one!" with CTA button (opens AddProject dialog)

**Filter/search bar:**
- Text search (by project name) — calls `GET /projects?search=`
- Tag filter (dropdown) — calls `GET /projects?tag=`
- Status filter (All / Active / Paused / Completed) — calls `GET /projects?status=`

**Project grid:**
- Card-based layout (replaces current flat bar layout)

### Project Card

Each card shows:
- Project name — click pencil icon to enter inline edit mode (not click-anywhere, to avoid accidental edits)
- Status badge (Active / Paused / Completed) — clickable to cycle status
- Tags (pills with × to remove; + button to add from tag dropdown)
- Goal progress bar (if `goal_seconds` set): shows `total_elapsed / goal_seconds * 100%`
- Total elapsed time display
- Stopwatch controls: Play / Pause / Reset / Delete

### Stopwatch Behavior (New Session Model)

**On Play:**
1. Call `POST /time-logs` with `{ project_id, started_at: new Date().toISOString() }`
2. Store the returned `time_log.id` in component state
3. Start the client-side interval, incrementing display time each second
4. Display time = `total_elapsed` (from project data) + current session seconds

**On Pause:**
1. Stop interval
2. Call `PUT /time-logs/:id` with `{ ended_at, duration: sessionSeconds }`
3. Refresh project total from server

**On Reset:**
1. Stop interval (if running)
2. Call `PUT /time-logs/:id` with `{ ended_at: now, duration: 0 }` to close any open session
3. Call `DELETE /time-logs?project_id=:id` — deletes all `time_logs` for the project. Display time returns to `00:00:00`.
4. Display resets to `00:00:00`

**On page load / resume:**
1. `GET /projects` returns `total_elapsed` (sum of all completed sessions)
2. Also call `GET /time-logs?project_id=:id` to check for any open session (`ended_at IS NULL`)
3. If an open session exists: resume the stopwatch — display time = `total_elapsed` + `(now - started_at)` seconds; store the open `time_log.id` for later `PUT`

### Reports Page (`/reports`)
- Protected route (JWT required)
- Date range picker (default: last 30 days)
- Bar chart: time per project (x = project name, y = hours) for selected range
- Line chart: total time per day for selected range
- Uses `recharts` library (`BarChart`, `LineChart` components)
- Data source: `GET /time-logs?from=&to=` filtered by date range, aggregated client-side

### Component Tree
```
RootLayout
├── Page: /login     (public)
├── Page: /register  (public)
├── AppLayout (shared by / and /reports, requires JWT)
│   ├── Navbar
│   │   ├── ThemeToggle
│   │   ├── UserMenu (email + logout)
│   │   └── ExportButton
│   ├── Page: /
│   │   ├── StatsBar
│   │   ├── FilterBar
│   │   ├── EmptyState (conditional)
│   │   └── ProjectGrid
│   │       └── ProjectCard
│   │           ├── ProjectName (pencil-icon to edit)
│   │           ├── StatusBadge
│   │           ├── TagList
│   │           ├── GoalProgress
│   │           └── StopwatchControls
│   └── Page: /reports
│       ├── DateRangePicker
│       ├── BarChart (time per project)
│       └── LineChart (time per day)
```

### Existing Components
All existing inline `style={{...}}` components (`Container.tsx`, `ProjectBar.tsx`, `Stopwatch.tsx`, `Filter.tsx`, `AddProject.tsx`) are **fully rewritten** from scratch using Tailwind utility classes. They are not incrementally modified — the component tree above replaces all of them.

---

## 5. Theme

### Implementation
Theme tokens are implemented as CSS custom properties in `globals.css`, extending the existing `oklch`-based shadcn/ui variable system. The hex palette is mapped to new semantic variables that **override** the shadcn defaults for `:root` (light) and `.dark`. The `.dark` class on `<html>` activates dark mode (already scaffolded via `@custom-variant dark (&:is(.dark *))` in `globals.css`).

**Theme toggle implementation:** Use `next-themes` library (`ThemeProvider` wraps the app, `useTheme` hook in the toggle button). Theme choice is persisted to `localStorage` automatically by `next-themes`. Light is the default (`defaultTheme="light"`).



## 6. Key Decisions & Constraints

- **Auth:** Email/password only. JWT in `localStorage` (XSS tradeoff accepted for simplicity; `httpOnly` cookie deferred). Token expiry: `7d`. No refresh tokens.
- **Backend deployment:** Express on Vercel via `@vercel/node`. Separate project from frontend.
- **CORS:** Handled in Express middleware only (not in `vercel.json` headers, which do not interpolate env vars).
- **DB client:** `pg-promise` retained. Connection via `DATABASE_URL` env var.
- **Elapsed time:** Stored as individual `time_log` sessions. Total = `SUM(duration)`. Open session detected by `ended_at IS NULL`.
- **Reset behavior:** Clears all `time_logs` for the project (total goes to zero), not just the current session.
- **UI rewrite:** All existing components are fully rewritten using Tailwind. No incremental modification of existing inline-style components.
- **New frontend dependencies:** `recharts`, `next-themes`
- **New backend dependencies:** `bcrypt@5.x`, `jsonwebtoken@9.x`
- **Out of scope:** OAuth, team/shared projects, mobile app, refresh tokens, `httpOnly` cookie auth.
