const express = require('express');
const router = express.Router();
const db = require('../services/db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/workspaces/:id/study-sets
router.get('/workspaces/:id/study-sets', async (req, res, next) => {
  try {
    const { type } = req.query;
    const sets = await db.getStudySets(req.user.id, req.params.id, type, req.token);
    res.json({ success: true, data: sets });
  } catch (err) {
    next(err);
  }
});

// POST /api/workspaces/:id/study-sets
router.post('/workspaces/:id/study-sets', async (req, res, next) => {
  try {
    const { type, title, content_json, subject_id = null } = req.body;
    if (!type || !title || !content_json) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'type, title, and content_json are required.' },
      });
    }

    const set = await db.createStudySet(
      req.user.id,
      req.params.id,
      {
        subject_id,
        type,
        title: title.trim(),
        content_json,
      },
      req.token
    );

    res.status(201).json({ success: true, data: set });
  } catch (err) {
    next(err);
  }
});

// GET /api/study-sets/:id
router.get('/study-sets/:id', async (req, res, next) => {
  try {
    const set = await db.getStudySetById(req.user.id, req.params.id, req.token);
    if (!set) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Study set not found.' },
      });
    }
    res.json({ success: true, data: set });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/study-sets/:id
router.delete('/study-sets/:id', async (req, res, next) => {
  try {
    const success = await db.deleteStudySet(req.user.id, req.params.id, req.token);
    res.json({ success: true, data: { deleted: success } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
