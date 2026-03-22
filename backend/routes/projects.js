const express = require('express');
const auth = require('../middleware/auth');
const { listProjects, createProject, updateProject, deleteProject, getProjectOwner } = require('../models/projects');
const { attachTag, removeTag } = require('../models/tags');

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
    if (err.message === 'No valid fields to update') {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
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

module.exports = router;
