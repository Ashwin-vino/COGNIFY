const express = require('express');
const router = express.Router();
const db = require('../services/db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/workspaces/:id/syllabus
router.get('/workspaces/:id/syllabus', async (req, res, next) => {
  try {
    const { subjectId } = req.query;
    const entries = await db.getSyllabusEntries(req.user.id, req.params.id, subjectId, req.token);
    res.json({ success: true, data: entries });
  } catch (err) {
    next(err);
  }
});

// POST /api/workspaces/:id/syllabus
router.post('/workspaces/:id/syllabus', async (req, res, next) => {
  try {
    const { subject_id, unit_number, unit_title, content_text } = req.body;
    if (!content_text || content_text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Syllabus content text is required.' },
      });
    }

    const entry = await db.saveSyllabusEntry(
      req.user.id,
      req.params.id,
      {
        subject_id,
        unit_number: parseInt(unit_number, 10) || 1,
        unit_title,
        content_text: content_text.trim(),
      },
      req.token
    );

    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
