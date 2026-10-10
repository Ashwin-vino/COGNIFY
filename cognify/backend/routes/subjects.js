const express = require('express');
const router = express.Router();
const db = require('../services/db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// PATCH /api/subjects/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const updated = await db.updateSubject(req.user.id, req.params.id, req.body, req.token);
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Subject not found.' },
      });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/subjects/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const success = await db.deleteSubject(req.user.id, req.params.id, req.token);
    res.json({ success: true, data: { deleted: success } });
  } catch (err) {
    next(err);
  }
});

// GET /api/subjects/:id/topics
router.get('/:id/topics', async (req, res, next) => {
  try {
    const topics = await db.getTopics(req.user.id, req.params.id, req.token);
    res.json({ success: true, data: topics });
  } catch (err) {
    next(err);
  }
});

// POST /api/subjects/:id/topics
router.post('/:id/topics', async (req, res, next) => {
  try {
    const { name, description, parent_topic_id, sort_order } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Topic name is required.' },
      });
    }

    const topic = await db.createTopic(
      req.user.id,
      req.params.id,
      { name: name.trim(), description, parent_topic_id, sort_order },
      req.token
    );

    res.status(201).json({ success: true, data: topic });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
