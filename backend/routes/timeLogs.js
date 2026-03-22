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
    const log = await endTimeLog(req.params.id, ended_at, duration, req.user.id);
    if (!log) return res.status(404).json({ error: 'Time log not found or not yours' });
    return res.json(log);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const logs = await listTimeLogs(req.user.id, req.query);
    return res.json(logs);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

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
