const express = require('express');
const router = express.Router();
const db = require('../services/db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/workspaces/:id/weak-topics
router.get('/workspaces/:id/weak-topics', async (req, res, next) => {
  try {
    const weakTopics = await db.getWeakTopics(req.user.id, req.params.id, req.token);
    res.json({ success: true, data: weakTopics });
  } catch (err) {
    next(err);
  }
});

// GET /api/workspaces/:id/progress
router.get('/workspaces/:id/progress', async (req, res, next) => {
  try {
    const workspaceId = req.params.id;
    const [attempts, weakTopics, docs, studySets] = await Promise.all([
      db.getQuizAttempts(req.user.id, workspaceId, req.token),
      db.getWeakTopics(req.user.id, workspaceId, req.token),
      db.getDocuments(req.user.id, workspaceId, req.token),
      db.getStudySets(req.user.id, workspaceId, null, req.token),
    ]);

    const totalQuizzes = attempts.length;
    const totalScore = attempts.reduce((acc, a) => acc + (a.score || 0), 0);
    const totalQuestions = attempts.reduce((acc, a) => acc + (a.total_questions || 0), 0);
    const avgPercentage = totalQuestions > 0 ? parseFloat(((totalScore / totalQuestions) * 100).toFixed(1)) : 0;

    res.json({
      success: true,
      data: {
        totalQuizzes,
        avgPercentage,
        totalDocuments: docs.length,
        readyDocuments: docs.filter(d => d.status === 'ready').length,
        totalStudySets: studySets.length,
        weakTopicsCount: weakTopics.length,
        weakTopicsList: weakTopics.slice(0, 5),
        recentAttempts: attempts.slice(0, 5),
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
