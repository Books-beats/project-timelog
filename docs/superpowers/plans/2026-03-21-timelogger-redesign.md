# Timelogger Full Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the existing time-logger into a production-ready app with auth, per-user projects, time-log sessions, analytics, tags, goals, dark/light theme, and Vercel+Neon deployment.

**Architecture:** Express backend deployed as a Vercel serverless function; Next.js 15 frontend deployed separately. All API calls go through `NEXT_PUBLIC_API_URL`. JWT auth (email/password, 7d expiry) with tokens in localStorage. Time tracked as individual `time_logs` sessions summed per project.

**Tech Stack:** Next.js 15, Express.js, pg-promise, Neon PostgreSQL, Tailwind CSS v4, shadcn/ui, next-themes, recharts, bcrypt@5.x, jsonwebtoken@9.x

**Spec:** `docs/superpowers/specs/2026-03-21-timelogger-redesign-design.md`

---

## File Map

### Backend — New / Modified

| File | Action | Purpose |
|------|--------|---------|
| `backend/db/schema.sql` | CREATE | Full DDL for Neon (users, projects, time_logs, tags, project_tags + indexes) |
| `backend/models/index.js` | MODIFY | Use `DATABASE_URL` env var instead of hardcoded connection string |
| `backend/models/users.js` | CREATE | createUser, findUserByEmail |
| `backend/models/projects.js` | CREATE | CRUD for projects (replaces models/tasks.js) |
| `backend/models/timeLogs.js` | CREATE | create, end, list, deleteByProject |
| `backend/models/tags.js` | CREATE | CRUD for tags + project_tags join |
| `backend/middleware/auth.js` | CREATE | JWT verification, attaches req.user |
| `backend/routes/auth.js` | CREATE | POST /auth/register, POST /auth/login |
| `backend/routes/projects.js` | CREATE | CRUD + export for /projects |
| `backend/routes/timeLogs.js` | CREATE | POST/PUT/GET/DELETE for /time-logs |
| `backend/routes/tags.js` | CREATE | CRUD for /tags + project tag attach/remove |
| `backend/app.js` | MODIFY | Register new routers, update CORS to use FRONTEND_URL |
| `backend/vercel.json` | CREATE | Serverless build config, routing |
| `backend/.env.example` | CREATE | Document required env vars |
| `backend/package.json` | MODIFY | Add bcrypt@5, jsonwebtoken@9 |

### Frontend — New / Modified / Deleted

| File | Action | Purpose |
|------|--------|---------|
| `frontend/src/lib/api.ts` | CREATE | Typed API client, reads NEXT_PUBLIC_API_URL, injects Authorization header |
| `frontend/src/lib/auth.ts` | CREATE | get/set/clear JWT in localStorage, decode exp claim |
| `frontend/src/app/globals.css` | MODIFY | Add --app-* CSS vars for light/dark theme with gradients |
| `frontend/src/app/layout.tsx` | MODIFY | Wrap with ThemeProvider from next-themes |
| `frontend/src/app/page.tsx` | MODIFY | Render Dashboard (protected) |
| `frontend/src/app/login/page.tsx` | CREATE | Login form |
| `frontend/src/app/register/page.tsx` | CREATE | Register form |
| `frontend/src/app/reports/page.tsx` | CREATE | Reports page (protected) |
| `frontend/src/app/components/Navbar.tsx` | CREATE | Gradient navbar: logo, ThemeToggle, user, logout, export |
| `frontend/src/app/components/ThemeToggle.tsx` | CREATE | useTheme toggle button |
| `frontend/src/app/components/StatsBar.tsx` | CREATE | Today/week totals from time_logs data |
| `frontend/src/app/components/EmptyState.tsx` | CREATE | Zero-project call-to-action |
| `frontend/src/app/components/FilterBar.tsx` | CREATE | Search + tag + status filters |
| `frontend/src/app/components/ProjectGrid.tsx` | CREATE | Card grid wrapper |
| `frontend/src/app/components/ProjectCard.tsx` | CREATE | Full project card (name, status, tags, goal, timer display) |
| `frontend/src/app/components/StopwatchControls.tsx` | CREATE | Play/Pause/Reset/Delete buttons + session logic |
| `frontend/src/app/components/AddProject.tsx` | MODIFY | Rewrite using Tailwind, wire to new API |
| `frontend/src/app/reports/TimeChart.tsx` | CREATE | recharts BarChart + LineChart |
| `frontend/.env.example` | CREATE | Document NEXT_PUBLIC_API_URL |
| `frontend/package.json` | MODIFY | Add recharts, next-themes |
| `frontend/src/app/components/Container.tsx` | DELETE | Replaced by page.tsx + new components |
| `frontend/src/app/components/ProjectBar.tsx` | DELETE | Replaced by ProjectCard |
| `frontend/src/app/components/Stopwatch.tsx` | DELETE | Replaced by StopwatchControls |
| `frontend/src/app/components/Filter.tsx` | DELETE | Replaced by FilterBar |

---

## Phase 1: Database Setup

### Task 1: Neon Schema

**Files:**
- Create: `backend/db/schema.sql`

- [ ] **Step 1: Create the DDL script**

Create `backend/db/schema.sql`:

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE projects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'paused', 'completed')),
  goal_seconds INT CHECK (goal_seconds > 0),
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE time_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at   TIMESTAMPTZ,
  duration   INT CHECK (duration >= 0),
  CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE TABLE tags (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name    TEXT NOT NULL,
  UNIQUE(user_id, name)
);

CREATE TABLE project_tags (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tag_id     UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, tag_id)
);

CREATE INDEX ON time_logs(project_id);
CREATE INDEX ON time_logs(user_id);
CREATE INDEX ON time_logs(started_at);
CREATE INDEX ON projects(user_id);
```

- [ ] **Step 2: Run against Neon**

In the Neon console (or via psql with your Neon connection string):
```bash
psql "$DATABASE_URL" -f backend/db/schema.sql
```
Expected: all `CREATE TABLE` and `CREATE INDEX` statements succeed with no errors.

---

## Phase 2: Backend

### Task 2: Update DB Connection + Install Dependencies

**Files:**
- Modify: `backend/models/index.js`
- Modify: `backend/package.json`
- Create: `backend/.env.example`

- [ ] **Step 1: Install new dependencies**

```bash
cd backend
npm install bcrypt@5 jsonwebtoken@9
```

- [ ] **Step 2: Create `.env.example`**

```
DATABASE_URL=postgres://user:password@host/dbname
FRONTEND_URL=http://localhost:3001
JWT_SECRET=your-secret-here
PORT=3000
```

- [ ] **Step 3: Update `backend/models/index.js`**

Replace the hardcoded connection string:

```js
const pgp = require('pg-promise')();
const db = pgp(process.env.DATABASE_URL);
module.exports = db;
```

- [ ] **Step 4: Verify locally**

Start the backend with a `.env` file containing your Neon `DATABASE_URL`:
```bash
DATABASE_URL=... node ./bin/www
```
Expected: server starts, no database connection errors in console.

---

### Task 3: JWT Auth Middleware

**Files:**
- Create: `backend/middleware/auth.js`

- [ ] **Step 1: Create the middleware**

```js
// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
```

- [ ] **Step 2: Manually verify with a test token**

In a Node REPL:
```js
const jwt = require('jsonwebtoken');
const token = jwt.sign({ sub: 'test-id', email: 'a@b.com' }, 'testsecret', { expiresIn: '7d' });
console.log(token); // paste into middleware test
```
Expected: middleware parses it correctly and calls `next()`.

---

### Task 4: Users Model + Auth Routes

**Files:**
- Create: `backend/models/users.js`
- Create: `backend/routes/auth.js`

- [ ] **Step 1: Create users model**

```js
// backend/models/users.js
const db = require('./index');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

async function createUser(email, password) {
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  return db.one(
    'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
    [email, hash]
  );
}

async function findUserByEmail(email) {
  return db.oneOrNone('SELECT * FROM users WHERE email = $1', [email]);
}

module.exports = { createUser, findUserByEmail };
```

- [ ] **Step 2: Create auth router**

```js
// backend/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { createUser, findUserByEmail } = require('../models/users');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  try {
    const user = await createUser(email, password);
    const token = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    return res.status(201).json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    if (err.code === '23505') { // unique violation
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  try {
    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    return res.status(200).json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
```

- [ ] **Step 3: Mount in `app.js`**

Add after the existing `var tasksRouter` line in `backend/app.js`:
```js
var authRouter = require('./routes/auth');
// ...
app.use('/auth', authRouter);
```

- [ ] **Step 4: Test register + login**

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
# Expected: 201 with { token, user }

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
# Expected: 200 with { token, user }

# Duplicate register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
# Expected: 409
```

---

### Task 5: Projects Model + Routes

**Files:**
- Create: `backend/models/projects.js`
- Create: `backend/routes/projects.js`

- [ ] **Step 1: Create projects model**

```js
// backend/models/projects.js
const db = require('./index');

const PROJECT_FIELDS = `
  p.id, p.user_id, p.name, p.status, p.goal_seconds, p.created_at,
  COALESCE(SUM(tl.duration), 0)::int AS total_elapsed,
  COALESCE(
    json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name))
      FILTER (WHERE t.id IS NOT NULL),
    '[]'
  ) AS tags
`;

const PROJECT_JOINS = `
  FROM projects p
  LEFT JOIN time_logs tl ON tl.project_id = p.id AND tl.duration IS NOT NULL
  LEFT JOIN project_tags pt ON pt.project_id = p.id
  LEFT JOIN tags t ON t.id = pt.tag_id
`;

function listProjects(userId, { search, tag, status } = {}) {
  const conditions = ['p.user_id = ${userId}'];
  const values = { userId };
  if (search) { conditions.push('p.name ILIKE ${search}'); values.search = `%${search}%`; }
  if (status) { conditions.push('p.status = ${status}'); values.status = status; }
  if (tag)    { conditions.push('EXISTS (SELECT 1 FROM project_tags pt2 JOIN tags t2 ON t2.id = pt2.tag_id WHERE pt2.project_id = p.id AND t2.name = ${tag})'); values.tag = tag; }

  const where = conditions.join(' AND ');
  return db.any(
    `SELECT ${PROJECT_FIELDS} ${PROJECT_JOINS} WHERE ${where} GROUP BY p.id ORDER BY p.created_at DESC`,
    values
  );
}

function createProject(userId, name, goalSeconds) {
  return db.one(
    `INSERT INTO projects (user_id, name, goal_seconds) VALUES ($1, $2, $3)
     RETURNING id, user_id, name, status, goal_seconds, created_at`,
    [userId, name, goalSeconds || null]
  ).then(p => ({ ...p, total_elapsed: 0, tags: [] }));
}

async function updateProject(id, userId, fields) {
  // First verify ownership to distinguish 403 vs 404
  const existing = await db.oneOrNone('SELECT user_id FROM projects WHERE id = $1', [id]);
  if (!existing) return { notFound: true };
  if (existing.user_id !== userId) return { forbidden: true };

  const allowed = ['name', 'status', 'goal_seconds'];
  const setClauses = [];
  const values = { id, userId };
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      setClauses.push(`${key} = \${${key}}`);
      values[key] = fields[key];
    }
  }
  if (setClauses.length === 0) throw new Error('No valid fields to update');
  await db.none(
    `UPDATE projects SET ${setClauses.join(', ')} WHERE id = \${id}`,
    values
  );
  return { ok: true };
}

function deleteProject(id, userId) {
  return db.result('DELETE FROM projects WHERE id = $1 AND user_id = $2', [id, userId]);
}

function getProjectOwner(id) {
  return db.oneOrNone('SELECT user_id FROM projects WHERE id = $1', [id]);
}

module.exports = { listProjects, createProject, updateProject, deleteProject, getProjectOwner };
```

- [ ] **Step 2: Create projects router**

```js
// backend/routes/projects.js
const express = require('express');
const auth = require('../middleware/auth');
const { listProjects, createProject, updateProject, deleteProject, getProjectOwner } = require('../models/projects');
const { listTimeLogs } = require('../models/timeLogs');

const router = express.Router();
router.use(auth);

// Export must be registered before /:id
router.get('/export', async (req, res) => {
  try {
    const projects = await listProjects(req.user.id);
    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (s) => { const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60; return `${pad(h)}:${pad(m)}:${pad(sec)}`; };
    const rows = projects.map(p =>
      [p.name, p.status, p.total_elapsed, fmt(p.total_elapsed), p.goal_seconds || '', p.created_at].join(',')
    );
    const csv = ['name,status,total_elapsed_seconds,total_elapsed_formatted,goal_seconds,created_at', ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="projects.csv"');
    return res.send(csv);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const projects = await listProjects(req.user.id, req.query);
    return res.json(projects);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { name, goal_seconds } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const project = await createProject(req.user.id, name, goal_seconds);
    return res.status(201).json(project);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const result = await updateProject(req.params.id, req.user.id, req.body);
    if (result.notFound) return res.status(404).json({ error: 'Project not found' });
    if (result.forbidden) return res.status(403).json({ error: 'Forbidden' });
    const projects = await listProjects(req.user.id);
    const updated = projects.find(p => p.id === req.params.id);
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await deleteProject(req.params.id, req.user.id);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Project not found or not yours' });
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
```

- [ ] **Step 3: Mount in `app.js`**

```js
var projectsRouter = require('./routes/projects');
app.use('/projects', projectsRouter);
```

- [ ] **Step 4: Test with curl (use token from Task 4)**

```bash
TOKEN="<paste token from Task 4 test>"

# Create project
curl -X POST http://localhost:3000/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"My Project"}'
# Expected: 201 with project object including total_elapsed: 0, tags: []

# List projects
curl http://localhost:3000/projects \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200 array with the project

# Update project
PROJECT_ID="<id from create>"
curl -X PUT http://localhost:3000/projects/$PROJECT_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status":"paused"}'
# Expected: 200 with updated project

# Delete project
curl -X DELETE http://localhost:3000/projects/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN"
# Expected: 204
```

---

### Task 6: Time Logs Model + Routes

**Files:**
- Create: `backend/models/timeLogs.js`
- Create: `backend/routes/timeLogs.js`

- [ ] **Step 1: Create timeLogs model**

```js
// backend/models/timeLogs.js
const db = require('./index');

function createTimeLog(projectId, userId, startedAt) {
  return db.one(
    'INSERT INTO time_logs (project_id, user_id, started_at) VALUES ($1, $2, $3) RETURNING *',
    [projectId, userId, startedAt]
  );
}

function endTimeLog(id, userId, endedAt, duration) {
  return db.oneOrNone(
    'UPDATE time_logs SET ended_at = $1, duration = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
    [endedAt, duration, id, userId]
  );
}

function listTimeLogs(userId, { projectId, from, to } = {}) {
  const conditions = ['user_id = ${userId}'];
  const values = { userId };
  if (projectId) { conditions.push('project_id = ${projectId}'); values.projectId = projectId; }
  if (from) { conditions.push('started_at >= ${from}'); values.from = from; }
  if (to)   { conditions.push('started_at <= ${to}');   values.to = to; }
  return db.any(
    `SELECT * FROM time_logs WHERE ${conditions.join(' AND ')} ORDER BY started_at DESC`,
    values
  );
}

function deleteTimeLogsByProject(projectId, userId) {
  return db.result(
    'DELETE FROM time_logs WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  );
}

module.exports = { createTimeLog, endTimeLog, listTimeLogs, deleteTimeLogsByProject };
```

- [ ] **Step 2: Create timeLogs router**

```js
// backend/routes/timeLogs.js
const express = require('express');
const auth = require('../middleware/auth');
const { createTimeLog, endTimeLog, listTimeLogs, deleteTimeLogsByProject } = require('../models/timeLogs');
const { getProjectOwner } = require('../models/projects');

const router = express.Router();
router.use(auth);

router.post('/', async (req, res) => {
  const { project_id, started_at } = req.body;
  if (!project_id || !started_at) return res.status(400).json({ error: 'project_id and started_at are required' });
  try {
    const project = await getProjectOwner(project_id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    const log = await createTimeLog(project_id, req.user.id, started_at);
    return res.status(201).json(log);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  const { ended_at, duration } = req.body;
  if (ended_at === undefined || duration === undefined) return res.status(400).json({ error: 'ended_at and duration are required' });
  try {
    const log = await endTimeLog(req.params.id, req.user.id, ended_at, duration);
    if (!log) return res.status(404).json({ error: 'Time log not found or not yours' });
    return res.json(log);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const logs = await listTimeLogs(req.user.id, {
      projectId: req.query.project_id,
      from: req.query.from,
      to: req.query.to,
    });
    return res.json(logs);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Reset: delete all time logs for a project
router.delete('/', async (req, res) => {
  const { project_id } = req.query;
  if (!project_id) return res.status(400).json({ error: 'project_id query param is required' });
  try {
    const project = await getProjectOwner(project_id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    await deleteTimeLogsByProject(project_id, req.user.id);
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
```

- [ ] **Step 3: Mount in `app.js`**

```js
var timeLogsRouter = require('./routes/timeLogs');
app.use('/time-logs', timeLogsRouter);
```

- [ ] **Step 4: Test time log flow**

```bash
TOKEN="<token>"
# Create a project first, then:
PROJECT_ID="<project id>"

# Start session
curl -X POST http://localhost:3000/time-logs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"project_id\":\"$PROJECT_ID\",\"started_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
# Expected: 201 with time_log (ended_at: null, duration: null)

LOG_ID="<id from above>"

# End session (30 seconds)
curl -X PUT http://localhost:3000/time-logs/$LOG_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"ended_at":"2026-01-01T00:00:30Z","duration":30}'
# Expected: 200 with duration: 30

# List projects - should show total_elapsed: 30
curl http://localhost:3000/projects -H "Authorization: Bearer $TOKEN"

# Reset
curl -X DELETE "http://localhost:3000/time-logs?project_id=$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN"
# Expected: 204, then total_elapsed on project = 0
```

---

### Task 7: Tags Model + Routes

**Files:**
- Create: `backend/models/tags.js`
- Create: `backend/routes/tags.js`

- [ ] **Step 1: Create tags model**

```js
// backend/models/tags.js
const db = require('./index');

function listTags(userId) {
  return db.any('SELECT id, name FROM tags WHERE user_id = $1 ORDER BY name', [userId]);
}

function createTag(userId, name) {
  return db.one(
    'INSERT INTO tags (user_id, name) VALUES ($1, $2) RETURNING id, name',
    [userId, name]
  );
}

function deleteTag(id, userId) {
  return db.result('DELETE FROM tags WHERE id = $1 AND user_id = $2', [id, userId]);
}

function attachTag(projectId, tagId) {
  return db.none(
    'INSERT INTO project_tags (project_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [projectId, tagId]
  );
}

function removeTag(projectId, tagId) {
  return db.none('DELETE FROM project_tags WHERE project_id = $1 AND tag_id = $2', [projectId, tagId]);
}

module.exports = { listTags, createTag, deleteTag, attachTag, removeTag };
```

- [ ] **Step 2: Create tags router**

The `/tags` router handles tag CRUD. Project-tag attachment routes live on the `/projects` router (per spec: `POST /projects/:id/tags`). Add those to `backend/routes/projects.js` after the existing routes.

```js
// backend/routes/tags.js
const express = require('express');
const auth = require('../middleware/auth');
const { listTags, createTag, deleteTag } = require('../models/tags');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  try {
    return res.json(await listTags(req.user.id));
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    return res.status(201).json(await createTag(req.user.id, name));
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Tag already exists' });
    return res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await deleteTag(req.params.id, req.user.id);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Tag not found or not yours' });
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
```

Add these two project-tag routes to **`backend/routes/projects.js`** (after the existing DELETE `/:id` route):

```js
// In backend/routes/projects.js — add at the bottom before module.exports
const { attachTag, removeTag } = require('../models/tags');

// POST /projects/:id/tags
router.post('/:id/tags', async (req, res) => {
  const { tag_id } = req.body;
  if (!tag_id) return res.status(400).json({ error: 'tag_id is required' });
  try {
    const project = await getProjectOwner(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    await attachTag(req.params.id, tag_id);
    const projects = await listProjects(req.user.id);
    return res.json(projects.find(p => p.id === req.params.id));
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /projects/:id/tags/:tagId
router.delete('/:id/tags/:tagId', async (req, res) => {
  try {
    const project = await getProjectOwner(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    await removeTag(req.params.id, req.params.tagId);
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});
```

- [ ] **Step 3: Mount in `app.js`**

```js
var tagsRouter = require('./routes/tags');
app.use('/tags', tagsRouter);
```

---

### Task 8: CORS + `app.js` Cleanup + `vercel.json`

**Files:**
- Modify: `backend/app.js`
- Create: `backend/vercel.json`

- [ ] **Step 1: Update CORS in `backend/app.js`**

Replace the existing CORS middleware block:

```js
// CORS Middleware
app.use((req, res, next) => {
  const origin = process.env.FRONTEND_URL || '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
```

- [ ] **Step 2: Remove old tasks router, add all new routers**

The final router section of `app.js` should be:

```js
var authRouter    = require('./routes/auth');
var projectsRouter = require('./routes/projects');
var timeLogsRouter = require('./routes/timeLogs');
var tagsRouter    = require('./routes/tags');

app.use('/auth',      authRouter);
app.use('/projects',  projectsRouter);
app.use('/time-logs', timeLogsRouter);
app.use('/tags',      tagsRouter);
```

Remove: `var tasksRouter = require('./routes/tasks');` and `app.use('/tasks', tasksRouter);`

- [ ] **Step 3: Create `backend/vercel.json`**

```json
{
  "version": 2,
  "builds": [
    { "src": "app.js", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "app.js" }
  ]
}
```

- [ ] **Step 4: Verify app starts cleanly**

```bash
cd backend && node ./bin/www
```
Expected: server on port 3000, no errors, all routes registered.

---

## Phase 3: Frontend Foundation

### Task 9: Install Frontend Dependencies + API Client + Auth Helpers

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/.env.example`
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/auth.ts`

- [ ] **Step 1: Install dependencies**

```bash
cd frontend
npm install recharts next-themes react-icons
npm install --save-dev @types/recharts
```

- [ ] **Step 2: Create `.env.example`**

```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Create a local `.env.local` for development:
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

- [ ] **Step 3: Create `frontend/src/lib/auth.ts`**

```ts
const TOKEN_KEY = 'tl_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isTokenValid(): boolean {
  const token = getToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function getTokenPayload(): { sub: string; email: string } | null {
  const token = getToken();
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Create `frontend/src/lib/api.ts`**

```ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

import { getToken } from './auth';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(body.error || 'Request failed'), { status: res.status });
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Auth
export const authApi = {
  register: (email: string, password: string) =>
    request<{ token: string; user: { id: string; email: string } }>('/auth/register', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ token: string; user: { id: string; email: string } }>('/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }),
};

// Projects
export type Project = {
  id: string; name: string; status: 'active' | 'paused' | 'completed';
  goal_seconds: number | null; created_at: string;
  total_elapsed: number; tags: { id: string; name: string }[];
};

export const projectsApi = {
  list: (params?: { search?: string; tag?: string; status?: string }) => {
    const q = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return request<Project[]>(`/projects${q}`);
  },
  create: (name: string, goal_seconds?: number) =>
    request<Project>('/projects', { method: 'POST', body: JSON.stringify({ name, goal_seconds }) }),
  update: (id: string, fields: Partial<Pick<Project, 'name' | 'status' | 'goal_seconds'>>) =>
    request<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(fields) }),
  delete: (id: string) => request<void>(`/projects/${id}`, { method: 'DELETE' }),
  export: async () => {
    // Use fetch+Blob because window.open can't set Authorization header
    const res = await fetch(`${BASE_URL}/projects/export?format=csv`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'projects.csv';
    a.click();
    URL.revokeObjectURL(url);
  },
};

// Time logs
export type TimeLog = {
  id: string; project_id: string; user_id: string;
  started_at: string; ended_at: string | null; duration: number | null;
};

export const timeLogsApi = {
  start: (project_id: string, started_at: string) =>
    request<TimeLog>('/time-logs', { method: 'POST', body: JSON.stringify({ project_id, started_at }) }),
  end: (id: string, ended_at: string, duration: number) =>
    request<TimeLog>(`/time-logs/${id}`, { method: 'PUT', body: JSON.stringify({ ended_at, duration }) }),
  list: (params?: { project_id?: string; from?: string; to?: string }) => {
    const q = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return request<TimeLog[]>(`/time-logs${q}`);
  },
  reset: (project_id: string) =>
    request<void>(`/time-logs?project_id=${project_id}`, { method: 'DELETE' }),
};

// Tags
export type Tag = { id: string; name: string };

export const tagsApi = {
  list: () => request<Tag[]>('/tags'),
  create: (name: string) => request<Tag>('/tags', { method: 'POST', body: JSON.stringify({ name }) }),
  delete: (id: string) => request<void>(`/tags/${id}`, { method: 'DELETE' }),
  attachToProject: (projectId: string, tag_id: string) =>
    request<Project>(`/projects/${projectId}/tags`, { method: 'POST', body: JSON.stringify({ tag_id }) }),
  removeFromProject: (projectId: string, tagId: string) =>
    request<void>(`/projects/${projectId}/tags/${tagId}`, { method: 'DELETE' }),
};
```

---

### Task 10: Login + Register Pages

**Files:**
- Create: `frontend/src/app/login/page.tsx`
- Create: `frontend/src/app/register/page.tsx`

- [ ] **Step 1: Create login page**

```tsx
// frontend/src/app/login/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { setToken } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await authApi.login(email, password);
      setToken(token);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--app-bg)]">
      <div className="w-full max-w-sm bg-[var(--app-card)] border border-[var(--app-border)] rounded-lg p-8 shadow-md">
        <h1 className="text-2xl font-bold text-[var(--app-text)] mb-6">Sign In</h1>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--app-text)] mb-1">Email</label>
            <input
              type="email" required value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-[var(--app-border)] rounded px-3 py-2 text-[var(--app-text)] bg-[var(--app-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--app-text)] mb-1">Password</label>
            <input
              type="password" required value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-[var(--app-border)] rounded px-3 py-2 text-[var(--app-text)] bg-[var(--app-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full py-2 px-4 rounded font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--app-navbar-gradient)' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="mt-4 text-sm text-center text-[var(--app-text)]">
          No account? <Link href="/register" className="text-[var(--app-accent)] hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create register page**

```tsx
// frontend/src/app/register/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { setToken } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await authApi.register(email, password);
      setToken(token);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--app-bg)]">
      <div className="w-full max-w-sm bg-[var(--app-card)] border border-[var(--app-border)] rounded-lg p-8 shadow-md">
        <h1 className="text-2xl font-bold text-[var(--app-text)] mb-6">Create Account</h1>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--app-text)] mb-1">Email</label>
            <input
              type="email" required value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-[var(--app-border)] rounded px-3 py-2 text-[var(--app-text)] bg-[var(--app-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--app-text)] mb-1">Password</label>
            <input
              type="password" required value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-[var(--app-border)] rounded px-3 py-2 text-[var(--app-text)] bg-[var(--app-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full py-2 px-4 rounded font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--app-navbar-gradient)' }}
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <p className="mt-4 text-sm text-center text-[var(--app-text)]">
          Already have an account? <Link href="/login" className="text-[var(--app-accent)] hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Test in browser**

Navigate to `http://localhost:3001/register`, create an account. Should redirect to `/`.
Navigate to `http://localhost:3001/login`, log in. Should redirect to `/`.

---

## Phase 4: Theme

### Task 11: Theme Tokens + next-themes Setup

**Files:**
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/src/app/layout.tsx`
- Create: `frontend/src/app/components/ThemeToggle.tsx`

- [ ] **Step 1: Add theme CSS variables to `globals.css`**

Add these custom properties inside the existing `:root` block and a new `.dark` block:

```css
/* Light mode app theme */
:root {
  --app-bg: #f5f5f5;
  --app-card: #ffffff;
  --app-primary: #ff6a88;
  --app-accent: #f4a261;
  --app-text: #264653;
  --app-border: #E9C46A;
  --app-navbar-gradient: linear-gradient(135deg, #ff6a88, #f4a261);
}

/* Dark mode (Warm) */
.dark {
  --app-bg: #1a1a2e;
  --app-card: #2d1b1b;
  --app-primary: #c0392b;
  --app-accent: #f4a261;
  --app-text: #f0e6d3;
  --app-border: #4a3030;
  --app-navbar-gradient: linear-gradient(135deg, #2d1b1b, #c0392b);
}
```

Also update `body` to use the app vars:
```css
body {
  background: var(--app-bg);
  color: var(--app-text);
}
```

- [ ] **Step 2: Wrap `layout.tsx` with ThemeProvider**

```tsx
// frontend/src/app/layout.tsx
import type { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import './globals.css';

export const metadata: Metadata = { title: 'Project Timelog' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Create `ThemeToggle.tsx`**

```tsx
// frontend/src/app/components/ThemeToggle.tsx
'use client';
import { useTheme } from 'next-themes';
import { MoonIcon, SunIcon } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-full hover:bg-white/20 transition-colors text-white"
      aria-label="Toggle dark mode"
    >
      {theme === 'dark' ? <SunIcon size={20} /> : <MoonIcon size={20} />}
    </button>
  );
}
```

- [ ] **Step 4: Verify theme switching**

Start frontend, navigate to any page. Confirm body background is `#f5f5f5` in light mode. The `ThemeToggle` isn't wired to the UI yet (done in Task 12), but `next-themes` should be working (no errors in console).

---

## Phase 5: Dashboard Redesign

### Task 12: Navbar Component

**Files:**
- Create: `frontend/src/app/components/Navbar.tsx`

- [ ] **Step 1: Create `Navbar.tsx`**

```tsx
// frontend/src/app/components/Navbar.tsx
'use client';
import { FaStopwatch } from 'react-icons/fa';
import ThemeToggle from './ThemeToggle';
import { clearToken, getTokenPayload } from '@/lib/auth';
import { projectsApi } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const router = useRouter();
  const payload = getTokenPayload();

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  return (
    <nav
      className="w-full h-14 flex items-center justify-between px-6 shadow-md"
      style={{ background: 'var(--app-navbar-gradient)' }}
    >
      <div className="flex items-center gap-2 text-white font-bold text-xl">
        <FaStopwatch size={24} />
        <span>Project Timelog</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => projectsApi.export()}
          className="text-sm text-white/80 hover:text-white transition-colors"
        >
          Export CSV
        </button>
        <ThemeToggle />
        {payload && (
          <span className="text-sm text-white/80 hidden sm:block">{payload.email}</span>
        )}
        <button
          onClick={handleLogout}
          className="text-sm bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded transition-colors"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
```

---

### Task 13: StatsBar + EmptyState Components

**Files:**
- Create: `frontend/src/app/components/StatsBar.tsx`
- Create: `frontend/src/app/components/EmptyState.tsx`

- [ ] **Step 1: Create `StatsBar.tsx`**

```tsx
// frontend/src/app/components/StatsBar.tsx
import { TimeLog } from '@/lib/api';

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function getStartOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday = start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

interface StatsBarProps {
  projectCount: number;
  timeLogs: TimeLog[];
}

export default function StatsBar({ projectCount, timeLogs }: StatsBarProps) {
  const now = new Date();
  const startOfDay = getStartOfDay(now);
  const startOfWeek = getStartOfWeek(now);

  const completedLogs = timeLogs.filter(l => l.duration !== null && l.duration !== undefined);

  const todaySeconds = completedLogs
    .filter(l => new Date(l.started_at) >= startOfDay)
    .reduce((sum, l) => sum + (l.duration || 0), 0);

  const weekSeconds = completedLogs
    .filter(l => new Date(l.started_at) >= startOfWeek)
    .reduce((sum, l) => sum + (l.duration || 0), 0);

  return (
    <div className="w-full flex gap-6 px-6 py-3 bg-[var(--app-card)] border-b border-[var(--app-border)]">
      <div className="text-center">
        <div className="text-2xl font-bold text-[var(--app-accent)]">{projectCount}</div>
        <div className="text-xs text-[var(--app-text)] opacity-70">Projects</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-[var(--app-accent)]">{formatTime(todaySeconds)}</div>
        <div className="text-xs text-[var(--app-text)] opacity-70">Today</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-[var(--app-accent)]">{formatTime(weekSeconds)}</div>
        <div className="text-xs text-[var(--app-text)] opacity-70">This Week</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `EmptyState.tsx`**

```tsx
// frontend/src/app/components/EmptyState.tsx
import { FaStopwatch } from 'react-icons/fa';

interface EmptyStateProps {
  onAdd: () => void;
}

export default function EmptyState({ onAdd }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <FaStopwatch size={64} color="var(--app-accent)" className="opacity-30 mb-6" />
      <h2 className="text-xl font-semibold text-[var(--app-text)] mb-2">No projects yet</h2>
      <p className="text-[var(--app-text)] opacity-60 mb-6">Start tracking time by creating your first project.</p>
      <button
        onClick={onAdd}
        className="px-6 py-2 rounded font-semibold text-white"
        style={{ background: 'var(--app-navbar-gradient)' }}
      >
        Create First Project
      </button>
    </div>
  );
}
```

---

### Task 14: StopwatchControls Component

**Files:**
- Create: `frontend/src/app/components/StopwatchControls.tsx`

- [ ] **Step 1: Create `StopwatchControls.tsx`**

This component manages the play/pause/reset logic using the new time_logs API.

```tsx
// frontend/src/app/components/StopwatchControls.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { FaPlay } from 'react-icons/fa';
import { FaCirclePause } from 'react-icons/fa6';
import { RiResetLeftFill, RiDeleteBin6Line } from 'react-icons/ri';
import { timeLogsApi } from '@/lib/api';

function pad(n: number) { return String(n).padStart(2, '0'); }
function formatTime(s: number) {
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

interface Props {
  projectId: string;
  initialElapsed: number;
  openLogId?: string;       // if there's an open session from a previous visit
  openLogStart?: string;    // ISO string of when the open session started
  onDelete: () => void;
  onElapsedChange: (newTotal: number) => void;
}

export default function StopwatchControls({
  projectId, initialElapsed, openLogId, openLogStart, onDelete, onElapsedChange,
}: Props) {
  const [isRunning, setIsRunning] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [currentLogId, setCurrentLogId] = useState<string | undefined>(openLogId);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartRef = useRef<number | null>(null);

  // Resume open session on mount
  useEffect(() => {
    if (openLogId && openLogStart) {
      const elapsed = Math.floor((Date.now() - new Date(openLogStart).getTime()) / 1000);
      setSessionSeconds(elapsed);
      setIsRunning(true);
      sessionStartRef.current = new Date(openLogStart).getTime();
      intervalRef.current = setInterval(() => {
        const s = Math.floor((Date.now() - sessionStartRef.current!) / 1000);
        setSessionSeconds(s);
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  async function handlePlay() {
    if (isRunning) return;
    const startedAt = new Date().toISOString();
    try {
      const log = await timeLogsApi.start(projectId, startedAt);
      setCurrentLogId(log.id);
      sessionStartRef.current = Date.now();
      setSessionSeconds(0);
      setIsRunning(true);
      intervalRef.current = setInterval(() => {
        const s = Math.floor((Date.now() - sessionStartRef.current!) / 1000);
        setSessionSeconds(s);
      }, 1000);
    } catch (err) {
      console.error('Failed to start session', err);
    }
  }

  async function handlePause() {
    if (!isRunning || !currentLogId) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    const endedAt = new Date().toISOString();
    try {
      await timeLogsApi.end(currentLogId, endedAt, sessionSeconds);
      onElapsedChange(initialElapsed + sessionSeconds);
    } catch (err) {
      console.error('Failed to end session', err);
    }
    setCurrentLogId(undefined);
    setSessionSeconds(0);
  }

  async function handleReset() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setSessionSeconds(0);
    try {
      // Close any open session before bulk-deleting all logs
      if (currentLogId) {
        await timeLogsApi.end(currentLogId, new Date().toISOString(), 0);
      }
      await timeLogsApi.reset(projectId);
      onElapsedChange(0);
    } catch (err) {
      console.error('Failed to reset', err);
    }
    setCurrentLogId(undefined);
  }

  const displayTime = formatTime(initialElapsed + sessionSeconds);

  return (
    <div className="flex items-center gap-3">
      <span className="text-2xl font-mono font-bold" style={{ color: 'var(--app-accent)' }}>
        {displayTime}
      </span>
      <div className="flex gap-1">
        {['play', 'pause', 'reset', 'delete'].map((action) => (
          <button
            key={action}
            onClick={action === 'play' ? handlePlay : action === 'pause' ? handlePause : action === 'reset' ? handleReset : onDelete}
            className="p-2 rounded text-white transition-opacity hover:opacity-80"
            style={{ background: 'var(--app-accent)' }}
          >
            {action === 'play' && <FaPlay size={14} />}
            {action === 'pause' && <FaCirclePause size={14} />}
            {action === 'reset' && <RiResetLeftFill size={14} />}
            {action === 'delete' && <RiDeleteBin6Line size={14} />}
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

### Task 15: ProjectCard + FilterBar + ProjectGrid

**Files:**
- Create: `frontend/src/app/components/ProjectCard.tsx`
- Create: `frontend/src/app/components/FilterBar.tsx`
- Create: `frontend/src/app/components/ProjectGrid.tsx`

- [ ] **Step 1: Create `ProjectCard.tsx`**

```tsx
// frontend/src/app/components/ProjectCard.tsx
'use client';
import { useState } from 'react';
import { Project, Tag, projectsApi, tagsApi } from '@/lib/api';
import { TimeLog } from '@/lib/api';
import StopwatchControls from './StopwatchControls';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-gray-100 text-gray-600',
};

interface Props {
  project: Project;
  allTags: Tag[];
  openLog?: TimeLog;
  onUpdate: (updated: Project) => void;
  onDelete: () => void;
}

export default function ProjectCard({ project, allTags, openLog, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(project.name);

  async function saveName() {
    setEditing(false);
    if (nameValue.trim() && nameValue !== project.name) {
      const updated = await projectsApi.update(project.id, { name: nameValue.trim() });
      onUpdate(updated);
    }
  }

  async function cycleStatus() {
    const cycle: Record<string, string> = { active: 'paused', paused: 'completed', completed: 'active' };
    const updated = await projectsApi.update(project.id, { status: cycle[project.status] as any });
    onUpdate(updated);
  }

  async function removeTag(tagId: string) {
    await tagsApi.removeFromProject(project.id, tagId);
    onUpdate({ ...project, tags: project.tags.filter(t => t.id !== tagId) });
  }

  const goalPct = project.goal_seconds
    ? Math.min(100, Math.round((project.total_elapsed / project.goal_seconds) * 100))
    : null;

  return (
    <div
      className="rounded-lg p-5 shadow-sm flex flex-col gap-3"
      style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}
    >
      {/* Name row */}
      <div className="flex items-center justify-between gap-2">
        {editing ? (
          <input
            autoFocus
            value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            onBlur={saveName}
            onKeyDown={e => e.key === 'Enter' && saveName()}
            className="flex-1 border-b border-[var(--app-accent)] bg-transparent text-[var(--app-text)] font-semibold text-lg focus:outline-none"
          />
        ) : (
          <span className="flex-1 font-semibold text-lg text-[var(--app-text)] truncate">{project.name}</span>
        )}
        <button
          onClick={() => setEditing(true)}
          className="text-[var(--app-text)] opacity-40 hover:opacity-80 text-xs"
        >✏️</button>
        <button
          onClick={cycleStatus}
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[project.status]}`}
        >
          {project.status}
        </button>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        {project.tags.map(tag => (
          <span
            key={tag.id}
            className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{ background: 'var(--app-accent)', color: 'white' }}
          >
            {tag.name}
            <button onClick={() => removeTag(tag.id)} className="hover:opacity-70">×</button>
          </span>
        ))}
      </div>

      {/* Goal progress */}
      {goalPct !== null && (
        <div>
          <div className="flex justify-between text-xs text-[var(--app-text)] opacity-60 mb-1">
            <span>Goal progress</span><span>{goalPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--app-border)]">
            <div
              className="h-1.5 rounded-full transition-all"
              style={{ width: `${goalPct}%`, background: 'var(--app-accent)' }}
            />
          </div>
        </div>
      )}

      {/* Stopwatch controls */}
      <StopwatchControls
        projectId={project.id}
        initialElapsed={project.total_elapsed}
        openLogId={openLog?.id}
        openLogStart={openLog?.started_at}
        onDelete={onDelete}
        onElapsedChange={(newTotal) => onUpdate({ ...project, total_elapsed: newTotal })}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create `FilterBar.tsx`**

```tsx
// frontend/src/app/components/FilterBar.tsx
'use client';
import { Tag } from '@/lib/api';
import { IoIosSearch } from 'react-icons/io';
import { IoMdAdd } from 'react-icons/io';

interface Props {
  tags: Tag[];
  onSearch: (q: string) => void;
  onTagFilter: (tag: string) => void;
  onStatusFilter: (status: string) => void;
  onAdd: () => void;
}

export default function FilterBar({ tags, onSearch, onTagFilter, onStatusFilter, onAdd }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-6 py-3">
      <div className="flex items-center border border-[var(--app-border)] rounded bg-[var(--app-card)] px-3 py-1.5">
        <IoIosSearch size={18} color="var(--app-accent)" />
        <input
          placeholder="Search projects..."
          onChange={e => onSearch(e.target.value)}
          className="ml-2 bg-transparent text-[var(--app-text)] text-sm focus:outline-none w-40"
        />
      </div>
      <select
        onChange={e => onTagFilter(e.target.value)}
        className="border border-[var(--app-border)] rounded px-3 py-1.5 text-sm bg-[var(--app-card)] text-[var(--app-text)] focus:outline-none"
      >
        <option value="">All Tags</option>
        {tags.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
      </select>
      <select
        onChange={e => onStatusFilter(e.target.value)}
        className="border border-[var(--app-border)] rounded px-3 py-1.5 text-sm bg-[var(--app-card)] text-[var(--app-text)] focus:outline-none"
      >
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="paused">Paused</option>
        <option value="completed">Completed</option>
      </select>
      <button
        onClick={onAdd}
        className="ml-auto flex items-center gap-1 px-4 py-1.5 rounded font-semibold text-white text-sm"
        style={{ background: 'var(--app-accent)' }}
      >
        <IoMdAdd size={18} /> New Project
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create `ProjectGrid.tsx`**

```tsx
// frontend/src/app/components/ProjectGrid.tsx
import { Project, Tag, TimeLog } from '@/lib/api';
import ProjectCard from './ProjectCard';

interface Props {
  projects: Project[];
  allTags: Tag[];
  openLogs: Record<string, TimeLog>;
  onUpdate: (updated: Project) => void;
  onDelete: (id: string) => void;
}

export default function ProjectGrid({ projects, allTags, openLogs, onUpdate, onDelete }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-6 py-4">
      {projects.map(project => (
        <ProjectCard
          key={project.id}
          project={project}
          allTags={allTags}
          openLog={openLogs[project.id]}
          onUpdate={onUpdate}
          onDelete={() => onDelete(project.id)}
        />
      ))}
    </div>
  );
}
```

---

### Task 16: Dashboard Page + AddProject Rewrite

**Files:**
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/app/components/AddProject.tsx`
- Delete: `frontend/src/app/components/Container.tsx`
- Delete: `frontend/src/app/components/ProjectBar.tsx`
- Delete: `frontend/src/app/components/Stopwatch.tsx`
- Delete: `frontend/src/app/components/Filter.tsx`

- [ ] **Step 1: Rewrite `page.tsx` as the dashboard**

```tsx
// frontend/src/app/page.tsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isTokenValid } from '@/lib/auth';
import { Project, Tag, TimeLog, projectsApi, tagsApi, timeLogsApi } from '@/lib/api';
import Navbar from './components/Navbar';
import StatsBar from './components/StatsBar';
import FilterBar from './components/FilterBar';
import EmptyState from './components/EmptyState';
import ProjectGrid from './components/ProjectGrid';
import AddProject from './components/AddProject';

export default function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [openLogs, setOpenLogs] = useState<Record<string, TimeLog>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [filters, setFilters] = useState({ search: '', tag: '', status: '' });

  useEffect(() => {
    if (!isTokenValid()) { router.push('/login'); return; }
    loadAll();
  }, []);

  async function loadAll() {
    const [ps, ts, logs] = await Promise.all([
      projectsApi.list(),
      tagsApi.list(),
      timeLogsApi.list(),
    ]);
    setProjects(ps);
    setAllTags(ts);
    setTimeLogs(logs);
    // Find open sessions (ended_at = null) per project
    const open: Record<string, TimeLog> = {};
    for (const log of logs) {
      if (!log.ended_at) open[log.project_id] = log;
    }
    setOpenLogs(open);
  }

  async function applyFilters(newFilters: typeof filters) {
    setFilters(newFilters);
    const ps = await projectsApi.list({
      search: newFilters.search || undefined,
      tag: newFilters.tag || undefined,
      status: newFilters.status || undefined,
    });
    setProjects(ps);
  }

  function handleUpdate(updated: Project) {
    setProjects(ps => ps.map(p => p.id === updated.id ? updated : p));
  }

  async function handleDelete(id: string) {
    await projectsApi.delete(id);
    setProjects(ps => ps.filter(p => p.id !== id));
  }

  function handleAdd(newProject: Project) {
    setProjects(ps => [newProject, ...ps]);
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--app-bg)' }}>
      <Navbar />
      <StatsBar projectCount={projects.length} timeLogs={timeLogs} />
      <FilterBar
        tags={allTags}
        onSearch={q => applyFilters({ ...filters, search: q })}
        onTagFilter={tag => applyFilters({ ...filters, tag })}
        onStatusFilter={status => applyFilters({ ...filters, status })}
        onAdd={() => setAddOpen(true)}
      />
      {projects.length === 0 ? (
        <EmptyState onAdd={() => setAddOpen(true)} />
      ) : (
        <ProjectGrid
          projects={projects}
          allTags={allTags}
          openLogs={openLogs}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
      <AddProject open={addOpen} onOpenChange={setAddOpen} onAdd={handleAdd} />
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `AddProject.tsx`**

```tsx
// frontend/src/app/components/AddProject.tsx
'use client';
import { useState } from 'react';
import { projectsApi, Project } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (project: Project) => void;
}

export default function AddProject({ open, onOpenChange, onAdd }: Props) {
  const [name, setName] = useState('');
  const [goalHours, setGoalHours] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Name is required'); return; }
    try {
      const goalSeconds = goalHours ? Math.round(parseFloat(goalHours) * 3600) : undefined;
      const project = await projectsApi.create(name.trim(), goalSeconds);
      onAdd(project);
      setName('');
      setGoalHours('');
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-[var(--app-text)]">New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-[var(--app-text)] mb-1">Project Name</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Client Website"
              className="w-full border border-[var(--app-border)] rounded px-3 py-2 text-[var(--app-text)] bg-[var(--app-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--app-text)] mb-1">Goal (hours, optional)</label>
            <input
              type="number" min="0" step="0.5"
              value={goalHours} onChange={e => setGoalHours(e.target.value)}
              placeholder="e.g. 10"
              className="w-full border border-[var(--app-border)] rounded px-3 py-2 text-[var(--app-text)] bg-[var(--app-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 rounded font-semibold text-white"
            style={{ background: 'var(--app-navbar-gradient)' }}
          >
            Create Project
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Delete old components**

```bash
rm frontend/src/app/components/Container.tsx
rm frontend/src/app/components/ProjectBar.tsx
rm frontend/src/app/components/Stopwatch.tsx
rm frontend/src/app/components/Filter.tsx
```

- [ ] **Step 4: Test the full dashboard flow**

1. Visit `http://localhost:3001` — should redirect to `/login` (not logged in)
2. Log in → redirected to dashboard
3. Create a project — should appear in the grid
4. With no projects: empty state with CTA shows
5. Play stopwatch → pause → verify time persists on page reload

---

## Phase 6: Reports Page

### Task 17: Reports Page + Charts

**Files:**
- Create: `frontend/src/app/reports/page.tsx`
- Create: `frontend/src/app/reports/TimeChart.tsx`

- [ ] **Step 1: Create `TimeChart.tsx`**

```tsx
// frontend/src/app/reports/TimeChart.tsx
'use client';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface ProjectData {
  name: string;
  hours: number;
}

interface DailyData {
  date: string;
  hours: number;
}

interface Props {
  projectData: ProjectData[];
  dailyData: DailyData[];
}

export default function TimeChart({ projectData, dailyData }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-[var(--app-card)] rounded-lg p-5 border border-[var(--app-border)]">
        <h3 className="text-[var(--app-text)] font-semibold mb-4">Time per Project</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={projectData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" />
            <XAxis dataKey="name" tick={{ fill: 'var(--app-text)', fontSize: 12 }} />
            <YAxis tick={{ fill: 'var(--app-text)', fontSize: 12 }} unit="h" />
            <Tooltip
              contentStyle={{ background: 'var(--app-card)', border: '1px solid var(--app-border)', color: 'var(--app-text)' }}
              formatter={(v: number) => [`${v}h`, 'Time']}
            />
            <Bar dataKey="hours" fill="var(--app-accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-[var(--app-card)] rounded-lg p-5 border border-[var(--app-border)]">
        <h3 className="text-[var(--app-text)] font-semibold mb-4">Daily Time</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" />
            <XAxis dataKey="date" tick={{ fill: 'var(--app-text)', fontSize: 12 }} />
            <YAxis tick={{ fill: 'var(--app-text)', fontSize: 12 }} unit="h" />
            <Tooltip
              contentStyle={{ background: 'var(--app-card)', border: '1px solid var(--app-border)', color: 'var(--app-text)' }}
              formatter={(v: number) => [`${v}h`, 'Time']}
            />
            <Line type="monotone" dataKey="hours" stroke="var(--app-primary)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `reports/page.tsx`**

```tsx
// frontend/src/app/reports/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isTokenValid } from '@/lib/auth';
import { timeLogsApi, projectsApi, Project, TimeLog } from '@/lib/api';
import Navbar from '../components/Navbar';
import TimeChart from './TimeChart';

function toDateStr(date: Date) {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function ReportsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [from, setFrom] = useState(toDateStr(addDays(new Date(), -30)));
  const [to, setTo] = useState(toDateStr(new Date()));

  useEffect(() => {
    if (!isTokenValid()) { router.push('/login'); return; }
    loadData();
  }, [from, to]);

  async function loadData() {
    const [ps, ls] = await Promise.all([
      projectsApi.list(),
      timeLogsApi.list({ from: `${from}T00:00:00Z`, to: `${to}T23:59:59Z` }),
    ]);
    setProjects(ps);
    setLogs(ls.filter(l => l.duration !== null));
  }

  // Aggregate: hours per project
  const projectData = projects.map(p => ({
    name: p.name.length > 12 ? p.name.slice(0, 12) + '…' : p.name,
    hours: Math.round(
      logs.filter(l => l.project_id === p.id).reduce((s, l) => s + (l.duration || 0), 0) / 36
    ) / 100,
  })).filter(p => p.hours > 0);

  // Aggregate: hours per day
  const dayMap: Record<string, number> = {};
  for (const log of logs) {
    const day = log.started_at.split('T')[0];
    dayMap[day] = (dayMap[day] || 0) + (log.duration || 0);
  }
  const dailyData = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, seconds]) => ({ date: date.slice(5), hours: Math.round(seconds / 36) / 100 }));

  return (
    <div className="min-h-screen" style={{ background: 'var(--app-bg)' }}>
      <Navbar />
      <div className="px-6 py-6">
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-[var(--app-text)]">Reports</h1>
          <div className="flex items-center gap-2 ml-auto">
            <label className="text-sm text-[var(--app-text)] opacity-70">From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="border border-[var(--app-border)] rounded px-2 py-1 text-sm bg-[var(--app-card)] text-[var(--app-text)]" />
            <label className="text-sm text-[var(--app-text)] opacity-70">To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="border border-[var(--app-border)] rounded px-2 py-1 text-sm bg-[var(--app-card)] text-[var(--app-text)]" />
          </div>
        </div>
        <TimeChart projectData={projectData} dailyData={dailyData} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add Reports link to Navbar**

In `Navbar.tsx`, add a link before the Export CSV button:
```tsx
import Link from 'next/link';
// Inside nav JSX, before export button:
<Link href="/reports" className="text-sm text-white/80 hover:text-white transition-colors">Reports</Link>
```

- [ ] **Step 4: Test reports page**

Navigate to `http://localhost:3001/reports`. Log some time on a project, then verify it appears in charts. Change date range and verify data updates.

---

## Phase 7: Deployment Prep

### Task 18: Environment Variables + Deployment Checklist

**Files:**
- `backend/.env.example` (already created)
- `frontend/.env.example` (already created)
- `backend/vercel.json` (already created)

- [ ] **Step 1: Verify `backend/vercel.json` is correct**

Confirm it contains routing only (no CORS headers — those are in `app.js`):
```json
{
  "version": 2,
  "builds": [{ "src": "app.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "app.js" }]
}
```

- [ ] **Step 2: Frontend — no vercel.json needed**

Next.js deploys automatically on Vercel without a `vercel.json`. Just ensure `NEXT_PUBLIC_API_URL` is set in Vercel's environment variables dashboard pointing to the deployed backend URL.

- [ ] **Step 3: Deployment order**

Deploy in this order:
1. **Deploy backend first** → get the Vercel backend URL (e.g. `https://timelogger-api.vercel.app`)
2. **Set backend env vars in Vercel:** `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL` (set this to the frontend Vercel URL you'll deploy next, or `*` initially)
3. **Run schema** against Neon: `psql "$DATABASE_URL" -f backend/db/schema.sql`
4. **Deploy frontend** → get the Vercel frontend URL
5. **Update backend `FRONTEND_URL`** env var in Vercel to the frontend URL
6. **Set frontend env var:** `NEXT_PUBLIC_API_URL` = backend Vercel URL
7. Redeploy both if env vars were added after initial deploy

- [ ] **Step 4: Smoke test production**

After both are deployed:
- Register a new account at the frontend URL
- Create a project, log some time
- Open `/reports` and verify charts populate
- Export CSV and verify download works
- Toggle dark mode and verify theme persists on refresh
