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
