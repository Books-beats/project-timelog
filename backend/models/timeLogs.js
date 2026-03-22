const db = require('./index');

function createTimeLog(projectId, userId, startedAt) {
  return db.one(
    'INSERT INTO time_logs (project_id, user_id, started_at) VALUES ($1, $2, $3) RETURNING *',
    [projectId, userId, startedAt]
  );
}

function endTimeLog(id, endedAt, duration, userId) {
  return db.oneOrNone(
    'UPDATE time_logs SET ended_at = $1, duration = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
    [endedAt, duration, id, userId]
  );
}

function listTimeLogs(userId, { project_id, from, to } = {}) {
  const conditions = ['user_id = ${userId}'];
  const values = { userId };
  if (project_id) { conditions.push('project_id = ${project_id}'); values.project_id = project_id; }
  if (from) { conditions.push('started_at >= ${from}'); values.from = from; }
  if (to)   { conditions.push('started_at <= ${to}'); values.to = to; }
  return db.any(`SELECT * FROM time_logs WHERE ${conditions.join(' AND ')} ORDER BY started_at DESC`, values);
}

function deleteTimeLogsByProject(projectId, userId) {
  return db.result('DELETE FROM time_logs WHERE project_id = $1 AND user_id = $2', [projectId, userId]);
}

module.exports = { createTimeLog, endTimeLog, listTimeLogs, deleteTimeLogsByProject };
