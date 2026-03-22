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
  await db.none(`UPDATE projects SET ${setClauses.join(', ')} WHERE id = \${id}`, values);
  return { ok: true };
}

function deleteProject(id, userId) {
  return db.result('DELETE FROM projects WHERE id = $1 AND user_id = $2', [id, userId]);
}

function getProjectOwner(id) {
  return db.oneOrNone('SELECT user_id FROM projects WHERE id = $1', [id]);
}

module.exports = { listProjects, createProject, updateProject, deleteProject, getProjectOwner };
