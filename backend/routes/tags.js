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
