const express = require('express');
const router = express.Router();
const db = require('../services/db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/workspaces
router.get('/', async (req, res, next) => {
  try {
    const workspaces = await db.getWorkspaces(req.user.id, req.token);
    res.json({ success: true, data: workspaces });
  } catch (err) {
    next(err);
  }
});

// POST /api/workspaces
router.post('/', async (req, res, next) => {
  try {
    const { name, education_type, institution_or_exam, course_or_class, academic_term } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Workspace name is required.' },
      });
    }

    const workspace = await db.createWorkspace(
      req.user.id,
      {
        name: name.trim(),
        education_type: education_type || 'college',
        institution_or_exam,
        course_or_class,
        academic_term,
      },
      req.token
    );

    res.status(201).json({ success: true, data: workspace });
  } catch (err) {
    next(err);
  }
});

// GET /api/workspaces/:id
router.get('/:id', async (req, res, next) => {
  try {
    const workspace = await db.getWorkspaceById(req.user.id, req.params.id, req.token);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workspace not found.' },
      });
    }
    res.json({ success: true, data: workspace });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/workspaces/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const workspace = await db.getWorkspaceById(req.user.id, req.params.id, req.token);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workspace not found.' },
      });
    }

    const updated = await db.updateWorkspace(req.user.id, req.params.id, req.body, req.token);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/workspaces/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const success = await db.deleteWorkspace(req.user.id, req.params.id, req.token);
    res.json({ success: true, data: { deleted: success } });
  } catch (err) {
    next(err);
  }
});

// GET /api/workspaces/:id/subjects
router.get('/:id/subjects', async (req, res, next) => {
  try {
    const subjects = await db.getSubjects(req.user.id, req.params.id, req.token);
    res.json({ success: true, data: subjects });
  } catch (err) {
    next(err);
  }
});

// POST /api/workspaces/:id/subjects
router.post('/:id/subjects', async (req, res, next) => {
  try {
    const { name, code, description } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Subject name is required.' },
      });
    }

    const subject = await db.createSubject(
      req.user.id,
      req.params.id,
      { name: name.trim(), code, description },
      req.token
    );

    res.status(201).json({ success: true, data: subject });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
